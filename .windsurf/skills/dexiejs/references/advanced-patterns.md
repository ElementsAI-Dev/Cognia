# Dexie.js Advanced Patterns

## DBCore Middleware

DBCore is the middleware layer through which ALL runtime IndexedDB calls pass (since Dexie 3.0).
It is superior to the legacy hooks API because it:

1. Allows async actions before forwarding a call
2. Allows actions both before and after the forwarded call
3. Covers more use cases (transaction creation, custom index proxies, etc.)

### Basic Middleware Structure

```ts
import { Dexie } from "dexie";

const db = new Dexie("mydb");

db.use({
  stack: "dbcore",
  name: "MyMiddleware",
  create(downlevelDatabase) {
    return {
      ...downlevelDatabase,
      table(tableName) {
        const downlevelTable = downlevelDatabase.table(tableName);
        return {
          ...downlevelTable,
          // Override mutate to intercept ALL writes
          mutate(req) {
            console.log(`Mutating ${tableName}:`, req.type);
            return downlevelTable.mutate(req);
          },
          // Override get to intercept single reads
          get(req) {
            return downlevelTable.get(req);
          },
          // Override getMany to intercept bulk reads
          getMany(req) {
            return downlevelTable.getMany(req);
          },
          // Override query to intercept collection queries
          query(req) {
            return downlevelTable.query(req);
          },
          // Override count
          count(req) {
            return downlevelTable.count(req);
          }
        };
      }
    };
  }
});
```

### Audit Trail Middleware

```ts
db.use({
  stack: "dbcore",
  name: "AuditTrail",
  create(downlevelDatabase) {
    return {
      ...downlevelDatabase,
      table(tableName) {
        const downlevelTable = downlevelDatabase.table(tableName);
        return {
          ...downlevelTable,
          mutate(req) {
            const timestamp = Date.now();
            // Log before mutation
            console.log(`[${timestamp}] ${req.type} on ${tableName}`, {
              keys: req.keys,
              values: req.values?.length
            });

            return downlevelTable.mutate(req).then((res) => {
              // Log after mutation
              console.log(`[${timestamp}] ${req.type} completed`, {
                numFailures: res.numFailures
              });
              return res;
            });
          }
        };
      }
    };
  }
});
```

### Encryption Middleware

```ts
db.use({
  stack: "dbcore",
  name: "Encryption",
  create(downlevelDatabase) {
    return {
      ...downlevelDatabase,
      table(tableName) {
        const downlevelTable = downlevelDatabase.table(tableName);
        if (tableName !== "secrets") return downlevelTable;

        return {
          ...downlevelTable,
          mutate(req) {
            if (req.values) {
              const encrypted = {
                ...req,
                values: req.values.map((v) => ({
                  ...v,
                  data: encrypt(v.data)
                }))
              };
              return downlevelTable.mutate(encrypted);
            }
            return downlevelTable.mutate(req);
          },
          async get(req) {
            const res = await downlevelTable.get(req);
            if (res.result) {
              res.result = { ...res.result, data: decrypt(res.result.data) };
            }
            return res;
          }
        };
      }
    };
  }
});
```

### DBCore Interface Summary

```ts
interface DBCore {
  stack: "dbcore";
  transaction(tables: string[], mode: "readwrite" | "readonly"): DBCoreTransaction;
  cmp(a: any, b: any): number;
  readonly MIN_KEY: any;
  readonly MAX_KEY: any;
  readonly schema: DBCoreSchema;
  table(name: string): DBCoreTable;
}

interface DBCoreTable {
  name: string;
  schema: DBCoreTableSchema;
  mutate(req: DBCoreMutateRequest): Promise<DBCoreMutateResponse>;
  get(req: DBCoreGetRequest): Promise<any>;
  getMany(req: DBCoreGetManyRequest): Promise<any[]>;
  query(req: DBCoreQueryRequest): Promise<DBCoreQueryResponse>;
  openCursor(req: DBCoreOpenCursorRequest): Promise<DBCoreCursor | null>;
  count(req: DBCoreCountRequest): Promise<number>;
}

// Mutate request types: "add" | "put" | "delete" | "deleteRange"
```

---

## Legacy Hooks API

The hooks API still works and is NOT deprecated, but DBCore middleware is preferred for new code.

### hook('creating')

