import type { NormalizedMarketEvent } from '../../market/Market.types.js';
import { RxServiceBusBase } from '../bus/RxServiceBusBase.js';
import type { ServerBroadcastPayload, ServiceEventEnvelope } from '../bus/ServiceEvent.types.js';
import type { StockHeartbeatEvent } from './StockHeartbeatService.js';

export interface MarketBroadcaster {
  /**
   * 广播标准化行情事件。
   * @param event 标准化行情事件
   * @returns 广播完成信号
   */
  broadcast(event: NormalizedMarketEvent): void;
}

export type ServerBroadcastEvent = ServiceEventEnvelope<ServerBroadcastPayload<NormalizedMarketEvent>>;

/**
 * @description 服务端统一广播服务。
 * 接收服务层实时事件，并统一转发到 WebSocket 等服务端广播出口。
 */
export class ServerBroadcastService extends RxServiceBusBase<ServerBroadcastEvent> {
  constructor(private readonly marketBroadcaster: MarketBroadcaster) {
    super();
  }

  /**
   * 接收行情服务事件并广播给实时客户端。
   * @param event 股票心跳服务事件
   * @returns 广播完成信号
   */
  broadcastMarketEvent(event: StockHeartbeatEvent): void {
    this.marketBroadcaster.broadcast(event.payload);
    this.emitEvent({
      eventId: `server.broadcast:${event.eventId}`,
      topic: `server.broadcast.${event.topic}`,
      source: 'ServerBroadcastService',
      traceId: event.traceId,
      occurredAt: new Date().toISOString(),
      payload: {
        channel: event.topic,
        data: event.payload,
      },
    });
  }
}
