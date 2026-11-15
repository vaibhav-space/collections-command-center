import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';

describe('Database Seed Verification', () => {
  it('contains exactly 10 seeded synthetic borrower accounts with valid ledgers', async () => {
    const accounts = await prisma.account.findMany({
      include: {
        borrower: true,
        promisesToPay: true,
        cases: true,
      },
    });
    expect(accounts.length).toBe(10);

    // Verify broken promise account exists
    const brokenPromiseAccount = accounts.find(a => a.accountNumber === 'ACC-8003');
    expect(brokenPromiseAccount).toBeDefined();
    expect(brokenPromiseAccount?.promisesToPay[0].status).toBe('BROKEN');

    // Verify dispute account exists
    const disputeAccount = accounts.find(a => a.accountNumber === 'ACC-8005');
    expect(disputeAccount).toBeDefined();
    expect(disputeAccount?.status).toBe('IN_DISPUTE');
    expect(disputeAccount?.cases[0].category).toBe('DISPUTE');

    // Verify opted out account exists
    const optedOutAccount = accounts.find(a => a.accountNumber === 'ACC-8009');
    expect(optedOutAccount).toBeDefined();
    expect(optedOutAccount?.borrower.isOptedOut).toBe(true);
  });
});
