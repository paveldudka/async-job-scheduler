import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/jobs/[id]/retry/route';
import { NextRequest } from 'next/server';

const createMockJob = (state: string) => ({
  id: 'test-job-id',
  data: { name: 'Test Job', createdAt: '2025-11-16T00:00:00.000Z' },
  getState: vi.fn().mockResolvedValue(state),
});

vi.mock('@/lib/queue', () => ({
  getJob: vi.fn(),
  retryJob: vi.fn(),
}));

describe('POST /api/jobs/[id]/retry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should retry a failed job', async () => {
    const { getJob, retryJob } = await import('@/lib/queue');
    vi.mocked(getJob).mockResolvedValue(createMockJob('failed') as any);
    vi.mocked(retryJob).mockResolvedValue(true);

    const request = new NextRequest('http://localhost:3000/api/jobs/test-job-id/retry', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'test-job-id' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Job queued for retry');
  });

  it('should return 404 if job not found', async () => {
    const { getJob } = await import('@/lib/queue');
    vi.mocked(getJob).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/jobs/nonexistent/retry', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'nonexistent' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Job not found');
  });

  it('should return 400 if job is not failed', async () => {
    const { getJob } = await import('@/lib/queue');
    vi.mocked(getJob).mockResolvedValue(createMockJob('completed') as any);

    const request = new NextRequest('http://localhost:3000/api/jobs/test-job-id/retry', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'test-job-id' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Cannot retry job in completed state');
  });

  it('should return 400 if trying to retry waiting job', async () => {
    const { getJob } = await import('@/lib/queue');
    vi.mocked(getJob).mockResolvedValue(createMockJob('waiting') as any);

    const request = new NextRequest('http://localhost:3000/api/jobs/test-job-id/retry', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'test-job-id' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Only failed jobs can be retried');
  });

  it('should return 400 if trying to retry active job', async () => {
    const { getJob } = await import('@/lib/queue');
    vi.mocked(getJob).mockResolvedValue(createMockJob('active') as any);

    const request = new NextRequest('http://localhost:3000/api/jobs/test-job-id/retry', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'test-job-id' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Only failed jobs can be retried');
  });
});
