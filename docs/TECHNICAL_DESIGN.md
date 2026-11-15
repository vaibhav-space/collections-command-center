# Technical Design Document (TDD)
## FinanceOps Collections Command Center — Variant 2

---

## 1. High-Level Architecture Overview

The **FinanceOps Collections Command Center (Variant 2)** is architected as a modular TypeScript monolith built on the Next.js App Router. It integrates React server and client components, server-side domain services, a PostgreSQL database managed via Prisma ORM, and the Vercel AI SDK Core interfacing with Google Gemini.

### 1.1 Architecture Diagram

```mermaid
flowchart TD
    subgraph Client["Frontend Client (React / shadcn / Tailwind)"]
        UI_Dash["Dashboard View"]
        UI_Queue["Work Queue View"]
        UI_B360["Borrower 360 View"]
        UI_Workspace["3-Column Conversation Workspace"]
        UI_Cases["Case Management View"]
        UI_Audit["Policy & Audit Trail View"]
    end

    subgraph API["Next.js App Router API Layer (Node.js Runtime)"]
        API_Queue["/api/queue"]
        API_Accounts["/api/accounts/:id"]
        API_Conv["/api/conversations/:id/messages"]
        API_Copilot["/api/ai/copilot"]
        API_Actions["/api/actions/execute"]
        API_Sim["/api/simulations/:action"]
    end

    subgraph Core["Domain & Safety Services"]
        PolicyEngine["Deterministic Policy Engine\n(19 Statutory & Safety Rules)"]
        ToolRegistry["Typed Business Tool Registry\n(14 Business Services)"]
        AIEngine["AI Copilot Service\n(Vercel AI SDK Core)"]
        LedgerService["Financial Ledger Service\n(Exact Decimal Math)"]
        AuditService["Append-Only Audit Service"]
    end

    subgraph External["External / Simulation Boundaries"]
        Gemini["Google Gemini API\n(@ai-sdk/google)"]
        MockLLM["Deterministic Mock LLM\n(Test Harness)"]
        SimPayments["Simulated Payment Provider\n(Link, Webhooks, Reconciliation)"]
        SimComms["Simulated Channel Inbound\n(SMS, Email, Transcripts)"]
    end

    subgraph Storage["Persistence Layer (PostgreSQL)"]
        Prisma["Prisma ORM Client (Singleton)"]
        DB[(PostgreSQL Database)]
    end

    %% Client to API
    UI_Dash --> API_Queue
    UI_Queue --> API_Queue
    UI_B360 --> API_Accounts
    UI_Workspace --> API_Conv
    UI_Workspace --> API_Copilot
    UI_Workspace --> API_Actions
    UI_Workspace --> API_Sim
    UI_Cases --> API_Actions
    UI_Audit --> API_Accounts

    %% API to Core
    API_Copilot --> AIEngine
    API_Copilot --> PolicyEngine
    API_Actions --> PolicyEngine
    API_Actions --> ToolRegistry
    API_Conv --> ToolRegistry
    API_Sim --> ToolRegistry
    ToolRegistry --> LedgerService
    ToolRegistry --> AuditService
    PolicyEngine --> AuditService

    %% Core to External
    AIEngine --> Gemini
    AIEngine -.-> MockLLM
    ToolRegistry -.-> SimPayments
    API_Sim -.-> SimComms

    %% Core to Persistence
    LedgerService --> Prisma
    ToolRegistry --> Prisma
    AuditService --> Prisma
    PolicyEngine --> Prisma
    Prisma --> DB
```

---

## 2. Next.js Application Structure & Directory Layout

The application adheres to clean separation of concerns, maintaining isolated domain boundaries within standard Next.js conventions:

