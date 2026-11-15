import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { QueueService } from '@/services/queue.service';
import { ToolRegistry } from '@/tools/registry';
import { Prisma } from '@prisma/client';

describe('API & Service Integration Tests', () => {
  let testAccountId: string;

  beforeEach(async () => {
    // Reset test account state
    const account = await prisma.account.update({
      where: { accountNumber: 'ACC-8001' },
      data: {
        currentBalance: new Prisma.Decimal(1450.0),
        amountOverdue: new Prisma.Decimal(350.0),
        status: 'DELINQUENT',
        daysPastDue: 42,
        hasActiveDispute: false,
      },
    });
    testAccountId = account.id;

    // Reset Sarah Jenkins opt-out status
    await prisma.borrower.update({
      where: { id: account.borrowerId },
      data: { isOptedOut: false, optedOutAt: null },
    });
  });

  it('QueueService correctly returns prioritized work queue items', async () => {
    const queueService = new QueueService();
    const result = await queueService.getQueueItems();

    expect(result.total).toBeGreaterThan(0);
    expect(result.summary.urgentCount).toBeGreaterThan(0);

    // Verify first item is URGENT (e.g. ACC-8003 with missed promise or ACC-8005 with dispute)
    const firstItem = result.items[0];
    expect(firstItem.priority).toBe('URGENT');
  });

  it('reconciles payment settlement and decrements balance and overdue amount', async () => {
    const toolRegistry = new ToolRegistry();
    const result = await toolRegistry.execute({
      toolName: 'reconcilePayment',
      inputs: {
        accountId: testAccountId,
        amount: 150.0,
        status: 'SETTLED',
      },
    });

    expect(result.success).toBe(true);

    const updatedAccount = await prisma.account.findUniqueOrThrow({
      where: { id: testAccountId },
    });
    expect(updatedAccount.currentBalance.toNumber()).toBe(1300.0);
    expect(updatedAccount.amountOverdue.toNumber()).toBe(200.0);
  });
});
