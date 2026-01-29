# Dead Code Report

**Date**: 2025-01-29  
**Target**: `src-tauri/` (Rust backend)

## Summary

| Category | Count | Size Reduction |
|----------|-------|----------------|
| Files Deleted | 3 | ~1,200 lines |
| Functions Removed | 12 | ~300 lines |
| Unused Imports Fixed | 15+ | N/A |
| Tests Removed | 9 | ~80 lines |
| Dependencies Removed | 1 | notify crate |

## Removed Files

### Plugin System Dead Code

| File | Lines | Reason |
|------|-------|--------|
| `src-tauri/src/plugin/metrics.rs` | ~400 | Never constructed or called |
| `src-tauri/src/plugin/signature.rs` | ~200 | Never constructed or called |
| `src-tauri/src/plugin/watcher.rs` | ~300 | Never constructed or called |

## Removed Functions/Exports

### `src-tauri/src/tray.rs`

| Item | Type | Reason |
|------|------|--------|
| `TrayIconState` | enum | Never used outside file |
| `update_tray_icon` | function | Never called |

### `src-tauri/src/commands/extensions/plugin.rs`

| Item | Type | Reason |
|------|------|--------|
| `PluginWatcherState` | struct | Never constructed |
| `plugin_watch_start` | command | Never invoked |
| `plugin_watch_stop` | command | Never invoked |
| `plugin_watch_is_active` | command | Never invoked |
| `plugin_watch_add_path` | command | Never invoked |
| `plugin_watch_remove_path` | command | Never invoked |
| `plugin_marketplace_search` | command | Never invoked |
| `plugin_marketplace_get` | command | Never invoked |
| `create_plugin_watcher` | function | Never called |

## Fixed Unused Imports

### Files with import cleanup:

- `src-tauri/src/commands/extensions/skill_seekers.rs` - Removed unused types
- `src-tauri/src/commands/system/tray.rs` - Removed `TrayState` import
- `src-tauri/src/context/file_context.rs` - Removed `warn` macro
- `src-tauri/src/context/screen_content.rs` - Removed `warn` macro
- `src-tauri/src/context/mod.rs` - Removed unused re-exports
- `src-tauri/src/plugin/mod.rs` - Removed deleted module re-exports

## Removed Tests

| File | Tests Removed | Reason |
|------|---------------|--------|
| `src-tauri/src/tray.rs` | 9 tests | Referenced deleted `TrayIconState` |

## Dependencies Removed

| Dependency | Version | Reason |
|------------|---------|--------|
| `notify` | 6.1 | Only used by deleted `plugin/watcher.rs` |

## Remaining Dead Code (Deferred)

The following dead code was identified but **not removed** due to:
- Potential future use
- Used in tests
- Complex interdependencies

| File | Item | Reason for Deferral |
|------|------|---------------------|
| `plugin/python.rs` | Multiple methods | Complex Python integration |
| `context/screen_content.rs` | Analysis methods | Platform-specific features |
| `jupyter/kernel.rs` | Utility methods | May be needed for Jupyter |
| `http.rs` | Proxy functions | May be needed for networking |

## Verification

- ✅ `cargo build` - Compiles successfully
- ✅ `cargo build --release` - Release build successful
- ⚠️ `cargo test` - Compiles but runtime DLL issue (pre-existing)

## Recommendations

1. **Plugin System**: Consider removing entire `plugin/` module if not actively developed
2. **Context Module**: Review `screen_content.rs` analysis methods for actual usage
3. **HTTP Module**: Evaluate if proxy functions will be needed

## Commits

Changes should be committed with:
```
chore: remove dead code from plugin system

- Delete unused modules: metrics.rs, signature.rs, watcher.rs
- Remove PluginWatcher commands and marketplace functions
- Remove TrayIconState enum and update_tray_icon function
- Clean up unused imports across multiple files
- Remove notify dependency (only used by deleted watcher)
```
