# Workflow Completeness Matrix

## Entry Points Inventory (Task 1.1)

- Workflows list/editor page: `app/(main)/workflows/page.tsx`
- Sidebar quick access: `components/sidebar/widgets/sidebar-workflows.tsx`
- Editor toolbar controls: `components/workflow/editor/core/workflow-toolbar.tsx`
- Execution panel and history surfaces:
  - `components/workflow/editor/execution/execution-panel.tsx`
  - `components/workflow/editor/execution/workflow-execution-history-panel.tsx`
- Trigger sync configuration:
  - `components/workflow/editor/panels/workflow-trigger-panel.tsx`
  - `lib/workflow-editor/trigger-sync-service.ts`
- Scheduler workflow task creation:
  - `components/scheduler/workflow-schedule-dialog.tsx`

## Completeness Matrix (Task 1.2)

| Area | Capability | Before | After | Notes |
|---|---|---|---|---|
| Authoring | Create/load/edit/save workflow | Implemented | Implemented | Preserved, with explicit error feedback in key paths. |
| Execution | Run controls with correct guard states | Simplified | Implemented | Workflows page now uses canonical run/pause/resume/cancel gating. |
| Execution | Pause/resume/cancel continuity | Partially implemented | Implemented | Status-driven controls aligned across editor surfaces. |
| Observability | Canonical execution status mapping | Simplified (duplicated mapping) | Implemented | Centralized in `lib/workflow-editor/execution-status.ts`. |
| Observability | Trigger sync partial-failure visibility | Missing detail | Implemented | Failed trigger + impacted task IDs shown in panel and save warnings. |
| Scheduling | Schedule from workflow surface | Missing | Implemented | Added schedule entry on workflow editor header. |
| Scheduling | Scheduled payload parity with manual defaults | Simplified | Implemented | Workflow default inputs can be injected into scheduled task payload. |
| Error Handling | Scheduling failure feedback | Simplified | Implemented | Dialog now surfaces explicit failure reason without silent close. |

## Canonical Status Vocabulary (Task 1.3)

### Editor runtime status (`EditorExecutionStatus`)
- `idle`
- `pending`
- `running`
- `paused`
- `completed`
- `failed`
- `cancelled`

### Cross-surface workflow status (`WorkflowExecutionStatus`)
- `idle`
- `planning`
- `executing`
- `paused`
- `completed`
- `failed`
- `cancelled`

### Mapping rules
- `running` -> `executing`
- `pending` -> `planning`
- `idle`/`paused`/`completed`/`failed`/`cancelled` -> same semantic status

### Control gating rules
- `canRun`: only when `isExecuting=false`
- `canPause`: only when `isExecuting=true` and `status=running`
- `canResume`: only when `isExecuting=true` and `status=paused`
- `canCancel`: only when `isExecuting=true` and status is non-terminal/non-idle

Implemented in `lib/workflow-editor/execution-status.ts` and consumed by workflow surfaces.