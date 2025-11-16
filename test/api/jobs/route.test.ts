import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '@/app/api/jobs/route';
import { NextRequest } from 'next/server';

// Mock the queue module
vi.mock('@/lib/queue', () => ({
  addJob: vi.fn().mockResolvedValue({
    id: 'mock-job-id',
    data: { id: 'mock-job-id', name: 'Test Job', createdAt: '2025-11-16T00:00:00.000Z' },
    getState: vi.fn().mockResolvedValue('waiting'),
    progress: 0,
  }),
  getAllJobs: vi.fn().mockResolvedValue({
    all: [
      {
        id: 'job-1',
        data: { name: 'Job 1', createdAt: '2025-11-16T00:00:00.000Z' },
        getState: vi.fn().mockResolvedValue('completed'),
        progress: 100,
        finishedOn: Date.now(),
        failedReason: null,
        attemptsMade: 1,
      },
      {
        id: 'job-2',
        data: { name: 'Job 2', createdAt: '2025-11-16T00:01:00.000Z' },
        getState: vi.fn().mockResolvedValue('active'),
        progress: 50,
        finishedOn: null,
        failedReason: null,
        attemptsMade: 0,
      },
    ],
  }),
}));

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'mock-nanoid-123'),
}));

describe('POST /api/jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new job with valid data', async () => {
    const request = new NextRequest('http://localhost:3000/api/jobs', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Job' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.job).toBeDefined();
    expect(data.job.id).toBe('mock-job-id');
    expect(data.job.name).toBe('Test Job');
    expect(data.job.status).toBe('waiting');
  });

  it('should return 400 if name is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/jobs', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Job name is required');
  });

  it('should return 400 if name is not a string', async () => {
    const request = new NextRequest('http://localhost:3000/api/jobs', {
      method: 'POST',
      body: JSON.stringify({ name: 123 }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Job name is required');
  });
});

describe('GET /api/jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all jobs', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.jobs).toHaveLength(2);
    expect(data.total).toBe(2);
  });

  it('should return jobs sorted by creation time (newest first)', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.jobs[0].id).toBe('job-2'); // Newer job first
    expect(data.jobs[1].id).toBe('job-1');
  });

  it('should include job status and progress', async () => {
    const response = await GET();
    const data = await response.json();

    const activeJob = data.jobs.find((j: any) => j.id === 'job-2');
    expect(activeJob.status).toBe('active');
    expect(activeJob.progress).toBe(50);

    const completedJob = data.jobs.find((j: any) => j.id === 'job-1');
    expect(completedJob.status).toBe('completed');
    expect(completedJob.progress).toBe(100);
  });
});
