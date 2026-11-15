# Product Requirements Document (PRD)
## FinanceOps Collections Command Center — Variant 2

---

## 1. Executive Summary & Product Vision

### 1.1 Product Vision
The **FinanceOps Collections Command Center (Variant 2)** is an enterprise-grade web application engineered to transform debt collections and loan servicing from a high-friction, error-prone manual grind into an intelligent, compliant, and empathetic human-in-the-loop operation.

Rather than acting as an unconstrained autonomous chatbot or an opaque black-box scorer, the Command Center answers one definitive operational question for collections teams:

> **"Given this borrower's account, payment history, previous conversations, commitments, contact preferences, and current situation, what should the collections team do next, and why?"**

### 1.2 Core Architectural Principle
The system enforces a strict operational hierarchy across all workflows:

```text
The LLM Proposes ──► The Policy Engine Authorises ──► The Business Tools Execute ──► The Database Stores ──► The Audit Explains
```

- **The LLM Proposes**: Google Gemini (via Vercel AI SDK) interprets unstructured messages, extracts entities, summarizes dialogue history, recommends next actions, and drafts empathetic responses.
- **The Policy Engine Authorises**: A deterministic, code-enforced rules engine evaluates every proposed action against identity, quiet-hours, dispute, opt-out, and financial safety rules.
- **The Business Tools Execute**: Type-safe service functions perform authorized operations (e.g., creating payment links, recording promises, opening cases).
- **The Database Stores**: PostgreSQL and Prisma persist state changes atomically with exact decimal currency math.
- **The Audit Explains**: An immutable audit log records every inbound trigger, LLM proposal, policy verdict, human approval, tool execution, and ledger mutation.

### 1.3 Relationship to Variant 1
- **Variant 1 (`borrower-sms-agent`)**: Standalone assignment compliance prototype demonstrating single-turn inbound SMS processing, in-memory JSON customer repository, in-code guardrails (quiet hours, disputes, privacy, STOP opt-out), and adversarial evals.
- **Variant 2 (`Collections Command Center`)**: Full-stack Next.js application providing a multi-channel operational console, relational database, multi-turn stateful conversation history, promise-to-pay lifecycles, payment reconciliation, case management, and interactive AI copilot assistance.
- **Isolation Guarantee**: Variant 1 remains untouched as evidence of the initial assignment. Variant 2 reuses the proven compliance rules, Zod schemas, and security principles while establishing its own decoupled application architecture.

---

## 2. Target Personas & User Problems

### 2.1 Personas

| Persona | Role & Responsibilities | Core Jobs to Be Done | Key Pain Points Addressed |
|---|---|---|---|
| **Collections Specialist (Operator)** | Frontline collections agent managing 50–150 delinquent accounts daily across SMS, email, and call follow-ups. | Review account status; understand borrower hardships; negotiate realistic payment plans; send payment links; resolve disputes. | Context switching across billing and email systems; fear of regulatory violations (quiet hours, third-party disclosure); repetitive message drafting. |
| **Collections Supervisor (Lead)** | Operations manager overseeing team recovery targets, queue throughput, SLA compliance, and regulatory adherence. | Monitor portfolio aging; inspect broken promises; audit AI-generated suggestions; assign escalated cases (disputes, fraud, hardships). | Inability to verify why an account was contacted; lack of real-time visibility into promise breakage; risk of rogue agent communications. |

### 2.2 Operational Pain Points & Solutions

1. **Context Fragmentation**: Collectors navigate separate CRM notes, billing ledgers, and email threads to piece together a borrower's story.
   - *Solution*: A unified **Borrower 360** and **Conversation Workspace** aggregating all communications, verified ledger balances, and case history in a single view.
2. **Regulatory & Compliance Anxiety**: Strict statutory penalties (FDCPA, CFPB Regulation F, TCPA) for contacting borrowers outside allowable hours, disclosing debts to third parties, or ignoring opt-outs.
   - *Solution*: An in-code **Deterministic Policy Engine** that automatically blocks or holds actions violating quiet hours (8 AM – 9 PM borrower local time), mandatory opt-outs (STOP), or dispute rules.
3. **Borrower Distress & Distrust**: High borrower anxiety, fear of aggressive tactics, and low tolerance for robotic, inaccurate automated systems.
   - *Solution*: Empathetic AI drafts grounded exclusively in verified ledger facts, clear distinction between estimates and ledger records, and 1-click human escalation.

---

## 3. Product Modules & Detailed Functional Specifications

