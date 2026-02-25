# Dexie.js Cheatsheet — Complete API Reference

## Install

```bash
npm install dexie               # Core library (includes TypeScript typings)
npm install dexie-react-hooks   # React integration
npm install dexie-cloud-addon   # Dexie Cloud sync (optional)
```

## Imports

```ts
import { Dexie, type EntityTable, type Entity, liveQuery } from "dexie";
import { useLiveQuery, usePermissions } from "dexie-react-hooks";
import dexieCloud, { type DexieCloudTable } from "dexie-cloud-addon";
```

---

## Database Setup — Plain Interface Style (Recommended)

```ts
// db.ts
import { Dexie, type EntityTable } from "dexie";

export interface Todo {
  id: number;
  title: string;
  done: boolean;
  createdAt: number;
  tags: string[];
}

export interface Project {
  id: number;
  name: string;
  ownerId: number;
}

export const db = new Dexie("app-db") as Dexie & {
  todos: EntityTable<Todo, "id">;
  projects: EntityTable<Project, "id">;
};

db.version(1).stores({
  todos: "++id, done, createdAt, *tags",
  projects: "++id, name, ownerId"
});
```

## Database Setup — Class Style with Entity Mapping

```ts
// AppDB.ts
import { Dexie, type EntityTable } from "dexie";
import { Todo } from "./Todo";

export class AppDB extends Dexie {
  todos!: EntityTable<Todo, "id">;

  constructor() {
    super("app-db");
    this.version(1).stores({
      todos: "++id, done, createdAt, *tags"
    });
    this.todos.mapToClass(Todo);
  }
}

// Todo.ts
import { Entity } from "dexie";
import type { AppDB } from "./AppDB";

export class Todo extends Entity<AppDB> {
  id!: number;
  title!: string;
  done!: boolean;
  createdAt!: number;
  tags!: string[];

  async toggle() {
    await this.db.todos.update(this.id, { done: !this.done });
  }

  async addTag(tag: string) {
    await this.db.todos.update(this.id, (todo) => {
      todo.tags.push(tag);
    });
  }
}

// db.ts
import { AppDB } from "./AppDB";
export const db = new AppDB();
```

## Database Setup — Dexie Cloud (Synced)

```ts
import { Dexie } from "dexie";
import dexieCloud, { type DexieCloudTable } from "dexie-cloud-addon";

interface Todo {
  id: string;       // string PK for cloud
  title: string;
  done: boolean;
  owner?: string;   // auto-populated by Dexie Cloud
  realmId?: string;  // auto-populated by Dexie Cloud
}

const db = new Dexie("app-db", { addons: [dexieCloud] }) as Dexie & {
  todos: DexieCloudTable<Todo, "id">;
};

db.version(1).stores({
  todos: "@id, title, done"   // '@' = auto-generated global ID
});

db.cloud.configure({
  databaseUrl: "https://your-db.dexie.cloud",
  requireAuth: true
});
```

## Dexie Constructor Options (v4)

```ts
const db = new Dexie("name", {
  addons: [],                          // Array of DexieAddon functions
  autoOpen: true,                      // Auto-open on first query (default: true)
  cache: "cloned",                     // "cloned" | "immutable" | "disabled"
  indexedDB: customIDB,                // Custom IDBFactory (e.g., fake-indexeddb)
  IDBKeyRange: customRange,            // Matching IDBKeyRange implementation
  modifyChunkSize: 2000,               // Rows per chunk for Collection.modify()
  chromeTransactionDurability: "default" // "default" | "strict" | "relaxed"
});
```

**Cache modes:**
- `'cloned'` (default) — Deep-clones results; supports optimistic updates in liveQuery
- `'immutable'` — Freezes results with `Object.freeze()`; less memory, better perf; results are read-only
- `'disabled'` — No cache; same behavior as Dexie v3

---

## `stores()` Index Syntax

| Syntax | Meaning | Example |
| --- | --- | --- |
| `id` | Explicit primary key (manual) | `todos: "id, title"` |
| `++id` | Auto-increment primary key | `todos: "++id, title"` |
| `&email` | Unique index | `users: "++id, &email"` |
| `*tags` | Multi-entry index (array fields) | `posts: "++id, *tags"` |
| `[a+b]` | Compound index | `friends: "++id, [firstName+lastName]"` |
| `@id` | Auto-generated global ID (Dexie Cloud) | `todos: "@id, title"` |

