export type PolicyStatus = 'allowed' | 'blocked' | 'requires_approval';

export interface PolicyDecision {
  status: PolicyStatus;
  action: string;
  reason: string;
  policyVersion: string;
  evaluatedAt: string;
  evidence: string[];
  remediation?: string;
  sanitizedReply?: string;
}

export interface PolicyConfig {
  quietHours: {
    startHour: number; // 8 (8:00 AM)
    endHour: number;   // 21 (9:00 PM)
  };
  optOutKeywords: string[];
  disputeKeywords: string[];
  amountInquiryKeywords: string[];
  safeFirstReplyTemplate: string;
}

export const DEFAULT_POLICY_CONFIG: PolicyConfig = {
  quietHours: {
    startHour: 8,
    endHour: 21,
  },
  optOutKeywords: ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'QUIT', 'END'],
  disputeKeywords: [
    'dispute',
    'disputing',
    'wrong amount',
    'already paid',
    'paid in full',
    'not my debt',
    'not mine',
    'never opened',
    'identity theft',
    'fraud',
    'fraudulent',
    'attorney',
    'lawyer',
    'bankruptcy',
  ],
  amountInquiryKeywords: [
    'how much',
    'what do i owe',
    'what is my balance',
    'current balance',
    'balance due',
    'amount owed',
    'amount due',
    'payoff amount',
    'how much do i owe',
  ],
  safeFirstReplyTemplate:
    'Hello. This is the FinanceOps Loan Servicing team. How may we assist you today?',
};