The Command Center consists of six integrated modules:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   Collections Command Center (Variant 2)               │
├─────────────────┬───────────────────┬─────────────────┬────────────────┤
│ 1. Dashboard    │ 2. Work Queue     │ 3. Borrower 360 │ 4. Conversation│
│    Portfolio    │    Event-Driven   │    Account &    │    Workspace & │
│    Visibility   │    Action Triage  │    Ledger Truth │    AI Copilot  │
├─────────────────┴───────────────────┴─────────────────┴────────────────┤
│ 5. Cases & Human Review            │ 6. Policy Centre & Audit Trail    │
└────────────────────────────────────┴───────────────────────────────────┘
```

---

### Module 1: Collections Dashboard

#### Purpose
Provide real-time visibility into portfolio health, delinquent aging, payment velocity, and operational backlog. All metrics are computed dynamically from persisted PostgreSQL records.

#### Key Metrics & Visualizations
1. **Portfolio Summary Cards**:
   - Total Active Delinquent Accounts.
   - Total Outstanding Balance Across Portfolio (formatted exact currency).
   - Total Overdue Balance.
   - Promises-to-Pay Due Today (count and dollar value).
   - Missed Payment Promises (Broken commitments requiring immediate triage).
   - Pending Payment Verifications (Simulated provider payments awaiting ledger settlement).
   - Open Disputes & Hardship Cases Requiring Human Attention.
2. **Portfolio Aging Distribution Chart**:
   - Accounts bucketed into standard aging brackets: Current (1–30 DPD), 31–60 DPD, 61–90 DPD, 90+ DPD (Default).
   - Displays both account count and aggregate balance per bracket.
3. **Promise-to-Pay Performance Breakdown**:
   - Ratio of Kept vs. Broken vs. Pending promises over the trailing 30 days.
4. **Recent Activity Feed**:
   - Chronological list of the last 10 operational events (payments reconciled, promises logged, human handoffs triggered).

---

### Module 2: Collector Work Queue

#### Purpose
Act as the daily operational cockpit for collectors, prioritizing accounts that require urgent action based on transparent, explainable business rules rather than opaque machine-learning scores.

#### Queue Trigger Events & Prioritization Rules

| Queue Trigger | Priority | Condition / Event | Default Recommended Next Action |
|---|---|---|---|
| **Missed Payment Promise** | Urgent (P1) | Promise due date passed without reconciled payment. | Contact borrower to renegotiate or review payment status. |
| **Active Dispute / Contest** | Urgent (P1) | Borrower contested balance, claimed prior payment, or alleged fraud. | Open dispute case; suspend collection outreach; review proof of payment. |
| **Hardship Declaration** | High (P2) | Borrower declared unemployment, medical crisis, or disaster hardship. | Review hardship program eligibility; propose temporary payment pause. |
| **Payment Pending Verification** | High (P2) | External payment initiated but unconfirmed in ledger. | Trigger simulated provider status check and reconcile ledger. |
| **Requested Callback** | Medium (P3) | Borrower requested phone contact at a specific time. | Schedule and initiate collector outbound callback. |
| **Channel Preference Change** | Medium (P3) | Borrower requested communication via email instead of SMS. | Update contact preference; route next follow-up via requested channel. |
| **Scheduled Follow-Up Due** | Normal (P4) | Standard cadence reminder due within permissible contact hours. | Review account; draft and approve follow-up message. |

#### Screen Features & Interactions
- **Multi-Factor Filtering**: Filter by Priority (`Urgent`, `High`, `Medium`, `Normal`), Trigger Reason, Aging Bracket, and Assigned Collector.
- **Search Bar**: Quick lookup by Borrower Name, Account Number, Phone, or Email.
- **Explainability Badge**: Each row displays an explicit badge stating *why* the account is in the queue (e.g., `"Promise of $150 missed on 2026-11-12"`).
- **Direct Navigation**: Clicking any queue item navigates directly to that borrower's **Conversation Workspace** with context preloaded.

---

### Module 3: Borrower / Account 360

#### Purpose
Serve as the single source of verified truth for an individual borrower, consolidating profile attributes, verified accounting ledgers, cross-channel interaction histories, and legal flags.

#### Information Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Borrower: Sarah Jenkins (ID: acc_001)       Status: DELINQUENT (42 DPD) │
├──────────────────────────┬──────────────────────┬──────────────────────┤
│ 1. Profile & Preferences │ 2. Financial Ledger  │ 3. Active Cases      │
│ • Phone: (555) 234-5678  │ • Balance: $1,450.00 │ • Case #102:         │
│ • Email: s.j@example.com │ • Overdue: $350.00   │   Hardship Review    │
│ • Preferred: Email (36%) │ • Last Paid: $100.00 │ • Policy: Quiet      │
│ • Timezone: America/NY   │   (2026-10-15)       │   Hours (Active)     │
│ • Consent: SMS (Active)  │ • Active PTP: $200   │ • Legal Flag: None   │
│   STOP Opt-Out: False    │   Due: 2026-11-18    │                      │
├──────────────────────────┴──────────────────────┴──────────────────────┤
│ 4. Unified Communication & Ledger Timeline                             │
│ [2026-11-10 10:15 AM] [SMS Inbound]  "I can pay $200 next Tuesday"     │
│ [2026-11-10 10:16 AM] [System Note]  PTP #402 Proposed ($200 by 11-18)  │
│ [2026-11-10 10:18 AM] [Email Out]    Payment link created: pay.link/x92│
│ [2026-11-05 02:30 PM] [Call Transcript] "Borrower discussed medical bill"│
└────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Subsections
1. **Borrower Information**: Full legal name, unique borrower ID, verified phone number, email address, physical address, IANA timezone (e.g., `America/New_York`), language preference.
2. **Consent & Communication State**: Channel opt-in/opt-out status, STOP flag timestamp, preferred channel indicator, quiet-hours window status.
3. **Financial Ledger & Balances**:
   - Verified Current Balance, Principal, Accrued Interest/Fees, Overdue Amount, Days Past Due (DPD).
   - Ledger Entry Table: Immutable transaction records (`CHARGE`, `PAYMENT`, `ADJUSTMENT`, `FEE_REVERSAL`) with timestamps, exact decimal amounts, and running balances.
4. **Payment & Commitment History**:
   - Historical and active Payment Links (amount, URL, expiration, settlement status).
   - Complete Promise-to-Pay (PTP) records with status history (`PROPOSED` -> `APPROVED` -> `KEPT`/`BROKEN`).
5. **Cases & Sensitive Flags**:
   - Active or historical Dispute, Hardship, Wrong-Party Contact, Bankruptcy, or Attorney Representation flags.

---

### Module 4: AI Conversation Workspace (Core Experience)

#### Purpose
The primary operational environment where collectors communicate with borrowers, receive real-time AI copilot recommendations, inspect deterministic policy guardrails, and execute approved business tools.

#### Layout: Professional 3-Column Desktop Interface

```text
┌───────────────────────────────┬───────────────────────────────┬───────────────────────────────┐
│ COLUMN 1: BORROWER CONTEXT    │ COLUMN 2: CONVERSATION STREAM │ COLUMN 3: AI COPILOT PANEL    │
│ (Compact Sticky 360)          │ (Interactive Timeline)        │ (Intelligence & Tools)        │
├───────────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ • Verified Balance: $1,450.00 │ • Chronological messages      │ • Detected Intent:            │
│ • Overdue: $350.00 (42 DPD)   │   (SMS, Email, Calls)         │   "PROMISE_TO_PAY"            │
│ • Preferred Channel: Email    │ • Channel badges & timestamps │ • Extracted Entities:         │
│ • Timezone: America/New_York  │ • Simulated Inbound Message   │   - Amount: $200.00           │
│   (Local: 10:45 AM - Permitted│   Composer (Trigger live AI)  │   - Date: 2026-11-18          │
│ • Active PTP: $200 due Nov 18 │ • Message status badges       │ • Conversation Summary        │
│ • Open Cases: 1 (Hardship)    │   (Sent, Delivered, Held)     │ • Recommended Next Action:    │
│ • Policy Status:              │ • Quick Notes drawer          │   "Propose Promise to Pay"    │
│   All Outbound Permitted      │                               │ • Policy Verdict:             │
│                               │                               │   [ALLOWED] (FDCPA / TCPA OK) │
│                               │                               │ • Draft Response (Editable)   │
│                               │                               │ • Action Controls:            │
│                               │                               │   [Approve & Send] [Reject]   │
│                               │                               │   [Escalate to Human]         │
└───────────────────────────────┴───────────────────────────────┴───────────────────────────────┘
```

#### Detailed Column Capabilities

##### Column 1: Borrower Context
- Always-visible summary of verified financial facts from PostgreSQL.
- Real-time indicator of borrower's local time and quiet-hours compliance.
- Visual warning badges if the borrower has active disputes, hardship declarations, or legal representation.

##### Column 2: Conversation Stream
- **Unified Timeline**: Displays inbound and outbound SMS, email exchanges, imported call transcripts, and internal collector notes in unified chronological order.
- **Channel Indicators**: Clear visual tags distinguishing SMS (green), Email (blue), Phone Transcript (purple), and Internal Note (amber).
- **Simulated Inbound Composer**: Allows the operator to simulate incoming borrower messages (e.g., *"I can pay $150 on Friday"*, *"STOP"*, *"I already paid this last month"*), immediately triggering the AI analysis pipeline.

##### Column 3: AI Copilot Panel
1. **Intent Classification Card**: Displays the primary classified intent (e.g., `PROMISE_TO_PAY`, `DISPUTE`, `BALANCE_INQUIRY`, `OPT_OUT`) with rationale.
2. **Entity Extraction Table**: Structured cards showing extracted values:
   - Monetary Amount (e.g., `$200.00`).
   - Proposed Date (normalized to ISO date and localized to borrower timezone).
   - Preferred Channel / Contact Method.
3. **Structured Summary**: Concise 2–3 bullet summary of dialogue history, kept/broken commitments, and current borrower posture.
4. **Recommended Next Best Action**:
   - Proposed action title and reason.
   - Required inputs and supporting evidence.
   - Deterministic Policy Status Badge (`ALLOWED`, `BLOCKED`, `REQUIRES_APPROVAL`).
5. **Context-Grounded Response Draft**:
   - Pre-populated, empathetic reply generated by Gemini.
   - **Full In-Place Editing**: Operator can freely modify text before taking any action.
   - Never auto-sends without human approval.
6. **Action Execution Controls**:
   - `Approve & Execute Action`: Triggers backend tool execution, updates database, and posts outbound message.
   - `Reject Suggestion`: Dismisses proposal with optional operator feedback.
   - `Escalate to Human`: Instantly creates an escalated Case and assigns it to supervisor queue.

---

### Module 5: Cases & Human Review

#### Purpose
Manage complex, legally sensitive, or disputed situations that cannot or should not be resolved through automated messaging.

#### Supported Case Categories
- **Dispute**: Contested balance, claim of prior payment, billing error.
- **Hardship**: Involuntary job loss, medical emergency, natural disaster.
- **Identity / Wrong-Party**: Borrower claims wrong phone number or alleges identity theft.
- **Legal Escalation**: Borrower represented by attorney or filed bankruptcy.
- **AI Uncertainty**: Model confidence below threshold or conflicting borrower signals.
- **Payment Reconciliation Anomaly**: Payment provider webhook received with mismatching amount or orphaned account ID.

#### Case Management Features
- Case detail drawer displaying full conversation snapshot, relevant ledger entries, and audit trail.
- Status transition workflow: `OPEN` -> `UNDER_REVIEW` -> `ACTION_PENDING` -> `RESOLVED` / `CLOSED`.
- Resolution note recording with mandatory operator attribution.

---

### Module 6: Policy Centre & Audit Trail

#### Purpose
Provide full transparency into system governance, active compliance rules, and an immutable log of every automated and human decision.

#### Features
1. **Policy Ruleset Explorer**: Displays the currently active policy configuration:
   - Quiet-hours boundaries (8:00 AM – 9:00 PM local time).
   - Statutory opt-out keywords (`STOP`, `UNSUBSCRIBE`, `CANCEL`, `QUIT`, `END`).
   - First-reply amount non-disclosure rule.
   - Payment-link amount ceiling (cannot exceed current verified balance).
   - Citations and statutory references (FDCPA §805, Regulation F §1006).
2. **Immutable Audit Log Table**:
   - Filterable stream of every `AuditEvent`: Timestamp, Actor (`SYSTEM`, `COLLECTOR`, `BORROWER`), Event Type, Policy Decision ID, Previous State, New State, and Full JSON Payload.

---

## 4. End-to-End User Journeys

### Journey 1: Routine Balance Inquiry & Payment Link Generation
1. Collector views Work Queue; clicks borrower *James Wilson* (Current balance: $320.00).
2. Operator uses simulated composer to submit borrower message: *"Hi, how much do I owe, and can I get a link to pay it?"*
3. Vercel AI SDK invokes Gemini with borrower context and tool definitions.
4. Gemini classifies intent as `BALANCE_INQUIRY` and `PAYMENT_LINK_REQUEST`.
5. AI Copilot displays:
   - Intent: `BALANCE_INQUIRY` + `PAYMENT_LINK_REQUEST`.
   - Extracted Amount: Full balance ($320.00).
   - Next Action: `createPaymentLink(accountId: "acc_002", amount: 320.00)`.
   - Draft Reply: *"Hi James, your current verified balance is $320.00. I have generated a secure payment link for you below."*
6. Deterministic Policy Engine runs: checks identity, quiet hours (11:00 AM local = allowed), verified balance check ($320.00 <= $320.00 = allowed). Status: `ALLOWED`.
7. Collector reviews draft, clicks **Approve & Send**.
8. Backend creates simulated payment link (`https://pay.financeops.demo/l/x7812`), logs audit event, appends outbound message to timeline, and removes account from urgent queue.

### Journey 2: Promise-to-Pay Negotiation & Reconciliation
1. Borrower *Maria Garcia* texts: *"I can't pay the full $600 right now, but I can do $200 next Tuesday."*
2. Gemini extracts:
   - Intent: `PROMISE_TO_PAY`.
   - Amount: `$200.00`.
   - Date: Next Tuesday (normalized relative to Maria's timezone: `America/Chicago` -> `2026-11-17`).
3. Next Action proposed: `proposePromiseToPay(accountId: "acc_003", amount: 200.00, dueDate: "2026-11-17")`.
4. Policy Engine verifies: amount is positive and less than total balance; no active legal hold; within allowable PTP limits. Status: `ALLOWED`.
5. Collector approves proposal. System records PTP in state `APPROVED`.
6. Timeline logs the approved promise with due date badge.
7. *Simulation Step*: Collector clicks "Simulate Payment Succeeded" on the created PTP.
8. System executes payment reconciliation: generates `AccountLedgerEntry` (type: `PAYMENT`, amount: `-$200.00`), updates account balance to `$400.00`, transitions PTP status to `KEPT`, and writes audit record.

### Journey 3: Dispute Escalation & Human Handoff
1. Borrower *Robert Taylor* texts: *"I dispute this entire charge. I was double-billed and already sent proof to your support email."*
2. Gemini classifies intent as `DISPUTE`, extracts category `BILLING_ERROR`.
3. Deterministic Policy Engine triggers immediate fast-path rule: **Dispute condition detected**. Policy verdict: `BLOCKED` for standard collection outreach; `REQUIRES_APPROVAL` for case creation.
4. Copilot suppresses collection demand, proposes:
   - Next Action: `createDispute(accountId: "acc_004", category: "BILLING_ERROR", description: "Double-billing claim")`.
   - Draft Reply: *"Thank you for letting us know, Robert. I have logged a formal dispute for your account and routed this to our review specialist team. All collection outreach is paused while we verify your records."*
5. Collector clicks **Escalate to Human Review**.
6. System creates Case #105, updates account collection status to `DISPUTE_HOLD`, and re-routes account to the Supervisor Review Queue.

### Journey 4: STOP Opt-Out & Quiet Hours Override
1. Borrower *David Kim* texts: *"STOP texting me."*
2. Deterministic Policy Engine fast-path activates before LLM generation:
   - Detects statutory keyword `STOP`.
   - Immediately executes `markOptOut(accountId: "acc_005")`.
   - Suppresses outbound reply (`reply: ""`).
   - Sets action to `HOLD`.
3. Account consent status immediately updates to `OPTED_OUT`. Timeline displays system notification: *"Borrower opted out via STOP. All automated and manual outbound messaging locked."*

---

## 5. Feature-to-Evidence Traceability Matrix

Every core feature in Variant 2 traces directly to empirical borrower survey findings, competitor user reviews, FinanceOps public positioning, or statutory regulatory standards:

| Feature / Architectural Choice | Primary Research Source | Denominator / Exact Evidence | Product Justification |
|---|---|---|---|
| **Multi-Channel Context (SMS + Email + Calls)** | C&R Software / Ipsos Survey (Dec 2025) | n=378 (Borrower Experience Subgroup) | 36% prefer email, 20% mail, 14% phone, 9% SMS, 1% chatbot. Systems must not assume SMS is universal. |
| **Promise-to-Pay Lifecycle & Plan Tracking** | C&R Software / Ipsos Survey (Dec 2025) | n=224 (Resolved Debt Subgroup) | 40% of resolved debts in subgroup were resolved through payment plans. Tracking flexible commitments is essential for recovery. |
| **Human Approval Gate on AI Drafts** | C&R Software / Ipsos Survey (Dec 2025) | n=182 (Automation Experience Subgroup) & n=378 | 38% described automation as worse than human; 69% prefer human contact; 57% express severe concern over lack of empathy. |
| **Verified Ledger Truth vs. AI Hallucination** | C&R Software / Ipsos Survey (Dec 2025) | n=378 (Borrower Experience Subgroup) | 56% express very/extreme concern over automated system accuracy; 60% over privacy. Balances must originate from PostgreSQL, never LLM text. |
| **Unified Timeline & Refresh Reliability** | Competitor G2/Capterra Reviews (Gaviti & Tesorio) | User reviews on G2 & Capterra | Collectors consistently complain about stale balances, integration refresh delays, and disjointed email/billing records. |
| **Explainable Work Queue Prioritisation** | FinanceOps Public Positioning | Collector's Brain & Autopilot Marketing | Aligns with FinanceOps's strategy of guiding collectors to high-impact accounts using clear context and timing recommendations. |
| **Quiet-Hours & Consent Enforcement** | Statutory References: FDCPA §805 & CFPB Regulation F | 15 U.S.C. §1692c; 12 CFR §1006.14 | Mandates permissible communication times (8 AM – 9 PM local borrower time) and immediate cessation upon opt-out. |

---

## 6. Scope Boundaries: In-Scope vs. Out-of-Scope

### In-Scope (Phase 1 Demonstration)
- Full-stack Next.js App Router application in TypeScript.
- PostgreSQL relational database managed via Prisma ORM.
- Realistic seeded portfolio of 10 synthetic borrower accounts covering diverse debt states, timezones, and communication histories.
- Vercel AI SDK integration with Google Gemini (`gemini-2.0-flash` or `gemini-1.5-flash`), with fallback to fake deterministic provider for testing.
- Deterministic Policy Engine enforcing 19 concrete rules (identity, quiet hours, disputes, opt-outs, balance validation).
- 14 typed business tools with Zod input validation and audit logging.
- 3-column interactive Conversation Workspace with real-time Copilot, draft editor, and action execution.
- Simulated external payment provider (link creation, status verification, settlement reconciliation).
- Simulated inbound communication triggers for SMS, email, and phone transcripts.
- Comprehensive Vitest automated backend test suite.

### Out-of-Scope (Deferred to Future Iterations)
- Real external telephony gateways (Twilio, Telnyx) or live PSTN dialing.
- Real outbound email delivery (SendGrid, Postmark) or webhook ingestion.
- Real payment gateway transactions (Stripe, Finix) processing live currency.
- Autonomous, unsupervised debt negotiation where an AI settles loans without human review.
- Black-box machine learning credit risk or recovery scoring models.
- Complex microservices, Kafka event buses, or Kubernetes orchestration.
- Vector database / RAG infrastructure for structured tabular customer data.
- Full multi-jurisdictional legal compliance across international lending regimes.

---

## 7. Product Acceptance Criteria

The system will be evaluated against the following end-to-end acceptance gates:

1. **Dashboard Integrity**: Opening the application displays real portfolio metrics (Active Accounts, Total Overdue, Broken Promises) computed directly from the seeded PostgreSQL database.
2. **Work Queue Prioritisation**: The Work Queue renders delinquent accounts ordered by priority, displaying transparent trigger reasons (e.g., missed promise, dispute raised).
3. **Borrower 360 Completeness**: Selecting an account displays verified balances, immutable ledger transactions, communication preferences, and active flags.
4. **Interactive Inbound Simulation**: Submitting a simulated message (e.g., *"I can pay $150 next Tuesday"*) triggers the real Vercel AI SDK + Gemini pipeline.
5. **Structured Intelligence**: Gemini outputs structured intent, extracted entities (amount, normalized date), dialogue summary, and recommended action.
6. **Policy Evaluation**: The Deterministic Policy Engine evaluates the proposal and surfaces a clear status badge (`ALLOWED`, `BLOCKED`, `REQUIRES_APPROVAL`) with regulatory citations.
7. **Human Control**: The collector can edit the AI draft in place, review the proposed tool call, and approve or reject the action.
8. **State Mutation & Ledger Settlement**: Approving an action executes the underlying tool, updates PostgreSQL (e.g., creating a `PromiseToPay` record), appends to the conversation timeline, and writes an immutable `AuditEvent`.
9. **Resilience & Offline Operation**: If the Gemini API key is missing or the provider returns an error, the system gracefully degrades, alerting the operator while keeping all manual review, ledger inspection, and tool execution fully operational.
