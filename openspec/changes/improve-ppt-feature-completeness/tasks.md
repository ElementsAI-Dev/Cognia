## 1. Completeness Baseline and Gap Audit

- [x] 1.1 Build a PPT completeness matrix covering Entry, Creation, Editor, Preview, Slideshow, Export, and Management modules
- [x] 1.2 Map each matrix item to current implementation paths and mark as complete, missing, or simplified
- [x] 1.3 Define canonical state/error vocabulary shared by PPT page, workflow store, and editor store

## 2. Creation Flow Parity

- [x] 2.1 Align topic generation, import, paste, and template creation flows to use equivalent validation and completion rules
- [x] 2.2 Ensure each creation mode returns users to a consistent post-create editor route with active presentation context
- [x] 2.3 Implement explicit failure feedback and retry actions for provider, parsing, and generation workflow failures

## 3. Editing and State Integrity

- [x] 3.1 Verify and patch slide/element operation completeness (add, duplicate, delete, reorder, update) across editor controls
- [x] 3.2 Normalize persistence and active-presentation synchronization between `ppt-editor-store` and `workflow-store`
- [x] 3.3 Harden undo/redo, clipboard, and rapid-edit history behavior to prevent state drift or silent data loss

## 4. Preview and Slideshow Consistency

- [x] 4.1 Ensure preview rendering always reflects the current saved presentation state, including ordering and theme data
- [x] 4.2 Validate slideshow navigation boundaries, exit behavior, and synchronization with active presentation metadata
- [x] 4.3 Add explicit user-facing handling for preview/slideshow load failures or invalid presentation state

## 5. Export Completeness

- [x] 5.1 Verify PPTX export pipeline produces valid downloadable files with expected slide/content integrity
- [x] 5.2 Align HTML/Marp/PDF export flows with format-specific delivery behavior and consistent success/failure signaling
- [x] 5.3 Add actionable error states and recovery paths for export failures without losing current editing context

## 6. Verification and Regression Safety

- [x] 6.1 Add or update Jest tests for creation parity, editing integrity, state synchronization, preview/slideshow behavior, and export error handling
- [x] 6.2 Add E2E scenarios for end-to-end PPT flow (create, edit, preview/present, export) across key creation modes
- [ ] 6.3 Create scenario-to-test traceability notes and run full targeted validation before implementation handoff
