import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeBorrowerMessage } from '@/ai/service';
import { PolicyEngine } from '@/policies/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accountId, inboundMessage, conversationId } = body;

    if (!accountId || !inboundMessage) {
      return NextResponse.json(
        { error: 'accountId and inboundMessage are required' },
        { status: 400 }
      );
    }

    const account = await prisma.account.findUniqueOrThrow({
      where: { id: accountId },
      include: {
        borrower: true,
        promisesToPay: {
          where: { status: { in: ['APPROVED', 'DUE'] } },
          orderBy: { dueDate: 'asc' },
          take: 1,
        },
      },
    });

    // Fetch recent messages
    const recentMessages = conversationId
      ? await prisma.message.findMany({
          where: { conversationId },
          orderBy: { sentAt: 'desc' },
          take: 10,
        })
      : [];

    const activePromise = account.promisesToPay[0]
      ? {
          amount: account.promisesToPay[0].amount.toNumber(),
          dueDate: account.promisesToPay[0].dueDate.toISOString().split('T')[0],
        }
      : null;

    const policyEngine = new PolicyEngine();

    // 1. Run Copilot Analysis
    const copilotOutput = await analyzeBorrowerMessage({
      accountSnapshot: {
        accountNumber: account.accountNumber,
        currentBalance: account.currentBalance.toNumber(),
        amountOverdue: account.amountOverdue.toNumber(),
        daysPastDue: account.daysPastDue,
        activePromise,
        timezone: account.borrower.timezone,
      },
      recentMessages: recentMessages.reverse().map((m) => ({
        senderType: m.senderType,
        channel: m.channel,
        body: m.body,
      })),
      inboundMessage,
      policyEngine,
    });

    // 2. Evaluate Policy Verdict on the Recommended Action
    const quietDecision = policyEngine.evaluateQuietHours({
      receivedAt: new Date(),
      timezone: account.borrower.timezone,
    });

    let overallPolicyStatus: 'ALLOWED' | 'BLOCKED' | 'REQUIRES_APPROVAL' = 'ALLOWED';
    let policyReason = 'Action complies with collections policies.';

    if (account.borrower.isOptedOut) {
      overallPolicyStatus = 'BLOCKED';
      policyReason = 'Borrower has opted out of communication. Outbound messages are prohibited.';
    } else if (copilotOutput.primaryIntent === 'DISPUTE') {
      overallPolicyStatus = 'REQUIRES_APPROVAL';
      policyReason = 'Dispute detected; outbound collection demand blocked, dispute review required.';
    } else if (quietDecision.status === 'blocked') {
      overallPolicyStatus = 'REQUIRES_APPROVAL';
      policyReason = quietDecision.reason;
    }

    return NextResponse.json({
      ...copilotOutput,
      policyVerdict: {
        status: overallPolicyStatus,
        reason: policyReason,
        quietHours: quietDecision,
      },
      account: {
        id: account.id,
        accountNumber: account.accountNumber,
        currentBalance: account.currentBalance.toNumber(),
        amountOverdue: account.amountOverdue.toNumber(),
        updatedAt: account.updatedAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Copilot analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
