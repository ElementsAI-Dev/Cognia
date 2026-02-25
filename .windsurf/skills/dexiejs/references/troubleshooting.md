# Dexie.js Troubleshooting — Comprehensive Guide

## Fast Diagnosis Order

1. Enable debug mode: `Dexie.debug = true` for verbose console output.
2. Confirm schema and indexes match your query patterns in `stores()`.
3. Confirm the database version path and upgrade behavior.
4. Confirm async flow — every Dexie operation must be `await`ed or `.then()`ed.
5. Confirm transaction scope: all touched tables must be listed.
6. Confirm browser support and storage permissions (quota, private browsing).
7. Inspect IndexedDB in DevTools → Application → IndexedDB for actual stored data and schema.
8. Check the error class name — Dexie throws typed errors (see Error Types below).

---

## Error Types and Fixes

### `ConstraintError`
**Symptom**: Insert or update fails with "Key already exists".
- **Cause**: Duplicate primary key or unique index (`&field`) violation.
- **Fix**: Use `put()` instead of `add()` for upsert behavior.
- **Fix**: Check if the unique field value already exists before `add()`.
- **Fix**: For bulk operations, use `bulkPut()` instead of `bulkAdd()`.

### `NotFoundError`
**Symptom**: Update or delete fails because key doesn't exist.
- **Fix**: Check existence with `get()` before `update()`.
- **Fix**: Use `put()` which creates if not exists.

### `BulkError`
**Symptom**: Bulk operation partially fails.
- **Cause**: One or more items violate constraints.
- **Fix**: Catch and inspect `error.failures` array and `error.failedKeys`.
- **Fix**: Pre-validate rows before bulk operations.
```ts
try {
  await db.todos.bulkAdd(rows);
} catch (e: any) {
  if (e.name === "BulkError") {
    console.error(`${e.failures.length} of ${rows.length} failed`);
    e.failures.forEach((err: Error, i: number) => {
      console.error(`  Key ${e.failedKeys[i]}: ${err.message}`);
    });
  }
}
```

### `AbortError` / Transaction Aborted
**Symptom**: Transaction silently aborts, data not persisted.
- **Cause 1**: Unhandled error inside transaction — any exception aborts it.
- **Cause 2**: Missing table in transaction scope.
- **Cause 3**: Browser closed or tab navigated away mid-transaction.
- **Cause 4**: Transaction timed out — `setTimeout`/`fetch` used inside transaction without `Dexie.waitFor()`.
- **Fix**: Include ALL accessed tables in `db.transaction('rw', table1, table2, ...)`.
- **Fix**: Re-throw caught errors if you want the transaction to abort: `catch(e) { throw e; }`.
- **Fix**: Use `Dexie.waitFor(promise)` for external async calls within transactions.
- **Fix**: Remember: catching a DB error inside a transaction = "handling" it, so the transaction continues.

### `DatabaseClosedError`
**Symptom**: Operations fail because database is closed.
- **Fix**: Ensure `db.open()` completes before operations (or use `autoOpen: true`, the default).
- **Fix**: After `db.close()`, call `db.open()` again before further operations.
- **Fix**: Check `db.isOpen()` before critical paths.

### `UpgradeError`
**Symptom**: Database fails to open during version upgrade.
- **Cause**: Error inside `upgrade()` callback.
- **Fix**: Make `upgrade()` functions idempotent — safe to re-run.
- **Fix**: Test upgrade from every previously shipped version.
- **Fix**: Don't throw inside `upgrade()` unless you want to block the DB from opening.

### `VersionError`
**Symptom**: "The requested version (X) is less than the existing version (Y)."
- **Cause**: Code has a lower version number than what's already in the browser's IndexedDB.
- **Fix**: Never decrease version numbers.
- **Fix**: If testing, delete the database first: `Dexie.delete("dbName")`.

