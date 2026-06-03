# 发现与决策

## 需求
- 在 `/Users/bytedance/Project/Open/YMM-financial-manage/docs/prd` 下新增 `architecture-design.md` 与 `financial-task-A.md`
- `architecture-design.md` 主要说明模拟炒股系统的模块设计与初步接口定义，不展开具体实现
- `financial-task-A.md` 聚焦本期实现，只覆盖 A 股监听与消息队列，暂不接入模型
- 当前系统完全 Mock，无需股票账号；只需给大模型准备初始账户信息，如资金、持仓、风险阈值等
- 实际操作以数据库为主，说明数据主存、消息流和状态同步方式

## 研究发现
- 项目 `AGENTS.md` 说明本应用目标是给 AI 提供一套现实的股票环境
- `README.md` 明确项目是 Mock Financial Manage，用于模拟交易和 AI 探索
- `docs/prd` 目录当前为空，适合直接建立新的 PRD 文档
- 仓库当前没有既有实现代码，设计文档需要先把模块边界、消息主题与数据库真源原则定清楚
- 现有 `ARCHITECTURE.md` 主要覆盖编码风格和接口注释，缺少系统分层、模块边界、目录建议与长期红线

## 技术决策
| 决策 | 理由 |
|------|------|
| 架构文档采用“分层架构 + 事件驱动”描述 | 既能支撑后续模型接入，也能清楚描述一期仅做行情与消息链路 |
| 一期方案把数据库定义为状态真源，消息队列定义为分发通道 | 符合用户“实际操作以数据库本身为主”的要求 |
| 一期仅覆盖 A 股静态信息、实时行情、分钟 K 线、公告、新闻和交易日历 | 满足“保证 A 股相关信息及时抵达”的主目标，同时控制实现范围 |
| 为未来模型预置 Mock 账户与 AI Context 扩展点，但不实现模型推理 | 保证当前文档既可落地，又不越过本期范围 |
| 扩展 `ARCHITECTURE.md` 时保留原有接口/注释规范，并补充系统分层和目录结构 | 既延续已有团队习惯，又让文档能真正指导后续实现 |

## 遇到的问题
| 问题 | 解决方案 |
|------|---------|
| 目前仓库实现代码很少，缺少现成上下文 | 文档中用模块契约和数据流约束后续实现边界 |

## 资源
- `/Users/bytedance/Project/Open/YMM-financial-manage/AGENTS.md`
- `/Users/bytedance/Project/Open/YMM-financial-manage/ARCHITECTURE.md`
- `/Users/bytedance/Project/Open/YMM-financial-manage/README.md`
- `/Users/bytedance/Project/Open/YMM-financial-manage/docs/prd/architecture-design.md`
- `/Users/bytedance/Project/Open/YMM-financial-manage/docs/prd/financial-task-A.md`

## 视觉/浏览器发现
- 本次未涉及视觉材料

---
*每执行2次查看/浏览器/搜索操作后更新此文件*
*防止视觉信息丢失*
