# Collections Command Center

A production-grade, AI-powered Collections Command Center built with **Next.js 15 (App Router)**, **TypeScript**, **PostgreSQL**, **Prisma ORM**, and the **Vercel AI SDK Core** with **Google Gemini**.

> **Live Production Deployment**: **[https://site-finance-ops.d9196q.easypanel.host](https://site-finance-ops.d9196q.easypanel.host)**  
> **Interactive Visual Guide & Tour**: **[https://site-finance-ops.d9196q.easypanel.host/guide](https://site-finance-ops.d9196q.easypanel.host/guide)**  
> **Core AI Workspace Demo**: **[https://site-finance-ops.d9196q.easypanel.host/workspace/ACC-8001](https://site-finance-ops.d9196q.easypanel.host/workspace/ACC-8001)**

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

## 4. Quick Start & Local Setup

### Prerequisites
- **Node.js**: v18.18+ or v20+
- **PostgreSQL**: Local or hosted instance (e.g. Supabase, Railway, Neon)

### 1. Clone & Install
```bash
git clone git@github.com:vaibhav-space/collections-command-center.git
cd collections-command-center
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Set your `DATABASE_URL` (e.g., `postgresql://postgres:postgres@localhost:5432/financeops_db?schema=public`).
*(Optional)* Add `GOOGLE_GENERATIVE_AI_API_KEY`. If left empty, the application runs 100% offline using deterministic heuristic intelligence.

### 3. Initialize Database & Seed Synthetic Portfolio
```bash
# Push schema to PostgreSQL
npm run db:push

# Seed 10 realistic synthetic borrower accounts (ACC-8001 to ACC-8010)
npm run seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 5. Run Verification & Test Suite
```bash
# Run unit & integration test suite (36 tests)
npm test

# Typecheck
npm run typecheck
```

---

### 6. Docker & VPS Deployment (1 Command)
```bash
# Launch PostgreSQL and Next.js standalone container
docker compose up -d --build

# The container automatically executes schema sync and seeds synthetic accounts on boot.
# Open http://localhost:3000 (or your VPS public IP).
```

---

## 5. Interactive Demo Scenarios

The workspace includes 1-click inbound simulators as well as a **free-text input box** to experience the core architectural loop:

1. **Payment Commitment Negotiation (Real LLM Extraction)**:
   - Navigate to `/workspace/ACC-8001` (Sarah Jenkins, $1,100 balance, $350 overdue).
   - Click preset simulator `"I can pay $200 next Tuesday"` **or type any free-form natural language text** (e.g. `"can send 150 bucks on friday if you waive fees"`).
   - Observe the Copilot detect intent `PROMISE_TO_PAY`, normalize target date, and propose `proposePromiseToPay`.
   - Policy gate evaluates `ALLOWED`. Click **Approve Draft & Execute Tool** to record the commitment and post the compliant response.
2. **Statutory Opt-Out Protection (TCPA / FDCPA)**:
   - Click preset simulator: `"STOP"`.
   - The policy engine triggers synchronous fast-path opt-out. Outbound channels are instantly revoked, and an opt-out confirmation message is logged.
3. **Dispute Ingestion & Account Freeze**:
   - Click preset simulator: `"I dispute this bill, I already paid it last week"`.
   - The engine opens a formal dispute case in `/cases`, freezes active collection outreach, and transitions the account state to `IN_DISPUTE`.
4. **Supervisor Escalation**:
   - Click **Escalate to Lead** on any contentious message to create an actionable review ticket in the `/cases` queue.
5. **Forensic Audit Verification**:
   - Navigate to `/audit` to inspect the append-only regulatory log with JSON payload diffs for every state transition.

---

## 6. Documentation & Architecture Deep-Dive

Comprehensive specifications, compliance matrices, and threat models are located in [docs/](docs/):

- [PRODUCT_REQUIREMENTS.md](docs/PRODUCT_REQUIREMENTS.md) — Product requirements, user personas, and operational workflows.
- [TECHNICAL_DESIGN.md](docs/TECHNICAL_DESIGN.md) — Multi-tenant architecture, database ERD, 19-rule policy engine, and tool registry.
- [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) — Milestones, TDD contracts, and delivery roadmap.
- [SMOKE_TEST_CHECKLIST.md](docs/SMOKE_TEST_CHECKLIST.md) — Complete 10-step interactive verification checklist.
- [RESEARCH_AND_DECISIONS.md](docs/RESEARCH_AND_DECISIONS.md) — Industry research (C&R/Ipsos Dec 2025 survey), benchmarks, and design rationale.
- [RISK_AND_OPEN_QUESTIONS.md](docs/RISK_AND_OPEN_QUESTIONS.md) — Failure modes, edge cases, and security controls.

---

## 7. Relationship to Variant 1

This repository represents **Variant 2 (Collections Command Center)**. 

Variant 1 ([borrower-sms-agent](../borrower-sms-agent)) demonstrates the original single-message compliance assignment. Variant 2 expands the domain into a full-stack operational command center while preserving Variant 1 untouched.
