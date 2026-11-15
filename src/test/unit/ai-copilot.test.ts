import { describe, it, expect } from 'vitest';
import { analyzeBorrowerMessage } from '@/ai/service';

describe('AI Copilot Service', () => {
  const mockAccount = {
    accountNumber: 'ACC-8001',
    currentBalance: 1450.0,
    amountOverdue: 350.0,
    daysPastDue: 42,
    timezone: 'America/New_York',
  };

  it('correctly classifies promise to pay intent and extracts amount in deterministic mode', async () => {
    const output = await analyzeBorrowerMessage({
      accountSnapshot: mockAccount,
      inboundMessage: 'I can pay $200 next Tuesday',
      referenceTime: new Date('2026-11-15T10:00:00Z'),
    });

    expect(output.primaryIntent).toBe('PROMISE_TO_PAY');
    expect(output.entities.amount).toBe(200.0);
    expect(output.recommendedAction.action).toBe('proposePromiseToPay');
    expect(output.isFallback).toBe(true);
    expect(output.modelUsed).toBe('deterministic-fallback');
  });

  it('classifies dispute intent and recommends createDispute', async () => {
    const output = await analyzeBorrowerMessage({
      accountSnapshot: mockAccount,
      inboundMessage: 'I dispute this entire bill. I already paid last week.',
    });

    expect(output.primaryIntent).toBe('DISPUTE');
    expect(output.recommendedAction.action).toBe('createDispute');
    expect(output.draftReply).toContain('formal review');
  });

  it('classifies payment link request in existing conversation and includes payment link URL', async () => {
    const output = await analyzeBorrowerMessage({
      accountSnapshot: mockAccount,
      inboundMessage: 'Can you send me a link to pay online?',
      recentMessages: [
        { senderType: 'SYSTEM', channel: 'SMS', body: 'Your account is overdue.' },
        { senderType: 'BORROWER', channel: 'SMS', body: 'I want to pay.' },
      ],
    });

    expect(output.primaryIntent).toBe('PAYMENT_LINK_REQUEST');
    expect(output.recommendedAction.action).toBe('createPaymentLink');
    expect(output.draftReply).toContain('https://pay.financeops.demo');
  });

  it('suppresses unprompted balance in first message draft reply', async () => {
    const output = await analyzeBorrowerMessage({
      accountSnapshot: mockAccount,
      inboundMessage: 'Can you send me a link to pay online?',
      recentMessages: [], // First message in thread
    });

    // Per policy, first reply should not disclose dollar balance unless asked
    expect(output.draftReply).not.toContain('$350');
    expect(output.draftReply).not.toContain('$1,450.00');
    expect(output.draftReply).toContain('FinanceOps Loan Servicing');
  });
});
