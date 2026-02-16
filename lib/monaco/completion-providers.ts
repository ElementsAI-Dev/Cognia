/**
 * Monaco Editor Completion Providers
 * Context-aware auto-completion for imports, Tailwind CSS, and JSX attributes
 */

import type * as Monaco from 'monaco-editor';

// ============================================================
// Import Path Completion
// ============================================================

/** Common npm packages for import suggestions */
const NPM_PACKAGES: { name: string; description: string; exports?: string[] }[] = [
  { name: 'react', description: 'React library', exports: ['useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext', 'useReducer', 'memo', 'forwardRef', 'createContext', 'Fragment', 'Suspense', 'lazy', 'startTransition', 'useTransition', 'useDeferredValue', 'useId', 'use', 'useActionState', 'useOptimistic', 'useFormStatus'] },
  { name: 'react-dom', description: 'React DOM rendering', exports: ['createRoot', 'hydrateRoot', 'createPortal', 'flushSync'] },
  { name: 'react-dom/client', description: 'React DOM client APIs' },
  { name: 'next/link', description: 'Next.js Link component' },
  { name: 'next/image', description: 'Next.js Image component' },
  { name: 'next/navigation', description: 'Next.js navigation hooks', exports: ['useRouter', 'usePathname', 'useSearchParams', 'useParams', 'redirect', 'notFound'] },
  { name: 'next/headers', description: 'Next.js headers API', exports: ['cookies', 'headers'] },
  { name: 'next/font/google', description: 'Next.js Google Fonts' },
  { name: 'next/font/local', description: 'Next.js local fonts' },
  { name: 'next/dynamic', description: 'Next.js dynamic imports' },
  { name: 'next-intl', description: 'Next.js internationalization', exports: ['useTranslations', 'useLocale', 'useNow', 'useTimeZone', 'NextIntlClientProvider'] },
  { name: 'zustand', description: 'Zustand state management', exports: ['create'] },
  { name: 'zustand/middleware', description: 'Zustand middleware', exports: ['persist', 'devtools', 'subscribeWithSelector', 'combine'] },
  { name: 'lucide-react', description: 'Lucide icon library' },
  { name: 'framer-motion', description: 'Framer Motion animations', exports: ['motion', 'AnimatePresence', 'useAnimation', 'useMotionValue', 'useSpring', 'useTransform', 'useInView', 'useScroll'] },
  { name: 'clsx', description: 'Conditional className utility', exports: ['clsx'] },
  { name: 'tailwind-merge', description: 'Tailwind class merging', exports: ['twMerge', 'twJoin'] },
  { name: 'class-variance-authority', description: 'Class variance authority', exports: ['cva'] },
  { name: 'ai', description: 'Vercel AI SDK', exports: ['useChat', 'useCompletion', 'useAssistant', 'streamText', 'generateText', 'generateObject'] },
  { name: 'ai/react', description: 'Vercel AI SDK React hooks', exports: ['useChat', 'useCompletion', 'useAssistant'] },
  { name: 'zod', description: 'TypeScript-first schema validation', exports: ['z'] },
  { name: 'nanoid', description: 'Nano ID generator', exports: ['nanoid'] },
  { name: 'date-fns', description: 'Date utility library', exports: ['format', 'formatDistance', 'formatRelative', 'subDays', 'addDays', 'isAfter', 'isBefore', 'parseISO'] },
  { name: 'sonner', description: 'Toast notifications', exports: ['toast', 'Toaster'] },
];

/** Project internal path aliases */
const PROJECT_PATHS: { path: string; description: string }[] = [
  { path: '@/components/', description: 'UI components' },
  { path: '@/components/ui/', description: 'shadcn/ui components' },
  { path: '@/components/chat/', description: 'Chat components' },
  { path: '@/components/agent/', description: 'Agent components' },
  { path: '@/components/designer/', description: 'Designer components' },
  { path: '@/hooks/', description: 'Custom React hooks' },
  { path: '@/hooks/ai/', description: 'AI-related hooks' },
  { path: '@/hooks/ui/', description: 'UI hooks' },
  { path: '@/lib/', description: 'Core utilities' },
  { path: '@/lib/ai/', description: 'AI utilities' },
  { path: '@/lib/utils', description: 'Utility functions (cn, etc.)' },
  { path: '@/stores/', description: 'Zustand stores' },
  { path: '@/stores/designer/', description: 'Designer stores' },
  { path: '@/types/', description: 'TypeScript type definitions' },
  { path: '@/types/designer/', description: 'Designer types' },
];

