---
description: Create new Next.js App Router pages with layout, loading, error, and not-found files following project conventions.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Parse Arguments**: Extract from user input:
   - Route path (required, e.g., `dashboard`, `profile/[id]`)
   - Route group: `(main)` (default), `(standalone-*)`
   - Options:
     - `--layout` — Generate layout.tsx
     - `--loading` — Generate loading.tsx
     - `--error` — Generate error.tsx
     - `--not-found` — Generate not-found.tsx
     - `--dynamic` — Dynamic route with `[param]`
     - `--parallel` — Parallel routes with `@slot`
     - `--client` — Force client component
     - `--all` — Generate all companion files

2. **Determine Location**:
   - Standard pages: `app/(main)/<route>/page.tsx`
   - Standalone pages: `app/(standalone-*)/<route>/page.tsx`
   - Dynamic pages: `app/(main)/<route>/[id]/page.tsx`

3. **Generate Page Component**:

   **Server Component (default)**:

   ```tsx
   import type { Metadata } from 'next'

   export const metadata: Metadata = {
     title: '<Page Title>',
     description: '<Page description>',
   }

   export default function <Name>Page() {
     return (
       <div className="container mx-auto py-6">
         <h1 className="text-2xl font-bold mb-4"><Title></h1>
         {/* Page content */}
       </div>
     )
   }
   ```

   **Client Component** (with `--client`):

   ```tsx
   'use client'

   import { useState } from 'react'
   import { cn } from '@/lib/utils'

   export default function <Name>Page() {
     return (
       <div className="container mx-auto py-6">
         <h1 className="text-2xl font-bold mb-4"><Title></h1>
         {/* Interactive content */}
       </div>
     )
   }
   ```

   **Dynamic Route** (`[id]/page.tsx`):

   ```tsx
   interface PageProps {
     params: Promise<{ id: string }>
   }

   export default async function <Name>Page({ params }: PageProps) {
     const { id } = await params

     return (
       <div className="container mx-auto py-6">
         <h1 className="text-2xl font-bold mb-4">Detail: {id}</h1>
       </div>
     )
   }

   export function generateStaticParams() {
     return []
   }
   ```

4. **Generate Layout** (if `--layout` or `--all`):

   ```tsx
   export default function <Name>Layout({
     children,
   }: {
     children: React.ReactNode
   }) {
     return (
       <div className="flex h-full">
         {/* Sidebar or navigation */}
         <main className="flex-1 overflow-auto">
           {children}
         </main>
       </div>
     )
   }
   ```

5. **Generate Loading** (if `--loading` or `--all`):

   ```tsx
   import { Skeleton } from '@/components/ui/skeleton'

   export default function Loading() {
     return (
       <div className="container mx-auto py-6 space-y-4">
         <Skeleton className="h-8 w-48" />
         <Skeleton className="h-64 w-full" />
       </div>
     )
   }
   ```

6. **Generate Error** (if `--error` or `--all`):

   ```tsx
   'use client'

   import { useEffect } from 'react'
   import { Button } from '@/components/ui/button'

   export default function Error({
     error,
     reset,
   }: {
     error: Error & { digest?: string }
     reset: () => void
   }) {
     useEffect(() => {
       console.error('Page error:', error)
     }, [error])

     return (
       <div className="flex flex-col items-center justify-center h-full gap-4">
         <h2 className="text-xl font-semibold">Something went wrong</h2>
         <p className="text-muted-foreground">{error.message}</p>
         <Button onClick={reset}>Try again</Button>
       </div>
     )
   }
   ```

7. **Generate Not Found** (if `--not-found` or `--all`):

   ```tsx
   import Link from 'next/link'
   import { Button } from '@/components/ui/button'

   export default function NotFound() {
     return (
       <div className="flex flex-col items-center justify-center h-full gap-4">
         <h2 className="text-xl font-semibold">Page Not Found</h2>
         <p className="text-muted-foreground">
           The page you are looking for does not exist.
         </p>
         <Button asChild>
           <Link href="/">Go Home</Link>
         </Button>
       </div>
     )
   }
   ```

## Route Structure Reference

```
app/(main)/
├── (chat)/              # Chat pages
├── settings/            # Settings
├── projects/            # Projects
├── scheduler/           # Task scheduler
├── sandbox/             # Code sandbox
├── skills/              # Skills
├── academic/            # Academic tools
├── arena/               # Model arena
├── designer/            # Design tools
├── notebook/            # Notebook
└── <new-route>/         # Your new page
    ├── page.tsx          # Main page (required)
    ├── layout.tsx        # Layout wrapper
    ├── loading.tsx       # Loading skeleton
    ├── error.tsx         # Error boundary
    ├── not-found.tsx     # 404 page
    └── [id]/             # Dynamic segment
        └── page.tsx
```

## File Conventions

| File | Purpose | Component Type |
|------|---------|----------------|
| `page.tsx` | Route UI | Server or Client |
| `layout.tsx` | Shared layout | Server |
| `loading.tsx` | Loading UI | Server |
| `error.tsx` | Error UI | Client (required) |
| `not-found.tsx` | 404 UI | Server |
| `template.tsx` | Re-render layout | Server |

## Notes

- Pages in `app/(main)/` are wrapped by the main layout with sidebar
- Use `generateStaticParams` for dynamic routes with `output: "export"`
- `error.tsx` must always be a client component
- Use `@/components/ui/skeleton` for loading states
- Import types from `@/types` for shared type definitions
- Add page route to navigation sidebar if needed