```text
financeops-command-center/
├── app/                                 # Next.js App Router root
│   ├── (dashboard)/                     # Authenticated operator layout group
│   │   ├── layout.tsx                   # Main layout: Sidebar + TopHeader
│   │   ├── page.tsx                     # Module 1: Collections Dashboard
│   │   ├── queue/                       # Module 2: Collector Work Queue
│   │   │   └── page.tsx
│   │   ├── borrowers/                   # Module 3: Borrower 360
│   │   │   ├── page.tsx                 # Borrower directory / table
│   │   │   └── [id]/page.tsx            # Comprehensive Account 360 view
│   │   ├── workspace/                   # Module 4: Conversation Workspace
│   │   │   └── [accountId]/page.tsx     # 3-Column interactive workspace
│   │   ├── cases/                       # Module 5: Cases & Human Review
│   │   │   └── page.tsx
│   │   ├── policies/                    # Module 6: Policy Centre
│   │   │   └── page.tsx
│   │   └── audit/                       # Module 6: Immutable Audit Trail
│   │       └── page.tsx
│   ├── api/                             # REST Route Handlers (Node.js runtime)
│   │   ├── accounts/
│   │   │   ├── route.ts                 # List/filter accounts
│   │   │   └── [id]/route.ts            # Account details & ledger
│   │   ├── queue/
│   │   │   └── route.ts                 # Aggregated work queue items
│   │   ├── conversations/
│   │   │   └── [id]/messages/route.ts   # Message timeline retrieval & posting
│   │   ├── ai/
│   │   │   └── copilot/route.ts         # Gemini Copilot analysis & drafting
│   │   ├── actions/
│   │   │   └── execute/route.ts         # Policy check & tool execution
│   │   └── simulations/
│   │       ├── inbound/route.ts         # Simulate borrower inbound message
│   │       └── payment/route.ts         # Simulate payment link settlement
│   ├── globals.css                      # Tailwind base & component styles
│   └── layout.tsx                       # Root HTML shell & font providers
├── src/
│   ├── ai/                              # Vercel AI SDK Core & Gemini integration
│   │   ├── client.ts                    # Configured AI provider factory
│   │   ├── prompts.ts                   # System prompts & few-shot examples
│   │   ├── schemas.ts                   # Zod schemas for structured LLM outputs
│   │   └── service.ts                   # Copilot analysis & generation engine
│   ├── policies/                        # Deterministic Policy Engine
│   │   ├── engine.ts                    # Main policy evaluation orchestrator
│   │   ├── rules/                       # Individual rule implementations
│   │   │   ├── quiet-hours.ts           # 8am-9pm local borrower time
│   │   │   ├── opt-out.ts               # STOP keyword statutory handling
│   │   │   ├── disputes.ts              # Dispute & contest routing
│   │   │   ├── privacy.ts               # Cross-customer data isolation
│   │   │   ├── amount-disclosure.ts     # First-reply debt suppression
│   │   │   └── financial-limits.ts      # Payment link & promise validation
│   │   └── types.ts                     # PolicyDecision & PolicyRule types
│   ├── tools/                           # Business Tool Registry
│   │   ├── registry.ts                  # Tool definition & execution router
│   │   ├── implementations/             # Typed business tool handlers
│   │   │   ├── account-tools.ts         # getSnapshot, getBalance, getHistory
│   │   │   ├── payment-tools.ts         # createPaymentLink, verifyPayment
│   │   │   ├── promise-tools.ts         # proposePTP, confirmPTP, reconcilePTP
│   │   │   ├── case-tools.ts            # createDispute, createHardship
│   │   │   └── communication-tools.ts   # updatePreference, scheduleCallback
│   │   └── schemas.ts                   # Zod schemas for all tool parameters
│   ├── services/                        # Core backend domain services
│   │   ├── account.service.ts           # Account lookup and metrics
│   │   ├── ledger.service.ts            # Double-entry ledger math (Decimal)
│   │   ├── conversation.service.ts      # Thread & message management
│   │   ├── queue.service.ts             # Explainable priority queue builder
│   │   ├── case.service.ts              # Case lifecycle transitions
│   │   └── audit.service.ts             # Immutable audit event creation
│   ├── components/                      # Reusable React UI components
│   │   ├── ui/                          # shadcn/ui primitives (Button, Card, etc.)
│   │   ├── layout/                      # Sidebar, Header, Breadcrumbs
│   │   ├── dashboard/                   # Metric cards, AgingChart, ActivityFeed
│   │   ├── queue/                       # QueueTable, PriorityBadge, QueueFilter
│   │   ├── borrower-360/                # ProfileCard, LedgerTable, PtpList
│   │   └── workspace/                   # LeftContext, CenterTimeline, RightCopilot
│   ├── lib/
│   │   ├── prisma.ts                    # Prisma Client global singleton
│   │   ├── utils.ts                     # Tailwind merger & formatting utils
│   │   └── timezone.ts                  # Intl date & quiet-hours utilities
│   └── test/                            # Backend test suite (Vitest)
│       ├── fixtures/                    # Seed account data & mock payloads
│       ├── unit/                        # Policy, tool, & ledger tests
│       └── integration/                 # End-to-end workflow verification
├── prisma/
│   ├── schema.prisma                    # PostgreSQL schema definition
│   ├── migrations/                      # Prisma SQL migration files
│   └── seed.ts                          # Repeatable 10-account synthetic seed
├── .env.example                         # Environment configuration template
├── package.json                         # Dependencies & npm scripts
├── tsconfig.json                        # TypeScript strict compiler config
└── vitest.config.ts                     # Vitest configuration
```

---

## 3. Database Architecture & Prisma Schema

All financial values are stored using PostgreSQL's `DECIMAL(12, 2)` type to guarantee exact fractional precision and eliminate JavaScript IEEE-754 floating-point inaccuracies.

### 3.1 Conceptual Entity-Relationship Model

```mermaid
erDiagram
    TENANT ||--o{ OPERATOR : "employs"
    TENANT ||--o{ BORROWER : "owns"
    TENANT ||--o{ POLICY_VERSION : "configures"

    BORROWER ||--o{ ACCOUNT : "holds"
    BORROWER ||--o{ CONTACT_METHOD : "has"
    BORROWER ||--o{ CONTACT_PREFERENCE : "defines"

    ACCOUNT ||--o{ ACCOUNT_LEDGER_ENTRY : "records"
    ACCOUNT ||--o{ CONVERSATION : "contains"
    ACCOUNT ||--o{ PAYMENT_LINK : "generates"
    ACCOUNT ||--o{ PAYMENT : "receives"
    ACCOUNT ||--o{ PROMISE_TO_PAY : "tracks"
    ACCOUNT ||--o{ CASE : "triggers"

    CONVERSATION ||--o{ MESSAGE : "contains"
    MESSAGE ||--o{ TOOL_EXECUTION_LOG : "triggers"

    POLICY_VERSION ||--o{ POLICY_DECISION_LOG : "evaluates"
    POLICY_DECISION_LOG ||--o{ TOOL_EXECUTION_LOG : "gates"

    ACCOUNT ||--o{ AUDIT_EVENT : "logs"
```

