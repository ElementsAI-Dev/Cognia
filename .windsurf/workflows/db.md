---
description: Create and manage database models with Dexie IndexedDB — table definitions, CRUD operations, migrations, and store integration.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Parse Arguments**: Extract from user input:
   - Table/model name (required)
   - Fields and types
   - Options:
     - `--crud` — Generate CRUD operations
     - `--hook` — Generate React hook
     - `--store` — Generate Zustand store integration
     - `--migrate` — Add migration for existing table

2. **Understand Data Layer**:

   This project uses two storage layers:
   - **Dexie (IndexedDB)** — Large/structured data (messages, conversations, files)
   - **Zustand + localStorage** — UI state, settings, preferences

   Choose based on data characteristics:

   | Use Dexie When | Use Zustand When |
   |---------------|-----------------|
   | Large datasets (100+ records) | Small state (< 50 items) |
   | Complex queries needed | Simple key-value storage |
   | Binary data / blobs | UI preferences / flags |
   | Relational data | App configuration |
   | Offline-first data | Session state |

3. **Define Table Schema** (`lib/db/<name>.ts`):

   ```typescript
   import Dexie, { type Table } from 'dexie'

   // Type definition
   export interface <Name>Record {
     id: string
     title: string
     content: string
     category: string
     tags: string[]
     metadata?: Record<string, unknown>
     createdAt: Date
     updatedAt: Date
   }

   // Database class
   class <Name>Database extends Dexie {
     <name>s!: Table<<Name>Record, string>

     constructor() {
       super('cognia-<name>')

       this.version(1).stores({
         // Indexed fields (comma-separated)
         // '++' = auto-increment, '&' = unique, '*' = multi-entry
         <name>s: '&id, category, *tags, createdAt',
       })
     }
   }

   export const <name>Db = new <Name>Database()
   ```

4. **Generate CRUD Operations** (`lib/db/<name>-operations.ts`):

   ```typescript
   import { <name>Db, type <Name>Record } from './<name>'

   // Create
   export async function create<Name>(
     data: Omit<<Name>Record, 'id' | 'createdAt' | 'updatedAt'>
   ): Promise<<Name>Record> {
     const record: <Name>Record = {
       ...data,
       id: crypto.randomUUID(),
       createdAt: new Date(),
       updatedAt: new Date(),
     }
     await <name>Db.<name>s.add(record)
     return record
   }

   // Read by ID
   export async function get<Name>(id: string): Promise<<Name>Record | undefined> {
     return <name>Db.<name>s.get(id)
   }

   // Read all
   export async function getAll<Name>s(): Promise<<Name>Record[]> {
     return <name>Db.<name>s.toArray()
   }

   // Read with filter
   export async function query<Name>s(
     filter: Partial<Pick<<Name>Record, 'category'>>
   ): Promise<<Name>Record[]> {
     let collection = <name>Db.<name>s.toCollection()

     if (filter.category) {
       collection = <name>Db.<name>s.where('category').equals(filter.category)
     }

     return collection.sortBy('createdAt')
   }

   // Read with pagination
   export async function paginate<Name>s(
     page: number,
     pageSize: number = 20
   ): Promise<{ items: <Name>Record[]; total: number }> {
     const total = await <name>Db.<name>s.count()
     const items = await <name>Db.<name>s
       .orderBy('createdAt')
       .reverse()
       .offset((page - 1) * pageSize)
       .limit(pageSize)
       .toArray()

     return { items, total }
   }

   // Update
   export async function update<Name>(
     id: string,
     updates: Partial<Omit<<Name>Record, 'id' | 'createdAt'>>
   ): Promise<void> {
     await <name>Db.<name>s.update(id, {
       ...updates,
       updatedAt: new Date(),
     })
   }

   // Delete
   export async function delete<Name>(id: string): Promise<void> {
     await <name>Db.<name>s.delete(id)
   }

   // Bulk delete
   export async function deleteMany<Name>s(ids: string[]): Promise<void> {
     await <name>Db.<name>s.bulkDelete(ids)
   }

   // Search
   export async function search<Name>s(query: string): Promise<<Name>Record[]> {
     const lowerQuery = query.toLowerCase()
     return <name>Db.<name>s
       .filter(
         (record) =>
           record.title.toLowerCase().includes(lowerQuery) ||
           record.content.toLowerCase().includes(lowerQuery)
       )
       .toArray()
   }

   // Count
   export async function count<Name>s(): Promise<number> {
     return <name>Db.<name>s.count()
   }

   // Clear all
   export async function clearAll<Name>s(): Promise<void> {
     await <name>Db.<name>s.clear()
   }
   ```

