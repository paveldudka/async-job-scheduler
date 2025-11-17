import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, DELETE } from '@/app/api/jobs/[id]/route';
import { NextRequest } from 'next/server';

const mockJob = {
  id: 'test-job-id',
  data: { name: 'Test Job', createdAt: '2025-11-16T00:00:00.000Z' },
  getState: vi.fn().mockResolvedValue('waiting'),
  progress: 25,
  finishedOn: null,
  failedReason: null,
  attemptsMade: 0,
  returnvalue: ['Log 1', 'Log 2'],
};

vi.mock('@/lib/queue', () => ({
  getJob: vi.fn(),
  deleteJob: vi.fn(),
}));

describe('GET /api/jobs/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return job details', async () => {
    const { getJob } = await import('@/lib/queue');
    vi.mocked(getJob).mockResolvedValue(mockJob as any);

    const request = new NextRequest('http://localhost:3000/api/jobs/test-job-id');
    const response = await GET(request, { params: Promise.resolve({ id: 'test-job-id' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.job.id).toBe('test-job-id');
    expect(data.job.name).toBe('Test Job');
    expect(data.job.status).toBe('waiting');
    expect(data.job.progress).toBe(25);
    expect(data.job.logs).toEqual(['Log 1', 'Log 2']);
  });

  it('should return 404 if job not found', async () => {
    const { getJob } = await import('@/lib/queue');
    vi.mocked(getJob).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/jobs/nonexistent');
    const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Job not found');
  });
});

describe('DELETE /api/jobs/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete a job successfully', async () => {
    const { deleteJob } = await import('@/lib/queue');
    vi.mocked(deleteJob).mockResolvedValue(true);

    const request = new NextRequest('http://localhost:3000/api/jobs/test-job-id', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: 'test-job-id' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Job deleted successfully');
  });

  it('should return 404 if job not found', async () => {
    const { deleteJob } = await import('@/lib/queue');
    vi.mocked(deleteJob).mockResolvedValue(false);

    const request = new NextRequest('http://localhost:3000/api/jobs/nonexistent', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: 'nonexistent' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Job not found');
  });
});