### `QuotaExceededError`
**Symptom**: Write operations fail due to storage quota.
- **Fix**: Implement data cleanup / archival strategy.
- **Fix**: Use `navigator.storage.estimate()` to check available quota.
- **Fix**: Request persistent storage: `navigator.storage.persist()`.
- **Fix**: In private/incognito mode, quota is severely limited (often 5-10 MB).

### `InvalidStateError`
**Symptom**: Operations fail with "database connection is closing".
- **Fix**: Don't call `db.close()` while operations are pending.
- **Fix**: Use `async/await` to ensure sequential operation flow.

### `NoSuchDatabaseError`
**Symptom**: Opening a non-existent database without schema fails.
- **Fix**: Always define at least one `version().stores()` before opening.
- **Fix**: Or use `allowEmptyDB: true` in constructor options for dynamic mode.

---

## Common Symptoms and Fixes

### Empty Query Results Despite Existing Data
1. Verify the queried field is actually indexed in `stores()`.
2. Check field name spelling — `where("createdAt")` must match exactly.
3. Verify data type: IndexedDB compares types strictly. `where("age").equals("25")` won't match `25`.
4. Check if data was written in a different transaction that hasn't committed yet.
5. Try `db.todos.toArray()` to see all data and verify the field exists.
6. For compound indexes: `where("[a+b]").equals(["x", "y"])` — must pass an array.

### Live Query Not Updating
1. Ensure changes are made through Dexie.js (not raw IndexedDB or DevTools).
2. Check that the querier function only uses Dexie async APIs (wrap non-Dexie with `Promise.resolve()`).
3. Verify the observable is subscribed (React: `useLiveQuery`, Svelte: `$prefix`).
4. Test if changes in another tab trigger updates (BroadcastChannel must be available).
5. Check if `cache: 'disabled'` is set — optimistic updates won't work.
6. Ensure the query would actually produce different results after the mutation.

### Data Disappears After Page Reload
1. Check if write operations are actually `await`ed — missing `await` = fire-and-forget.
2. Verify transaction wasn't aborted (uncaught error inside transaction).
3. Check if `db.delete()` is being called on startup (e.g., in test code left in production).
4. In incognito/private mode, data may not persist across sessions.

### Type Mismatches in TypeScript
1. Use `EntityTable<T, "pkField">` for typed table access.
2. For auto-increment keys, the PK property should be optional on insert:
   ```ts
   interface Todo {
     id: number; // Required in DB, but auto-generated
     title: string;
   }
   // When adding, id is auto-generated so you can omit it
   await db.todos.add({ title: "Test" } as any); // Or use Omit<Todo, "id">
   ```
3. Use `DexieCloudTable<T, "id">` for Dexie Cloud tables (adds `owner`, `realmId`).

### Cross-Tab / Cross-Worker Issues
1. Live queries use `BroadcastChannel` to notify across browsing contexts.
2. Ensure you're using Dexie ≥3.1 for cross-tab observation.
3. Service Workers can also trigger live query updates if using Dexie.
4. If BroadcastChannel is not available (older browsers), cross-tab updates won't work.

---

## Performance Checklist

### Indexing
- **Always** query indexed fields with `where()`. Non-indexed queries use full table scans.
- Add compound indexes `[a+b]` for common multi-field equality filters.
- Add multi-entry indexes `*tags` for querying array membership.
- Don't over-index — each index adds write overhead and storage.
- Use DevTools → Performance to profile slow queries.

### Read Performance
- Use `limit()` + `offset()` for pagination instead of loading all records.
- Prefer `orderBy(indexedField)` over `sortBy(anyField)` — indexed sort is O(1) per item.
- Use `first()` instead of `toArray()[0]` for single-record queries.
- Use `count()` instead of `toArray().length` for counting.
- Use `primaryKeys()` or `keys()` when you only need keys, not full objects.
- Use `cache: 'immutable'` for read-heavy workloads (avoids deep cloning).

### Write Performance
- **Always** use bulk operations for multiple writes: `bulkPut()`, `bulkAdd()`, `bulkDelete()`.
- A single `bulkPut(1000)` is 10-100x faster than 1000 individual `put()` calls.
- Use `Collection.modify()` for batch updates instead of get-then-put loops.
- Wrap related writes in a single transaction to reduce IDB transaction overhead.
- Set `modifyChunkSize` in constructor options to tune `Collection.modify()` batch size.

