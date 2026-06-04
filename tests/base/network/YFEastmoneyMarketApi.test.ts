import { describe, expect, it, vi } from 'vitest';

import { YFEastmoneyMarketApi } from '../../../src/base/network/YFEastmoneyMarketApi.js';

import type { YFNetworkClient } from '../../../src/base/network/base.js';

describe('YFEastmoneyMarketApi', () => {
  it('requests quote data through the network client with eastmoney secid', async () => {
    const request = vi.fn().mockResolvedValue({
      data: {
        data: {
          f43: 168800,
          f57: '600519',
          f58: '贵州茅台',
        },
      },
      headers: {},
      status: 200,
    });
    const client: YFNetworkClient = {
      request,
      use: vi.fn(),
      usePlugin: vi.fn(),
    };
    const api = new YFEastmoneyMarketApi(client);

    const response = await api.getQuote('600519.SH');

    expect(response.data?.f58).toBe('贵州茅台');
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: expect.stringContaining('secid=1.600519'),
      }),
    );
  });
});
