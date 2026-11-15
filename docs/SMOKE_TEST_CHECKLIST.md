# Manual Smoke-Test Runbook & Demonstration Checklist
## FinanceOps Collections Command Center

---

### Prerequisites
1. PostgreSQL running locally on port 5432 with database `financeops_db`.
2. Node.js v20+ installed.
3. Database seeded: `npm run prisma:seed`.
4. Application running: `npm run dev` (opens at `http://localhost:3000`).

---

### Smoke-Test Steps

#### 1. Dashboard Overview (`/`)
- [ ] Open `http://localhost:3000`.
- [ ] Verify that **Delinquent Accounts** displays `10`.
- [ ] Verify that **Outstanding Balance** displays `$10,520.00`.
- [ ] Verify that **Broken Commitments** displays `1`.
- [ ] Verify that **Open Human Cases** displays `3`.
- [ ] Verify that all 4 aging brackets (1–30 DPD, 31–60 DPD, 61–90 DPD, 90+ DPD) render with accounts.
- [ ] Verify that the Audit Stream displays recent system events.

#### 2. Work Queue (`/queue`)
- [ ] Navigate to `/queue`.
- [ ] Verify accounts are ordered by priority:
  - Top rows show `URGENT` priority (e.g. Maria Garcia with missed promise, David Kim with dispute).
- [ ] Click the **Urgent** filter pill; confirm only Urgent items display.
- [ ] Click the **Workspace** button on Sarah Jenkins (`ACC-8001`).

#### 3. AI Conversation Workspace (`/workspace/ACC-8001`)
- [ ] Verify the 3-column desktop layout:
  - **Left**: Sarah Jenkins, Verified Balance `$1,450.00`, Overdue `$350.00` (42 DPD), Timezone `America/New_York`.
  - **Center**: Chronological timeline of SMS and system reminders.
  - **Right**: AI Copilot & Policy Gate panel on standby.

#### 4. Interactive Simulation & Gemini Copilot
- [ ] In the center column, click the preset button: `"I can pay $200 next Tuesday"`.
- [ ] Confirm the message appears in the center timeline.
- [ ] Observe the AI Copilot card in the right column:
  - **Detected Intent**: `PROMISE_TO_PAY`.
  - **Extracted Amount**: `$200.00`.
  - **Extracted Date**: Normalized ISO date.
  - **Policy Verdict**: `ALLOWED` (FDCPA & TCPA compliant).
  - **Proposed Tool**: `proposePromiseToPay()`.
  - **Draft Reply**: Pre-populated empathetic response.
- [ ] Edit the draft text in place (e.g., append *"Thank you, Sarah"*).
- [ ] Click **Approve Draft & Execute Tool**.
- [ ] Confirm:
  - Toast displays success.
  - Outbound message appends to the conversation timeline in indigo.
  - Database updates the promise to pay.

#### 5. Payment Settlement Simulation
- [ ] In Column 1 (Left), click **Simulate $200 Payment Settled**.
- [ ] Confirm:
  - Verified Balance decrements from `$1,450.00` to `$1,250.00`.
  - Overdue balance decrements from `$350.00` to `$150.00`.
  - Timeline displays payment confirmation system message.

#### 6. Statutory STOP Opt-Out Fast-Path
- [ ] In the center column, click the preset button: `"STOP"`.
- [ ] Confirm:
  - Inbound message appears.
  - Consent status badge immediately switches to `STOPPED / OPTED OUT` in red.
  - Toast confirms statutory opt-out executed and outbound messaging locked.
  - Copilot draft generation is suppressed.

#### 7. Dispute Escalation
- [ ] In the center column, click the preset button: `"Dispute charge"`.
- [ ] Confirm:
  - Account status immediately updates to `IN_DISPUTE`.
  - A formal Dispute Case is opened in the database.
  - Outbound debt collection demands are halted.

#### 8. Audit Trail Verification (`/audit`)
- [ ] Navigate to `/audit`.
- [ ] Verify the recent events appear at the top:
  - `STATUTORY_OPT_OUT_RECORDED`
  - `DISPUTE_DETECTED_FAST_PATH`
  - `LEDGER_TRANSACTION_RECORDED`
  - `PROMISE_TO_PAY_RECORDED`
