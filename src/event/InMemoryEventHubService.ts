import type { EventHubService } from './EventHub.types.js';

/**
 * @description 内存事件总线。
 * 用于单元测试和本地无 Redis 场景，记录已发布的事件消息。
 */
export class InMemoryEventHubService implements EventHubService {
  private readonly messages = new Map<string, unknown[]>();

  /**
   * 发布单条事件到指定主题。
   * @param topic 事件主题
   * @param payload 事件载荷
   * @returns 发布完成信号
   */
  async publish<T>(topic: string, payload: T): Promise<void> {
    const messages = this.messages.get(topic) ?? [];
    messages.push(payload);
    this.messages.set(topic, messages);
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

  /**
   * 获取指定主题已发布的消息。
   * @param topic 事件主题
   * @returns 已发布消息列表
   */
  getPublishedMessages<T>(topic: string): T[] {
    return (this.messages.get(topic) ?? []) as T[];
  }
}
