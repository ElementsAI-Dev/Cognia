# Canvas Editor

Canvas is the Monaco-backed editing workspace in the artifact shell for code/text authoring with AI actions, version history, and experimental collaboration.

## Completeness Contract

The Canvas experience is considered complete only when these guarantees hold:

1. **Edit/reopen reliability**
   - Closing a dirty document always routes through save/discard confirmation.
   - Saving clears dirty state, and the latest saved content is restored after reopen.
2. **AI transform safety**
   - Content-transform actions signal scope (`selection` or `document`) before execution.
   - Transform output is never auto-applied; users must accept or reject diff preview.
3. **Version recovery integrity**
   - Version restore always writes a pre-restore checkpoint first.
   - Auto-save retention prunes oldest auto-save entries while preserving manual versions.
4. **Collaboration join integrity (experimental)**
   - Share links target implemented `/canvas/join` entry with encoded session payload.
   - Join/connect failures show explicit fallback messaging and do not crash editor shell.
5. **Behavior-based release evidence**
   - Canvas acceptance uses real UI interaction tests for edit flow, AI diff accept/reject, and version restore.

## Benchmark and Traceability

- Benchmark source: `docs/reference/canvas-benchmark-scorecard.md`.
- Spec requirement mapping: `openspec/changes/improve-canvas-feature-completeness/specs/canvas-completeness-assurance/spec.md`.
- Validation scripts:
  - `pnpm check:canvas-benchmark-traceability`
  - `pnpm check:canvas-e2e-quality`

Each P0/P1 Canvas change must cite benchmark pattern IDs (`BP-01+`) in change artifacts.

## Key Runtime Surfaces

- UI shell: `components/canvas/canvas-panel.tsx`
- Version management: `components/canvas/version-history-panel.tsx`
- Collaboration panel: `components/canvas/collaboration-panel.tsx`
- Auto-save state sync: `hooks/canvas/use-canvas-auto-save.ts`
- AI action orchestration: `hooks/canvas/use-canvas-actions.ts`
- Persistence and version retention: `stores/artifact/artifact-store.ts`
- Join entry route: `app/(main)/canvas/join/page.tsx`

## Keyboard and Testing Notes

- Global toggle shortcut: `Ctrl + .` opens/closes Canvas panel.
- Deterministic e2e hooks rely on stable selectors (`data-testid`) for panel controls, AI diff controls, document creation, and version restore actions.
