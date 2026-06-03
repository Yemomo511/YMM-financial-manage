# 模拟炒股系统一期实现方案 A

## 1. 任务目标

本期只完成 A 股市场监听和消息队列能力，建立“数据进入系统并及时抵达下游”的基础设施。

本期不包含：

- 大模型接入
- 模拟下单与撮合
- 真实券商账号接入
- 用户级复杂策略执行

本期核心要求：

- 持续监听 A 股相关信息
- 将信息标准化后落入数据库
- 通过消息队列及时分发
- 为未来大模型提供可读的账户与市场上下文基础

## 2. 一期范围

### 2.1 必做范围

- A 股股票基础信息同步
- A 股实时行情监听
- A 股分钟级 K 线更新
- A 股新闻与公告监听
- A 股交易日历同步
- 消息队列主题定义与发布消费链路
- Mock 账户初始化
- 数据库表结构设计
- 基础监控与审计

### 2.2 非目标

- 盘口深度回放
- 订单簿撮合
- 自动交易
- 模型决策
- 回测系统

## 3. 一期总体方案

### 3.1 总体思路

采用“采集层 -> 标准化层 -> 存储层 -> 事件分发层 -> 消费层”的五段式链路。

```text
A股数据源
-> Listener Worker
-> Market Normalizer
-> PostgreSQL
-> Outbox / MQ Publisher
-> Redis Stream / BullMQ Topic
-> Consumer Worker
```

### 3.2 为什么这样设计

- 监听与消费解耦，便于后续单独扩容
- 数据先入库再分发，保证数据库是真源
- 事件通过 Outbox 发布，降低“入库成功但消息丢失”的风险
- 后续模型接入时只需增加新的消费组，不影响现有链路

## 4. 一期模块拆分

### 4.1 AShareSourceAdapter

职责：

- 连接一个或多个 A 股数据源
- 拉取或订阅原始事件
- 统一输出 `RawMarketEvent`

说明：

- 一期允许先从单一数据源接入
- 如真实源受限，可增加 `MockReplayAdapter` 用本地样本回放

接口：

```ts
interface AShareSourceAdapter {
  connect(): Promise<void>;
  syncSymbols(): Promise<void>;
  syncTradingCalendar(): Promise<void>;
  subscribeRealtime(symbols: string[]): Promise<void>;
  stream(): AsyncIterable<RawMarketEvent>;
}
```

### 4.2 MarketIngestWorker

职责：

- 从 `AShareSourceAdapter` 持续读取原始事件
- 写入接入日志
- 调用标准化模块

接口：

```ts
interface MarketIngestWorker {
  start(): Promise<void>;
  stop(): Promise<void>;
  handle(event: RawMarketEvent): Promise<void>;
}
```

### 4.3 MarketNormalizer

职责：

- 将原始事件转换为系统统一结构
- 补齐标准字段，如 `symbol`、`market`、`eventType`、`occurredAt`
- 把不同来源映射到内部事件模型

接口：

```ts
interface MarketNormalizer {
  normalize(raw: RawMarketEvent): Promise<NormalizedMarketEvent[]>;
}
```

### 4.4 MarketRepository

职责：

- 把标准化后的事件写入数据库
- 更新最新快照表
- 写入 Outbox 待发布记录

接口：

```ts
interface MarketRepository {
  saveEvents(events: NormalizedMarketEvent[]): Promise<void>;
  updateSnapshots(events: NormalizedMarketEvent[]): Promise<void>;
  appendOutbox(events: NormalizedMarketEvent[]): Promise<void>;
}
```

### 4.5 OutboxPublisher

职责：

- 扫描未发布 Outbox 记录
- 将事件投递到 MQ
- 回写发布状态

接口：

```ts
interface OutboxPublisher {
  publishPending(): Promise<number>;
  markPublished(eventIds: string[]): Promise<void>;
  markFailed(eventId: string, reason: string): Promise<void>;
}
```

### 4.6 QueueConsumerWorker

职责：

- 订阅 MQ 中的市场主题
- 供后续模型、告警、看板等模块消费
- 当前一期先实现日志消费和缓存更新消费

接口：

