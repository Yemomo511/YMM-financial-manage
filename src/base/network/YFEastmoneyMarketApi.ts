import { yfNetworkClient } from './base.js';

import type { YFNetworkClient } from './base.js';

export interface YFEastmoneyQuoteData {
  f43?: number;
  f44?: number;
  f45?: number;
  f46?: number;
  f47?: number;
  f57?: string;
  f58?: string;
  f60?: number;
  f168?: number;
  f170?: number;
}

export interface YFEastmoneyQuoteResponse {
  data?: YFEastmoneyQuoteData;
}

export class YFEastmoneyMarketApi {
  constructor(private readonly client: YFNetworkClient = yfNetworkClient) {}

  async getQuote(symbol: string): Promise<YFEastmoneyQuoteResponse> {
    const response = await this.client.request<YFEastmoneyQuoteResponse>({
      method: 'GET',
      timeoutMs: 5000,
      url: this.buildQuoteUrl(symbol),
    });

    return response.data;
  }

  private buildQuoteUrl(symbol: string): string {
    const fields = [
      'f43',
      'f44',
      'f45',
      'f46',
      'f47',
      'f57',
      'f58',
      'f60',
      'f168',
      'f170',
    ].join(',');

    return `https://push2.eastmoney.com/api/qt/stock/get?secid=${this.toEastmoneySecid(symbol)}&fields=${fields}`;
  }

  private toEastmoneySecid(symbol: string): string {
    const [code, exchange] = symbol.split('.');

    if (exchange === 'SH') {
      return `1.${code}`;
    }

    return `0.${code}`;
  }
}
