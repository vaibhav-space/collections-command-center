import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ToolRegistry } from '@/tools/registry';
import { PolicyEngine } from '@/policies/engine';
import { ChannelType } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      accountId,
      action,
      inputs,
      editedDraftReply,
      idempotencyKey,
      expectedAccountUpdatedAt,
      conversationId,
      channel = 'SMS',
    } = body;

    if (!accountId || !action) {
      return NextResponse.json(
        { error: 'accountId and action are required' },
        { status: 400 }
      );
    }

    const account = await prisma.account.findUniqueOrThrow({
      where: { id: accountId },
      include: { borrower: true },
    });

    const policyEngine = new PolicyEngine();

    // Finding C-4: Optimistic Lock Check (Stale Data Guard)
    if (expectedAccountUpdatedAt) {
      const staleDecision = policyEngine.evaluateStaleData({
        expectedUpdatedAt: expectedAccountUpdatedAt,
        currentUpdatedAt: account.updatedAt,
      });

      if (staleDecision.status === 'blocked') {
        return NextResponse.json(
          { error: staleDecision.reason, code: 'STALE_DATA_CONFLICT' },
          { status: 409 }
        );
      }
    }

    // Check prior opt-out
    if (account.borrower.isOptedOut && editedDraftReply) {
      return NextResponse.json(
        { error: 'Borrower has opted out of communication. Outbound messages are prohibited.' },
        { status: 403 }
      );
    }

    // Finding C-3: Privacy Scanner Check (Policy Rule 14)
    if (editedDraftReply && editedDraftReply.trim() !== '') {
      const allBorrowers = await prisma.borrower.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          primaryPhone: true,
        },
      });

      const privacyDecision = policyEngine.evaluatePrivacy({
        currentBorrowerId: account.borrowerId,
        currentBorrowerBalance: account.currentBalance.toNumber(),
        draftReply: editedDraftReply,
        allBorrowers,
      });

      if (privacyDecision.status === 'blocked') {
        return NextResponse.json(
          { error: privacyDecision.reason, code: 'PRIVACY_VIOLATION' },
          { status: 422 }
        );
      }
    }

    // Execute Tool
    const toolRegistry = new ToolRegistry(policyEngine);
    const toolResult = await toolRegistry.execute({
      toolName: action,
      inputs: { ...inputs, accountId },
      idempotencyKey,
      operatorId: 'operator_current',
    });

    if (!toolResult.success) {
      return NextResponse.json(
        { error: toolResult.error, policyStatus: toolResult.policyStatus },
        { status: 422 }
      );
    }

    // If an edited draft reply was provided, append outbound message to timeline
    let outboundMessageId: string | null = null;
    if (editedDraftReply && editedDraftReply.trim() !== '') {
      let targetConvId = conversationId;
      if (!targetConvId) {
        let conv = await prisma.conversation.findFirst({
          where: { accountId: account.id, channel: channel as ChannelType },
        });
        if (!conv) {
          conv = await prisma.conversation.create({
            data: {
              accountId: account.id,
              channel: channel as ChannelType,
              status: 'ACTIVE',
            },
          });
        }
        targetConvId = conv.id;
      }

      if (targetConvId) {
        const quietCheck = policyEngine.evaluateQuietHours({
          receivedAt: new Date(),
          timezone: account.borrower.timezone,
        });

        const deliveryStatus = quietCheck.status === 'blocked' ? 'HELD' : 'DELIVERED';

        const msg = await prisma.message.create({
          data: {
            conversationId: targetConvId,
            channel: channel as ChannelType,
            senderType: 'OPERATOR',
            body: editedDraftReply,
            sentAt: new Date(),
            deliveryStatus,
          },
        });
        outboundMessageId = msg.id;

        await prisma.conversation.update({
          where: { id: targetConvId },
          data: { lastMessageAt: new Date() },
        });
      }
    }

    // Fetch updated account state to return to client
    const updatedAccount = await prisma.account.findUnique({
      where: { id: account.id },
      select: {
        id: true,
        currentBalance: true,
        amountOverdue: true,
        status: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      actionExecuted: action,
      toolResult: toolResult.data,
      auditEventId: toolResult.auditEventId,
      outboundMessageId,
      account: updatedAccount
        ? {
            ...updatedAccount,
            currentBalance: updatedAccount.currentBalance.toNumber(),
            amountOverdue: updatedAccount.amountOverdue.toNumber(),
            updatedAt: updatedAccount.updatedAt.toISOString(),
          }
        : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Action execution failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
