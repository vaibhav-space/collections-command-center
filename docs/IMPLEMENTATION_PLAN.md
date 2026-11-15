# FinanceOps Collections Command Center (Variant 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a functional, production-grade AI-powered Collections Command Center (Variant 2) on Next.js App Router, PostgreSQL, Prisma, Vercel AI SDK, and Google Gemini, demonstrating deterministic policy enforcement, structured AI interpretation, human-in-the-loop workflows, and real ledger persistence.

**Architecture:** A modular TypeScript monolith combining Next.js App Router server and client components, server-side domain services with exact Decimal ledger math, an authoritative 19-rule deterministic policy engine, a typed 14-tool business registry, and the Vercel AI SDK Core interfacing with Google Gemini.

**Tech Stack:** Next.js (App Router, Node.js runtime), React, TypeScript (Strict Mode), Tailwind CSS, shadcn/ui, Lucide React, PostgreSQL, Prisma ORM, Vercel AI SDK Core (`ai`), `@ai-sdk/google`, Zod, Vitest.

**Spec:** [docs/variant-2/PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) and [docs/variant-2/TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md).

---

## Global Constraints

- **Node.js Runtime**: Backend routes and Prisma operations execute in the Node.js runtime (`export const runtime = 'nodejs'`), not Edge.
- **Strict Decimal Arithmetic**: All financial amounts use `Prisma.Decimal` or `decimal.js` with 2 decimal places. Floating-point numbers are prohibited in database storage and balance calculations.
- **Deterministic Policy Authorisation**: The LLM proposes; the Policy Engine authorises; tools execute; the database stores. No model output directly mutates the database.
- **Provider Decoupling**: Gemini is accessed strictly via Vercel AI SDK Core abstractions (`generateObject`, `generateText`), allowing model switching via `GEMINI_MODEL` environment variable.
- **Offline Test Suite**: All automated tests execute deterministically with mock providers; a live Google API key is never required to pass tests.
- **Tenant & Account Scoping**: Every query and mutation enforces tenant and account ownership boundaries.
- **Variant 1 Isolation**: Never modify, overwrite, or delete code in `round-1/` (`borrower-sms-agent`).

---

## Review Focus

1. **Quiet Hours Timezone Calculation**: An inbound message evaluated at 11:30 PM in borrower's timezone must override outbound delivery to `HELD` regardless of server clock.
2. **First-Reply Disclosure Suppression**: Outbound draft mentioning monetary balance on first turn must be sanitized to safe greeting unless borrower explicitly inquired about balance.
3. **Double-Spend & Duplicate PTP Prevention**: Repeatedly clicking "Approve" on a payment link or promise within 60 seconds must return cached result via idempotency key.
4. **Dispute Auto-Freeze**: Contesting a charge or claiming prior payment must transition account status to `IN_DISPUTE` and block collection reminders.
5. **Ledger Integrity**: Reconciling a payment link must atomically insert an `AccountLedgerEntry` credit and reduce `currentBalance` in a single transaction.

---

## Phased Implementation Roadmap

```text
Phase 1: Foundation & Scaffolding (Next.js, Tailwind, shadcn, Vitest)
  │
Phase 2: Database Layer (PostgreSQL, Prisma, Migrations, 10-Account Seed Portfolio)
  │
Phase 3: Domain Services & Deterministic Policy Engine (19 Rules, Ledger Math)
  │
Phase 4: Tool Registry, State Machines & Simulators (Payments, Inbound Comms)
  │
Phase 5: AI Copilot Service (Vercel AI SDK, Gemini Provider, Zod Schemas)
  │
Phase 6: API Route Handlers (Queue, Accounts, Copilot, Actions)
  │
Phase 7: Shell Layout & Shared UI System (Sidebar, Header, Metrics, Badges)
  │
Phase 8: Collections Dashboard & Work Queue Views
  │
Phase 9: Borrower 360 Detail View
  │
Phase 10: 3-Column Conversation Workspace (Interactive Copilot & Draft Editor)
  │
Phase 11: Cases & Policy Centre Views
  │
Phase 12: Vitest Automated Verification & End-to-End Walkthrough
```

---

### Task 1: Foundation & Application Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`
- Create: `src/lib/utils.ts`
- Test: `src/test/unit/scaffolding.test.ts`

**Interfaces:**
- Consumes: Node.js 20+, npm
- Produces: Base Next.js App Router application with Tailwind CSS, shadcn path aliases (`@/*`), and Vitest runner.

- [ ] **Step 1: Write test verifying environment and package configuration**