```ts
db.todos.hook("creating", function (primKey, obj, transaction) {
  // Modify obj before it's stored
  obj.createdAt = Date.now();
  obj.updatedAt = Date.now();

  // Return a value to override the primary key (only when primKey is undefined)
  // return customGeneratedKey;

  // Optional: get notified on success/failure
  this.onsuccess = (resultKey) => {
    console.log("Created with key:", resultKey);
  };
  this.onerror = (error) => {
    console.error("Create failed:", error);
  };
});
```

### hook('updating')

```ts
db.todos.hook("updating", function (modifications, primKey, obj, transaction) {
  // Return additional modifications (merged with original)
  return { updatedAt: Date.now() };

  // Optional callbacks
  this.onsuccess = (updatedObj) => { /* ... */ };
  this.onerror = (error) => { /* ... */ };
});
```

### hook('deleting')

```ts
db.todos.hook("deleting", function (primKey, obj, transaction) {
  // Perform side effects (e.g., cascade delete)
  transaction.table("comments").where("todoId").equals(primKey).delete();

  // Optional callbacks
  this.onsuccess = () => { /* ... */ };
  this.onerror = (error) => { /* ... */ };
});
```

### hook('reading')

```ts
db.todos.hook("reading", function (obj) {
  // Transform objects when read from DB
  return {
    ...obj,
    createdDate: new Date(obj.createdAt)
  };
});
```

### Full-Text Search with Hooks

```ts
db.version(1).stores({
  emails: "++id, subject, from, *messageWords"
});

db.emails.hook("creating", (primKey, obj) => {
  if (typeof obj.message === "string") {
    obj.messageWords = [...new Set(obj.message.toLowerCase().split(/\s+/))];
  }
});

db.emails.hook("updating", (mods, primKey, obj) => {
  if (mods.hasOwnProperty("message")) {
    if (typeof mods.message === "string") {
      return {
        messageWords: [...new Set(mods.message.toLowerCase().split(/\s+/))]
      };
    } else {
      return { messageWords: [] };
    }
  }
});

// Search
const results = await db.emails
  .where("messageWords")
  .startsWithIgnoreCase("hello")
  .distinct()
  .toArray();
```

### Unsubscribing Hooks

```ts
function myHook(primKey, obj, tx) { /* ... */ }

db.todos.hook("creating", myHook);         // Subscribe
db.todos.hook("creating").unsubscribe(myHook); // Unsubscribe
```

---

## Entity Class Mapping

Dexie 4 provides the `Entity<T>` base class for OOP-style table mapping.

### Entity with Methods

```ts
import { Entity } from "dexie";
import type { AppDB } from "./AppDB";

export class Friend extends Entity<AppDB> {
  id!: number;
  name!: string;
  age!: number;
  birthDate!: Date;

  // Instance method — has access to this.db
  async birthday() {
    await this.db.friends.update(this.id, (friend) => ++friend.age);
  }

  // Computed property
  get displayName() {
    return `${this.name} (${this.age})`;
  }

  // Method that uses transactions
  async transferTo(otherFriend: Friend, amount: number) {
    await this.db.transaction("rw", this.db.friends, async () => {
      await this.db.friends.update(this.id, { balance: this.balance - amount });
      await this.db.friends.update(otherFriend.id, {
        balance: otherFriend.balance + amount
      });
    });
  }
}
```

### Registering Mapped Class

```ts
import { Dexie, type EntityTable } from "dexie";
import { Friend } from "./Friend";

class AppDB extends Dexie {
  friends!: EntityTable<Friend, "id">;

  constructor() {
    super("AppDB");
    this.version(1).stores({
      friends: "++id, name, age"
    });
    // Register after stores declaration
    this.friends.mapToClass(Friend);
  }
}
```

### Entity Base Class Properties

```ts
class MyEntity extends Entity<AppDB> {
  // Inherited from Entity<T>:
  // this.db  — reference to the Dexie instance (AppDB)
  // this.table() — returns the table name string
}
```

---

## Dexie Cloud — Detailed Setup

### Installation & Configuration

```bash
# Create a cloud database
npx dexie-cloud create

# Whitelist your development origin
npx dexie-cloud whitelist http://localhost:3000

# Install the addon
npm install dexie-cloud-addon
```

### Database Declaration

