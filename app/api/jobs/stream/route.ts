import { NextRequest } from "next/server";
import { redis } from "@/lib/redis";
import { getJob } from "@/lib/queue";
import { jobToApiJob } from "@/lib/utils";

const CHANNEL_PATTERN = "job:*:progress";

async function sendSSEMessage(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  message: any
) {
  if (!controller.desiredSize) {
    console.error("Unable to send SSE message. Receiver is disconnected?");
    return;
  }
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
}

// GET /api/jobs/stream - SSE endpoint for all job progress updates
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      console.log("[SSE] New client connected");

      // Create dedicated Redis subscriber for this connection
      const subscriber = redis.duplicate();
      await subscriber.connect();

      // Listen for pattern-matched messages
      subscriber.on(
        "pmessage",
        async (_pattern: string, channel: string, _message: string) => {
          try {
            console.log(`[SSE] pmessage - channel: ${channel}`);
            const jobId = channel.split(":")[1];
            if (!jobId) return;

            const currentJob = await getJob(jobId);
            if (!currentJob) {
              console.error("Job not found:", jobId);
              return;
            }

            const apiJob = await jobToApiJob(currentJob);
            const updateMessage = {
              type: "job-update",
              job: apiJob,
              timestamp: new Date().toISOString(),
            };

            await sendSSEMessage(controller, encoder, updateMessage);
          } catch (error) {
            console.error("Error processing progress message:", error);
          }
        }
      );

      // Subscribe to all job updates
      await subscriber.psubscribe(CHANNEL_PATTERN);
      console.log("[SSE] Subscribed to", CHANNEL_PATTERN);

      let isClosed = false;
      const cleanupSSEConnection = async () => {
        if (isClosed) return;
        isClosed = true;

        console.log("[SSE] Client disconnected. Cleaning up");
        clearInterval(heartbeatInterval);
        console.log("[SSE] heartbeat cleared");
        // Cleanup Redis subscriber
        await subscriber.punsubscribe();
        await subscriber.quit();
        console.log("[SSE] subscriber unsubscribed");

        if (controller.desiredSize) {
          console.log("[SSE] Closing controller");
          controller.close();
        }
      };

      // Send heartbeat every 15 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
        } catch (error) {
          console.error("Error sending heartbeat:", error);
        }
      }, 15000);

      // Handle client disconnect
      request.signal.addEventListener("abort", cleanupSSEConnection);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
