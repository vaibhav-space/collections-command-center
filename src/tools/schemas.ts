import { z } from 'zod';

export const GetAccountSnapshotInputSchema = z.object({
  accountId: z.string().min(1, 'accountId is required'),
});

export const GetBalanceInputSchema = z.object({
  accountId: z.string().min(1, 'accountId is required'),
});

export const GetPaymentHistoryInputSchema = z.object({
  accountId: z.string().min(1, 'accountId is required'),
});

export const CreatePaymentLinkInputSchema = z.object({
  accountId: z.string().min(1, 'accountId is required'),
  amount: z.number().positive('Amount must be greater than zero'),
  idempotencyKey: z.string().optional(),
});

export const ProposePromiseToPayInputSchema = z.object({
  accountId: z.string().min(1, 'accountId is required'),
  amount: z.number().positive('Amount must be greater than zero'),
  dueDate: z.string().min(1, 'dueDate is required'),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const ConfirmPromiseToPayInputSchema = z.object({
  promiseId: z.string().min(1, 'promiseId is required'),
});

export const ReconcilePaymentInputSchema = z.object({
  accountId: z.string().min(1, 'accountId is required'),
  paymentLinkId: z.string().optional(),
  promiseToPayId: z.string().optional(),
  amount: z.number().positive(),
  status: z.enum(['SETTLED', 'FAILED']),
  providerRef: z.string().optional(),
});

export const CreateDisputeInputSchema = z.object({
  accountId: z.string().min(1, 'accountId is required'),
  category: z.string().default('BILLING_ERROR'),
  description: z.string().min(1, 'description is required'),
});

export const CreateHardshipCaseInputSchema = z.object({
  accountId: z.string().min(1, 'accountId is required'),
  details: z.string().min(1, 'details are required'),
});

export const CreateHumanHandoffInputSchema = z.object({
  accountId: z.string().min(1, 'accountId is required'),
  reason: z.string().min(1, 'reason is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
});

export const UpdateContactPreferenceInputSchema = z.object({
  accountId: z.string().min(1, 'accountId is required'),
  preferredChannel: z.enum(['SMS', 'EMAIL', 'PHONE_CALL']),
});

export const RecordInteractionInputSchema = z.object({
  accountId: z.string().min(1, 'accountId is required'),
  channel: z.enum(['SMS', 'EMAIL', 'PHONE_CALL']),
  body: z.string().min(1),
  senderType: z.enum(['BORROWER', 'OPERATOR', 'AI_AGENT', 'SYSTEM']),
});
