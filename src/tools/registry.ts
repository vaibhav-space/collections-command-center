import { prisma } from '@/lib/prisma';
import { PolicyEngine } from '@/policies/engine';
import { LedgerService } from '@/services/ledger.service';
import { Prisma, AccountStatus, CasePriority, ChannelType, SenderType } from '@prisma/client';
import {
  GetAccountSnapshotInputSchema,
  GetBalanceInputSchema,
  GetPaymentHistoryInputSchema,
  CreatePaymentLinkInputSchema,
  ProposePromiseToPayInputSchema,
  ConfirmPromiseToPayInputSchema,
  ReconcilePaymentInputSchema,
  CreateDisputeInputSchema,
  CreateHardshipCaseInputSchema,
  CreateHumanHandoffInputSchema,
  UpdateContactPreferenceInputSchema,
  RecordInteractionInputSchema,
} from './schemas';

export interface ExecuteToolParams {
  toolName: string;
  inputs: Record<string, any>;
  operatorId?: string;
  idempotencyKey?: string;
}

export interface ToolExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  auditEventId?: string;
  policyStatus?: string;
}

export class ToolRegistry {
  private policyEngine: PolicyEngine;
  private ledgerService: LedgerService;

  constructor(policyEngine?: PolicyEngine, ledgerService?: LedgerService) {
    this.policyEngine = policyEngine ?? new PolicyEngine();
    this.ledgerService = ledgerService ?? new LedgerService();
  }

  private async resolveOperatorId(operatorId?: string): Promise<string | null> {
    if (!operatorId || operatorId === 'system') return null;
    const op = await prisma.operator.findUnique({ where: { id: operatorId } });
    return op ? op.id : null;
  }

