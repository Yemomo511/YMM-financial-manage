import type { Observable, Subscription } from 'rxjs';
import type { NormalizedMarketEvent } from '../../source/market/Market.types.js';
import type { ServerBroadcastEvent } from '../../service/market/ServerBroadcastService.js';

/**
 * @description 视图可视化应用服务。
 * 订阅服务端广播事件，维护看板侧可读取的最新行情视图状态。
 */
export class ViewVisualizationApplicationService {
  private readonly latestMarketEvents = new Map<string, NormalizedMarketEvent>();
  private subscription?: Subscription;

  constructor(private readonly broadcastEvents$: Observable<ServerBroadcastEvent>) {}

  /**
   * 启动视图状态订阅。
   * @returns 启动完成信号
   */
  start(): void {
    this.subscription = this.broadcastEvents$.subscribe((event) => {
      const marketEvent = event.payload.data;

      if (marketEvent.symbol) {
        this.latestMarketEvents.set(marketEvent.symbol, marketEvent);
      }
    });
  }

  /**
   * 停止视图状态订阅。
   * @returns 停止完成信号
   */
  stop(): void {
    this.subscription?.unsubscribe();
  }

  /**
   * 查询指定股票的最新可视化行情事件。
   * @param symbol 股票代码
   * @returns 最新行情事件，不存在时返回 undefined
   */
  getLatestMarketEvent(symbol: string): NormalizedMarketEvent | undefined {
    return this.latestMarketEvents.get(symbol);
  }
}