```ts
import { Dexie } from "dexie";
import dexieCloud, { type DexieCloudTable } from "dexie-cloud-addon";

interface TodoList {
  id: string;
  title: string;
  owner?: string;    // Auto-set by Dexie Cloud
  realmId?: string;  // Auto-set by Dexie Cloud
}

interface TodoItem {
  id: string;
  todoListId: string;
  title: string;
  done: boolean;
  owner?: string;
  realmId?: string;
}

const db = new Dexie("TodoApp", { addons: [dexieCloud] }) as Dexie & {
  todoLists: DexieCloudTable<TodoList, "id">;
  todoItems: DexieCloudTable<TodoItem, "id">;
};

db.version(1).stores({
  todoLists: "@id, title",      // '@' = auto-generated global ID
  todoItems: "@id, todoListId, done"
});

db.cloud.configure({
  databaseUrl: "https://your-db.dexie.cloud",
  requireAuth: true   // Require login before sync
});
```

### Primary Key Types for Cloud

| Syntax | Meaning |
| --- | --- |
| `@id` | Auto-generated globally unique ID (recommended for cloud) |
| `id` | Manual string ID (you provide the value) |

**Note**: Do NOT use `++id` (auto-increment) with Dexie Cloud — use `@id` instead.

### Access Control with usePermissions

```tsx
import { useLiveQuery, usePermissions } from "dexie-react-hooks";

function TodoComponent({ todo }: { todo: TodoItem }) {
  const can = usePermissions(todo);

  return (
    <div>
      <span>{todo.title}</span>
      {can.update("title") && (
        <button onClick={() => db.todoItems.update(todo.id, { title: "New" })}>
          Edit
        </button>
      )}
      {can.delete() && (
        <button onClick={() => db.todoItems.delete(todo.id)}>
          Delete
        </button>
      )}
    </div>
  );
}
```

### Sharing with Realms

```ts
// Create a shared realm
const realmId = await db.cloud.createRealm({
  name: "My Team"
});

// Add a member
await db.cloud.addMember(realmId, {
  email: "colleague@example.com",
  roles: ["editor"]
});

// Move data to shared realm
await db.todoLists.update(listId, { realmId });
```

---

## Testing Dexie.js

### Setup with fake-indexeddb (Jest)

```ts
// jest.setup.ts (or at top of test file)
import "fake-indexeddb/auto";
// This polyfills globalThis.indexedDB, IDBKeyRange, etc.
```

```ts
// jest.config.ts
export default {
  setupFiles: ["fake-indexeddb/auto"],
  // ...
};
```

### Basic Test Pattern

```ts
import { Dexie, type EntityTable } from "dexie";
import "fake-indexeddb/auto";

interface Todo {
  id?: number;
  title: string;
  done: boolean;
}

let db: Dexie & { todos: EntityTable<Todo, "id"> };

beforeEach(async () => {
  db = new Dexie("test-db") as any;
  db.version(1).stores({ todos: "++id, title, done" });
  await db.open();
});

afterEach(async () => {
  await db.delete();
  await db.close();
});

test("adds and retrieves a todo", async () => {
  const id = await db.todos.add({ title: "Test", done: false });
  const todo = await db.todos.get(id);
  expect(todo).toBeDefined();
  expect(todo!.title).toBe("Test");
  expect(todo!.done).toBe(false);
});

test("queries by index", async () => {
  await db.todos.bulkAdd([
    { title: "A", done: false },
    { title: "B", done: true },
    { title: "C", done: false }
  ]);
  const open = await db.todos.where("done").equals(false).toArray();
  expect(open).toHaveLength(2);
});

test("transaction rolls back on error", async () => {
  await db.todos.add({ title: "Existing", done: false });
  const countBefore = await db.todos.count();

  try {
    await db.transaction("rw", db.todos, async () => {
      await db.todos.add({ title: "New", done: false });
      throw new Error("Intentional abort");
    });
  } catch (e) {
    // Expected
  }

  const countAfter = await db.todos.count();
  expect(countAfter).toBe(countBefore); // Rolled back
});

test("bulk error handling", async () => {
  db.version(1).stores({ users: "++id, &email" });
  await (db as any).users.add({ email: "a@b.com" });

  try {
    await (db as any).users.bulkAdd([
      { email: "a@b.com" }, // Duplicate!
      { email: "c@d.com" }
    ]);
  } catch (e: any) {
    expect(e.name).toBe("BulkError");
    expect(e.failures.length).toBeGreaterThan(0);
  }
});
```

### Testing Migrations

