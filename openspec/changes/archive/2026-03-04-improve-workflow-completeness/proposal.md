## Why

当前工作流功能在不同入口、不同状态和不同类型任务之间存在体验和行为不一致，用户会遇到“某些环节可用、某些环节缺失或被简化”的情况。为了让工作流可以稳定用于生产场景，需要一次端到端的完整性补齐，并将“完整功能集”定义为可验证标准。

## What Changes

- 建立工作流功能完整性基线，覆盖创建、编辑、执行、暂停/恢复、取消、历史、结果呈现、调度与触发同步等关键环节。
- 对工作流主页面、侧边栏入口、执行状态展示、调度配置和错误处理进行一致性补齐，消除功能缺口与简化路径。
- 为每个工作流环节定义明确的验收行为（成功、失败、边界场景），并补充对应自动化测试。
- 统一前端状态管理与后端运行时反馈链路，确保 UI 状态与真实执行状态一致。

## Capabilities

### New Capabilities
- `workflow-completeness-assurance`: 定义并强制执行工作流全链路的功能完整性要求，确保所有关键环节均具备且可验证。

### Modified Capabilities
- None.

## Impact

- Affected code:
  - `app/workflows/**`
  - `components/workflow/**`, `components/sidebar/widgets/sidebar-workflows*`, `components/scheduler/workflow-schedule-dialog*`
  - `stores/workflow/**`, `hooks/workflow/**`, `lib/workflow-editor/**`
  - `src-tauri/src/workflow_runtime/**`（如需要补齐运行时状态或错误映射）
- Tests:
  - workflow 相关 Jest 单测与集成测试
  - Playwright E2E（工作流创建到执行闭环）
- Risks:
  - 状态同步逻辑调整可能影响现有流程，需要以回归测试和场景验收控制风险。