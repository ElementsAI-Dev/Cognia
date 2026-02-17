# ACP Enhancement Contract (Implemented)

## Scope

This document defines the implemented ACP behavior in Cognia aligned with:
- Stable ACP methods and payloads
- Zed-compatible session extensions: `session/list`, `session/fork`, `session/resume`

## Session Extensions

- `session/list` is treated as optional.
- `session/fork` and `session/resume` are treated as optional.
- Method probing behavior:
  - If a request returns JSON-RPC `-32601`, the method is cached as unsupported.
  - Unsupported methods are hidden/disabled in UI.
- `session/resume` fallback:
  - If `session/resume` is unsupported and `loadSession` capability exists, Cognia falls back to `session/load`.

## Permission Flow

- Permission requests are forwarded to UI with full ACP payload fidelity, including:
  - `options`
  - `rawInput`
  - `locations`
  - `_meta`
- UI responds by returning selected `optionId` directly.
- Auto-approval behavior:
  - `bypassPermissions`: selects an allow-style option from ACP `options`.
  - `acceptEdits`: auto-approves only write-style requests when allow option exists.

## File System: `fs/read_text_file`

- Supports:
  - `path`
  - `line` (1-based)
  - `limit` (line count)
- If `line/limit` are omitted, returns full file content.

## Terminal Contract

### `terminal/create`
- Supports:
  - `env`
  - `outputByteLimit` (default per terminal instance)

### `terminal/output`
- Supports per-call `outputByteLimit`.
- Returns:
  - `output`
  - `truncated`
  - `exitStatus` (`exitCode`, `signal`)
  - backward-compatible `exitCode`
- Truncation policy:
  - Tail-truncate by bytes
  - UTF-8 safe boundary alignment
  - `truncated=true` when content was omitted

### `terminal/wait_for_exit`
- Returns `exitStatus` and backward-compatible `exitCode`.

## Process Exit Semantics (Rust)

- External agent process exit events now emit real exit code from process state.
- Exit signal is tracked and included in process info.
- Fixed-code exit event payload (`code: 0`) is no longer used for natural process exits.

## Tool Synchronization

- ACP `session/started` notifications update adapter tool cache immediately.
- Session tool metadata is synchronized on creation/load/resume/fork paths.
- Manager refreshes `instance.tools` after execution to avoid stale/empty tool list.

