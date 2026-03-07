## Context

The current LLM generation surface is functionally rich but structurally fragmented:
- Preset generation and prompt optimization already run through shared client-side AI services.
- Selection/skill AI still uses a narrow provider switch and a strict API key check, which can reject valid keyless/local provider configurations and ignore many supported providers.
- Several API routes for generation remain in `app/api/*` but have no in-repo runtime callers, creating unclear ownership and maintenance burden.
- Some generation utilities are exported without product-level wiring expectations, making completeness hard to verify.

This change is cross-cutting across AI client resolution, feature entrypoints, API routing, and verification.

## Goals / Non-Goals

**Goals:**
- Ensure all user-facing LLM generation features resolve providers through a consistent, shared mechanism.
- Define a canonical generation capability map with explicit runtime owners (hook/service/route).
- Resolve legacy generation routes with a safe migration strategy and clear status (active, deprecated, internal-only, removed).
- Add automated checks that prevent “implemented but not used” and “used but provider-incomplete” regressions.

**Non-Goals:**
- Redesigning prompt content quality or prompt engineering strategies.
- Introducing new provider vendors beyond the existing provider model.
- Reworking unrelated workflow execution architecture.
- Building a new backend inference service.

## Decisions

### 1. Introduce a canonical generation capability registry
- Decision: Add a single registry file (for example `lib/ai/generation/capability-registry.ts`) that records each user-facing generation capability, its runtime owner, invocation surface, and deprecation state.
- Rationale: Completeness must be machine-checkable, not only documented.
- Alternatives considered:
  - Keep a markdown-only inventory: rejected because it can drift silently.
  - Infer ownership from `rg` patterns only: rejected because inference is brittle and ambiguous.

### 2. Unify selection/skill AI provider resolution with shared client logic
- Decision: Refactor selection AI to use the same provider-model resolution path used elsewhere (`lib/ai/core/client`), including support for all configured providers and local/keyless compatibility where valid.
- Rationale: Current provider switch in `selection-ai.ts` supports only `openai/anthropic/google` explicitly and defaults unpredictably for other providers.
- Alternatives considered:
  - Expand the local switch-case for every provider: rejected due duplication and long-term drift risk.
  - Keep fallback-to-openai for unknown providers: rejected because it hides configuration errors and violates user intent.

### 3. Treat legacy API generation routes as compatibility adapters, then phase down
- Decision: For routes under `app/api/generate-preset`, `app/api/optimize-prompt`, `app/api/enhance-builtin-prompt`, and `app/api/prompt-self-optimize`, keep temporary compatibility but route them through shared generation services and mark deprecation metadata (response header/log + docs note).
- Rationale: Internal runtime appears migrated, but hard removal risks breaking external/internal scripts not visible in repo.
- Alternatives considered:
  - Immediate route deletion: rejected due unknown external consumers.
  - Keep untouched indefinitely: rejected because it preserves ambiguity and duplicate logic.

### 4. Make exported generation helpers explicit in status (product, internal, or experimental)
- Decision: Classify exports such as sequential generation helpers as:
  - product-wired (required complete path),
  - internal utility (not expected to have UI path),
  - experimental (opt-in).
  Reflect this classification in registry and tests.
- Rationale: “Exported” does not always mean “must be user-reachable”; explicit classification removes ambiguity.
- Alternatives considered:
  - Require every export to be product-wired: rejected as unrealistic and restrictive.
  - Ignore unused exports: rejected because dead surface accumulates silently.

### 5. Add completeness verification tests
- Decision: Add automated tests that assert:
  - each product generation capability has a valid runtime owner and invocation path;
  - selection/skill AI provider resolution does not regress to partial provider support;
  - deprecated routes have explicit status and forwarding behavior.
- Rationale: Prevents future regressions where code compiles but feature paths break or diverge.
- Alternatives considered:
  - Rely on manual review checklists: rejected due inconsistency in long-term maintenance.

## Risks / Trade-offs

- [Unknown external consumers rely on legacy API routes] -> Keep compatibility adapters first, publish deprecation window, then remove in a follow-up.
- [Provider behavior differences across OpenAI-compatible endpoints] -> Centralize resolution in shared client and add provider matrix tests for key path coverage.
- [Registry can become stale if not enforced] -> Make registry validation part of CI tests.
- [Additional maintenance overhead from metadata/classification] -> Keep schema minimal and colocate with generation index to reduce friction.

## Migration Plan

1. Add capability registry and classification model; land tests for registry structure.
2. Refactor selection/skill generation path to shared provider resolution; update unit tests.
3. Convert legacy generation routes to compatibility adapters with explicit deprecation markers.
4. Classify existing generation exports and align `lib/ai/generation/index.ts` with intended public surface.
5. Enable completeness verification in CI and document migration/deprecation policy.

Rollback strategy:
- Revert route adapter behavior to previous handlers if compatibility issues appear.
- Guard registry validation behind a temporary flag if it blocks urgent releases.
- Restore prior selection provider path as emergency fallback only for the affected release branch.

## Open Questions

- Do any external clients (outside this repository) still call the legacy `/api/*` generation routes?
- What deprecation window is acceptable (for example one minor release vs two)?
- Should sequential generation utilities remain exported from the main generation index or move to an explicit experimental namespace?
