import { createServer, type Server as HttpServer } from 'node:http';
import express from 'express';
import { InMemoryEventHubService } from '../event/InMemoryEventHubService.js';
import { EastmoneyPublicAdapter } from '../market/EastmoneyPublicAdapter.js';
import { InMemoryMarketRepository } from '../market/InMemoryMarketRepository.js';
import { MarketNormalizer } from '../market/MarketNormalizer.js';
import { OutboxPublisher } from '../market/OutboxPublisher.js';
import { MarketWebSocketGateway } from '../stream/MarketWebSocketGateway.js';

export interface MarketApplicationOptions {
  port: number;
  symbols: string[];
  pollIntervalMs: number;
  publicDir: string;
}

/**
 * @description A 股实时行情应用。
 * 组合公共源轮询、标准化、内存仓库、Outbox 发布和 WebSocket 看板推送。
 */
export class MarketApplication {
  private readonly app = express();
  private readonly httpServer: HttpServer;
  private readonly adapter: EastmoneyPublicAdapter;
  private readonly normalizer = new MarketNormalizer();
  private readonly repository = new InMemoryMarketRepository();
  private readonly eventHub = new InMemoryEventHubService();
  private readonly outboxPublisher: OutboxPublisher;
  private readonly webSocketGateway: MarketWebSocketGateway;
  private pollTimer?: NodeJS.Timeout;

  constructor(private readonly options: MarketApplicationOptions) {
    this.httpServer = createServer(this.app);
    this.adapter = new EastmoneyPublicAdapter({
      symbols: options.symbols,
      fallbackEnabled: true,
    });
    this.outboxPublisher = new OutboxPublisher(this.repository, this.eventHub);
    this.webSocketGateway = new MarketWebSocketGateway(this.httpServer);
    this.app.use(express.static(options.publicDir));
  }

  /**
   * 启动 HTTP、WebSocket 与行情轮询。
   * @returns 启动完成信号
   */
  async start(): Promise<void> {
    await this.adapter.connect();
    await this.adapter.subscribeRealtime(this.options.symbols);
    await new Promise<void>((resolve) => {
      this.httpServer.listen(this.options.port, '127.0.0.1', resolve);
    });
    await this.pollOnce();
    this.pollTimer = setInterval(() => {
      this.pollOnce().catch((error: unknown) => {
        console.error('market polling failed', error);
      });
    }, this.options.pollIntervalMs);
  }

  /**
   * 停止服务。
   * @returns 停止完成信号
   */
  async stop(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }

    await this.adapter.disconnect();
    await new Promise<void>((resolve) => this.httpServer.close(() => resolve()));
  }

  /**
   * 执行一次行情轮询并向 WebSocket 推送。
   * @returns 处理完成信号
   */
  async pollOnce(): Promise<void> {
    for await (const rawEvent of this.adapter.stream()) {
      const events = await this.normalizer.normalize(rawEvent);
      await this.repository.saveEvents(events);
      await this.repository.updateSnapshots(events);
      await this.repository.appendOutbox(events);
      await this.outboxPublisher.publishPending();

      for (const event of events) {
        this.webSocketGateway.broadcast(event);
      }
    }
  }
}
