import type { NormalizedMarketEvent } from './Market.types.js';
import type {
  AuditRecord,
  EventOutboxRecord,
  MarketRepository,
  QuoteSnapshotRecord,
} from './MarketRepository.types.js';

/**
 * @description 内存行情仓库。
 * 用于测试与本地无数据库演示，模拟 tick、快照、Outbox 和审计日志写入。
 */
export class InMemoryMarketRepository implements MarketRepository {
  private readonly ticks: NormalizedMarketEvent[] = [];
  private readonly snapshots = new Map<string, QuoteSnapshotRecord>();
  private readonly outbox = new Map<string, EventOutboxRecord>();
  private readonly auditLogs: AuditRecord[] = [];

  /**
   * 保存标准化行情事件明细。
   * @param events 标准化行情事件列表
   * @returns 保存完成信号
   */
  async saveEvents(events: NormalizedMarketEvent[]): Promise<void> {
    this.ticks.push(...events);
  }

  /**
   * 更新行情最新快照。
   * @param events 标准化行情事件列表
   * @returns 更新完成信号
   */
  async updateSnapshots(events: NormalizedMarketEvent[]): Promise<void> {
    for (const event of events) {
      if (!event.symbol) {
        continue;
      }

      this.snapshots.set(event.symbol, {
        ...event.payload,
        symbol: event.symbol,
        market: event.market,
        snapshotAt: event.publishedAt,
      });
    }
  }

  /**
   * 追加待发布 Outbox 记录。
   * @param events 标准化行情事件列表
   * @returns 追加完成信号
   */
  async appendOutbox(events: NormalizedMarketEvent[]): Promise<void> {
    for (const event of events) {
      this.outbox.set(event.eventId, {
        eventId: event.eventId,
        topic: event.topic,
        payload: event,
        status: 'pending',
        retryCount: 0,
        createdAt: new Date(),
      });
    }
  }

  /**
   * 查询待发布 Outbox 记录。
   * @param limit 最大返回数量
   * @returns 待发布记录列表
   */
  async listPendingOutbox(limit: number): Promise<EventOutboxRecord[]> {
    return Array.from(this.outbox.values())
      .filter((record) => record.status === 'pending')
      .slice(0, limit);
  }

  /**
   * 标记 Outbox 记录为已发布。
   * @param eventIds 事件 ID 列表
   * @returns 标记完成信号
   */
  async markPublished(eventIds: string[]): Promise<void> {
    for (const eventId of eventIds) {
      const record = this.outbox.get(eventId);

      if (!record) {
        continue;
      }

      record.status = 'published';
      record.publishedAt = new Date();
    }
  }

  /**
   * 标记 Outbox 记录为失败。
   * @param eventId 事件 ID
   * @param reason 失败原因
   * @returns 标记完成信号
   */
  async markFailed(eventId: string, reason: string): Promise<void> {
    const record = this.outbox.get(eventId);

    if (!record) {
      return;
    }

    record.status = 'failed';
    record.retryCount += 1;
    record.lastError = reason;
  }

  /**
   * 记录审计日志。
   * @param record 审计日志记录
   * @returns 记录完成信号
   */
  async recordAudit(record: Omit<AuditRecord, 'createdAt'>): Promise<void> {
    this.auditLogs.push({ ...record, createdAt: new Date() });
  }

  /**
   * 获取内存 tick 列表。
   * @returns tick 列表
   */
  getTicks(): NormalizedMarketEvent[] {
    return this.ticks;
  }

  /**
   * 获取内存快照表。
   * @returns 快照 Map
   */
  getSnapshots(): Map<string, QuoteSnapshotRecord> {
    return this.snapshots;
  }

  /**
   * 获取 Outbox 记录列表。
   * @returns Outbox 记录列表
   */
  getOutboxRecords(): EventOutboxRecord[] {
    return Array.from(this.outbox.values());
  }

  /**
   * 获取审计日志列表。
   * @returns 审计日志列表
   */
  getAuditLogs(): AuditRecord[] {
    return this.auditLogs;
  }
}