### Memory
- Avoid loading entire large tables with `toArray()` — use paginated queries.
- Use `each()` for streaming iteration without loading all records into memory.
- With `cache: 'immutable'`, results are frozen (not cloned), reducing GC pressure.
- Clear old data periodically with `Collection.delete()` or `db.table.clear()`.

---

## Migration Safety Checklist

- Test opening from **every** previously shipped database version.
- Verify transformed records with spot checks after `upgrade()`.
- Keep `upgrade()` functions **idempotent** — safe to run multiple times.
- Keep `upgrade()` functions **deterministic** — same input → same output.
- Don't use `async/await` patterns that might outlive the upgrade transaction.
- New versions only need changed tables — unmentioned tables persist as-is.
- To remove an index: just omit it from the new stores spec.
- To delete a table: set it to `null` in the stores spec.
- Keep backward-compatible read logic while rollout is in progress.
- Document irreversible schema or data changes.
- Consider an export/backup step before risky migrations.

---

## Transaction Debugging Checklist

1. **All tables listed?** Every table accessed inside the transaction must be in the argument list.
2. **Correct mode?** Use `"rw"` for write operations, `"r"` for read-only.
3. **Await everything?** Missing `await` causes operations to run outside the transaction.
4. **No external async?** `setTimeout`, `fetch`, DOM events break transaction scope. Use `Dexie.waitFor()`.
5. **Error handling correct?** Catching an error = handling it (transaction continues). Re-throw to abort.
6. **Nested transactions?** Inner transactions are absorbed by the outer (parent) transaction.
7. **Zone context?** Functions called within a transaction auto-join it (zone-based propagation).

---

## DevTools Inspection

### View Database Contents
1. Open DevTools → **Application** tab → **IndexedDB** section.
2. Expand your database to see all object stores.
3. Click a store to browse records, inspect keys and values.
4. Right-click → **Delete database** to reset for testing.

### Debug Logging
```ts
// Enable in development
Dexie.debug = true;           // Standard debug output
Dexie.debug = "dexie";        // Verbose: logs all IndexedDB calls

// Disable in production
Dexie.debug = false;
```

### Programmatic Inspection
```ts
// List all databases at this origin
const names = await Dexie.getDatabaseNames();

// Check if specific DB exists
const exists = await Dexie.exists("my-db");

// Open unknown DB dynamically to inspect schema
const db = new Dexie("my-db");
await db.open();
console.log("Version:", db.verno);
db.tables.forEach(table => {
  console.log("Table:", table.name, "Schema:", JSON.stringify(table.schema));
});
```

---

## Browser Compatibility Notes

- **IndexedDB**: Supported in all modern browsers (Chrome, Firefox, Safari, Edge).
- **Private/Incognito mode**: Storage may be ephemeral or have reduced quota.
- **Safari**: Has had historical bugs with IndexedDB; Dexie works around most of them.
- **Multi-entry indexes** (`*field`): Supported in Chrome, Firefox, Safari. Not in older IE.
- **Binary keys** (IndexedDB 2.0): Chrome and Safari. Firefox has partial support.
- **BroadcastChannel** (for cross-tab live queries): All modern browsers except IE.
- **Web Workers**: Dexie works in Web Workers and Service Workers.

---

## Official References

- `https://dexie.org/docs/Questions-and-Answers` — FAQ
- `https://dexie.org/docs/API-Reference` — Full API reference
- `https://dexie.org/docs/Tutorial/Getting-started` — Getting started guide
- `https://dexie.org/docs/DexieErrors/DexieError` — Error class reference
- `https://dexie.org/docs/Collection/Collection.modify()` — Modify API details
- `https://dexie.org/docs/Dexie/Dexie.use()` — Middleware API
- `https://dexie.org/docs/Tutorial/Design` — Architecture guide
