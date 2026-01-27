---
description: Generate React components following project conventions with TypeScript, Tailwind, and optional tests.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Parse Arguments**: Extract from user input:
   - Component name (required)
   - Component type: `ui` | `feature` | `page`
   - Options: `--test`, `--story`, `--hook`

2. **Determine Location**:
   - UI components: `components/ui/<name>.tsx`
   - Feature components: `components/<feature>/<name>.tsx`
   - Page components: `app/<route>/page.tsx`

3. **Generate Component**: Create component following conventions:

   **Basic Component Template**:

   ```tsx
   'use client'
   
   import { cn } from '@/lib/utils'
   
   interface <Name>Props {
     className?: string
     children?: React.ReactNode
   }
   
   export function <Name>({ className, children }: <Name>Props) {
     return (
       <div className={cn('', className)}>
         {children}
       </div>
     )
   }
   ```

   **UI Component (shadcn style)**:

   ```tsx
   import * as React from 'react'
   import { cva, type VariantProps } from 'class-variance-authority'
   import { cn } from '@/lib/utils'
   
   const <name>Variants = cva(
     'base-classes',
     {
       variants: {
         variant: {
           default: '',
           // ...
         },
         size: {
           default: '',
           sm: '',
           lg: '',
         },
       },
       defaultVariants: {
         variant: 'default',
         size: 'default',
       },
     }
   )
   
   export interface <Name>Props
     extends React.HTMLAttributes<HTMLDivElement>,
       VariantProps<typeof <name>Variants> {}
   
   const <Name> = React.forwardRef<HTMLDivElement, <Name>Props>(
     ({ className, variant, size, ...props }, ref) => {
       return (
         <div
           ref={ref}
           className={cn(<name>Variants({ variant, size, className }))}
           {...props}
         />
       )
     }
   )
   <Name>.displayName = '<Name>'
   
   export { <Name>, <name>Variants }
   ```

4. **Generate Test** (if `--test`):

   ```tsx
   import { render, screen } from '@testing-library/react'
   import { <Name> } from './<name>'
   
   describe('<Name>', () => {
     it('renders correctly', () => {
       render(<<Name>>Test</<Name>>)
       expect(screen.getByText('Test')).toBeInTheDocument()
     })
   })
   ```

5. **Generate Hook** (if `--hook`):

   ```tsx
   import { useState, useCallback } from 'react'
   
   export function use<Name>() {
     const [state, setState] = useState(null)
     
     const action = useCallback(() => {
       // Implementation
     }, [])
     
     return { state, action }
   }
   ```

6. **Update Exports**: Add to barrel exports if needed:
   - `components/ui/index.ts` for UI components
   - `hooks/index.ts` for hooks

## Naming Conventions

| Type | File Name | Export Name |
|------|-----------|-------------|
| Component | `button.tsx` | `Button` |
| Hook | `use-button.ts` | `useButton` |
| Test | `button.test.tsx` | - |
| Types | `button.types.ts` | `ButtonProps` |

## Styling Guidelines

- Use Tailwind CSS classes
- Use `cn()` utility for conditional classes
- Dark mode: use `dark:` prefix
- Responsive: `sm:`, `md:`, `lg:`, `xl:`
- CSS variables defined in `app/globals.css`

## Component Categories

| Category | Location | Description |
|----------|----------|-------------|
| `ui` | `components/ui/` | Reusable UI primitives (shadcn style) |
| `chat` | `components/chat/` | Chat-related components |
| `agent` | `components/agent/` | Agent system components |
| `artifacts` | `components/artifacts/` | Artifact display components |
| `designer` | `components/designer/` | Design tool components |

## Notes

- Always use `'use client'` for components with hooks or interactivity
- Use `asChild` prop pattern for polymorphic components
- Import types from `@/types` instead of redefining
- Co-locate tests next to source files
