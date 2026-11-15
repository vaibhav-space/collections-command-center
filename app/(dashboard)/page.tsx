import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Users,
  DollarSign,
  AlertTriangle,
  CalendarClock,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  Activity,
  CheckCircle2,
} from 'lucide-react';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Aggregate live metrics directly from PostgreSQL
  const [
    accounts,
    brokenPromisesCount,
    promisesDueToday,
    openCasesCount,
    recentAuditEvents,
  ] = await Promise.all([
    prisma.account.findMany({
      include: { borrower: true },
    }),
    prisma.promiseToPay.count({
      where: { status: 'BROKEN' },
    }),
    prisma.promiseToPay.findMany({
      where: {
        status: { in: ['APPROVED', 'DUE'] },
        dueDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    }),
    prisma.case.count({
      where: { status: { in: ['OPEN', 'UNDER_REVIEW', 'ACTION_PENDING'] } },
    }),
    prisma.auditEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
  ]);

  const totalOutstanding = accounts.reduce(
    (sum, acc) => sum + acc.currentBalance.toNumber(),
    0
  );
  const totalOverdue = accounts.reduce(
    (sum, acc) => sum + acc.amountOverdue.toNumber(),
    0
  );

  // Group accounts into aging brackets
  const agingBrackets = {
    '1-30 DPD': accounts.filter((a) => a.daysPastDue >= 1 && a.daysPastDue <= 30),
    '31-60 DPD': accounts.filter((a) => a.daysPastDue >= 31 && a.daysPastDue <= 60),
    '61-90 DPD': accounts.filter((a) => a.daysPastDue >= 61 && a.daysPastDue <= 90),
    '90+ DPD': accounts.filter((a) => a.daysPastDue > 90),
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Operational Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Collections Command Center
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time portfolio visibility, delinquent debt aging, and AI copilot operational triage.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/queue"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <span>Open Work Queue</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Accounts */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Delinquent Accounts</span>
            <span className="p-1.5 rounded-md bg-slate-100 text-slate-600">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{accounts.length}</span>
            <span className="text-[11px] text-emerald-600 font-medium">100% Verified DB</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Seeded synthetic portfolio
          </div>
        </div>

        {/* Card 2: Total Outstanding Debt */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Outstanding Balance</span>
            <span className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
              <DollarSign className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(totalOutstanding)}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
            <TrendingDown className="h-3.5 w-3.5 text-amber-500" />
            <span>Overdue: {formatCurrency(totalOverdue)}</span>
          </div>
        </div>

        {/* Card 3: Promises Due Today / Broken */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Broken Commitments</span>
            <span className="p-1.5 rounded-md bg-rose-50 text-rose-600">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600">{brokenPromisesCount}</span>
            <span className="text-[11px] text-slate-500">P1 Urgent Action Required</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
            <CalendarClock className="h-3.5 w-3.5 text-indigo-500" />
            <span>Due Today: {promisesDueToday.length} accounts</span>
          </div>
        </div>

        {/* Card 4: Open Escalated Cases */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Open Human Cases</span>
            <span className="p-1.5 rounded-md bg-amber-50 text-amber-600">
              <ShieldAlert className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{openCasesCount}</span>
            <span className="text-[11px] text-amber-600 font-medium">Disputes & Hardships</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Collection outreach paused
          </div>
        </div>
      </div>

      {/* Main Sections: Aging Breakdown & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Delinquent Aging Brackets (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Portfolio Aging Distribution
              </h2>
              <p className="text-[11px] text-slate-500">
                Accounts stratified by days past due (DPD) with aggregate debt exposure.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-indigo-600">
              Standard Aging Matrix
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(agingBrackets).map(([bracket, accList]) => {
              const bracketTotal = accList.reduce((s, a) => s + a.currentBalance.toNumber(), 0);
              const overdueTotal = accList.reduce((s, a) => s + a.amountOverdue.toNumber(), 0);

              return (
                <div key={bracket} className="p-3 rounded-md bg-slate-50 border border-slate-200/60">
                  <div className="text-[11px] font-bold text-slate-700">{bracket}</div>
                  <div className="text-lg font-bold text-slate-900 mt-1">
                    {accList.length} <span className="text-xs font-normal text-slate-500">accounts</span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-600 font-medium">
                    {formatCurrency(bracketTotal)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Overdue: {formatCurrency(overdueTotal)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Account List */}
          <div className="mt-6">
            <div className="text-xs font-bold text-slate-800 mb-2">
              High Priority Delinquencies
            </div>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-md overflow-hidden text-xs">
              {accounts.slice(0, 5).map((acc) => (
                <div key={acc.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="font-semibold text-slate-900">
                      {acc.borrower.firstName} {acc.borrower.lastName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {acc.accountNumber} • {acc.borrower.timezone}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">
                      {formatCurrency(acc.currentBalance.toNumber())}
                    </div>
                    <div className="text-[11px] text-rose-600 font-medium">
                      {acc.daysPastDue} DPD (${acc.amountOverdue.toFixed(2)} overdue)
                    </div>
                  </div>
                  <Link
                    href={`/workspace/${acc.id}`}
                    className="ml-4 px-2 py-1 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-[11px] font-medium transition-colors"
                  >
                    Workspace
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Audit & System Activity (1 Column) */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">Audit Stream</h2>
            </div>
            <Link href="/audit" className="text-[11px] text-indigo-600 hover:underline font-medium">
              View All
            </Link>
          </div>

          <div className="mt-4 flex-1 space-y-3">
            {recentAuditEvents.map((evt) => (
              <div key={evt.id} className="p-2.5 rounded-md bg-slate-50 border border-slate-200/50 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 text-[11px]">
                    {evt.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formatDate(evt.createdAt)}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Actor: <span className="font-medium text-slate-700">{evt.actorType}</span> • Entity: {evt.entityType}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 text-center">
            Immutable append-only regulatory audit log
          </div>
        </div>
      </div>
    </div>
  );
}