5. **Generate React Hook** (if `--hook`):

   ```typescript
   // hooks/<name>/use-<name>-db.ts
   import { useState, useEffect, useCallback } from 'react'
   import { useLiveQuery } from 'dexie-react-hooks'
   import {
     create<Name>,
     getAll<Name>s,
     update<Name>,
     delete<Name>,
     search<Name>s,
     type <Name>Record,
   } from '@/lib/db/<name>'

   export function use<Name>Db() {
     // Live query - auto-updates when DB changes
     const items = useLiveQuery(() => getAll<Name>s(), [])

     const [isLoading, setIsLoading] = useState(true)
     const [error, setError] = useState<Error | null>(null)

     useEffect(() => {
       if (items !== undefined) {
         setIsLoading(false)
       }
     }, [items])

     const create = useCallback(
       async (data: Omit<<Name>Record, 'id' | 'createdAt' | 'updatedAt'>) => {
         try {
           return await create<Name>(data)
         } catch (err) {
           setError(err instanceof Error ? err : new Error(String(err)))
           throw err
         }
       },
       []
     )

     const update = useCallback(
       async (
         id: string,
         updates: Partial<Omit<<Name>Record, 'id' | 'createdAt'>>
       ) => {
         try {
           await update<Name>(id, updates)
         } catch (err) {
           setError(err instanceof Error ? err : new Error(String(err)))
           throw err
         }
       },
       []
     )

     const remove = useCallback(async (id: string) => {
       try {
         await delete<Name>(id)
       } catch (err) {
         setError(err instanceof Error ? err : new Error(String(err)))
         throw err
       }
     }, [])

     const search = useCallback(async (query: string) => {
       return search<Name>s(query)
     }, [])

     return {
       items: items ?? [],
       isLoading,
       error,
       create,
       update,
       remove,
       search,
     }
   }
   ```

6. **Database Migrations** (if `--migrate`):

   ```typescript
   // Add new version with schema changes
   class <Name>Database extends Dexie {
     <name>s!: Table<<Name>Record, string>

     constructor() {
       super('cognia-<name>')

       // Version 1: Initial schema
       this.version(1).stores({
         <name>s: '&id, category, *tags, createdAt',
       })

       // Version 2: Add new index
       this.version(2).stores({
         <name>s: '&id, category, *tags, createdAt, status',
       })

       // Version 3: Data migration
       this.version(3)
         .stores({
           <name>s: '&id, category, *tags, createdAt, status, priority',
         })
         .upgrade((tx) => {
           // Migrate existing records
           return tx
             .table('<name>s')
             .toCollection()
             .modify((record) => {
               if (!record.priority) {
                 record.priority = 'normal'
               }
             })
         })
     }
   }
   ```

7. **Generate Tests**:

   ```typescript
   // lib/db/<name>.test.ts
   import { <name>Db, type <Name>Record } from './<name>'
   import {
     create<Name>,
     get<Name>,
     getAll<Name>s,
     update<Name>,
     delete<Name>,
   } from './<name>-operations'

   // Use fake-indexeddb for testing
   import 'fake-indexeddb/auto'

   describe('<Name> Database', () => {
     beforeEach(async () => {
       await <name>Db.<name>s.clear()
     })

     it('should create a record', async () => {
       const record = await create<Name>({
         title: 'Test',
         content: 'Content',
         category: 'test',
         tags: ['a', 'b'],
       })

       expect(record.id).toBeDefined()
       expect(record.title).toBe('Test')
       expect(record.createdAt).toBeInstanceOf(Date)
     })

     it('should read a record by id', async () => {
       const created = await create<Name>({
         title: 'Test',
         content: 'Content',
         category: 'test',
         tags: [],
       })

       const found = await get<Name>(created.id)
       expect(found).toBeDefined()
       expect(found?.title).toBe('Test')
     })

     it('should update a record', async () => {
       const created = await create<Name>({
         title: 'Original',
         content: 'Content',
         category: 'test',
         tags: [],
       })

       await update<Name>(created.id, { title: 'Updated' })

       const updated = await get<Name>(created.id)
       expect(updated?.title).toBe('Updated')
     })

     it('should delete a record', async () => {
       const created = await create<Name>({
         title: 'Test',
         content: 'Content',
         category: 'test',
         tags: [],
       })

       await delete<Name>(created.id)

       const found = await get<Name>(created.id)
       expect(found).toBeUndefined()
     })
   })
   ```

8. **Update Barrel Exports**:

   ```typescript
   // lib/db/index.ts
   export { <name>Db, type <Name>Record } from './<name>'
   export * from './<name>-operations'
   ```

## Dexie Index Guide

| Prefix | Meaning | Example |
|--------|---------|---------|
| (none) | Indexed field | `category` |
| `&` | Unique index | `&id` |
| `*` | Multi-entry (arrays) | `*tags` |
| `++` | Auto-increment | `++id` |
| `[a+b]` | Compound index | `[category+createdAt]` |

## Existing Database Tables

Check `lib/db/` for current tables to avoid conflicts and maintain consistency.

## Best Practices

- Use `useLiveQuery` from `dexie-react-hooks` for reactive queries
- Always version your schema changes — never modify existing versions
- Index only fields you query by — over-indexing hurts write performance
- Use `bulkAdd` / `bulkPut` / `bulkDelete` for batch operations
- Use transactions for multi-table operations: `db.transaction('rw', ...)`
- Keep IndexedDB data serializable (no functions, no circular references)
- Use `fake-indexeddb` for testing

## Notes

- IndexedDB has no size limit (browser may prompt user for large databases)
- Dexie supports both primary key and secondary indexes
- Use compound indexes `[a+b]` for queries filtering on multiple fields
- For full-text search, consider manual indexing or integrate with `lib/search/`
- Data persists across sessions — implement cleanup for old records
- Export/import functionality should use Dexie's `exportDatabase` / `importInto`
