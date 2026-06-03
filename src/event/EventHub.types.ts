export interface EventHubService {
  /**
   * 发布单条事件到指定主题。
   * @param topic 事件主题
   * @param payload 事件载荷
   * @returns 发布完成信号
   */
  publish<T>(topic: string, payload: T): Promise<void>;

  /**
   * 批量发布事件到指定主题。
   * @param topic 事件主题
   * @param payloads 事件载荷列表
   * @returns 发布完成信号
   */
  publishBatch<T>(topic: string, payloads: T[]): Promise<void>;
}
