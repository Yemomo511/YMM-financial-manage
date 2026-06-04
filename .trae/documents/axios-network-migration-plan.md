# 将网络请求迁移到 axios 的实施计划

## Summary

将当前系统中的出站网络请求统一迁移到 `axios`，并集中封装在 `src/base/network` 下。`base.ts` 作为基础网络模型与 axios 实例工厂，采用切面化设计支持中间件、插件、请求/响应拦截等自定义网络元素。具体业务接口不直接使用 `axios`、`fetch` 或底层 HTTP 能力，而是基于 `base.ts` 暴露的请求接口实现，并按 `YF{网络请求模块名}` 命名。

本次计划仅替换“出站网络请求客户端”。`src/app/MarketApplication.ts`、`src/stream/MarketWebSocketGateway.ts` 和相关测试中的 `node:http` 用于创建 HTTP/WebSocket 服务端，不属于网络请求客户端，不迁移为 axios。

## Current State Analysis

- `src/base/network/base.ts` 当前为空文件，尚未提供基础网络封装。
- `package.json` 和 `pnpm-lock.yaml` 当前未包含 `axios` 依赖。
- 当前唯一发现的出站 HTTP 请求在 `src/source/market/EastmoneyPublicAdapter.ts`，默认实现使用 `fetch(url)` 请求东方财富公开行情接口。
- `EastmoneyPublicAdapter` 已通过 `fetchQuote?: (url: string) => Promise<unknown>` 形成可测试注入边界，现有测试 `tests/market/aShareSourceAdapter.test.ts` 使用该注入模拟网络失败。
- `node:http` 仅出现在服务端创建和 WebSocket 相关类型/测试中：
  - `src/app/MarketApplication.ts` 使用 `createServer(this.app)`。
  - `src/stream/MarketWebSocketGateway.ts` 使用 `HttpServer` 和 `IncomingMessage` 类型。
  - `tests/stream/marketWebSocketGateway.test.ts` 使用 `createServer` 测试 WebSocket 网关。
- TypeScript 配置为 `module: "NodeNext"`、`strict: true`、`type: "module"`，源码内部 import 需要保持 `.js` 后缀风格。

## Proposed Changes

### 1. 新增 axios 依赖

文件：`package.json`、`pnpm-lock.yaml`

- 通过包管理器新增运行时依赖 `axios`。
- 保持现有 `pnpm` 锁文件一致性，不手写锁文件。
- 不移除 `@types/node`，因为服务端和 WebSocket 仍需要 Node 类型。

### 2. 在 `base.ts` 封装基础网络模型

文件：`src/base/network/base.ts`

实现内容：

- 导入并封装 `axios`，但不向业务层暴露原始 axios 实例。
- 定义基础请求模型：
  - `YFHttpMethod`：`GET`、`POST`、`PUT`、`PATCH`、`DELETE`。
  - `YFRequestConfig<TData>`：包含 `url`、`method`、`params`、`data`、`headers`、`timeoutMs` 等请求配置。
  - `YFResponse<T>`：包含 `data`、`status`、`headers`。
  - `YFNetworkError`：统一包装 `axios` 错误，保留 `status`、`code`、`url`、`cause`。
- 定义切面扩展模型：
  - `YFNetworkMiddleware`：请求前后增强，支持对请求配置和响应结果做异步处理。
  - `YFNetworkPlugin`：具备 `name`、`setup(client)`，用于注册中间件或后续扩展。
  - `YFNetworkClient`：只暴露 `request<T>()`、`use(middleware)`、`usePlugin(plugin)` 等受控接口。
- 提供创建入口：
  - `createYFNetworkClient(options?: YFNetworkClientOptions): YFNetworkClient`
  - `yfNetworkClient`：默认单例实例，供普通接口模块复用。
- 实现 axios 拦截器映射：
  - 请求前执行已注册 middleware 的 `onRequest`。
  - 响应成功后执行 `onResponse`。
  - 响应失败时统一转换为 `YFNetworkError`，再执行 `onError`。
- 设计原则：
  - 业务层只依赖 `YFNetworkClient` 接口，不依赖 axios 类型。
  - axios 的响应只在 `base.ts` 内部解包，业务 API 获取 `response.data` 或结构化 `YFResponse<T>`。
  - 保持单例默认实例，同时保留工厂函数便于测试隔离和后续插件化。

### 3. 新增东方财富行情 API 封装

文件：`src/base/network/YFEastmoneyMarketApi.ts`

实现内容：

- 命名遵循 `YF{网络请求模块名}`，当前模块名确定为 `EastmoneyMarketApi`，类名为 `YFEastmoneyMarketApi`。
- 定义东方财富响应类型：
  - `YFEastmoneyQuoteResponse`
  - `YFEastmoneyQuoteData`
