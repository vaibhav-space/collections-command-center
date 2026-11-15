"use strict";

// prisma/seed.ts
var import_client = require("@prisma/client");
var prisma = new import_client.PrismaClient();
async function main() {
  console.log("Seeding Collections Command Center database...");
  const tenant = await prisma.tenant.upsert({
    where: { code: "FINOPS_DEMO" },
    update: {},
    create: {
      name: "FinanceOps Demo Lending Corp",
      code: "FINOPS_DEMO"
    }
  });
  await prisma.auditEvent.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.toolExecutionLog.deleteMany({});
  await prisma.policyDecisionLog.deleteMany({});
  await prisma.case.deleteMany({ where: { account: { tenantId: tenant.id } } });
  await prisma.payment.deleteMany({ where: { account: { tenantId: tenant.id } } });
  await prisma.paymentLink.deleteMany({ where: { account: { tenantId: tenant.id } } });
  await prisma.promiseToPay.deleteMany({ where: { account: { tenantId: tenant.id } } });
  await prisma.message.deleteMany({});
  await prisma.conversation.deleteMany({ where: { account: { tenantId: tenant.id } } });
  await prisma.accountLedgerEntry.deleteMany({ where: { account: { tenantId: tenant.id } } });
  await prisma.account.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.contactMethod.deleteMany({});
  await prisma.contactPreference.deleteMany({});
  await prisma.borrower.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.operator.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.policyVersion.deleteMany({ where: { tenantId: tenant.id } });
  const operator1 = await prisma.operator.create({
    data: {
      tenantId: tenant.id,
      email: "alex.collector@financeops.demo",
      name: "Alex Rivera",
      role: "COLLECTOR"
    }
  });
  const supervisor = await prisma.operator.create({
    data: {
      tenantId: tenant.id,
      email: "claire.supervisor@financeops.demo",
      name: "Claire Vance",
      role: "SUPERVISOR"
    }
  });
  const policyVersion = await prisma.policyVersion.create({
    data: {
      tenantId: tenant.id,
      versionString: "v2026.11-us-standard",
      rulesConfig: {
        quietHoursStart: 8,
        quietHoursEnd: 21,
        optOutKeywords: ["STOP", "UNSUBSCRIBE", "CANCEL", "QUIT", "END"],
        disputeKeywords: ["dispute", "wrong amount", "already paid", "not mine", "fraud", "identity theft", "attorney"],
        maxPromiseDays: 90
      },
      isActive: true
    }
  });
  const now = /* @__PURE__ */ new Date("2026-11-15T10:00:00Z");
  const b1 = await prisma.borrower.create({
    data: {
      tenantId: tenant.id,
      borrowerCode: "BOR-1001",
      firstName: "Sarah",
      lastName: "Jenkins",
      primaryPhone: "+15552345678",
      primaryEmail: "sarah.jenkins@example.com",
      timezone: "America/New_York",
      isOptedOut: false,
      preferences: {
        create: {
          preferredChannel: "EMAIL",
          allowSms: true,
          allowEmail: true,
          allowCalls: true
        }
      },
      contactMethods: {
        createMany: {
          data: [
            { channel: "EMAIL", addressValue: "sarah.jenkins@example.com" },
            { channel: "SMS", addressValue: "+15552345678" }
          ]
        }
      }
    }
  });
  const a1 = await prisma.account.create({
    data: {
      tenantId: tenant.id,
      borrowerId: b1.id,
      accountNumber: "ACC-8001",
      status: "DELINQUENT",
      currentBalance: new import_client.Prisma.Decimal(1450),
      principalOwed: new import_client.Prisma.Decimal(1300),
      interestOwed: new import_client.Prisma.Decimal(100),
      feesOwed: new import_client.Prisma.Decimal(50),
      amountOverdue: new import_client.Prisma.Decimal(350),
      daysPastDue: 42,
      delinquentSince: /* @__PURE__ */ new Date("2026-10-04T00:00:00Z"),
      lastPaymentDate: /* @__PURE__ */ new Date("2026-09-15T00:00:00Z"),
      lastContactDate: /* @__PURE__ */ new Date("2026-11-10T14:30:00Z"),
      ledgerEntries: {
        createMany: {
          data: [
            {
              entryType: "PRINCIPAL_CHARGE",
              amount: new import_client.Prisma.Decimal(1500),
              balanceAfter: new import_client.Prisma.Decimal(1500),
              description: "Initial loan disbursement",
              createdAt: /* @__PURE__ */ new Date("2026-06-01T12:00:00Z")
            },
            {
              entryType: "PAYMENT_CREDIT",
              amount: new import_client.Prisma.Decimal(-100),
              balanceAfter: new import_client.Prisma.Decimal(1400),
              description: "ACH Payment - Ref #ACH-9012",
              createdAt: /* @__PURE__ */ new Date("2026-09-15T15:00:00Z")
            },
            {
              entryType: "LATE_FEE",
              amount: new import_client.Prisma.Decimal(50),
              balanceAfter: new import_client.Prisma.Decimal(1450),
              description: "Late payment fee assessed",
              createdAt: /* @__PURE__ */ new Date("2026-10-15T00:00:00Z")
            }
          ]
        }
      }
    }
  });
  const conv1 = await prisma.conversation.create({
    data: {
      accountId: a1.id,
      channel: "SMS",
      status: "ACTIVE",
      messages: {
        createMany: {
          data: [
            {
              senderType: "SYSTEM",
              channel: "SMS",
              body: "FinanceOps Servicing: Friendly reminder that your scheduled payment of $350.00 was due on Nov 4.",
              sentAt: /* @__PURE__ */ new Date("2026-11-06T14:00:00Z")
            },
            {
              senderType: "BORROWER",
              channel: "SMS",
              body: "Hi, I received a text. Can you confirm my current balance?",
              sentAt: /* @__PURE__ */ new Date("2026-11-15T09:45:00Z")
            }
          ]
        }
      }
    }
  });
  const b2 = await prisma.borrower.create({
    data: {
      tenantId: tenant.id,
      borrowerCode: "BOR-1002",
      firstName: "James",
      lastName: "Wilson",
      primaryPhone: "+15553456789",
      primaryEmail: "james.wilson@example.com",
      timezone: "America/Chicago",
      preferences: { create: { preferredChannel: "SMS" } }
    }
  });
  const a2 = await prisma.account.create({
    data: {
      tenantId: tenant.id,
      borrowerId: b2.id,
      accountNumber: "ACC-8002",
      status: "DELINQUENT",
      currentBalance: new import_client.Prisma.Decimal(320),
      principalOwed: new import_client.Prisma.Decimal(300),
      interestOwed: new import_client.Prisma.Decimal(20),
      feesOwed: new import_client.Prisma.Decimal(0),
      amountOverdue: new import_client.Prisma.Decimal(320),
      daysPastDue: 18
    }
  });
  const plink2 = await prisma.paymentLink.create({
    data: {
      accountId: a2.id,
      url: "https://pay.financeops.demo/l/x7812",
      amount: new import_client.Prisma.Decimal(100),
      status: "CLICKED",
      expiresAt: /* @__PURE__ */ new Date("2026-11-20T00:00:00Z"),
      idempotencyKey: "idem_link_acc8002_1"
    }
  });
  await prisma.payment.create({
    data: {
      accountId: a2.id,
      paymentLinkId: plink2.id,
      amount: new import_client.Prisma.Decimal(100),
      status: "PENDING",
      providerRef: "SIM_PAY_9021",
      paymentMethod: "DEBIT_CARD"
    }
  });
  const b3 = await prisma.borrower.create({
    data: {
      tenantId: tenant.id,
      borrowerCode: "BOR-1003",
      firstName: "Maria",
      lastName: "Garcia",
      primaryPhone: "+15554567890",
      primaryEmail: "maria.garcia@example.com",
      timezone: "America/Los_Angeles",
      preferences: { create: { preferredChannel: "SMS" } }
    }
  });
  const a3 = await prisma.account.create({
    data: {
      tenantId: tenant.id,
      borrowerId: b3.id,
      accountNumber: "ACC-8003",
      status: "DELINQUENT",
      currentBalance: new import_client.Prisma.Decimal(850),
      principalOwed: new import_client.Prisma.Decimal(800),
      interestOwed: new import_client.Prisma.Decimal(50),
      feesOwed: new import_client.Prisma.Decimal(0),
      amountOverdue: new import_client.Prisma.Decimal(250),
      daysPastDue: 35
    }
  });
  await prisma.promiseToPay.create({
    data: {
      accountId: a3.id,
      amount: new import_client.Prisma.Decimal(150),
      dueDate: /* @__PURE__ */ new Date("2026-11-12T00:00:00Z"),
      // Past due date!
      status: "BROKEN",
      brokenAt: /* @__PURE__ */ new Date("2026-11-13T00:00:00Z"),
      proposedBy: "BORROWER",
      approvedBy: operator1.id,
      idempotencyKey: "idem_ptp_acc8003_1",
      notes: "Borrower promised $150 by Nov 12 but payment did not settle."
    }
  });
  const b4 = await prisma.borrower.create({
    data: {
      tenantId: tenant.id,
      borrowerCode: "BOR-1004",
      firstName: "Robert",
      lastName: "Taylor",
      primaryPhone: "+15555678901",
      primaryEmail: "robert.taylor@example.com",
      timezone: "America/Denver",
      preferences: { create: { preferredChannel: "EMAIL" } }
    }
  });
  const a4 = await prisma.account.create({
    data: {
      tenantId: tenant.id,
      borrowerId: b4.id,
      accountNumber: "ACC-8004",
      status: "DELINQUENT",
      currentBalance: new import_client.Prisma.Decimal(600),
      principalOwed: new import_client.Prisma.Decimal(550),
      interestOwed: new import_client.Prisma.Decimal(50),
      feesOwed: new import_client.Prisma.Decimal(0),
      amountOverdue: new import_client.Prisma.Decimal(200),
      daysPastDue: 14
    }
  });
  await prisma.promiseToPay.create({
    data: {
      accountId: a4.id,
      amount: new import_client.Prisma.Decimal(200),
      dueDate: /* @__PURE__ */ new Date("2026-11-15T23:59:59Z"),
      // Today!
      status: "APPROVED",
      proposedBy: "BORROWER",
      approvedBy: operator1.id,
      idempotencyKey: "idem_ptp_acc8004_1",
      notes: "Borrower agreed to pay $200 by Nov 15."
    }
  });
  const b5 = await prisma.borrower.create({
    data: {
      tenantId: tenant.id,
      borrowerCode: "BOR-1005",
      firstName: "David",
      lastName: "Kim",
      primaryPhone: "+15556789012",
      primaryEmail: "david.kim@example.com",
      timezone: "America/New_York",
      preferences: { create: { preferredChannel: "SMS" } }
    }
  });
  const a5 = await prisma.account.create({
    data: {
      tenantId: tenant.id,
      borrowerId: b5.id,
      accountNumber: "ACC-8005",
      status: "IN_DISPUTE",
      hasActiveDispute: true,
      currentBalance: new import_client.Prisma.Decimal(1200),
      principalOwed: new import_client.Prisma.Decimal(1100),
      interestOwed: new import_client.Prisma.Decimal(100),
      feesOwed: new import_client.Prisma.Decimal(0),
      amountOverdue: new import_client.Prisma.Decimal(400),
      daysPastDue: 60
    }
  });
  await prisma.case.create({
    data: {
      accountId: a5.id,
      assignedToId: supervisor.id,
      category: "DISPUTE",
      priority: "URGENT",
      status: "UNDER_REVIEW",
      title: "Disputed balance - Double billing claim",
      description: "Borrower states October payment of $400 was debited twice from checking account."
    }
  });
  const b6 = await prisma.borrower.create({
    data: {
      tenantId: tenant.id,
      borrowerCode: "BOR-1006",
      firstName: "Emily",
      lastName: "Davis",
      primaryPhone: "+15557890123",
      primaryEmail: "emily.davis@example.com",
      timezone: "America/Chicago",
      preferences: { create: { preferredChannel: "EMAIL" } }
    }
  });
  const a6 = await prisma.account.create({
    data: {
      tenantId: tenant.id,
      borrowerId: b6.id,
      accountNumber: "ACC-8006",
      status: "HARDSHIP_PAUSED",
      hasActiveHardship: true,
      currentBalance: new import_client.Prisma.Decimal(2100),
      principalOwed: new import_client.Prisma.Decimal(2e3),
      interestOwed: new import_client.Prisma.Decimal(100),
      feesOwed: new import_client.Prisma.Decimal(0),
      amountOverdue: new import_client.Prisma.Decimal(650),
      daysPastDue: 75
    }
  });
  await prisma.case.create({
    data: {
      accountId: a6.id,
      assignedToId: supervisor.id,
      category: "HARDSHIP",
      priority: "HIGH",
      status: "ACTION_PENDING",
      title: "Involuntary Job Loss - 60-day Moratorium Request",
      description: "Borrower submitted layoff notice; requesting temporary forbearance."
    }
  });
  const b7 = await prisma.borrower.create({
    data: {
      tenantId: tenant.id,
      borrowerCode: "BOR-1007",
      firstName: "Michael",
      lastName: "Brown",
      primaryPhone: "+15558901234",
      primaryEmail: "michael.brown@example.com",
      timezone: "America/New_York",
      preferences: {
        create: {
          preferredChannel: "EMAIL",
          allowSms: false,
          allowEmail: true
        }
      }
    }
  });
  await prisma.account.create({
    data: {
      tenantId: tenant.id,
      borrowerId: b7.id,
      accountNumber: "ACC-8007",
      status: "DELINQUENT",
      currentBalance: new import_client.Prisma.Decimal(450),
      principalOwed: new import_client.Prisma.Decimal(400),
      interestOwed: new import_client.Prisma.Decimal(50),
      feesOwed: new import_client.Prisma.Decimal(0),
      amountOverdue: new import_client.Prisma.Decimal(150),
      daysPastDue: 15
    }
  });
  const b8 = await prisma.borrower.create({
    data: {
      tenantId: tenant.id,
      borrowerCode: "BOR-1008",
      firstName: "Lisa",
      lastName: "Anderson",
      primaryPhone: "+15559012345",
      primaryEmail: "lisa.anderson@example.com",
      timezone: "America/Los_Angeles",
      preferences: { create: { preferredChannel: "PHONE_CALL" } }
    }
  });
  const a8 = await prisma.account.create({
    data: {
      tenantId: tenant.id,
      borrowerId: b8.id,
      accountNumber: "ACC-8008",
      status: "DELINQUENT",
      currentBalance: new import_client.Prisma.Decimal(950),
      principalOwed: new import_client.Prisma.Decimal(900),
      interestOwed: new import_client.Prisma.Decimal(50),
      feesOwed: new import_client.Prisma.Decimal(0),
      amountOverdue: new import_client.Prisma.Decimal(300),
      daysPastDue: 28
    }
  });
  await prisma.case.create({
    data: {
      accountId: a8.id,
      assignedToId: supervisor.id,
      category: "AI_UNCERTAINTY",
      priority: "MEDIUM",
      status: "OPEN",
      title: "Borrower requested phone call from supervisor",
      description: "Borrower expressed confusion over loan terms and requested a manager callback."
    }
  });
  const b9 = await prisma.borrower.create({
    data: {
      tenantId: tenant.id,
      borrowerCode: "BOR-1009",
      firstName: "Thomas",
      lastName: "White",
      primaryPhone: "+15550123456",
      primaryEmail: "thomas.white@example.com",
      timezone: "America/New_York",
      isOptedOut: true,
      optedOutAt: /* @__PURE__ */ new Date("2026-11-14T18:00:00Z"),
      preferences: {
        create: {
          preferredChannel: "EMAIL",
          allowSms: false,
          allowEmail: false,
          allowCalls: false
        }
      }
    }
  });
  await prisma.account.create({
    data: {
      tenantId: tenant.id,
      borrowerId: b9.id,
      accountNumber: "ACC-8009",
      status: "DELINQUENT",
      currentBalance: new import_client.Prisma.Decimal(1100),
      principalOwed: new import_client.Prisma.Decimal(1e3),
      interestOwed: new import_client.Prisma.Decimal(100),
      feesOwed: new import_client.Prisma.Decimal(0),
      amountOverdue: new import_client.Prisma.Decimal(350),
      daysPastDue: 50
    }
  });
  const b10 = await prisma.borrower.create({
    data: {
      tenantId: tenant.id,
      borrowerCode: "BOR-1010",
      firstName: "Jennifer",
      lastName: "Martin",
      primaryPhone: "+15551234567",
      primaryEmail: "jennifer.martin@example.com",
      timezone: "America/Chicago",
      preferences: { create: { preferredChannel: "SMS" } }
    }
  });
  const a10 = await prisma.account.create({
    data: {
      tenantId: tenant.id,
      borrowerId: b10.id,
      accountNumber: "ACC-8010",
      status: "DELINQUENT",
      currentBalance: new import_client.Prisma.Decimal(500),
      principalOwed: new import_client.Prisma.Decimal(450),
      interestOwed: new import_client.Prisma.Decimal(50),
      feesOwed: new import_client.Prisma.Decimal(0),
      amountOverdue: new import_client.Prisma.Decimal(200),
      daysPastDue: 22
    }
  });
  await prisma.paymentLink.create({
    data: {
      accountId: a10.id,
      url: "https://pay.financeops.demo/l/x9941",
      amount: new import_client.Prisma.Decimal(200),
      status: "ACTIVE",
      expiresAt: /* @__PURE__ */ new Date("2026-11-22T00:00:00Z"),
      idempotencyKey: "idem_link_acc8010_1"
    }
  });
  await prisma.auditEvent.createMany({
    data: [
      {
        tenantId: tenant.id,
        actorType: "SYSTEM",
        action: "PORTFOLIO_ONBOARDED",
        entityType: "Portfolio",
        entityId: tenant.id,
        newState: { accountsManaged: 10, totalDebt: "9520.00", currency: "USD" },
        createdAt: /* @__PURE__ */ new Date("2026-11-15T08:00:00Z")
      },
      {
        tenantId: tenant.id,
        actorType: "SYSTEM",
        action: "TCPA_HOURS_VERIFIED",
        entityType: "PolicyEngine",
        entityId: policyVersion.id,
        newState: { rulesChecked: ["POL-001", "POL-002"], defaultWindow: "08:00-21:00" },
        createdAt: /* @__PURE__ */ new Date("2026-11-15T08:15:00Z")
      },
      {
        tenantId: tenant.id,
        actorType: "OPERATOR",
        operatorId: supervisor.id,
        action: "DISPUTE_CASE_OPENED",
        entityType: "Account",
        entityId: a5.id,
        accountId: a5.id,
        newState: { caseType: "DISPUTE", outreachLock: true, reason: "Double billing claim" },
        createdAt: /* @__PURE__ */ new Date("2026-11-15T09:30:00Z")
      },
      {
        tenantId: tenant.id,
        actorType: "OPERATOR",
        operatorId: operator1.id,
        action: "PAYMENT_LINK_GENERATED",
        entityType: "Account",
        entityId: a10.id,
        accountId: a10.id,
        newState: { amount: 200, channel: "SMS", expiresAt: "2026-11-22" },
        createdAt: /* @__PURE__ */ new Date("2026-11-15T09:45:00Z")
      }
    ]
  });
  console.log("Database seeding successfully completed with 10 synthetic accounts.");
}
main().catch((e) => {
  console.error("Seeding error:", e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
