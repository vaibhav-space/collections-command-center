import { prisma } from '@/lib/prisma';
import { formatDateTime } from '@/lib/utils';
import { History, Shield, Activity } from 'lucide-react';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  const events = await prisma.auditEvent.findMany({
    include: {
      account: {
        include: { borrower: true },
      },
      operator: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const actorStyles: Record<string, string> = {
    OPERATOR: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    SYSTEM: 'bg-slate-100 text-slate-700 border-slate-200',
    BORROWER: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    AI_COPILOT: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Regulatory Audit Trail
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Immutable, append-only forensic event log recording every automated proposal, policy verdict, human approval, and ledger mutation.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity Type</th>
                <th className="px-4 py-3">Account Reference</th>
                <th className="px-4 py-3">State Change Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {events.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-sans">
                    {formatDateTime(evt.createdAt)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border font-sans ${
                        actorStyles[evt.actorType] || actorStyles.SYSTEM
                      }`}
                    >
                      {evt.actorType}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap font-sans">
                    {evt.action.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-sans">
                    {evt.entityType}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {evt.account ? (
                      <span className="text-indigo-600 font-medium">
                        {evt.account.accountNumber} ({evt.account.borrower.lastName})
                      </span>
                    ) : (
                      <span className="text-slate-400 font-sans">System Level</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[10px] text-slate-600 max-w-md truncate">
                    {evt.newState ? JSON.stringify(evt.newState) : '—'}
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
