# Collections Command Center

A production-grade, AI-powered Collections Command Center built with **Next.js App Router**, **TypeScript**, **PostgreSQL**, **Prisma ORM**, and the **Vercel AI SDK Core** with **Google Gemini**.

---

## 1. Executive Overview

The Collections Command Center is an enterprise web application designed to help loan specialists and collections supervisors understand borrower accounts, review cross-channel dialogue histories, evaluate payment commitments, and execute compliant next-best actions.

### Core Architectural Principle

```text
The LLM Proposes ──► The Policy Engine Authorises ──► The Business Tools Execute ──► The Database Stores ──► The Audit Explains
```

- **The LLM Proposes**: Google Gemini (via Vercel AI SDK Core) interprets unstructured messages, classifies intent, extracts financial entities, summarizes conversations, and drafts empathetic responses.
- **The Policy Engine Authorises**: An authoritative 19-rule deterministic rules engine validates every action against identity, quiet-hours (8 AM – 9 PM local borrower time), statutory opt-outs (STOP), disputes, and financial limits.
- **The Business Tools Execute**: 14 typed service functions perform authorized operations (e.g., generating payment links, proposing promises to pay, recording disputes).
- **The Database Stores**: PostgreSQL and Prisma persist state changes atomically with exact `DECIMAL(12, 2)` monetary calculations.
- **The Audit Explains**: An immutable, append-only audit trail records every trigger, policy verdict, human approval, tool execution, and ledger entry.

---

## 2. Product Modules

1. **Collections Dashboard**: Real-time portfolio metrics, delinquent aging brackets (1–30, 31–60, 61–90, 90+ DPD), and promise performance derived directly from PostgreSQL.
2. **Collector Work Queue**: Explainable event-driven prioritization queue (missed promises, callbacks, pending payments, disputes, hardships).
3. **Borrower 360**: Unified single view of borrower contact preferences, verified financial ledgers, payment plans, and compliance flags.
4. **AI Conversation Workspace**: High-density 3-column operational console featuring real-time AI Copilot assistance, policy status badges, in-place draft editing, and simulated inbound message testing.
5. **Cases & Human Review**: Dedicated escalation workflow for disputes, hardships, identity theft, and legal representation.
6. **Policy Centre & Audit Trail**: Active regulatory ruleset inspector and immutable forensic audit trail.

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js (App Router, Node.js Runtime) | Full-stack React framework and backend Route Handlers |
| **Language** | TypeScript (Strict Mode) | End-to-end type safety |
| **Styling & UI** | Tailwind CSS & shadcn/ui | Clean, restrained fintech interface (`Operate` mode) |
| **Icons** | Lucide React | Consistent iconography |
| **Database** | PostgreSQL | Relational ACID storage with exact decimal currency |
| **ORM** | Prisma ORM | Type-safe migrations, queries, and seeding |
| **AI Abstraction** | Vercel AI SDK Core (`ai`) | Provider-decoupled structured outputs (`generateObject`) |
| **LLM Provider** | Google Gemini (`@ai-sdk/google`) | Structured interpretation and draft generation (`gemini-2.0-flash`) |
| **Validation** | Zod | Runtime schema validation for API inputs, outputs, and tools |
| **Testing** | Vitest | Deterministic backend test harness |

---

## 4. Documentation

Comprehensive architecture, specifications, and planning documents are maintained in `docs/`:

- [PRODUCT_REQUIREMENTS.md](docs/PRODUCT_REQUIREMENTS.md) — Comprehensive product requirements, user personas, workflows, and acceptance criteria.
- [TECHNICAL_DESIGN.md](docs/TECHNICAL_DESIGN.md) — Detailed architecture, database schema, policy engine contract, tool registry, and API specifications.
- [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) — Phased implementation plan, test-driven milestones, and verification runbooks.
- [RESEARCH_AND_DECISIONS.md](docs/RESEARCH_AND_DECISIONS.md) — Empirical research findings (C&R/Ipsos Dec 2025 survey, competitor reviews, regulatory references) and architecture trade-offs.
- [RISK_AND_OPEN_QUESTIONS.md](docs/RISK_AND_OPEN_QUESTIONS.md) — Failure modes, security boundaries, rate limit mitigations, and architectural decisions.

---

## 5. Relationship to Variant 1

This repository represents **Variant 2 (Collections Command Center)**. 

Variant 1 ([borrower-sms-agent](../borrower-sms-agent)) demonstrates the original single-message compliance assignment. Variant 2 expands the domain into a full-stack operational command center while preserving Variant 1 untouched.
