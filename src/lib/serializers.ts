import { Account, AccountLedgerEntry, PaymentLink, Payment, PromiseToPay } from '@prisma/client';

export function serializeAccount(account: any) {
  if (!account) return null;
  return {
    ...account,
    currentBalance: typeof account.currentBalance === 'object' && account.currentBalance !== null ? account.currentBalance.toNumber() : account.currentBalance,
    principalOwed: typeof account.principalOwed === 'object' && account.principalOwed !== null ? account.principalOwed.toNumber() : account.principalOwed,
    interestOwed: typeof account.interestOwed === 'object' && account.interestOwed !== null ? account.interestOwed.toNumber() : account.interestOwed,
    feesOwed: typeof account.feesOwed === 'object' && account.feesOwed !== null ? account.feesOwed.toNumber() : account.feesOwed,
    amountOverdue: typeof account.amountOverdue === 'object' && account.amountOverdue !== null ? account.amountOverdue.toNumber() : account.amountOverdue,
    ledgerEntries: account.ledgerEntries ? account.ledgerEntries.map(serializeLedgerEntry) : undefined,
    paymentLinks: account.paymentLinks ? account.paymentLinks.map(serializePaymentLink) : undefined,
    payments: account.payments ? account.payments.map(serializePayment) : undefined,
    promisesToPay: account.promisesToPay ? account.promisesToPay.map(serializePromiseToPay) : undefined,
  };
}

export function serializeLedgerEntry(entry: any) {
  return {
    ...entry,
    amount: typeof entry.amount === 'object' && entry.amount !== null ? entry.amount.toNumber() : entry.amount,
    balanceAfter: typeof entry.balanceAfter === 'object' && entry.balanceAfter !== null ? entry.balanceAfter.toNumber() : entry.balanceAfter,
  };
}

export function serializePaymentLink(link: any) {
  return {
    ...link,
    amount: typeof link.amount === 'object' && link.amount !== null ? link.amount.toNumber() : link.amount,
  };
}

export function serializePayment(payment: any) {
  return {
    ...payment,
    amount: typeof payment.amount === 'object' && payment.amount !== null ? payment.amount.toNumber() : payment.amount,
  };
}

export function serializePromiseToPay(ptp: any) {
  return {
    ...ptp,
    amount: typeof ptp.amount === 'object' && ptp.amount !== null ? ptp.amount.toNumber() : ptp.amount,
  };
}
