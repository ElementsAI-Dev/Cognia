## Why

Current LLM generation capabilities are partially fragmented: some UI generation paths only support a subset of providers, while legacy API routes and helper exports exist without clear runtime ownership. We need a single, complete, and verifiable generation surface so users can reliably use configured providers and maintainers can confidently evolve the stack.

## What Changes

- Standardize generation provider resolution for selection/skill AI flows so all supported providers (including OpenAI-compatible and local providers) are handled consistently through shared provider client logic.
- Define and enforce a canonical LLM generation entrypoint map for product features (preset generation, prompt optimization, selection AI, prompt self-optimization), including explicit ownership and call paths.
- Audit and resolve legacy generation API routes that are not runtime-wired (remove, deprecate, or redirect with compatibility safeguards and clear migration notes).
- Ensure exported generation utilities are either product-integrated with concrete call sites or intentionally marked internal/test-only and excluded from production expectations.
- Add automated verification for provider coverage and generation path completeness to prevent regressions.

## Capabilities

### New Capabilities
- `llm-generation-completeness-assurance`: Guarantees every user-facing LLM generation feature has a valid provider-compatible implementation, a canonical runtime call path, and regression tests for completeness.

### Modified Capabilities
- `workflow-completeness-assurance`: Extend completeness enforcement to include LLM generation workflow integrity checks (coverage of entrypoints, consistency of runtime wiring, and verification expectations).

## Impact

- Affected code:
  - `lib/ai/generation/selection-ai.ts`
  - `lib/ai/core/client.ts`
  - `hooks/skills/use-skill-ai.ts`
  - `hooks/presets/use-preset-ai.ts`
  - `lib/ai/presets/preset-ai-service.ts`
  - `app/api/generate-preset/route.ts`
  - `app/api/optimize-prompt/route.ts`
  - `app/api/enhance-builtin-prompt/route.ts`
  - `app/api/prompt-self-optimize/route.ts`
  - `lib/ai/generation/index.ts`
  - `lib/ai/generation/sequential.ts`
- Affected systems: AI provider settings, frontend generation UX, API routing surface, and test/CI completeness checks.
- Risk areas: provider fallback behavior, compatibility with existing presets/prompt tooling, and route deprecation transitions.
