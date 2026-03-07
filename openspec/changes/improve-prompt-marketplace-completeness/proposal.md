## Why

当前提示词市场在 UI 上已经覆盖了浏览、详情、安装、收藏、发布、导入导出等入口，但核心数据链路仍以本地 sample 与本地状态模拟为主，导致部分能力在真实场景下存在“看起来有、实际上未完整闭环”的问题。为了支持生产可用和长期演进，需要把提示词市场从“界面完整”升级为“功能完整且可验证”。

## What Changes

- 建立提示词市场完整性基线，逐个模块定义必须具备的行为：`Browse / Installed / Favorites / Collections / Recent / Detail / Preview / Publish / Import-Export`。
- 将当前本地 sample 驱动的关键流程升级为可切换的数据提供层（远程优先，本地回退），确保搜索、详情、评分、评论、发布、更新检查具备真实可执行语义。
- 补齐安装生命周期闭环：安装、升级检查、升级应用、卸载、版本同步、失败回滚与可恢复提示。
- 补齐用户行为闭环：收藏、最近查看、作者页、集合关注、内容复制/分享、评论提交与 helpful 反馈，确保状态一致且可追踪。
- 补齐发布与数据可移植能力：发布校验、分类与标签规范、导入导出格式校验、冲突处理、重复导入策略与错误反馈。
- 建立“场景即验收”测试矩阵，覆盖 Store、组件交互、关键回归与端到端流程，防止后续再次出现省略实现。

## Capabilities

### New Capabilities
- `prompt-marketplace-completeness-assurance`: 定义并强制执行提示词市场端到端功能完整性要求，确保所有子模块都具备完整业务闭环、错误恢复与可验证验收场景。

### Modified Capabilities
- None.

## Impact

- Affected code:
  - `components/prompt/marketplace/**`
  - `stores/prompt/prompt-marketplace-store.ts`
  - `types/content/prompt-marketplace.ts`
  - `lib/prompts/marketplace-samples.ts`（降级为开发/回退数据源）
  - `app/(main)/settings/page.tsx`（市场入口行为联动）
- Potential new modules:
  - `lib/prompts/marketplace.ts`（数据访问与容错）
  - `lib/prompts/marketplace-utils.ts`（筛选、映射、校验）
- Tests:
  - `stores/prompt/prompt-marketplace-store.test.ts`
  - `components/prompt/marketplace/*.test.tsx`
  - `e2e/**` 新增提示词市场端到端场景
- Risks:
  - 数据源从本地模拟升级为真实链路后，错误路径与时序复杂度上升，需要通过分层测试和回退策略控制风险。