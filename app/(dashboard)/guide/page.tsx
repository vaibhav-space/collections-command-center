'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Eye,
  X,
  ExternalLink,
  Zap,
} from 'lucide-react';

interface PageItem {
  id: string;
  rank: string;
  title: string;
  route: string;
  isPrimary?: boolean;
  image: string;
  punchline: string;
  chips: string[];
}

const PAGES: PageItem[] = [
  {
    id: 'workspace',
    rank: '#1 MUST-SEE',
    title: 'AI Conversation Workspace',
    route: '/workspace/ACC-8001',
    isPrimary: true,
    image: '/screenshots/workspace.png',
    punchline: 'The core copilot: combines live borrower financials with Gemini intent extraction and deterministic policy enforcement.',
    chips: ['Gemini Flash Cascade', 'Policy Gate Verdict', '1-Click Tool Execution', 'Dispute & Handoff Escalation'],
  },
  {
    id: 'queue',
    rank: '#2',
    title: 'Collector Work Queue',
    route: '/queue',
    image: '/screenshots/queue.png',
    punchline: 'Prioritizes delinquent borrowers by days past due (DPD), balance exposure, and urgent SLA countdowns.',
    chips: ['SLA Countdown', 'Risk Scoring', '1-Click Session Launch'],
  },
  {
    id: 'dashboard',
    rank: '#3',
    title: 'Collections Overview',
    route: '/',
    image: '/screenshots/dashboard.png',
    punchline: 'Portfolio cockpit tracking total delinquent volume ($8,850), cure rates (64.2%), and active collector queues.',
    chips: ['Macro Portfolio KPI', 'Cure Rate Tracking', 'Live Event Feed'],
  },
  {
    id: 'borrowers',
    rank: '#4',
    title: 'Borrower 360 Profile',
    route: '/borrowers/ACC-8001',
    image: '/screenshots/borrower360.png',
    punchline: 'Single customer view with verified balances, TCPA opt-in consent status, and chronological contact history.',
    chips: ['Verified Balance', 'TCPA Consent Flag', 'Interaction Timeline'],
  },
  {
    id: 'cases',
    rank: '#5',
    title: 'Cases & Escalation Review',
    route: '/cases',
    image: '/screenshots/cases.png',
    punchline: 'Where "Escalate to Lead" lands: specialized queue for formal disputes, hardship reviews, and supervisor sign-offs.',
    chips: ['Dispute Freezes', 'Hardship Cases', 'Lead Specialist Assignment'],
  },
  {
    id: 'policies',
    rank: '#6',
    title: 'Regulatory Policy Centre',
    route: '/policies',
    image: '/screenshots/policies.png',
    punchline: 'Live rule engine enforcing US Federal TCPA (8am-9pm local) and FDCPA (7-in-7 contact caps) compliance.',
    chips: ['TCPA Quiet Hours', 'FDCPA 7-in-7 Caps', 'Mini-Miranda Enforcement'],
  },
  {
    id: 'audit',
    rank: '#7',
    title: 'Forensic Audit Trail',
    route: '/audit',
    image: '/screenshots/audit.png',
    punchline: 'Tamper-evident log of every automated LLM proposal, policy gate check, and human specialist execution.',
    chips: ['Immutable Ledger', 'Timestamp & Actor Tracking', 'Bank Audit Ready'],
  },
];

