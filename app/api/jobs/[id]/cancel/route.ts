import { NextRequest, NextResponse } from 'next/server';
import { cancelJob, getJob } from '@/lib/queue';

// POST /api/jobs/[id]/cancel - Cancel a job
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

    // Can only cancel waiting or active jobs
    if (state !== 'waiting' && state !== 'active' && state !== 'delayed') {
      return NextResponse.json(
        { error: `Cannot cancel job in ${state} state` },
        { status: 400 }
      );
    }

    const cancelled = await cancelJob(id);

    if (!cancelled) {
      return NextResponse.json(
        { error: 'Failed to cancel job' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Job cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling job:', error);
    return NextResponse.json(
      { error: 'Failed to cancel job' },
      { status: 500 }
    );
  }
}