- 类构造函数接收 `YFNetworkClient`，默认使用 `yfNetworkClient`。
- 对外仅暴露业务请求方法：
  - `getQuote(symbol: string): Promise<YFEastmoneyQuoteResponse>`
  - 如需保留更底层能力，可添加私有 `buildQuoteUrl(symbol)` 和 `toEastmoneySecid(symbol)`。
- 内部通过 `client.request<YFEastmoneyQuoteResponse>({ method: 'GET', url, timeoutMs })` 完成请求。
- 不向外暴露 URL、axios config 或 axios response。
- 该文件是接口 API 封装层，后续新增接口均按同类文件和命名规则扩展。

### 4. 调整 `EastmoneyPublicAdapter`

文件：`src/source/market/EastmoneyPublicAdapter.ts`

调整内容：

- 移除默认 `fetch(url)` 实现。
- 引入 `YFEastmoneyMarketApi`。
- 保留可测试注入能力，但将选项从底层 URL 请求函数收敛为 API 抽象：
  - 推荐新增 `marketApi?: Pick<YFEastmoneyMarketApi, 'getQuote'>`。
  - 为减少破坏，可临时兼容现有 `fetchQuote?: (url: string) => Promise<unknown>`，但默认路径不再使用 `fetch`。
- `readQuoteWithFallback(symbol)` 改为调用 `this.marketApi.getQuote(symbol)`。
- `toEastmoneySecid(symbol)` 如仍被测试或业务使用，短期保留；若 API 层也需要同逻辑，优先在 API 层私有实现，避免 Adapter 依赖 URL 细节。
- fallback 行为保持不变：API 请求失败且 `fallbackEnabled` 为 true 时返回 mock quote。

### 5. 更新测试覆盖

文件：`tests/market/aShareSourceAdapter.test.ts`、新增 `tests/base/network/*.test.ts`

测试计划：

- 更新 `EastmoneyPublicAdapter` 测试，使用 `marketApi.getQuote` 注入失败，验证 fallback 不变。
- 新增 `base.ts` 测试：
  - `createYFNetworkClient` 能通过自定义 axios adapter 或 mock client 完成成功请求。
  - middleware 的 `onRequest`、`onResponse` 执行顺序符合注册顺序。
  - 请求失败时被转换为 `YFNetworkError`，保留 status/code/url。
- 新增 `YFEastmoneyMarketApi` 测试：
  - `getQuote('600519.SH')` 会请求正确 secid。
  - API 方法返回解包后的 data。
  - 业务层无需接触 axios 类型。

### 6. 保留服务端 `node:http`

文件：`src/app/MarketApplication.ts`、`src/stream/MarketWebSocketGateway.ts`、`tests/stream/marketWebSocketGateway.test.ts`

处理方式：

- 不替换这些文件中的 `node:http`。
- 原因是它们负责创建/类型化 HTTP 服务端，不是出站网络请求。
- 若后续需要完全移除 `node:http`，需要另起服务端框架迁移方案，不属于本次 axios 网络请求封装范围。

## Assumptions & Decisions

- “网络请求”按出站 HTTP 客户端请求理解，不包含本地 HTTP 服务监听和 WebSocket 服务端。
- 当前唯一需要迁移的真实出站请求是东方财富行情接口。
- 默认 API 类名确定为 `YFEastmoneyMarketApi`，符合 `YF{网络请求模块名}` 规则。
- `base.ts` 是 axios 唯一入口；业务接口模块不得直接 import `axios`。
- Adapter 层只依赖 API 抽象，不直接拼 axios config。
- 迁移后仍保留现有 mock fallback 行为，避免公开行情接口不可用时影响应用启动和测试。
- 为兼容现有测试与使用习惯，第一阶段可保留 `fetchQuote` 注入，但建议标记为兼容路径并逐步迁移到 `marketApi` 注入。

## Verification Steps

实施完成后执行：

1. `pnpm install`，确认 `axios` 写入 `package.json` 和 `pnpm-lock.yaml`。
2. `pnpm test`，确认现有测试和新增网络层测试通过。
3. `pnpm build`，确认 TypeScript NodeNext import、类型和 Next 构建通过。
4. 全局搜索确认业务代码中不存在新增的直接 `axios` import，除 `src/base/network/base.ts` 外。
5. 全局搜索确认出站请求不再使用 `fetch(`、`http.request` 或 `https.request`。
6. 手动检查 `node:http` 剩余使用点仅为服务端创建/类型和测试，不属于出站请求。

## Execution Order

1. 新增 `axios` 依赖。
2. 实现 `src/base/network/base.ts`。
3. 新增 `src/base/network/YFEastmoneyMarketApi.ts`。
4. 调整 `src/source/market/EastmoneyPublicAdapter.ts` 默认请求路径。
5. 更新/新增测试。
6. 执行 `pnpm test`、`pnpm build`。
7. 根据诊断结果修复类型、测试或导入路径问题。
