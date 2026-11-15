import { describe, it, expect, beforeEach } from 'vitest';
import { LedgerService } from '@/services/ledger.service';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

describe('Ledger Service', () => {
  const ledgerService = new LedgerService();
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
  });

  it('atomically credits a payment, updates current balance and amount overdue using exact decimal math', async () => {
    const result = await ledgerService.recordTransaction({
      accountId: testAccountId,
      entryType: 'PAYMENT_CREDIT',
      amount: new Prisma.Decimal(-200.00),
      description: 'Partial payment via ACH',
      operatorId: 'system',
    });

    expect(result.balanceAfter.toFixed(2)).toBe('1250.00');
    expect(result.amountOverdueAfter.toFixed(2)).toBe('150.00');

    // Verify persisted in DB
    const updated = await prisma.account.findUniqueOrThrow({
      where: { id: testAccountId },
    });
    expect(updated.currentBalance.toFixed(2)).toBe('1250.00');
    expect(updated.amountOverdue.toFixed(2)).toBe('150.00');
  });

  it('transitions account status to CURRENT when overdue balance reaches zero with remaining principal', async () => {
    const result = await ledgerService.recordTransaction({
      accountId: testAccountId,
      entryType: 'PAYMENT_CREDIT',
      amount: new Prisma.Decimal(-350.00), // pays off all 350 overdue
      description: 'Cure delinquency payment',
      operatorId: 'system',
    });

    expect(result.amountOverdueAfter.toFixed(2)).toBe('0.00');
    expect(result.statusAfter).toBe('CURRENT');
    expect(result.daysPastDueAfter).toBe(0);
  });
});
