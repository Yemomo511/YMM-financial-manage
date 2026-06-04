import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';

import { createYFNetworkClient } from '../../../src/base/network/base.js';

import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

describe('YFNetworkClient', () => {
  it('runs request and response middleware around axios requests', async () => {
    const order: string[] = [];
    const adapter: AxiosAdapter = async (config) => {
      order.push('adapter');

      return {
        config: config as InternalAxiosRequestConfig,
        data: { ok: true },
        headers: {},
        request: {},
        status: 200,
        statusText: 'OK',
      };
    };
    const client = createYFNetworkClient({
      adapter,
      middlewares: [
        {
          onRequest: (config) => {
            order.push('request');

            return {
              ...config,
              headers: {
                ...config.headers,
                'x-test': 'enabled',
              },
            };
          },
          onResponse: (response) => {
            order.push('response');

            return response;
          },
        },
      ],
    });

    const response = await client.request<{ ok: boolean }>({
      method: 'GET',
      url: 'https://example.com/quote',
    });

    expect(response.data).toEqual({ ok: true });
    expect(order).toEqual(['request', 'adapter', 'response']);
  });

  it('wraps axios errors and lets middleware observe network failures', async () => {
    const errorOrder: string[] = [];
    const adapter: AxiosAdapter = async (config) => {
      const response: AxiosResponse = {
        config: config as InternalAxiosRequestConfig,
        data: { message: 'unavailable' },
        headers: {},
        request: {},
        status: 503,
        statusText: 'Service Unavailable',
      };

      throw new AxiosError(
        'upstream failed',
        'ERR_BAD_RESPONSE',
        config as InternalAxiosRequestConfig,
        {},
        response,
      );
    };
    const client = createYFNetworkClient({
      adapter,
      middlewares: [
        {
          onError: (error) => {
            errorOrder.push(`${error.status}:${error.code}`);
          },
        },
      ],
    });

    await expect(
      client.request({
        method: 'GET',
        url: 'https://example.com/quote',
      }),
    ).rejects.toMatchObject({
      code: 'ERR_BAD_RESPONSE',
      status: 503,
      url: 'https://example.com/quote',
    });
    expect(errorOrder).toEqual(['503:ERR_BAD_RESPONSE']);
  });
});
