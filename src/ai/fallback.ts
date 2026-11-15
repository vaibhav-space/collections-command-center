import { CopilotAnalysisOutput, BorrowerIntent } from './schemas';

export interface FallbackParams {
  inboundMessage: string;
  accountNumber: string;
  currentBalance: number;
  amountOverdue: number;
  timezone: string;
  referenceDate?: string;
}

export function generateDeterministicFallback(params: {
  inboundMessage: string;
  accountSnapshot: {
    accountNumber: string;
    currentBalance: number;
    amountOverdue: number;
    timezone: string;
  };
  errorReason?: string;
}): CopilotAnalysisOutput {
  const msg = params.inboundMessage.toLowerCase();
  let intent: BorrowerIntent = 'GENERAL_INQUIRY';
  let action: any = 'recordInteraction';
  let reason = 'General borrower inquiry recorded';
  let draft = `Hello. Thank you for your message regarding account ${params.accountSnapshot.accountNumber}. How may our loan servicing team assist you today?`;
  let extractedAmount: number | null = null;
  let extractedDate: string | null = null;

  // Amount extraction regex
  const amountMatch = msg.match(/\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)|\b(\d+(?:\.\d{2})?)\s*(?:dollars|bucks)?\b/);
  if (amountMatch) {
    const raw = amountMatch[1] || amountMatch[2];
    extractedAmount = parseFloat(raw.replace(/,/g, ''));
  }

  // Intent classification heuristics
  if (/\b(stop|unsubscribe|cancel|quit|end)\b/.test(msg)) {
    intent = 'STOP_OPT_OUT';
    action = 'recordInteraction';
    reason = 'Borrower requested opt-out; outbound messaging suppressed';
    draft = '';
  } else if (/\b(dispute|wrong amount|already paid|not mine|fraud|identity theft)\b/.test(msg)) {
    intent = 'DISPUTE';
    action = 'createDispute';
    reason = 'Borrower raised an account dispute requiring specialist review';
    draft = `Thank you for bringing this to our attention. We have logged a formal review for account ${params.accountSnapshot.accountNumber} and paused collection reminders while we verify your records.`;
  } else if (/\b(hardship|laid off|unemployed|hospital|medical|disaster)\b/.test(msg)) {
    intent = 'HARDSHIP';
    action = 'createHardshipCase';
    reason = 'Borrower indicated financial hardship';
    draft = `We understand you are experiencing unexpected difficulties. We have placed a temporary hold on your account while we review available hardship relief programs.`;
  } else if (/\b(can pay|promise|will pay|can send|pay \$|pay by)\b/.test(msg)) {
    intent = 'PROMISE_TO_PAY';
    action = 'proposePromiseToPay';
    reason = 'Borrower offered a payment commitment';
    const targetAmount = extractedAmount || Math.min(200, params.accountSnapshot.amountOverdue);
    // 7 days in future by default
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    extractedDate = futureDate;
    draft = `Thank you for your commitment to pay $${targetAmount.toFixed(2)} on ${futureDate}. I have recorded this arrangement on your account.`;
  } else if (/\b(link|pay online|website|portal|how to pay)\b/.test(msg)) {
    intent = 'PAYMENT_LINK_REQUEST';
    action = 'createPaymentLink';
    reason = 'Borrower requested a digital payment link';
    const linkAmt = extractedAmount || params.accountSnapshot.amountOverdue || params.accountSnapshot.currentBalance;
    draft = `Hi, here is a secure payment link for $${linkAmt.toFixed(2)} to make your payment online: https://pay.financeops.demo/l/secure`;
  } else if (/\b(how much|balance|what do i owe|amount due)\b/.test(msg)) {
    intent = 'BALANCE_INQUIRY';
    action = 'recordInteraction';
    reason = 'Borrower asked for balance information';
    draft = `Hi, your current verified balance is $${params.accountSnapshot.currentBalance.toFixed(2)}, with $${params.accountSnapshot.amountOverdue.toFixed(2)} currently past due.`;
  } else if (/\b(human|agent|representative|speak to someone|call me)\b/.test(msg)) {
    intent = 'REQUEST_HUMAN_ASSISTANCE';
    action = 'createHumanHandoff';
    reason = 'Borrower requested direct contact with a human agent';
    draft = `I have notified our loan operations team. A representative will contact you shortly during regular business hours.`;
  }

  return {
    summary: `Borrower submitted message: "${params.inboundMessage}". Classified intent: ${intent}.`,
    primaryIntent: intent,
    sentiment: intent === 'DISPUTE' || intent === 'HARDSHIP' ? 'DISTRESSED' : 'COOPERATIVE',
    confidenceScore: 0.85,
    entities: {
      amount: extractedAmount,
      date: extractedDate,
      paymentMethod: null,
      preferredChannel: null,
      disputeCategory: intent === 'DISPUTE' ? 'BILLING_ERROR' : null,
      hardshipReason: intent === 'HARDSHIP' ? 'FINANCIAL_HARDSHIP' : null,
    },
    recommendedAction: {
      action,
      reason,
      requiredInputs: {
        amount: extractedAmount,
        dueDate: extractedDate,
      },
      evidence: [`account: ${params.accountSnapshot.accountNumber}`, `balance: $${params.accountSnapshot.currentBalance.toFixed(2)}`],
      requiresHumanApproval: true,
    },
    draftReply: draft,
    isFallback: true,
    modelUsed: 'deterministic-fallback',
  };
}
