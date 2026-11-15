import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serializeAccount } from '@/lib/serializers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const account = await prisma.account.findFirst({
      where: {
        OR: [{ id }, { accountNumber: id }],
      },
      include: {
        borrower: {
          include: { preferences: true, contactMethods: true },
        },
        ledgerEntries: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        paymentLinks: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        promisesToPay: {
          orderBy: { dueDate: 'desc' },
          take: 10,
        },
        cases: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        conversations: {
          include: {
            messages: {
              orderBy: { sentAt: 'asc' },
            },
          },
        },
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json(serializeAccount(account));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch account detail';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