### 3.2 Proposed `prisma/schema.prisma` Specification

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// -----------------------------------------------------------------------------
// Multi-Tenancy & Authorization Context
// -----------------------------------------------------------------------------

model Tenant {
  id             String          @id @default(cuid())
  name           String
  code           String          @unique
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  operators      Operator[]
  borrowers      Borrower[]
  accounts       Account[]
  policyVersions PolicyVersion[]
  auditEvents    AuditEvent[]

  @@map("tenants")
}

model Operator {
  id             String          @id @default(cuid())
  tenantId       String
  tenant         Tenant          @relation(fields: [tenantId], references: [id])
  email          String          @unique
  name           String
  role           OperatorRole    @default(COLLECTOR)
  isActive       Boolean         @default(true)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  assignedCases  Case[]
  auditEvents    AuditEvent[]

  @@map("operators")
}

enum OperatorRole {
  COLLECTOR
  SUPERVISOR
  ADMIN
}

// -----------------------------------------------------------------------------
// Borrower & Account Core
// -----------------------------------------------------------------------------

model Borrower {
  id             String          @id @default(cuid())
  tenantId       String
  tenant         Tenant          @relation(fields: [tenantId], references: [id])
  borrowerCode   String          @unique // e.g. "BOR-1001"
  firstName      String
  lastName       String
  primaryPhone   String
  primaryEmail   String
  timezone       String          @default("America/New_York") // IANA format
  isOptedOut     Boolean         @default(false)
  optedOutAt     DateTime?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  accounts       Account[]
  contactMethods ContactMethod[]
  preferences    ContactPreference[]

  @@index([tenantId, borrowerCode])
  @@map("borrowers")
}

model ContactMethod {
  id             String          @id @default(cuid())
  borrowerId     String
  borrower       Borrower        @relation(fields: [borrowerId], references: [id], onDelete: Cascade)
  channel        ChannelType
  addressValue   String          // phone number or email address
  isVerified     Boolean         @default(true)
  isActive       Boolean         @default(true)
  createdAt      DateTime        @default(now())

  @@unique([borrowerId, channel, addressValue])
  @@map("contact_methods")
}

model ContactPreference {
  id             String          @id @default(cuid())
  borrowerId     String
  borrower       Borrower        @relation(fields: [borrowerId], references: [id], onDelete: Cascade)
  preferredChannel ChannelType   @default(EMAIL)
  allowSms       Boolean         @default(true)
  allowEmail     Boolean         @default(true)
  allowCalls     Boolean         @default(true)
  preferredTimeWindow String?    // e.g. "10:00-14:00"
  updatedAt      DateTime        @updatedAt

  @@unique([borrowerId])
  @@map("contact_preferences")
}

enum ChannelType {
  SMS
  EMAIL
  PHONE_CALL
  CHATBOT
}

model Account {
  id             String          @id @default(cuid())
  tenantId       String
  tenant         Tenant          @relation(fields: [tenantId], references: [id])
  borrowerId     String
  borrower       Borrower        @relation(fields: [borrowerId], references: [id], onDelete: Cascade)
  accountNumber  String          @unique // e.g. "ACC-8001"
  status         AccountStatus   @default(DELINQUENT)
  currency       String          @default("USD")

  // Exact Monetary Ledger Balances
  currentBalance Decimal         @db.Decimal(12, 2)
  principalOwed  Decimal         @db.Decimal(12, 2)
  interestOwed   Decimal         @db.Decimal(12, 2)
  feesOwed       Decimal         @db.Decimal(12, 2)
  amountOverdue  Decimal         @db.Decimal(12, 2)
  daysPastDue    Int             @default(0)

  // Operational Metadata
  delinquentSince DateTime?
  lastPaymentDate DateTime?
  lastContactDate DateTime?
  hasActiveDispute Boolean       @default(false)
  hasActiveHardship Boolean      @default(false)
  hasLegalRepresentation Boolean @default(false)

  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  ledgerEntries  AccountLedgerEntry[]
  conversations  Conversation[]
  paymentLinks   PaymentLink[]
  payments       Payment[]
  promisesToPay  PromiseToPay[]
  cases          Case[]
  auditEvents    AuditEvent[]

  @@index([tenantId, status, daysPastDue])
  @@index([borrowerId])
  @@map("accounts")
}

enum AccountStatus {
  CURRENT
  DELINQUENT
  IN_DISPUTE
  HARDSHIP_PAUSED
  LEGAL_HOLD
  PAID_IN_FULL
  CHARGED_OFF
}

// -----------------------------------------------------------------------------
// Financial Ledger & Payment Reconciliation
// -----------------------------------------------------------------------------

model AccountLedgerEntry {
  id             String          @id @default(cuid())
  accountId      String
  account        Account         @relation(fields: [accountId], references: [id], onDelete: Cascade)
  entryType      LedgerEntryType
  amount         Decimal         @db.Decimal(12, 2) // Positive = Debt Increase, Negative = Payment/Credit
  balanceAfter   Decimal         @db.Decimal(12, 2)
  currency       String          @default("USD")
  description    String
  referenceId    String?         // Payment ID, fee reference, etc.
  createdAt      DateTime        @default(now())

  @@index([accountId, createdAt])
  @@map("account_ledger_entries")
}

enum LedgerEntryType {
  PRINCIPAL_CHARGE
  INTEREST_ACCRUAL
  LATE_FEE
  PAYMENT_CREDIT
  ADJUSTMENT_CREDIT
  FEE_REVERSAL
}