```typescript
// src/test/unit/scaffolding.test.ts
import { describe, it, expect } from 'vitest';
import { cn } from '../../lib/utils.js';

describe('Scaffolding Verification', () => {
  it('correctly merges tailwind classnames', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/unit/scaffolding.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement minimal configuration and `src/lib/utils.ts`**

Implement `cn` helper using `clsx` and `tailwind-merge`. Configure `tsconfig.json` with strict mode, `@/*` path mapping, and Next.js plugin.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/unit/scaffolding.test.ts`
Expected: PASS

- [ ] **Step 5: Commit scaffolding**

```bash
git add package.json tsconfig.json vitest.config.ts src/lib/utils.ts
git commit -m "chore(infra): scaffold Next.js App Router, Tailwind, and Vitest test harness"
```

---

### Task 2: PostgreSQL Schema, Prisma Models & Migrations

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`
- Test: `src/test/unit/prisma-singleton.test.ts`

**Interfaces:**
- Consumes: PostgreSQL connection URL from `DATABASE_URL`
- Produces: Type-safe Prisma Client singleton and relational database tables.

- [ ] **Step 1: Write test verifying Prisma client singleton instantiation**

```typescript
// src/test/unit/prisma-singleton.test.ts
import { describe, it, expect } from 'vitest';
import { prisma } from '../../lib/prisma.js';

describe('Prisma Client Singleton', () => {
  it('instantiates a valid prisma client instance', () => {
    expect(prisma).toBeDefined();
    expect(prisma.account).toBeDefined();
    expect(prisma.promiseToPay).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/unit/prisma-singleton.test.ts`
Expected: FAIL

- [ ] **Step 3: Define complete `prisma/schema.prisma` and implement `src/lib/prisma.ts`**

Define all models: `Tenant`, `Operator`, `Borrower`, `ContactMethod`, `ContactPreference`, `Account`, `AccountLedgerEntry`, `PaymentLink`, `Payment`, `PromiseToPay`, `Conversation`, `Message`, `Case`, `PolicyVersion`, `PolicyDecisionLog`, `ToolExecutionLog`, `AuditEvent`. Run migration.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/unit/prisma-singleton.test.ts`
Expected: PASS

- [ ] **Step 5: Commit database models**

```bash
git add prisma/schema.prisma src/lib/prisma.ts
git commit -m "feat(db): define comprehensive Prisma PostgreSQL schema with Decimal currency"
```

---

### Task 3: Synthetic Seed Portfolio (10 Realistic Scenarios)

**Files:**
- Create: `prisma/seed.ts`
- Test: `src/test/integration/seed.test.ts`

**Interfaces:**
- Consumes: Prisma Client
- Produces: 10 seeded synthetic borrower accounts covering all core demonstration workflows:
  1. Routine balance inquiry
  2. Unreconciled payment needing ledger credit
  3. Missed payment promise (Overdue)
  4. Active promise due today
  5. Billing dispute in progress
  6. Unemployment hardship case
  7. Channel preference change (Email preferred)
  8. Request for human supervisor
  9. STOP opted-out borrower
  10. Pending payment link awaiting settlement

- [ ] **Step 1: Write test verifying database seeding requirements**

```typescript
// src/test/integration/seed.test.ts
import { describe, it, expect } from 'vitest';
import { prisma } from '../../lib/prisma.js';

describe('Database Seed Verification', () => {
  it('contains exactly 10 seeded synthetic borrower accounts with valid ledgers', async () => {
    const accounts = await prisma.account.findMany();
    expect(accounts.length).toBe(10);
    const brokenPromiseAccount = accounts.find(a => a.accountNumber === 'ACC-8003');
    expect(brokenPromiseAccount).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/integration/seed.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `prisma/seed.ts`**

Populate 10 accounts with realistic balances, ledger history, messages, promises, and cases.

- [ ] **Step 4: Run seed command and test**

Run: `npx prisma db seed && npx vitest run src/test/integration/seed.test.ts`
Expected: PASS

- [ ] **Step 5: Commit seed data**

```bash
git add prisma/seed.ts
git commit -m "feat(db): create 10-account realistic synthetic seed portfolio"
```

---

### Task 4: Financial Ledger & Accounting Service

**Files:**
- Create: `src/services/ledger.service.ts`
- Test: `src/test/unit/ledger-service.test.ts`

**Interfaces:**
- Consumes: Account ID, amount, entry type
- Produces: Atomic `AccountLedgerEntry` and updated `Account.currentBalance` using exact Decimal calculations.

- [ ] **Step 1: Write failing test for atomic payment crediting**

```typescript
// src/test/unit/ledger-service.test.ts
import { describe, it, expect } from 'vitest';
import { LedgerService } from '../../services/ledger.service.js';
import { Prisma } from '@prisma/client';

describe('Ledger Service', () => {
  it('atomically credits a payment and updates account balance using exact decimal math', async () => {
    const service = new LedgerService();
    const result = await service.recordTransaction({
      accountId: 'test_acc_001',
      entryType: 'PAYMENT_CREDIT',
      amount: new Prisma.Decimal(-200.00),
      description: 'Simulated payment credit'
    });
    expect(result.balanceAfter.toString()).toBe('800.00');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/unit/ledger-service.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `LedgerService`**

Implement double-entry transaction handling with `prisma.$transaction`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/unit/ledger-service.test.ts`
Expected: PASS

- [ ] **Step 5: Commit ledger service**

```bash
git add src/services/ledger.service.ts
git commit -m "feat(ledger): implement atomic Decimal-based account ledger service"
```

---

### Task 5: Deterministic Policy Engine (19 Rules)

**Files:**
- Create: `src/policies/types.ts`
- Create: `src/policies/engine.ts`
- Create: `src/policies/rules/*.ts`
- Test: `src/test/unit/policy-engine.test.ts`

**Interfaces:**
- Consumes: `PolicyContext` (account, action, inputs, draft reply, timestamp)
- Produces: `PolicyDecision` (`status: "allowed" | "blocked" | "requires_approval"`, reason, evidence, citations)

- [ ] **Step 1: Write failing test suite for quiet hours, disputes, and opt-outs**

```typescript
// src/test/unit/policy-engine.test.ts
import { describe, it, expect } from 'vitest';
import { PolicyEngine } from '../../policies/engine.js';

describe('Deterministic Policy Engine', () => {
  const engine = new PolicyEngine();

  it('blocks outbound messaging outside 8am-9pm local borrower time', () => {
    const decision = engine.evaluateQuietHours({
      receivedAt: '2026-11-15T04:30:00Z',
      timezone: 'America/New_York' // 11:30 PM local
    });
    expect(decision.status).toBe('blocked');
    expect(decision.reason).toContain('outside permissible hours');
  });

  it('routes contested charges to human approval with dispute hold', () => {
    const decision = engine.evaluateDispute({
      message: 'I dispute this bill, I already paid it last week.'
    });
    expect(decision.status).toBe('requires_approval');
    expect(decision.action).toBe('createDispute');
  });

  it('suppresses unprompted debt disclosure in first reply', () => {
    const decision = engine.evaluateFirstReplyDisclosure({
      isFirstMessage: true,
      inboundMessage: 'Hello, who is this?',
      draftReply: 'Hi, you owe $1,450.00 on your loan.'
    });
    expect(decision.status).toBe('requires_approval');
    expect(decision.sanitizedReply).not.toContain('$1,450.00');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/unit/policy-engine.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement all 19 policy rules and `PolicyEngine` orchestrator**

Port and expand Variant 1 rules to support timezone formatting, dispute negation detection, quiet hours, cross-customer data scanning, payment ceilings, and idempotency.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/unit/policy-engine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit policy engine**

```bash
git add src/policies/
git commit -m "feat(policy): implement authoritative 19-rule deterministic policy engine"
```

---

### Task 6: Business Tool Registry & Simulation Layer

**Files:**
- Create: `src/tools/schemas.ts`
- Create: `src/tools/registry.ts`
- Create: `src/tools/implementations/*.ts`
- Create: `src/services/simulation.service.ts`
- Test: `src/test/unit/tool-registry.test.ts`

**Interfaces:**
- Consumes: Validated tool input payloads, policy decisions, Prisma
- Produces: Executed business mutations (`createPaymentLink`, `proposePromiseToPay`, `createDispute`, etc.) with audit events.

- [ ] **Step 1: Write failing test for tool execution gate and audit logging**

```typescript
// src/test/unit/tool-registry.test.ts
import { describe, it, expect } from 'vitest';
import { ToolRegistry } from '../../tools/registry.js';

describe('Tool Registry', () => {
  it('executes createPaymentLink and records an immutable audit event', async () => {
    const registry = new ToolRegistry();
    const result = await registry.execute({
      toolName: 'createPaymentLink',
      inputs: { accountId: 'acc_001', amount: 150.00 },
      operatorId: 'op_001'
    });
    expect(result.success).toBe(true);
    expect(result.data.url).toContain('https://pay.financeops.demo');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/unit/tool-registry.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement 14 typed tools and simulation engine**

Implement payment link generator, PTP transition engine, case creators, and payment reconciliation simulator.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/unit/tool-registry.test.ts`
Expected: PASS

- [ ] **Step 5: Commit tool registry**

```bash
git add src/tools/ src/services/simulation.service.ts
git commit -m "feat(tools): build typed business tool registry and simulation service"
```

---

### Task 7: Vercel AI SDK Core & Google Gemini Integration

**Files:**
- Create: `src/ai/client.ts`
- Create: `src/ai/schemas.ts`
- Create: `src/ai/prompts.ts`
- Create: `src/ai/service.ts`
- Test: `src/test/unit/ai-copilot.test.ts`

**Interfaces:**
- Consumes: Borrower message, account context, conversation history
- Produces: `CopilotAnalysisOutput` (intent, entities, summary, proposed action, draft reply).

- [ ] **Step 1: Write test for structured AI extraction with mock provider**

```typescript
// src/test/unit/ai-copilot.test.ts
import { describe, it, expect } from 'vitest';
import { analyzeBorrowerMessageWithMock } from '../../ai/service.js';

describe('AI Copilot Service', () => {
  it('accurately parses promise-to-pay intent and extracts amount and normalized date', async () => {
    const output = await analyzeBorrowerMessageWithMock({
      inboundMessage: 'I can pay $200 next Tuesday',
      accountBalance: 1450.00,
      timezone: 'America/New_York'
    });
    expect(output.primaryIntent).toBe('PROMISE_TO_PAY');
    expect(output.entities.amount).toBe(200.00);
    expect(output.recommendedAction.action).toBe('proposePromiseToPay');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/unit/ai-copilot.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement Gemini provider adapter via Vercel AI SDK Core**

Configure `@ai-sdk/google`, implement `generateObject` with `CopilotAnalysisOutputSchema`, and add graceful fallback for offline or rate-limited scenarios.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/unit/ai-copilot.test.ts`
Expected: PASS

- [ ] **Step 5: Commit AI Copilot layer**

```bash
git add src/ai/
git commit -m "feat(ai): integrate Vercel AI SDK Core with Google Gemini and structured Zod schemas"
```

---

### Task 8: Backend API Route Handlers

**Files:**
- Create: `app/api/queue/route.ts`
- Create: `app/api/accounts/[id]/route.ts`
- Create: `app/api/conversations/[id]/messages/route.ts`
- Create: `app/api/ai/copilot/route.ts`
- Create: `app/api/actions/execute/route.ts`
- Create: `app/api/simulations/payment/route.ts`
- Test: `src/test/integration/api-routes.test.ts`

**Interfaces:**
- Consumes: Next.js HTTP Request
- Produces: Type-safe JSON API responses.

- [ ] **Step 1: Write integration test for `/api/ai/copilot` and `/api/actions/execute`**

```typescript
// src/test/integration/api-routes.test.ts
import { describe, it, expect } from 'vitest';

describe('API Route Handlers', () => {
  it('executes an approved action through /api/actions/execute after policy clearance', async () => {
    // Verifies route returns 200 with executed tool result and audit ID
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/integration/api-routes.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement Next.js Route Handlers**

Implement Node.js runtime route handlers with input validation using Zod schemas.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/integration/api-routes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit API routes**

```bash
git add app/api/
git commit -m "feat(api): create Next.js App Router API handlers for queue, copilot, and actions"
```

---

### Task 9: Shared Layout & UI Component System

**Files:**
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/TopHeader.tsx`
- Create: `src/components/ui/*.tsx` (Button, Card, Badge, Table, Input, Tabs, Dialog)
- Create: `app/(dashboard)/layout.tsx`

**Interfaces:**
- Consumes: React, Tailwind CSS, Lucide Icons
- Produces: Professional light-theme SaaS layout adhering to `impeccable` Operate mode.

- [ ] **Step 1: Build sidebar navigation with 7 main sections**
  - Dashboard Overview
  - Collector Work Queue
  - Borrowers
  - Conversation Workspace
  - Payments & Promises
  - Cases & Human Review
  - Policy Centre & Audit Trail
- [ ] **Step 2: Implement top header with portfolio selector and search**
- [ ] **Step 3: Verify visual rendering across desktop breakpoints (1280px+)**

---

### Task 10: Module 1 (Dashboard) & Module 2 (Work Queue)

**Files:**
- Create: `app/(dashboard)/page.tsx`
- Create: `src/components/dashboard/PortfolioSummary.tsx`
- Create: `src/components/dashboard/AgingChart.tsx`
- Create: `app/(dashboard)/queue/page.tsx`
- Create: `src/components/queue/WorkQueueTable.tsx`
- Create: `src/components/queue/QueueFilterBar.tsx`

**Interfaces:**
- Consumes: `/api/queue` and account ledger data
- Produces: Operational dashboard and explainable work queue.

- [ ] **Step 1: Implement Portfolio Summary cards calculating real balances from DB**
- [ ] **Step 2: Implement aging bracket visualizer (1-30, 31-60, 61-90, 90+ DPD)**
- [ ] **Step 3: Implement Work Queue table with priority sorting, trigger badges, and direct workspace links**

---

### Task 11: Module 3 (Borrower 360 Profile)

**Files:**
- Create: `app/(dashboard)/borrowers/page.tsx`
- Create: `app/(dashboard)/borrowers/[id]/page.tsx`
- Create: `src/components/borrower-360/ProfileCard.tsx`
- Create: `src/components/borrower-360/LedgerTable.tsx`
- Create: `src/components/borrower-360/PromiseTracker.tsx`

**Interfaces:**
- Consumes: `/api/accounts/[id]`
- Produces: Complete account view with verified balances, payment plans, and timeline.

- [ ] **Step 1: Render Borrower Profile with contact details and quiet-hours badge**
- [ ] **Step 2: Render Financial Ledger table displaying verified Decimal balances**
- [ ] **Step 3: Render Promise-to-Pay history showing lifecycle states**

---

### Task 12: Module 4 (3-Column AI Conversation Workspace)

**Files:**
- Create: `app/(dashboard)/workspace/[accountId]/page.tsx`
- Create: `src/components/workspace/LeftAccountContext.tsx`
- Create: `src/components/workspace/CenterConversationTimeline.tsx`
- Create: `src/components/workspace/RightCopilotPanel.tsx`
- Create: `src/components/workspace/DraftReplyEditor.tsx`
- Create: `src/components/workspace/PolicyVerdictCard.tsx`

**Interfaces:**
- Consumes: Account context, message timeline, AI Copilot API
- Produces: High-density 3-column operator workspace.

- [ ] **Step 1: Implement Left Column showing verified facts, promises, and timezone**
- [ ] **Step 2: Implement Center Column with message stream and Inbound Simulator composer**
- [ ] **Step 3: Implement Right Column AI Copilot**:
  - Intent classification badge
  - Extracted entity pills
  - AI conversation summary
  - Policy decision card (`ALLOWED`, `BLOCKED`, `REQUIRES_APPROVAL`)
  - Editable draft response editor
  - `Approve & Send` / `Reject` / `Escalate` action buttons
- [ ] **Step 4: Wire live action execution to update database and timeline dynamically**

---

### Task 13: Module 5 (Cases) & Module 6 (Policy & Audit)

**Files:**
- Create: `app/(dashboard)/cases/page.tsx`
- Create: `app/(dashboard)/policies/page.tsx`
- Create: `app/(dashboard)/audit/page.tsx`
- Create: `src/components/cases/CaseList.tsx`
- Create: `src/components/audit/AuditTable.tsx`

**Interfaces:**
- Consumes: Prisma Case, PolicyVersion, and AuditEvent models
- Produces: Case triage views, active ruleset inspector, and immutable audit log.

- [ ] **Step 1: Implement Case Management queue for disputes and hardships**
- [ ] **Step 2: Implement Policy Centre detailing 19 active rules and statutory citations**
- [ ] **Step 3: Implement Immutable Audit Trail viewer with JSON diff inspection**

---

### Task 14: Automated Test Suite & Smoke Verification Runbook

**Files:**
- Create: `src/test/integration/full-walkthrough.test.ts`
- Create: `docs/variant-2/SMOKE_TEST_CHECKLIST.md`

**Interfaces:**
- Consumes: Vitest test runner, seeded database
- Produces: Green automated test suite and repeatable manual smoke checklist.

- [ ] **Step 1: Write end-to-end integration test verifying complete borrower journey**:
  - Inbound message -> Gemini structured output -> Policy verdict -> Human approval -> Tool execution -> Ledger update -> Audit event.
- [ ] **Step 2: Execute full Vitest test suite**

Run: `npm run test`
Expected: 100% passing tests with zero skipped safety checks.

- [ ] **Step 3: Verify build and self-hosting readiness**

Run: `npm run build`
Expected: Successful Next.js production build with zero TypeScript or lint errors.
