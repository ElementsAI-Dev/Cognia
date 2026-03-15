# Artifacts Benchmark Scorecard

- Last updated: 2026-03-14
- Scope:
  - `improve-existing-artifacts-system-completeness`
- Goal: map proven artifact workspace patterns to Cognia Artifacts lifecycle, runtime safety, and detection reliability tasks.

## Reference Cases

| Case | Why it is successful | Observable strengths |
|---|---|---|
| Anthropic Claude Artifacts | Turns generated output into a dedicated working surface instead of a disposable chat snippet | Clear artifact identity, easy reopen/edit loop, strong separation between conversation and artifact workspace |
| Vercel v0 | Makes generated UI/code outputs iteratable and reusable after initial creation | Fast revise-and-preview cycle, stable handoff from prompt to editable artifact, strong output continuity |
| VS Code editor/workbench | Preserves navigation state, recent context, and recoverability across long working sessions | Reliable recent-item recall, explicit failure states, predictable return-to-work behavior |

## Normalized Patterns

| Pattern ID | Pattern name | Source cases | Canonical behavior |
|---|---|---|---|
| `AP-01` | Dedicated artifact workspace continuity | Claude Artifacts, VS Code | Artifact browsing, open, edit handoff, and return must preserve context instead of resetting the user to a blank default view. |
| `AP-02` | Capability-declared runtime safety | Claude Artifacts, v0 | Each artifact runtime must declare how it renders, what it is allowed to execute, and how loading/failure states are surfaced. |
| `AP-03` | Deterministic creation lineage | Claude Artifacts, v0, VS Code | Generated artifacts must carry source linkage, dedupe-friendly identity, and reproducible creation metadata across automatic and manual creation flows. |

## Applicability Notes for Cognia

- `AP-01` applies to `stores/artifact/artifact-store.ts`, `hooks/artifacts/use-artifact-list.ts`, `components/artifacts/artifact-list.tsx`, and artifact-to-Canvas return flows.
- `AP-02` applies to `components/artifacts/artifact-preview.tsx`, runtime-specific renderers, iframe sandbox configuration, and export capability reporting.
- `AP-03` applies to `hooks/chat/use-artifact-detection.ts`, `lib/ai/generation/artifact-detector.ts`, `components/artifacts/artifact-create-button.tsx`, `lib/ai/tools/artifact-tool.ts`, and plugin-facing artifact metadata.

## Traceability Entry Criteria

An Artifacts task is benchmark-traceable when all are true:

1. Task text contains one or more `AP-0x` references.
2. Priority tasks (`P0`/`P1`) link to at least one benchmark pattern in task, spec, or design artifacts.
3. User-observable validation covers the claimed pattern instead of relying only on in-page synthetic assertions.
4. Documentation for the affected flow links back to this scorecard or an equivalent traceability note.
