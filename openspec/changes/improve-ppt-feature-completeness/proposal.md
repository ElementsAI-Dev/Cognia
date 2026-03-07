## Why

现有 PPT 功能虽然覆盖了生成、编辑、预览、演示与导出主链路，但在不同入口、不同模式和异常分支下仍存在“有功能但不完整”的情况，用户会感知为部分环节被省略或简化。需要一次以完整性为目标的逐模块核查与补齐，确保 PPT 全流程能力一致、可验证、可回归。

## What Changes

- 建立 PPT 功能完整性基线，按模块清点并验证生成、导入/粘贴建稿、模板创建、编辑、预览、播放、导出、管理等全部关键环节。
- 对页面入口、Creation Hub、Editor、Preview、Slideshow、Store、AI Workflow、Export 等链路做一致性补齐，消除“仅部分入口可用”或“弱化实现”的路径。
- 补全失败场景与恢复路径（生成失败、导出失败、保存/状态同步失败），避免静默降级，保证每个环节都有明确反馈与可操作恢复动作。
- 为每个完整性场景增加自动化验证（单测 + E2E），建立“无省略/无简化”的持续回归保护。

## Capabilities

### New Capabilities
- `ppt-feature-completeness-assurance`: 定义并强制执行 PPT 全链路功能完整性要求，确保所有关键模块均具备完整行为与一致体验。

### Modified Capabilities
- None.

## Impact

- Affected code:
  - `app/(main)/ppt/**`
  - `components/ppt/**`
  - `hooks/ppt/**`, `hooks/designer/use-ppt-ai.ts`
  - `stores/tools/ppt-editor-store.ts`, `stores/workflow/workflow-store.ts`
  - `lib/ai/workflows/ppt-*.ts`, `lib/ai/tools/ppt-*.ts`
  - `lib/export/document/pptx-export.ts`
  - `lib/i18n/messages/*/ppt.json`
- Tests:
  - PPT 相关 Jest 单测（页面、组件、hooks、store、workflow、export）
  - Playwright E2E（PPT 端到端核心流程）
- Risks:
  - 状态同步与导出链路补齐可能触发历史兼容问题，需要以场景回归和错误分支测试控制风险。
