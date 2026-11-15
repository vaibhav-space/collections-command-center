import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Collections Command Center database...');

  // 1. Create or Find Tenant
  const tenant = await prisma.tenant.upsert({
    where: { code: 'FINOPS_DEMO' },
    update: {},
    create: {
      name: 'FinanceOps Demo Lending Corp',
      code: 'FINOPS_DEMO',
    },
  });

  // 2. Clean existing records for this tenant to allow clean re-seeding
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

  // 3. Create Default Operators
  const operator1 = await prisma.operator.create({
    data: {
      tenantId: tenant.id,
      email: 'alex.collector@financeops.demo',
      name: 'Alex Rivera',
      role: 'COLLECTOR',
    },
  });

  const supervisor = await prisma.operator.create({
    data: {
      tenantId: tenant.id,
      email: 'claire.supervisor@financeops.demo',
      name: 'Claire Vance',
      role: 'SUPERVISOR',
    },
  });

  // 4. Create Active Policy Version
  const policyVersion = await prisma.policyVersion.create({
    data: {
      tenantId: tenant.id,
      versionString: 'v2026.11-us-standard',
      rulesConfig: {
        quietHoursStart: 8,
        quietHoursEnd: 21,
        optOutKeywords: ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'QUIT', 'END'],
        disputeKeywords: ['dispute', 'wrong amount', 'already paid', 'not mine', 'fraud', 'identity theft', 'attorney'],
        maxPromiseDays: 90,
      },
      isActive: true,
    },
  });

  // 5. Seed 10 Realistic Borrower & Account Scenarios
  const now = new Date('2026-11-15T10:00:00Z');

  // Scenario 1: Routine Balance Inquiry
  const b1 = await prisma.borrower.create({
    data: {
      tenantId: tenant.id,
      borrowerCode: 'BOR-1001',
      firstName: 'Sarah',
      lastName: 'Jenkins',
      primaryPhone: '+15552345678',
      primaryEmail: 'sarah.jenkins@example.com',
      timezone: 'America/New_York',
      isOptedOut: false,
      preferences: {
        create: {
          preferredChannel: 'EMAIL',
          allowSms: true,
          allowEmail: true,
          allowCalls: true,
        },
      },
      contactMethods: {
        createMany: {
          data: [
            { channel: 'EMAIL', addressValue: 'sarah.jenkins@example.com' },
            { channel: 'SMS', addressValue: '+15552345678' },
          ],
        },
      },
    },
  });

  const a1 = await prisma.account.create({
    data: {
      tenantId: tenant.id,
      borrowerId: b1.id,
      accountNumber: 'ACC-8001',
      status: 'DELINQUENT',
      currentBalance: new Prisma.Decimal(1450.0),
      principalOwed: new Prisma.Decimal(1300.0),
      interestOwed: new Prisma.Decimal(100.0),
      feesOwed: new Prisma.Decimal(50.0),
      amountOverdue: new Prisma.Decimal(350.0),
      daysPastDue: 42,
      delinquentSince: new Date('2026-10-04T00:00:00Z'),
      lastPaymentDate: new Date('2026-09-15T00:00:00Z'),
      lastContactDate: new Date('2026-11-10T14:30:00Z'),
      ledgerEntries: {
        createMany: {
          data: [
            {
              entryType: 'PRINCIPAL_CHARGE',
              amount: new Prisma.Decimal(1500.0),
              balanceAfter: new Prisma.Decimal(1500.0),
              description: 'Initial loan disbursement',
              createdAt: new Date('2026-06-01T12:00:00Z'),
            },
            {
              entryType: 'PAYMENT_CREDIT',
              amount: new Prisma.Decimal(-100.0),
              balanceAfter: new Prisma.Decimal(1400.0),
              description: 'ACH Payment - Ref #ACH-9012',
              createdAt: new Date('2026-09-15T15:00:00Z'),
            },
            {
              entryType: 'LATE_FEE',
              amount: new Prisma.Decimal(50.0),
              balanceAfter: new Prisma.Decimal(1450.0),
              description: 'Late payment fee assessed',
              createdAt: new Date('2026-10-15T00:00:00Z'),
            },
          ],
        },
      },
    },
  });

  const conv1 = await prisma.conversation.create({
    data: {
      accountId: a1.id,
      channel: 'SMS',
      status: 'ACTIVE',
      messages: {
        createMany: {
          data: [
            {
              senderType: 'SYSTEM',
              channel: 'SMS',
              body: 'FinanceOps Servicing: Friendly reminder that your scheduled payment of $350.00 was due on Nov 4.',
              sentAt: new Date('2026-11-06T14:00:00Z'),
            },
            {
              senderType: 'BORROWER',
              channel: 'SMS',
              body: 'Hi, I received a text. Can you confirm my current balance?',
              sentAt: new Date('2026-11-15T09:45:00Z'),
            },
          ],
        },
      },
    },
  });

  // Scenario 2: Payment Pending Reconciliation
  const b2 = await prisma.borrower.create({
    data: {
      tenantId: tenant.id,
      borrowerCode: 'BOR-1002',
      firstName: 'James',
      lastName: 'Wilson',
      primaryPhone: '+15553456789',
      primaryEmail: 'james.wilson@example.com',
      timezone: 'America/Chicago',
      preferences: { create: { preferredChannel: 'SMS' } },
    },
  });

  const a2 = await prisma.account.create({
    data: {
      tenantId: tenant.id,
      borrowerId: b2.id,
      accountNumber: 'ACC-8002',
      status: 'DELINQUENT',
      currentBalance: new Prisma.Decimal(320.0),
      principalOwed: new Prisma.Decimal(300.0),
      interestOwed: new Prisma.Decimal(20.0),
      feesOwed: new Prisma.Decimal(0.0),
      amountOverdue: new Prisma.Decimal(320.0),
      daysPastDue: 18,
    },
  });

  const plink2 = await prisma.paymentLink.create({
    data: {
      accountId: a2.id,
      url: 'https://pay.financeops.demo/l/x7812',
      amount: new Prisma.Decimal(100.0),
      status: 'CLICKED',
      expiresAt: new Date('2026-11-20T00:00:00Z'),
      idempotencyKey: 'idem_link_acc8002_1',
    },
  });

  await prisma.payment.create({
    data: {
      accountId: a2.id,
      paymentLinkId: plink2.id,
      amount: new Prisma.Decimal(100.0),
      status: 'PENDING',
      providerRef: 'SIM_PAY_9021',
      paymentMethod: 'DEBIT_CARD',
    },
  });

  // Scenario 3: Missed Payment Promise (Overdue - P1 Urgent Queue)
  const b3 = await prisma.borrower.create({
    data: {
      tenantId: tenant.id,
      borrowerCode: 'BOR-1003',
      firstName: 'Maria',
      lastName: 'Garcia',
      primaryPhone: '+15554567890',
      primaryEmail: 'maria.garcia@example.com',
      timezone: 'America/Los_Angeles',
      preferences: { create: { preferredChannel: 'SMS' } },
    },
  });

  const a3 = await prisma.account.create({
    data: {
      tenantId: tenant.id,
      borrowerId: b3.id,
      accountNumber: 'ACC-8003',
      status: 'DELINQUENT',
      currentBalance: new Prisma.Decimal(850.0),
      principalOwed: new Prisma.Decimal(800.0),
      interestOwed: new Prisma.Decimal(50.0),
      feesOwed: new Prisma.Decimal(0.0),
      amountOverdue: new Prisma.Decimal(250.0),
      daysPastDue: 35,
    },
  });

  await prisma.promiseToPay.create({
    data: {
      accountId: a3.id,
      amount: new Prisma.Decimal(150.0),
      dueDate: new Date('2026-11-12T00:00:00Z'), // Past due date!
      status: 'BROKEN',
      brokenAt: new Date('2026-11-13T00:00:00Z'),
      proposedBy: 'BORROWER',
      approvedBy: operator1.id,
      idempotencyKey: 'idem_ptp_acc8003_1',
      notes: 'Borrower promised $150 by Nov 12 but payment did not settle.',
    },
  });

  // Scenario 4: Promise Due Today
  const b4 = await prisma.borrower.create({
    data: {
      tenantId: tenant.id,
      borrowerCode: 'BOR-1004',
      firstName: 'Robert',
      lastName: 'Taylor',
      primaryPhone: '+15555678901',
      primaryEmail: 'robert.taylor@example.com',
      timezone: 'America/Denver',
      preferences: { create: { preferredChannel: 'EMAIL' } },
    },
  });

  const a4 = await prisma.account.create({
    data: {
      tenantId: tenant.id,
      borrowerId: b4.id,
      accountNumber: 'ACC-8004',
      status: 'DELINQUENT',
      currentBalance: new Prisma.Decimal(600.0),
      principalOwed: new Prisma.Decimal(550.0),
      interestOwed: new Prisma.Decimal(50.0),
      feesOwed: new Prisma.Decimal(0.0),
      amountOverdue: new Prisma.Decimal(200.0),
      daysPastDue: 14,
    },
  });

  await prisma.promiseToPay.create({
    data: {
      accountId: a4.id,
      amount: new Prisma.Decimal(200.0),
      dueDate: new Date('2026-11-15T23:59:59Z'), // Today!
      status: 'APPROVED',
      proposedBy: 'BORROWER',
      approvedBy: operator1.id,
      idempotencyKey: 'idem_ptp_acc8004_1',
      notes: 'Borrower agreed to pay $200 by Nov 15.',
    },
  });

  // Scenario 5: Active Billing Dispute Case
  const b5 = await prisma.borrower.create({
    data: {
      tenantId: tenant.id,
      borrowerCode: 'BOR-1005',
      firstName: 'David',
      lastName: 'Kim',
      primaryPhone: '+15556789012',
      primaryEmail: 'david.kim@example.com',
      timezone: 'America/New_York',
      preferences: { create: { preferredChannel: 'SMS' } },
    },
  });

  const a5 = await prisma.account.create({
    data: {
      tenantId: tenant.id,
      borrowerId: b5.id,
      accountNumber: 'ACC-8005',
      status: 'IN_DISPUTE',
      hasActiveDispute: true,
      currentBalance: new Prisma.Decimal(1200.0),
      principalOwed: new Prisma.Decimal(1100.0),
      interestOwed: new Prisma.Decimal(100.0),
      feesOwed: new Prisma.Decimal(0.0),
      amountOverdue: new Prisma.Decimal(400.0),
      daysPastDue: 60,
    },
  });

  await prisma.case.create({
    data: {
      accountId: a5.id,
      assignedToId: supervisor.id,
      category: 'DISPUTE',
      priority: 'URGENT',
      status: 'UNDER_REVIEW',
      title: 'Disputed balance - Double billing claim',
      description: 'Borrower states October payment of $400 was debited twice from checking account.',
    },
  });

  // Scenario 6: Unemployment Hardship
  const b6 = await prisma.borrower.create({
    data: {
      tenantId: tenant.id,
      borrowerCode: 'BOR-1006',
      firstName: 'Emily',
      lastName: 'Davis',
      primaryPhone: '+15557890123',
      primaryEmail: 'emily.davis@example.com',
      timezone: 'America/Chicago',
      preferences: { create: { preferredChannel: 'EMAIL' } },
    },
  });

  const a6 = await prisma.account.create({
    data: {
      tenantId: tenant.id,
      borrowerId: b6.id,
      accountNumber: 'ACC-8006',
      status: 'HARDSHIP_PAUSED',
      hasActiveHardship: true,
      currentBalance: new Prisma.Decimal(2100.0),
      principalOwed: new Prisma.Decimal(2000.0),
      interestOwed: new Prisma.Decimal(100.0),
      feesOwed: new Prisma.Decimal(0.0),
      amountOverdue: new Prisma.Decimal(650.0),
      daysPastDue: 75,
    },
  });

  await prisma.case.create({
    data: {
      accountId: a6.id,
      assignedToId: supervisor.id,
      category: 'HARDSHIP',
      priority: 'HIGH',
      status: 'ACTION_PENDING',
      title: 'Involuntary Job Loss - 60-day Moratorium Request',
      description: 'Borrower submitted layoff notice; requesting temporary forbearance.',
    },
  });

  // Scenario 7: Channel Preference Update (Prefers Email)
  const b7 = await prisma.borrower.create({
    data: {
      tenantId: tenant.id,
      borrowerCode: 'BOR-1007',
      firstName: 'Michael',
      lastName: 'Brown',
      primaryPhone: '+15558901234',
      primaryEmail: 'michael.brown@example.com',
      timezone: 'America/New_York',
      preferences: {
        create: {
          preferredChannel: 'EMAIL',
          allowSms: false,
          allowEmail: true,
        },
      },
    },
  });

  await prisma.account.create({
    data: {
      tenantId: tenant.id,
      borrowerId: b7.id,
      accountNumber: 'ACC-8007',
      status: 'DELINQUENT',
      currentBalance: new Prisma.Decimal(450.0),
      principalOwed: new Prisma.Decimal(400.0),
      interestOwed: new Prisma.Decimal(50.0),
      feesOwed: new Prisma.Decimal(0.0),
      amountOverdue: new Prisma.Decimal(150.0),
      daysPastDue: 15,
    },
  });

  // Scenario 8: Human Supervisor Escalation
  const b8 = await prisma.borrower.create({
    data: {
      tenantId: tenant.id,
      borrowerCode: 'BOR-1008',
      firstName: 'Lisa',
      lastName: 'Anderson',
      primaryPhone: '+15559012345',
      primaryEmail: 'lisa.anderson@example.com',
      timezone: 'America/Los_Angeles',
      preferences: { create: { preferredChannel: 'PHONE_CALL' } },
    },
  });

  const a8 = await prisma.account.create({
    data: {
      tenantId: tenant.id,
      borrowerId: b8.id,
      accountNumber: 'ACC-8008',
      status: 'DELINQUENT',
      currentBalance: new Prisma.Decimal(950.0),
      principalOwed: new Prisma.Decimal(900.0),
      interestOwed: new Prisma.Decimal(50.0),
      feesOwed: new Prisma.Decimal(0.0),
      amountOverdue: new Prisma.Decimal(300.0),
      daysPastDue: 28,
    },
  });

  await prisma.case.create({
    data: {
      accountId: a8.id,
      assignedToId: supervisor.id,
      category: 'AI_UNCERTAINTY',
      priority: 'MEDIUM',
      status: 'OPEN',
      title: 'Borrower requested phone call from supervisor',
      description: 'Borrower expressed confusion over loan terms and requested a manager callback.',
    },
  });

  // Scenario 9: STOP Opted-Out Borrower (Locked Outbound)
  const b9 = await prisma.borrower.create({
    data: {
      tenantId: tenant.id,
      borrowerCode: 'BOR-1009',
      firstName: 'Thomas',
      lastName: 'White',
      primaryPhone: '+15550123456',
      primaryEmail: 'thomas.white@example.com',
      timezone: 'America/New_York',
      isOptedOut: true,
      optedOutAt: new Date('2026-11-14T18:00:00Z'),
      preferences: {
        create: {
          preferredChannel: 'EMAIL',
          allowSms: false,
          allowEmail: false,
          allowCalls: false,
        },
      },
    },
  });

  await prisma.account.create({
    data: {
      tenantId: tenant.id,
      borrowerId: b9.id,
      accountNumber: 'ACC-8009',
      status: 'DELINQUENT',
      currentBalance: new Prisma.Decimal(1100.0),
      principalOwed: new Prisma.Decimal(1000.0),
      interestOwed: new Prisma.Decimal(100.0),
      feesOwed: new Prisma.Decimal(0.0),
      amountOverdue: new Prisma.Decimal(350.0),
      daysPastDue: 50,
    },
  });

  // Scenario 10: Active Payment Link Awaiting Settlement
  const b10 = await prisma.borrower.create({
    data: {
      tenantId: tenant.id,
      borrowerCode: 'BOR-1010',
      firstName: 'Jennifer',
      lastName: 'Martin',
      primaryPhone: '+15551234567',
      primaryEmail: 'jennifer.martin@example.com',
      timezone: 'America/Chicago',
      preferences: { create: { preferredChannel: 'SMS' } },
    },
  });

  const a10 = await prisma.account.create({
    data: {
      tenantId: tenant.id,
      borrowerId: b10.id,
      accountNumber: 'ACC-8010',
      status: 'DELINQUENT',
      currentBalance: new Prisma.Decimal(500.0),
      principalOwed: new Prisma.Decimal(450.0),
      interestOwed: new Prisma.Decimal(50.0),
      feesOwed: new Prisma.Decimal(0.0),
      amountOverdue: new Prisma.Decimal(200.0),
      daysPastDue: 22,
    },
  });

  await prisma.paymentLink.create({
    data: {
      accountId: a10.id,
      url: 'https://pay.financeops.demo/l/x9941',
      amount: new Prisma.Decimal(200.0),
      status: 'ACTIVE',
      expiresAt: new Date('2026-11-22T00:00:00Z'),
      idempotencyKey: 'idem_link_acc8010_1',
    },
  });

  // Record initial Audit Events
  await prisma.auditEvent.createMany({
    data: [
      {
        tenantId: tenant.id,
        actorType: 'SYSTEM',
        action: 'PORTFOLIO_ONBOARDED',
        entityType: 'Portfolio',
        entityId: tenant.id,
        newState: { accountsManaged: 10, totalDebt: '9520.00', currency: 'USD' },
        createdAt: new Date('2026-11-15T08:00:00Z'),
      },
      {
        tenantId: tenant.id,
        actorType: 'SYSTEM',
        action: 'TCPA_HOURS_VERIFIED',
        entityType: 'PolicyEngine',
        entityId: policyVersion.id,
        newState: { rulesChecked: ['POL-001', 'POL-002'], defaultWindow: '08:00-21:00' },
        createdAt: new Date('2026-11-15T08:15:00Z'),
      },
      {
        tenantId: tenant.id,
        actorType: 'OPERATOR',
        operatorId: supervisor.id,
        action: 'DISPUTE_CASE_OPENED',
        entityType: 'Account',
        entityId: a5.id,
        accountId: a5.id,
        newState: { caseType: 'DISPUTE', outreachLock: true, reason: 'Double billing claim' },
        createdAt: new Date('2026-11-15T09:30:00Z'),
      },
      {
        tenantId: tenant.id,
        actorType: 'OPERATOR',
        operatorId: operator1.id,
        action: 'PAYMENT_LINK_GENERATED',
        entityType: 'Account',
        entityId: a10.id,
        accountId: a10.id,
        newState: { amount: 200.0, channel: 'SMS', expiresAt: '2026-11-22' },
        createdAt: new Date('2026-11-15T09:45:00Z'),
      },
    ],
  });

  console.log('Database seeding successfully completed with 10 synthetic accounts.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
