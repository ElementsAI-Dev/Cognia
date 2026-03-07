## 1. Completeness Baseline & Gap Matrix

- [x] 1.1 Inventory workflow entry points and lifecycle operations across `app/workflows`, sidebar widget, and contextual workflow triggers
- [x] 1.2 Build a completeness matrix (Authoring/Execution/Observability/Scheduling) and mark each item as implemented, missing, or simplified
- [x] 1.3 Define canonical workflow status vocabulary and mapping rules between runtime events and UI states

## 2. Lifecycle Operation Parity

- [x] 2.1 Align create/load/edit/validate/save controls so each required operation is available with equivalent guard conditions in all workflow entry points
- [x] 2.2 Implement or restore missing pause/resume/cancel execution paths and ensure execution context is preserved through transitions
- [x] 2.3 Ensure result viewing and execution history access are complete for completed, failed, and cancelled runs

## 3. State Synchronization & Error Recovery

- [x] 3.1 Refactor workflow state consumption so workflows page, sidebar widget, and history/result surfaces derive from the same canonical execution state
- [x] 3.2 Normalize finalization behavior so each execution produces one canonical history record with final status, timestamps, and output/error summary
- [x] 3.3 Add explicit error surfaces and recovery actions for save, execution, scheduling, and trigger-sync failures (retry/rollback where supported)

## 4. Scheduling and Trigger Sync Completeness

- [x] 4.1 Ensure scheduling from workflow surfaces creates runnable tasks with workflow identity, timing, and parameters matching manual execution configuration
- [x] 4.2 Verify workflow-managed script/task behavior stays functionally equivalent after trigger synchronization
- [x] 4.3 Add partial-failure reporting for trigger sync to identify impacted workflow-linked tasks

## 5. Verification & Regression Safety

- [x] 5.1 Add or update Jest tests for lifecycle operation availability, state synchronization, history finalization, and explicit error handling
- [x] 5.2 Add E2E coverage for end-to-end workflow path (create/edit/run/pause-resume/cancel/result/history/schedule)
- [x] 5.3 Create scenario-to-test traceability notes and run regression checks for all affected workflow modules before merge
