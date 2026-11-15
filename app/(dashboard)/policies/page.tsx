import { prisma } from '@/lib/prisma';
import { ShieldCheck, Scale, Clock, Lock, AlertTriangle, FileText } from 'lucide-react';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function PoliciesPage() {
  const activePolicy = await prisma.policyVersion.findFirst({
    where: { isActive: true },
  });

  const POLICIES_LIST = [
    {
      num: 1,
      title: 'Borrower Identity & Ownership',
      category: 'Security & Tenant Boundary',
      citation: 'Internal Tenant Isolation',
      description: 'Rejects any tool call or ledger mutation where the target account does not match the authenticated borrower record.',
      enforcement: 'Deterministic In-Code Check',
    },
    {
      num: 2,
      title: 'Tenant Scope Isolation',
      category: 'Multi-Tenant Security',
      citation: 'Enterprise Tenant Context',
      description: 'All database queries and operator actions are strictly scoped to the active organization tenant ID.',
      enforcement: 'Prisma Scoped Queries',
    },
    {
      num: 3,
      title: 'Mandatory STOP Opt-Out Fast-Path',
      category: 'Consent & Communications',
      citation: 'TCPA / CFPB Regulation F §1006.6(e)',
      description: 'Keywords (STOP, UNSUBSCRIBE, CANCEL, QUIT, END) instantly set isOptedOut=true, pause the conversation, and suppress outbound replies.',
      enforcement: 'Synchronous Ingestion Fast-Path',
    },
    {
      num: 4,
      title: 'Prior Opt-Out Enforcement',
      category: 'Consent & Communications',
      citation: 'TCPA Opt-Out Permanence',
      description: 'Blocks any outbound automated message if the borrower previously opted out, until explicit written revoking of opt-out occurs.',
      enforcement: 'Pre-Execution Policy Filter',
    },
    {
      num: 5,
      title: 'Permissible Contact Hours (Quiet Hours)',
      category: 'Time & Place Restrictions',
      citation: 'FDCPA §805(a)(1) / 12 CFR §1006.14(b)',
      description: 'Restricts outbound message delivery to 8:00 AM – 9:00 PM in the borrower\'s local IANA timezone. Outside this window, messages are held for morning delivery.',
      enforcement: 'Intl.DateTimeFormat Evaluation',
    },
    {
      num: 6,
      title: 'Dispute & Contest Escalation',
      category: 'Disputes & Inaccuracies',
      citation: 'FDCPA §809(b) / CFPB Regulation F',
      description: 'Inbound claims of prior payment, double billing, or contested amounts immediately halt outbound collection outreach and route to human review.',
      enforcement: 'Negation-Aware Keyword & LLM Gate',
    },
    {
      num: 7,
      title: 'Negation-Aware Dispute Guard',
      category: 'False-Positive Defense',
      citation: 'Operational Quality Standard',
      description: 'Prevents false-positive escalations when a borrower explicitly says "no dispute" or "not disputing the balance".',
      enforcement: 'Regex Negation Parsing',
    },
    {
      num: 8,
      title: 'Identity Theft & Fraud Hold',
      category: 'Fraud Prevention',
      citation: 'FCRA §605B / FDCPA §808',
      description: 'Allegations of identity theft or unauthenticated loan origination apply an immediate collection freeze pending documentary proof.',
      enforcement: 'Supervisor Review Queue',
    },
    {
      num: 9,
      title: 'Attorney Representation Bar',
      category: 'Third-Party Communications',
      citation: 'FDCPA §805(a)(2)',
      description: 'If a borrower informs the team that an attorney represents them, direct borrower communication ceases and is routed to legal counsel.',
      enforcement: 'Legal Hold State Machine',
    },
    {
      num: 10,
      title: 'Bankruptcy Stay Compliance',
      category: 'Statutory Injunction',
      citation: '11 U.S.C. §362 (Automatic Stay)',
      description: 'Notice of bankruptcy filing halts all collection communications, payments, and automated reminders.',
      enforcement: 'Hard Account Lock',
    },
    {
      num: 11,
      title: 'Hardship Forbearance Routing',
      category: 'Borrower Relief',
      citation: 'CFPB Consumer Treatment Guidelines',
      description: 'Borrower declarations of unemployment, illness, or emergency pause active collections and route to hardship relief programs.',
      enforcement: 'Case Management Transition',
    },
    {
      num: 12,
      title: 'Human Assistance Escalation',
      category: 'Customer Rights',
      citation: 'Borrower Autonomy Principles',
      description: 'Any explicit request to speak to a human representative immediately assigns the account to the supervisor queue.',
      enforcement: 'Human Handoff Workflow',
    },
    {
      num: 13,
      title: 'First-Reply Debt Non-Disclosure',
      category: 'Third-Party Privacy',
      citation: 'FDCPA §805(b) Debt Privacy',
      description: 'The monetary debt balance is strictly suppressed in the initial greeting turn unless the borrower explicitly asks for their balance.',
      enforcement: 'Draft Reply Sanitization Filter',
    },
    {
      num: 14,
      title: 'Cross-Customer Privacy Scanner',
      category: 'Data Leakage Protection',
      citation: 'Gramm-Leach-Bliley Act (GLBA)',
      description: 'Scans outbound draft replies against all other borrower records; blocks transmission if foreign names, phone numbers, or balances appear.',
      enforcement: 'Post-Generation Regex Scanner',
    },
    {
      num: 15,
      title: 'Payment Status Verification Guard',
      category: 'Deceptive Practices',
      citation: 'CFPB Regulation F §1006.18',
      description: 'Prohibits confirming a debt has cleared or settled until the external payment provider webhook returns a verified SETTLED status.',
      enforcement: 'Reconciliation Gate',
    },
    {
      num: 16,
      title: 'Payment Link Balance Ceiling',
      category: 'Financial Accuracy',
      citation: 'Double-Entry Accounting Rule',
      description: 'Payment links cannot be generated for an amount exceeding the borrower\'s verified current ledger balance.',
      enforcement: 'Service-Layer Arithmetic Guard',
    },
    {
      num: 17,
      title: 'Promise-to-Pay Ceiling & Window',
      category: 'Commitment Integrity',
      citation: 'Operational Credit Policy',
      description: 'Commitments cannot exceed total balance, cannot be in the past, and cannot exceed 90 days from the current date.',
      enforcement: 'Date & Decimal Bounds Check',
    },
    {
      num: 18,
      title: 'Idempotency & Duplicate Suppression',
      category: 'Distributed Safety',
      citation: 'Financial Concurrency Standard',
      description: 'Mutating operations require unique idempotency keys in PostgreSQL, preventing duplicate payment links or competing promises.',
      enforcement: 'Unique DB Key Constraints',
    },
    {
      num: 19,
      title: 'Stale Data Guard (Optimistic Concurrency)',
      category: 'Data Integrity',
      citation: 'ACID Consistency Principle',
      description: 'Rejects execution of an action if the account balance was updated between copilot proposal generation and human operator click.',
      enforcement: 'Timestamp Version Validation',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Policy Centre & Compliance Ruleset
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic governance engine enforcing statutory U.S. lending regulations and operational safety guardrails.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Active: {activePolicy?.versionString || 'v2026.11-us-standard'}</span>
          </span>
        </div>
      </div>

      {/* Policies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {POLICIES_LIST.map((p) => (
          <div
            key={p.num}
            className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2 hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-indigo-600">
                Rule #{p.num}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                {p.category}
              </span>
            </div>

            <h2 className="text-xs font-bold text-slate-900">
              {p.title}
            </h2>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              {p.description}
            </p>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
              <span>Citation: <strong className="text-slate-700">{p.citation}</strong></span>
              <span className="text-emerald-700 font-semibold">{p.enforcement}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
