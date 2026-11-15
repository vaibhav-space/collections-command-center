import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ToolRegistry } from '@/tools/registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accountId, paymentLinkId, promiseToPayId, amount, status = 'SETTLED', providerRef } = body;

    if (!accountId || !amount) {
      return NextResponse.json(
        { error: 'accountId and amount are required' },
        { status: 400 }
      );
    }

    const toolRegistry = new ToolRegistry();
    const result = await toolRegistry.execute({
      toolName: 'reconcilePayment',
      inputs: {
        accountId,
        paymentLinkId,
        promiseToPayId,
        amount: parseFloat(amount),
        status,
        providerRef,
      },
      operatorId: 'system_simulation',
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    // Fetch updated account state
    const account = await prisma.account.findUniqueOrThrow({
      where: { id: accountId },
      select: {
        id: true,
        accountNumber: true,
        currentBalance: true,
        amountOverdue: true,
        status: true,
        daysPastDue: true,
      },
    });

    return NextResponse.json({
      success: true,
      status: 'SETTLED',
      payment: result.data.payment,
      account: {
        ...account,
        currentBalance: account.currentBalance.toNumber(),
        amountOverdue: account.amountOverdue.toNumber(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Payment simulation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