```ts
test("upgrades from v1 to v2", async () => {
  // Create v1 database
  const dbV1 = new Dexie("migration-test") as any;
  dbV1.version(1).stores({ todos: "++id, title" });
  await dbV1.open();
  await dbV1.todos.add({ title: "Old Todo" });
  dbV1.close();

  // Reopen with v2 schema + upgrade
  const dbV2 = new Dexie("migration-test") as any;
  dbV2.version(1).stores({ todos: "++id, title" });
  dbV2
    .version(2)
    .stores({ todos: "++id, title, done" })
    .upgrade(async (tx: any) => {
      await tx.table("todos").toCollection().modify((todo: any) => {
        if (todo.done === undefined) todo.done = false;
      });
    });

  await dbV2.open();
  const todo = await dbV2.todos.toCollection().first();
  expect(todo.done).toBe(false); // Upgrade applied
  expect(todo.title).toBe("Old Todo");

  await dbV2.delete();
});
```

### Testing Live Queries (React)

```tsx
import { renderHook, act, waitFor } from "@testing-library/react";
import { useLiveQuery } from "dexie-react-hooks";
import "fake-indexeddb/auto";

test("useLiveQuery re-renders on data change", async () => {
  const { result } = renderHook(() =>
    useLiveQuery(() => db.todos.toArray(), [], [])
  );

  // Initially empty
  expect(result.current).toEqual([]);

  // Add data
  await act(async () => {
    await db.todos.add({ title: "New", done: false });
  });

  // Wait for re-render
  await waitFor(() => {
    expect(result.current).toHaveLength(1);
    expect(result.current[0].title).toBe("New");
  });
});
```

### Mocking Dexie (Without fake-indexeddb)

```ts
// For pure unit tests that don't need real IndexedDB
jest.mock("./db", () => ({
  db: {
    todos: {
      add: jest.fn().mockResolvedValue(1),
      get: jest.fn().mockResolvedValue({ id: 1, title: "Mock", done: false }),
      put: jest.fn().mockResolvedValue(1),
      update: jest.fn().mockResolvedValue(1),
      delete: jest.fn().mockResolvedValue(undefined),
      where: jest.fn().mockReturnValue({
        equals: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0)
        })
      }),
      toArray: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0)
    },
    transaction: jest.fn((mode, tables, fn) => fn())
  }
}));
```

---

## Population Events

### on('populate') — First-Time Only

```ts
// Runs ONCE when the database is first created (not on upgrades)
db.on("populate", (tx) => {
  tx.table("settings").add({ key: "theme", value: "dark" });
  tx.table("settings").add({ key: "lang", value: "en" });
});
```

**Limitations**: Runs within an upgrade transaction. Cannot use setTimeout, fetch, etc.

### on('ready') — Every Open

```ts
// Runs on every db.open() — good for async seeding
db.on("ready", async (db) => {
  const count = await db.table("settings").count();
  if (count === 0) {
    const defaults = await fetch("/api/defaults").then((r) => r.json());
    await db.table("settings").bulkAdd(defaults);
  }
});
```

**Key difference**: `on('ready')` runs every time the database opens, and supports async operations. `on('populate')` runs only on first creation.

---

## Cache Modes (Dexie 4)

### 'cloned' (Default)

```ts
const db = new Dexie("mydb", { cache: "cloned" });
```

- Results are deep-cloned before returning
- Supports optimistic updates (liveQuery sees updates before transaction commits)
- Safe to modify returned objects
- Higher memory usage

### 'immutable'

```ts
const db = new Dexie("mydb", { cache: "immutable" });
```

- Results are frozen with `Object.freeze()`
- Supports optimistic updates
- Less memory, better performance
- **Cannot** modify returned objects (will throw in strict mode)
- Ideal for React (immutable data patterns)

### 'disabled'

```ts
const db = new Dexie("mydb", { cache: "disabled" });
```

- No caching, same behavior as Dexie v3
- No optimistic updates
- Every query hits IndexedDB directly
- Use when backward compatibility with v3 is needed

---

## Dexie Instance Methods

```ts
// Open / Close
await db.open();
db.close();
await db.delete();

// State checks
db.isOpen();
db.hasFailed();
db.verno;          // Current version number
db.name;           // Database name
db.tables;         // Array of Table instances
db.backendDB();    // Native IDBDatabase instance

// Dynamic table access
const table = db.table("tableName");

// Events
db.on("populate", (tx) => { /* ... */ });
db.on("ready", (db) => { /* ... */ });
db.on("blocked", () => { /* ... */ });
db.on("versionchange", (event) => { /* ... */ });
db.on("close", () => { /* ... */ });

// VIP mode — use db in on('ready') before open completes
db.vip(() => {
  return db.table("settings").get("key");
});
```

