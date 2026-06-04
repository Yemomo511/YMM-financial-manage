import type { Observable, Subscription } from 'rxjs';
import { RxServiceBusBase } from '../../service/bus/RxServiceBusBase.js';
import type { AiDecisionPayload, ServiceEventEnvelope } from '../../service/bus/ServiceEvent.types.js';
import type { AiUnderstandingEvent } from './AiUnderstandingApplicationService.js';

export type AiDecisionEvent = ServiceEventEnvelope<AiDecisionPayload>;

/**
 * @description AI 决策应用服务。
 * 订阅 AI 理解事件，并生成不接真实模型的默认决策占位事件。
 */
export class AiDecisionApplicationService extends RxServiceBusBase<AiDecisionEvent> {
  private subscription?: Subscription;

  constructor(private readonly understandingEvents$: Observable<AiUnderstandingEvent>) {
    super();
  }

  /**
   * 启动 AI 决策事件订阅。
   * @returns 启动完成信号
   */
  start(): void {
    this.subscription = this.understandingEvents$.subscribe((event) => {
      this.emitEvent({
        eventId: `application.ai.decision:${event.eventId}`,
        topic: 'application.ai.decision.created',
        source: 'AiDecisionApplicationService',
        traceId: event.traceId,
        occurredAt: new Date().toISOString(),
        payload: {
          symbol: event.payload.symbol,
          action: 'observe',
          reason: `Model integration is not enabled. Observing ${event.payload.sourceTopic}.`,
        },
      });
    });
  }

  /**
   * 停止 AI 决策事件订阅。
   * @returns 停止完成信号
   */
  stop(): void {
    this.subscription?.unsubscribe();
    this.complete();
  }
}
