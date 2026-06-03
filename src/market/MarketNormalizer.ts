import type { NormalizedMarketEvent, RawMarketEvent } from './Market.types.js';

/**
 * @description A 股行情标准化器。
 * 将不同来源的原始行情映射为系统统一的市场事件信封。
 */
export class MarketNormalizer {
  /**
   * 标准化原始行情事件。
   * @param raw 原始行情事件
   * @returns 标准化市场事件列表
   */
  async normalize(raw: RawMarketEvent): Promise<NormalizedMarketEvent[]> {
    if (raw.kind !== 'quote') {
      return [];
    }

    const changeAmount = this.roundMarketNumber(raw.data.lastPrice - raw.data.prevClose, 4);
    const changePercent = raw.data.prevClose === 0
      ? 0
      : this.roundMarketNumber((changeAmount / raw.data.prevClose) * 100, 3);
    const occurredAt = raw.occurredAt.toISOString();
    const publishedAt = new Date().toISOString();
    const eventId = [
      'market.stock.tick',
      raw.symbol,
      raw.occurredAt.getTime().toString(),
    ].join(':');
    const traceId = [raw.source, raw.symbol, raw.occurredAt.getTime().toString()].join(':');

    return [
      {
        eventId,
        topic: 'market.stock.tick',
        market: 'CN_A',
        symbol: raw.symbol,
        source: raw.source,
        traceId,
        occurredAt,
        publishedAt,
        payload: {
          ...raw.data,
          name: raw.name,
          changeAmount,
          changePercent,
        },
      },
    ];
  }

  private roundMarketNumber(value: number, precision: number): number {
    const scale = 10 ** precision;

    return Math.round(value * scale) / scale;
  }
}