**Rules:**
- Only declare properties you want to **index** (query with `where()`). All properties are stored regardless.
- Compound indexes enable efficient multi-field equality queries.
- Multi-entry indexes enable querying individual items within arrays.
- To delete a table in a new version, set its value to `null`.
- New versions only need to specify *changed* tables.

---

## CRUD — Single Operations

```ts
// ADD — insert new (fails on duplicate key)
const id = await db.todos.add({
  title: "Write docs",
  done: false,
  createdAt: Date.now(),
  tags: ["docs"]
});

// PUT — upsert (insert or replace entire object)
await db.todos.put({ id: 4, title: "Updated", done: true, createdAt: Date.now(), tags: [] });

// UPSERT — conditional upsert (v4+): only updates specified fields if exists
await db.todos.upsert(4, { title: "New Title", done: false });

// GET — by primary key
const todo = await db.todos.get(id);

// GET — by criteria object
const match = await db.todos.get({ title: "Write docs" });

// UPDATE — partial update by key
await db.todos.update(id, { done: true });

// UPDATE — with callback (v4+)
await db.todos.update(id, (todo) => {
  todo.tags.push("important");
});

// DELETE — by primary key
await db.todos.delete(id);

// CLEAR — delete all rows
await db.todos.clear();
```

## CRUD — Bulk Operations

```ts
// BULK ADD — insert many (fails entirely on first duplicate unless allKeys option)
const lastKey = await db.todos.bulkAdd(items);

// BULK ADD — with allKeys to get all generated keys
const keys = await db.todos.bulkAdd(items, { allKeys: true });

// BULK PUT — upsert many
await db.todos.bulkPut(items);

// BULK GET — get many by keys
const results = await db.todos.bulkGet([1, 2, 3]);
// Returns array with undefined for missing keys

// BULK UPDATE — update many with specific changes (v4+)
await db.todos.bulkUpdate([
  { key: 1, changes: { done: true } },
  { key: 2, changes: { title: "Renamed" } }
]);

// BULK DELETE — delete many by keys
await db.todos.bulkDelete([1, 2, 3]);

// ERROR HANDLING — BulkError
try {
  await db.todos.bulkAdd(rows);
} catch (error: any) {
  if (error?.name === "BulkError") {
    console.error(`${error.failures.length} operations failed`);
    error.failures.forEach((err: Error, i: number) => {
      console.error(`  Row ${i}: ${err.message}`);
    });
  }
  throw error;
}
```

---

## WhereClause — All 16 Operators

The `where(indexName)` method returns a `WhereClause` with these operators:

```ts
// EQUALITY
db.todos.where("done").equals(false)
db.todos.where("title").equalsIgnoreCase("hello")

// COMPARISON
db.todos.where("createdAt").above(timestamp)
db.todos.where("createdAt").aboveOrEqual(timestamp)
db.todos.where("createdAt").below(timestamp)
db.todos.where("createdAt").belowOrEqual(timestamp)

// RANGE
db.todos.where("createdAt").between(start, end)                    // exclusive bounds
db.todos.where("createdAt").between(start, end, true, true)        // inclusive bounds
db.todos.where("createdAt").between(start, end, true, false)       // include lower only

// STRING MATCHING
db.todos.where("title").startsWith("A")
db.todos.where("title").startsWithIgnoreCase("a")
db.todos.where("title").startsWithAnyOf(["A", "B", "C"])
db.todos.where("title").startsWithAnyOfIgnoreCase(["a", "b", "c"])

// SET MATCHING
db.todos.where("id").anyOf([1, 2, 3])
db.todos.where("title").anyOfIgnoreCase(["foo", "bar"])
db.todos.where("id").noneOf([1, 2, 3])
db.todos.where("id").notEqual(5)

// MULTI-RANGE
db.todos.where("createdAt").inAnyRange([
  [startA, endA],
  [startB, endB]
])

// CRITERIA OBJECT (shorthand for compound or multi-field equality)
db.friends.where({ firstName: "Angela", lastName: "Merkel" })

// COMPOUND INDEX QUERY
db.friends.where("[firstName+lastName]").equals(["Angela", "Merkel"])
db.friends.where("[firstName+lastName]").between(
  ["Angela", ""],
  ["Angela", "\uffff"]
)
```

