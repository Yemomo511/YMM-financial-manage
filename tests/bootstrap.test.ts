import { describe, expect, it } from 'vitest';
import { createMarketApplicationOptions } from '../src/main.js';

describe('createMarketApplicationOptions', () => {
  it('parses service startup options from environment variables', () => {
    const options = createMarketApplicationOptions({
      PORT: '3100',
      WATCH_SYMBOLS: '600519.SH, 000001.SZ',
      POLL_INTERVAL_MS: '1500',
    });

    expect(options).toMatchObject({
      port: 3100,
      symbols: ['600519.SH', '000001.SZ'],
      pollIntervalMs: 1500,
    });
    expect(options.nextDir).toBe(process.cwd());
    expect(options.isDev).toBe(true);
  });
});
