import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { Users, ArrowRight, ShieldCheck, Mail, Phone, Calendar } from 'lucide-react';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function BorrowersPage() {
  const borrowers = await prisma.borrower.findMany({
    include: {
      accounts: true,
      preferences: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Borrower Directory (Account 360)
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Comprehensive customer profiles, contact preferences, and verified accounting ledgers.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Borrower Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Timezone</th>
                <th className="px-4 py-3">Account Number</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Overdue</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">360 View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {borrowers.map((b) => {
                const acc = b.accounts[0];
                return (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-700">
                      {b.borrowerCode}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {b.firstName} {b.lastName}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      <div>{b.primaryPhone}</div>
                      <div className="text-[11px] text-slate-400">{b.primaryEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {b.timezone}
                    </td>
                    <td className="px-4 py-3 font-mono text-indigo-600 font-medium">
                      {acc ? acc.accountNumber : 'N/A'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {acc ? formatCurrency(acc.currentBalance.toNumber()) : '$0.00'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-rose-600">
                      {acc ? formatCurrency(acc.amountOverdue.toNumber()) : '$0.00'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {acc ? acc.status : 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {acc && (
                        <Link
                          href={`/borrowers/${acc.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 font-medium text-xs transition-colors"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
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
