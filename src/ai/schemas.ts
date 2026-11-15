import { z } from 'zod';

export const BorrowerIntentEnum = z.enum([
  'BALANCE_INQUIRY',
  'PAYMENT_CONFIRMATION',
  'PAYMENT_DIFFICULTY',
  'PROMISE_TO_PAY',
  'PAYMENT_LINK_REQUEST',
  'DISPUTE',
  'WRONG_NUMBER',
  'FRAUD_OR_IDENTITY_THEFT',
  'HARDSHIP',
  'REQUEST_HUMAN_ASSISTANCE',
  'CONTACT_PREFERENCE_CHANGE',
  'STOP_OPT_OUT',
  'GENERAL_INQUIRY',
]);

export type BorrowerIntent = z.infer<typeof BorrowerIntentEnum>;

export const ExtractedEntitiesSchema = z.object({
  amount: z.number().nullable().describe('Extracted payment or promise amount in USD'),
  date: z.string().nullable().describe('ISO 8601 target payment date or normalized relative date'),
  paymentMethod: z.string().nullable().describe('Payment method such as ACH, debit card, wire'),
  preferredChannel: z.enum(['SMS', 'EMAIL', 'PHONE_CALL']).nullable().describe('Requested contact channel'),
  disputeCategory: z.string().nullable().describe('Billing error, fraud, prior payment claim'),
  hardshipReason: z.string().nullable().describe('Job loss, illness, natural disaster'),
});

export type ExtractedEntities = z.infer<typeof ExtractedEntitiesSchema>;

export const ProposedActionSchema = z.object({
  action: z.enum([
    'verifyPaymentStatus',
    'proposePromiseToPay',
    'createPaymentLink',
    'scheduleCallback',
    'updateContactPreference',
    'createDispute',
    'createHardshipCase',
    'createHumanHandoff',
    'recordInteraction',
    'wait',
  ]),
  reason: z.string().describe('Clear rationale for why this action is recommended'),
  requiredInputs: z.record(z.any()).describe('Key-value arguments required to execute the tool'),
  evidence: z.array(z.string()).describe('Account facts supporting the proposal'),
  requiresHumanApproval: z.boolean().default(true),
});

export type ProposedAction = z.infer<typeof ProposedActionSchema>;

export const CopilotAnalysisOutputSchema = z.object({
  summary: z.string().describe('Concise 2-3 sentence summary of borrower situation and dialogue history'),
  primaryIntent: BorrowerIntentEnum,
  sentiment: z.enum(['COOPERATIVE', 'FRUSTRATED', 'DISTRESSED', 'NEUTRAL', 'HOSTILE']),
  confidenceScore: z.number().min(0).max(1).describe('Confidence score in intent classification'),
  entities: ExtractedEntitiesSchema,
  recommendedAction: ProposedActionSchema,
  draftReply: z.string().describe('Empathetic, verified draft response for operator review'),
  isFallback: z.boolean().default(false).describe('Whether this analysis was produced by deterministic fallback'),
  modelUsed: z.string().default('gemini-2.0-flash').describe('Model or rule engine identifier'),
});

export type CopilotAnalysisOutput = z.infer<typeof CopilotAnalysisOutputSchema>;