---

## Collection — All Chainable Methods

A `Collection` is returned by `where()` operators, `Table.toCollection()`, `Table.orderBy()`, etc.

### Filtering & Narrowing

```ts
collection.and(item => item.score > 50)     // Add JS filter (alias: filter())
collection.filter(item => item.active)       // JS-based filter
collection.or("otherIndex")                  // OR with another WhereClause
collection.distinct()                        // Remove duplicates by primary key
collection.until(item => item.id > 100)      // Stop iteration at condition
collection.until(item => item.id > 100, true) // Include the stop item
```

### Ordering & Pagination

```ts
collection.reverse()                         // Reverse index order
collection.offset(20)                        // Skip N items
collection.limit(10)                         // Take N items
collection.sortBy("name")                    // In-memory sort by property path (returns Promise<T[]>)
collection.desc()                            // Alias for reverse()
```

### Retrieval

```ts
collection.toArray()                         // Get all as array
collection.first()                           // Get first item (or undefined)
collection.last()                            // Get last item (or undefined)
collection.count()                           // Count matching items
collection.keys()                            // Get index keys
collection.primaryKeys()                     // Get primary keys
collection.uniqueKeys()                      // Get unique index keys
```

### Iteration

```ts
collection.each(item => { /* ... */ })           // Iterate each item
collection.eachKey(key => { /* ... */ })          // Iterate each index key
collection.eachPrimaryKey(pk => { /* ... */ })    // Iterate each primary key
collection.eachUniqueKey(key => { /* ... */ })    // Iterate each unique key
```

### Modification

```ts
// Modify with changes object
collection.modify({ done: true, updatedAt: Date.now() })

// Modify with callback
collection.modify(item => {
  item.score += 10;
})

// Replace entire object via this.value
collection.modify(function(item) {
  this.value = { ...item, transformed: true };
})

// Delete via this.value
collection.modify(function() {
  delete this.value;
})

// Arrow function style (ref parameter)
collection.modify((item, ref) => {
  ref.value = { ...item, transformed: true };
})

// Delete all matching
collection.delete()

// Nested key modification
db.friends.where("props.shoeSize").aboveOrEqual(47).modify({
  "props.bigfoot": true
})
```

### Utility

```ts
collection.clone()                           // Clone collection (does not clone data)
collection.raw()                             // Skip reading hooks
```

---

## Table — Direct Methods

```ts
db.todos.toArray()                  // Get all rows
db.todos.toCollection()             // Convert to Collection
db.todos.count()                    // Count all rows
db.todos.each(fn)                   // Iterate all rows
db.todos.filter(fn)                 // Filter all rows (returns Collection)
db.todos.orderBy("createdAt")       // Order by indexed field (returns Collection)
db.todos.reverse()                  // Reverse primary key order (returns Collection)
db.todos.limit(10)                  // First N rows (returns Collection)
db.todos.offset(5)                  // Skip N rows (returns Collection)
db.todos.where("field")             // Start WhereClause
db.todos.get(key)                   // Get by PK
db.todos.get({ name: "x" })         // Get by criteria
db.todos.add(obj)                   // Insert
db.todos.put(obj)                   // Upsert (full replace)
db.todos.update(key, changes)       // Partial update
db.todos.upsert(key, changes)       // Conditional upsert (v4+)
db.todos.delete(key)                // Delete by PK
db.todos.clear()                    // Delete all
db.todos.bulkAdd(items)             // Bulk insert
db.todos.bulkPut(items)             // Bulk upsert
db.todos.bulkGet(keys)              // Bulk get
db.todos.bulkUpdate(entries)        // Bulk partial update (v4+)
db.todos.bulkDelete(keys)           // Bulk delete
db.todos.mapToClass(MyClass)        // Map to Entity class
db.todos.hook("creating", fn)       // Legacy hook
db.todos.hook("reading", fn)        // Legacy hook
db.todos.hook("updating", fn)       // Legacy hook
db.todos.hook("deleting", fn)       // Legacy hook
```

