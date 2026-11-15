import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';

describe('Prisma Client Singleton', () => {
  it('instantiates a valid prisma client instance with all domain models', () => {
    expect(prisma).toBeDefined();
    expect(prisma.tenant).toBeDefined();
    expect(prisma.borrower).toBeDefined();
    expect(prisma.account).toBeDefined();
    expect(prisma.accountLedgerEntry).toBeDefined();
    expect(prisma.paymentLink).toBeDefined();
    expect(prisma.payment).toBeDefined();
    expect(prisma.promiseToPay).toBeDefined();
    expect(prisma.conversation).toBeDefined();
    expect(prisma.message).toBeDefined();
    expect(prisma.case).toBeDefined();
    expect(prisma.policyVersion).toBeDefined();
    expect(prisma.policyDecisionLog).toBeDefined();
    expect(prisma.toolExecutionLog).toBeDefined();
    expect(prisma.auditEvent).toBeDefined();
  });
});