  async execute(params: ExecuteToolParams): Promise<ToolExecutionResult> {
    const { toolName, inputs, operatorId } = params;
    const idempotencyKey = params.idempotencyKey || inputs.idempotencyKey;
    const validOpId = await this.resolveOperatorId(operatorId);

    try {
      switch (toolName) {
        case 'getAccountSnapshot': {
          const parsed = GetAccountSnapshotInputSchema.parse(inputs);
          const account = await prisma.account.findUniqueOrThrow({
            where: { id: parsed.accountId },
            include: {
              borrower: {
                include: { preferences: true, contactMethods: true },
              },
              promisesToPay: {
                where: { status: { in: ['PROPOSED', 'PENDING_CONFIRMATION', 'APPROVED', 'DUE'] } },
                orderBy: { dueDate: 'asc' },
              },
              cases: {
                where: { status: { in: ['OPEN', 'UNDER_REVIEW', 'ACTION_PENDING'] } },
              },
            },
          });

          return { success: true, data: account };
        }

        case 'getBalance': {
          const parsed = GetBalanceInputSchema.parse(inputs);
          const account = await prisma.account.findUniqueOrThrow({
            where: { id: parsed.accountId },
            select: { currentBalance: true, amountOverdue: true, currency: true, status: true },
          });

          return {
            success: true,
            data: {
              balance: account.currentBalance.toNumber(),
              amountOverdue: account.amountOverdue.toNumber(),
              currency: account.currency,
              status: account.status,
            },
          };
        }

        case 'getPaymentHistory': {
          const parsed = GetPaymentHistoryInputSchema.parse(inputs);
          const ledger = await this.ledgerService.getAccountLedger(parsed.accountId);
          return { success: true, data: ledger };
        }

        case 'createPaymentLink': {
          const parsed = CreatePaymentLinkInputSchema.parse(inputs);
          const account = await prisma.account.findUniqueOrThrow({
            where: { id: parsed.accountId },
          });

          // Idempotency check
          const effectiveKey = idempotencyKey || `idem_link_${account.id}_${parsed.amount}_${Math.floor(Date.now() / 60000)}`;
          const existing = await prisma.paymentLink.findUnique({
            where: { idempotencyKey: effectiveKey },
          });
          if (existing) {
            return { success: true, data: existing };
          }

          // Policy check
          const policyVerdict = this.policyEngine.evaluateFinancialLimits({
            action: 'createPaymentLink',
            amount: parsed.amount,
            currentBalance: account.currentBalance.toNumber(),
          });

          if (policyVerdict.status === 'blocked') {
            return {
              success: false,
              error: policyVerdict.reason,
              policyStatus: policyVerdict.status,
            };
          }

          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
          const hash = Math.random().toString(36).substring(2, 8);
          const url = `https://pay.financeops.demo/l/${hash}`;

          const link = await prisma.paymentLink.create({
            data: {
              accountId: account.id,
              amount: new Prisma.Decimal(parsed.amount),
              url,
              expiresAt,
              idempotencyKey: effectiveKey,
              status: 'ACTIVE',
            },
          });

          const audit = await prisma.auditEvent.create({
            data: {
              tenantId: account.tenantId,
              accountId: account.id,
              operatorId: validOpId,
              actorType: validOpId ? 'OPERATOR' : 'SYSTEM',
              action: 'PAYMENT_LINK_CREATED',
              entityType: 'PaymentLink',
              entityId: link.id,
              newState: { amount: parsed.amount, url, expiresAt: expiresAt.toISOString(), operatorRequested: operatorId },
            },
          });

          return { success: true, data: link, auditEventId: audit.id, policyStatus: 'allowed' };
        }

        case 'proposePromiseToPay': {
          const parsed = ProposePromiseToPayInputSchema.parse(inputs);
          const account = await prisma.account.findUniqueOrThrow({
            where: { id: parsed.accountId },
          });

          const effectiveKey = idempotencyKey || `idem_ptp_${account.id}_${parsed.amount}_${parsed.dueDate}`;
          const existing = await prisma.promiseToPay.findUnique({
            where: { idempotencyKey: effectiveKey },
          });
          if (existing) {
            return { success: true, data: existing };
          }

          // Policy check
          const policyVerdict = this.policyEngine.evaluateFinancialLimits({
            action: 'proposePromiseToPay',
            amount: parsed.amount,
            currentBalance: account.currentBalance.toNumber(),
            dueDate: parsed.dueDate,
          });

          if (policyVerdict.status === 'blocked') {
            return {
              success: false,
              error: policyVerdict.reason,
              policyStatus: policyVerdict.status,
            };
          }

          const ptp = await prisma.promiseToPay.create({
            data: {
              accountId: account.id,
              amount: new Prisma.Decimal(parsed.amount),
              dueDate: new Date(parsed.dueDate),
              status: 'APPROVED',
              proposedBy: validOpId ? 'OPERATOR' : 'BORROWER',
              approvedBy: validOpId || null,
              idempotencyKey: effectiveKey,
              notes: parsed.notes,
            },
          });

          const audit = await prisma.auditEvent.create({
            data: {
              tenantId: account.tenantId,
              accountId: account.id,
              operatorId: validOpId,
              actorType: validOpId ? 'OPERATOR' : 'SYSTEM',
              action: 'PROMISE_TO_PAY_RECORDED',
              entityType: 'PromiseToPay',
              entityId: ptp.id,
              newState: { amount: parsed.amount, dueDate: parsed.dueDate, status: 'APPROVED' },
            },
          });

          return { success: true, data: ptp, auditEventId: audit.id, policyStatus: 'allowed' };
        }

        case 'confirmPromiseToPay': {
          const parsed = ConfirmPromiseToPayInputSchema.parse(inputs);
          const ptp = await prisma.promiseToPay.update({
            where: { id: parsed.promiseId },
            data: {
              status: 'APPROVED',
              confirmedAt: new Date(),
              approvedBy: validOpId || null,
            },
            include: { account: true },
          });

          await prisma.auditEvent.create({
            data: {
              tenantId: ptp.account.tenantId,
              accountId: ptp.accountId,
              operatorId: validOpId,
              actorType: validOpId ? 'OPERATOR' : 'SYSTEM',
              action: 'PROMISE_TO_PAY_CONFIRMED',
              entityType: 'PromiseToPay',
              entityId: ptp.id,
              newState: { status: 'APPROVED' },
            },
          });

          return { success: true, data: ptp };
        }

        case 'reconcilePayment': {
          const parsed = ReconcilePaymentInputSchema.parse(inputs);
          const account = await prisma.account.findUniqueOrThrow({
            where: { id: parsed.accountId },
          });

          if (parsed.status === 'FAILED') {
            return {
              success: true,
              data: { status: 'FAILED', message: 'Payment marked as failed; ledger balance unchanged.' },
            };
          }

          const providerRef = parsed.providerRef || `SIM_SETTLE_${Date.now()}`;

          // Create payment record
          const payment = await prisma.payment.create({
            data: {
              accountId: account.id,
              paymentLinkId: parsed.paymentLinkId || null,
              promiseToPayId: parsed.promiseToPayId || null,
              amount: new Prisma.Decimal(parsed.amount),
              status: 'SETTLED',
              providerRef,
              settledAt: new Date(),
            },
          });

          // Record ledger transaction
          const ledgerResult = await this.ledgerService.recordTransaction({
            accountId: account.id,
            entryType: 'PAYMENT_CREDIT',
            amount: new Prisma.Decimal(-parsed.amount),
            description: `Payment settlement - Ref #${providerRef}`,
            referenceId: payment.id,
            operatorId: validOpId || 'system',
          });

          // If linked to promise, mark promise KEPT
          if (parsed.promiseToPayId) {
            await prisma.promiseToPay.update({
              where: { id: parsed.promiseToPayId },
              data: { status: 'KEPT' },
            });
          }

          // If linked to payment link, mark link COMPLETED
          if (parsed.paymentLinkId) {
            await prisma.paymentLink.update({
              where: { id: parsed.paymentLinkId },
              data: { status: 'COMPLETED' },
            });
          }

          return {
            success: true,
            data: {
              payment,
              ledgerResult,
            },
          };
        }

        case 'createDispute': {
          const parsed = CreateDisputeInputSchema.parse(inputs);
          const account = await prisma.account.findUniqueOrThrow({
            where: { id: parsed.accountId },
          });

          const newCase = await prisma.case.create({
            data: {
              accountId: account.id,
              category: 'DISPUTE',
              priority: 'URGENT',
              status: 'OPEN',
              title: `Dispute: ${parsed.category}`,
              description: parsed.description,
            },
          });

          await prisma.account.update({
            where: { id: account.id },
            data: { status: AccountStatus.IN_DISPUTE, hasActiveDispute: true },
          });

          await prisma.auditEvent.create({
            data: {
              tenantId: account.tenantId,
              accountId: account.id,
              operatorId: validOpId,
              actorType: validOpId ? 'OPERATOR' : 'SYSTEM',
              action: 'DISPUTE_CASE_OPENED',
              entityType: 'Case',
              entityId: newCase.id,
              newState: { category: parsed.category, status: 'OPEN' },
            },
          });

          return { success: true, data: newCase };
        }

        case 'createHardshipCase': {
          const parsed = CreateHardshipCaseInputSchema.parse(inputs);
          const account = await prisma.account.findUniqueOrThrow({
            where: { id: parsed.accountId },
          });

          const newCase = await prisma.case.create({
            data: {
              accountId: account.id,
              category: 'HARDSHIP',
              priority: 'HIGH',
              status: 'OPEN',
              title: 'Hardship Review Request',
              description: parsed.details,
            },
          });

          await prisma.account.update({
            where: { id: account.id },
            data: { status: AccountStatus.HARDSHIP_PAUSED, hasActiveHardship: true },
          });

          return { success: true, data: newCase };
        }

        case 'createHumanHandoff': {
          const parsed = CreateHumanHandoffInputSchema.parse(inputs);
          const account = await prisma.account.findUniqueOrThrow({
            where: { id: parsed.accountId },
          });

          const newCase = await prisma.case.create({
            data: {
              accountId: account.id,
              category: 'AI_UNCERTAINTY',
              priority: parsed.priority as CasePriority,
              status: 'OPEN',
              title: 'Human Specialist Escalation',
              description: parsed.reason,
            },
          });

          return { success: true, data: newCase };
        }

        case 'updateContactPreference': {
          const parsed = UpdateContactPreferenceInputSchema.parse(inputs);
          const account = await prisma.account.findUniqueOrThrow({
            where: { id: parsed.accountId },
            include: { borrower: true },
          });

          const pref = await prisma.contactPreference.upsert({
            where: { borrowerId: account.borrowerId },
            update: { preferredChannel: parsed.preferredChannel as ChannelType },
            create: {
              borrowerId: account.borrowerId,
              preferredChannel: parsed.preferredChannel as ChannelType,
            },
          });

          return { success: true, data: pref };
        }

        case 'recordInteraction': {
          const parsed = RecordInteractionInputSchema.parse(inputs);
          let conversation = await prisma.conversation.findFirst({
            where: { accountId: parsed.accountId, channel: parsed.channel as ChannelType },
          });

          if (!conversation) {
            conversation = await prisma.conversation.create({
              data: {
                accountId: parsed.accountId,
                channel: parsed.channel as ChannelType,
                status: 'ACTIVE',
              },
            });
          }

          const message = await prisma.message.create({
            data: {
              conversationId: conversation.id,
              channel: parsed.channel as ChannelType,
              senderType: parsed.senderType as SenderType,
              body: parsed.body,
              sentAt: new Date(),
            },
          });

          await prisma.conversation.update({
            where: { id: conversation.id },
            data: { lastMessageAt: new Date() },
          });

          return { success: true, data: message };
        }

        default:
          return { success: false, error: `Unknown tool name: ${toolName}` };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown tool execution error';
      return { success: false, error: msg };
    }
  }
}
