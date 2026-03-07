# Legacy Generation Routes

This document tracks deprecated compatibility routes for LLM generation and the canonical migration targets.

## Route Lifecycle

| Legacy Route | Status | Canonical Target | Notes |
| --- | --- | --- | --- |
| `/api/generate-preset` | `deprecated-compat` | `lib/ai/presets/preset-ai-service.ts#generatePresetFromDescription` | Compatibility wrapper for preset generation requests. |
| `/api/optimize-prompt` | `deprecated-compat` | `lib/ai/presets/preset-ai-service.ts#optimizePresetPrompt` | Compatibility wrapper for preset prompt optimization. |
| `/api/enhance-builtin-prompt` | `deprecated-compat` | `lib/ai/presets/preset-ai-service.ts#generateBuiltinPrompts` | Compatibility wrapper for generated/enhanced builtin prompts. |
| `/api/prompt-self-optimize` | `deprecated-compat` | `lib/ai/prompts/prompt-self-optimizer.ts` | Compatibility wrapper for analyze/optimize prompt workflows. |

## Response Metadata

All legacy generation routes return deprecation metadata headers:

- `deprecation: true`
- `x-cognia-generation-route-status`
- `x-cognia-generation-capability-id`
- `x-cognia-migration-target`
- `x-cognia-legacy-route-sunset`

Consumers should migrate to the canonical shared services and stop depending on these route wrappers.

