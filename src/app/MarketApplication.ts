import { createServer, type Server as HttpServer } from 'node:http';
import express from 'express';
import { AiDecisionApplicationService } from '../application/ai/AiDecisionApplicationService.js';
import { AiUnderstandingApplicationService } from '../application/ai/AiUnderstandingApplicationService.js';
import { ViewVisualizationApplicationService } from '../application/view/ViewVisualizationApplicationService.js';
import { InMemoryEventHubService } from '../event/InMemoryEventHubService.js';
import { EastmoneyPublicAdapter } from '../source/market/EastmoneyPublicAdapter.js';
import { InMemoryMarketRepository } from '../source/market/InMemoryMarketRepository.js';
import { OutboxPublisher } from '../source/market/OutboxPublisher.js';
import { ServerBroadcastService } from '../service/market/ServerBroadcastService.js';
import { StockHeartbeatService } from '../service/market/StockHeartbeatService.js';
import { MarketWebSocketGateway } from '../stream/MarketWebSocketGateway.js';

export interface MarketApplicationOptions {
  port: number;
  symbols: string[];
  pollIntervalMs: number;
  nextDir: string;
  isDev: boolean;
}

interface NextAppServer {
  prepare(): Promise<void>;
  getRequestHandler(): (request: unknown, response: unknown) => Promise<void>;
}

type NextFactory = (options: { dev: boolean; dir: string; httpServer: HttpServer }) => NextAppServer;

/**
 * @description A 股实时行情应用。
 * 负责组合基础市场能力、服务层心跳广播和应用侧可视化入口。
 */
export class MarketApplication {
  private readonly app = express();
  private readonly httpServer: HttpServer;
  private nextApp?: NextAppServer;
  private nextRequestHandler?: (request: unknown, response: unknown) => Promise<void>;
  private readonly repository = new InMemoryMarketRepository();
  private readonly eventHub = new InMemoryEventHubService();
  private readonly webSocketGateway: MarketWebSocketGateway;
  private readonly stockHeartbeatService: StockHeartbeatService;
  private readonly serverBroadcastService: ServerBroadcastService;
  private readonly aiUnderstandingApplicationService: AiUnderstandingApplicationService;
  private readonly aiDecisionApplicationService: AiDecisionApplicationService;
  private readonly viewVisualizationApplicationService: ViewVisualizationApplicationService;
  private readonly serviceSubscriptions: Array<{ unsubscribe: () => void }> = [];

  constructor(private readonly options: MarketApplicationOptions) {
    this.httpServer = createServer(this.app);
    const adapter = new EastmoneyPublicAdapter({
      symbols: options.symbols,
      fallbackEnabled: true,
    });
    const outboxPublisher = new OutboxPublisher(this.repository, this.eventHub);
    this.webSocketGateway = new MarketWebSocketGateway(this.httpServer);
    this.stockHeartbeatService = new StockHeartbeatService({
      symbols: options.symbols,
      adapter,
      repository: this.repository,
      outboxPublisher,
      intervalMs: options.pollIntervalMs,
    });
    this.serverBroadcastService = new ServerBroadcastService(this.webSocketGateway);
    this.aiUnderstandingApplicationService = new AiUnderstandingApplicationService(
      this.stockHeartbeatService.events$,
    );
    this.aiDecisionApplicationService = new AiDecisionApplicationService(
      this.aiUnderstandingApplicationService.events$,
    );
    this.viewVisualizationApplicationService = new ViewVisualizationApplicationService(
      this.serverBroadcastService.events$,
    );
    this.serviceSubscriptions.push(
      this.stockHeartbeatService.events$.subscribe((event) => {
        this.serverBroadcastService.broadcastMarketEvent(event);
      }),
    );
    this.app.all('*', (request, response) => {
      this.nextRequestHandler?.(request, response);
    });
  }

  /**
   * 启动 HTTP、WebSocket 与行情轮询。
   * @returns 启动完成信号
   */
  async start(): Promise<void> {
    const nextModule = await import('next');
    const createNextServer = (nextModule.default ?? nextModule) as unknown as NextFactory;
    this.nextApp = createNextServer({
      dev: this.options.isDev,
      dir: this.options.nextDir,
      httpServer: this.httpServer,
    });
    this.nextRequestHandler = this.nextApp.getRequestHandler();
    await this.nextApp.prepare();
    await new Promise<void>((resolve) => {
      this.httpServer.listen(this.options.port, '127.0.0.1', resolve);
    });
    this.aiUnderstandingApplicationService.start();
    this.aiDecisionApplicationService.start();
    this.viewVisualizationApplicationService.start();
    await this.stockHeartbeatService.start();
  }

  /**
   * 停止服务。
   * @returns 停止完成信号
   */
  async stop(): Promise<void> {
    for (const subscription of this.serviceSubscriptions) {
      subscription.unsubscribe();
    }

    await this.stockHeartbeatService.stop();
    this.aiUnderstandingApplicationService.stop();
    this.aiDecisionApplicationService.stop();
    this.viewVisualizationApplicationService.stop();
    await new Promise<void>((resolve) => this.httpServer.close(() => resolve()));
  }

  /**
   * 执行一次股票心跳。
   * @returns 处理完成信号
   */
  async pollOnce(): Promise<void> {
    await this.stockHeartbeatService.pulseOnce();
  }
}
