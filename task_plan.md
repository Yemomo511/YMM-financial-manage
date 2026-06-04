# 任务计划：模拟炒股系统方案文档

## 目标
在 `docs/prd` 目录输出模拟炒股系统的架构设计与 A 股监听/消息队列一期实现方案，并落地最小可运行的 A 股实时 WebSocket 看板。

## 当前阶段
阶段 15

## 各阶段

### 阶段 1：需求与发现
- [x] 理解用户意图
- [x] 确定约束条件和需求
- [x] 将发现记录到 findings.md
- **状态：** complete

### 阶段 2：规划与结构
- [x] 确定技术方案
- [x] 设计文档结构
- [x] 记录决策及理由
- **状态：** complete

### 阶段 3：实现
- [x] 编写 `architecture-design.md`
- [x] 编写 `financial-task-A.md`
- [x] 保持规划文件同步更新
- **状态：** complete

### 阶段 4：测试与验证
- [x] 校验文档覆盖所有需求
- [x] 检查模块接口与范围是否一致
- [x] 将验证结果记录到 progress.md
- **状态：** complete

### 阶段 5：交付
- [x] 检查所有输出文件
- [x] 确保交付物完整
- [x] 交付给用户
- **状态：** complete

### 阶段 6：补充项目级架构文档
- [x] 阅读现有 `ARCHITECTURE.md`
- [x] 将编码规范扩展为项目级架构说明
- [x] 同步记录与 PRD 的关系
- **状态：** complete

### 阶段 7：实时行情工程骨架
- [x] 初始化 TypeScript、Vitest、pnpm 脚本
- [x] 建立最小服务入口
- [x] 提交工程骨架
- **状态：** complete

### 阶段 8：账户与数据模型
- [x] 定义 Mock 账户初始化能力
- [x] 定义 Prisma 核心表结构
- [x] 验证账户测试与 Prisma schema
- **状态：** complete

### 阶段 9：A 股公共行情源与标准化
- [x] 实现东方财富公共源 Adapter
- [x] 实现 Mock fallback
- [x] 标准化 `market.stock.tick` 事件信封
- **状态：** complete

### 阶段 10：Outbox 与消息发布
- [x] 实现行情仓库、快照与 Outbox
- [x] 实现 Redis Stream 事件总线适配
- [x] 验证 Outbox 发布链路
- **状态：** complete

### 阶段 11：WebSocket 实时看板
- [x] 实现 `/ws/market` 订阅网关
- [x] 实现本地行情看板
- [x] 验证真实 WebSocket 推送
- **状态：** complete

### 阶段 12：文档与最终验证
- [x] 补充 README、`.env.example`、`docker-compose.yml`
- [x] 同步规划与验证记录
- [x] 执行最终测试、构建和 schema 校验
- **状态：** complete

### 阶段 13：RxJS 服务事件总线
- [x] 引入 `rxjs`
- [x] 新增 `RxServiceBusBase`
- [x] 验证服务对外只暴露 Observable
- **状态：** complete

### 阶段 14：服务层心跳与广播
- [x] 新增 `StockHeartbeatService`
- [x] 新增 `ServerBroadcastService`
- [x] 将 `MarketApplication` 改为服务编排器
- **状态：** complete

### 阶段 15：应用侧 AI 与视图占位
- [x] 新增 AI 理解应用服务
- [x] 新增 AI 决策应用服务
- [x] 新增视图可视化应用服务
- [x] 同步架构文档与验证结果
- **状态：** complete

## 关键问题
1. 一期只做 A 股监听与消息队列，如何定义边界，避免提前设计模型与实盘能力。
2. Mock 交易系统中哪些账户信息需要预置在数据库中，才能满足未来大模型接入。

## 已做决策
| 决策 | 理由 |
|------|------|
| 先输出架构设计与一期实现两份 PRD 文档 | 用户已明确要求交付物与目录 |
| 当前系统以 Mock 和数据库主导为前提 | 用户明确要求无需账号接入、以数据库为准 |
| 一期采用数据库 + Outbox + Redis Stream/BullMQ 的组合 | 同时满足数据库真源、事件分发与后续模型扩展 |
| `ARCHITECTURE.md` 负责长期架构约束，PRD 负责当前业务方案 | 避免项目级红线与阶段性方案混在一起 |
| 一期实现采用公共源轮询 + 系统 WebSocket 推送 | 不依赖商业上游 WebSocket，且能满足本地实时看板验收 |
| 当前运行时使用内存仓库闭环，Prisma schema 先固定数据库结构 | 避免本地必须启动数据库才能看到实时 WebSocket；数据库结构仍按 PRD 保留 |
| 服务层统一使用 RxJS Subject + Observable | 满足每个服务独立事件总线，同时避免外部直接 next 服务内部事件 |
| AI 理解与决策本期只做接口占位 | 保留应用侧架构，不引入真实模型、API Key 和成本控制复杂度 |

## 遇到的错误
| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|
| `pnpm prisma:generate` 沙箱内无法下载 Prisma engine | 1 | 申请联网后仍遇到 ECONNRESET，改用 `DATABASE_URL=... pnpm exec prisma validate` 完成 schema 校验 |
| WebSocket 测试在沙箱内监听/连接 127.0.0.1 返回 EPERM | 2 | 使用提升权限运行端口监听测试和本地 WebSocket 验收 |

## 备注
- 随着进度更新阶段状态：pending → in_progress → complete
- 做重大决策前重新读取此计划
- 文档面向后续实现，接口只定义职责与输入输出，不展开实现细节
