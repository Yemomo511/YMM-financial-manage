import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { InMemoryEventHubService } from '../../src/event/InMemoryEventHubService.js';
import { InMemoryMarketRepository } from '../../src/source/market/InMemoryMarketRepository.js';
import { OutboxPublisher } from '../../src/source/market/OutboxPublisher.js';
import { StockHeartbeatService } from '../../src/service/market/StockHeartbeatService.js';
import type { AShareSourceAdapter, RawMarketEvent } from '../../src/source/market/Market.types.js';

class SingleQuoteAdapter implements AShareSourceAdapter {
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async subscribeRealtime(): Promise<void> {}

  async *stream(): AsyncIterableIterator<RawMarketEvent> {
    yield {
      kind: 'quote',
      source: 'mock-replay',
      symbol: '600519.SH',
      name: '贵州茅台',
      occurredAt: new Date('2026-06-04T01:30:00.000Z'),
      data: {
        lastPrice: 1688,
        openPrice: 1680,
        highPrice: 1690,
        lowPrice: 1670,
        prevClose: 1660,
        volume: 1000,
        turnover: 1688000,
      },
    };
  }
}

describe('StockHeartbeatService', () => {
  it('emits a market.stock.tick service event after one heartbeat pulse', async () => {
    const repository = new InMemoryMarketRepository();
    const outboxPublisher = new OutboxPublisher(repository, new InMemoryEventHubService());
    const service = new StockHeartbeatService({
      symbols: ['600519.SH'],
      adapter: new SingleQuoteAdapter(),
      repository,
      outboxPublisher,
    });
    const eventPromise = firstValueFrom(service.events$);

    await service.pulseOnce();

    await expect(eventPromise).resolves.toMatchObject({
      topic: 'market.stock.tick',
      source: 'StockHeartbeatService',
      payload: {
        symbol: '600519.SH',
        payload: {
          lastPrice: 1688,
        },
      },
    });
    expect(repository.getTicks()).toHaveLength(1);
    expect(repository.getOutboxRecords()[0].status).toBe('published');
  });
});
