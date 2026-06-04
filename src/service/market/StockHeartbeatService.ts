import { MarketNormalizer } from '../../source/market/MarketNormalizer.js';
import type { AShareSourceAdapter, NormalizedMarketEvent } from '../../source/market/Market.types.js';
import type { MarketRepository } from '../../source/market/MarketRepository.types.js';
import type { OutboxPublisher } from '../../source/market/OutboxPublisher.js';
import { RxServiceBusBase } from '../bus/RxServiceBusBase.js';
import type { ServiceEventEnvelope } from '../bus/ServiceEvent.types.js';

export type StockHeartbeatEvent = ServiceEventEnvelope<NormalizedMarketEvent>;

export interface StockHeartbeatServiceOptions {
  symbols: string[];
  adapter: AShareSourceAdapter;
  repository: MarketRepository;
  outboxPublisher: OutboxPublisher;
  normalizer?: MarketNormalizer;
  intervalMs?: number;
}

/**
 * @description 股票心跳服务。
 * 按心跳周期拉取 A 股行情、标准化、写入仓库和 Outbox，并向服务层事件总线抛出行情事件。
 */
export class StockHeartbeatService extends RxServiceBusBase<StockHeartbeatEvent> {
  private readonly symbols: string[];
  private readonly adapter: AShareSourceAdapter;
  private readonly repository: MarketRepository;
  private readonly outboxPublisher: OutboxPublisher;
  private readonly normalizer: MarketNormalizer;
  private readonly intervalMs: number;
  private timer?: NodeJS.Timeout;

  constructor(options: StockHeartbeatServiceOptions) {
    super();
    this.symbols = options.symbols;
    this.adapter = options.adapter;
    this.repository = options.repository;
    this.outboxPublisher = options.outboxPublisher;
    this.normalizer = options.normalizer ?? new MarketNormalizer();
    this.intervalMs = options.intervalMs ?? 3000;
  }

  /**
   * 启动股票心跳服务。
   * @returns 启动完成信号
   */
  async start(): Promise<void> {
    await this.adapter.connect();
    await this.adapter.subscribeRealtime(this.symbols);
    await this.pulseOnce();
    this.timer = setInterval(() => {
      this.pulseOnce().catch((error: unknown) => {
        console.error('stock heartbeat failed', error);
      });
    }, this.intervalMs);
  }

  /**
   * 停止股票心跳服务。
   * @returns 停止完成信号
   */
  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
    }

    await this.adapter.disconnect();
    this.complete();
  }

  /**
   * 执行一次股票心跳。
   * @returns 处理完成信号
   */
  async pulseOnce(): Promise<void> {
    for await (const rawEvent of this.adapter.stream()) {
      const events = await this.normalizer.normalize(rawEvent);
      await this.repository.saveEvents(events);
      await this.repository.updateSnapshots(events);
      await this.repository.appendOutbox(events);
      await this.outboxPublisher.publishPending();

      for (const event of events) {
        this.emitEvent({
          eventId: `service.stock-heartbeat:${event.eventId}`,
          topic: event.topic,
          source: 'StockHeartbeatService',
          traceId: event.traceId,
          occurredAt: event.occurredAt,
          payload: event,
        });
      }
    }
  }
}