model PaymentLink {
  id             String          @id @default(cuid())
  accountId      String
  account        Account         @relation(fields: [accountId], references: [id], onDelete: Cascade)
  url            String          @unique
  amount         Decimal         @db.Decimal(12, 2)
  currency       String          @default("USD")
  status         PaymentLinkStatus @default(ACTIVE)
  expiresAt      DateTime
  idempotencyKey String          @unique
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  payments       Payment[]

  @@index([accountId, status])
  @@map("payment_links")
}

enum PaymentLinkStatus {
  ACTIVE
  CLICKED
  COMPLETED
  EXPIRED
  REVOKED
}

model Payment {
  id             String          @id @default(cuid())
  accountId      String
  account        Account         @relation(fields: [accountId], references: [id], onDelete: Cascade)
  paymentLinkId  String?
  paymentLink    PaymentLink?    @relation(fields: [paymentLinkId], references: [id])
  amount         Decimal         @db.Decimal(12, 2)
  currency       String          @default("USD")
  status         PaymentStatus   @default(PENDING)
  providerRef    String          @unique // Simulated processor reference
  paymentMethod  String          @default("ACH") // "ACH", "DEBIT_CARD", "WIRE"
  settledAt      DateTime?
  failedReason   String?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  promiseToPayId String?
  promiseToPay   PromiseToPay?   @relation(fields: [promiseToPayId], references: [id])

  @@index([accountId, status])
  @@map("payments")
}

enum PaymentStatus {
  PENDING
  SETTLED
  FAILED
  REFUNDED
}

// -----------------------------------------------------------------------------
// Promise-To-Pay (PTP) State Machine
// -----------------------------------------------------------------------------

model PromiseToPay {
  id             String          @id @default(cuid())
  accountId      String
  account        Account         @relation(fields: [accountId], references: [id], onDelete: Cascade)
  amount         Decimal         @db.Decimal(12, 2)
  currency       String          @default("USD")
  dueDate        DateTime
  status         PtpStatus       @default(PROPOSED)
  proposedBy     String          // "BORROWER", "AI_COPILOT", "OPERATOR"
  approvedBy     String?         // Operator ID
  confirmedAt    DateTime?
  brokenAt       DateTime?
  idempotencyKey String?         @unique
  notes          String?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  payments       Payment[]

  @@index([accountId, status, dueDate])
  @@map("promises_to_pay")
}

enum PtpStatus {
  PROPOSED
  PENDING_CONFIRMATION
  APPROVED
  DUE
  KEPT
  BROKEN
  CANCELLED
}

// -----------------------------------------------------------------------------
// Conversations & Timeline
// -----------------------------------------------------------------------------

model Conversation {
  id             String          @id @default(cuid())
  accountId      String
  account        Account         @relation(fields: [accountId], references: [id], onDelete: Cascade)
  channel        ChannelType
  status         ConversationStatus @default(ACTIVE)
  summary        String?         @db.Text
  lastMessageAt  DateTime        @default(now())
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  messages       Message[]

  @@index([accountId, status])
  @@map("conversations")
}

enum ConversationStatus {
  ACTIVE
  PAUSED
  CLOSED
  ESCALATED
}

model Message {
  id             String          @id @default(cuid())
  conversationId String
  conversation   Conversation    @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  senderType     SenderType
  channel        ChannelType
  body           String          @db.Text
  sentAt         DateTime        @default(now())
  isRead         Boolean         @default(false)
  deliveryStatus DeliveryStatus  @default(DELIVERED)

  // AI & Policy Metadata
  detectedIntent String?
  extractedEntities Json?
  policyDecisionId String?

  toolExecutions ToolExecutionLog[]

  @@index([conversationId, sentAt])
  @@map("messages")
}

enum SenderType {
  BORROWER
  OPERATOR
  AI_AGENT
  SYSTEM
}

enum DeliveryStatus {
  PENDING
  DELIVERED
  HELD
  FAILED
}

// -----------------------------------------------------------------------------
// Case Management & Escalations
// -----------------------------------------------------------------------------

model Case {
  id             String          @id @default(cuid())
  accountId      String
  account        Account         @relation(fields: [accountId], references: [id], onDelete: Cascade)
  assignedToId   String?
  assignedTo     Operator?       @relation(fields: [assignedToId], references: [id])
  category       CaseCategory
  priority       CasePriority    @default(MEDIUM)
  status         CaseStatus      @default(OPEN)
  title          String
  description    String          @db.Text
  resolutionNotes String?        @db.Text
  resolvedAt     DateTime?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  @@index([accountId, status, priority])
  @@map("cases")
}

enum CaseCategory {
  DISPUTE
  HARDSHIP
  IDENTITY_THEFT
  WRONG_PARTY
  LEGAL_REPRESENTATION
  BANKRUPTCY
  AI_UNCERTAINTY
  PAYMENT_RECONCILIATION_FAILURE
}

enum CasePriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum CaseStatus {
  OPEN
  UNDER_REVIEW
  ACTION_PENDING
  RESOLVED
  CLOSED
}

// -----------------------------------------------------------------------------
// Policy Engine & Tool Governance
// -----------------------------------------------------------------------------

model PolicyVersion {
  id             String          @id @default(cuid())
  tenantId       String
  tenant         Tenant          @relation(fields: [tenantId], references: [id])
  versionString  String          // e.g. "v2026.11-us-standard"
  rulesConfig    Json            // Serialized policy rule thresholds
  isActive       Boolean         @default(true)
  createdAt      DateTime        @default(now())

  decisions      PolicyDecisionLog[]

  @@unique([tenantId, versionString])
  @@map("policy_versions")
}

