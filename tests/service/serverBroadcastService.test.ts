import { firstValueFrom } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ServerBroadcastService } from '../../src/service/market/ServerBroadcastService.js';
import type { NormalizedMarketEvent } from '../../src/source/market/Market.types.js';

describe('ServerBroadcastService', () => {
  it('receives stock heartbeat events and broadcasts the market payload through websocket gateway', async () => {
    const gateway = {
      broadcast: vi.fn(),
    };
    const service = new ServerBroadcastService(gateway);
    const eventPromise = firstValueFrom(service.events$);
    const marketEvent = buildTickEvent();

    service.broadcastMarketEvent({
      eventId: 'service:event:1',
      topic: 'market.stock.tick',
      source: 'StockHeartbeatService',
      traceId: marketEvent.traceId,
      occurredAt: marketEvent.occurredAt,
      payload: marketEvent,
    });

    await expect(eventPromise).resolves.toMatchObject({
      topic: 'server.broadcast.market.stock.tick',
      source: 'ServerBroadcastService',
      payload: {
        channel: 'market.stock.tick',
      },
    });
    expect(gateway.broadcast).toHaveBeenCalledWith(marketEvent);
  });
});

function buildTickEvent(): NormalizedMarketEvent {
  return {
    eventId: 'market.stock.tick:600519.SH:1',
    topic: 'market.stock.tick',
    market: 'CN_A',
    symbol: '600519.SH',
    source: 'mock-replay',
    traceId: 'trace-1',
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
