---
description: Generate TypeScript type definitions following project conventions with interfaces, enums, and barrel exports.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Parse Arguments**: Extract from user input:
   - Type name (required)
   - Domain/category (e.g., `agent`, `chat`, `settings`)
   - Kind: `interface` | `enum` | `union` | `type`
   - Options: `--extend <base>`, `--export`

2. **Determine Location**:
   - Domain types: `types/<domain>/<name>.ts`
   - General types: `types/<name>.ts`
   - Check if domain directory already exists

3. **Generate Type Definition**:

   **Interface**:

   ```typescript
   export interface <Name> {
     id: string
     name: string
     description?: string
     createdAt: Date
     updatedAt: Date
   }
   ```

   **Extended Interface**:

   ```typescript
   import { BaseType } from '@/types'

   export interface <Name> extends BaseType {
     additionalField: string
     optionalField?: number
   }
   ```

   **Enum**:

   ```typescript
   export enum <Name> {
     Value1 = 'value1',
     Value2 = 'value2',
     Value3 = 'value3',
   }
   ```

   **Union Type**:

   ```typescript
   export type <Name> = 'option1' | 'option2' | 'option3'
   ```

   **Discriminated Union**:

   ```typescript
   interface BaseAction {
     timestamp: number
   }

   interface CreateAction extends BaseAction {
     type: 'create'
     data: CreateData
   }

   interface UpdateAction extends BaseAction {
     type: 'update'
     id: string
     changes: Partial<Data>
   }

   interface DeleteAction extends BaseAction {
     type: 'delete'
     id: string
   }

   export type <Name>Action = CreateAction | UpdateAction | DeleteAction
   ```

   **Props Type**:

   ```typescript
   export interface <Name>Props {
     className?: string
     children?: React.ReactNode
     variant?: 'default' | 'outline' | 'ghost'
     size?: 'sm' | 'md' | 'lg'
     disabled?: boolean
     onAction?: (value: string) => void
   }
   ```

   **API Response Type**:

   ```typescript
   export interface <Name>Response {
     success: boolean
     data: <Name>
     error?: string
     metadata?: {
       total: number
       page: number
       pageSize: number
     }
   }
   ```

   **Store State Type**:

   ```typescript
   export interface <Name>State {
     // Data
     items: <Name>[]
     selected: <Name> | null
     isLoading: boolean
     error: Error | null

     // Actions
     setItems: (items: <Name>[]) => void
     selectItem: (item: <Name> | null) => void
     addItem: (item: <Name>) => void
     removeItem: (id: string) => void
     reset: () => void
   }
   ```

4. **Update Domain Index** (`types/<domain>/index.ts`):

   ```typescript
   export type { <Name> } from './<name>'
   export { <NameEnum> } from './<name>'
   ```

5. **Update Root Barrel Export** (`types/index.ts`):

   ```typescript
   export type { <Name> } from './<domain>'
   ```

## Type File Structure

```
types/
├── index.ts              # Root barrel export
├── agent/
│   ├── index.ts
│   ├── agent.ts
│   ├── agent-mode.ts
│   └── agent-team.ts
├── artifact/
│   ├── index.ts
│   ├── artifact.ts
│   └── a2ui.ts
├── chat/
│   ├── index.ts
│   └── ...
└── <domain>/
    ├── index.ts          # Domain barrel export
    └── <name>.ts         # Type definitions
```

## Naming Conventions

| Kind | Naming | Example |
|------|--------|---------|
| Interface | PascalCase | `ChatMessage`, `UserProfile` |
| Enum | PascalCase | `MessageStatus`, `ThemeMode` |
| Type alias | PascalCase | `Provider`, `ModelTier` |
| Props | `<Component>Props` | `ButtonProps`, `DialogProps` |
| State | `<Store>State` | `SettingsState`, `ChatState` |
| Response | `<Name>Response` | `SearchResponse` |
| Config | `<Name>Config` | `ProviderConfig` |

## Best Practices

- Use `interface` for objects, `type` for unions/intersections
- Prefer `interface` over `type` when possible (better error messages)
- Use `readonly` for immutable fields
- Use `Partial<T>` for update operations
- Use `Pick<T, K>` and `Omit<T, K>` to derive types
- Use `Record<K, V>` for dictionaries
- Avoid `any` — use `unknown` if type is truly unknown
- Export all types from barrel exports for clean imports

## Common Utility Types

```typescript
// Partial update
type Update<T> = Partial<Omit<T, 'id'>> & { id: string }

// Nullable
type Nullable<T> = T | null

// Deep partial
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// Async function return type
type AsyncReturnType<T extends (...args: unknown[]) => Promise<unknown>> =
  T extends (...args: unknown[]) => Promise<infer R> ? R : never
```

## Notes

- Always import types with `import type { ... }` when possible
- Co-locate component props in the component file or in `types/`
- Use `@/types` alias for all type imports
- Keep type files focused — one concept per file
- Document complex types with JSDoc comments