/** shadcn/ui components for import suggestions */
const SHADCN_COMPONENTS: { name: string; exports: string[] }[] = [
  { name: 'button', exports: ['Button', 'buttonVariants'] },
  { name: 'input', exports: ['Input'] },
  { name: 'label', exports: ['Label'] },
  { name: 'select', exports: ['Select', 'SelectContent', 'SelectItem', 'SelectTrigger', 'SelectValue', 'SelectGroup', 'SelectLabel', 'SelectSeparator'] },
  { name: 'dialog', exports: ['Dialog', 'DialogContent', 'DialogDescription', 'DialogFooter', 'DialogHeader', 'DialogTitle', 'DialogTrigger', 'DialogClose'] },
  { name: 'dropdown-menu', exports: ['DropdownMenu', 'DropdownMenuContent', 'DropdownMenuItem', 'DropdownMenuLabel', 'DropdownMenuSeparator', 'DropdownMenuTrigger', 'DropdownMenuCheckboxItem', 'DropdownMenuGroup', 'DropdownMenuSub', 'DropdownMenuSubContent', 'DropdownMenuSubTrigger'] },
  { name: 'card', exports: ['Card', 'CardContent', 'CardDescription', 'CardFooter', 'CardHeader', 'CardTitle'] },
  { name: 'tabs', exports: ['Tabs', 'TabsContent', 'TabsList', 'TabsTrigger'] },
  { name: 'tooltip', exports: ['Tooltip', 'TooltipContent', 'TooltipProvider', 'TooltipTrigger'] },
  { name: 'popover', exports: ['Popover', 'PopoverContent', 'PopoverTrigger'] },
  { name: 'separator', exports: ['Separator'] },
  { name: 'switch', exports: ['Switch'] },
  { name: 'checkbox', exports: ['Checkbox'] },
  { name: 'textarea', exports: ['Textarea'] },
  { name: 'badge', exports: ['Badge', 'badgeVariants'] },
  { name: 'avatar', exports: ['Avatar', 'AvatarFallback', 'AvatarImage'] },
  { name: 'scroll-area', exports: ['ScrollArea', 'ScrollBar'] },
  { name: 'sheet', exports: ['Sheet', 'SheetContent', 'SheetDescription', 'SheetFooter', 'SheetHeader', 'SheetTitle', 'SheetTrigger', 'SheetClose'] },
  { name: 'accordion', exports: ['Accordion', 'AccordionContent', 'AccordionItem', 'AccordionTrigger'] },
  { name: 'alert', exports: ['Alert', 'AlertDescription', 'AlertTitle'] },
  { name: 'alert-dialog', exports: ['AlertDialog', 'AlertDialogAction', 'AlertDialogCancel', 'AlertDialogContent', 'AlertDialogDescription', 'AlertDialogFooter', 'AlertDialogHeader', 'AlertDialogTitle', 'AlertDialogTrigger'] },
  { name: 'command', exports: ['Command', 'CommandDialog', 'CommandEmpty', 'CommandGroup', 'CommandInput', 'CommandItem', 'CommandList', 'CommandSeparator'] },
  { name: 'progress', exports: ['Progress'] },
  { name: 'skeleton', exports: ['Skeleton'] },
  { name: 'slider', exports: ['Slider'] },
  { name: 'toast', exports: ['Toast', 'ToastAction', 'ToastClose', 'ToastDescription', 'ToastProvider', 'ToastTitle', 'ToastViewport', 'useToast'] },
  { name: 'toggle', exports: ['Toggle'] },
  { name: 'toggle-group', exports: ['ToggleGroup', 'ToggleGroupItem'] },
  { name: 'collapsible', exports: ['Collapsible', 'CollapsibleContent', 'CollapsibleTrigger'] },
  { name: 'context-menu', exports: ['ContextMenu', 'ContextMenuContent', 'ContextMenuItem', 'ContextMenuTrigger', 'ContextMenuSeparator', 'ContextMenuSub', 'ContextMenuSubContent', 'ContextMenuSubTrigger'] },
  { name: 'form', exports: ['Form', 'FormControl', 'FormDescription', 'FormField', 'FormItem', 'FormLabel', 'FormMessage', 'useFormField'] },
  { name: 'table', exports: ['Table', 'TableBody', 'TableCaption', 'TableCell', 'TableHead', 'TableHeader', 'TableRow', 'TableFooter'] },
  { name: 'navigation-menu', exports: ['NavigationMenu', 'NavigationMenuContent', 'NavigationMenuItem', 'NavigationMenuLink', 'NavigationMenuList', 'NavigationMenuTrigger'] },
  { name: 'sidebar', exports: ['Sidebar', 'SidebarContent', 'SidebarFooter', 'SidebarGroup', 'SidebarGroupContent', 'SidebarGroupLabel', 'SidebarHeader', 'SidebarMenu', 'SidebarMenuButton', 'SidebarMenuItem', 'SidebarProvider', 'SidebarTrigger'] },
];

/**
 * Detect if cursor is inside an import path string
 */
