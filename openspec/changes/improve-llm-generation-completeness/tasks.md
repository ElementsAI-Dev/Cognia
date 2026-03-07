## 1. Generation Capability Registry

- [x] 1.1 Create a canonical generation capability registry describing capability ID, runtime owner, invocation surface, and lifecycle status.
- [x] 1.2 Add entries for all user-facing generation workflows (selection/skill AI, preset generation, prompt optimization, prompt self-optimization).
- [x] 1.3 Add validation utilities to enforce unique ownership and prevent unmapped/orphan generation surfaces.

## 2. Provider Resolution Unification

- [x] 2.1 Refactor `lib/ai/generation/selection-ai.ts` to use shared provider model resolution from `lib/ai/core/client` instead of the local limited switch.
- [x] 2.2 Implement provider-aware configuration checks so supported local/keyless providers are not blocked by remote API key assumptions.
- [x] 2.3 Update selection/skill AI error handling to return deterministic configuration guidance for invalid provider setups.
- [x] 2.4 Expand unit tests for selection/skill AI to cover non-OpenAI-compatible, OpenAI-compatible, and local provider paths.

## 3. Legacy Route Compatibility and Deprecation

- [x] 3.1 Refactor `app/api/generate-preset/route.ts`, `app/api/optimize-prompt/route.ts`, `app/api/enhance-builtin-prompt/route.ts`, and `app/api/prompt-self-optimize/route.ts` to delegate behavior to canonical shared generation services.
- [x] 3.2 Add explicit deprecation metadata (for example headers/log markers and migration hints) on legacy route responses.
- [x] 3.3 Add documentation for route lifecycle state and migration targets for internal/external callers.

## 4. Export Surface Classification

- [x] 4.1 Classify generation exports (product-wired, internal utility, experimental) and align `lib/ai/generation/index.ts` with the intended public surface.
- [x] 4.2 Ensure utilities such as sequential generation helpers have explicit status and do not appear as accidental product commitments.

## 5. Completeness Verification

- [x] 5.1 Add automated tests that fail when a product generation capability lacks a valid registry owner or runtime mapping.
- [x] 5.2 Add tests that verify provider-resolution consistency and legacy route deprecation behavior.
- [x] 5.3 Integrate completeness checks into CI test flow and update affected test fixtures/mocks.
- [ ] 5.4 Run `pnpm lint`, `pnpm test`, and `pnpm exec tsc --noEmit` and resolve any regressions introduced by this change.

Current blocker for 5.4: repository has pre-existing `tsc` and `eslint` failures outside this change scope, and duplicate mock warnings from `.worktrees/*` during Jest discovery.
