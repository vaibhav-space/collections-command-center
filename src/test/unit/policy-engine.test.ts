import { describe, it, expect } from 'vitest';
import { PolicyEngine } from '@/policies/engine';

describe('Deterministic Policy Engine', () => {
  const engine = new PolicyEngine();

  // Rule 3: STOP Opt-Out
  it('correctly detects statutory opt-out keywords', () => {
    expect(engine.isOptOut('STOP')).toBe(true);
    expect(engine.isOptOut('stop.')).toBe(true);
    expect(engine.isOptOut('  UNSUBSCRIBE  ')).toBe(true);
    expect(engine.isOptOut('Can you stop calling me')).toBe(false);
  });

  // Rule 5: TCPA Quiet Hours
  it('blocks outbound messaging outside 8am-9pm local borrower time', () => {
    const decision = engine.evaluateQuietHours({
      receivedAt: '2026-11-15T04:30:00Z', // 11:30 PM in America/New_York (UTC-5)
      timezone: 'America/New_York',
    });
    expect(decision.status).toBe('blocked');
    expect(decision.action).toBe('hold');
    expect(decision.reason).toContain('outside permissible hours');
  });

  it('allows outbound messaging during 8am-9pm local borrower time', () => {
    const decision = engine.evaluateQuietHours({
      receivedAt: '2026-11-15T15:30:00Z', // 10:30 AM in America/New_York
      timezone: 'America/New_York',
    });
    expect(decision.status).toBe('allowed');
    expect(decision.action).toBe('send');
  });

  // Rule 6 & 7: Disputes with negation-awareness
  it('routes contested charges to human approval with dispute hold', () => {
    const decision = engine.evaluateDispute({
      message: 'I dispute this bill, I already paid it last week.',
    });
    expect(decision.status).toBe('requires_approval');
    expect(decision.action).toBe('createDispute');
  });

  it('avoids false-positive disputes when borrower explicitly negates dispute', () => {
    const decision = engine.evaluateDispute({
      message: 'I have no dispute with the bill, I just need a couple extra days.',
    });
    expect(decision.status).toBe('allowed');
  });

  // Rule 13: First-reply amount disclosure
  it('suppresses unprompted debt disclosure in first reply', () => {
    const decision = engine.evaluateFirstReplyDisclosure({
      isFirstMessage: true,
      inboundMessage: 'Hello, who is this?',
      draftReply: 'Hi, you owe $1,450.00 on your loan.',
    });
    expect(decision.status).toBe('requires_approval');
    expect(decision.sanitizedReply).toBeDefined();
    expect(decision.sanitizedReply).not.toContain('$1,450.00');
  });

  it('permits debt disclosure in first reply if borrower explicitly asks', () => {
    const decision = engine.evaluateFirstReplyDisclosure({
      isFirstMessage: true,
      inboundMessage: 'How much do I currently owe on my account?',
      draftReply: 'Hi, your current balance is $1,450.00.',
    });
    expect(decision.status).toBe('allowed');
  });

  // Rule 14: Privacy scanner
  it('avoids false-positive privacy leaks on single words while catching full-name and phone leaks', () => {
    const safeDecision = engine.evaluatePrivacy({
      currentBorrowerId: 'bor_001',
      draftReply: 'We will follow up with you in May.',
      allBorrowers: [
        {
          id: 'bor_002',
          firstName: 'May',
          lastName: 'Johnson',
          primaryPhone: '+15559876543',
          currentBalance: 500,
        },
      ],
    });
    expect(safeDecision.status).toBe('allowed');

    const leakDecision = engine.evaluatePrivacy({
      currentBorrowerId: 'bor_001',
      draftReply: 'Please contact May Johnson at 555-987-6543.',
      allBorrowers: [
        {
          id: 'bor_002',
          firstName: 'May',
          lastName: 'Johnson',
          primaryPhone: '+15559876543',
          currentBalance: 500,
        },
      ],
    });
    expect(leakDecision.status).toBe('blocked');
    expect(leakDecision.reason).toContain('Privacy leak detected');
  });

  // Rule 16 & 17: Financial limits & promise window
  it('blocks payment links exceeding verified account balance', () => {
    const decision = engine.evaluateFinancialLimits({
      action: 'createPaymentLink',
      amount: 2000.0,
      currentBalance: 1450.0,
    });
    expect(decision.status).toBe('blocked');
    expect(decision.reason).toContain('cannot exceed verified account balance');
  });

  it('blocks promises-to-pay scheduled in the past', () => {
    const decision = engine.evaluateFinancialLimits({
      action: 'proposePromiseToPay',
      amount: 200.0,
      currentBalance: 1450.0,
      dueDate: '2020-01-01',
    });
    expect(decision.status).toBe('blocked');
    expect(decision.reason).toContain('cannot be in the past');
  });

  // Rule 19: Stale data guard (optimistic concurrency)
  it('rejects execution when account balance was modified after copilot proposal', () => {
    const decision = engine.evaluateStaleData({
      expectedUpdatedAt: '2026-11-15T10:00:00.000Z',
      currentUpdatedAt: '2026-11-15T10:05:00.000Z',
    });
    expect(decision.status).toBe('blocked');
    expect(decision.reason).toContain('Account data has changed');
  });
});
