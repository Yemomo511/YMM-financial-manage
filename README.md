# YMM-financial-manage
Mock Financial Manage. Plan For Stock, Exchange rate, Futures And Interest rate

# 为什么做这个
这个应用作为我副业来进行把，上班本身在 AI 的加持下其实硬增长力不高，自己又有打算炒股的想法，搞点宏观经济学，做点理财策略，正好两者不冲突。
核心目的
- 做不做得出来，好不好无所谓，了解一下经济学的相关知识，看看理财策略，模拟交易看看
- 基于 AI 做的应用，为 AI 提供 Mock 交易接口，精进一下自己在 AI 方面的探索
- 本项目将完全基于 AI 来完成，加强 AI Coding / Harness 的能力

## A 股实时行情 WebSocket 一期

当前一期已落地一个最小可运行的 Node.js + TypeScript 服务：

- 使用东方财富公共 HTTP 行情源轮询 A 股行情
- 公共源不可用时自动使用 Mock 回放，保证本地链路可验收
- 将行情标准化为 `market.stock.tick` 事件
- 写入内存行情仓库、快照和 Outbox，并可发布到 Redis Stream 适配器
- 通过 `/ws/market` WebSocket 推送给浏览器
- 使用 Next.js React JSX 实现本地实时行情看板

### 当前分层架构

运行时已拆成三层：

- 基础市场能力层：`src/market`、`src/event`、`src/account`
- 服务层：`src/service`，包含 RxJS 服务事件总线、股票心跳和服务端广播
- 应用侧：`src/application`，包含 AI 理解、AI 决策和视图可视化占位服务
- UI 层：`app/page.tsx`、`app/layout.tsx`、`app/globals.css`，由 Next.js 渲染

核心事件链路：

```text
股票心跳服务
-> market.stock.tick 服务事件
-> 服务端广播服务
-> /ws/market
-> 行情看板
```

AI 链路当前为接口占位：

```text
market.stock.tick
-> AI 理解事件
-> AI 决策事件 observe
```

### 本地启动

```bash
pnpm install
cp .env.example .env
pnpm dev
```

打开：

```text
http://127.0.0.1:3000
```

默认订阅：

```text
600519.SH,000001.SZ
```

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000` | HTTP 与 WebSocket 服务端口 |
| `WATCH_SYMBOLS` | `600519.SH,000001.SZ` | 默认轮询的 A 股代码，逗号分隔 |
| `POLL_INTERVAL_MS` | `3000` | 行情轮询间隔 |
| `DATABASE_URL` | 见 `.env.example` | Prisma/PostgreSQL 连接串 |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Redis Stream 连接串 |

### WebSocket 订阅协议

连接地址：

```text
ws://127.0.0.1:3000/ws/market
```

客户端发送：

```json
{
  "type": "subscribe",
  "topics": ["market.stock.tick"],
  "symbols": ["600519.SH", "000001.SZ"]
}
```

服务端推送：

```json
{
  "eventId": "market.stock.tick:600519.SH:1780488345909",
  "topic": "market.stock.tick",
  "market": "CN_A",
  "symbol": "600519.SH",
  "source": "eastmoney-public",
  "traceId": "eastmoney-public:600519.SH:1780488345909",
  "occurredAt": "2026-06-03T12:05:45.909Z",
  "publishedAt": "2026-06-03T12:05:45.910Z",
  "payload": {
    "lastPrice": 1281.91,
    "changeAmount": 0,
    "changePercent": 0,
    "volume": 0
  }
}
```

### 数据库与 Redis

如果本机没有 PostgreSQL / Redis，可先启动容器：

```bash
docker compose up -d
```

校验 Prisma schema：

```bash
DATABASE_URL=postgresql://ymm:ymm@127.0.0.1:5432/ymm_financial_manage pnpm exec prisma validate
```

### 验证命令

```bash
pnpm test
pnpm build
```

`pnpm build` 会同时执行服务端 TypeScript 编译和 Next.js 生产构建。

WebSocket 手动验收：

```bash
node -e "const WebSocket=require('ws'); const ws=new WebSocket('ws://127.0.0.1:3000/ws/market'); ws.on('open',()=>ws.send(JSON.stringify({type:'subscribe',topics:['market.stock.tick'],symbols:['600519.SH']}))); ws.on('message',(data)=>{console.log(data.toString()); ws.close(); process.exit(0);});"
```
