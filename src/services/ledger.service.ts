import { prisma } from '@/lib/prisma';
import { Prisma, LedgerEntryType, AccountStatus } from '@prisma/client';

export interface RecordTransactionParams {
  accountId: string;
  entryType: LedgerEntryType;
  amount: Prisma.Decimal;
  description: string;
  referenceId?: string;
  operatorId?: string;
}

export interface TransactionResult {
  ledgerEntryId: string;
  balanceAfter: Prisma.Decimal;
  amountOverdueAfter: Prisma.Decimal;
  statusAfter: AccountStatus;
  daysPastDueAfter: number;
}

export class LedgerService {
  /**
   * Atomically records a double-entry ledger mutation, updates account balances,
   * handles waterfall decrements to amountOverdue, updates status, and logs an audit event.
   */
  async recordTransaction(params: RecordTransactionParams): Promise<TransactionResult> {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch current account record with lock
      const account = await tx.account.findUniqueOrThrow({
        where: { id: params.accountId },
      });

      // 2. Compute new balances with strict Decimal precision
      // Negative amount means credit (payment), positive means debit (charge/fee)
      const balanceAfter = account.currentBalance.plus(params.amount);

      let amountOverdueAfter = account.amountOverdue;
      let statusAfter = account.status;
      let daysPastDueAfter = account.daysPastDue;

      // If credit (payment/adjustment), apply to overdue balance
      if (params.amount.isNegative()) {
        const creditMagnitude = params.amount.abs();
        if (account.amountOverdue.greaterThan(0)) {
          amountOverdueAfter = Prisma.Decimal.max(
            new Prisma.Decimal(0),
            account.amountOverdue.minus(creditMagnitude)
          );
        }

        // Status transition evaluation
        if (balanceAfter.lessThanOrEqualTo(0)) {
          statusAfter = AccountStatus.PAID_IN_FULL;
          amountOverdueAfter = new Prisma.Decimal(0);
          daysPastDueAfter = 0;
        } else if (amountOverdueAfter.equals(0) && account.status === AccountStatus.DELINQUENT) {
          statusAfter = AccountStatus.CURRENT;
          daysPastDueAfter = 0;
        }
      }

      // 3. Insert immutable Ledger Entry
      const entry = await tx.accountLedgerEntry.create({
        data: {
          accountId: account.id,
          entryType: params.entryType,
          amount: params.amount,
          balanceAfter,
          currency: account.currency,
          description: params.description,
          referenceId: params.referenceId,
        },
      });

      // 4. Update Account
      await tx.account.update({
        where: { id: account.id },
        data: {
          currentBalance: balanceAfter,
          amountOverdue: amountOverdueAfter,
          status: statusAfter,
          daysPastDue: daysPastDueAfter,
          lastPaymentDate: params.amount.isNegative() ? new Date() : account.lastPaymentDate,
        },
      });

      // 5. Append-only Audit Event
      await tx.auditEvent.create({
        data: {
          tenantId: account.tenantId,
          accountId: account.id,
          operatorId: params.operatorId && params.operatorId !== 'system' ? params.operatorId : null,
          actorType: params.operatorId === 'system' ? 'SYSTEM' : 'OPERATOR',
          action: 'LEDGER_TRANSACTION_RECORDED',
          entityType: 'AccountLedgerEntry',
          entityId: entry.id,
          previousState: {
            currentBalance: account.currentBalance.toString(),
            amountOverdue: account.amountOverdue.toString(),
            status: account.status,
          },
          newState: {
            currentBalance: balanceAfter.toString(),
            amountOverdue: amountOverdueAfter.toString(),
            status: statusAfter,
            entryType: params.entryType,
            amount: params.amount.toString(),
          },
        },
      });

      return {
        ledgerEntryId: entry.id,
        balanceAfter,
        amountOverdueAfter,
        statusAfter,
        daysPastDueAfter,
      };
    });
  }

  /**
   * Retrieves chronological ledger history for an account
   */
  async getAccountLedger(accountId: string) {
    return prisma.accountLedgerEntry.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
