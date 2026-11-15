import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serializeAccount } from '@/lib/serializers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { accountNumber: { contains: search, mode: 'insensitive' } },
        { borrower: { firstName: { contains: search, mode: 'insensitive' } } },
        { borrower: { lastName: { contains: search, mode: 'insensitive' } } },
        { borrower: { primaryPhone: { contains: search } } },
      ];
    }

    const accounts = await prisma.account.findMany({
      where,
      include: {
        borrower: {
          include: { preferences: true },
        },
        promisesToPay: {
          where: { status: { in: ['APPROVED', 'DUE'] } },
        },
        cases: {
          where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
        },
      },
      orderBy: { daysPastDue: 'desc' },
    });

    return NextResponse.json({
      accounts: accounts.map(serializeAccount),
      total: accounts.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch accounts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
