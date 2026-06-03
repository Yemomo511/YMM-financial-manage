# 模拟炒股系统架构设计

## 1. 文档目标

本文定义模拟炒股系统的总体架构、模块职责、模块之间的关系与初步接口契约。

本文只定义设计，不定义具体实现细节，不约束具体供应商。

## 2. 背景与目标

项目目标是为大模型提供一套接近真实市场环境的 Mock 炒股系统，让模型能够基于统一的账户、行情、规则和事件流做后续决策。

当前阶段的核心目标：

- 为系统建立统一的股票环境抽象
- 以数据库作为业务状态真源
- 以消息队列作为实时事件分发通道
- 为后续大模型接入预留稳定的读写接口
- 当前不接入真实券商账号，不做实盘，不做模型推理

## 3. 设计原则

- `数据库优先`：账户、持仓、观察列表、策略、任务状态以数据库记录为准
- `消息驱动`：行情、账户变化、任务触发等通过事件流传递
- `解耦扩展`：行情接入、模型推理、模拟撮合、风控执行独立分层
- `Mock 先行`：先提供完整抽象和初始数据，再逐步替换成真实数据源
- `可观测性`：任何重要输入、输出、状态变化都可追踪

## 4. 系统边界

### 4.1 本系统负责

- 管理 Mock 账户及其初始资产
- 管理股票基础信息、观察列表、策略配置
- 接收并分发市场行情事件
- 保存行情快照、账户状态、任务记录
- 对外暴露统一的数据读取接口和事件订阅接口
- 为未来的大模型决策与模拟交易提供运行环境

### 4.2 本系统暂不负责

- 真实券商账户接入
- 真实下单
- 大模型推理和交易决策执行
- 复杂回测引擎
- 多市场统一撮合

## 5. 总体架构

```text
+---------------------------+
| Client / Admin / AI Agent |
+-------------+-------------+
              |
              v
+---------------------------+
| API Gateway / BFF         |
+-------------+-------------+
              |
    +---------+---------+
    |                   |
    v                   v
+-----------+    +----------------+
| Query API  |    | Command API    |
+-----------+    +----------------+
    |                   |
    +---------+---------+
              |
              v
+----------------------------------------------+
| Application Layer                             |
| - Account Service                             |
| - Strategy Service                            |
| - Market Data Service                         |
| - Event Hub Service                           |
| - Simulation Service                          |
| - Risk Rule Service                           |
| - AI Context Service                          |
| - Audit Service                               |
+------------------+---------------------------+
                   |
    +--------------+--------------+
    |                             |
    v                             v
+-----------+              +--------------+
| PostgreSQL|              | Redis / MQ   |
+-----------+              +--------------+
    ^                             ^
    |                             |
    +--------------+--------------+
                   |
                   v
         +----------------------+
         | External Data Adapter |
         | A股行情/公告/新闻源     |
         +----------------------+
```

## 6. 核心模块设计

### 6.1 API Gateway / BFF

职责：

- 提供统一 HTTP / WebSocket 入口
- 鉴权、限流、路由
- 对外聚合多个领域服务的数据

核心接口：

```ts
interface GatewayQueryApi {
  getAccountOverview(accountId: string): Promise<AccountOverviewDto>;
  getWatchlist(accountId: string): Promise<WatchlistDto>;
  getMarketSnapshot(symbols: string[]): Promise<MarketSnapshotDto[]>;
}

interface GatewaySubscriptionApi {
  subscribeMarketStream(topics: string[]): AsyncIterable<MarketEventEnvelope>;
  subscribeAccountStream(accountId: string): AsyncIterable<AccountEventEnvelope>;
}
```

### 6.2 Account Service

职责：

- 管理 Mock 账户
- 管理账户余额、可用资金、冻结资金
- 管理持仓、盈亏、资产快照

说明：

- 当前不绑定真实股票账号
- 系统启动时可预置一个或多个模拟账户

