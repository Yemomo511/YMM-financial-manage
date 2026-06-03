export type MarketTopic =
  | 'market.stock.tick'
  | 'market.stock.kline.1m'
  | 'market.stock.news'
  | 'market.stock.announcement'
  | 'market.stock.calendar.changed';

export interface RawMarketQuoteData {
  lastPrice: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  prevClose: number;
  volume: number;
  turnover: number;
}

export interface RawMarketEvent {
  kind: 'quote';
  source: string;
  symbol: string;
  name?: string;
  occurredAt: Date;
  data: RawMarketQuoteData;
}

export interface NormalizedMarketPayload extends RawMarketQuoteData {
  name?: string;
  changeAmount: number;
  changePercent: number;
}

export interface EventEnvelope<T> {
  eventId: string;
  topic: MarketTopic;
  market: 'CN_A';
  symbol?: string;
  source: string;
  traceId: string;
  occurredAt: string;
  publishedAt: string;
  payload: T;
}

export type NormalizedMarketEvent = EventEnvelope<NormalizedMarketPayload>;

export interface AShareSourceAdapter {
  /**
   * 连接 A 股行情源。
   * @returns 连接完成信号
   */
  connect(): Promise<void>;

  /**
   * 断开 A 股行情源。
   * @returns 断开完成信号
   */
  disconnect(): Promise<void>;

  /**
   * 订阅需要轮询的 A 股股票。
   * @param symbols 业务标准股票代码，如 600519.SH
   * @returns 订阅完成信号
   */
  subscribeRealtime(symbols: string[]): Promise<void>;

  /**
   * 输出原始行情事件流。
   * @returns 原始行情异步迭代器
   */
  stream(): AsyncIterableIterator<RawMarketEvent>;
}
