---
description: Create Zustand stores following project conventions with TypeScript, persistence, and slices.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Parse Arguments**: Extract from user input:
   - Store name (required)
   - Category: domain-specific folder name
   - Options: `--persist` (localStorage), `--slices` (split into slices)

2. **Determine Location**:
   - Domain stores: `stores/<domain>/<name>-store.ts`
   - General stores: `stores/<name>-store.ts`

3. **Generate Store**:

   **Basic Store**:

   ```typescript
   import { create } from 'zustand'

   interface <Name>State {
     // State
     data: DataType | null
     isLoading: boolean
     error: Error | null

     // Actions
     setData: (data: DataType) => void
     setLoading: (loading: boolean) => void
     setError: (error: Error | null) => void
     reset: () => void
   }

   const initialState = {
     data: null,
     isLoading: false,
     error: null,
   }

   export const use<Name>Store = create<Name>State>()((set) => ({
     ...initialState,

     setData: (data) => set({ data }),
     setLoading: (isLoading) => set({ isLoading }),
     setError: (error) => set({ error }),
     reset: () => set(initialState),
   }))
   ```

   **Persisted Store**:

   ```typescript
   import { create } from 'zustand'
   import { persist } from 'zustand/middleware'

   interface <Name>State {
     // State
     settings: SettingsType
     
     // Actions
     updateSettings: (settings: Partial<SettingsType>) => void
     reset: () => void
   }

   const initialState = {
     settings: defaultSettings,
   }

   export const use<Name>Store = create<Name>State>()(
     persist(
       (set) => ({
         ...initialState,

         updateSettings: (newSettings) =>
           set((state) => ({
             settings: { ...state.settings, ...newSettings },
           })),
         reset: () => set(initialState),
       }),
       {
         name: 'cognia-<name>', // localStorage key
       }
     )
   )
   ```

   **Store with Slices**:

   ```typescript
   import { create, StateCreator } from 'zustand'
   import { persist } from 'zustand/middleware'

   // Slice 1
   interface DataSlice {
     data: DataType[]
     addData: (item: DataType) => void
     removeData: (id: string) => void
   }

   const createDataSlice: StateCreator<
     DataSlice & OtherSlice,
     [],
     [],
     DataSlice
   > = (set) => ({
     data: [],
     addData: (item) =>
       set((state) => ({ data: [...state.data, item] })),
     removeData: (id) =>
       set((state) => ({ data: state.data.filter((d) => d.id !== id) })),
   })

   // Slice 2
   interface UISlice {
     isOpen: boolean
     toggle: () => void
   }

   const createUISlice: StateCreator<
     DataSlice & UISlice,
     [],
     [],
     UISlice
   > = (set) => ({
     isOpen: false,
     toggle: () => set((state) => ({ isOpen: !state.isOpen })),
   })

   // Combined Store
   export const use<Name>Store = create<DataSlice & UISlice>()(
     persist(
       (...args) => ({
         ...createDataSlice(...args),
         ...createUISlice(...args),
       }),
       { name: 'cognia-<name>' }
     )
   )
   ```

4. **Add Selectors** (for performance):

   ```typescript
   // Selectors for optimized subscriptions
   export const selectData = (state: <Name>State) => state.data
   export const selectIsLoading = (state: <Name>State) => state.isLoading

   // Usage in component
   const data = use<Name>Store(selectData)
   ```

5. **Update Barrel Export**:

   ```typescript
   // stores/index.ts
   export { use<Name>Store } from './<domain>/<name>-store'
   ```

## Store Naming Convention

| Pattern | Example |
|---------|---------|
| Store file | `settings-store.ts` |
| Store hook | `useSettingsStore` |
| State interface | `SettingsState` |
| localStorage key | `cognia-settings` |

## Persistence Keys

All persisted stores use `cognia-*` pattern:

- `cognia-settings` - App settings
- `cognia-sessions` - Chat sessions
- `cognia-ui` - UI preferences

## Best Practices

- Keep stores focused on single domain
- Use selectors to prevent unnecessary re-renders
- Always provide `reset()` action for testing
- Use `immer` middleware for complex nested updates
- Split large stores into slices
- Type all state and actions

## Common Patterns

**Async Actions**:

```typescript
fetchData: async () => {
  set({ isLoading: true, error: null })
  try {
    const data = await api.fetchData()
    set({ data, isLoading: false })
  } catch (error) {
    set({ error: error as Error, isLoading: false })
  }
}
```

**Computed Values**:

```typescript
// Use selectors for derived state
export const selectFilteredItems = (state: State) =>
  state.items.filter((item) => item.active)
```

**Immer for Nested Updates**:

```typescript
import { immer } from 'zustand/middleware/immer'

export const useStore = create<State>()(
  immer((set) => ({
    nested: { deep: { value: 0 } },
    updateDeep: (value) =>
      set((state) => {
        state.nested.deep.value = value
      }),
  }))
)
```

## Notes

- Import from `@/stores` barrel export
- Test stores with `reset()` between tests
- Use `subscribeWithSelector` for fine-grained subscriptions
- Consider `devtools` middleware for debugging