---

## Common Architectural Patterns

### Repository Pattern

```ts
// todo-repository.ts
import { db } from "./db";
import type { Todo } from "./types";

export const todoRepository = {
  async create(data: Omit<Todo, "id">): Promise<number> {
    return db.todos.add({ ...data, createdAt: Date.now() });
  },

  async findById(id: number): Promise<Todo | undefined> {
    return db.todos.get(id);
  },

  async findOpen(): Promise<Todo[]> {
    return db.todos.where("done").equals(false).sortBy("createdAt");
  },

  async findByTags(tags: string[]): Promise<Todo[]> {
    return db.todos.where("tags").anyOf(tags).distinct().toArray();
  },

  async update(id: number, changes: Partial<Todo>): Promise<void> {
    await db.todos.update(id, { ...changes, updatedAt: Date.now() });
  },

  async remove(id: number): Promise<void> {
    await db.todos.delete(id);
  },

  async importBatch(items: Omit<Todo, "id">[]): Promise<void> {
    const now = Date.now();
    const rows = items.map((item) => ({
      ...item,
      createdAt: now,
      updatedAt: now
    }));
    await db.todos.bulkAdd(rows);
  }
};
```

### Zustand + Dexie Integration

```ts
import { create } from "zustand";
import { db } from "./db";

interface TodoStore {
  todos: Todo[];
  loading: boolean;
  loadTodos: () => Promise<void>;
  addTodo: (title: string) => Promise<void>;
  toggleTodo: (id: number) => Promise<void>;
}

export const useTodoStore = create<TodoStore>((set) => ({
  todos: [],
  loading: false,

  loadTodos: async () => {
    set({ loading: true });
    const todos = await db.todos.toArray();
    set({ todos, loading: false });
  },

  addTodo: async (title) => {
    await db.todos.add({
      title,
      done: false,
      createdAt: Date.now(),
      tags: []
    });
    const todos = await db.todos.toArray();
    set({ todos });
  },

  toggleTodo: async (id) => {
    const todo = await db.todos.get(id);
    if (todo) {
      await db.todos.update(id, { done: !todo.done });
      const todos = await db.todos.toArray();
      set({ todos });
    }
  }
}));
```

### Export / Import for Backup

```ts
async function exportDatabase(): Promise<string> {
  const data: Record<string, any[]> = {};
  for (const table of db.tables) {
    data[table.name] = await table.toArray();
  }
  return JSON.stringify(data);
}

async function importDatabase(json: string): Promise<void> {
  const data = JSON.parse(json);
  await db.transaction(
    "rw",
    db.tables,
    async () => {
      for (const [tableName, rows] of Object.entries(data)) {
        const table = db.table(tableName);
        await table.clear();
        await table.bulkAdd(rows as any[]);
      }
    }
  );
}
```

### Pagination Helper

```ts
async function paginate<T>(
  collection: Dexie.Collection<T, any>,
  page: number,
  pageSize: number
): Promise<{ items: T[]; total: number; totalPages: number }> {
  const total = await collection.count();
  const items = await collection
    .offset((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  return {
    items,
    total,
    totalPages: Math.ceil(total / pageSize)
  };
}

// Usage
const result = await paginate(
  db.todos.where("done").equals(false),
  1,   // page
  20   // pageSize
);
```

---

## Primary References

- `https://dexie.org/docs/DBCore/DBCore` — DBCore middleware architecture
- `https://dexie.org/docs/Dexie/Dexie.use()` — Middleware registration API
- `https://dexie.org/docs/Table/Table.hook('creating')` — Creating hook
- `https://dexie.org/docs/Table/Table.hook('updating')` — Updating hook
- `https://dexie.org/docs/Table/Table.hook('deleting')` — Deleting hook
- `https://dexie.org/docs/Table/Table.hook('reading')` — Reading hook
- `https://dexie.org/docs/Typescript` — TypeScript + Entity class guide
- `https://dexie.org/cloud/` — Dexie Cloud overview
- `https://dexie.org/docs/Dexie/Dexie.on.populate` — Population events
- `https://github.com/nicolo-ribaudo/fake-indexeddb` — fake-indexeddb for testing
