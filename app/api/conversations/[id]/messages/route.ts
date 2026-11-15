import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SenderType, ChannelType } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { sentAt: 'asc' },
    });

    return NextResponse.json({ messages });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch messages';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const conversation = await prisma.conversation.findUniqueOrThrow({
      where: { id },
      include: { account: true },
    });

    const newMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: (body.senderType as SenderType) || 'OPERATOR',
        channel: (body.channel as ChannelType) || conversation.channel,
        body: body.body,
        sentAt: new Date(),
        deliveryStatus: 'DELIVERED',
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    // Write audit event
    await prisma.auditEvent.create({
      data: {
        tenantId: conversation.account.tenantId,
        accountId: conversation.accountId,
        actorType: newMessage.senderType === 'BORROWER' ? 'BORROWER' : 'OPERATOR',
        action: 'MESSAGE_SENT',
        entityType: 'Message',
        entityId: newMessage.id,
        newState: { channel: newMessage.channel, body: newMessage.body },
      },
    });

    return NextResponse.json({ message: newMessage });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to post message';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
