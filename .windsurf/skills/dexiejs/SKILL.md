---
name: dexiejs
description: Build, extend, and troubleshoot IndexedDB data layers with Dexie.js. Use when implementing or debugging Dexie-based browser storage, including schema design with `version().stores()`, CRUD/query chains, transactions, migrations with `upgrade()`, `dexie-react-hooks` live queries, bulk operations, and offline-first data flows in web/Electron/Capacitor apps.
---

# Dexie.js — Comprehensive Skill

## Overview

Dexie.js is a lightweight wrapper around IndexedDB that provides a concise, typed, Promise-based API for client-side persistence. Current stable version is **4.x** (with v4.1.0 betas). Key capabilities:

- **Schema declaration** via `version().stores()` with auto-increment, unique, multi-entry, and compound indexes
- **Full CRUD** with single and bulk operations (`add`, `put`, `update`, `delete`, `bulkAdd`, `bulkPut`, `bulkDelete`, `bulkGet`, `bulkUpdate`, `upsert`)
- **Rich query engine** via `WhereClause` (16+ operators) and `Collection` (20+ chainable methods)
- **ACID transactions** with nested/parent transaction support and zone-based context propagation
- **Live queries** via `liveQuery()` / `useLiveQuery()` for reactive UI binding (React, Svelte, Angular, Vue)
- **DBCore middleware** for intercepting all IndexedDB operations (superior to legacy hooks API)
- **Entity class mapping** via `Entity<T>` base class and `mapToClass()` for OOP patterns
- **Dexie Cloud** add-on for offline-first sync, auth, access control, and CRDT collaboration
- **TypeScript-first** with `EntityTable<T, K>` and `DexieCloudTable<T, K>` generics
- **Cache modes** in v4: `'cloned'` (default), `'immutable'` (frozen, less memory), `'disabled'` (v3 behavior)

## Workflow Decision Tree

1. **New database module** → `Database Setup Workflow`
2. **Adding features** to existing app → `Feature Implementation Workflow`
3. **Changing schema** in production → `Migration Workflow`
4. **Reactive UI binding** → `Live Query Workflow`
5. **Multi-user sync** → `Dexie Cloud Workflow`
6. **Custom interceptors** → `Middleware Workflow`
7. **Writing tests** → `Testing Workflow`
8. **Fixing data bugs / performance** → `Troubleshooting Workflow`

---

## Database Setup Workflow

1. Create a single `db.ts` module exporting one Dexie instance.
2. Define TypeScript interfaces for each entity.
3. Cast the Dexie instance with `EntityTable<T, "pk">` for type-safe table access.
4. Declare stores with `db.version(1).stores({...})` — only index fields you query on, not all columns.
5. For OOP patterns, create entity classes extending `Entity<AppDB>` and call `table.mapToClass(Class)`.
6. Optionally seed initial data with `db.on('populate', tx => { ... })`.
7. Keep all direct table access behind repository-style functions for consistency.
8. Set `cache` option if needed: `'immutable'` for read-heavy apps, `'disabled'` for v3 compat.

**Schema index syntax quick reference:**

| Syntax                  | Meaning                       |
| ----------------------- | ----------------------------- |
| `id`                    | Explicit primary key           |
| `++id`                  | Auto-increment primary key     |
| `&email`                | Unique index                   |
| `*tags`                 | Multi-entry index (for arrays) |
| `[firstName+lastName]`  | Compound index                 |

See `references/dexie-cheatsheet.md` for typed setup templates and full syntax.

## Feature Implementation Workflow

1. Choose one table and one use case at a time.
2. Implement CRUD with appropriate methods:
   - `add()` for insert (fails on duplicate key)
   - `put()` for upsert (insert or replace)
   - `update(key, changes)` for partial update
   - `upsert(key, changes)` for conditional upsert (v4+)
   - `delete(key)` for removal
