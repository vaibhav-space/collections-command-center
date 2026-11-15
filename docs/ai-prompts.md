# AI Steering Log & Engineering Prompts — Variant 2 (Collections Command Center)

This document details the engineering prompt sequence, architectural steering, and human verification loop used to build the **Collections Command Center** (Variant 2). The system was developed using an iterative, contract-first methodology: full-stack domain modeling $\rightarrow$ multi-model LLM integration $\rightarrow$ bank-grade policy engine $\rightarrow$ optimistic locking concurrency $\rightarrow$ production containerization.

---

## 1. Core Engineering Prompt Progression

### 1. Architectural Scope & Core Invariant
- **The Prompt:**
  > *"We are building Variant 2: an enterprise Collections Command Center using Next.js 15 (App Router), TypeScript, PostgreSQL, and Prisma.*
  > *Core Architectural Rule: 'The LLM Proposes ──► The Policy Engine Authorises ──► The Business Tools Execute ──► The Database Stores ──► The Audit Explains'.*
  > *Under no circumstances should the LLM execute writes directly. The model only generates structured proposals and drafts. A deterministic 19-rule policy engine must evaluate legal compliance (TCPA, FDCPA, Cease & Desist, and financial limits) before any tool can be proposed.*
  > *Write a full Technical Design Document (`docs/TECHNICAL_DESIGN.md`) and Implementation Plan (`docs/IMPLEMENTATION_PLAN.md`) before writing application code."*
- **Intent:** Prevent premature coding and establish a zero-trust boundary around generative AI outputs.

---

### 2. Financial Determinism & Database Schema Design
- **The Prompt:**
  > *"Design the PostgreSQL Prisma schema for multi-tenant loan collections.*
  > *Requirements:*
  > *1. Exact currency: Use `Decimal(12, 2)` or integer cents for all monetary balances. Never allow IEEE-754 floating-point math or LLM arithmetic.*
  > *2. Multi-tenant isolation: Every borrower, account, case, and policy version must be explicitly scoped to a `tenantId`.*
  > *3. Concurrency safety: Enforce an optimistic lock field (`updatedAt`) on accounts to detect concurrent specialist modifications.*
  > *4. Append-only audit trail: An immutable `AuditEvent` table recording every copilot assessment, policy check, specialist decision, and actor IP."*
- **Intent:** Enforce banking-grade data integrity and regulatory compliance at the database schema level.

---

### 3. Multi-Model Gemini Cascade (Free-Tier Resilience)
- **The Prompt:**
  > *"We are integrating Google Gemini via the Vercel AI SDK Core (`@ai-sdk/google`). Because free-tier API keys are subject to strict RPM and RPD rate limits, one model may return 429 or hang.*
  > *Implement a resilient multi-model fallback cascade:*
  > *1. Primary: `gemini-3.5-flash-lite` (highest free-tier request quota).*
  > *2. Secondary: `gemini-3.1-flash-lite` (ultra-low latency).*
  > *3. Tertiary: `gemini-2.5-flash` (legacy backup).*
  > *4. Final safety net: If all API keys fail or network is down, gracefully fall back to an offline deterministic heuristic engine with zero crashes.*
  > *Ensure the automated Vitest test suite runs 100% offline without triggering live API calls."*
- **Intent:** Guarantee 100% uptime and resilience against external API rate-limiting during evaluation.

---

### 4. Interactive AI Workspace & 1-Click Operations
- **The Prompt:**
  > *"Build the 3-column AI Conversation Workspace (`/workspace/[accountId]`):*
  > *• Left: Borrower 360 profile, verified ledger balance, and TCPA consent.*
  > *• Center: Chronological message stream with an interactive inbound simulator supporting BOTH preset buttons and free-form natural language text.*
  > *• Right: Live Copilot & Policy Gate panel showing detected intent, policy verdict, proposed tool call, and an editable draft.*
  > *Add two primary operational actions: 'Approve Draft & Execute Tool' and 'Escalate to Lead' (which routes contentious borrowers to `/cases`).*
  > *Use optimistic lock checks to reject stale proposals if account data changed mid-session."*
- **Intent:** Empower human collections specialists with high-signal copilot assistance while keeping humans in the loop.

---

