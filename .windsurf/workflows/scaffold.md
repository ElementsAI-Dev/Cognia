---
description: Scaffold a complete feature module end-to-end with page, components, hooks, store, types, tests, and i18n.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Parse Arguments**: Extract from user input:
   - Feature name (required, e.g., `analytics`, `bookmarks`)
   - Description (brief feature purpose)
   - Options:
     - `--minimal` — Only page + component + type
     - `--full` — All files (default)
     - `--no-test` — Skip test files
     - `--no-i18n` — Skip i18n files
     - `--tauri` — Include Rust backend module

2. **Plan File Structure**: Generate the full directory tree:

   ```
   Feature: <name>

   app/(main)/<name>/
   ├── page.tsx                    # Main page
   ├── loading.tsx                 # Loading skeleton
   └── <name>-client.tsx           # Client component (if needed)

   components/<name>/
   ├── <name>-panel.tsx            # Main panel component
   ├── <name>-list.tsx             # List/grid component
   ├── <name>-item.tsx             # Single item component
   ├── <name>-toolbar.tsx          # Toolbar/actions
   └── index.ts                   # Barrel export

   hooks/<name>/
   ├── use-<name>.ts               # Main feature hook
   ├── use-<name>.test.ts          # Hook tests
   └── index.ts                   # Barrel export

   stores/<name>/
   ├── <name>-store.ts             # Zustand store
   ├── <name>-store.test.ts        # Store tests
   └── index.ts                   # Barrel export

   types/<name>/
   ├── <name>.ts                   # Type definitions
   └── index.ts                   # Barrel export

   lib/<name>/
   ├── <name>.ts                   # Utility functions
   ├── <name>.test.ts              # Utility tests
   └── index.ts                   # Barrel export

   locales/en/<name>.json          # English translations
   locales/zh-CN/<name>.json       # Chinese translations
   ```

3. **Generate Types** (`types/<name>/<name>.ts`):

   ```typescript
   export interface <Name> {
     id: string
     title: string
     description?: string
     status: <Name>Status
     createdAt: string
     updatedAt: string
   }

   export enum <Name>Status {
     Active = 'active',
     Inactive = 'inactive',
     Archived = 'archived',
   }

   export interface <Name>Filter {
     query?: string
     status?: <Name>Status
     sortBy?: 'title' | 'createdAt' | 'updatedAt'
     sortOrder?: 'asc' | 'desc'
   }
   ```

4. **Generate Store** (`stores/<name>/<name>-store.ts`):

   ```typescript
   import { create } from 'zustand'
   import { persist } from 'zustand/middleware'
   import type { <Name>, <Name>Filter } from '@/types/<name>'

   interface <Name>State {
     items: <Name>[]
     selected: <Name> | null
     filter: <Name>Filter
     isLoading: boolean
     error: Error | null

     setItems: (items: <Name>[]) => void
     addItem: (item: <Name>) => void
     updateItem: (id: string, updates: Partial<<Name>>) => void
     removeItem: (id: string) => void
     selectItem: (item: <Name> | null) => void
     setFilter: (filter: Partial<<Name>Filter>) => void
     setLoading: (loading: boolean) => void
     setError: (error: Error | null) => void
     reset: () => void
   }

   const initialState = {
     items: [],
     selected: null,
     filter: {},
     isLoading: false,
     error: null,
   }

   export const use<Name>Store = create<<Name>State>()(
     persist(
       (set) => ({
         ...initialState,
         setItems: (items) => set({ items }),
         addItem: (item) => set((s) => ({ items: [...s.items, item] })),
         updateItem: (id, updates) =>
           set((s) => ({
             items: s.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
           })),
         removeItem: (id) =>
           set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
         selectItem: (selected) => set({ selected }),
         setFilter: (filter) =>
           set((s) => ({ filter: { ...s.filter, ...filter } })),
         setLoading: (isLoading) => set({ isLoading }),
         setError: (error) => set({ error }),
         reset: () => set(initialState),
       }),
       { name: 'cognia-<name>' }
     )
   )
   ```

