# Risk Analysis, Failure Modes & Open Architectural Decisions
## FinanceOps Collections Command Center — Variant 2

---

## 1. Technical & Architectural Risk Analysis

### 1.1 Security & Data Protection Risks

| Risk Description | Severity | Likelihood | Impact | Concrete Mitigation in Variant 2 |
|---|---|---|---|---|
| **Cross-Borrower / Cross-Tenant Data Leakage** | Critical | Low | Severe regulatory fines, third-party debt disclosure violation (FDCPA §805(b)). | 1. Strict tenant isolation enforced in all Prisma queries (`where: { tenantId }`).<br>2. Service layer validates borrower account ownership before execution.<br>3. In-code privacy scanner scans outbound draft text against foreign borrower names, IDs, phones, and balances. |
| **Exposure of Google Gemini API Key** | Critical | Very Low | API quota theft, unauthorized usage billing. | 1. Next.js environment configuration keeps `GOOGLE_GENERATIVE_AI_API_KEY` exclusively on the server.<br>2. Zero client-side API invocations; all Copilot queries route through `/api/ai/copilot`. |
| **Prompt Injection Exfiltration** | High | Medium | Jailbreaking the LLM to reveal all customer balances or system prompt. | 1. Inherits Variant 1 in-code privacy scanner and tool call boundary: tool execution fails if `targetAccountId !== authenticatedAccountId`.<br>2. Evaluated in automated test suite with adversarial prompt injection inputs. |
| **Accidental Double-Spend / Duplicate Operations** | High | Medium | Creating duplicate payment links or competing promises-to-pay via fast double-clicks. | Mutating endpoints require an `Idempotency-Key` validated and stored in PostgreSQL with unique database constraints. |

---

### 1.2 AI Reliability & Gemini Integration Risks

| Risk Description | Severity | Likelihood | Impact | Concrete Mitigation in Variant 2 |
|---|---|---|---|---|
| **Gemini Free-Tier Rate Limits (15 RPM / TPM Limits)** | High | Medium | 429 Too Many Requests errors during rapid interactive demonstrations. | 1. Implement exponential backoff retry in `src/ai/service.ts`.<br>2. Implement graceful degradation: if Gemini returns a 429 or timeout, Copilot falls back to deterministic rule-based suggestions, alerting the operator with a non-intrusive status toast.<br>3. Automated test suite runs 100% offline using mock language models. |
| **Model Hallucination of Balances or Dates** | Critical | Medium | Quoting incorrect debt amounts or confirming nonexistent payments. | 1. LLM output is treated strictly as an unverified proposal.<br>2. Verified ledger figures are supplied directly from PostgreSQL into system prompt context.<br>3. Policy Engine blocks payment-link creation if amount exceeds verified `currentBalance`.<br>4. Human operator must approve or edit draft before any outbound dispatch. |
| **Malformed JSON / Zod Schema Rejection** | Medium | Low | LLM returns non-conforming JSON, causing runtime exceptions. | 1. Vercel AI SDK Core's `generateObject` enforces strict schema constraints.<br>2. Safe parsing with fallback to default safe intent classification (`GENERAL_INQUIRY`). |
| **High Latency on LLM Generation (3–6s)** | Medium | High | Sluggish operator experience in Conversation Workspace. | 1. Optimistic UI updates for user-submitted simulated messages.<br>2. Skeleton loading states in AI Copilot card during generation.<br>3. All manual review, ledger inspection, and case triage remain fully operational without waiting for AI. |

---

### 1.3 Financial & Accounting Integrity Risks

| Risk Description | Severity | Likelihood | Impact | Concrete Mitigation in Variant 2 |
|---|---|---|---|---|
| **Floating-Point Rounding Errors** | Critical | High (if floats used) | Cent discrepancies, ledger imbalance, audit failure. | 1. Absolute ban on JavaScript IEEE-754 floating-point numbers for money.<br>2. All monetary values stored as `DECIMAL(12, 2)` in PostgreSQL.<br>3. All arithmetic in application services executed via `Prisma.Decimal` or `decimal.js`. |
| **Premature Balance Reduction** | Critical | Medium | Decrementing borrower balance when a payment link is merely generated. | 1. Payment links are decoupled from accounting ledgers.<br>2. Balance reduction occurs **only** when an external payment status transitions to `SETTLED`, atomically inserting an `AccountLedgerEntry` (type: `PAYMENT_CREDIT`). |
| **Stale Balance Race Conditions** | High | Low | Operator approves a PTP or link while a payment was just reconciled in the background. | Database transactions with optimistic concurrency or version checks verify the current balance before executing financial mutations. |

