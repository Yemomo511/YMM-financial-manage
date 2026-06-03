import type { NormalizedMarketEvent, NormalizedMarketPayload } from './Market.types.js';

export type OutboxStatus = 'pending' | 'published' | 'failed';

export interface EventOutboxRecord {
  eventId: string;
  topic: string;
  payload: NormalizedMarketEvent;
  status: OutboxStatus;
  retryCount: number;
  lastError?: string;
  createdAt: Date;
  publishedAt?: Date;
}

export interface QuoteSnapshotRecord extends NormalizedMarketPayload {
  symbol: string;
  market: 'CN_A';
  snapshotAt: string;
}

export interface AuditRecord {
  traceId: string;
  eventType: string;
  source: string;
  message: string;
  payload?: unknown;
  createdAt: Date;
}

export interface MarketRepository {
  /**
   * 保存标准化行情事件明细。
   * @param events 标准化行情事件列表
   * @returns 保存完成信号
   */
  saveEvents(events: NormalizedMarketEvent[]): Promise<void>;

  /**
   * 更新行情最新快照。
   * @param events 标准化行情事件列表
   * @returns 更新完成信号
   */
  updateSnapshots(events: NormalizedMarketEvent[]): Promise<void>;

  /**
   * 追加待发布 Outbox 记录。
   * @param events 标准化行情事件列表
   * @returns 追加完成信号
   */
  appendOutbox(events: NormalizedMarketEvent[]): Promise<void>;

  /**
   * 查询待发布 Outbox 记录。
   * @param limit 最大返回数量
   * @returns 待发布记录列表
   */
  listPendingOutbox(limit: number): Promise<EventOutboxRecord[]>;

  /**
   * 标记 Outbox 记录为已发布。
   * @param eventIds 事件 ID 列表
   * @returns 标记完成信号
   */
  markPublished(eventIds: string[]): Promise<void>;

  /**
   * 标记 Outbox 记录为失败。
   * @param eventId 事件 ID
   * @param reason 失败原因
   * @returns 标记完成信号
   */
  markFailed(eventId: string, reason: string): Promise<void>;

  /**
   * 记录审计日志。
   * @param record 审计日志记录
   * @returns 记录完成信号
   */
  recordAudit(record: Omit<AuditRecord, 'createdAt'>): Promise<void>;
}