function isInsideImportPath(lineContent: string, column: number): { isImport: boolean; currentPath: string; quoteChar: string } {
  // Match: import ... from 'path' or import ... from "path"
  // Also match: import 'path' or import "path"
  // Also match: require('path') or require("path")
  const importFromMatch = lineContent.match(/(?:import\s+.*\s+from\s+|import\s+|require\s*\(\s*)(['"])([^'"]*)?$/);
  if (importFromMatch) {
    const textBeforeCursor = lineContent.substring(0, column - 1);
    const afterQuote = textBeforeCursor.match(/(?:import\s+.*\s+from\s+|import\s+|require\s*\(\s*)(['"])([^'"]*)$/);
    if (afterQuote) {
      return { isImport: true, currentPath: afterQuote[2] || '', quoteChar: afterQuote[1] };
    }
  }
  return { isImport: false, currentPath: '', quoteChar: '' };
}

/**
 * Register import path completion provider
 */
export function registerImportPathCompletion(
  monaco: typeof Monaco,
  languages: string[] = ['typescript', 'typescriptreact', 'javascript', 'javascriptreact']
): Monaco.IDisposable[] {
  const disposables: Monaco.IDisposable[] = [];

  for (const lang of languages) {
    const disposable = monaco.languages.registerCompletionItemProvider(lang, {
      triggerCharacters: ["'", '"', '/', '@', '.'],
      provideCompletionItems: (model, position) => {
        const lineContent = model.getLineContent(position.lineNumber);
        const { isImport, currentPath } = isInsideImportPath(lineContent, position.column);

        if (!isImport) return { suggestions: [] };

        const suggestions: Monaco.languages.CompletionItem[] = [];
        const word = model.getWordUntilPosition(position);
        const range: Monaco.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        // Suggest npm packages when at start of path
        if (!currentPath || !currentPath.startsWith('.') && !currentPath.startsWith('@/')) {
          for (const pkg of NPM_PACKAGES) {
            if (!currentPath || pkg.name.startsWith(currentPath)) {
              suggestions.push({
                label: pkg.name,
                kind: monaco.languages.CompletionItemKind.Module,
                insertText: pkg.name,
                detail: pkg.description,
                documentation: pkg.exports ? `Exports: ${pkg.exports.join(', ')}` : pkg.description,
                range,
                sortText: `0_${pkg.name}`,
              });
            }
          }
        }

        // Suggest project paths when @ is typed
        if (!currentPath || currentPath.startsWith('@')) {
          for (const p of PROJECT_PATHS) {
            if (!currentPath || p.path.startsWith(currentPath)) {
              suggestions.push({
                label: p.path,
                kind: monaco.languages.CompletionItemKind.Folder,
                insertText: p.path,
                detail: p.description,
                range,
                sortText: `1_${p.path}`,
              });
            }
          }

          // Suggest shadcn/ui components when typing @/components/ui/
          if (currentPath.startsWith('@/components/ui/') || currentPath === '@/components/ui') {
            for (const comp of SHADCN_COMPONENTS) {
              const fullPath = `@/components/ui/${comp.name}`;
              suggestions.push({
                label: fullPath,
                kind: monaco.languages.CompletionItemKind.Class,
                insertText: fullPath,
                detail: `Exports: ${comp.exports.join(', ')}`,
                documentation: { value: `**shadcn/ui** component\n\n\`\`\`typescript\nimport { ${comp.exports.slice(0, 3).join(', ')} } from '${fullPath}'\n\`\`\`` },
                range,
                sortText: `2_${comp.name}`,
              });
            }
          }
        }

        // Suggest relative paths
        if (currentPath.startsWith('.')) {
          const relativeDirs = ['./', '../', '../../'];
          for (const dir of relativeDirs) {
            if (dir.startsWith(currentPath)) {
              suggestions.push({
                label: dir,
                kind: monaco.languages.CompletionItemKind.Folder,
                insertText: dir,
                detail: 'Relative path',
                range,
                sortText: `3_${dir}`,
              });
            }
          }
        }

        return { suggestions };
      },
    });
    disposables.push(disposable);
  }

  return disposables;
}

// ============================================================
// Tailwind CSS Class Completion
// ============================================================

/** Tailwind CSS utility classes organized by category */
const TAILWIND_CLASSES: Record<string, { classes: string[]; description: string }> = {
  // Layout
  display: {
    classes: ['block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'inline-grid', 'hidden', 'contents', 'flow-root', 'list-item', 'table', 'table-row', 'table-cell'],
    description: 'Display',
  },
  position: {
    classes: ['static', 'fixed', 'absolute', 'relative', 'sticky'],
    description: 'Position',
  },
  overflow: {
    classes: ['overflow-auto', 'overflow-hidden', 'overflow-visible', 'overflow-scroll', 'overflow-x-auto', 'overflow-y-auto', 'overflow-x-hidden', 'overflow-y-hidden'],
    description: 'Overflow',
  },
  zIndex: {
    classes: ['z-0', 'z-10', 'z-20', 'z-30', 'z-40', 'z-50', 'z-auto'],
    description: 'Z-Index',
  },

  // Flexbox & Grid
  flexDirection: {
    classes: ['flex-row', 'flex-row-reverse', 'flex-col', 'flex-col-reverse'],
    description: 'Flex Direction',
  },
  flexWrap: {
    classes: ['flex-wrap', 'flex-wrap-reverse', 'flex-nowrap'],
    description: 'Flex Wrap',
  },
  flexGrow: {
    classes: ['flex-1', 'flex-auto', 'flex-initial', 'flex-none', 'grow', 'grow-0', 'shrink', 'shrink-0'],
    description: 'Flex Grow/Shrink',
  },
  alignItems: {
    classes: ['items-start', 'items-end', 'items-center', 'items-baseline', 'items-stretch'],
    description: 'Align Items',
  },
  justifyContent: {
    classes: ['justify-start', 'justify-end', 'justify-center', 'justify-between', 'justify-around', 'justify-evenly'],
    description: 'Justify Content',
  },
  gap: {
    classes: ['gap-0', 'gap-0.5', 'gap-1', 'gap-1.5', 'gap-2', 'gap-2.5', 'gap-3', 'gap-4', 'gap-5', 'gap-6', 'gap-8', 'gap-10', 'gap-12', 'gap-16', 'gap-x-2', 'gap-x-4', 'gap-y-2', 'gap-y-4'],
    description: 'Gap',
  },
  gridCols: {
    classes: ['grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'grid-cols-5', 'grid-cols-6', 'grid-cols-12', 'grid-cols-none', 'grid-cols-subgrid'],
    description: 'Grid Columns',
  },
  gridRows: {
    classes: ['grid-rows-1', 'grid-rows-2', 'grid-rows-3', 'grid-rows-4', 'grid-rows-6', 'grid-rows-none', 'grid-rows-subgrid'],
    description: 'Grid Rows',
  },
  colSpan: {
    classes: ['col-span-1', 'col-span-2', 'col-span-3', 'col-span-4', 'col-span-6', 'col-span-12', 'col-span-full', 'col-start-1', 'col-end-1'],
    description: 'Column Span',
  },

  // Spacing
  padding: {
    classes: ['p-0', 'p-0.5', 'p-1', 'p-1.5', 'p-2', 'p-2.5', 'p-3', 'p-4', 'p-5', 'p-6', 'p-8', 'p-10', 'p-12', 'p-16', 'p-20', 'px-0', 'px-1', 'px-2', 'px-3', 'px-4', 'px-6', 'px-8', 'py-0', 'py-1', 'py-2', 'py-3', 'py-4', 'py-6', 'py-8', 'pt-0', 'pt-1', 'pt-2', 'pt-4', 'pb-0', 'pb-1', 'pb-2', 'pb-4', 'pl-0', 'pl-1', 'pl-2', 'pl-4', 'pr-0', 'pr-1', 'pr-2', 'pr-4'],
    description: 'Padding',
  },
  margin: {
    classes: ['m-0', 'm-0.5', 'm-1', 'm-1.5', 'm-2', 'm-3', 'm-4', 'm-5', 'm-6', 'm-8', 'm-auto', 'mx-0', 'mx-1', 'mx-2', 'mx-4', 'mx-auto', 'my-0', 'my-1', 'my-2', 'my-4', 'my-auto', 'mt-0', 'mt-1', 'mt-2', 'mt-4', 'mt-auto', 'mb-0', 'mb-1', 'mb-2', 'mb-4', 'ml-0', 'ml-1', 'ml-2', 'ml-4', 'ml-auto', 'mr-0', 'mr-1', 'mr-2', 'mr-4', '-m-1', '-m-2', '-mt-1', '-mt-2', '-mb-1'],
    description: 'Margin',
  },
  space: {
    classes: ['space-x-0', 'space-x-1', 'space-x-2', 'space-x-3', 'space-x-4', 'space-x-6', 'space-x-8', 'space-y-0', 'space-y-1', 'space-y-2', 'space-y-3', 'space-y-4', 'space-y-6', 'space-y-8', 'space-x-reverse', 'space-y-reverse'],
    description: 'Space Between',
  },

  // Sizing
  width: {
    classes: ['w-0', 'w-1', 'w-2', 'w-3', 'w-4', 'w-5', 'w-6', 'w-8', 'w-10', 'w-12', 'w-16', 'w-20', 'w-24', 'w-32', 'w-40', 'w-48', 'w-56', 'w-64', 'w-72', 'w-80', 'w-96', 'w-auto', 'w-px', 'w-full', 'w-screen', 'w-fit', 'w-min', 'w-max', 'w-1/2', 'w-1/3', 'w-2/3', 'w-1/4', 'w-3/4', 'w-1/5', 'w-2/5', 'w-3/5', 'w-4/5'],
    description: 'Width',
  },
  height: {
    classes: ['h-0', 'h-1', 'h-2', 'h-3', 'h-4', 'h-5', 'h-6', 'h-8', 'h-10', 'h-12', 'h-16', 'h-20', 'h-24', 'h-32', 'h-40', 'h-48', 'h-56', 'h-64', 'h-72', 'h-80', 'h-96', 'h-auto', 'h-px', 'h-full', 'h-screen', 'h-fit', 'h-min', 'h-max', 'h-dvh', 'h-svh', 'h-lvh'],
    description: 'Height',
  },
  minMax: {
    classes: ['min-w-0', 'min-w-full', 'min-w-min', 'min-w-max', 'min-w-fit', 'max-w-xs', 'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-3xl', 'max-w-4xl', 'max-w-5xl', 'max-w-6xl', 'max-w-7xl', 'max-w-full', 'max-w-prose', 'max-w-screen-sm', 'max-w-screen-md', 'max-w-screen-lg', 'max-w-screen-xl', 'max-w-none', 'min-h-0', 'min-h-full', 'min-h-screen', 'min-h-dvh', 'max-h-full', 'max-h-screen', 'max-h-fit'],
    description: 'Min/Max Width & Height',
  },
  size: {
    classes: ['size-0', 'size-1', 'size-2', 'size-3', 'size-4', 'size-5', 'size-6', 'size-8', 'size-10', 'size-12', 'size-16', 'size-20', 'size-24', 'size-full', 'size-auto'],
    description: 'Size (width & height)',
  },

  // Typography
  fontSize: {
    classes: ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl', 'text-8xl', 'text-9xl'],
    description: 'Font Size',
  },
  fontWeight: {
    classes: ['font-thin', 'font-extralight', 'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-extrabold', 'font-black'],
    description: 'Font Weight',
  },
  textAlign: {
    classes: ['text-left', 'text-center', 'text-right', 'text-justify', 'text-start', 'text-end'],
    description: 'Text Align',
  },
  textColor: {
    classes: ['text-transparent', 'text-black', 'text-white', 'text-slate-50', 'text-slate-100', 'text-slate-200', 'text-slate-300', 'text-slate-400', 'text-slate-500', 'text-slate-600', 'text-slate-700', 'text-slate-800', 'text-slate-900', 'text-gray-50', 'text-gray-100', 'text-gray-200', 'text-gray-300', 'text-gray-400', 'text-gray-500', 'text-gray-600', 'text-gray-700', 'text-gray-800', 'text-gray-900', 'text-red-500', 'text-red-600', 'text-red-700', 'text-green-500', 'text-green-600', 'text-green-700', 'text-blue-500', 'text-blue-600', 'text-blue-700', 'text-yellow-500', 'text-yellow-600', 'text-purple-500', 'text-purple-600', 'text-pink-500', 'text-primary', 'text-secondary', 'text-muted-foreground', 'text-foreground', 'text-destructive', 'text-accent-foreground', 'text-popover-foreground', 'text-card-foreground'],
    description: 'Text Color',
  },
  textDecoration: {
    classes: ['underline', 'overline', 'line-through', 'no-underline', 'decoration-solid', 'decoration-dashed', 'decoration-dotted', 'decoration-double', 'decoration-wavy'],
    description: 'Text Decoration',
  },
  textTransform: {
    classes: ['uppercase', 'lowercase', 'capitalize', 'normal-case'],
    description: 'Text Transform',
  },
  textOverflow: {
    classes: ['truncate', 'text-ellipsis', 'text-clip', 'line-clamp-1', 'line-clamp-2', 'line-clamp-3', 'line-clamp-4', 'line-clamp-5', 'line-clamp-6', 'line-clamp-none'],
    description: 'Text Overflow',
  },
  lineHeight: {
    classes: ['leading-none', 'leading-tight', 'leading-snug', 'leading-normal', 'leading-relaxed', 'leading-loose', 'leading-3', 'leading-4', 'leading-5', 'leading-6', 'leading-7', 'leading-8', 'leading-9', 'leading-10'],
    description: 'Line Height',
  },
  letterSpacing: {
    classes: ['tracking-tighter', 'tracking-tight', 'tracking-normal', 'tracking-wide', 'tracking-wider', 'tracking-widest'],
    description: 'Letter Spacing',
  },
  whitespace: {
    classes: ['whitespace-normal', 'whitespace-nowrap', 'whitespace-pre', 'whitespace-pre-line', 'whitespace-pre-wrap', 'whitespace-break-spaces', 'break-normal', 'break-words', 'break-all', 'break-keep'],
    description: 'Whitespace',
  },

  // Backgrounds
  backgroundColor: {
    classes: ['bg-transparent', 'bg-black', 'bg-white', 'bg-slate-50', 'bg-slate-100', 'bg-slate-200', 'bg-slate-300', 'bg-slate-400', 'bg-slate-500', 'bg-slate-600', 'bg-slate-700', 'bg-slate-800', 'bg-slate-900', 'bg-gray-50', 'bg-gray-100', 'bg-gray-200', 'bg-gray-300', 'bg-gray-400', 'bg-gray-500', 'bg-gray-600', 'bg-gray-700', 'bg-gray-800', 'bg-gray-900', 'bg-red-50', 'bg-red-100', 'bg-red-500', 'bg-red-600', 'bg-green-50', 'bg-green-100', 'bg-green-500', 'bg-green-600', 'bg-blue-50', 'bg-blue-100', 'bg-blue-500', 'bg-blue-600', 'bg-yellow-50', 'bg-yellow-100', 'bg-yellow-500', 'bg-purple-50', 'bg-purple-100', 'bg-purple-500', 'bg-pink-50', 'bg-pink-100', 'bg-pink-500', 'bg-background', 'bg-foreground', 'bg-primary', 'bg-secondary', 'bg-muted', 'bg-accent', 'bg-destructive', 'bg-popover', 'bg-card', 'bg-muted/20', 'bg-muted/30', 'bg-muted/50', 'bg-primary/10', 'bg-primary/20'],
    description: 'Background Color',
  },
  gradient: {
    classes: ['bg-gradient-to-t', 'bg-gradient-to-tr', 'bg-gradient-to-r', 'bg-gradient-to-br', 'bg-gradient-to-b', 'bg-gradient-to-bl', 'bg-gradient-to-l', 'bg-gradient-to-tl', 'from-transparent', 'from-black', 'from-white', 'via-transparent', 'to-transparent', 'to-black', 'to-white'],
    description: 'Gradient',
  },

  // Borders
  border: {
    classes: ['border', 'border-0', 'border-2', 'border-4', 'border-8', 'border-t', 'border-r', 'border-b', 'border-l', 'border-t-0', 'border-r-0', 'border-b-0', 'border-l-0', 'border-t-2', 'border-r-2', 'border-b-2', 'border-l-2', 'border-x', 'border-y'],
    description: 'Border Width',
  },
  borderColor: {
    classes: ['border-transparent', 'border-black', 'border-white', 'border-gray-200', 'border-gray-300', 'border-slate-200', 'border-slate-300', 'border-red-500', 'border-green-500', 'border-blue-500', 'border-border', 'border-input', 'border-primary', 'border-destructive', 'border-muted'],
    description: 'Border Color',
  },
  borderRadius: {
    classes: ['rounded-none', 'rounded-sm', 'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full', 'rounded-t-none', 'rounded-t-sm', 'rounded-t', 'rounded-t-md', 'rounded-t-lg', 'rounded-b-none', 'rounded-b-sm', 'rounded-b', 'rounded-b-md', 'rounded-b-lg', 'rounded-l-none', 'rounded-l-sm', 'rounded-l', 'rounded-l-md', 'rounded-l-lg', 'rounded-r-none', 'rounded-r-sm', 'rounded-r', 'rounded-r-md', 'rounded-r-lg'],
    description: 'Border Radius',
  },
  borderStyle: {
    classes: ['border-solid', 'border-dashed', 'border-dotted', 'border-double', 'border-hidden', 'border-none'],
    description: 'Border Style',
  },
  outline: {
    classes: ['outline-none', 'outline', 'outline-dashed', 'outline-dotted', 'outline-double', 'outline-0', 'outline-1', 'outline-2', 'outline-4', 'outline-8', 'outline-offset-0', 'outline-offset-1', 'outline-offset-2', 'outline-offset-4'],
    description: 'Outline',
  },
  ring: {
    classes: ['ring-0', 'ring-1', 'ring-2', 'ring-4', 'ring-8', 'ring', 'ring-inset', 'ring-transparent', 'ring-black', 'ring-white', 'ring-primary', 'ring-offset-0', 'ring-offset-1', 'ring-offset-2', 'ring-offset-4'],
    description: 'Ring',
  },

  // Effects
  shadow: {
    classes: ['shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl', 'shadow-inner', 'shadow-none'],
    description: 'Box Shadow',
  },
  opacity: {
    classes: ['opacity-0', 'opacity-5', 'opacity-10', 'opacity-20', 'opacity-25', 'opacity-30', 'opacity-40', 'opacity-50', 'opacity-60', 'opacity-70', 'opacity-75', 'opacity-80', 'opacity-90', 'opacity-95', 'opacity-100'],
    description: 'Opacity',
  },

  // Transitions & Animation
  transition: {
    classes: ['transition-none', 'transition-all', 'transition', 'transition-colors', 'transition-opacity', 'transition-shadow', 'transition-transform', 'duration-75', 'duration-100', 'duration-150', 'duration-200', 'duration-300', 'duration-500', 'duration-700', 'duration-1000', 'ease-linear', 'ease-in', 'ease-out', 'ease-in-out', 'delay-75', 'delay-100', 'delay-150', 'delay-200', 'delay-300', 'delay-500'],
    description: 'Transition',
  },
  animation: {
    classes: ['animate-none', 'animate-spin', 'animate-ping', 'animate-pulse', 'animate-bounce', 'animate-in', 'animate-out', 'fade-in', 'fade-out', 'zoom-in', 'zoom-out', 'spin-in', 'spin-out', 'slide-in-from-top', 'slide-in-from-bottom', 'slide-in-from-left', 'slide-in-from-right'],
    description: 'Animation',
  },

  // Transforms
  transform: {
    classes: ['scale-0', 'scale-50', 'scale-75', 'scale-90', 'scale-95', 'scale-100', 'scale-105', 'scale-110', 'scale-125', 'scale-150', 'rotate-0', 'rotate-1', 'rotate-2', 'rotate-3', 'rotate-6', 'rotate-12', 'rotate-45', 'rotate-90', 'rotate-180', '-rotate-1', '-rotate-2', '-rotate-3', '-rotate-6', '-rotate-12', '-rotate-45', '-rotate-90', '-rotate-180', 'translate-x-0', 'translate-x-1', 'translate-x-2', 'translate-x-4', 'translate-y-0', 'translate-y-1', 'translate-y-2', 'translate-y-4', '-translate-x-1', '-translate-x-2', '-translate-y-1', '-translate-y-2', 'translate-x-1/2', '-translate-x-1/2', 'translate-y-1/2', '-translate-y-1/2', 'skew-x-1', 'skew-x-2', 'skew-x-3', 'skew-y-1', 'skew-y-2', 'skew-y-3', 'origin-center', 'origin-top', 'origin-top-right', 'origin-right', 'origin-bottom-right', 'origin-bottom', 'origin-bottom-left', 'origin-left', 'origin-top-left'],
    description: 'Transform',
  },

  // Interactivity
  cursor: {
    classes: ['cursor-auto', 'cursor-default', 'cursor-pointer', 'cursor-wait', 'cursor-text', 'cursor-move', 'cursor-help', 'cursor-not-allowed', 'cursor-none', 'cursor-grab', 'cursor-grabbing', 'cursor-crosshair', 'cursor-col-resize', 'cursor-row-resize', 'cursor-zoom-in', 'cursor-zoom-out'],
    description: 'Cursor',
  },
  pointer: {
    classes: ['pointer-events-none', 'pointer-events-auto', 'select-none', 'select-text', 'select-all', 'select-auto', 'touch-none', 'touch-pan-x', 'touch-pan-y', 'touch-manipulation'],
    description: 'Pointer Events & Selection',
  },

  // Responsive Prefixes
  responsive: {
    classes: ['sm:', 'md:', 'lg:', 'xl:', '2xl:'],
    description: 'Responsive Breakpoints',
  },
  
  // State Variants
  states: {
    classes: ['hover:', 'focus:', 'focus-visible:', 'focus-within:', 'active:', 'visited:', 'disabled:', 'first:', 'last:', 'odd:', 'even:', 'group-hover:', 'peer-hover:', 'dark:', 'placeholder:', 'before:', 'after:', 'aria-selected:', 'aria-disabled:', 'data-[state=open]:', 'data-[state=closed]:'],
    description: 'State Variants',
  },

  // Inset (top, right, bottom, left)
  inset: {
    classes: ['inset-0', 'inset-x-0', 'inset-y-0', 'top-0', 'top-1', 'top-2', 'top-4', 'top-1/2', 'top-full', 'right-0', 'right-1', 'right-2', 'right-4', 'bottom-0', 'bottom-1', 'bottom-2', 'bottom-4', 'left-0', 'left-1', 'left-2', 'left-4', '-top-1', '-top-2', '-right-1', '-right-2', '-bottom-1', '-bottom-2', '-left-1', '-left-2', 'inset-auto'],
    description: 'Inset / Positioning',
  },

  // Scroll
  scroll: {
    classes: ['scroll-auto', 'scroll-smooth', 'scroll-m-0', 'scroll-m-1', 'scroll-m-2', 'scroll-m-4', 'scroll-p-0', 'scroll-p-1', 'scroll-p-2', 'scroll-p-4', 'snap-start', 'snap-end', 'snap-center', 'snap-align-none', 'snap-normal', 'snap-always', 'snap-none', 'snap-x', 'snap-y', 'snap-both', 'snap-mandatory', 'snap-proximity', 'overscroll-auto', 'overscroll-contain', 'overscroll-none'],
    description: 'Scroll',
  },

  // Accessibility
  accessibility: {
    classes: ['sr-only', 'not-sr-only', 'forced-color-adjust-auto', 'forced-color-adjust-none'],
    description: 'Accessibility',
  },

  // Container & Aspect
  container: {
    classes: ['container', 'mx-auto', 'aspect-auto', 'aspect-square', 'aspect-video', 'aspect-[4/3]'],
    description: 'Container & Aspect Ratio',
  },

  // Object
  objectFit: {
    classes: ['object-contain', 'object-cover', 'object-fill', 'object-none', 'object-scale-down', 'object-bottom', 'object-center', 'object-left', 'object-left-bottom', 'object-left-top', 'object-right', 'object-right-bottom', 'object-right-top', 'object-top'],
    description: 'Object Fit & Position',
  },
};

/** Flatten all Tailwind classes into a single array for quick lookup */
function getAllTailwindClasses(): { className: string; category: string; description: string }[] {
  const all: { className: string; category: string; description: string }[] = [];
  for (const [, { classes, description }] of Object.entries(TAILWIND_CLASSES)) {
    for (const cls of classes) {
      all.push({ className: cls, category: description, description });
    }
  }
  return all;
}

const ALL_TAILWIND_CLASSES = getAllTailwindClasses();

/**
 * Detect if cursor is inside a className or class attribute string
 */
function isInsideClassAttribute(lineContent: string, column: number): boolean {
  const textBeforeCursor = lineContent.substring(0, column - 1);
  // Match className="...|  or class="...|  or className='...|  or className={`...|
  // Also match cn('...|  or cn("...|  or clsx('...|  or clsx("...|  or twMerge('...|
  const patterns = [
    /(?:className|class)\s*=\s*"[^"]*$/,
    /(?:className|class)\s*=\s*'[^']*$/,
    /(?:className|class)\s*=\s*\{`[^`]*$/,
    /(?:className|class)\s*=\s*\{(?:cn|clsx|twMerge)\s*\(\s*['"][^'"]*$/,
    /(?:cn|clsx|twMerge)\s*\(\s*['"][^'"]*$/,
    /(?:cn|clsx|twMerge)\s*\([^)]*['"][^'"]*$/,
  ];
  return patterns.some(p => p.test(textBeforeCursor));
}

/**
 * Register Tailwind CSS class completion provider
 */
export function registerTailwindCompletion(
  monaco: typeof Monaco,
  languages: string[] = ['typescript', 'typescriptreact', 'javascript', 'javascriptreact', 'html']
): Monaco.IDisposable[] {
  const disposables: Monaco.IDisposable[] = [];

  for (const lang of languages) {
    const disposable = monaco.languages.registerCompletionItemProvider(lang, {
      triggerCharacters: ['"', "'", ' ', ':', '-', '/'],
      provideCompletionItems: (model, position) => {
        const lineContent = model.getLineContent(position.lineNumber);
        if (!isInsideClassAttribute(lineContent, position.column)) {
          return { suggestions: [] };
        }

        // Get the partial class being typed
        const textBeforeCursor = lineContent.substring(0, position.column - 1);
        const lastSpace = textBeforeCursor.lastIndexOf(' ');
        const lastQuote = Math.max(textBeforeCursor.lastIndexOf('"'), textBeforeCursor.lastIndexOf("'"), textBeforeCursor.lastIndexOf('`'));
        const partialStart = Math.max(lastSpace, lastQuote) + 1;
        const partial = textBeforeCursor.substring(partialStart);

        const range: Monaco.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: partialStart + 1,
          endColumn: position.column,
        };

        const suggestions: Monaco.languages.CompletionItem[] = [];

        for (const { className, category } of ALL_TAILWIND_CLASSES) {
          if (!partial || className.startsWith(partial) || className.includes(partial)) {
            suggestions.push({
              label: className,
              kind: monaco.languages.CompletionItemKind.Value,
              insertText: className,
              detail: category,
              range,
              sortText: className.startsWith(partial) ? `0_${className}` : `1_${className}`,
              filterText: className,
            });
          }
        }

        return { suggestions };
      },
    });
    disposables.push(disposable);
  }

  return disposables;
}

// ============================================================
// JSX Attribute Completion
// ============================================================

/** Common HTML/JSX attributes */
const JSX_ATTRIBUTES: { name: string; description: string; valueSnippet?: string }[] = [
  // Event handlers
  { name: 'onClick', description: 'Click event handler', valueSnippet: '{() => ${1:}}' },
  { name: 'onChange', description: 'Change event handler', valueSnippet: '{(e) => ${1:}}' },
  { name: 'onSubmit', description: 'Submit event handler', valueSnippet: '{(e) => { e.preventDefault(); ${1:} }}' },
  { name: 'onBlur', description: 'Blur event handler', valueSnippet: '{() => ${1:}}' },
  { name: 'onFocus', description: 'Focus event handler', valueSnippet: '{() => ${1:}}' },
  { name: 'onKeyDown', description: 'Key down event handler', valueSnippet: '{(e) => ${1:}}' },
  { name: 'onKeyUp', description: 'Key up event handler', valueSnippet: '{(e) => ${1:}}' },
  { name: 'onMouseEnter', description: 'Mouse enter event handler', valueSnippet: '{() => ${1:}}' },
  { name: 'onMouseLeave', description: 'Mouse leave event handler', valueSnippet: '{() => ${1:}}' },
  { name: 'onScroll', description: 'Scroll event handler', valueSnippet: '{(e) => ${1:}}' },
  { name: 'onInput', description: 'Input event handler', valueSnippet: '{(e) => ${1:}}' },
  { name: 'onDoubleClick', description: 'Double click event handler', valueSnippet: '{() => ${1:}}' },
  { name: 'onContextMenu', description: 'Context menu event handler', valueSnippet: '{(e) => { e.preventDefault(); ${1:} }}' },
  { name: 'onDragStart', description: 'Drag start event handler', valueSnippet: '{(e) => ${1:}}' },
  { name: 'onDragEnd', description: 'Drag end event handler', valueSnippet: '{(e) => ${1:}}' },
  { name: 'onDrop', description: 'Drop event handler', valueSnippet: '{(e) => ${1:}}' },
  { name: 'onDragOver', description: 'Drag over event handler', valueSnippet: '{(e) => { e.preventDefault(); ${1:} }}' },

  // Common attributes
  { name: 'className', description: 'CSS class name', valueSnippet: '"${1:}"' },
  { name: 'style', description: 'Inline styles', valueSnippet: '{{ ${1:} }}' },
  { name: 'id', description: 'Element ID', valueSnippet: '"${1:}"' },
  { name: 'ref', description: 'React ref', valueSnippet: '{${1:ref}}' },
  { name: 'key', description: 'React list key', valueSnippet: '{${1:id}}' },
  { name: 'children', description: 'Children prop', valueSnippet: '{${1:children}}' },
  { name: 'dangerouslySetInnerHTML', description: 'Set inner HTML', valueSnippet: '{{ __html: ${1:html} }}' },

  // Accessibility
  { name: 'role', description: 'ARIA role', valueSnippet: '"${1|button,link,dialog,alert,navigation,main,complementary,contentinfo,form,search,banner,menu,menuitem,tab,tabpanel,tablist,listbox,option,tree,treeitem,grid,gridcell,status,log,marquee,timer|}"' },
  { name: 'aria-label', description: 'Accessible label', valueSnippet: '"${1:}"' },
  { name: 'aria-labelledby', description: 'Labelled by element ID', valueSnippet: '"${1:}"' },
  { name: 'aria-describedby', description: 'Described by element ID', valueSnippet: '"${1:}"' },
  { name: 'aria-hidden', description: 'Hide from assistive tech', valueSnippet: '{${1|true,false|}}' },
  { name: 'aria-expanded', description: 'Expanded state', valueSnippet: '{${1:expanded}}' },
  { name: 'aria-selected', description: 'Selected state', valueSnippet: '{${1:selected}}' },
  { name: 'aria-disabled', description: 'Disabled state', valueSnippet: '{${1:disabled}}' },
  { name: 'tabIndex', description: 'Tab index', valueSnippet: '{${1|0,-1|}}}' },

  // Form
  { name: 'type', description: 'Input type', valueSnippet: '"${1|text,password,email,number,tel,url,search,date,time,datetime-local,month,week,color,file,checkbox,radio,range,hidden,submit,button,reset|}"' },
  { name: 'name', description: 'Form field name', valueSnippet: '"${1:}"' },
  { name: 'value', description: 'Input value', valueSnippet: '{${1:value}}' },
  { name: 'defaultValue', description: 'Default value', valueSnippet: '{${1:defaultValue}}' },
  { name: 'placeholder', description: 'Placeholder text', valueSnippet: '"${1:}"' },
  { name: 'disabled', description: 'Disabled state' },
  { name: 'required', description: 'Required field' },
  { name: 'readOnly', description: 'Read-only field' },
  { name: 'autoComplete', description: 'Auto-complete hint', valueSnippet: '"${1|off,on,name,email,username,new-password,current-password,one-time-code,tel,url,street-address,country|}"' },
  { name: 'autoFocus', description: 'Auto focus on mount' },
  { name: 'maxLength', description: 'Maximum length', valueSnippet: '{${1:100}}' },
  { name: 'minLength', description: 'Minimum length', valueSnippet: '{${1:0}}' },
  { name: 'pattern', description: 'Validation pattern', valueSnippet: '"${1:}"' },
  { name: 'checked', description: 'Checkbox/radio checked', valueSnippet: '{${1:checked}}' },
  { name: 'multiple', description: 'Allow multiple values' },

  // Media
  { name: 'src', description: 'Source URL', valueSnippet: '"${1:}"' },
  { name: 'alt', description: 'Alternative text', valueSnippet: '"${1:}"' },
  { name: 'width', description: 'Width', valueSnippet: '{${1:}}' },
  { name: 'height', description: 'Height', valueSnippet: '{${1:}}' },
  { name: 'loading', description: 'Loading strategy', valueSnippet: '"${1|lazy,eager|}"' },

  // Link
  { name: 'href', description: 'Link URL', valueSnippet: '"${1:}"' },
  { name: 'target', description: 'Link target', valueSnippet: '"${1|_blank,_self,_parent,_top|}"' },
  { name: 'rel', description: 'Link relationship', valueSnippet: '"${1|noopener noreferrer,nofollow,author,external|}"' },
  { name: 'download', description: 'Download attribute' },

  // Data attributes
  { name: 'data-testid', description: 'Test identifier', valueSnippet: '"${1:}"' },
  { name: 'data-state', description: 'State attribute', valueSnippet: '"${1|open,closed,active,inactive|}"' },
  { name: 'data-side', description: 'Side attribute', valueSnippet: '"${1|top,right,bottom,left|}"' },
  { name: 'data-align', description: 'Align attribute', valueSnippet: '"${1|start,center,end|}"' },

  // Miscellaneous
  { name: 'title', description: 'Tooltip text', valueSnippet: '"${1:}"' },
  { name: 'hidden', description: 'Hidden element' },
  { name: 'draggable', description: 'Draggable element', valueSnippet: '{${1|true,false|}}' },
  { name: 'contentEditable', description: 'Editable content', valueSnippet: '{${1|true,false|}}' },
  { name: 'suppressHydrationWarning', description: 'Suppress hydration warning' },
  { name: 'asChild', description: 'Render as child (Radix)' },
];

/**
 * Detect if cursor is in a position where JSX attributes can be typed
 */
function isInsideJSXTag(lineContent: string, column: number): boolean {
  const textBeforeCursor = lineContent.substring(0, column - 1);
  // Check if we're inside an opening JSX tag: <Component ... |
  // But NOT inside an attribute value
  const tagOpen = textBeforeCursor.lastIndexOf('<');
  const tagClose = textBeforeCursor.lastIndexOf('>');
  if (tagOpen <= tagClose) return false;

  // Check we're not inside a string value
  const afterTag = textBeforeCursor.substring(tagOpen);
  const doubleQuotes = (afterTag.match(/"/g) || []).length;
  const singleQuotes = (afterTag.match(/'/g) || []).length;
  const braces = (afterTag.match(/\{/g) || []).length - (afterTag.match(/\}/g) || []).length;
  if (doubleQuotes % 2 !== 0 || singleQuotes % 2 !== 0 || braces > 0) return false;

  return true;
}

/**
 * Register JSX attribute completion provider
 */
export function registerJSXAttributeCompletion(
  monaco: typeof Monaco,
  languages: string[] = ['typescript', 'typescriptreact', 'javascript', 'javascriptreact']
): Monaco.IDisposable[] {
  const disposables: Monaco.IDisposable[] = [];

  for (const lang of languages) {
    const disposable = monaco.languages.registerCompletionItemProvider(lang, {
      triggerCharacters: [' '],
      provideCompletionItems: (model, position) => {
        const lineContent = model.getLineContent(position.lineNumber);
        if (!isInsideJSXTag(lineContent, position.column)) {
          return { suggestions: [] };
        }

        const word = model.getWordUntilPosition(position);
        const range: Monaco.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions: Monaco.languages.CompletionItem[] = JSX_ATTRIBUTES.map((attr, idx) => ({
          label: attr.name,
          kind: attr.name.startsWith('on')
            ? monaco.languages.CompletionItemKind.Event
            : attr.name.startsWith('aria-') || attr.name === 'role'
            ? monaco.languages.CompletionItemKind.Property
            : monaco.languages.CompletionItemKind.Field,
          insertText: attr.valueSnippet
            ? `${attr.name}=${attr.valueSnippet}`
            : attr.name,
          insertTextRules: attr.valueSnippet
            ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
            : undefined,
          detail: attr.description,
          documentation: attr.description,
          range,
          sortText: String(idx).padStart(4, '0'),
        }));

        return { suggestions };
      },
    });
    disposables.push(disposable);
  }

  return disposables;
}

// ============================================================
// Register All Completion Providers
// ============================================================

/**
 * Register all custom completion providers for Monaco
 * Returns array of disposables for cleanup
 */
export function registerAllCompletionProviders(
  monaco: typeof Monaco,
  languages?: string[]
): Monaco.IDisposable[] {
  return [
    ...registerImportPathCompletion(monaco, languages),
    ...registerTailwindCompletion(monaco, languages),
    ...registerJSXAttributeCompletion(monaco, languages),
  ];
}

// Export for testing
export {
  NPM_PACKAGES,
  PROJECT_PATHS,
  SHADCN_COMPONENTS,
  TAILWIND_CLASSES,
  ALL_TAILWIND_CLASSES,
  JSX_ATTRIBUTES,
  isInsideImportPath,
  isInsideClassAttribute,
  isInsideJSXTag,
};
