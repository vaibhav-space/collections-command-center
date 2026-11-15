import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { AlertCircle, ShieldAlert, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function CasesPage() {
  const cases = await prisma.case.findMany({
    include: {
      account: {
        include: { borrower: true },
      },
      assignedTo: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const priorityStyles: Record<string, string> = {
    URGENT: 'bg-rose-100 text-rose-800 border-rose-200',
    HIGH: 'bg-amber-100 text-amber-800 border-amber-200',
    MEDIUM: 'bg-blue-100 text-blue-800 border-blue-200',
    LOW: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Cases & Human Review Queue
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Operational triage for sensitive borrower situations requiring specialist human judgment.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Account & Borrower</th>
                <th className="px-4 py-3">Case Title & Description</th>
                <th className="px-4 py-3">Assigned To</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cases.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                        priorityStyles[c.priority] || priorityStyles.MEDIUM
                      }`}
                    >
                      {c.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                    {c.category.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">
                      {c.account.borrower.firstName} {c.account.borrower.lastName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {c.account.accountNumber}
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-sm">
                    <div className="font-semibold text-slate-800 text-[11px]">{c.title}</div>
                    <div className="text-[11px] text-slate-500 truncate">{c.description}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                    {c.assignedTo?.name || 'Unassigned'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/workspace/${c.accountId}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 font-medium text-xs transition-colors"
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
      </div>
    </div>
  );
}
