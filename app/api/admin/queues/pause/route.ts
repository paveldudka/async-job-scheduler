import { NextResponse } from 'next/server';
import { jobQueue } from '@/lib/queue';

// POST /api/admin/queues/pause - Pause the queue
export async function POST() {
  try {
    await jobQueue.pause();

    return NextResponse.json({
      success: true,
      message: 'Queue paused',
    });
  } catch (error) {
    console.error('Error pausing queue:', error);
    return NextResponse.json(
      { error: 'Failed to pause queue' },
      { status: 500 }
    );
  }
}
