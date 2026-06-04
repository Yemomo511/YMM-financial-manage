import type { IncomingMessage, Server as HttpServer } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import type { MarketTopic, NormalizedMarketEvent } from '../source/market/Market.types.js';

interface MarketSubscriptionMessage {
  type: 'subscribe';
  topics: MarketTopic[];
  symbols?: string[];
}

interface ClientSubscription {
  topics: Set<string>;
  symbols: Set<string>;
}

/**
 * @description 行情 WebSocket 网关。
 * 管理 `/ws/market` 客户端订阅，并按 topic 与 symbol 过滤推送标准市场事件。
 */
export class MarketWebSocketGateway {
  private readonly webSocketServer: WebSocketServer;
  private readonly subscriptions = new Map<WebSocket, ClientSubscription>();

  constructor(httpServer: HttpServer) {
    this.webSocketServer = new WebSocketServer({ noServer: true });
    httpServer.on('upgrade', (request, socket, head) => {
      if (!this.shouldHandleUpgrade(request)) {
        return;
      }

      this.webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
        this.webSocketServer.emit('connection', webSocket, request);
      });
    });
    this.webSocketServer.on('connection', (socket) => this.handleConnection(socket));
  }

  /**
   * 广播标准化行情事件。
   * @param event 标准化行情事件
   * @returns 广播完成信号
   */
  broadcast(event: NormalizedMarketEvent): void {
    for (const [socket, subscription] of this.subscriptions.entries()) {
      if (socket.readyState !== WebSocket.OPEN || !this.shouldReceiveEvent(subscription, event)) {
        continue;
      }

      socket.send(JSON.stringify(event));
    }
  }

  private handleConnection(socket: WebSocket): void {
    this.subscriptions.set(socket, {
      topics: new Set(['market.stock.tick']),
      symbols: new Set(),
    });

    socket.on('message', (data) => this.handleMessage(socket, data.toString()));
    socket.on('close', () => {
      this.subscriptions.delete(socket);
    });
  }

  private handleMessage(socket: WebSocket, message: string): void {
    const parsed = this.parseSubscriptionMessage(message);

    if (!parsed) {
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Invalid subscription message',
      }));
      return;
    }

    this.subscriptions.set(socket, {
      topics: new Set(parsed.topics),
      symbols: new Set(parsed.symbols ?? []),
    });
  }

  private parseSubscriptionMessage(message: string): MarketSubscriptionMessage | null {
    try {
      const parsed = JSON.parse(message) as MarketSubscriptionMessage;

      if (parsed.type !== 'subscribe' || !Array.isArray(parsed.topics)) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  private shouldHandleUpgrade(request: IncomingMessage): boolean {
    const requestUrl = request.url ?? '';
    const queryIndex = requestUrl.indexOf('?');
    const pathname = queryIndex === -1 ? requestUrl : requestUrl.slice(0, queryIndex);

    return pathname === '/ws/market';
  }

  private shouldReceiveEvent(subscription: ClientSubscription, event: NormalizedMarketEvent): boolean {
    const topicMatched = subscription.topics.has(event.topic);
    const symbolMatched = subscription.symbols.size === 0
      || (event.symbol !== undefined && subscription.symbols.has(event.symbol));

    return topicMatched && symbolMatched;
  }
}