核心接口：

```ts
interface AccountService {
  createMockAccount(input: CreateMockAccountInput): Promise<Account>;
  getAccount(accountId: string): Promise<Account>;
  updateCash(accountId: string, command: UpdateCashCommand): Promise<AccountBalance>;
  listPositions(accountId: string): Promise<Position[]>;
  recordPortfolioSnapshot(accountId: string): Promise<void>;
}
```

建议初始账户字段：

- `accountId`
- `accountType`
- `baseCurrency`
- `initialCash`
- `availableCash`
- `frozenCash`
- `totalAsset`
- `riskProfile`
- `maxPositionRatio`
- `maxDailyLossRatio`

### 6.3 Strategy Service

职责：

- 管理用户或 AI 的交易策略配置
- 保存股票池、观察列表、触发规则和风险偏好
- 为后续大模型提供结构化策略上下文

核心接口：

```ts
interface StrategyService {
  createStrategy(input: CreateStrategyInput): Promise<Strategy>;
  updateStrategy(strategyId: string, patch: UpdateStrategyPatch): Promise<Strategy>;
  listStrategies(accountId: string): Promise<Strategy[]>;
  getWatchRules(accountId: string): Promise<WatchRuleSet>;
}
```

### 6.4 Market Data Service

职责：

- 统一接入不同市场数据源
- 规范化 A 股行情、指数、板块、公告、新闻、交易日历等事件
- 更新数据库快照
- 推送消息到事件总线

核心接口：

```ts
interface MarketDataService {
  registerAdapter(adapter: MarketDataAdapter): Promise<void>;
  subscribeSymbols(symbols: string[]): Promise<void>;
  unsubscribeSymbols(symbols: string[]): Promise<void>;
  handleRawEvent(event: RawMarketEvent): Promise<void>;
  getLatestSnapshot(symbol: string): Promise<MarketSnapshot | null>;
}

interface MarketDataAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(symbols: string[]): Promise<void>;
  stream(): AsyncIterable<RawMarketEvent>;
}
```

### 6.5 Event Hub Service

职责：

- 统一管理消息主题、发布、消费与重试策略
- 把数据库中的状态更新与事件分发衔接起来
- 支撑后续大模型、告警、任务编排等异步消费者

核心接口：

```ts
interface EventHubService {
  publish<T>(topic: string, payload: T): Promise<void>;
  publishBatch<T>(topic: string, payloads: T[]): Promise<void>;
  consume<T>(topic: string, groupId: string, handler: EventHandler<T>): Promise<void>;
}

type EventHandler<T> = (message: EventEnvelope<T>) => Promise<void>;
```

### 6.6 Simulation Service

职责：

- 提供模拟交易环境抽象
- 未来根据订单意图完成撮合、成交、持仓结算
- 当前阶段只保留接口和数据库结构占位

核心接口：

```ts
interface SimulationService {
  placeMockOrder(command: PlaceMockOrderCommand): Promise<MockOrder>;
  cancelMockOrder(orderId: string): Promise<void>;
  replayOrderBook(symbol: string): Promise<OrderBookReplayResult>;
}
```

### 6.7 Risk Rule Service

职责：

- 定义账户级和策略级风险约束
- 在未来接入模型与模拟交易时充当统一闸门

核心接口：

```ts
interface RiskRuleService {
  validateOrder(command: ValidateOrderCommand): Promise<RiskCheckResult>;
  evaluateAccount(accountId: string): Promise<AccountRiskStatus>;
}
```

### 6.8 AI Context Service

职责：

- 为未来模型推理准备标准上下文
- 将行情、账户、持仓、策略与风险规则聚合为结构化输入

当前说明：

- 本期不实现模型调用
- 只定义聚合接口与上下文格式

核心接口：

```ts
interface AiContextService {
  buildTradingContext(accountId: string, symbols: string[]): Promise<TradingContext>;
  getLatestDecisionInputs(accountId: string): Promise<DecisionInputBundle>;
}
```

