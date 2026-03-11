# Canvas Benchmark Scorecard

- Last updated: 2026-03-10
- Scope: `improve-canvas-feature-completeness`
- Goal: map proven Canvas interaction patterns to Cognia Canvas completeness tasks.

## Reference Cases

| Case | Why it is successful | Observable strengths |
|---|---|---|
| Figma FigJam / Multiplayer Canvas | Durable collaborative editing model with clear participant awareness | Fast collaboration feedback, resilient session handling, transparent online/offline state |
| Notion AI + Document Editor | AI-assisted editing with user-controlled acceptance and predictable document state | Explicit change review, low trust friction for AI edits, recoverable writing flow |
| VS Code + Timeline/History model | Strong edit recovery and version confidence in long sessions | Reliable save/recover semantics, checkpoint confidence, stable large-file editing |

## Normalized Patterns

| Pattern ID | Pattern name | Source cases | Canonical behavior |
|---|---|---|---|
| `BP-01` | Deterministic save/discard control | Notion, VS Code | Dirty state must be explicit; close paths must require intentional save/discard confirmation. |
| `BP-02` | Recoverable checkpoint chain | VS Code | Auto and manual checkpoints must preserve recoverability and allow safe rollback. |
| `BP-03` | AI edit boundary + human approval | Notion AI | AI transformations must reveal edit scope and require explicit accept/reject before commit. |
| `BP-04` | Share-link join resilience | FigJam | Shared sessions must open via valid join entry with graceful handling of transport failures. |
| `BP-05` | Behavior-first release validation | All above | Critical user journeys require interaction-level tests, not synthetic logic-only checks. |

## Applicability Notes for Cognia

- `BP-01` applies to `components/canvas/canvas-panel.tsx` close behavior and unsaved-change guard consistency.
- `BP-02` applies to `stores/artifact/artifact-store.ts` version retention and pre-restore checkpoint safety.
- `BP-03` applies to `hooks/canvas/use-canvas-actions.ts` and Canvas diff confirmation UX.
- `BP-04` applies to `app/(main)/canvas/join/page.tsx` and `components/canvas/collaboration-panel.tsx` share flow.
- `BP-05` applies to `e2e/features/canvas.spec.ts` and guard checks preventing pass-through assertions.

## Traceability Entry Criteria

A Canvas task is benchmark-traceable when all are true:

1. Task text contains one or more `BP-xx` references.
2. Task is labeled with priority (`P0` or `P1`) when release-critical.
3. Corresponding requirement/spec text includes benchmark pattern references.
4. Validation scripts pass for tasks/spec traceability and E2E quality guard.