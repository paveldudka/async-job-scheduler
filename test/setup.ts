import { beforeAll, afterAll, vi } from 'vitest';

// Mock environment variables
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.QUEUE_NAME = 'test-jobs';

// Mock Redis and BullMQ to avoid actual connections during tests
vi.mock('ioredis', () => {
  class RedisMock {
    ping = vi.fn().mockResolvedValue('PONG');
    set = vi.fn().mockResolvedValue('OK');
    get = vi.fn().mockResolvedValue(null);
    del = vi.fn().mockResolvedValue(1);
    quit = vi.fn().mockResolvedValue('OK');
    on = vi.fn();
  }
  return { default: RedisMock };
});

beforeAll(() => {
  console.log('Test setup initialized');
});

afterAll(() => {
  console.log('Test teardown complete');
});