### 6.9 Audit Service

职责：

- 记录行情入库、事件发布、账户变化、策略变更
- 为后续排查“数据是否及时到达”提供证据链

核心接口：

```ts
interface AuditService {
  recordEvent(input: AuditEventInput): Promise<void>;
  queryEvents(filter: AuditEventFilter): Promise<AuditEvent[]>;
}
```

## 7. 模块之间的联系

### 7.1 主数据流

```text
外部行情源
-> Market Data Adapter
-> Market Data Service 标准化
-> PostgreSQL 落库快照/明细
-> Event Hub Service 发布消息
-> 下游消费者订阅
```

### 7.2 账户数据流

```text
初始化脚本/管理端
-> Account Service
-> PostgreSQL
-> Event Hub 发布 account.changed
```

### 7.3 未来模型接入数据流

```text
Market Snapshot + Account + Position + Strategy + Risk Rule
-> AiContextService
-> 决策输入包
-> Model Runtime
-> Simulation / Risk
```

## 8. 数据模型建议

### 8.1 账户域

- `accounts`
- `account_balances`
- `positions`
- `portfolio_snapshots`

### 8.2 行情域

- `stock_symbols`
- `market_ticks`
- `market_quotes`
- `market_kline_1m`
- `market_news`
- `market_announcements`
- `market_trading_calendar`

### 8.3 策略域

- `watchlists`
- `watchlist_symbols`
- `strategies`
- `strategy_rules`

### 8.4 事件与审计域

- `event_outbox`
- `event_consumers`
- `audit_logs`

## 9. 事件主题建议

建议统一采用领域前缀：

- `market.stock.tick`
- `market.stock.quote`
- `market.stock.kline.1m`
- `market.stock.announcement`
- `market.stock.news`
- `account.changed`
- `position.changed`
- `strategy.changed`
- `system.health.changed`

## 10. 对外数据契约建议

### 10.1 市场事件信封

```ts
interface EventEnvelope<T> {
  eventId: string;
  topic: string;
  source: string;
  symbol?: string;
  occurredAt: string;
  publishedAt: string;
  payload: T;
  traceId: string;
}
```

### 10.2 交易上下文

```ts
interface TradingContext {
  account: AccountOverview;
  positions: Position[];
  watchlist: string[];
  market: MarketSnapshot[];
  strategy: Strategy[];
  risk: AccountRiskProfile;
}
```

## 11. 技术选型建议

建议基于 Node.js 生态落地：

- 运行时：`Node.js`
- 语言：`TypeScript`
- 服务框架：`NestJS`
- 数据库：`PostgreSQL`
- 缓存与消息队列：`Redis` + `BullMQ` 或 `Redis Stream`
- 实时订阅：`WebSocket`
- ORM：`Prisma`

说明：

- 如果后续要求更强的消息顺序和消费者组能力，可替换为 Kafka
- 第一阶段可先使用 Redis 体系降低复杂度

## 12. 非功能要求

- 行情事件从接入到入队应可观测
- 所有事件必须包含 `traceId`
- 支持事件重试与死信处理
- 数据库写入失败时不得丢失原始事件
- 系统必须支持后续增加更多市场，如港股、美股、期货和汇率

## 13. 里程碑建议

### 阶段 A

- 完成 A 股监听
- 完成事件队列
- 完成行情标准化与入库

### 阶段 B

- 完成 Mock 账户与持仓体系
- 完成 AI Context 聚合接口

### 阶段 C

- 接入模型决策
- 接入模拟撮合与风控执行

## 14. 验收标准

- 能创建并读取 Mock 账户及初始资产
- 能接收 A 股行情并落库
- 能将行情事件发布到统一消息主题
- 能通过统一接口读取账户、持仓、观察列表和市场快照
- 模型模块尚未接入时，架构仍然闭环可运行