3. Build indexed query chains: `where(index)` → WhereClause → Collection → `toArray()`/`first()`/`count()`.
4. Use `filter()` or `and()` for non-indexed criteria as a fallback after indexed narrowing.
5. Use `sortBy(prop)` for in-memory sort, `orderBy(index)` for indexed sort.
6. Wrap multi-table writes in `db.transaction('rw', table1, table2, async () => { ... })`.
7. Use bulk operations (`bulkPut`, `bulkAdd`, `bulkDelete`, `bulkGet`, `bulkUpdate`) for batch imports.
8. Handle `BulkError` for partial failures — inspect `error.failures` array.
9. Use `Collection.modify()` for batch updates with a function or changes object.
10. Use `Collection.delete()` for batch deletion by query.

See `references/dexie-cheatsheet.md` for CRUD, query, transaction, and bulk templates.

## Migration Workflow

1. **Dexie ≥3.0**: Increment the version number and update the stores spec directly. You only need to keep versions that have an `upgrade()` function.
2. **Dexie <3.0**: Never edit old version declarations. Add a new `db.version(n)` entry.
3. Add `.upgrade(async tx => { ... })` only when data transformation is required.
4. Keep upgrades **idempotent** and **deterministic**.
5. New versions only need to specify *changed* tables — unchanged tables are inherited.
6. To **delete a table**, set its stores value to `null`.
7. To **remove an index**, omit it from the new version's stores spec.
8. Test upgrade paths from every previously shipped version, not only fresh installs.
9. Guard risky transforms with export/backup capability if data loss is possible.
10. Use `db.on('populate')` for first-time seeding; use `db.on('ready')` for async population (AJAX).

See `references/dexie-cheatsheet.md` for migration and versioning templates.

## Live Query Workflow

1. Import `liveQuery` from `'dexie'` or `useLiveQuery` from `'dexie-react-hooks'`.
2. Pass a querier function that returns a Dexie Promise. The observable re-fires when underlying data changes.
3. Observation is **fine-grained**: only queries whose results would change trigger re-execution.
4. Works across tabs/workers via BroadcastChannel.
5. **Rules for querier**:
   - Only call Dexie async APIs directly.
   - If calling non-Dexie async APIs (fetch, webCrypto), wrap with `Promise.resolve()` or `Dexie.waitFor()`.
6. In React: `useLiveQuery(() => query, [deps], defaultValue)` — returns `undefined` while loading.
7. In Svelte: use `$` prefix on `liveQuery()` result (Svelte Store contract compatible).
8. In Angular: pipe `liveQuery()` result through `| async`.
9. In Vue: use `useObservable()` from `@vueuse/rxjs`.
10. Use `useLiveQuery` as a **persistent state manager** — avoids keeping entire DB in RAM.

See `references/dexie-cheatsheet.md` for framework-specific live query examples.

## Dexie Cloud Workflow

1. Create a cloud database: `npx dexie-cloud create`.
2. Install: `npm install dexie-cloud-addon`.
3. Add addon: `new Dexie('name', { addons: [dexieCloud] })`.
4. Use `@id` for auto-generated global IDs (instead of `++id`).
5. Configure: `db.cloud.configure({ databaseUrl, requireAuth })`.
6. Use `DexieCloudTable<T, 'id'>` type for synced tables (adds `owner`, `realmId`).
7. Access control: data is private by default; share via realms, roles, members.
8. Use `usePermissions(entity)` hook to check `can.update('field')`, `can.delete()`.
9. Supports Y.js CRDT for collaborative editing (TipTap, Monaco, tldraw).
10. Deployment: SaaS or self-hosted (Node.js + PostgreSQL).

See `references/advanced-patterns.md` for Dexie Cloud setup and access control.

## Middleware Workflow

