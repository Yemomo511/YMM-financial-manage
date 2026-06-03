import { describe, expect, it } from 'vitest';
import { InMemoryEventHubService } from '../../src/event/InMemoryEventHubService.js';
import { InMemoryMarketRepository } from '../../src/market/InMemoryMarketRepository.js';
import { OutboxPublisher } from '../../src/market/OutboxPublisher.js';
import type { NormalizedMarketEvent } from '../../src/market/Market.types.js';

describe('OutboxPublisher', () => {
  it('publishes pending market events and marks outbox records as published', async () => {
    const repository = new InMemoryMarketRepository();
    const eventHub = new InMemoryEventHubService();
    const publisher = new OutboxPublisher(repository, eventHub);
    const event: NormalizedMarketEvent = {
      eventId: 'market.stock.tick:600519.SH:1',
      topic: 'market.stock.tick',
      market: 'CN_A',
      symbol: '600519.SH',
      source: 'mock-replay',
      traceId: 'trace-1',
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

    await repository.saveEvents([event]);
    await repository.updateSnapshots([event]);
    await repository.appendOutbox([event]);
    const count = await publisher.publishPending();

    expect(count).toBe(1);
    expect(repository.getTicks()).toHaveLength(1);
    expect(repository.getSnapshots().get('600519.SH')?.lastPrice).toBe(1688);
    expect(repository.getOutboxRecords()[0].status).toBe('published');
    expect(eventHub.getPublishedMessages('market.stock.tick')).toHaveLength(1);
  });
});