---

### 1.4 Regulatory & Compliance Boundaries (Disclaimers)

1. **Demonstration Scope**: Variant 2 is an engineering showcase modeling representative U.S. regulatory patterns (FDCPA §805, TCPA, CFPB Regulation F). It is **not** certified legal compliance software.
2. **Multi-Jurisdiction Limitations**: Creditor vs. third-party collector obligations, state-specific lending statutes (e.g., California Rosenthal Act, New York City Department of Consumer and Worker Protection rules), and international consumer credit laws require distinct legal rule sets not modeled in this demo.
3. **Regex & Keyword Limitations**: Statutory opt-out (`STOP`) and dispute detection rely on deterministic keyword sets and negation-aware regex. While proven in Variant 1 evaluations, production systems would combine these with fine-tuned semantic classifiers to catch colloquial dialects and unconventional phrasing.

---

## 2. Deployment & Runtime Constraints

1. **Node.js vs. Edge Runtime**:
   - *Constraint*: Prisma Client requires Node.js runtime primitives (native C/C++ engine bindings, socket connections) and does not run cleanly in Vercel's Edge Runtime without specialized driver adapters (e.g., Neon serverless driver).
   - *Resolution*: All API route handlers and server components explicitly enforce Node.js runtime (`export const runtime = 'nodejs'`). Edge runtime is avoided.
2. **Database Connection Pool Sizing**:
   - *Constraint*: Local PostgreSQL instances or long-running VPS Node processes handle standard connection pools, but serverless environments can exhaust connection pools under concurrency.
   - *Resolution*: Use standard Prisma connection pooling with recommended `connection_limit=10` parameter in local and VPS deployment configurations.
3. **Cold Starts**:
   - *Resolution*: Next.js App Router standalone build mode (`output: 'standalone'`) packages a lightweight Node.js server container that boots in <200ms on a VPS.

---

## 3. Open Architectural Decisions Requiring User Approval

Before proceeding to Phase 2 (scaffolding and implementation), the following architectural trade-offs are presented for explicit user alignment:

### Decision 1: Initial Gemini Model Identifier
- **Context**: The user requested Google Gemini via Vercel AI SDK with free-tier compatibility.
- **Options**:
  - **Option A (Recommended)**: `gemini-2.0-flash` (Fastest, latest generation, natively supported in `@ai-sdk/google`, excellent structured output adherence, 15 RPM free tier).
  - **Option B**: `gemini-1.5-flash` (Prior stable generation, widely deployed, also free tier).
- **Recommendation**: Set default to `gemini-2.0-flash` while keeping `GEMINI_MODEL` configurable in `.env`.

### Decision 2: Local Database Setup Preference
- **Context**: The application will run against a PostgreSQL database locally first, with later VPS migration.
- **Options**:
  - **Option A (Recommended)**: Standard local PostgreSQL service already running on user's machine (e.g., `postgresql://postgres:postgres@localhost:5432/financeops_db`).
  - **Option B**: Docker Compose PostgreSQL container (`docker compose up -d postgres`) provided in the repo.
- **Recommendation**: Support Option A by default in `.env.example`, with an optional `docker-compose.yml` for zero-install portability.

### Decision 3: Inbound Communication Simulation Mechanism
- **Context**: Variant 2 will not connect live Twilio or SendGrid accounts.
- **Options**:
  - **Option A (Recommended)**: Direct interactive simulation controls inside the Conversation Workspace (an operator composer allowing quick submission of sample borrower messages like *"I can pay $100 on Friday"*, *"STOP"*, or *"I dispute this"*, plus a "Simulate Payment Settled" button on payment links).
  - **Option B**: Separate "Dev Tools / Simulator" panel accessible from the top navigation.
- **Recommendation**: Option A — placing simulation affordances directly in the Conversation Workspace provides the smoothest, most natural live demonstration experience.

### Decision 4: Execution Method for Implementation Phase
- **Context**: Per engineering directives, once the plan is approved, we transition to implementation.
- **Options**:
  - **Option A**: Inline execution in current session using test-driven development (TDD).
  - **Option B**: Subagent-driven development using task-specific subagents.
- **Recommendation**: Option A (Inline execution with strict TDD) ensures continuous, coherent verification and surgical control across the full-stack codebase.