1. Use `db.use({ stack: 'dbcore', name, create })` to register DBCore middleware.
2. The `create` function receives a `DBCore` instance and returns a modified one.
3. Override `table(name)` to intercept specific table operations.
4. Override `mutate(req)` to intercept all writes (bulkPut, bulkAdd, bulkDelete, deleteRange).
5. Override `get(req)` / `getMany(req)` / `query(req)` / `count(req)` to intercept reads.
6. Middleware runs for **all** operations — superior to the legacy hooks API.
7. Legacy hooks (`hook('creating')`, `hook('updating')`, `hook('deleting')`, `hook('reading')`) still work but are internally implemented via DBCore.
8. Use hooks for simple use cases: full-text search indexing, audit trails, computed fields.

See `references/advanced-patterns.md` for middleware and hooks examples.

## Testing Workflow

1. Install `fake-indexeddb` for Node.js testing: `npm install -D fake-indexeddb`.
2. In test setup, import `fake-indexeddb/auto` **before** Dexie to polyfill `globalThis.indexedDB`.
3. Create a **fresh Dexie instance per test** to avoid state leakage.
4. In `afterEach`, call `db.delete()` then `db.close()` to clean up.
5. For unit tests that don't need real IndexedDB, mock Dexie tables with jest/vitest mocks.
6. Test upgrade paths: create DB at version N, close, reopen at version N+1, verify data.
7. Test error scenarios: duplicate keys, missing indexes, aborted transactions.
8. Test bulk operations: verify `BulkError` handling with intentional constraint violations.
9. Test live queries: verify that `useLiveQuery` re-renders on data mutation.
10. Use `Dexie.debug = true` for verbose logging during test development.

See `references/advanced-patterns.md` for testing setup and patterns.

## Troubleshooting Workflow

1. Reproduce with a minimal operation path and explicit `await` boundaries.
2. Enable debug mode: `Dexie.debug = true` for detailed console output.
3. Verify schema/index definitions match your query patterns.
4. Check transaction scope: ensure **all touched tables** are included in `db.transaction()`.
5. Verify async flow: missing `await` silently drops errors and breaks transaction scope.
6. Validate browser context: writes require user gesture in some restricted contexts.
7. Inspect IndexedDB in DevTools → Application → IndexedDB for actual stored data.
8. Map errors to fix actions using `references/troubleshooting.md`.
9. For performance: check if queries use indexed fields; add compound indexes for multi-field filters.
10. For cross-tab issues: verify `liveQuery` broadcasts work (BroadcastChannel API).

See `references/troubleshooting.md` for symptom → fix checklist.

---

## Output Template

When implementing or reviewing Dexie changes, format results like this:

```markdown
## Dexie Scope
- Tables affected:
- Key indexes used:
- Queries modified/added:
- Transaction boundaries:

## Changes Applied
- Schema/version updates:
- Repository/API changes:
- Transaction or bulk logic:
- Live query bindings:
- Middleware/hooks:

## Validation
- Manual checks performed:
- Edge cases covered:
- Migration path tested:
- Performance impact:
- Remaining risks:
```

---

## Resources

- `references/dexie-cheatsheet.md` — Complete API reference: schema syntax, typed setup, all CRUD/query/transaction/bulk/migration patterns, framework-specific live queries.
- `references/troubleshooting.md` — Error triage, performance diagnosis, migration safety, transaction debugging, cross-tab issues.
- `references/advanced-patterns.md` — DBCore middleware, Entity classes, Dexie Cloud, hooks, relationships/joins, testing, cache modes, binary data, population events.
- Official docs:
  - `https://dexie.org/docs/` — Main documentation hub
  - `https://dexie.org/docs/API-Reference` — Quick reference with all classes
  - `https://dexie.org/docs/Typescript` — TypeScript setup guide (Dexie 4)
  - `https://dexie.org/docs/liveQuery()` — Live query deep dive
  - `https://dexie.org/docs/DBCore/DBCore` — Middleware architecture
  - `https://dexie.org/docs/Dexie/Dexie.use()` — Middleware registration
  - `https://dexie.org/cloud/` — Dexie Cloud overview
  - `https://dexie.org/docs/Tutorial/Design` — Architecture and design principles
  - `https://github.com/dexie/Dexie.js` — Source repository