model PolicyDecisionLog {
  id             String          @id @default(cuid())
  policyVersionId String
  policyVersion  PolicyVersion   @relation(fields: [policyVersionId], references: [id])
  accountId      String
  actionAttempted String
  status         PolicyStatus    // ALLOWED, BLOCKED, REQUIRES_APPROVAL
  reason         String          @db.Text
  evidence       Json            // Array of supporting account strings
  evaluatedAt    DateTime        @default(now())

  toolExecutionLogs ToolExecutionLog[]

  @@index([accountId, evaluatedAt])
  @@map("policy_decision_logs")
}

enum PolicyStatus {
  ALLOWED
  BLOCKED
  REQUIRES_APPROVAL
}

model ToolExecutionLog {
  id             String          @id @default(cuid())
  messageId      String?
  message        Message?        @relation(fields: [messageId], references: [id])
  policyDecisionId String?
  policyDecision PolicyDecisionLog? @relation(fields: [policyDecisionId], references: [id])
  toolName       String
  inputPayload   Json
  outputPayload  Json
  status         ExecutionStatus
  executedBy     String          // Operator ID or "SYSTEM"
  idempotencyKey String?         @unique
  executedAt     DateTime        @default(now())

  @@index([toolName, status])
  @@map("tool_execution_logs")
}

enum ExecutionStatus {
  SUCCESS
  FAILED
  REJECTED_BY_POLICY
}

// -----------------------------------------------------------------------------
// Immutable System Audit Log
// -----------------------------------------------------------------------------

model AuditEvent {
  id             String          @id @default(cuid())
  tenantId       String
  tenant         Tenant          @relation(fields: [tenantId], references: [id])
  accountId      String?
  account        Account?        @relation(fields: [accountId], references: [id])
  operatorId     String?
  operator       Operator?       @relation(fields: [operatorId], references: [id])
  actorType      ActorType
  action         String          // e.g. "PAYMENT_RECONCILED", "PTP_APPROVED"
  entityType     String          // "Account", "PromiseToPay", "Payment"
  entityId       String
  previousState  Json?
  newState       Json?
  ipAddress      String?
  createdAt      DateTime        @default(now())

  @@index([tenantId, createdAt])
  @@index([accountId, createdAt])
  @@map("audit_events")
}

enum ActorType {
  OPERATOR
  SYSTEM
  BORROWER
  AI_COPILOT
}
```

---

## 4. Vercel AI SDK Integration & Google Gemini Provider

### 4.1 Configurable Provider Architecture

The AI layer wraps the official Vercel AI SDK Core (`ai`) and the `@ai-sdk/google` provider behind a clean interface:

```typescript
// src/ai/client.ts
import { google } from '@ai-sdk/google';
import { LanguageModelV1 } from 'ai';

export function getLanguageModel(): LanguageModelV1 {
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  return google(modelName);
}
```

This guarantees:
1. Model names are never hardcoded. Changing from `gemini-2.0-flash` to `gemini-1.5-flash` or another provider requires altering only environment variables.
2. In automated tests, a `MockLanguageModel` is substituted, ensuring tests run offline with zero API calls.

### 4.2 Structured Output Contracts with Zod

The Copilot leverages `generateObject` with strict Zod schemas for deterministic parsing:

```typescript
// src/ai/schemas.ts
import { z } from 'zod';

export const BorrowerIntentEnum = z.enum([
  'BALANCE_INQUIRY',
  'PAYMENT_CONFIRMATION',
  'PAYMENT_DIFFICULTY',
  'PROMISE_TO_PAY',
  'PAYMENT_LINK_REQUEST',
  'DISPUTE',
  'WRONG_NUMBER',
  'FRAUD_OR_IDENTITY_THEFT',
  'HARDSHIP',
  'REQUEST_HUMAN_ASSISTANCE',
  'CONTACT_PREFERENCE_CHANGE',
  'STOP_OPT_OUT',
  'GENERAL_INQUIRY'
]);

export const ExtractedEntitiesSchema = z.object({
  amount: z.number().nullable().describe('Extracted payment or promise amount in USD'),
  date: z.string().nullable().describe('ISO 8601 target payment date or normalized relative date'),
  paymentMethod: z.string().nullable().describe('e.g. ACH, debit card, or wire'),
  preferredChannel: z.enum(['SMS', 'EMAIL', 'PHONE_CALL']).nullable().describe('Requested contact channel'),
  disputeCategory: z.string().nullable().describe('Billing error, fraud, prior payment claim'),
  hardshipReason: z.string().nullable().describe('Job loss, illness, natural disaster')
});

export const ProposedActionSchema = z.object({
  action: z.enum([
    'verifyPaymentStatus',
    'proposePromiseToPay',
    'createPaymentLink',
    'scheduleCallback',
    'updateContactPreference',
    'createDispute',
    'createHardshipCase',
    'createHumanHandoff',
    'recordInteraction',
    'wait'
  ]),
  reason: z.string().describe('Clear rationale for why this action is recommended'),
  requiredInputs: z.record(z.any()).describe('Key-value arguments required to execute the tool'),
  evidence: z.array(z.string()).describe('Account facts supporting the proposal'),
  requiresHumanApproval: z.boolean().default(true)
});

