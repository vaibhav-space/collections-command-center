import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PolicyEngine } from '@/policies/engine';
import { ChannelType, AccountStatus } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accountId, channel = 'SMS', message: messageBody, sentAt } = body;

    if (!accountId || !messageBody) {
      return NextResponse.json(
        { error: 'accountId and message are required' },
        { status: 400 }
      );
    }

    const account = await prisma.account.findUniqueOrThrow({
      where: { id: accountId },
      include: { borrower: true },
    });

    const policyEngine = new PolicyEngine();
    const messageDate = sentAt ? new Date(sentAt) : new Date();

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: { accountId: account.id, channel: channel as ChannelType },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          accountId: account.id,
          channel: channel as ChannelType,
          status: 'ACTIVE',
        },
      });
    }

    // 1. Fast-Path: Statutory STOP Opt-Out (Finding C-2)
    if (policyEngine.isOptOut(messageBody)) {
      // Mark borrower opted out immediately
      await prisma.borrower.update({
        where: { id: account.borrowerId },
        data: { isOptedOut: true, optedOutAt: messageDate },
      });

      // Pause conversation
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { status: 'PAUSED', lastMessageAt: messageDate },
      });

      // Record inbound message
      const inboundMsg = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderType: 'BORROWER',
          channel: channel as ChannelType,
          body: messageBody,
          sentAt: messageDate,
          detectedIntent: 'STOP_OPT_OUT',
          deliveryStatus: 'DELIVERED',
        },
      });

      // Audit Event
      await prisma.auditEvent.create({
        data: {
          tenantId: account.tenantId,
          accountId: account.id,
          actorType: 'BORROWER',
          action: 'STATUTORY_OPT_OUT_RECORDED',
          entityType: 'Borrower',
          entityId: account.borrowerId,
          newState: { isOptedOut: true, reason: 'STOP keyword matched' },
        },
      });

      return NextResponse.json({
        messageId: inboundMsg.id,
        conversationId: conversation.id,
        status: 'OPTED_OUT',
        actionTaken: 'OUTBOUND_LOCKED',
        fastPathExecuted: true,
        reason: 'Statutory STOP keyword detected; borrower opted out and outbound messaging halted.',
      });
    }

    // 2. Fast-Path: Dispute Detection
    const disputeDecision = policyEngine.evaluateDispute({ message: messageBody });
    let detectedIntent = 'GENERAL_INQUIRY';
    let actionTaken = 'MESSAGE_RECORDED';

    if (disputeDecision.status === 'requires_approval') {
      detectedIntent = 'DISPUTE';
      actionTaken = 'DISPUTE_HOLD_APPLIED';

      await prisma.account.update({
        where: { id: account.id },
        data: { status: AccountStatus.IN_DISPUTE, hasActiveDispute: true },
      });

      // Create Dispute Case
      await prisma.case.create({
        data: {
          accountId: account.id,
          category: 'DISPUTE',
          priority: 'URGENT',
          status: 'OPEN',
          title: 'Inbound Dispute Raised by Borrower',
          description: messageBody,
        },
      });

      await prisma.auditEvent.create({
        data: {
          tenantId: account.tenantId,
          accountId: account.id,
          actorType: 'BORROWER',
          action: 'DISPUTE_DETECTED_FAST_PATH',
          entityType: 'Account',
          entityId: account.id,
          newState: { status: 'IN_DISPUTE', message: messageBody },
        },
      });
    }

    // Record regular inbound message
    const inboundMsg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: 'BORROWER',
        channel: channel as ChannelType,
        body: messageBody,
        sentAt: messageDate,
        detectedIntent,
        deliveryStatus: 'DELIVERED',
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: messageDate },
    });

    return NextResponse.json({
      messageId: inboundMsg.id,
      conversationId: conversation.id,
      status: 'DELIVERED',
      detectedIntent,
      actionTaken,
      fastPathExecuted: disputeDecision.status === 'requires_approval',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to simulate inbound message';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