```ts
interface QueueConsumerWorker {
  subscribe(topics: string[], groupId: string): Promise<void>;
  handle(message: EventEnvelope<NormalizedMarketPayload>): Promise<void>;
}
```

### 4.7 MockAccountBootstrap

职责：

- 初始化系统中的模拟账户
- 提供给未来模型读取的基础账户信息

接口：

```ts
interface MockAccountBootstrap {
  bootstrapDefaultAccounts(): Promise<void>;
}
```

建议默认账户：

```json
{
  "accountId": "mock-cn-a-001",
  "accountName": "A股模拟账户",
  "baseCurrency": "CNY",
  "initialCash": 1000000,
  "availableCash": 1000000,
  "frozenCash": 0,
  "totalAsset": 1000000,
  "riskProfile": "balanced",
  "maxPositionRatio": 0.2,
  "maxDailyLossRatio": 0.03
}
```

## 5. A 股信息覆盖范围

为了保证“A 股相关信息能够及时抵达”，一期建议覆盖以下数据类别。

### 5.1 基础静态信息

- 股票代码
- 股票名称
- 所属交易所
- 行业板块
- 上市状态

### 5.2 实时行情

- 最新价
- 开盘价
- 最高价
- 最低价
- 昨收价
- 成交量
- 成交额
- 涨跌额
- 涨跌幅

### 5.3 分钟级聚合

- 1 分钟 K 线
- 可选扩展 5 分钟、15 分钟聚合

### 5.4 市场事件

- 公司公告
- 财报披露
- 停复牌状态
- 交易日历
- 新闻快讯

## 6. 数据库设计

### 6.1 核心表

#### `accounts`

- `id`
- `account_id`
- `account_name`
- `base_currency`
- `account_type`
- `risk_profile`
- `created_at`
- `updated_at`

#### `account_balances`

- `id`
- `account_id`
- `initial_cash`
- `available_cash`
- `frozen_cash`
- `total_asset`
- `updated_at`

#### `stock_symbols`

- `id`
- `symbol`
- `market`
- `exchange`
- `name`
- `industry`
- `status`
- `updated_at`

#### `market_ticks`

- `id`
- `symbol`
- `market`
- `price`
- `open_price`
- `high_price`
- `low_price`
- `prev_close`
- `volume`
- `turnover`
- `change_amount`
- `change_percent`
- `occurred_at`
- `source`
- `trace_id`

#### `market_quote_snapshots`

- `symbol`
- `market`
- `last_price`
- `open_price`
- `high_price`
- `low_price`
- `prev_close`
- `volume`
- `turnover`
- `change_amount`
- `change_percent`
- `snapshot_at`

#### `market_kline_1m`

- `id`
- `symbol`
- `market`
- `bucket_at`
- `open_price`
- `high_price`
- `low_price`
- `close_price`
- `volume`
- `turnover`

#### `market_news`

- `id`
- `symbol`
- `title`
- `summary`
- `published_at`
- `source`
- `trace_id`

#### `market_announcements`

- `id`
- `symbol`
- `announcement_type`
- `title`
- `url`
- `published_at`
- `source`
- `trace_id`

#### `market_trading_calendar`

- `id`
- `market`
- `trade_date`
- `is_open`
- `session_type`

#### `event_outbox`

- `id`
- `event_id`
- `topic`
- `payload`
- `status`
- `retry_count`
- `last_error`
- `created_at`
- `published_at`

#### `audit_logs`

- `id`
- `trace_id`
- `event_type`
- `source`
- `message`
- `payload`
- `created_at`

## 7. 消息队列设计

### 7.1 一期建议

Node.js 方案下一期可优先使用：

- `Redis Stream`
  或
- `BullMQ`

建议优先：

- 实时市场事件使用 `Redis Stream`
- 后台重试、补偿、异步任务使用 `BullMQ`

这样可以兼顾低接入成本与后续扩展。

### 7.2 Topic 定义

- `market.stock.symbol.changed`
- `market.stock.tick`
- `market.stock.kline.1m`
- `market.stock.news`
- `market.stock.announcement`
- `market.stock.calendar.changed`
- `system.audit.market`

