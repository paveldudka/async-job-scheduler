import { NextRequest, NextResponse } from 'next/server';
import { jobQueue } from '@/lib/queue';

// POST /api/admin/queues/clean - Clean completed/failed jobs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { status, grace = 0 } = body;

    if (!status || !['completed', 'failed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "completed" or "failed"' },
        { status: 400 }
      );
    }

    // Clean jobs older than grace period (in milliseconds)
    const count = await jobQueue.clean(grace, 100, status);

    return NextResponse.json({
      success: true,
      cleaned: count.length,
      status,
    });
  } catch (error) {
    console.error('Error cleaning queue:', error);
    return NextResponse.json(
      { error: 'Failed to clean queue' },
      { status: 500 }
    );
  }
}
