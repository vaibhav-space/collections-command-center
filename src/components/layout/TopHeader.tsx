'use client';

import { Search, Bell, Shield, UserCircle2 } from 'lucide-react';

export function TopHeader() {
  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 sticky top-0 z-10">
      {/* Global Quick Search */}
      <div className="flex items-center w-96 relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search borrower, account (e.g. ACC-8001), phone, SSN..."
          className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white text-slate-900 placeholder:text-slate-400"
        />
      </div>

      {/* Operator & System Status Badges */}
      <div className="flex items-center gap-4">
        {/* Compliance Guard Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium">
          <Shield className="h-3.5 w-3.5 text-emerald-600" />
          <span>Policy Engine Active</span>
        </div>

        {/* Notifications */}
        <button
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors relative"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-white" />
        </button>

        <div className="h-4 w-px bg-slate-200" />

        {/* Operator Profile */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-medium text-xs">
            AR
          </div>
          <div className="text-left">
            <div className="text-xs font-semibold text-slate-900 leading-none">
              Alex Rivera
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
              Senior Collections Specialist
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