### 5. Cathryn Lavery Editorial Architecture Diagram
- **The Prompt:**
  > *"Build an executive Visual Tour page (`/guide`) explaining the system.*
  > *Do NOT make it text-heavy. Follow the `cathrynlavery/diagram-design` principles:*
  > *• Visual density target ~4/10: deletion first, zero clutter.*
  > *• No shadows, no 'Mermaid slop'. Crisp inline SVG aligned to a 4px coordinate grid.*
  > *• Controlled accent economy: Indigo focus on LLM extraction, Emerald on Policy verdict, clean Slate neutrals.*
  > *• Visual 4-stage pipeline: Inbound Signal $\rightarrow$ Gemini Cascade $\rightarrow$ Policy Gate $\rightarrow$ Human 1-Click Execution.*
  > *Lead with the #1 AI Conversation Workspace as the primary hero module."*
- **Intent:** Communicate complex distributed architecture effortlessly to busy reviewers in under 15 seconds.

---

### 6. VPS Production Dockerization
- **The Prompt:**
  > *"Create a production Dockerfile and `docker-compose.yml` for VPS deployment (EasyPanel / Ubuntu).*
  > *Requirements:*
  > *• Next.js 15 standalone optimization (~150MB image).*
  > *• Alpine Linux with Node.js 20, `libc6-compat`, and `openssl` for Prisma engine support.*
  > *• Non-root `nextjs` system user for security.*
  > *• Self-contained database setup: Pre-compile `prisma/seed.ts` to `prisma/seed.cjs` via esbuild and use global Prisma CLI in runner so `prisma db push` and `seed` run without cherry-picking devDependencies.*
  > *• 1-command startup: `docker compose up -d --build`."*
- **Intent:** Provide a turn-key, single-command production deployment path for remote cloud servers.

---

## 2. Human Oversight Log: Where the AI was Wrong & How It Was Caught

| # | What the AI Did Wrong | How It Was Caught | Engineering Correction Applied |
|---|---|---|---|
| **1** | **Nested Schema Validation Error on Tool Approval**: When the LLM proposed `createHumanHandoff`, the tool schema expected `reason` inside `requiredInputs: {}`. The LLM output `reason` at the root proposal level, causing Zod to reject execution with `invalid_type: expected string received undefined`. | Tested the tool approval button in-browser; inspected network response payload. | Made `reason` optional with default fallback in `src/tools/schemas.ts`, and injected proposal-level reasoning in `/api/actions/execute/route.ts`. |
| **2** | **Optimistic Lock Race Condition on Inbound Disputes**: Inbound dispute simulations updated the account state in PostgreSQL, modifying `account.updatedAt`. The client held the previous timestamp, causing the next approval to fail with `optimistic lock conflict`. | Observed UI error banner when approving a dispute resolution immediately after simulating an inbound text. | Returned the fresh `account.updatedAt` timestamp from `/api/simulations/inbound`, synced React state, and added a 15-second grace window in `PolicyEngine.evaluateStaleData`. |
| **3** | **Unsupported Candidate Models in API Cascade**: The AI attempted to include `gemma-4-31b-it` (which returned 503 on free tier) and `gemini-2.5-flash-lite` (deprecated by Google API with 400). | Ran real API curl probes with the user's `.env` key. | Filtered the active cascade to verified models: `gemini-3.5-flash-lite` $\rightarrow$ `gemini-3.1-flash-lite` $\rightarrow$ `gemini-2.5-flash`, with 6s timeouts and 1 retry. |
| **4** | **Docker Build Checksum Failure on Sub-Dependency**: In `Dockerfile`, the AI wrote `COPY --from=deps /app/node_modules/get-tsconfig`. On Linux/Alpine, npm hoists dependencies differently, causing Docker buildx to crash with `/app/node_modules/get-tsconfig: not found`. | Inspected EasyPanel remote deployment build logs. | Eliminated all fragile node_modules cherry-picking. Pre-bundled `prisma/seed.ts` into a standalone CJS script and installed Prisma globally in the runner. |
| **5** | **Vitest Test Suite Timeout on Live API Calls**: The test suite hung because `full-walkthrough.test.ts` attempted to call the live Google Gemini API when an API key was present in `.env`. | Executed `npm test` and observed timeout warnings. | Guarded live LLM client initialization with `!process.env.VITEST && process.env.NODE_ENV !== 'test'`, ensuring the test suite executes 100% offline in 1.1s. |
| **6** | **Text-Heavy Guide Page Design**: The initial version of the `/guide` page contained dense paragraphs of text explaining each module, making it tedious for a reviewer to read. | Inspected visual screenshot of the rendered guide page. | Redesigned the entire guide page with Cathryn Lavery SVG architecture diagrams, 1-sentence punchlines, and 3-chip tag summaries for effortless scanning. |
