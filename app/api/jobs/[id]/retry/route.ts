import { NextRequest, NextResponse } from 'next/server';
import { retryJob, getJob } from '@/lib/queue';

// POST /api/jobs/[id]/retry - Retry a failed job
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await getJob(id);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const state = await job.getState();

    // Can only retry failed jobs
    if (state !== 'failed') {
      return NextResponse.json(
        { error: `Cannot retry job in ${state} state. Only failed jobs can be retried.` },
        { status: 400 }
      );
    }

    const retried = await retryJob(id);

    if (!retried) {
      return NextResponse.json(
        { error: 'Failed to retry job' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Job queued for retry',
    });
  } catch (error) {
    console.error('Error retrying job:', error);
    return NextResponse.json(
      { error: 'Failed to retry job' },
      { status: 500 }
    );
  }
}
