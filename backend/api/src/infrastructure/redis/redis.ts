import { Redis } from 'ioredis';

export function createRedisClient(connectionUrl: string): Redis {
  return new Redis(connectionUrl, {
    enableReadyCheck: true,
    lazyConnect: true,
    maxRetriesPerRequest: 3,
  });
}
