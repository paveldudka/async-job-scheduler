import { NextRequest } from "next/server";
import { redis } from "@/lib/redis";
import { getJob } from "@/lib/queue";
import { jobToApiJob } from "@/lib/utils";

async function sendSSEMessage(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  message: any
) {
  if (!controller.desiredSize) {
    console.error("Unable to send SSE message. Receiver is disconnected?");
    return;
  }
  // console.log("Sending SSE message:", message);
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
}

// GET /api/jobs/[id]/stream - SSE endpoint for job progress updates
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Check if job exists
  const job = await getJob(id);
  if (!job) {
    return new Response("Job not found", { status: 404 });
  }

  // Create readable stream for SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;
      const cleanupSSEConnection = async () => {
        if (isClosed) {
          return;
        }
        console.log("Client disconnected. Closing SSE connection");
        isClosed = true;
        clearInterval(heartbeatInterval);
        clearInterval(statusCheckInterval);
        await subscriber.unsubscribe(channelName);
        await subscriber.quit();
        if (controller.desiredSize) {
          // Desired size is non-zero, meaning the client is still connected
          controller.close();
        }
      };

      // Subscribe to Redis pub/sub for this job's progress
      const subscriber = redis.duplicate();
      await subscriber.connect();

      const channelName = `job:${id}:progress`;

      subscriber.on("message", async (channel: string, message: string) => {
        if (channel === channelName) {
          try {
            console.log("Received progress message:", message);
            const currentJob = await getJob(id);

            if (!currentJob) {
              console.error("Job not found");
              return;
            }

            const apiJob = await jobToApiJob(currentJob);

            // Send validated message
            await sendSSEMessage(controller, encoder, {
              type: "status",
              job: apiJob,
              timestamp: new Date().toISOString(),
            });
          } catch (error) {
            console.error("Error parsing progress message:", error);
          }
        }
      });

      await subscriber.subscribe(channelName);

      // Send heartbeat every 15 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
        } catch (error) {
          console.error("Error sending heartbeat:", error);
        }
      }, 15000);

      // Check job status periodically
      const statusCheckInterval = setInterval(async () => {
        try {
          const currentJob = await getJob(id);
          if (!currentJob) {
            await sendSSEMessage(controller, encoder, {
              type: "error",
              message: "Job not found",
            });
            await cleanupSSEConnection();
            return;
          }

          const apiJob = await jobToApiJob(currentJob);

          if (apiJob.status === "completed" || apiJob.status === "failed") {
            await cleanupSSEConnection();
          }
        } catch (error) {
          console.error("Error checking job status:", error);
        }
      }, 1000);

      // Handle client disconnect
      request.signal.addEventListener("abort", cleanupSSEConnection);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
