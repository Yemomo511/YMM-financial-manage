import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import WebSocket from 'ws';
import { afterEach, describe, expect, it } from 'vitest';
import { MarketWebSocketGateway } from '../../src/stream/MarketWebSocketGateway.js';
import type { NormalizedMarketEvent } from '../../src/market/Market.types.js';

const servers: Array<{ close: () => void }> = [];

describe('MarketWebSocketGateway', () => {
  afterEach(() => {
    for (const server of servers.splice(0)) {
      server.close();
    }
  });

  it('pushes market.stock.tick events only to matching websocket subscribers', async () => {
    const httpServer = createServer();
    const gateway = new MarketWebSocketGateway(httpServer);
    const event = buildTickEvent('600519.SH');

    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    servers.push(httpServer);
    const port = (httpServer.address() as AddressInfo).port;
    const client = new WebSocket(`ws://127.0.0.1:${port}/ws/market`);
    servers.push(client);

    const message = await new Promise<NormalizedMarketEvent>((resolve) => {
      client.on('open', () => {
        client.send(JSON.stringify({
          type: 'subscribe',
          topics: ['market.stock.tick'],
          symbols: ['600519.SH'],
        }));
        gateway.broadcast(event);
      });
      client.on('message', (data) => resolve(JSON.parse(data.toString()) as NormalizedMarketEvent));
    });

    expect(message).toMatchObject({
      topic: 'market.stock.tick',
      symbol: '600519.SH',
      payload: {
        lastPrice: 1688,
      },
    });
  });
});

function buildTickEvent(symbol: string): NormalizedMarketEvent {
  return {
    eventId: `market.stock.tick:${symbol}:1`,
    topic: 'market.stock.tick',
    market: 'CN_A',
    symbol,
    source: 'mock-replay',
    traceId: `trace:${symbol}`,
    occurredAt: '2026-06-03T09:30:00.000Z',
    publishedAt: '2026-06-03T09:30:01.000Z',
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