### 7.3 事件结构

```ts
interface EventEnvelope<T> {
  eventId: string;
  topic: string;
  market: 'CN_A';
  symbol?: string;
  source: string;
  traceId: string;
  occurredAt: string;
  publishedAt: string;
  payload: T;
}
```

### 7.4 消费组建议

- `cache-updater`
- `dashboard-streamer`
- `audit-recorder`
- `future-ai-consumer`

说明：

- 本期先实现前三个
- `future-ai-consumer` 只预留组名，不实现逻辑

## 8. 数据时效性设计

### 8.1 时效目标

- 实时行情：进入系统后 `1-3 秒` 内完成标准化、落库与入队
- 公告与新闻：抓取后 `10 秒` 内完成落库与发布
- 静态信息与交易日历：按日或按配置周期同步

### 8.2 保证方式

- `常驻监听`：Listener Worker 常驻运行
- `内存缓冲`：短时间聚合高频事件，减少单条写库开销
- `批量入库`：按小批次写入数据库
- `Outbox`：确保数据库状态和消息发布可补偿
- `消费者组`：避免单消费者阻塞全部链路
- `监控告警`：事件积压、发布失败、延迟超阈值时告警

## 9. 任务编排建议

### 9.1 启动顺序

1. 初始化数据库连接
2. 初始化 Redis 与队列
3. 执行 `MockAccountBootstrap`
4. 同步 `stock_symbols`
5. 同步 `market_trading_calendar`
6. 启动 `OutboxPublisher`
7. 启动 `QueueConsumerWorker`
8. 启动 `MarketIngestWorker`

### 9.2 定时任务

- `sync-symbols-daily`
- `sync-calendar-daily`
- `publish-outbox-every-1s`
- `audit-lag-check-every-30s`

## 10. API 初步定义

### 10.1 查询接口

```ts
interface MarketQueryApi {
  getQuote(symbol: string): Promise<QuoteSnapshotDto | null>;
  getQuotes(symbols: string[]): Promise<QuoteSnapshotDto[]>;
  getKline1m(symbol: string, limit: number): Promise<KlineDto[]>;
  getAnnouncements(symbol: string, limit: number): Promise<AnnouncementDto[]>;
  getNews(symbol: string, limit: number): Promise<NewsDto[]>;
}

interface AccountQueryApi {
  getMockAccount(accountId: string): Promise<AccountOverviewDto>;
}
```

### 10.2 订阅接口

```ts
interface StreamApi {
  subscribeMarket(topics: string[], symbols?: string[]): AsyncIterable<EventEnvelope<unknown>>;
}
```

## 11. 日志与审计

### 11.1 必须记录

- 数据源连接成功/失败
- 订阅成功/失败
- 原始事件接收数量
- 标准化成功/失败
- 数据库入库成功/失败
- Outbox 发布成功/失败
- 消费组处理延迟

### 11.2 关键指标

- `ingest_events_per_second`
- `normalize_latency_ms`
- `db_write_latency_ms`
- `outbox_pending_count`
- `mq_publish_latency_ms`
- `consumer_lag_count`

## 12. 风险与补偿

### 12.1 风险点

- 上游数据源短暂断连
- 高频行情导致消息积压
- 数据库写入抖动
- 消息发布成功但消费者阻塞

### 12.2 补偿策略

- 自动重连
- 小批量缓冲写入
- Outbox 重试
- 死信队列
- 启动时补扫未发布事件

## 13. 本期验收标准

- 系统启动后可自动创建至少一个 Mock A 股账户
- 可持续接收 A 股行情并写入 `market_ticks` 与 `market_quote_snapshots`
- 可写入 1 分钟 K 线、公告、新闻和交易日历数据
- 可将标准化后的事件推送到统一 MQ Topic
- 有至少一个消费者成功消费并记录审计日志
- 数据链路延迟可监控，可定位“是否及时抵达”

## 14. 后续衔接

本期完成后，下一阶段可以直接新增：

- `AiContextService` 消费组
- 策略规则服务
- 模拟下单服务
- 风控校验服务

这样可以在不改动 A 股监听主链路的前提下，逐步把模型能力挂接进来。
