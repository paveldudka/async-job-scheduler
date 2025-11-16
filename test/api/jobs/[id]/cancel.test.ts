import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/jobs/[id]/cancel/route';
import { NextRequest } from 'next/server';

const createMockJob = (state: string) => ({
  id: 'test-job-id',
  data: { name: 'Test Job', createdAt: '2025-11-16T00:00:00.000Z' },
  getState: vi.fn().mockResolvedValue(state),
});

vi.mock('@/lib/queue', () => ({
  getJob: vi.fn(),
  cancelJob: vi.fn(),
}));

describe('POST /api/jobs/[id]/cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should cancel a waiting job', async () => {
    const { getJob, cancelJob } = await import('@/lib/queue');
    vi.mocked(getJob).mockResolvedValue(createMockJob('waiting') as any);
    vi.mocked(cancelJob).mockResolvedValue(true);

    const request = new NextRequest('http://localhost:3000/api/jobs/test-job-id/cancel', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'test-job-id' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Job cancelled successfully');
  });

  it('should cancel an active job', async () => {
    const { getJob, cancelJob } = await import('@/lib/queue');
    vi.mocked(getJob).mockResolvedValue(createMockJob('active') as any);
    vi.mocked(cancelJob).mockResolvedValue(true);

    const request = new NextRequest('http://localhost:3000/api/jobs/test-job-id/cancel', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'test-job-id' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should return 404 if job not found', async () => {
    const { getJob } = await import('@/lib/queue');
    vi.mocked(getJob).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/jobs/nonexistent/cancel', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'nonexistent' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Job not found');
  });

  it('should return 400 if job is already completed', async () => {
    const { getJob } = await import('@/lib/queue');
    vi.mocked(getJob).mockResolvedValue(createMockJob('completed') as any);

    const request = new NextRequest('http://localhost:3000/api/jobs/test-job-id/cancel', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'test-job-id' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Cannot cancel job in completed state');
  });

  it('should return 400 if job is already failed', async () => {
    const { getJob } = await import('@/lib/queue');
    vi.mocked(getJob).mockResolvedValue(createMockJob('failed') as any);

    const request = new NextRequest('http://localhost:3000/api/jobs/test-job-id/cancel', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'test-job-id' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Cannot cancel job in failed state');
  });
});
