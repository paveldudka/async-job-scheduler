import Redis from 'ioredis';

const getRedisUrl = () => {
  const host = process.env.REDIS_HOST || 'localhost';
  const port = process.env.REDIS_PORT || '6379';
  return `redis://${host}:${port}`;
};

// Singleton Redis client
class RedisClient {
  private static instance: Redis | null = null;

  static getInstance(): Redis {
    if (!RedisClient.instance) {
      RedisClient.instance = new Redis(getRedisUrl(), {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
      });

      RedisClient.instance.on('connect', () => {
        console.log('✅ Redis connected');
      });

      RedisClient.instance.on('error', (err) => {
        console.error('❌ Redis error:', err);
      });

      RedisClient.instance.on('close', () => {
        console.log('🔌 Redis connection closed');
      });
    }

    return RedisClient.instance;
  }

  static async disconnect(): Promise<void> {
    if (RedisClient.instance) {
      await RedisClient.instance.quit();
      RedisClient.instance = null;
    }
  }
}

export const redis = RedisClient.getInstance();
export default RedisClient;