---

## Transactions

```ts
// Basic read-write transaction
await db.transaction("rw", db.todos, db.projects, async () => {
  const id = await db.todos.add({ title: "New", done: false, createdAt: Date.now(), tags: [] });
  await db.projects.add({ name: "Proj", ownerId: 1 });
  // If any operation fails, ALL changes are rolled back
});

// Read-only transaction
await db.transaction("r", db.todos, async () => {
  const count = await db.todos.count();
  const first = await db.todos.toCollection().first();
});

// Nested/parent transaction — umbrella transaction
await db.transaction("rw", db.todos, db.projects, async () => {
  await addTodo();       // Uses inner transaction, absorbed by parent
  await updateProject(); // Uses inner transaction, absorbed by parent
  // If anything fails, parent + all children roll back
});

// Error handling — catch within transaction keeps it alive
await db.transaction("rw", db.todos, async () => {
  try {
    await db.todos.add({ id: 1, title: "First" });
    await db.todos.add({ id: 1, title: "Duplicate" }); // will fail
  } catch (e) {
    console.warn("Caught duplicate, transaction continues");
    // Catching = handling. Transaction is NOT aborted.
    // Re-throw if you want transaction to abort: throw e;
  }
});

// Transaction lifetime rule:
// Transactions auto-commit when no more async operations are pending.
// Do NOT use setTimeout/fetch inside transactions without Dexie.waitFor().

// Keep transaction alive during external async:
await db.transaction("rw", db.todos, async () => {
  const data = await Dexie.waitFor(fetch("/api/data").then(r => r.json()));
  await db.todos.bulkAdd(data);
});
```

**Transaction rules:**
- Mode: `"r"` (readonly) or `"rw"` (readwrite)
- List ALL tables that will be accessed
- Auto-commits when callback completes without error
- Catching a failed DB operation inside the transaction = handling it (transaction stays alive)
- Works with zone-based context — reusable functions auto-join the current transaction

---

## Migration & Versioning

```ts
// Version 1: initial schema
db.version(1).stores({
  todos: "++id, done, createdAt",
  projects: "++id, name"
});

// Version 2: add index (no data transform needed)
db.version(2).stores({
  todos: "++id, done, createdAt, *tags"
  // projects not listed = unchanged
});

// Version 3: rename fields with data migration
db.version(3)
  .stores({
    todos: "++id, done, createdAt, *tags, priority"
  })
  .upgrade(async (tx) => {
    await tx.table("todos").toCollection().modify((todo: any) => {
      if (!Array.isArray(todo.tags)) todo.tags = [];
      if (todo.priority === undefined) todo.priority = "medium";
    });
  });

// Version 4: delete a table
db.version(4).stores({
  projects: null  // Delete projects table
});

// Version 5: add new table
db.version(5).stores({
  categories: "++id, &name"
});

// Population event — runs ONCE on first DB creation
db.on("populate", (tx) => {
  tx.table("categories").add({ name: "Default" });
});

// Ready event — runs on every open (good for async population)
db.on("ready", async (db) => {
  const count = await db.table("categories").count();
  if (count === 0) {
    const data = await fetch("/api/seed").then(r => r.json());
    await db.table("categories").bulkAdd(data);
  }
});
```

**Migration rules (Dexie ≥3.0):**
- You can modify existing version declarations (increment version number)
- Only keep versions that have an `upgrade()` function
- New versions only need to list changed tables
- Indexes not listed in new version are dropped
- Tables not listed in new version are preserved unchanged
- Upgrades must be idempotent and deterministic

---

## Live Queries — Framework Examples

### React

