import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';
import { getJob } from '@/lib/queue';

// GET /api/jobs/[id]/stream - SSE endpoint for job progress updates
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Check if job exists
  const job = await getJob(id);
  if (!job) {
    return new Response('Job not found', { status: 404 });
  }

  // Create readable stream for SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected', jobId: id })}\n\n`)
      );

      // Subscribe to Redis pub/sub for this job's progress
      const subscriber = redis.duplicate();
      await subscriber.connect();

      const channelName = `job:${id}:progress`;

      subscriber.on('message', (channel: string, message: string) => {
        if (channel === channelName) {
          try {
            const data = JSON.parse(message);

            // Handle different event types
            if (data.type === 'failed') {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'failed', error: data.error, timestamp: data.timestamp })}\n\n`)
              );
            } else {
              // Regular progress update
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'progress', ...data })}\n\n`)
              );
            }
          } catch (error) {
            console.error('Error parsing progress message:', error);
          }
        }
      });

      await subscriber.subscribe(channelName);

      // Send heartbeat every 15 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`: heartbeat ${Date.now()}\n\n`)
          );
        } catch (error) {
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      // Check job status periodically
      const statusCheckInterval = setInterval(async () => {
        try {
          const currentJob = await getJob(id);
          if (!currentJob) {
            clearInterval(statusCheckInterval);
            clearInterval(heartbeatInterval);
            await subscriber.unsubscribe(channelName);
            await subscriber.quit();
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Job not found' })}\n\n`)
            );
            controller.close();
            return;
          }

          const state = await currentJob.getState();

          // If job is completed or failed, send final status and close
          if (state === 'completed' || state === 'failed') {
            const statusData: {
              type: string;
              status: string;
              progress?: number;
              error?: string | null;
              timestamp: string;
            } = {
              type: 'status',
              status: state,
              timestamp: new Date().toISOString(),
            };

            // Only set progress to 100 for completed jobs
            if (state === 'completed') {
              statusData.progress = 100;
            } else if (state === 'failed') {
              statusData.error = currentJob.failedReason || 'Unknown error';
            }

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(statusData)}\n\n`)
            );

            clearInterval(statusCheckInterval);
            clearInterval(heartbeatInterval);
            await subscriber.unsubscribe(channelName);
            await subscriber.quit();
            controller.close();
          }
        } catch (error) {
          console.error('Error checking job status:', error);
        }
      }, 1000);

      // Handle client disconnect
      request.signal.addEventListener('abort', async () => {
        clearInterval(statusCheckInterval);
        clearInterval(heartbeatInterval);
        await subscriber.unsubscribe(channelName);
        await subscriber.quit();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
