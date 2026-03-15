# Model Routing Benchmark Scorecard

- Last updated: 2026-03-14
- Scope:
  - `improve-existing-model-routing-completeness`
- Goal: map proven model-routing patterns to Cognia AI feature migration tasks, with explicit traceability from benchmark evidence to route-profile and blocked-guidance decisions.

## Reference Cases

| Case | Why it is successful | Observable strengths |
|---|---|---|
| OpenAI ChatGPT multi-model routing | Stable default-model experience with clear fallback boundaries | Predictable default-provider behavior, explicit capability boundaries, low user confusion when model availability changes |
| Anthropic Console / Claude model configuration | Strong provider-specific guardrails and capability explanation | Clear blocked reasons, consistent remediation guidance, limited silent degradation |
| OpenRouter multi-provider routing | Explicit provider ordering and transparent compatibility rules | Ordered fallback behavior, observable provider attempts, provider-specific endpoint normalization |
| VS Code AI/editor integrations | Shared execution infrastructure across multiple feature entrypoints | Common model resolution path, low feature drift, reusable diagnostics across commands and panels |

## Normalized Patterns

| Pattern ID | Pattern name | Source cases | Canonical behavior |
|---|---|---|---|
| `MR-01` | Shared default-provider routing | ChatGPT, VS Code | Generic text features resolve provider, model, proxy usage, and active credential through one shared contract instead of feature-local settings parsing. |
| `MR-02` | Capability-bound provider policy | Claude Console, OpenRouter | Features with protocol or modality constraints declare supported providers explicitly and fail deterministically when the active provider is incompatible. |
| `MR-03` | Settings-driven blocked guidance | Claude Console, VS Code | Provider readiness, remediation reason, and next action are derived from the same settings completeness contract in settings UI and feature runtime. |

## Applicability Notes for Cognia

- `MR-01` applies to `lib/ai/workflows/step-executors/ai-executor.ts`, `lib/ai/presets/preset-ai-service.ts`, `lib/designer/ai/*`, `hooks/canvas/use-canvas-suggestions.ts`, and representative agent/team text-generation paths.
- `MR-02` applies to `hooks/video-studio/*`, `hooks/media/*`, `components/chat/dialogs/*generation*`, and `app/(main)/image-studio/page.tsx`, where provider capability assumptions must become explicit route policy.
- `MR-03` applies to `lib/ai/provider-consumption/*`, `components/settings/provider/*`, and any feature blocked-state UI that currently emits feature-specific setup copy.

## Change Traceability Matrix

| Change task group | Pattern ID(s) | Expected evidence |
|---|---|---|
| `1. Routing Baseline And Benchmark Traceability` | `MR-01`, `MR-02`, `MR-03` | Shared contracts, compatibility facades, and migration diagnostics exist with unit coverage |
| `2. Migrate High-Risk Text Feature Entrypoints` | `MR-01`, `MR-03` | Text features consume shared route profiles and blocked guidance instead of direct `getProviderModel` or local settings parsing |
| `3. Migrate Capability-Bound Media And Studio Routes` | `MR-02`, `MR-03` | Media features declare supported-provider routing policy and surface deterministic unsupported-provider guidance |
| `4. Settings Integration And Guardrails` | `MR-03` | Reusable readiness/remediation helpers and guardrail tests prevent feature-local routing regressions |
| `5. Verification And Documentation` | `MR-01`, `MR-02`, `MR-03` | Feature-matrix verification and updated docs keep routing contract, limits, and remaining gaps aligned |

## Implemented Evidence

| Pattern ID | Implemented evidence | Current status |
|---|---|---|
| `MR-01` | `createFeatureRoutePolicy`, `createFeatureProviderModelFromRuntimeConfig`, compatibility facade diagnostics, and migrated text entrypoints (`ai-executor`, prompt optimizers, suggestion generator, structured output, preset AI, designer/agent representative paths) now resolve through shared routing helpers | Implemented in this change |
| `MR-02` | `capability-provider.ts` now defines explicit access helpers for subtitle transcription, image generation, image edit/variation/inpainting, video generation, and image-studio provider mapping with deterministic unsupported-provider blocking | Implemented in this change |
| `MR-03` | Media hooks and dialogs (`use-video-subtitles`, `use-video-analysis`, `use-image-generation`, `video-generation-dialog`, `image-generation-dialog`, `image-studio/page.tsx`) now surface shared blocked guidance instead of feature-local API-key copy | Implemented in this change |

## Validation Evidence

- Unit coverage for shared routing contracts:
  - `lib/ai/provider-consumption/index.test.ts`
  - `lib/ai/provider-consumption/capability-provider.test.ts`
  - `lib/ai/provider-consumption/migration-guardrails.test.ts`
- Compatibility facade coverage:
  - `lib/ai/core/client.test.ts`
  - `lib/ai/core/proxy-client.test.ts`
  - `lib/ai/core/provider-registry.test.ts`
  - `lib/ai/core/ai-registry.test.ts`
- Representative feature coverage:
  - Workflow and prompt paths: `lib/ai/workflows/step-executors/ai-executor.test.ts`, `lib/ai/prompts/prompt-optimizer.test.ts`, `lib/ai/prompts/prompt-self-optimizer.test.ts`
  - Designer/agent paths: `lib/designer/ai/*.test.ts`, `lib/ai/agent/agent-executor.test.ts`
  - Media and studio paths: `hooks/media/*.test.ts`, `hooks/video-studio/use-video-subtitles.test.ts`, `components/chat/dialogs/*generation*.test.tsx`

## Traceability Entry Criteria

A model-routing task is benchmark-traceable when all are true:

1. Task text contains one or more `MR-0x` references.
2. The routing decision can be mapped to one of the normalized patterns in this document.
3. Related spec or implementation artifacts describe how Cognia adapts the benchmark behavior rather than copying it blindly.
4. Tests or validation notes provide concrete evidence for the selected routing pattern.
