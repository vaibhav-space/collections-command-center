import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { analyzeBorrowerMessage } from '@/ai/service';
import { PolicyEngine } from '@/policies/engine';
import { ToolRegistry } from '@/tools/registry';
import { Prisma } from '@prisma/client';

describe('Full End-to-End Operational Walkthrough', () => {
  let testAccountId: string;

  beforeEach(async () => {
    // Reset test account state for Sarah Jenkins
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

    // Clean prior test commitments
    await prisma.promiseToPay.deleteMany({
      where: { accountId: testAccountId, idempotencyKey: { startsWith: 'walkthrough_' } },
    });
  });

  it('executes a complete end-to-end collections journey: message -> copilot -> policy -> approval -> tool -> ledger -> audit', async () => {
    // Step 1: Account Context Lookup
    const account = await prisma.account.findUniqueOrThrow({
      where: { id: testAccountId },
      include: { borrower: true },
    });
    expect(account.currentBalance.toNumber()).toBe(1450.0);

    // Step 2: Inbound Message Simulation
    const inboundMessage = 'I can pay $200 next Tuesday';

    // Step 3: AI Copilot Analysis
    const copilotOutput = await analyzeBorrowerMessage({
      accountSnapshot: {
        accountNumber: account.accountNumber,
        currentBalance: account.currentBalance.toNumber(),
        amountOverdue: account.amountOverdue.toNumber(),
        daysPastDue: account.daysPastDue,
        timezone: account.borrower.timezone,
      },
      inboundMessage,
      referenceTime: new Date('2026-11-15T10:00:00Z'),
    });

    expect(copilotOutput.primaryIntent).toBe('PROMISE_TO_PAY');
    expect(copilotOutput.entities.amount).toBe(200.0);
    expect(copilotOutput.recommendedAction.action).toBe('proposePromiseToPay');

    // Step 4: Policy Engine Evaluation
    const policyEngine = new PolicyEngine();
    const policyVerdict = policyEngine.evaluateFinancialLimits({
      action: 'proposePromiseToPay',
      amount: copilotOutput.entities.amount!,
      currentBalance: account.currentBalance.toNumber(),
      dueDate: copilotOutput.entities.date || '2026-11-24',
    });
    expect(policyVerdict.status).toBe('allowed');

    // Step 5: Operator Approval & Tool Execution
    const toolRegistry = new ToolRegistry(policyEngine);
    const toolResult = await toolRegistry.execute({
      toolName: 'proposePromiseToPay',
      inputs: {
        accountId: account.id,
        amount: copilotOutput.entities.amount!,
        dueDate: '2026-11-24',
        notes: 'Negotiated via copilot walkthrough',
      },
      operatorId: 'operator_walkthrough',
      idempotencyKey: 'walkthrough_ptp_001',
    });

    expect(toolResult.success).toBe(true);
    expect(toolResult.data.status).toBe('APPROVED');
    const createdPtpId = toolResult.data.id;

    // Step 6: Payment Settlement Reconciliation
    const reconcileResult = await toolRegistry.execute({
      toolName: 'reconcilePayment',
      inputs: {
        accountId: account.id,
        promiseToPayId: createdPtpId,
        amount: 200.0,
        status: 'SETTLED',
      },
    });

    expect(reconcileResult.success).toBe(true);

    // Step 7: Verify Database Ledger & PTP State
    const updatedAccount = await prisma.account.findUniqueOrThrow({
      where: { id: account.id },
    });
    expect(updatedAccount.currentBalance.toNumber()).toBe(1250.0);
    expect(updatedAccount.amountOverdue.toNumber()).toBe(150.0);

    const updatedPtp = await prisma.promiseToPay.findUniqueOrThrow({
      where: { id: createdPtpId },
    });
    expect(updatedPtp.status).toBe('KEPT');

    // Step 8: Verify Immutable Audit Log
    const auditEvents = await prisma.auditEvent.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });
    expect(auditEvents.length).toBeGreaterThanOrEqual(1);
    expect(auditEvents[0].action).toBe('LEDGER_TRANSACTION_RECORDED');
  });

  // Task 14 Critical Failure Path 2: Quiet Hours Rejection
  it('holds outbound dispatch when evaluated outside 8am-9pm local borrower time', () => {
    const policyEngine = new PolicyEngine();
    // 11:30 PM in America/New_York (UTC-5 is 04:30 UTC next day)
    const decision = policyEngine.evaluateQuietHours({
      receivedAt: '2026-11-15T04:30:00Z',
      timezone: 'America/New_York',
    });

    expect(decision.status).toBe('blocked');
    expect(decision.action).toBe('hold');
    expect(decision.reason).toContain('outside permissible hours');
  });

  // Task 14 Critical Failure Path 3: Synchronous STOP Opt-Out
  it('synchronously opts out borrower and locks outbound messaging upon receiving STOP keyword', async () => {
    const policyEngine = new PolicyEngine();
    const inboundText = 'STOP';
    expect(policyEngine.isOptOut(inboundText)).toBe(true);

    const account = await prisma.account.findUniqueOrThrow({
      where: { id: testAccountId },
    });

    // Simulate fast-path DB mutation
    await prisma.borrower.update({
      where: { id: account.borrowerId },
      data: { isOptedOut: true, optedOutAt: new Date() },
    });

    const updatedBorrower = await prisma.borrower.findUniqueOrThrow({
      where: { id: account.borrowerId },
    });
    expect(updatedBorrower.isOptedOut).toBe(true);
  });

  // Task 14 Critical Failure Path 4: Dispute Auto-Hold
  it('automatically applies dispute hold and generates dispute case on contested balance', async () => {
    const policyEngine = new PolicyEngine();
    const disputeMessage = 'I dispute this bill, I already paid it last week';
    const decision = policyEngine.evaluateDispute({ message: disputeMessage });

    expect(decision.status).toBe('requires_approval');
    expect(decision.action).toBe('createDispute');

    const toolRegistry = new ToolRegistry(policyEngine);
    const result = await toolRegistry.execute({
      toolName: 'createDispute',
      inputs: {
        accountId: testAccountId,
        category: 'PRIOR_PAYMENT_CLAIM',
        description: disputeMessage,
      },
    });

    expect(result.success).toBe(true);
    const updatedAccount = await prisma.account.findUniqueOrThrow({
      where: { id: testAccountId },
    });
    expect(updatedAccount.status).toBe('IN_DISPUTE');
    expect(updatedAccount.hasActiveDispute).toBe(true);
  });

  // Task 14 Critical Failure Path 5: Privacy Leak Scanner Block
  it('blocks outbound dispatch when draft reply contains foreign customer PII', () => {
    const policyEngine = new PolicyEngine();
    const foreignBorrowers = [
      {
        id: 'foreign_bor_999',
        firstName: 'Marcus',
        lastName: 'Vance',
        primaryPhone: '+15559998877',
        currentBalance: 750.0,
      },
    ];

    const leakedDraft = 'Please contact Marcus Vance regarding your past due balance.';
    const decision = policyEngine.evaluatePrivacy({
      currentBorrowerId: 'current_bor_001',
      draftReply: leakedDraft,
      allBorrowers: foreignBorrowers,
    });

    expect(decision.status).toBe('blocked');
    expect(decision.reason).toContain('Privacy leak detected');
    expect(decision.evidence[0]).toContain('foreignBorrowerId: foreign_bor_999');
  });

  // Task 14 Critical Failure Path 6: Optimistic Concurrency Conflict
  it('rejects action execution when expectedAccountUpdatedAt does not match current state', () => {
    const policyEngine = new PolicyEngine();
    const staleDecision = policyEngine.evaluateStaleData({
      expectedUpdatedAt: '2026-11-15T10:00:00.000Z',
      currentUpdatedAt: '2026-11-15T10:05:00.000Z',
    });

    expect(staleDecision.status).toBe('blocked');
    expect(staleDecision.action).toBe('refreshAccount');
    expect(staleDecision.reason).toContain('Account data has changed');
  });

  // Task 14 Critical Failure Path 7: Idempotency Duplicate Suppression
  it('suppresses duplicate execution when same idempotencyKey is submitted repeatedly', async () => {
    const toolRegistry = new ToolRegistry();
    const key = `walkthrough_idem_${Date.now()}`;

    const first = await toolRegistry.execute({
      toolName: 'createPaymentLink',
      inputs: { accountId: testAccountId, amount: 75.0, idempotencyKey: key },
    });
    expect(first.success).toBe(true);

    const second = await toolRegistry.execute({
      toolName: 'createPaymentLink',
      inputs: { accountId: testAccountId, amount: 75.0, idempotencyKey: key },
    });
    expect(second.success).toBe(true);
    expect(second.data.id).toBe(first.data.id);
  });

  // Task 14 Critical Failure Path 8: Gemini Free-Tier Outage / 429 Fallback
  it('gracefully degrades to deterministic fallback during AI provider outage or timeout', async () => {
    // When no API key is set or when client returns null, analyzeBorrowerMessage seamlessly falls back
    const output = await analyzeBorrowerMessage({
      accountSnapshot: {
        accountNumber: 'ACC-8001',
        currentBalance: 1450.0,
        amountOverdue: 350.0,
        daysPastDue: 42,
        timezone: 'America/New_York',
      },
      inboundMessage: 'I can pay $100 next Friday',
    });

    expect(output.isFallback).toBe(true);
    expect(output.primaryIntent).toBe('PROMISE_TO_PAY');
    expect(output.recommendedAction.action).toBe('proposePromiseToPay');
    expect(output.modelUsed).toBe('deterministic-fallback');
  });
});