export const CopilotAnalysisOutputSchema = z.object({
  summary: z.string().describe('Concise 2-3 sentence summary of previous and current borrower state'),
  primaryIntent: BorrowerIntentEnum,
  sentiment: z.enum(['COOPERATIVE', 'FRUSTRATED', 'DISTRESSED', 'NEUTRAL', 'HOSTILE']),
  confidenceScore: z.number().min(0).max(1).describe('Model confidence in intent classification'),
  entities: ExtractedEntitiesSchema,
  recommendedAction: ProposedActionSchema,
  draftReply: z.string().describe('Empathetic, verified draft response for operator review'),
  isFallback: z.boolean().default(false).describe('Whether this analysis was produced by deterministic fallback'),
  modelUsed: z.string().default('gemini-2.0-flash').describe('Model or rule engine identifier')
});

export type CopilotAnalysisOutput = z.infer<typeof CopilotAnalysisOutputSchema>;
```

### 4.3 Copilot Service Implementation Flow

```typescript
// src/ai/service.ts
import { generateObject } from 'ai';
import { getLanguageModel } from './client.js';
import { CopilotAnalysisOutputSchema, CopilotAnalysisOutput } from './schemas.js';

export async function analyzeBorrowerMessage(params: {
  accountSnapshot: AccountSnapshot;
  recentMessages: MessageRecord[];
  inboundMessage: string;
}): Promise<CopilotAnalysisOutput> {
  const model = getLanguageModel();

  const systemPrompt = `You are an expert, empathetic collections copilot assisting a loan specialist.
Your primary role is to interpret borrower intent, extract entities, summarize status, and draft a respectful reply.
RULES:
1. Rely strictly on verified account facts provided in the prompt. Never invent balances.
2. If the borrower is distressed, acknowledge their situation empathetically without forgiving debt.
3. If the borrower raises a dispute or prior payment claim, do not dispute it; recommend human dispute review.
4. Keep the draft reply concise and professional.`;

  const userPrompt = `
Reference Date & Time (Borrower Local): ${params.currentLocalTimeFormatted} (${params.accountSnapshot.timezone})
Account Context:
- Account: ${params.accountSnapshot.accountNumber}
- Verified Balance: $${params.accountSnapshot.currentBalance.toFixed(2)}
- Overdue Amount: $${params.accountSnapshot.amountOverdue.toFixed(2)} (DPD: ${params.accountSnapshot.daysPastDue})
- Active Promise: ${params.accountSnapshot.activePromise ? `$${params.accountSnapshot.activePromise.amount} due ${params.accountSnapshot.activePromise.dueDate}` : 'None'}
- Timezone: ${params.accountSnapshot.timezone}

Recent Conversation History:
${params.recentMessages.map(m => `[${m.channel}] ${m.senderType}: ${m.body}`).join('\n')}

New Inbound Message:
"${params.inboundMessage}"
`;

  try {
    const result = await generateObject({
      model,
      schema: CopilotAnalysisOutputSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.1, // Low temperature for deterministic entity extraction
    });

    return result.object;
  } catch (error) {
    // Graceful fallback to rule-based analysis on Gemini outage or timeout
    return generateFallbackCopilotOutput(params.inboundMessage, params.accountSnapshot, error);
  }
}
```

---

## 5. Deterministic Policy Engine

The Policy Engine serves as the authoritative compliance gatekeeper. Regardless of what the LLM generates, no mutation or outbound message is executed without passing this engine.

### 5.1 Contract Definition

```typescript
// src/policies/types.ts
export type PolicyStatus = 'allowed' | 'blocked' | 'requires_approval';

export interface PolicyDecision {
  status: PolicyStatus;
  action: string;
  reason: string;
  policyVersion: string;
  evaluatedAt: string;
  evidence: string[];
  remediation?: string;
}

