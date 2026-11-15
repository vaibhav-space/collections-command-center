import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry } from '@/tools/registry';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

describe('Tool Registry', () => {
  const registry = new ToolRegistry();
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

    // Clean any prior test idempotency keys
    await prisma.paymentLink.deleteMany({
      where: { idempotencyKey: { startsWith: 'test_idem_' } },
    });
    await prisma.promiseToPay.deleteMany({
      where: { idempotencyKey: { startsWith: 'test_ptp_' } },
    });
  });

  it('retrieves account balance via getBalance', async () => {
    const result = await registry.execute({
      toolName: 'getBalance',
      inputs: { accountId: testAccountId },
    });
    expect(result.success).toBe(true);
    expect(result.data.balance).toBe(1450.0);
    expect(result.data.currency).toBe('USD');
  });

  it('creates a payment link and logs an audit event', async () => {
    const result = await registry.execute({
      toolName: 'createPaymentLink',
      inputs: { accountId: testAccountId, amount: 200.0 },
      operatorId: 'test_operator',
      idempotencyKey: 'test_idem_link_101',
    });
    expect(result.success).toBe(true);
    expect(result.data.url).toContain('https://pay.financeops.demo/l/');
    expect(result.auditEventId).toBeDefined();

    // Test idempotency: second call with same key returns existing record
    const result2 = await registry.execute({
      toolName: 'createPaymentLink',
      inputs: { accountId: testAccountId, amount: 200.0 },
      operatorId: 'test_operator',
      idempotencyKey: 'test_idem_link_101',
    });
    expect(result2.success).toBe(true);
    expect(result2.data.id).toBe(result.data.id);
  });

  it('blocks payment link creation when amount exceeds balance', async () => {
    const result = await registry.execute({
      toolName: 'createPaymentLink',
      inputs: { accountId: testAccountId, amount: 5000.0 },
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('cannot exceed verified account balance');
  });

  it('records a promise to pay and verifies persistence', async () => {
    const result = await registry.execute({
      toolName: 'proposePromiseToPay',
      inputs: {
        accountId: testAccountId,
        amount: 250.0,
        dueDate: '2026-11-25',
        notes: 'Promised by Thanksgiving week',
      },
      idempotencyKey: 'test_ptp_idem_202',
    });
    expect(result.success).toBe(true);
    expect(result.data.status).toBe('APPROVED');
  });

  it('creates a formal dispute case and transitions account to IN_DISPUTE', async () => {
    const result = await registry.execute({
      toolName: 'createDispute',
      inputs: {
        accountId: testAccountId,
        category: 'BILLING_ERROR',
        description: 'Customer claims payment was not credited',
      },
    });
    expect(result.success).toBe(true);

    const updatedAccount = await prisma.account.findUniqueOrThrow({
      where: { id: testAccountId },
    });
    expect(updatedAccount.status).toBe('IN_DISPUTE');
    expect(updatedAccount.hasActiveDispute).toBe(true);
  });
});