export default function GuidePage() {
  const [activeModalImage, setActiveModalImage] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  const testScript = 'I can pay $200 next Tuesday';

  const handleCopy = () => {
    navigator.clipboard.writeText(testScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      {/* 1. Header: Ultra-Short Elevator Pitch */}
      <section className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Variant 2 Executive Guide
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              FinanceOps Command Center
            </h1>

            <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
              Pairs <strong className="text-white font-semibold">real LLMs</strong> (intent extraction & relative date parsing) with a <strong className="text-white font-semibold">deterministic policy gate</strong> (TCPA & FDCPA) and 1-click human execution.
            </p>

            <div className="flex flex-wrap gap-2 text-xs text-slate-400 pt-1">
              <span className="px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">⚡ Gemini Multi-Model Cascade</span>
              <span className="px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">🛡️ Pure Code Policy Engine</span>
              <span className="px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">👤 1-Click Human Approval</span>
              <span className="px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">🗄️ PostgreSQL Ledger</span>
            </div>
          </div>

          {/* Quick Action Box */}
          <div className="bg-slate-800/90 rounded-xl p-4 border border-slate-700 space-y-3 shrink-0 md:w-72">
            <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Quick Test Prompt</span>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
              >
                {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedScript ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="bg-slate-900 rounded-lg p-2.5 border border-slate-800 text-xs font-mono text-amber-300">
              &quot;{testScript}&quot;
            </div>
            <Link
              href="/workspace/ACC-8001"
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
            >
              Test Live in Workspace #1
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Cathryn Lavery Diagram: Density 4/10, No Shadows, Editorial Lines */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Architecture Flow</div>
            <h2 className="text-lg font-bold text-slate-900">How Every Inbound Interaction Executes</h2>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Zero Unchecked AI Actions
          </div>
        </div>

        {/* Editorial SVG Diagram (Cathryn Lavery Design Principles) */}
        <div className="w-full overflow-x-auto py-2">
          <svg
            viewBox="0 0 960 220"
            className="w-full min-w-[760px] h-auto select-none"
            style={{ fontFamily: 'Inter, -apple-system, sans-serif' }}
          >
            <defs>
              <marker
                id="diagram-arrow"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#94A3B8" />
              </marker>
            </defs>

            {/* Connecting Arrows */}
            {/* Arrow 1 -> 2 */}
            <path
              d="M 216 110 L 254 110"
              stroke="#CBD5E1"
              strokeWidth="2"
              markerEnd="url(#diagram-arrow)"
              fill="none"
            />
            <text x="235" y="100" textAnchor="middle" fontSize="9" fill="#94A3B8" fontFamily="monospace">
              stream
            </text>

            {/* Arrow 2 -> 3 */}
            <path
              d="M 476 110 L 514 110"
              stroke="#CBD5E1"
              strokeWidth="2"
              markerEnd="url(#diagram-arrow)"
              fill="none"
            />
            <text x="495" y="100" textAnchor="middle" fontSize="9" fill="#94A3B8" fontFamily="monospace">
              propose
            </text>

            {/* Arrow 3 -> 4 */}
            <path
              d="M 726 110 L 764 110"
              stroke="#CBD5E1"
              strokeWidth="2"
              markerEnd="url(#diagram-arrow)"
              fill="none"
            />
            <text x="745" y="100" textAnchor="middle" fontSize="9" fill="#94A3B8" fontFamily="monospace">
              verdict
            </text>

            {/* Node 1: Inbound Signal */}
            <g transform="translate(16, 20)">
              <rect
                width="200"
                height="180"
                rx="8"
                fill="#FAFAFA"
                stroke="#E2E8F0"
                strokeWidth="1.5"
              />
              <text x="16" y="28" fontSize="10" fontWeight="bold" fill="#94A3B8" fontFamily="monospace">
                01 / INBOUND
              </text>
              <text x="16" y="48" fontSize="14" fontWeight="bold" fill="#0F172A">
                Borrower Signal
              </text>
              
              {/* Message chip */}
              <rect x="16" y="64" width="168" height="52" rx="6" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
              <text x="26" y="85" fontSize="11" fill="#334155" fontStyle="italic">
                &quot;I can pay $200
              </text>
              <text x="26" y="102" fontSize="11" fill="#334155" fontStyle="italic">
                next Tuesday&quot;
              </text>

              <text x="16" y="142" fontSize="10" fill="#64748B">
                Channel: SMS • US/Eastern
              </text>
              <text x="16" y="158" fontSize="10" fill="#94A3B8" fontFamily="monospace">
                Sarah Jenkins (ACC-8001)
              </text>
            </g>

            {/* Node 2: Real LLM Copilot (Indigo Focus) */}
            <g transform="translate(260, 20)">
              <rect
                width="216"
                height="180"
                rx="8"
                fill="#F8FAFC"
                stroke="#C7D2FE"
                strokeWidth="1.5"
              />
              <text x="16" y="28" fontSize="10" fontWeight="bold" fill="#4F46E5" fontFamily="monospace">
                02 / REAL LLM COPILOT
              </text>
              <text x="16" y="48" fontSize="14" fontWeight="bold" fill="#0F172A">
                Gemini Cascade
              </text>

              {/* Extraction tags */}
              <rect x="16" y="64" width="184" height="24" rx="4" fill="#EEF2FF" />
              <text x="24" y="80" fontSize="10" fontWeight="bold" fill="#4338CA" fontFamily="monospace">
                intent: PAYMENT_PROMISE
              </text>

              <rect x="16" y="94" width="184" height="24" rx="4" fill="#F1F5F9" />
              <text x="24" y="110" fontSize="10" fill="#334155" fontFamily="monospace">
                parsed_amount: $200.00
              </text>

              <rect x="16" y="124" width="184" height="24" rx="4" fill="#F1F5F9" />
              <text x="24" y="140" fontSize="10" fill="#334155" fontFamily="monospace">
                promise_date: Nov 20, 2026
              </text>

              <text x="16" y="168" fontSize="9" fill="#94A3B8" fontFamily="monospace">
                Outputs structured tool proposal
              </text>
            </g>

            {/* Node 3: Policy Engine Gate (Emerald Focus) */}
            <g transform="translate(520, 20)">
              <rect
                width="206"
                height="180"
                rx="8"
                fill="#FAFAFA"
                stroke="#A7F3D0"
                strokeWidth="1.5"
              />
              <text x="16" y="28" fontSize="10" fontWeight="bold" fill="#059669" fontFamily="monospace">
                03 / POLICY GATE
              </text>
              <text x="16" y="48" fontSize="14" fontWeight="bold" fill="#0F172A">
                Deterministic Rules
              </text>

              <text x="16" y="74" fontSize="10.5" fill="#334155">
                ✓ TCPA Calling Hours (8am-9pm)
              </text>
              <text x="16" y="92" fontSize="10.5" fill="#334155">
                ✓ FDCPA 7-in-7 Frequency Cap
              </text>
              <text x="16" y="110" fontSize="10.5" fill="#334155">
                ✓ Active Opt-in Consent Verified
              </text>
              <text x="16" y="128" fontSize="10.5" fill="#334155">
                ✓ Optimistic Lock Unchanged
              </text>

              {/* Verdict Badge */}
              <rect x="16" y="142" width="174" height="24" rx="4" fill="#ECFDF5" stroke="#A7F3D0" strokeWidth="1" />
              <text x="103" y="158" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#065F46" fontFamily="monospace">
                POLICY VERDICT: ALLOWED
              </text>
            </g>

            {/* Node 4: Human Execution */}
            <g transform="translate(770, 20)">
              <rect
                width="174"
                height="180"
                rx="8"
                fill="#FAFAFA"
                stroke="#E2E8F0"
                strokeWidth="1.5"
              />
              <text x="16" y="28" fontSize="10" fontWeight="bold" fill="#64748B" fontFamily="monospace">
                04 / HUMAN GATE
              </text>
              <text x="16" y="48" fontSize="14" fontWeight="bold" fill="#0F172A">
                Specialist Action
              </text>

              {/* Button */}
              <rect x="16" y="66" width="142" height="32" rx="6" fill="#4F46E5" />
              <text x="87" y="86" textAnchor="middle" fontSize="10.5" fontWeight="bold" fill="#FFFFFF">
                Approve & Execute
              </text>

              <text x="16" y="122" fontSize="10.5" fill="#0F172A" fontWeight="500">
                1-Click Execution:
              </text>
              <text x="16" y="140" fontSize="10" fill="#64748B">
                • Updates PostgreSQL DB
              </text>
              <text x="16" y="156" fontSize="10" fill="#64748B">
                • Writes Immutable Audit
              </text>
              <text x="16" y="172" fontSize="10" fill="#64748B">
                • Dispatches borrower SMS
              </text>
            </g>
          </svg>
        </div>

        {/* 3-Bullet Rationale */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="font-bold text-slate-800">1. Take-Home Met: </span>
            <span className="text-slate-600">Variant 1 solved 100% of the prompt specs with zero fluff.</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="font-bold text-slate-800">2. Why Build Variant 2: </span>
            <span className="text-slate-600">Researched real-world debt recovery ops: balancing empathy with strict law.</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="font-bold text-slate-800">3. Real LLM vs Mocks: </span>
            <span className="text-slate-600">Real Gemini cascade parses messy slang; code policy gate stops violations.</span>
          </div>
        </div>
      </section>

      {/* 3. The 7 Pages Visual Tour (Workspace #1 First) */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Visual Page Breakdown</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            The #1 Workspace is the primary copilot engine. All other 6 modules support it.
          </p>
        </div>

        <div className="space-y-8">
          {PAGES.map((page) => (
            <div
              key={page.id}
              className={`rounded-xl border transition-all ${
                page.isPrimary
                  ? 'bg-gradient-to-b from-white to-indigo-50/40 border-indigo-200 shadow-md ring-1 ring-indigo-200/50'
                  : 'bg-white border-slate-200 shadow-sm'
              } p-5 sm:p-6`}
            >
              <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* Content Side */}
                <div className="lg:w-5/12 space-y-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
                        page.isPrimary
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {page.rank}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{page.route}</span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900">{page.title}</h3>

                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {page.punchline}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {page.chips.map((chip, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/60"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>

                  <div className="pt-2">
                    <Link
                      href={page.route}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                        page.isPrimary
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      Open Live Page
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {/* Screenshot Side */}
                <div className="lg:w-7/12 w-full">
                  <div
                    onClick={() => setActiveModalImage(page.image)}
                    className="group relative cursor-pointer rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shadow-sm transition-transform duration-200 hover:shadow"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={page.image}
                      alt={page.title}
                      className="w-full h-auto object-cover group-hover:scale-[1.01] transition-transform"
                    />
                    <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/95 text-slate-900 text-xs font-medium shadow backdrop-blur-sm">
                        <Eye className="w-3.5 h-3.5" />
                        Click to Zoom
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Lightbox Modal */}
      {activeModalImage && (
        <div
          onClick={() => setActiveModalImage(null)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl w-full max-h-[92vh] bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-700 flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 text-white border-b border-slate-800">
              <span className="text-xs font-mono text-slate-300">{activeModalImage}</span>
              <button
                onClick={() => setActiveModalImage(null)}
                className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 overflow-auto max-h-[84vh] bg-slate-950 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeModalImage}
                alt="Enlarged screenshot"
                className="max-w-full h-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
