import { JobState } from "bullmq";

// Job data interface
export interface JobData {
  id: string;
  name: string;
  createdAt: string;
}

// Job progress interface
export interface JobProgress {
  action: string | undefined;
  progress: number;
  error: string | undefined;
  timestamp: string;
}

// User-facing job interface
export interface ApiJob {
  id: string | undefined;
  name: string;
  status: JobState | "unknown";
  createdAt: string;
  progress: JobProgress;
  finishedAt: string | null;
  failedReason: string | null;
  attemptsMade: number;
  logs: string[];
}