5. **Generate Hook** (`hooks/<name>/use-<name>.ts`):

   ```typescript
   import { useCallback, useMemo } from 'react'
   import { use<Name>Store } from '@/stores/<name>'
   import type { <Name>, <Name>Filter } from '@/types/<name>'

   export function use<Name>() {
     const store = use<Name>Store()

     const filteredItems = useMemo(() => {
       let result = store.items
       if (store.filter.query) {
         const q = store.filter.query.toLowerCase()
         result = result.filter(
           (item) =>
             item.title.toLowerCase().includes(q) ||
             item.description?.toLowerCase().includes(q)
         )
       }
       if (store.filter.status) {
         result = result.filter((item) => item.status === store.filter.status)
       }
       return result
     }, [store.items, store.filter])

     const create = useCallback(
       (data: Omit<<Name>, 'id' | 'createdAt' | 'updatedAt'>) => {
         const item: <Name> = {
           ...data,
           id: crypto.randomUUID(),
           createdAt: new Date().toISOString(),
           updatedAt: new Date().toISOString(),
         }
         store.addItem(item)
         return item
       },
       [store.addItem]
     )

     return {
       items: filteredItems,
       allItems: store.items,
       selected: store.selected,
       filter: store.filter,
       isLoading: store.isLoading,
       error: store.error,
       create,
       update: store.updateItem,
       remove: store.removeItem,
       select: store.selectItem,
       setFilter: store.setFilter,
     }
   }
   ```

6. **Generate Components**: Create main panel, list, and item components with Tailwind styling and `cn()` utility.

7. **Generate Page** (`app/(main)/<name>/page.tsx`):

   ```tsx
   'use client'

   import { <Name>Panel } from '@/components/<name>'

   export default function <Name>Page() {
     return <div className="h-full"><Name>Panel /></div>
   }
   ```

8. **Generate i18n Files**:

   ```json
   // locales/en/<name>.json
   {
     "title": "<Name>",
     "description": "Manage your <name>",
     "actions": {
       "create": "Create",
       "edit": "Edit",
       "delete": "Delete",
       "search": "Search..."
     },
     "status": {
       "active": "Active",
       "inactive": "Inactive",
       "archived": "Archived"
     },
     "empty": "No items yet",
     "confirmDelete": "Are you sure you want to delete this item?"
   }
   ```

   ```json
   // locales/zh-CN/<name>.json
   {
     "title": "<名称>",
     "description": "管理您的<名称>",
     "actions": {
       "create": "创建",
       "edit": "编辑",
       "delete": "删除",
       "search": "搜索..."
     },
     "status": {
       "active": "活跃",
       "inactive": "未激活",
       "archived": "已归档"
     },
     "empty": "暂无项目",
     "confirmDelete": "确定要删除此项目吗？"
   }
   ```

9. **Generate Tests**: Create test files for store, hook, and utility functions.

10. **Update Barrel Exports**: Add new exports to:
    - `types/index.ts`
    - `stores/index.ts`
    - `hooks/index.ts`

11. **Tauri Backend** (if `--tauri`):
    - Create `src-tauri/src/<name>/mod.rs` with data structures
    - Add Tauri commands in `src-tauri/src/commands/<name>.rs`
    - Register commands in `lib.rs`
    - Create TypeScript wrappers in `lib/native/<name>.ts`

## Naming Map

| Layer | Convention | Example |
|-------|-----------|---------|
| Route | kebab-case | `app/(main)/my-feature/` |
| Component | PascalCase | `MyFeaturePanel` |
| Hook | camelCase with `use` | `useMyFeature` |
| Store | camelCase with `use`+`Store` | `useMyFeatureStore` |
| Type | PascalCase | `MyFeature` |
| i18n key | camelCase | `myFeature.title` |
| localStorage | `cognia-` prefix | `cognia-my-feature` |
| Rust module | snake_case | `my_feature` |

## Notes

- Run `pnpm lint` and `pnpm tsc --noEmit` after scaffolding
- Add the new route to sidebar navigation if it should be visible
- Consider adding E2E test in `e2e/features/<name>.spec.ts`
- Use `/component`, `/hook`, `/store`, `/type` workflows for individual additions later
