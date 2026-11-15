'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ListTodo,
  Users,
  MessageSquareText,
  AlertCircle,
  ShieldCheck,
  History,
  Building2,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/queue', label: 'Work Queue', icon: ListTodo },
  { href: '/borrowers', label: 'Borrowers 360', icon: Users },
  { href: '/workspace/ACC-8001', label: 'Workspace', icon: MessageSquareText },
  { href: '/cases', label: 'Cases & Review', icon: AlertCircle },
  { href: '/policies', label: 'Policy Centre', icon: ShieldCheck },
  { href: '/audit', label: 'Audit Trail', icon: History },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200 gap-3">
        <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
          FO
        </div>
        <div>
          <div className="font-semibold text-sm tracking-tight text-slate-900 leading-none">
            FinanceOps
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            Command Center
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Collections Operations
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href.split('/')[1] ? `/${item.href.split('/')[1]}` : item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Portfolio Info Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
          <Building2 className="h-4 w-4 text-slate-400" />
          <span>Demo Portfolio</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
          <span>Active Accounts: 10</span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
            Live DB
          </span>
        </div>
      </div>
    </aside>
  );
}
