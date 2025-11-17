import { Job, JobState } from "bullmq";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { type ApiJob, type JobProgress, type JobData } from "./models";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a BullMQ job to an Application Job (something we return to the user)
 * @param job
 * @returns
 */
export async function jobToApiJob(
  job: Job<JobData, string[]>
): Promise<ApiJob> {
  let state: JobState | "unknown";
  state = await job.getState();
  console.log("Job state:", state);
  return {
    id: job.id,
    name: job.data.name,
    status: state,
    createdAt: job.data.createdAt,
    progress: job.progress as JobProgress,
    finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
    logs: job.returnvalue || [],
  };
}
