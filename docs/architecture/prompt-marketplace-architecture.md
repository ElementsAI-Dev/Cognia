# Prompt Marketplace Architecture

## Overview

Prompt marketplace now runs on a repository + store split:

- `lib/prompts/marketplace.ts`
  Remote-first repository abstraction with normalized fallback behavior.
- `lib/prompts/marketplace-utils.ts`
  Filter/sort/facet utilities, entity normalization, and versioned import/export schema utilities.
- `stores/prompt/prompt-marketplace-store.ts`
  Canonical marketplace state with operation-level status tracking.
- `components/prompt/marketplace/**`
  UI surfaces that consume canonical store state and expose source/fallback indicators.

## Data Source Strategy

- Remote-first is controlled by `remoteFirstEnabled` in store.
- Initial value comes from `NEXT_PUBLIC_PROMPT_MARKETPLACE_REMOTE_FIRST`.
- `refreshCatalog()` always:
  - Attempts remote when remote-first is enabled.
  - Falls back to local sample snapshot on remote failure.
  - Updates `sourceState` (`remote` / `fallback`) and `sourceWarning`.

This guarantees a usable marketplace even with network/auth/upstream failures.

## Operation State Model

Asynchronous actions write into `operationStates[operationKey]`:

- Status: `idle` | `loading` | `success` | `error`
- Optional error string
- Last update timestamp

Key operation keys:

- Install: `install:<promptId>`
- Uninstall: `uninstall:<promptId>`
- Update: `update:<promptId>`
- Check updates: `check-updates`
- Publish: `publish:<templateId>`
- Unpublish: `unpublish:<promptId>`
- Import: `import`
- Export: `export`
- Review submit/helpful:
  - `review:<promptId>`
  - `review-helpful:<reviewId>`

## Import/Export Contract

Versioned schema:

- Current export version: `1.1`
- Supported import versions: `1.1`, `1.0`

Import supports conflict strategies:

- `skip`
- `overwrite`
- `duplicate`

Import returns per-item report:

- Aggregate counts: imported/skipped/failed
- Item-level outcomes with source/target IDs and status

## Cross-Tab Consistency

Store is the single canonical source for:

- Installed prompts
- Favorites
- Recently viewed
- Published prompts
- Review state

All tabs consume these same records, so actions in detail/cards/tabs remain synchronized.

## Troubleshooting

### Marketplace is always fallback

Check:

- `NEXT_PUBLIC_PROMPT_MARKETPLACE_API_BASE_URL` is set and reachable.
- Remote-first toggle is enabled.
- `sourceWarning` text in browser banner for concrete remote error.

### Update check finds updates but update fails

Likely causes:

- Missing linked local template.
- Template update operation throws from template store.

Action:

- Inspect `operationStates["update:<id>"]`.
- Reinstall prompt to rebuild local template linkage.

### Import partially succeeds

Expected behavior for mixed payloads.

Action:

- Inspect import report item list for failed records.
- Retry with `overwrite` or `duplicate` strategy as needed.

### Publish rejected

Current publish validation requires:

- Non-empty name
- Non-empty description
- Non-empty content
- Publishable category (not `featured`/`trending`/`new`)

UI now surfaces field-level validation messages.
