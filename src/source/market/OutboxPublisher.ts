import type { EventHubService } from '../../event/EventHub.types.js';
import type { MarketRepository } from './MarketRepository.types.js';

/**
 * @description Outbox 发布器。
 * 扫描数据库真源中的待发布事件，并投递到事件总线。
 */
export class OutboxPublisher {
  constructor(
    private readonly marketRepository: MarketRepository,
    private readonly eventHubService: EventHubService,
    private readonly batchSize = 100,
  ) {}

  /**
   * 发布待处理 Outbox 事件。
   * @returns 成功发布的事件数量
   */
  async publishPending(): Promise<number> {
    const pendingRecords = await this.marketRepository.listPendingOutbox(this.batchSize);
    let publishedCount = 0;

    for (const record of pendingRecords) {
      try {
        await this.eventHubService.publish(record.topic, record.payload);
        await this.marketRepository.markPublished([record.eventId]);
        publishedCount += 1;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        await this.marketRepository.markFailed(record.eventId, reason);
        await this.marketRepository.recordAudit({
          traceId: record.payload.traceId,
          eventType: 'outbox.publish.failed',
          source: 'OutboxPublisher',
          message: reason,
          payload: record.payload,
        });
      }
    }

    return publishedCount;
  }
}
