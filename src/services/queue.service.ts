import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface WorkQueueItem {
  id: string;
  accountId: string;
  accountNumber: string;
  borrowerId: string;
  borrowerName: string;
  primaryPhone: string;
  primaryEmail: string;
  currentBalance: number;
  amountOverdue: number;
  daysPastDue: number;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'NORMAL';
  triggerReason: string;
  triggerDescription: string;
  recommendedAction: string;
  timezone: string;
  lastContactDate?: string | null;
  status: string;
}

export class QueueService {
  /**
   * Retrieves prioritized work queue items, dynamically evaluating expired promises
   */
  async getQueueItems(filters?: {
    priority?: string;
    reason?: string;
    search?: string;
  }): Promise<{ items: WorkQueueItem[]; total: number; summary: any }> {
    const now = new Date();

    // Finding M-3: Dynamically break overdue promises that passed due date
    const expiredPromises = await prisma.promiseToPay.findMany({
      where: {
        status: { in: ['APPROVED', 'DUE'] },
        dueDate: { lt: now },
      },
      include: { account: true },
    });

    for (const exp of expiredPromises) {
      const updated = await prisma.promiseToPay.updateMany({
        where: {
          id: exp.id,
          status: { in: ['APPROVED', 'DUE'] },
        },
        data: {
          status: 'BROKEN',
          brokenAt: now,
          notes: exp.notes ? `${exp.notes} (Expired on ${exp.dueDate.toISOString()})` : 'Promise due date expired without payment',
        },
      });

      if (updated.count > 0) {
        await prisma.auditEvent.create({
          data: {
            tenantId: exp.account.tenantId,
            accountId: exp.accountId,
            actorType: 'SYSTEM',
            action: 'PROMISE_BROKEN_DUE_DATE_PASSED',
            entityType: 'PromiseToPay',
            entityId: exp.id,
            newState: { status: 'BROKEN', brokenAt: now.toISOString() },
          },
        });
      }
    }

    // Fetch accounts with relevant relations
    const accounts = await prisma.account.findMany({
      where: {
        status: { notIn: ['PAID_IN_FULL', 'CHARGED_OFF'] },
      },
      include: {
        borrower: {
          include: { preferences: true },
        },
        promisesToPay: {
          orderBy: { dueDate: 'desc' },
          take: 2,
        },
        cases: {
          where: { status: { in: ['OPEN', 'UNDER_REVIEW', 'ACTION_PENDING'] } },
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          where: { status: 'PENDING' },
        },
      },
    });

    const items: WorkQueueItem[] = [];

    for (const acc of accounts) {
      const borrowerName = `${acc.borrower.firstName} ${acc.borrower.lastName}`;
      const latestBrokenPromise = acc.promisesToPay.find((p) => p.status === 'BROKEN');
      const activeDisputeCase = acc.cases.find((c) => c.category === 'DISPUTE');
      const activeHardshipCase = acc.cases.find((c) => c.category === 'HARDSHIP');
      const pendingPayment = acc.payments.find((p) => p.status === 'PENDING');
      const handoffCase = acc.cases.find((c) => c.category === 'AI_UNCERTAINTY');

      let priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'NORMAL' = 'NORMAL';
      let triggerReason = 'SCHEDULED_CADENCE';
      let triggerDescription = `Account is ${acc.daysPastDue} days past due with $${acc.amountOverdue.toFixed(2)} overdue.`;
      let recommendedAction = 'Draft follow-up reminder';

      if (latestBrokenPromise) {
        priority = 'URGENT';
        triggerReason = 'MISSED_PROMISE';
        triggerDescription = `Promise of $${latestBrokenPromise.amount.toFixed(2)} missed on ${latestBrokenPromise.dueDate.toISOString().split('T')[0]}.`;
        recommendedAction = 'Contact borrower to renegotiate broken commitment';
      } else if (activeDisputeCase || acc.hasActiveDispute) {
        priority = 'URGENT';
        triggerReason = 'ACTIVE_DISPUTE';
        triggerDescription = activeDisputeCase?.description || 'Borrower formally contested balance or alleged billing error.';
        recommendedAction = 'Review dispute documentation and pause outreach';
      } else if (activeHardshipCase || acc.hasActiveHardship) {
        priority = 'HIGH';
        triggerReason = 'HARDSHIP_REVIEW';
        triggerDescription = activeHardshipCase?.description || 'Borrower declared hardship (unemployment, medical, or disaster).';
        recommendedAction = 'Review relief programs and offer temporary payment forbearance';
      } else if (pendingPayment) {
        priority = 'HIGH';
        triggerReason = 'PAYMENT_PENDING_VERIFICATION';
        triggerDescription = `Simulated payment of $${pendingPayment.amount.toFixed(2)} pending settlement verification.`;
        recommendedAction = 'Check simulated provider status and reconcile ledger';
      } else if (handoffCase) {
        priority = 'MEDIUM';
        triggerReason = 'HUMAN_HANDOFF_REQUESTED';
        triggerDescription = handoffCase.description || 'Borrower requested phone call from supervisor.';
        recommendedAction = 'Initiate outbound callback to borrower';
      } else if (acc.borrower.preferences?.[0]?.preferredChannel === 'EMAIL' && acc.borrower.preferences?.[0]?.allowSms === false) {
        priority = 'MEDIUM';
        triggerReason = 'CHANNEL_PREFERENCE_EMAIL';
        triggerDescription = 'Borrower prefers email; automated SMS outreach restricted.';
        recommendedAction = 'Send email statement and payment options';
      }

      items.push({
        id: `queue_${acc.id}`,
        accountId: acc.id,
        accountNumber: acc.accountNumber,
        borrowerId: acc.borrowerId,
        borrowerName,
        primaryPhone: acc.borrower.primaryPhone,
        primaryEmail: acc.borrower.primaryEmail,
        currentBalance: acc.currentBalance.toNumber(),
        amountOverdue: acc.amountOverdue.toNumber(),
        daysPastDue: acc.daysPastDue,
        priority,
        triggerReason,
        triggerDescription,
        recommendedAction,
        timezone: acc.borrower.timezone,
        lastContactDate: acc.lastContactDate ? acc.lastContactDate.toISOString() : null,
        status: acc.status,
      });
    }

    // Sort: URGENT -> HIGH -> MEDIUM -> NORMAL, then by amountOverdue descending
    const priorityWeight: Record<string, number> = {
      URGENT: 4,
      HIGH: 3,
      MEDIUM: 2,
      NORMAL: 1,
    };

    items.sort((a, b) => {
      const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (pDiff !== 0) return pDiff;
      return b.amountOverdue - a.amountOverdue;
    });

    // Apply filters if provided
    let filteredItems = items;
    if (filters?.priority) {
      filteredItems = filteredItems.filter((i) => i.priority === filters.priority);
    }
    if (filters?.reason) {
      filteredItems = filteredItems.filter((i) => i.triggerReason === filters.reason);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filteredItems = filteredItems.filter(
        (i) =>
          i.accountNumber.toLowerCase().includes(q) ||
          i.borrowerName.toLowerCase().includes(q) ||
          i.primaryPhone.includes(q) ||
          i.primaryEmail.toLowerCase().includes(q)
      );
    }

    const summary = {
      urgentCount: items.filter((i) => i.priority === 'URGENT').length,
      highCount: items.filter((i) => i.priority === 'HIGH').length,
      mediumCount: items.filter((i) => i.priority === 'MEDIUM').length,
      normalCount: items.filter((i) => i.priority === 'NORMAL').length,
      totalOverdue: items.reduce((acc, curr) => acc + curr.amountOverdue, 0),
    };

    return {
      items: filteredItems,
      total: filteredItems.length,
      summary,
    };
  }
}
