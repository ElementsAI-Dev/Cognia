---
description: Systematic code refactoring workflow with safety checks and incremental improvements.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Identify Refactoring Scope**:
   - Single function/component
   - Module/feature
   - Cross-cutting concern
   - Architecture change

2. **Pre-Refactoring Checks**:

   ```bash
   # Ensure tests pass before refactoring
   pnpm test
   
   # Check for type errors
   pnpm tsc --noEmit
   
   # Check lint status
   pnpm lint
   
   # Commit current state (safety checkpoint)
   git add -A && git commit -m "chore: pre-refactor checkpoint"
   ```

3. **Analyze Current Code**:
   - Understand existing functionality
   - Identify dependencies (what uses this code)
   - Map the call chain
   - Note any side effects

4. **Plan Refactoring**:

   **Common Refactoring Patterns**:

   | Pattern | When to Use |
   |---------|-------------|
   | Extract Function | Long function with distinct sections |
   | Extract Component | Repeated JSX or complex render logic |
   | Extract Hook | Reusable stateful logic |
   | Move to Module | Code belongs in different location |
   | Rename | Name doesn't reflect purpose |
   | Inline | Unnecessary abstraction |
   | Replace Conditional with Polymorphism | Complex switch/if chains |

5. **Execute Refactoring**:

   **Extract Hook**:

   ```typescript
   // Before: Logic in component
   function Component() {
     const [data, setData] = useState(null)
     useEffect(() => { /* fetch logic */ }, [])
     return <div>{data}</div>
   }
   
   // After: Logic in hook
   function useData() {
     const [data, setData] = useState(null)
     useEffect(() => { /* fetch logic */ }, [])
     return data
   }
   
   function Component() {
     const data = useData()
     return <div>{data}</div>
   }
   ```

   **Extract Component**:

   ```typescript
   // Before: Large component
   function Page() {
     return (
       <div>
         <header>...</header>
         <main>
           {/* 100 lines of JSX */}
         </main>
         <footer>...</footer>
       </div>
     )
   }
   
   // After: Smaller components
   function Header() { return <header>...</header> }
   function MainContent() { return <main>...</main> }
   function Footer() { return <footer>...</footer> }
   
   function Page() {
     return (
       <div>
         <Header />
         <MainContent />
         <Footer />
       </div>
     )
   }
   ```

   **Consolidate State**:

   ```typescript
   // Before: Multiple related states
   const [name, setName] = useState('')
   const [email, setEmail] = useState('')
   const [phone, setPhone] = useState('')
   
   // After: Single state object
   const [form, setForm] = useState({ name: '', email: '', phone: '' })
   ```

6. **Verify Refactoring**:

   ```bash
   # Run tests
   pnpm test
   
   # Type check
   pnpm tsc --noEmit
   
   # Lint
   pnpm lint
   
   # Manual testing of affected features
   ```

7. **Clean Up**:
   - Remove unused code
   - Update imports
   - Update barrel exports
   - Update documentation if needed

8. **Commit Changes**:

   ```bash
   git add -A
   git commit -m "refactor(<scope>): <description>"
   ```

## Refactoring Checklist

### Before Starting

- [ ] Tests pass
- [ ] Code committed (checkpoint)
- [ ] Understand what code does
- [ ] Identified all usages

### During Refactoring

- [ ] Make small, incremental changes
- [ ] Run tests frequently
- [ ] Keep functionality unchanged
- [ ] Update types as needed

### After Refactoring

- [ ] All tests pass
- [ ] No type errors
- [ ] No lint errors
- [ ] Code is cleaner/simpler
- [ ] No functionality regression

## Code Smell Detection

| Smell | Indicator | Refactoring |
|-------|-----------|-------------|
| Long Function | >50 lines | Extract Function |
| Large Component | >200 lines | Extract Components |
| Duplicate Code | Similar blocks | Extract & Reuse |
| Feature Envy | Accessing other object's data | Move Method |
| Data Clumps | Params always together | Introduce Object |
| Primitive Obsession | Strings/numbers for complex data | Value Object |
| Long Parameter List | >3 parameters | Parameter Object |

## Project-Specific Patterns

### Zustand Store Refactoring

```typescript
// Split large store into slices
// stores/settings/index.ts
export const useSettingsStore = create<SettingsState>()(
  persist(
    (...args) => ({
      ...createGeneralSlice(...args),
      ...createAppearanceSlice(...args),
      ...createShortcutsSlice(...args),
    }),
    { name: 'cognia-settings' }
  )
)
```

### Hook Composition

```typescript
// Combine related hooks
function useChat() {
  const messages = useChatMessages()
  const input = useChatInput()
  const streaming = useStreaming()
  
  return { messages, input, streaming }
}
```

## Notes

- Refactor in small, testable steps
- Keep each commit focused on one change
- Don't mix refactoring with feature changes
- Use IDE rename feature for safe renames
- Run tests after each step
