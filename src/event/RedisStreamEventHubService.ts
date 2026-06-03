import { Redis } from 'ioredis';
import type { EventHubService } from './EventHub.types.js';

export interface RedisStreamPublisher {
  xadd(stream: string, id: string, field: string, value: string): Promise<unknown>;
}

/**
 * @description Redis Stream 事件总线。
 * 将系统标准事件发布到以 topic 命名的 Redis Stream 中。
 */
export class RedisStreamEventHubService implements EventHubService {
  private readonly redis: RedisStreamPublisher;

  constructor(redis: RedisStreamPublisher = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379')) {
    this.redis = redis;
  }

  /**
   * 发布单条事件到指定主题。
   * @param topic 事件主题
   * @param payload 事件载荷
   * @returns 发布完成信号
   */
  async publish<T>(topic: string, payload: T): Promise<void> {
    await this.redis.xadd(this.buildStreamName(topic), '*', 'event', JSON.stringify(payload));
  }

  /**
   * 批量发布事件到指定主题。
   * @param topic 事件主题
   * @param payloads 事件载荷列表
   * @returns 发布完成信号
   */
  async publishBatch<T>(topic: string, payloads: T[]): Promise<void> {
    for (const payload of payloads) {
      await this.publish(topic, payload);
    }
  }

  private buildStreamName(topic: string): string {
    return `stream:${topic}`;
  }
}