export interface PolicyContext {
  tenantId: string;
  account: AccountWithBorrower;
  actionAttempted: string;
  actionInputs: Record<string, any>;
  outboundDraft?: string;
  receivedAt?: Date;
}
```

### 5.2 The 19 Deterministic Policy Rules

1. **Borrower Identity & Ownership**: `actionInputs.accountId` must match the authenticated `account.id`. Rejects cross-account tool execution.
2. **Tenant Isolation**: Borrower and operator must share identical `tenantId`.
3. **Mandatory STOP Opt-Out**: Keywords (`STOP`, `UNSUBSCRIBE`, `CANCEL`, `QUIT`, `END`) immediately trigger `markOptOut`, halt outbound replies, and return `status: "allowed"` with suppressed text.
4. **Prior Opt-Out Guard**: If `borrower.isOptedOut === true`, all automated outbound communications are `BLOCKED`.
5. **Permissible Contact Hours (TCPA / FDCPA §805)**: Using `Intl.DateTimeFormat` with borrower's IANA timezone, verifies whether current local time is within 8:00 AM – 9:00 PM. If outside, sets status to `BLOCKED` or overrides message delivery to `HELD`.
6. **Dispute & Contest Protection**: Messages expressing billing disputes, prior payment claims, or accounting errors route to `REQUIRES_APPROVAL` with collection outreach paused.
7. **Negation-Aware Dispute Guard**: Rejects false-positive disputes on phrases such as *"I have no dispute"* or *"I'm not disputing the balance"*.
8. **Identity Theft & Fraud Hold**: Allegations of identity theft trigger mandatory legal hold (`REQUIRES_APPROVAL` for case creation, all outreach `BLOCKED`).
9. **Attorney Representation**: If borrower states an attorney represents them, third-party communication rules block direct borrower outreach and require attorney verification.
10. **Bankruptcy Filing Hold**: Active bankruptcy notices immediately freeze all collection actions (`BLOCKED`).
11. **Hardship Escalation**: Hardship declarations route to specialist case review (`REQUIRES_APPROVAL`).
12. **Explicit Human Assistance Request**: Borrowers requesting a human agent trigger automatic supervisor queue routing.
13. **First-Reply Amount Non-Disclosure**: In the first message of a conversation, debt balance figures are suppressed unless the borrower specifically inquired about the balance.
14. **Cross-Customer Privacy Scanner**: Inspects outbound draft text against all other borrower records; blocks transmission if foreign names, IDs, phones, or balances are detected.
15. **Payment Status Verification**: Prohibits claiming a payment is confirmed or settled until external provider status returns `SETTLED`.
16. **Payment Link Ceiling**: Payment links cannot exceed the verified `account.currentBalance`.
17. **Promise-to-Pay Ceiling & Window**: Promises cannot exceed current balance and due date cannot be in the past or beyond 90 days.
18. **Idempotency & Duplicate Suppression**: Prevents duplicate payment links or promise proposals generated within a 60-second window.
19. **Stale Data Guard**: Refuses action execution if the account balance record was modified between copilot proposal and human approval.

---

## 6. Business Tool Registry & Service Layer

Tools are implemented as type-safe backend functions with Zod schemas. They cannot be executed directly by client requests or the LLM; they must be dispatched via the `ToolRegistry` after policy clearance.

### 6.1 Tool Registry Table

| Tool Name | Input Schema (Zod) | Permitted Actors | Side Effects & Persistence |
|---|---|---|---|
| `getAccountSnapshot` | `{ accountId: string }` | AI, Operator | Read-only; retrieves current balances, promises, and cases. |
| `getBalance` | `{ accountId: string }` | AI, Operator | Read-only; returns current verified balance and currency. |
| `getPaymentHistory` | `{ accountId: string }` | AI, Operator | Read-only; returns ledger transactions and recent payments. |
| `verifyPaymentStatus` | `{ accountId: string, providerRef: string }` | Operator, System | Queries simulated provider; updates `Payment.status`. |
| `createPaymentLink` | `{ accountId: string, amount: number }` | Operator (Approved) | Creates `PaymentLink` record; generates deterministic URL. |
| `proposePromiseToPay` | `{ accountId: string, amount: number, dueDate: string }` | AI, Operator | Creates `PromiseToPay` in `PROPOSED` status. |
| `confirmPromiseToPay` | `{ promiseId: string }` | Operator | Transitions `PromiseToPay` to `APPROVED` status. |
| `reconcilePayment` | `{ paymentId: string, status: "SETTLED" \| "FAILED" }` | System, Simulation | Creates `AccountLedgerEntry` (credit), updates balance. |
| `scheduleCallback` | `{ accountId: string, scheduledAt: string }` | Operator | Creates scheduled callback task in work queue. |
| `updateContactPreference` | `{ accountId: string, channel: ChannelType }` | Operator | Updates `ContactPreference.preferredChannel`. |
| `createDispute` | `{ accountId: string, category: string, description: string }` | Operator | Creates `Case` (category: `DISPUTE`), pauses collection. |
| `createHardshipCase` | `{ accountId: string, details: string }` | Operator | Creates `Case` (category: `HARDSHIP`), applies hold. |
| `createHumanHandoff` | `{ accountId: string, reason: string, priority: Priority }` | AI, Operator | Creates escalation `Case`, assigns to supervisor queue. |
| `recordInteraction` | `{ accountId: string, channel: ChannelType, body: string }` | System, Operator | Appends `Message` to conversation timeline; writes audit log. |

---

## 7. State Machines & Lifecycles

### 7.1 Promise-to-Pay (PTP) State Machine

```mermaid
stateDiagram-v2
    [*] --> PROPOSED : Borrower offers commitment via text
    PROPOSED --> PENDING_CONFIRMATION : Copilot extracts amount & date
    PENDING_CONFIRMATION --> APPROVED : Operator reviews and approves
    PROPOSED --> APPROVED : Operator creates directly
    APPROVED --> DUE : Due date reached
    DUE --> KEPT : Reconciled payment matches amount
    APPROVED --> KEPT : Early payment reconciled
    DUE --> BROKEN : Due date + grace period expires with no payment
    PROPOSED --> CANCELLED : Borrower cancels or operator rejects
    APPROVED --> CANCELLED : Renegotiated into new PTP
    KEPT --> [*]
    BROKEN --> [*]
    CANCELLED --> [*]
```

### 7.2 Simulated Payment Lifecycle & Reconciliation

```mermaid
sequenceDiagram
    autonumber
    actor Collector
    participant Workspace as Conversation Workspace
    participant Tools as Tool Registry
    participant Policy as Policy Engine
    participant DB as PostgreSQL (Prisma)
    participant Sim as Payment Simulator

    Collector->>Workspace: Approve $200 Payment Link
    Workspace->>Policy: Evaluate createPaymentLink(acc_001, 200)
    Policy-->>Workspace: Decision: ALLOWED
    Workspace->>Tools: execute(createPaymentLink)
    Tools->>DB: INSERT PaymentLink (status: ACTIVE)
    Tools->>DB: INSERT AuditEvent
    Tools-->>Workspace: Return Link: https://pay.financeops.demo/l/x891

    Note over Workspace,Sim: Borrower interacts with simulated link
    Collector->>Workspace: Click "Simulate Payment Settlement"
    Workspace->>Sim: triggerPaymentSuccess(linkId, $200)
    Sim->>Tools: reconcilePayment(paymentId, SETTLED)
    Tools->>DB: BEGIN TRANSACTION
    Tools->>DB: UPDATE Payment (status: SETTLED)
    Tools->>DB: INSERT AccountLedgerEntry (-$200.00, PAYMENT_CREDIT)
    Tools->>DB: UPDATE Account (currentBalance = balance - 200)
    Tools->>DB: UPDATE PromiseToPay (status: KEPT)
    Tools->>DB: INSERT AuditEvent (PAYMENT_RECONCILED)
    Tools->>DB: COMMIT TRANSACTION
    Tools-->>Workspace: Refresh UI (New balance: $1,250.00)
