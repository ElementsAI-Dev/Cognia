# Plugin Management Enhancement Plan

Complete the missing and simplified plugin configuration/management features by wiring up unused code paths, exposing hidden controls, and adding critical missing UI components.

---

## Analysis Summary

After thorough research of the codebase (80+ lib files, 17 hooks, 2 stores, 40+ component files, 5 type files) and VS Code/JetBrains/Obsidian plugin system best practices, the following gaps were identified. All improvements reuse existing `lib/plugin` infrastructure — no duplicate implementations.

---

## Phase 1: Fix Broken/Placeholder Code (High Priority)

### 1.1 PluginManager Install Dialog → Use Real Install Logic
- **File**: `components/plugin/core/plugin-manager.tsx` (lines 174-179)
- **Problem**: Install button has `// Install logic would go here` placeholder
- **Fix**: Call `getPluginManager().installPlugin(installSource, { type: 'git' })` or `{ type: 'local' }` based on input, reusing the same pattern from `plugin-settings-page.tsx` (lines 299-318)

### 1.2 Expose Sort & GroupBy Controls in PluginSettingsPage
- **File**: `components/plugin/config/plugin-settings-page.tsx` (lines 121-125)
- **Problem**: `_sortBy`/`_setSortBy` and `_setGroupBy` are declared with underscore prefix = intentionally unused. The UI has no sort dropdown or group-by selector
- **Fix**: Add a sort dropdown (Name/Recent/Status) and group-by toggle (None/Type/Capability/Status) to the actions bar area (around line 606)

### 1.3 Connect onImportPlugin in PluginEmptyState
- **File**: `components/plugin/config/plugin-settings-page.tsx` (line 684)
- **Problem**: `onImportPlugin={() => {}}` is a noop
- **Fix**: Wire it to trigger the import dropdown menu or directly call `handleImportFromFolder`

---

## Phase 2: Complete Simplified Features (Medium Priority)

### 2.1 Wire PluginCard Favorite to Marketplace Store
- **File**: `components/plugin/core/plugin-card.tsx` (line 24)
- **Problem**: `isFavorite` is `useState(false)` — local-only, not persisted
- **Fix**: Import `usePluginMarketplaceStore` and use `toggleFavorite`/`isFavorite` from the store. The store already handles persistence via localStorage

### 2.2 Implement Analytics Insight Actions
- **File**: `components/plugin/monitoring/plugin-analytics.tsx` (lines 228-244)
- **Problem**: `handleInsightAction` has empty `case 'disable_plugin'` and `case 'enable_plugin'` blocks
- **Fix**: Call `disablePlugin(insight.pluginId)` / `enablePlugin(insight.pluginId)` from `usePluginStore`

### 2.3 Add Installed Plugin Detail View
- **Problem**: Only marketplace plugins have a detail view (`PluginDetailModal`). Installed plugins in "My Plugins" tab only show card info and config dialog
- **Fix**: Create a `PluginInstalledDetailSheet` component (reuse Sheet pattern from `PluginDetailModal`) that shows:
  - Full manifest info (author, homepage, repository, license, dependencies)
  - Plugin health status (from `pluginHealthMonitor`)
  - Usage analytics (from `pluginAnalyticsStore`)
  - Configuration quick access
  - Changelog/version history (from `getPluginUpdater`)
  - Rollback option (from `getPluginRollbackManager`)
  - Export/share button
- Wire `onViewDetails` in `PluginCard` → open this sheet

### 2.4 Add Plugin Rollback UI
- **Problem**: `lib/plugin/lifecycle/rollback.ts` exports `PluginRollbackManager` with `getRollbackInfo`, `createRollbackPlan`, `executeRollback` but no UI exists
- **Fix**: Add a rollback section to the installed plugin detail view (2.3) with:
  - List available rollback points
  - One-click rollback with confirmation dialog
  - This reuses the existing `getPluginRollbackManager()` API

### 2.5 Add Plugin Export/Share
- **Problem**: No way to export/share installed plugins
- **Fix**: Add an "Export" action to PluginCard dropdown menu and installed detail view. Use `getPluginBackupManager().createBackup()` from `lib/plugin/lifecycle/backup.ts` to package the plugin, then trigger a download

### 2.6 Add Config Validation Feedback
- **File**: `components/plugin/schema/schema-form.tsx`
- **Problem**: `validateAgainstSchema()` exists but isn't called on submit — errors are only shown if manually passed via `errors` prop
- **Fix**: Call `validateAgainstSchema(value, schema)` in `handleSubmit` before calling `onSubmit`, display validation errors inline

---

## Phase 3: Polish & Enhancement (Low Priority)

### 3.1 Marketplace Search History & Favorites Display
- **Problem**: `usePluginMarketplaceStore` tracks `searchHistory` and `favorites` but the marketplace UI doesn't display them
- **Fix**: Add a "Recent Searches" dropdown below search input and a "Favorites" quick filter chip in `PluginMarketplace` component

### 3.2 DevTools Frontend Plugin Support
- **File**: `components/plugin/dev/plugin-dev-tools.tsx` (lines 108-109)
- **Problem**: Plugin selector filters only `python`/`hybrid` plugins — frontend plugins can't be debugged
- **Fix**: Show all enabled plugins in the selector. For frontend plugins, show the Info and Profiler tabs (hide Python Eval tab). Add a "Manifest Viewer" tab for all plugin types

---

## Files to Modify (Estimated)

| File | Changes |
|------|---------|
| `components/plugin/core/plugin-manager.tsx` | Fix install logic |
| `components/plugin/core/plugin-card.tsx` | Wire favorite to store, add export/detail actions |
| `components/plugin/config/plugin-settings-page.tsx` | Add sort/groupby UI, fix onImportPlugin, wire detail view |
| `components/plugin/monitoring/plugin-analytics.tsx` | Implement insight actions |
| `components/plugin/schema/schema-form.tsx` | Add validation on submit |
| `components/plugin/dev/plugin-dev-tools.tsx` | Support frontend plugins |
| `components/plugin/marketplace/plugin-marketplace.tsx` | Add search history, favorites |
| **NEW** `components/plugin/core/plugin-installed-detail.tsx` | Installed plugin detail sheet |

## Files NOT Modified (No Duplication)

- `lib/plugin/*` — All backend logic already exists
- `stores/plugin/*` — Store is complete
- `hooks/plugin/*` — Hooks are complete
- `types/plugin/*` — Types are complete
