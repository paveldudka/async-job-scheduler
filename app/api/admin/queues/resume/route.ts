import { NextResponse } from 'next/server';
import { jobQueue } from '@/lib/queue';

// POST /api/admin/queues/resume - Resume the queue
export async function POST() {
  try {
    await jobQueue.resume();

    return NextResponse.json({
      success: true,
      message: 'Queue resumed',
    });
  } catch (error) {
    console.error('Error resuming queue:', error);
    return NextResponse.json(
      { error: 'Failed to resume queue' },
      { status: 500 }
    );
  }
}
