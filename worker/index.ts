import { Worker, Job, JobState } from "bullmq";
import Redis from "ioredis";

// Redis connection
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

// Queue name
const QUEUE_NAME = process.env.QUEUE_NAME || "jobs";
const MAX_CONCURRENCY = parseInt(process.env.MAX_CONCURRENCY || "5");

// Job data interface
interface JobData {
  id: string;
  name: string;
  createdAt: string;
}

interface JobProgress {
  action: string | undefined;
  progress: number;
  error: string | undefined;
  timestamp: string;
  logs: string[] | undefined;
}

// Mock web agent actions
const WEB_AGENT_ACTIONS = [
  "Navigating to page",
  "Loading resources",
  "Clicking button",
  "Typing text in input field",
  "Scrolling to element",
  "Waiting for element to appear",
  "Taking screenshot",
  "Extracting data from page",
  "Validating form fields",
  "Submitting form",
];

// Get random action
function getRandomAction(): string {
  return WEB_AGENT_ACTIONS[
    Math.floor(Math.random() * WEB_AGENT_ACTIONS.length)
  ];
}

// Simulate async work with progress updates
async function processJob(
  job: Job<JobData, string[]>
): Promise<{ logs: string[] }> {
  const logs: string[] = [];
  const totalSteps = 10;
  const stepDuration = 1000; // 1 second per step

  console.log(
    `📝 Processing job ${job.id}: ${job.data.name}: ${await job.getState()}`
  );
  logs.push(`Started processing job: ${job.data.name}`);

  for (let step = 1; step <= totalSteps; step++) {
    // Random action
    const action = getRandomAction();
    const progress = Math.round((step / totalSteps) * 100);

    // Update job progress
    await job.updateProgress({
      progress,
      action,
      timestamp: new Date().toISOString(),
    } as JobProgress);

    const logMessage = `[${step}/${totalSteps}] ${action} (${progress}%)`;
    console.log(`  ${logMessage}`);
    logs.push(logMessage);

    // Wait 1 second before next step
    if (step < totalSteps) {
      await new Promise((resolve) => setTimeout(resolve, stepDuration));
    }
  }

  console.log(`✅ Completed job ${job.id}`);
  logs.push(`Completed job: ${job.data.name}`);

  return { logs };
}

// Create worker
const worker = new Worker<JobData>(
  QUEUE_NAME,
  async (job: Job<JobData, string[]>) => {
    // Simulate random failures (15% chance)
    if (Math.random() < 0.0) {
      throw new Error("Simulated random failure");
    }

    const result = await processJob(job);
    return result;
  },
  {
    connection: redis,
    concurrency: MAX_CONCURRENCY,
    limiter: {
      max: MAX_CONCURRENCY,
      duration: 1000,
    },
  }
);

worker.on("active", (job) => {
  console.log(`[WORKER] 📊 Job ${job.id} is active`);
  job.updateProgress({
    progress: 0,
    action: "Starting job",
    timestamp: new Date().toISOString(),
  } as JobProgress);
});

// Worker event listeners
worker.on("completed", (job) => {
  console.log(`[WORKER] ✅ Job ${job.id} completed successfully`);
  job.updateProgress({
    progress: 100,
    timestamp: new Date().toISOString(),
  } as JobProgress);
});

worker.on("failed", (job, err) => {
  console.error(`[WORKER] ❌ Job ${job?.id} failed with error:`, err.message);
  if (!job) {
    console.error("Job not found");
    return;
  }
  job.updateProgress({
    progress: 100,
    timestamp: new Date().toISOString(),
  } as JobProgress);
});

worker.on("progress", (job, progress) => {
  const prog = progress as JobProgress;
  console.log(
    `[WORKER] 📊 Job ${job.id} progress: ${prog.progress}% - ${prog.action}`
  );
  redis.publish(`job:${job.id}:progress`, JSON.stringify(prog));
});

worker.on("error", (err) => {
  console.error("Worker error:", err);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down worker gracefully...");
  await worker.close();
  await redis.quit();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down worker gracefully...");
  await worker.close();
  await redis.quit();
  process.exit(0);
});

console.log(`🚀 Worker started with ${MAX_CONCURRENCY} concurrency`);
console.log(`📡 Listening for jobs on queue: ${QUEUE_NAME}`);
