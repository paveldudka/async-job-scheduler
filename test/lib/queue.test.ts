import { describe, it, expect, vi, beforeEach } from "vitest";
import { Queue, Job } from "bullmq";

// Mock BullMQ
vi.mock("bullmq", () => {
  const mockJob = {
    id: "test-job-id",
    data: {
      id: "test-job-id",
      name: "Test Job",
      createdAt: new Date().toISOString(),
    },
    progress: 0,
    getState: vi.fn().mockResolvedValue("waiting"),
    remove: vi.fn().mockResolvedValue(undefined),
    retry: vi.fn().mockResolvedValue(undefined),
    isFailed: vi.fn().mockResolvedValue(true), // Return true for retry test
  };

  class QueueMock {
    add = vi.fn().mockResolvedValue(mockJob);
    getJob = vi.fn().mockResolvedValue(mockJob);
    getWaiting = vi.fn().mockResolvedValue([]);
    getActive = vi.fn().mockResolvedValue([]);
    getCompleted = vi.fn().mockResolvedValue([]);
    getFailed = vi.fn().mockResolvedValue([]);
    getJobCounts = vi
      .fn()
      .mockResolvedValue({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      });
    close = vi.fn().mockResolvedValue(undefined);
  }

  class QueueEventsMock {
    on = vi.fn();
    close = vi.fn().mockResolvedValue(undefined);
  }

  return {
    Queue: QueueMock,
    QueueEvents: QueueEventsMock,
    Job: mockJob,
  };
});

describe("Queue Library", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Queue Configuration", () => {
    it("should export QUEUE_NAME", async () => {
      const { QUEUE_NAME } = await import("@/lib/queue");
      expect(QUEUE_NAME).toBe("test-jobs");
    });
  });

  describe("addJob", () => {
    it("should add a job to the queue", async () => {
      const { addJob } = await import("@/lib/queue");

      const jobData = {
        id: "test-id",
        name: "Test Job",
        createdAt: new Date().toISOString(),
      };

      const job = await addJob(jobData);

      expect(job).toBeDefined();
      expect(job.id).toBe("test-job-id");
    });
  });

  describe("getJob", () => {
    it("should retrieve a job by id", async () => {
      const { getJob } = await import("@/lib/queue");

      const job = await getJob("test-job-id");

      expect(job).toBeDefined();
      expect(job?.id).toBe("test-job-id");
    });
  });

  describe("getAllJobs", () => {
    it("should retrieve all jobs from different states", async () => {
      const { getAllJobs } = await import("@/lib/queue");

      const result = await getAllJobs();

      expect(result).toHaveProperty("waiting");
      expect(result).toHaveProperty("active");
      expect(result).toHaveProperty("completed");
      expect(result).toHaveProperty("failed");
      expect(result).toHaveProperty("all");
      expect(Array.isArray(result.all)).toBe(true);
    });
  });

  describe("cancelJob", () => {
    it("should cancel a job", async () => {
      const { cancelJob } = await import("@/lib/queue");

      const result = await cancelJob("test-job-id");

      expect(result).toBe(true);
    });
  });

  describe("retryJob", () => {
    it("should retry a failed job", async () => {
      const { retryJob } = await import("@/lib/queue");

      // Note: retryJob internally checks if job is failed
      // This test passes because our mock returns true for any call
      const result = await retryJob("test-job-id");

      expect(result).toBe(true);
    });
  });

  describe("deleteJob", () => {
    it("should delete a job", async () => {
      const { deleteJob } = await import("@/lib/queue");

      const result = await deleteJob("test-job-id");

      expect(result).toBe(true);
    });
  });

  describe("getQueueMetrics", () => {
    it("should return queue metrics", async () => {
      const { getQueueMetrics } = await import("@/lib/queue");

      const metrics = await getQueueMetrics();

      expect(metrics).toHaveProperty("waiting");
      expect(metrics).toHaveProperty("active");
      expect(metrics).toHaveProperty("completed");
      expect(metrics).toHaveProperty("failed");
    });
  });
});
