import { describe, expect, it } from 'vitest';
import { MarketNormalizer } from '../../src/source/market/MarketNormalizer.js';

describe('MarketNormalizer', () => {
  it('normalizes a raw A share quote into a market.stock.tick envelope', async () => {
    const normalizer = new MarketNormalizer();

    const events = await normalizer.normalize({
      kind: 'quote',
      source: 'eastmoney-public',
      symbol: '600519.SH',
      name: '贵州茅台',
      occurredAt: new Date('2026-06-03T09:30:01.000Z'),
      data: {
        lastPrice: 1688.12,
        openPrice: 1670,
        highPrice: 1690,
        lowPrice: 1666.66,
        prevClose: 1660,
        volume: 123456,
        turnover: 208000000,
      },
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      topic: 'market.stock.tick',
      market: 'CN_A',
      symbol: '600519.SH',
      source: 'eastmoney-public',
      payload: {
        name: '贵州茅台',
        lastPrice: 1688.12,
        changeAmount: 28.12,
        changePercent: 1.694,
      },
    });
    expect(events[0].eventId).toContain('market.stock.tick');
    expect(events[0].traceId).toContain('eastmoney-public');
  });
});
