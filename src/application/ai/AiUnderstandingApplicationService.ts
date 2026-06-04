import type { Observable, Subscription } from 'rxjs';
import { RxServiceBusBase } from '../../service/bus/RxServiceBusBase.js';
import type { AiUnderstandingPayload, ServiceEventEnvelope } from '../../service/bus/ServiceEvent.types.js';
import type { StockHeartbeatEvent } from '../../service/market/StockHeartbeatService.js';

export type AiUnderstandingEvent = ServiceEventEnvelope<AiUnderstandingPayload>;

/**
 * @description AI 理解应用服务。
 * 订阅服务层行情事件，并生成未来模型可消费的结构化理解上下文占位事件。
 */
export class AiUnderstandingApplicationService extends RxServiceBusBase<AiUnderstandingEvent> {
  private subscription?: Subscription;

  constructor(private readonly stockEvents$: Observable<StockHeartbeatEvent>) {
    super();
  }

  /**
   * 启动 AI 理解事件订阅。
   * @returns 启动完成信号
   */
  start(): void {
    this.subscription = this.stockEvents$.subscribe((event) => {
      this.emitEvent({
        eventId: `application.ai.understanding:${event.eventId}`,
        topic: 'application.ai.understanding.created',
        source: 'AiUnderstandingApplicationService',
        traceId: event.traceId,
        occurredAt: new Date().toISOString(),
        payload: {
          symbol: event.payload.symbol,
          sourceTopic: event.topic,
          summary: this.buildSummary(event),
        },
      });
    });
  }

  /**
   * 停止 AI 理解事件订阅。
   * @returns 停止完成信号
   */
  stop(): void {
    this.subscription?.unsubscribe();
    this.complete();
  }

  private buildSummary(event: StockHeartbeatEvent): string {
    const symbol = event.payload.symbol ?? 'unknown';
    const lastPrice = event.payload.payload.lastPrice;
    const changePercent = event.payload.payload.changePercent;

    return `${symbol} latest price ${lastPrice}, change ${changePercent}%`;
  }
}
