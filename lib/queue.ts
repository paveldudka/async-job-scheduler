import { Queue, QueueEvents } from "bullmq";
import { redis } from "./redis";

// Queue configuration
const QUEUE_NAME = process.env.QUEUE_NAME || "jobs";

// Job data interface
export interface JobData {
  id: string;
  name: string;
  createdAt: string;
}

// Job progress interface
export interface JobProgress {
  progress: number;
  action: string;
  timestamp: string;
}

// Create BullMQ queue instance
export const jobQueue = new Queue<JobData>(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: false, // Keep completed jobs (manual deletion only)
    removeOnFail: false, // Keep failed jobs (manual deletion only)
  },
});

// Helper functions
export async function addJob(data: JobData) {
  const job = await jobQueue.add("process-job", data, {
    jobId: data.id,
  });
  return job;
}

export async function getJob(jobId: string) {
  return await jobQueue.getJob(jobId);
}

export async function getAllJobs() {
  const [waiting, active, completed, failed] = await Promise.all([
    jobQueue.getWaiting(),
    jobQueue.getActive(),
    jobQueue.getCompleted(),
    jobQueue.getFailed(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    all: [...waiting, ...active, ...completed, ...failed],
  };
}

export async function cancelJob(jobId: string) {
  const job = await jobQueue.getJob(jobId);
  if (job) {
    await job.remove();
    return true;
  }
  return false;
}

export async function retryJob(jobId: string) {
  const job = await jobQueue.getJob(jobId);
  if (job && (await job.isFailed())) {
    await job.retry();
    return true;
  }
  return false;
}

export async function deleteJob(jobId: string) {
  const job = await jobQueue.getJob(jobId);
  if (job) {
    await job.remove();
    return true;
  }
  return false;
}

export async function getQueueMetrics() {
  const counts = await jobQueue.getJobCounts(
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed"
  );
  return counts;
}

// Graceful shutdown
export async function closeQueue() {
  await jobQueue.close();
}

// Export queue name constant
export { QUEUE_NAME };
