import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import {
  ArrowLeft,
  MessageSquareText,
  DollarSign,
  ShieldAlert,
  CalendarClock,
  Clock,
  FileText,
  CreditCard,
  CheckCircle2,
} from 'lucide-react';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function Borrower360Page(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const account = await prisma.account.findFirst({
    where: {
      OR: [{ id }, { accountNumber: id }],
    },
    include: {
      borrower: {
        include: { preferences: true, contactMethods: true },
      },
      ledgerEntries: {
        orderBy: { createdAt: 'desc' },
      },
      paymentLinks: {
        orderBy: { createdAt: 'desc' },
      },
      promisesToPay: {
        orderBy: { dueDate: 'desc' },
      },
      cases: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!account) {
    notFound();
  }

  const { borrower } = account;

  return (
    <div className="space-y-6">
      {/* Top Navigation & Profile Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/borrowers"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {borrower.firstName} {borrower.lastName}
              </h1>
              <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {account.accountNumber}
              </span>
              <span className="text-xs px-2 py-0.5 rounded font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                {account.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Borrower ID: {borrower.borrowerCode} • Timezone: {borrower.timezone}
            </p>
          </div>
        </div>

        <Link
          href={`/workspace/${account.id}`}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <MessageSquareText className="h-4 w-4" />
          <span>Open AI Conversation Workspace</span>
        </Link>
      </div>

      {/* 3-Card Summary Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Financial Summary */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Verified Accounting Ledger
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(account.currentBalance.toNumber())}
          </div>
          <div className="mt-1 text-xs text-rose-600 font-semibold">
            {formatCurrency(account.amountOverdue.toNumber())} Overdue ({account.daysPastDue} DPD)
          </div>
          <div className="mt-3 text-[11px] text-slate-500 border-t border-slate-100 pt-2 space-y-0.5">
            <div>Principal: {formatCurrency(account.principalOwed.toNumber())}</div>
            <div>Interest: {formatCurrency(account.interestOwed.toNumber())}</div>
            <div>Fees: {formatCurrency(account.feesOwed.toNumber())}</div>
          </div>
        </div>

        {/* Contact & Consent */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Contact & Regulatory Consent
          </div>
          <div className="mt-3 text-xs space-y-1.5 text-slate-700">
            <div>
              <span className="text-slate-400 font-normal">Primary Phone:</span>{' '}
              <span className="font-semibold">{borrower.primaryPhone}</span>
            </div>
            <div>
              <span className="text-slate-400 font-normal">Primary Email:</span>{' '}
              <span className="font-semibold">{borrower.primaryEmail}</span>
            </div>
            <div>
              <span className="text-slate-400 font-normal">Preferred Channel:</span>{' '}
              <span className="font-semibold text-indigo-600">
                {borrower.preferences?.[0]?.preferredChannel || 'EMAIL'}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-slate-500">STOP Opt-Out:</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  borrower.isOptedOut
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {borrower.isOptedOut ? 'OPTED OUT' : 'ACTIVE CONSENT'}
              </span>
            </div>
          </div>
        </div>

        {/* Active Commitments & Flags */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Cases & Sensitive Flags
          </div>
          <div className="mt-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Active Dispute:</span>
              <span className="font-semibold text-slate-800">
                {account.hasActiveDispute ? 'YES (Hold Applied)' : 'None'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Hardship Declaration:</span>
              <span className="font-semibold text-slate-800">
                {account.hasActiveHardship ? 'YES (Paused)' : 'None'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Legal Representation:</span>
              <span className="font-semibold text-slate-800">
                {account.hasLegalRepresentation ? 'YES (Attorney Hold)' : 'None'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Ledger, Promises, Payment Links */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600" />
            <span>Immutable Account Ledger Entries</span>
          </h2>
          <span className="text-xs text-slate-500">Exact Decimal Arithmetic</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Entry Type</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Balance After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {account.ledgerEntries.map((entry) => {
                const isCredit = entry.amount.isNegative();
                return (
                  <tr key={entry.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                      {formatDate(entry.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {entry.entryType.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {entry.description}
                    </td>
                    <td
                      className={`px-4 py-2.5 font-semibold whitespace-nowrap ${
                        isCredit ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {isCredit
                        ? `-${formatCurrency(entry.amount.abs().toNumber())}`
                        : `+${formatCurrency(entry.amount.toNumber())}`}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(entry.balanceAfter.toNumber())}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
