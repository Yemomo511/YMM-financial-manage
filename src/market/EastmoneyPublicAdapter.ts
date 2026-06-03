import type { AShareSourceAdapter, RawMarketEvent, RawMarketQuoteData } from './Market.types.js';

export interface EastmoneyPublicAdapterOptions {
  symbols: string[];
  fallbackEnabled?: boolean;
  fetchQuote?: (url: string) => Promise<unknown>;
}

interface EastmoneyQuoteResponse {
  data?: {
    f43?: number;
    f44?: number;
    f45?: number;
    f46?: number;
    f47?: number;
    f57?: string;
    f58?: string;
    f60?: number;
    f170?: number;
    f168?: number;
  };
}

/**
 * @description 东方财富公共行情 Adapter。
 * 通过公开 HTTP 行情接口轮询 A 股数据，并在公共源不可用时生成 Mock 回放事件。
 */
export class EastmoneyPublicAdapter implements AShareSourceAdapter {
  private connected = false;
  private symbols: string[];
  private readonly fallbackEnabled: boolean;
  private readonly fetchQuote: (url: string) => Promise<unknown>;

  constructor(options: EastmoneyPublicAdapterOptions) {
    this.symbols = options.symbols;
    this.fallbackEnabled = options.fallbackEnabled ?? true;
    this.fetchQuote = options.fetchQuote ?? this.defaultFetchQuote;
  }

  /**
   * 连接公共行情源。
   * @returns 连接完成信号
   */
  async connect(): Promise<void> {
    this.connected = true;
  }

  /**
   * 断开公共行情源。
   * @returns 断开完成信号
   */
  async disconnect(): Promise<void> {
    this.connected = false;
  }

  /**
   * 订阅需要轮询的 A 股股票。
   * @param symbols 业务标准股票代码，如 600519.SH
   * @returns 订阅完成信号
   */
  async subscribeRealtime(symbols: string[]): Promise<void> {
    this.symbols = symbols;
  }

  /**
   * 输出原始行情事件流。
   * @returns 原始行情异步迭代器
   */
  async *stream(): AsyncIterableIterator<RawMarketEvent> {
    if (!this.connected) {
      await this.connect();
    }

    for (const symbol of this.symbols) {
      yield await this.readQuoteWithFallback(symbol);
    }
  }

  /**
   * 将标准 A 股 symbol 转换为东方财富 secid。
   * @param symbol 业务标准股票代码，如 600519.SH
   * @returns 东方财富 secid，如 1.600519
   */
  toEastmoneySecid(symbol: string): string {
    const [code, exchange] = symbol.split('.');

    if (exchange === 'SH') {
      return `1.${code}`;
    }

    return `0.${code}`;
  }

  private async readQuoteWithFallback(symbol: string): Promise<RawMarketEvent> {
    try {
      const response = await this.fetchQuote(this.buildQuoteUrl(symbol));

      return this.parseQuoteResponse(symbol, response as EastmoneyQuoteResponse);
    } catch (error) {
      if (!this.fallbackEnabled) {
        throw error;
      }

      return this.buildMockQuote(symbol);
    }
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

  private parseQuoteResponse(symbol: string, response: EastmoneyQuoteResponse): RawMarketEvent {
    const data = response.data;

    if (!data) {
      throw new Error(`Eastmoney response missing data for ${symbol}`);
    }

    return {
      kind: 'quote',
      source: 'eastmoney-public',
      symbol,
      name: data.f58,
      occurredAt: new Date(),
      data: {
        lastPrice: this.parseEastmoneyPrice(data.f43),
        highPrice: this.parseEastmoneyPrice(data.f44),
        lowPrice: this.parseEastmoneyPrice(data.f45),
        openPrice: this.parseEastmoneyPrice(data.f46),
        volume: data.f47 ?? 0,
        prevClose: this.parseEastmoneyPrice(data.f60),
        turnover: data.f168 ?? 0,
      },
    };
  }

  private parseEastmoneyPrice(value: number | undefined): number {
    if (value === undefined || value < 0) {
      return 0;
    }

    return value / 100;
  }

  private buildMockQuote(symbol: string): RawMarketEvent {
    const basePrice = symbol.startsWith('600519') ? 1688 : 12.34;
    const drift = (Date.now() % 1000) / 1000;
    const lastPrice = Math.round((basePrice + drift) * 100) / 100;
    const quoteData: RawMarketQuoteData = {
      lastPrice,
      openPrice: basePrice,
      highPrice: lastPrice + 1,
      lowPrice: basePrice - 1,
      prevClose: basePrice - 2,
      volume: 100000 + Math.floor(drift * 1000),
      turnover: Math.round(lastPrice * 100000),
    };

    return {
      kind: 'quote',
      source: 'mock-replay',
      symbol,
      name: symbol,
      occurredAt: new Date(),
      data: quoteData,
    };
  }

  private async defaultFetchQuote(url: string): Promise<unknown> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Eastmoney request failed: ${response.status}`);
    }

    return response.json();
  }
}