```

---

## 8. API Route Handler Contracts

All API endpoints reside under `app/api/` and operate within the standard Node.js server environment:

### 1. `GET /api/queue`
- **Query Params**: `priority`, `reason`, `status`, `page`, `limit`
- **Response**:
```json
{
  "items": [
    {
      "id": "q_001",
      "accountId": "acc_001",
      "accountNumber": "ACC-8001",
      "borrowerName": "Sarah Jenkins",
      "currentBalance": 1450.00,
      "amountOverdue": 350.00,
      "daysPastDue": 42,
      "priority": "URGENT",
      "reason": "MISSED_PROMISE",
      "description": "Promise of $150.00 missed on 2026-11-12",
      "recommendedAction": "Follow up regarding missed commitment",
      "lastInteraction": "2026-11-12T14:20:00Z"
    }
  ],
  "total": 8
}
```

### 2. `POST /api/ai/copilot`
- **Body**: `{ accountId: string, inboundMessage: string }`
- **Response**: Full `CopilotAnalysisOutput` object containing intent, entities, summary, proposed action, policy verdict, and editable draft reply.

### 3. `POST /api/actions/execute`
- **Body**:
```json
{
  "accountId": "acc_001",
  "action": "proposePromiseToPay",
  "inputs": { "amount": 200.00, "dueDate": "2026-11-18" },
  "editedDraftReply": "Hi Sarah, I have confirmed your promise to pay $200 by Nov 18.",
  "idempotencyKey": "idem_ptp_acc001_20261118",
  "expectedAccountUpdatedAt": "2026-11-15T10:30:00.000Z"
}
```
- **Response**: `{ success: true, toolResult: {...}, auditEventId: "aud_901" }`

### 4. `POST /api/simulations/inbound`
- **Body**: `{ "accountId": "acc_001", "channel": "SMS", "body": "STOP", "sentAt": "2026-11-15T14:30:00.000Z" }`
- **Behavior**: Persists inbound message to database, executes synchronous fast-path policy check (immediate opt-out or dispute hold if triggered), and optionally invokes Copilot analysis if communication is active.
- **Response**: `{ "messageId": "msg_009", "status": "OPTED_OUT", "actionTaken": "OUTBOUND_LOCKED" }`

### 5. `POST /api/simulations/payment`
- **Body**: `{ "accountId": "acc_001", "paymentLinkId": "plink_001", "promiseToPayId": "ptp_001", "amount": 200.00, "status": "SETTLED" }`
- **Behavior**: Atomically updates `Payment` record, inserts credit `AccountLedgerEntry`, decrements `Account.currentBalance` and `Account.amountOverdue`, transitions `PromiseToPay` to `KEPT`, and updates `Account.status` to `CURRENT` or `PAID_IN_FULL` if overdue reaches zero.
- **Response**: `{ "paymentId": "pay_102", "status": "SETTLED", "newBalance": 1250.00, "newAmountOverdue": 150.00, "ptpStatus": "KEPT" }`

---

## 9. Security, Privacy & Tenant Isolation

1. **Server-Side API Key Protection**: The `GOOGLE_GENERATIVE_AI_API_KEY` is loaded exclusively into server-side Node.js processes. Next.js environment configuration strictly blocks public client exposure.
2. **Strict Tenant & Account Isolation**: Every database query executes with `where: { tenantId }`. Service methods verify borrower-to-account relations before executing mutations.
3. **Double-Spend & Idempotency Protection**: Mutating endpoints enforce unique idempotency keys stored in the database, preventing accidental double-clicking of payment links or promise proposals.
4. **Append-Only Audit Trail**: Application logic provides no `UPDATE` or `DELETE` capabilities on `AuditEvent` records, ensuring full forensic traceability.
5. **Synthetic Data Guarantee**: All seeded data uses fictional names, RFC 2606 reserved domains (`@example.com`), and 555 telephony ranges. Real customer PII is never submitted to the Gemini API.

---

## 10. Deployment Architecture & Environment Configuration

### 10.1 Deployment Target
- **Local Development**: Native Node.js 20+ with local PostgreSQL.
- **Production Self-Hosting**: Docker containerized Node.js application deployed to a VPS or Vercel with managed PostgreSQL (e.g., Supabase / Neon / AWS RDS).

### 10.2 Environment Configuration (`.env.example`)

```env
# Database Connection (Standard PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/financeops_db?schema=public"

# Google Gemini API Configuration (Official AI SDK)
GOOGLE_GENERATIVE_AI_API_KEY="AIzaSy..."
GEMINI_MODEL="gemini-2.0-flash"

# Application Settings
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
DEFAULT_TENANT_CODE="FINOPS_DEMO"
```
