import { firstValueFrom, Subject } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { AiDecisionApplicationService } from '../../src/application/ai/AiDecisionApplicationService.js';
import { AiUnderstandingApplicationService } from '../../src/application/ai/AiUnderstandingApplicationService.js';
import { ViewVisualizationApplicationService } from '../../src/application/view/ViewVisualizationApplicationService.js';
import type { NormalizedMarketEvent } from '../../src/market/Market.types.js';
import type { ServerBroadcastEvent } from '../../src/service/market/ServerBroadcastService.js';
import type { StockHeartbeatEvent } from '../../src/service/market/StockHeartbeatService.js';

describe('AI application services', () => {
  it('turns market events into AI understanding and default decision events', async () => {
    const stockEvents$ = new Subject<StockHeartbeatEvent>();
    const understandingService = new AiUnderstandingApplicationService(stockEvents$.asObservable());
    const decisionService = new AiDecisionApplicationService(understandingService.events$);
    const understandingPromise = firstValueFrom(understandingService.events$);
    const decisionPromise = firstValueFrom(decisionService.events$);

    understandingService.start();
    decisionService.start();
    stockEvents$.next(buildStockEvent('600519.SH'));

    await expect(understandingPromise).resolves.toMatchObject({
      topic: 'application.ai.understanding.created',
      payload: {
        symbol: '600519.SH',
        sourceTopic: 'market.stock.tick',
      },
    });
    await expect(decisionPromise).resolves.toMatchObject({
      topic: 'application.ai.decision.created',
      payload: {
        symbol: '600519.SH',
        action: 'observe',
      },
    });

    understandingService.stop();
    decisionService.stop();
  });
});

describe('ViewVisualizationApplicationService', () => {
  it('stores latest broadcast event for view visualization', () => {
    const broadcastEvents$ = new Subject<ServerBroadcastEvent>();
    const service = new ViewVisualizationApplicationService(broadcastEvents$.asObservable());

    service.start();
    broadcastEvents$.next({
      eventId: 'server.broadcast:1',
      topic: 'server.broadcast.market.stock.tick',
      source: 'ServerBroadcastService',
      traceId: 'trace-1',
      occurredAt: '2026-06-04T01:30:00.000Z',
      payload: {
        channel: 'market.stock.tick',
        data: buildMarketEvent('600519.SH'),
      },
    });

    expect(service.getLatestMarketEvent('600519.SH')?.payload.lastPrice).toBe(1688);
    service.stop();
  });
});

function buildStockEvent(symbol: string): StockHeartbeatEvent {
  const marketEvent = buildMarketEvent(symbol);

  return {
    eventId: `service.stock-heartbeat:${marketEvent.eventId}`,
    topic: 'market.stock.tick',
    source: 'StockHeartbeatService',
    traceId: marketEvent.traceId,
    occurredAt: marketEvent.occurredAt,
    payload: marketEvent,
  };
}

function buildMarketEvent(symbol: string): NormalizedMarketEvent {
  return {
    eventId: `market.stock.tick:${symbol}:1`,
    topic: 'market.stock.tick',
    market: 'CN_A',
    symbol,
    source: 'mock-replay',
    traceId: `trace:${symbol}`,
    occurredAt: '2026-06-04T01:30:00.000Z',
    publishedAt: '2026-06-04T01:30:01.000Z',
    payload: {
      lastPrice: 1688,
      openPrice: 1680,
      highPrice: 1690,
      lowPrice: 1670,
      prevClose: 1660,
      volume: 1000,
      turnover: 1688000,
      changeAmount: 28,
      changePercent: 1.687,
    },
  };
}
