import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { WorkspaceClient } from '@/components/workspace/WorkspaceClient';
import { serializeAccount } from '@/lib/serializers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function WorkspacePage(props: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await props.params;

  // Find account by ID or accountNumber, with fallback to first account
  let account = await prisma.account.findFirst({
    where: {
      OR: [{ id: accountId }, { accountNumber: accountId }],
    },
    include: {
      borrower: {
        include: { preferences: true, contactMethods: true },
      },
      conversations: {
        include: {
          messages: {
            orderBy: { sentAt: 'asc' },
          },
        },
      },
      promisesToPay: {
        orderBy: { dueDate: 'desc' },
        take: 3,
      },
      cases: {
        where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
      },
    },
  });

  // Fallback to first account if requested ID was a placeholder
  if (!account) {
    account = await prisma.account.findFirst({
      include: {
        borrower: {
          include: { preferences: true, contactMethods: true },
        },
        conversations: {
          include: {
            messages: {
              orderBy: { sentAt: 'asc' },
            },
          },
        },
        promisesToPay: {
          orderBy: { dueDate: 'desc' },
          take: 3,
        },
        cases: {
          where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
        },
      },
    });
  }

  if (!account) {
    notFound();
  }

  const primaryConversation = account.conversations[0] || null;
  const initialMessages = primaryConversation
    ? primaryConversation.messages.map((m) => ({
        id: m.id,
        senderType: m.senderType,
        channel: m.channel,
        body: m.body,
        sentAt: m.sentAt.toISOString(),
        deliveryStatus: m.deliveryStatus,
        detectedIntent: m.detectedIntent,
      }))
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-1 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            AI Conversation Workspace
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time multi-channel communication, copilot operational triage, and policy enforcement.
          </p>
        </div>
      </div>

      <WorkspaceClient
        initialAccount={serializeAccount(account)}
        initialConversation={primaryConversation}
        initialMessages={initialMessages}
      />
    </div>
  );
}