```tsx
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";

function TodoList() {
  // Basic query — re-renders when data changes
  const todos = useLiveQuery(
    () => db.todos.where("done").equals(false).sortBy("createdAt"),
    []  // deps array (like useEffect)
  );

  // With default value (avoids undefined check)
  const count = useLiveQuery(() => db.todos.count(), [], 0);

  // With external dependency
  const [maxAge, setMaxAge] = useState(30);
  const friends = useLiveQuery(
    () => db.friends.where("age").belowOrEqual(maxAge).toArray(),
    [maxAge]  // re-query when maxAge changes
  );

  // Complex multi-table query
  const dashboard = useLiveQuery(async () => {
    const [todos, projects] = await Promise.all([
      db.todos.where("done").equals(false).toArray(),
      db.projects.toArray()
    ]);
    return { todos, projects, totalTodos: todos.length };
  });

  // Calling non-Dexie async APIs — MUST wrap with Promise.resolve()
  const enriched = useLiveQuery(async () => {
    const todos = await db.todos.toArray();
    const meta = await Promise.resolve(fetch("/api/meta").then(r => r.json()));
    return { todos, meta };
  });

  if (!todos) return <p>Loading...</p>;

  return (
    <ul>
      {todos.map(t => <li key={t.id}>{t.title}</li>)}
    </ul>
  );
}
```

### Svelte

```svelte
<script>
  import { liveQuery } from "dexie";
  import { db } from "./db";

  let todos = liveQuery(() =>
    db.todos.where("done").equals(false).toArray()
  );
</script>

<ul>
  {#each ($todos || []) as todo (todo.id)}
    <li>{todo.name}</li>
  {/each}
</ul>
```

### Angular

```ts
import { liveQuery } from "dexie";
import { db } from "./db";

@Component({
  template: `
    <li *ngFor="let todo of todos$ | async">{{ todo.title }}</li>
  `
})
export class TodoListComponent {
  todos$ = liveQuery(() => db.todos.toArray());
}
```

### Vanilla JS (Observable)

```ts
import { liveQuery } from "dexie";

const subscription = liveQuery(
  () => db.todos.where("done").equals(false).toArray()
).subscribe({
  next: (result) => console.log("Todos:", result),
  error: (error) => console.error(error)
});

// Later: cleanup
subscription.unsubscribe();
```

---

## Relationships / Joins

```ts
// Manual join — parallel queries
async function getTodosWithProjects() {
  const todos = await db.todos.toArray();
  await Promise.all(
    todos.map(async (todo) => {
      (todo as any).project = await db.projects.get(todo.projectId);
    })
  );
  return todos;
}

// Efficient join with anyOf
async function getProjectTodos(projectId: number) {
  return db.todos.where("projectId").equals(projectId).toArray();
}

// Band → Genre + Albums join
async function getBandsWithDetails() {
  const bands = await db.bands.where("name").startsWith("A").toArray();
  await Promise.all(
    bands.map(async (band) => {
      [band.genre, band.albums] = await Promise.all([
        db.genres.get(band.genreId),
        db.albums.where("id").anyOf(band.albumIds).toArray()
      ]);
    })
  );
  return bands;
}
```

---

## Storing Binary Data

```ts
// Store Blob
const res = await fetch("image.png");
const blob = await res.blob();
await db.files.put({ name: "photo", data: blob });

// Store ArrayBuffer (IndexedDB 2.0 — can be indexed)
db.version(1).stores({ items: "id, name" });
await db.items.put({
  id: new Uint8Array([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]),
  name: "Binary key item"
});
```

---

## Dexie Static Methods & Properties

```ts
Dexie.delete("dbName")              // Delete a database
Dexie.exists("dbName")              // Check if DB exists
Dexie.getDatabaseNames()            // List all DB names at origin
Dexie.debug = true                  // Enable debug logging
Dexie.debug = "dexie"               // Verbose debug
Dexie.semVer                        // Semantic version string
Dexie.version                       // Numeric version
Dexie.waitFor(promise)              // Keep transaction alive during external async
Dexie.ignoreTransaction(fn)         // Run fn outside current transaction
```

---

## Primary References

- `https://dexie.org/docs/` — Main documentation
- `https://dexie.org/docs/API-Reference` — Full API reference
- `https://dexie.org/docs/Typescript` — TypeScript guide (Dexie 4)
- `https://dexie.org/docs/liveQuery()` — Live query deep dive
- `https://dexie.org/docs/Version/Version.stores()` — Schema syntax
- `https://dexie.org/docs/Table/Table` — Table class reference
- `https://dexie.org/docs/Collection/Collection` — Collection class reference
- `https://dexie.org/docs/WhereClause/WhereClause` — WhereClause reference
- `https://github.com/dexie/Dexie.js` — Source repository
