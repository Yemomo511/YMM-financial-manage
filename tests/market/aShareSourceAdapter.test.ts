import { describe, expect, it, vi } from 'vitest';
import { EastmoneyPublicAdapter } from '../../src/market/EastmoneyPublicAdapter.js';

describe('EastmoneyPublicAdapter', () => {
  it('maps A share symbols to eastmoney secids and falls back to mock quotes when fetch fails', async () => {
    const fetchQuote = vi.fn().mockRejectedValue(new Error('network unavailable'));
    const adapter = new EastmoneyPublicAdapter({
      fetchQuote,
      fallbackEnabled: true,
      symbols: ['600519.SH', '000001.SZ'],
    });

    await adapter.connect();
    await adapter.subscribeRealtime(['600519.SH']);

    const stream = adapter.stream();
    const firstEvent = await stream.next();

    expect(adapter.toEastmoneySecid('600519.SH')).toBe('1.600519');
    expect(adapter.toEastmoneySecid('000001.SZ')).toBe('0.000001');
    expect(firstEvent.value).toMatchObject({
      kind: 'quote',
      source: 'mock-replay',
      symbol: '600519.SH',
    });
    expect(firstEvent.value.data.lastPrice).toBeGreaterThan(0);
  });
});
