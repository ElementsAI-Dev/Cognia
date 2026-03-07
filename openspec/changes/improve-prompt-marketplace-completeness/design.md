## Context

当前提示词市场能力集中在 `components/prompt/marketplace/**` 与 `stores/prompt/prompt-marketplace-store.ts`，并通过 `initializeSampleData()` 注入本地样例数据。UI 层已经包含浏览、详情、安装、收藏、发布、导入导出等入口，但数据读写语义主要停留在本地 Store 内，缺少统一远程数据抽象、失败恢复策略和端到端验收基线。

该变更跨越类型定义、Store 状态、组件交互、测试和（可选）后端 API 适配，属于跨模块完整性补齐，而不是单点修复。

## Goals / Non-Goals

**Goals:**
- 为提示词市场建立“模块级完整性合同”，覆盖 Browse、Installed、Favorites、Collections、Recent、Detail、Preview、Publish、Import/Export。
- 引入统一数据访问层，支持“远程优先 + 本地回退”，避免把样例数据当作默认业务实现。
- 把安装/更新/卸载、评论、收藏、分享、发布、导入导出做成可恢复的完整闭环（含校验、冲突处理、错误反馈）。
- 统一状态语义与操作阶段（idle/loading/success/error），避免不同入口出现行为不一致。
- 建立场景到测试的一一映射，覆盖关键回归路径。

**Non-Goals:**
- 不重写整个提示词模板系统或替换现有 Zustand 架构。
- 不在本次变更中引入全新的市场商业能力（如支付、订阅、付费分账）。
- 不要求一次性替换所有历史本地数据逻辑；允许保留开发回退路径。

## Decisions

### Decision 1: 增加 Prompt Marketplace Repository 抽象层
- 方案：新增 `lib/prompts/marketplace.ts` 与 `lib/prompts/marketplace-utils.ts`，定义统一接口（搜索、详情、评论、发布、更新检查、导入校验等），Store 只依赖 Repository，不直接耦合 sample 数据。
- 原因：当前业务逻辑散落在 Store 与组件，扩展真实 API 时会导致重复改动与行为漂移。
- 备选：继续在 Store 内直接补 API 调用。
- 未选原因：会加剧 Store 复杂度，难以测试与替换数据源。

### Decision 2: 以“操作状态机”替代分散布尔状态
- 方案：把安装、更新、发布、导入、评论等异步操作统一为 `operationState`（按 promptId 或 operationKey 记录 loading/error/success），并统一 toast 与错误信息来源。
- 原因：当前组件层存在多个局部 `isInstalling/isSubmitting`，跨入口无法共享一致状态。
- 备选：维持组件本地 loading 状态。
- 未选原因：同一资源在不同 UI 入口会出现冲突或状态不同步。

### Decision 3: 明确“完整性矩阵”并内置模块验收断言
- 方案：在设计与 specs 中定义九个模块的最小完整行为（成功、失败、空态、冲突、回退），实现时逐项对照，不允许仅渲染 UI 而缺失动作语义。
- 原因：用户诉求是“逐个部分检查且不省略”，必须先有统一清单才能避免遗漏。
- 备选：按现有问题逐个修补。
- 未选原因：容易遗漏跨模块链路，无法证明完整性。

### Decision 4: 发布与导入导出使用严格 schema 校验和冲突策略
- 方案：定义 `PromptMarketplaceExchangeSchema`（版本、prompt 列表、字段白名单、时间格式），导入支持 `skip / overwrite / duplicate` 策略并输出详细报告；发布前进行模板存在性、必填字段、分类/标签规范校验。
- 原因：当前导入导出流程校验较弱，易出现“导入成功但数据不完整”或重复冲突不可控。
- 备选：维持宽松 JSON 解析。
- 未选原因：高概率引入脏数据，后续难以排查。

### Decision 5: 保留 sample 数据作为显式 fallback，不作为默认主路径
- 方案：`sample` 仅在远程不可用、离线开发或开关启用时使用，并在 UI 暴露数据来源标识（例如 `sample/fallback`）。
- 原因：保障开发体验，同时避免误把 demo 数据当作正式市场数据。
- 备选：完全移除 sample。
- 未选原因：会降低本地开发与测试可用性，增加环境依赖。

### Decision 6: 测试分层为 Store 合约测试 + 组件行为测试 + E2E 闭环测试
- 方案：
  - Store 合约测试：Repository mock 下验证完整性矩阵与状态机。
  - 组件行为测试：各 tab、detail、publish、import-export 的关键交互与错误提示。
  - E2E：从浏览到安装、更新、评论、发布、导入导出的一条或多条闭环路径。
- 原因：仅靠单测无法证明跨入口一致性。
- 备选：仅补 Store 单测。
- 未选原因：无法覆盖 UI 与异步时序回归。

## Risks / Trade-offs

- [Risk] Repository 抽象引入后，短期内调用层改动面较大。  
  Mitigation: 先适配 `search/details/install/update/review` 主路径，再分阶段迁移次要路径。
- [Risk] 状态机收敛可能改变现有组件局部行为。  
  Mitigation: 保留兼容字段一个版本周期，并用回归测试锁定行为。
- [Risk] 导入校验变严格后，旧格式文件可能失败。  
  Mitigation: 提供兼容解析与迁移提示，输出可读错误报告。
- [Risk] E2E 场景增加会拉长 CI 时间。  
  Mitigation: 保留最关键闭环为阻塞用例，其他场景分层到 Jest。

## Migration Plan

1. 定义 Repository 接口、数据模型映射与错误码模型，接入 Store（保留 sample fallback）。
2. 重构 Store 异步操作为统一状态机，并补齐安装/更新/卸载/评论/发布/导入导出链路。
3. 按模块逐步替换组件的数据读取与动作触发，确保各 tab 和 detail 行为一致。
4. 补齐测试：先 Store 合约，再组件，再 E2E。
5. 在设置页提示数据源与失败回退状态，完成回归后默认启用远程优先策略。

Rollback strategy:
- 通过 feature flag 回退到现有 sample-only 行为路径。
- 保留旧 Store 关键字段映射一段过渡期，避免持久化数据读取失败。

## Open Questions

- 远程提示词市场 API 的鉴权模式是否与现有 settings/provider 体系复用，还是独立 token？
- 评论与 helpful 是否需要防刷限制（频率限制、去重）在前端提前约束？
- 发布后的审核流（立即可见 vs 审核后可见）是否属于本次完整性基线的一部分？
- 导入覆盖策略默认值是 `skip` 还是 `overwrite`，以及是否需要用户级全局配置？