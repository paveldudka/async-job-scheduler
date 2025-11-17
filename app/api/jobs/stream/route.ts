import { NextRequest } from "next/server";
import { redis } from "@/lib/redis";
import { getJob } from "@/lib/queue";
import { jobToApiJob } from "@/lib/utils";

// Global Redis subscriber (shared across all SSE connections)
let globalSubscriber: ReturnType<typeof redis.duplicate> | null = null;
let subscriberInitPromise: Promise<void> | null = null;
const sseClients = new Set<{
  controller: ReadableStreamDefaultController;
  encoder: TextEncoder;
}>();
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

// Initialize global subscriber (called once on first connection)
async function ensureSubscriberInitialized() {
  if (globalSubscriber) return;

  if (!subscriberInitPromise) {
    subscriberInitPromise = (async () => {
      globalSubscriber = redis.duplicate();

      // Listen for pmessage (pattern subscription messages)
      globalSubscriber.on(
        "pmessage",
        async (_pattern: string, channel: string, _message: string) => {
          try {
            console.log(
              `[SSE Global] pmessage - pattern: ${_pattern}, channel: ${channel}`
            );
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

            // Broadcast to all connected SSE clients
            console.log(
              `[SSE Global] Broadcasting to ${sseClients.size} clients`
            );
            sseClients.forEach(({ controller, encoder }) => {
              sendSSEMessage(controller, encoder, updateMessage);
            });
          } catch (error) {
            console.error("Error processing progress message:", error);
          }
        }
      );

      await globalSubscriber.connect();
      console.log("======= PASHA ============= ");
      await globalSubscriber.psubscribe(CHANNEL_PATTERN);
      console.log("[SSE] Global Redis subscriber initialized and subscribed");
    })();
  }

  await subscriberInitPromise;
}

// Cleanup on process exit
process.on("SIGTERM", async () => {
  console.log("[SSE] SIGTERM received, closing global subscriber");
  await globalSubscriber?.quit();
});

process.on("SIGINT", async () => {
  console.log("[SSE] SIGINT received, closing global subscriber");
  await globalSubscriber?.quit();
});

// GET /api/jobs/stream - SSE endpoint for all job progress updates
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Ensure global subscriber is initialized
      await ensureSubscriberInitialized();

      // Add this client to the set
      const client = { controller, encoder };
      sseClients.add(client);

      console.log(
        `[SSE] New client connected. Total connections: ${sseClients.size}`
      );

      let isClosed = false;
      const cleanupSSEConnection = async () => {
        if (isClosed) return;

        isClosed = true;
        sseClients.delete(client);
        console.log(
          `[SSE] Client disconnected. Total connections: ${sseClients.size}`
        );

        clearInterval(heartbeatInterval);

        if (controller.desiredSize) {
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
