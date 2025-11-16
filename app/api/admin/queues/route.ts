import { NextResponse } from 'next/server';
import { jobQueue, getQueueMetrics } from '@/lib/queue';

// GET /api/admin/queues - Get queue statistics and metrics
export async function GET() {
  try {
    const counts = await getQueueMetrics();

    // Get recent jobs for preview
    const [waiting, active, completed, failed] = await Promise.all([
      jobQueue.getWaiting(0, 5),
      jobQueue.getActive(0, 5),
      jobQueue.getCompleted(0, 5),
      jobQueue.getFailed(0, 5),
    ]);

    return NextResponse.json({
      success: true,
      queue: {
        name: jobQueue.name,
        counts,
        workers: 5, // MAX_CONCURRENCY
      },
      recentJobs: {
        waiting: waiting.map(j => ({ id: j.id, name: j.data.name, timestamp: j.timestamp })),
        active: active.map(j => ({ id: j.id, name: j.data.name, timestamp: j.timestamp })),
        completed: completed.map(j => ({ id: j.id, name: j.data.name, finishedOn: j.finishedOn })),
        failed: failed.map(j => ({ id: j.id, name: j.data.name, failedReason: j.failedReason, finishedOn: j.finishedOn })),
      },
    });
  } catch (error) {
    console.error('Error fetching queue metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queue metrics' },
      { status: 500 }
    );
  }
}
