---
description: Generate custom React hooks following project conventions with TypeScript and optional tests.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Parse Arguments**: Extract from user input:
   - Hook name (required, will be prefixed with `use`)
   - Category: `ai` | `native` | `ui` | `rag` | `sandbox` | `input-completion` | `skill-seekers`
   - Options: `--test`, `--store` (if needs Zustand integration)

2. **Determine Location**:
   - AI hooks: `hooks/ai/use-<name>.ts`
   - Native hooks: `hooks/native/use-<name>.ts`
   - UI hooks: `hooks/ui/use-<name>.ts`
   - General hooks: `hooks/use-<name>.ts`

3. **Generate Hook**:

   **Basic Hook Template**:

   ```typescript
   import { useState, useCallback, useEffect } from 'react'
   
   interface Use<Name>Options {
     // Hook configuration
   }
   
   interface Use<Name>Return {
     // Return type
   }
   
   export function use<Name>(options?: Use<Name>Options): Use<Name>Return {
     const [state, setState] = useState<StateType>(initialValue)
     
     const action = useCallback(() => {
       // Implementation
     }, [])
     
     useEffect(() => {
       // Side effects
       return () => {
         // Cleanup
       }
     }, [])
     
     return { state, action }
   }
   ```

   **Store-Connected Hook**:

   ```typescript
   import { useCallback } from 'react'
   import { use<Store>Store } from '@/stores'
   
   export function use<Name>() {
     const { data, setData, reset } = use<Store>Store()
     
     const action = useCallback((value: ValueType) => {
       setData(value)
     }, [setData])
     
     return { data, action, reset }
   }
   ```

   **Native Hook (Tauri)**:

   ```typescript
   import { useState, useEffect, useCallback } from 'react'
   import { isTauri } from '@/lib/utils'
   import { nativeFunction } from '@/lib/native/<feature>'
   
   export function use<Name>() {
     const [data, setData] = useState<DataType | null>(null)
     const [isLoading, setIsLoading] = useState(false)
     const [error, setError] = useState<Error | null>(null)
     
     const fetch = useCallback(async () => {
       if (!isTauri()) return
       
       setIsLoading(true)
       setError(null)
       
       try {
         const result = await nativeFunction()
         setData(result)
       } catch (err) {
         setError(err instanceof Error ? err : new Error(String(err)))
       } finally {
         setIsLoading(false)
       }
     }, [])
     
     useEffect(() => {
       fetch()
     }, [fetch])
     
     return { data, isLoading, error, refetch: fetch }
   }
   ```

   **Event Listener Hook**:

   ```typescript
   import { useEffect } from 'react'
   import { listen, type UnlistenFn } from '@tauri-apps/api/event'
   import { isTauri } from '@/lib/utils'
   
   export function use<Event>Listener(
     callback: (payload: PayloadType) => void
   ) {
     useEffect(() => {
       if (!isTauri()) return
       
       let unlisten: UnlistenFn | undefined
       
       listen<PayloadType>('event-name', (event) => {
         callback(event.payload)
       }).then((fn) => {
         unlisten = fn
       })
       
       return () => {
         unlisten?.()
       }
     }, [callback])
   }
   ```

4. **Generate Test** (if `--test`):

   ```typescript
   import { renderHook, act, waitFor } from '@testing-library/react'
   import { use<Name> } from './use-<name>'
   
   describe('use<Name>', () => {
     it('initializes with default state', () => {
       const { result } = renderHook(() => use<Name>())
       expect(result.current.state).toBe(initialValue)
     })
     
     it('updates state on action', () => {
       const { result } = renderHook(() => use<Name>())
       
       act(() => {
         result.current.action(newValue)
       })
       
       expect(result.current.state).toBe(newValue)
     })
     
     it('handles async operations', async () => {
       const { result } = renderHook(() => use<Name>())
       
       await waitFor(() => {
         expect(result.current.isLoading).toBe(false)
       })
       
       expect(result.current.data).toBeDefined()
     })
   })
   ```

5. **Update Barrel Exports**:

   ```typescript
   // hooks/index.ts or hooks/<category>/index.ts
   export { use<Name> } from './use-<name>'
   ```

## Hook Categories

| Category | Location | Description |
|----------|----------|-------------|
| `ai` | `hooks/ai/` | AI/LLM integration hooks |
| `native` | `hooks/native/` | Tauri native functionality |
| `ui` | `hooks/ui/` | UI state and interactions |
| `rag` | `hooks/rag/` | RAG/vector search hooks |
| `sandbox` | `hooks/sandbox/` | Code sandbox hooks |
| `input-completion` | `hooks/input-completion/` | Input completion hooks |
| `skill-seekers` | `hooks/skill-seekers/` | Skill generation hooks |

## Naming Conventions

| Pattern | Example |
|---------|---------|
| State hook | `useLocalStorage`, `useToggle` |
| Data fetching | `useFetch`, `useQuery` |
| Event handling | `useClickOutside`, `useKeyPress` |
| Tauri feature | `useSelection`, `useAwareness` |
| Store connection | `useSettingsStore`, `useChatStore` |

## Best Practices

- Return object with named properties (not array)
- Memoize callbacks with `useCallback`
- Memoize computed values with `useMemo`
- Always include cleanup in `useEffect`
- Use `isTauri()` guard for native features
- Include loading and error states for async hooks
- Type all parameters and return values

## Notes

- Co-locate tests next to hook files
- Export from barrel file for clean imports
- Consider composing smaller hooks for complex logic
- Document hook usage with JSDoc comments
