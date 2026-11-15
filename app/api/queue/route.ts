import { NextResponse } from 'next/server';
import { QueueService } from '@/services/queue.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const priority = searchParams.get('priority') || undefined;
    const reason = searchParams.get('reason') || undefined;
    const search = searchParams.get('search') || undefined;

    const queueService = new QueueService();
    const result = await queueService.getQueueItems({ priority, reason, search });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch work queue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
