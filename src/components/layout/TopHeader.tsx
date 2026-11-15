'use client';

import { Shield, Building2 } from 'lucide-react';

export function TopHeader() {
  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 sticky top-0 z-10">
      {/* Operating Context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Building2 className="h-3.5 w-3.5 text-slate-400" />
          <span>Tenant:</span>
          <span className="font-semibold text-slate-800">Consumer Lending Division</span>
        </div>
        <div className="h-3 w-px bg-slate-200" />
        <div className="text-xs text-slate-500">
          Jurisdiction: <span className="font-medium text-slate-700">US Federal (TCPA / FDCPA)</span>
        </div>
      </div>

      {/* Operator & System Status Badges */}
      <div className="flex items-center gap-4">
        {/* Compliance Guard Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium">
          <Shield className="h-3.5 w-3.5 text-emerald-600" />
          <span>Policy Engine Active</span>
        </div>

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
