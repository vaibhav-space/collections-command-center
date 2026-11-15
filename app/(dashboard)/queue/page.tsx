import { QueueService } from '@/services/queue.service';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import {
  AlertCircle,
  Clock,
  ArrowRight,
  Filter,
  CheckCircle2,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function WorkQueuePage(props: {
  searchParams: Promise<{ priority?: string; reason?: string; search?: string }>;
}) {
  const searchParams = await props.searchParams;
  const queueService = new QueueService();
  const result = await queueService.getQueueItems({
    priority: searchParams.priority,
    reason: searchParams.reason,
    search: searchParams.search,
  });

  const priorityStyles: Record<string, string> = {
    URGENT: 'bg-rose-100 text-rose-800 border-rose-200',
    HIGH: 'bg-amber-100 text-amber-800 border-amber-200',
    MEDIUM: 'bg-blue-100 text-blue-800 border-blue-200',
    NORMAL: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Collector Work Queue
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Event-driven prioritization of delinquent accounts requiring timely intervention.
          </p>
        </div>

        {/* Priority Summary Count Pills */}
        <div className="flex items-center gap-2">
          <Link
            href="/queue?priority=URGENT"
            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition-colors"
          >
            {result.summary.urgentCount} Urgent
          </Link>
          <Link
            href="/queue?priority=HIGH"
            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors"
          >
            {result.summary.highCount} High
          </Link>
          <Link
            href="/queue?priority=MEDIUM"
            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"
          >
            {result.summary.mediumCount} Medium
          </Link>
          <Link
            href="/queue"
            className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            View All ({result.total})
          </Link>
        </div>
      </div>

      {/* Queue Table Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Account & Borrower</th>
                <th className="px-4 py-3">Balance / Overdue</th>
                <th className="px-4 py-3">DPD</th>
                <th className="px-4 py-3">Trigger Reason</th>
                <th className="px-4 py-3">Recommended Next Action</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Priority Badge */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                        priorityStyles[item.priority] || priorityStyles.NORMAL
                      }`}
                    >
                      {item.priority}
                    </span>
                  </td>

                  {/* Account & Borrower */}
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{item.borrowerName}</div>
                    <div className="text-[11px] text-slate-500">
                      {item.accountNumber} • {item.timezone}
                    </div>
                  </td>

                  {/* Balance / Overdue */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-semibold text-slate-900">
                      {formatCurrency(item.currentBalance)}
                    </div>
                    <div className="text-[11px] text-rose-600 font-medium">
                      Overdue: {formatCurrency(item.amountOverdue)}
                    </div>
                  </td>

                  {/* DPD */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-bold text-slate-700">{item.daysPastDue}</span>
                    <span className="text-[10px] text-slate-400 ml-1">days</span>
                  </td>

                  {/* Trigger Reason */}
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800 text-[11px]">
                      {item.triggerReason.replace(/_/g, ' ')}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate max-w-xs">
                      {item.triggerDescription}
                    </div>
                  </td>

                  {/* Recommended Next Action */}
                  <td className="px-4 py-3">
                    <div className="text-[11px] text-indigo-700 font-medium bg-indigo-50/60 px-2 py-1 rounded border border-indigo-100/80 inline-block">
                      {item.recommendedAction}
                    </div>
                  </td>

                  {/* Direct Workspace Action */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/workspace/${item.accountId}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-indigo-600 text-white font-medium text-xs hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      <span>Workspace</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {result.items.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-xs">
            No accounts match the selected queue filter.
          </div>
        )}
      </div>
    </div>
  );
}
