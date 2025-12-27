'use client';

/**
 * ReactSandbox - V0-style React sandbox with live preview
 * Uses Sandpack for browser-based code execution
 */

import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react';
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  SandpackConsole,
  useSandpack,
  useActiveCode,
} from '@codesandbox/sandpack-react';
import { MonacoSandpackEditor } from './monaco-sandpack-editor';
import { SandboxFileExplorer } from './sandbox-file-explorer';
import { ComponentLibrary } from './component-library';
import { PreviewLoading } from './preview-loading';
import {
  Monitor,
  Tablet,
  Smartphone,
  Maximize,
  Code2,
  Eye,
  Split,
  RefreshCw,
  Terminal,
  FolderTree,
  Copy,
  Download,
  Sparkles,
  ChevronDown,
  ExternalLink,
  Package,
  Plus,
  X,
  Check,
  Blocks,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  generateSandpackDependencies,
  detectPackagesFromCode,
  PACKAGE_PRESETS,
  type PackagePreset,
} from '@/lib/designer';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { cn } from '@/lib/utils';

// Default React template with Tailwind CSS - clean, minimal design
const DEFAULT_APP_CODE = `export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border shadow-sm p-6 max-w-md w-full">
        <h1 className="text-2xl font-semibold text-gray-900 mb-3">
          Hello, World!
        </h1>
        <p className="text-gray-600 mb-4 text-sm">
          Start editing to see your changes live.
        </p>
        <button className="w-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium py-2.5 px-4 rounded-md transition-colors">
          Get Started
        </button>
      </div>
    </div>
  );
}`;

// Sandpack custom theme matching our app
const customTheme = {
  colors: {
    surface1: 'hsl(var(--background))',
    surface2: 'hsl(var(--muted))',
    surface3: 'hsl(var(--accent))',
    clickable: 'hsl(var(--muted-foreground))',
    base: 'hsl(var(--foreground))',
    disabled: 'hsl(var(--muted-foreground))',
    hover: 'hsl(var(--accent))',
    accent: 'hsl(var(--primary))',
    error: 'hsl(var(--destructive))',
    errorSurface: 'hsl(var(--destructive) / 0.1)',
  },
  syntax: {
    plain: 'hsl(var(--foreground))',
    comment: { color: 'hsl(var(--muted-foreground))', fontStyle: 'italic' as const },
    keyword: '#c678dd',
    tag: '#e06c75',
    punctuation: 'hsl(var(--muted-foreground))',
    definition: '#61afef',
    property: '#d19a66',
    static: '#98c379',
    string: '#98c379',
  },
  font: {
    body: 'system-ui, -apple-system, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
    size: '13px',
    lineHeight: '1.6',
  },
};

// Common dependencies for React projects - pinned to stable versions for reliability
const COMMON_DEPENDENCIES = {
  'lucide-react': '^0.462.0',
  'clsx': '^2.1.1',
  'tailwind-merge': '^2.5.5',
  'class-variance-authority': '^0.7.1',
  'framer-motion': '^11.15.0',
  'react-icons': '^5.4.0',
  '@radix-ui/react-slot': '^1.1.1',
  '@radix-ui/react-dialog': '^1.1.4',
  '@radix-ui/react-dropdown-menu': '^2.1.4',
  '@radix-ui/react-tabs': '^1.1.2',
  '@radix-ui/react-tooltip': '^1.1.6',
  '@radix-ui/react-accordion': '^1.2.2',
};

// Utility functions for cn (classnames)
const UTILS_CODE = `import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}`;

// Basic Button component
const BUTTON_COMPONENT = `import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../lib/utils";

const buttonVariants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  link: "text-primary underline-offset-4 hover:underline",
};

const buttonSizes = {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-md px-3",
  lg: "h-11 rounded-md px-8",
  icon: "h-10 w-10",
};

export const Button = React.forwardRef(({ 
  className, 
  variant = "default", 
  size = "default", 
  asChild = false, 
  ...props 
}, ref) => {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = "Button";`;

// Card component
const CARD_COMPONENT = `import * as React from "react";
import { cn } from "../lib/utils";

export const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}
    {...props}
  />
));
Card.displayName = "Card";

export const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
));
CardFooter.displayName = "CardFooter";`;

// Input component
const INPUT_COMPONENT = `import * as React from "react";
import { cn } from "../lib/utils";

export const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";`;

// Badge component
const BADGE_COMPONENT = `import * as React from "react";
import { cn } from "../lib/utils";

const badgeVariants = {
  default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
  secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
  destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
  outline: "text-foreground",
};

export function Badge({ className, variant = "default", ...props }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}`;

type ViewMode = 'editor' | 'preview' | 'split';
type ViewportSize = 'mobile' | 'tablet' | 'desktop' | 'full';
type FrameworkType = 'react' | 'vue' | 'html';

// Vue default template
const DEFAULT_VUE_CODE = `<script setup>
import { ref } from 'vue'
const message = ref('Hello Vue!')
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg border shadow-sm p-6 max-w-md w-full">
      <h1 class="text-2xl font-semibold text-gray-900 mb-3">{{ message }}</h1>
      <p class="text-gray-600 mb-4 text-sm">Start editing to see your changes live.</p>
      <button class="w-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium py-2.5 px-4 rounded-md transition-colors">
        Get Started
      </button>
    </div>
  </div>
</template>`;

interface ReactSandboxProps {
  code?: string;
  onCodeChange?: (code: string) => void;
  className?: string;
  showFileExplorer?: boolean;
  showConsole?: boolean;
  readOnly?: boolean;
  onAIEdit?: () => void;
  framework?: FrameworkType;
  initialFiles?: Record<string, string>;
  initialDependencies?: Record<string, string>;
  onFilesChange?: (files: Record<string, string>) => void;
  onDependenciesChange?: (deps: Record<string, string>) => void;
}

export function ReactSandbox({
  code,
  onCodeChange,
  className,
  showFileExplorer = false,
  showConsole = false,
  readOnly = false,
  onAIEdit,
  framework = 'react',
  initialFiles,
  initialDependencies,
  onFilesChange,
  onDependenciesChange,
}: ReactSandboxProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [isConsoleOpen, setIsConsoleOpen] = useState(showConsole);
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState(showFileExplorer);
  const [isComponentLibraryOpen, setIsComponentLibraryOpen] = useState(false);
  
  // Dependency management state
  const [customDependencies, setCustomDependencies] = useState<Record<string, string>>(
    initialDependencies || {}
  );
  const [showDepsDialog, setShowDepsDialog] = useState(false);
  const [newDepName, setNewDepName] = useState('');
  const [newDepVersion, setNewDepVersion] = useState('latest');

  // Get default code based on framework
  const defaultCode = framework === 'vue' ? DEFAULT_VUE_CODE : DEFAULT_APP_CODE;
  const actualCode = code ?? defaultCode;

  // Build files object based on framework - all files visible for multi-file editing
  const vueFiles = useMemo(() => ({
    '/src/App.vue': { code: actualCode, active: true },
    '/src/components/Button.vue': { 
      code: `<template>
  <button
    :class="[
      'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      'disabled:pointer-events-none disabled:opacity-50',
      variantClasses[variant],
      sizeClasses[size]
    ]"
    v-bind="$attrs"
  >
    <slot />
  </button>
</template>

<script setup>
defineProps({
  variant: { type: String, default: 'default' },
  size: { type: String, default: 'default' }
})

const variantClasses = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  outline: 'border border-input bg-background hover:bg-accent',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
}

const sizeClasses = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 rounded-md px-3',
  lg: 'h-11 rounded-md px-8',
}
</script>`,
    },
  }), [actualCode]);

  const reactFiles = useMemo(() => ({
    '/App.js': { code: actualCode, active: true },
    '/components/Button.js': { code: BUTTON_COMPONENT },
    '/components/Card.js': { code: CARD_COMPONENT },
    '/components/Input.js': { code: INPUT_COMPONENT },
    '/components/Badge.js': { code: BADGE_COMPONENT },
    '/lib/utils.js': { code: UTILS_CODE },
    '/styles.css': {
      code: `/* CSS Variables for theme support */
:root {
  --background: 0 0% 100%;
  --foreground: 224 71.4% 4.1%;
  --card: 0 0% 100%;
  --card-foreground: 224 71.4% 4.1%;
  --popover: 0 0% 100%;
  --popover-foreground: 224 71.4% 4.1%;
  --primary: 220.9 39.3% 11%;
  --primary-foreground: 210 20% 98%;
  --secondary: 220 14.3% 95.9%;
  --secondary-foreground: 220.9 39.3% 11%;
  --muted: 220 14.3% 95.9%;
  --muted-foreground: 220 8.9% 46.1%;
  --accent: 220 14.3% 95.9%;
  --accent-foreground: 220.9 39.3% 11%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 20% 98%;
  --border: 220 13% 91%;
  --input: 220 13% 91%;
  --ring: 224 71.4% 4.1%;
  --radius: 0.5rem;
}

.dark {
  --background: 224 71.4% 4.1%;
  --foreground: 210 20% 98%;
  --card: 224 71.4% 4.1%;
  --card-foreground: 210 20% 98%;
  --primary: 210 20% 98%;
  --primary-foreground: 220.9 39.3% 11%;
  --secondary: 215 27.9% 16.9%;
  --secondary-foreground: 210 20% 98%;
  --muted: 215 27.9% 16.9%;
  --muted-foreground: 217.9 10.6% 64.9%;
  --accent: 215 27.9% 16.9%;
  --accent-foreground: 210 20% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 20% 98%;
  --border: 215 27.9% 16.9%;
  --input: 215 27.9% 16.9%;
  --ring: 216 12.2% 83.9%;
}

* {
  border-color: hsl(var(--border));
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}

/* Component layer */
@layer components {
  .card {
    @apply rounded-lg border bg-card text-card-foreground shadow-sm;
  }

  .btn-primary {
    @apply bg-primary text-primary-foreground hover:bg-primary/90;
  }

  .btn-secondary {
    @apply bg-secondary text-secondary-foreground hover:bg-secondary/80;
  }

  .btn-outline {
    @apply border border-input bg-background hover:bg-accent hover:text-accent-foreground;
  }
}`,
    },
  }), [actualCode]);

  // Get template based on framework
  const sandpackTemplate = framework === 'vue' ? 'vue' : 'react';
  
  // Merge initial files with framework files
  const baseFiles = framework === 'vue' ? vueFiles : reactFiles;
  const files = useMemo(() => {
    if (!initialFiles) return baseFiles;
    const merged: Record<string, { code: string; active?: boolean }> = { ...baseFiles };
    for (const [path, content] of Object.entries(initialFiles)) {
      merged[path] = { code: content };
    }
    return merged;
  }, [baseFiles, initialFiles]);

  // Merge dependencies
  const allDependencies = useMemo(() => ({
    ...COMMON_DEPENDENCIES,
    ...customDependencies,
  }), [customDependencies]);

  // Handle dependency add
  const handleAddDependency = useCallback(() => {
    if (!newDepName.trim()) return;
    const newDeps = { ...customDependencies, [newDepName.trim()]: newDepVersion };
    setCustomDependencies(newDeps);
    onDependenciesChange?.(newDeps);
    setNewDepName('');
    setNewDepVersion('latest');
  }, [newDepName, newDepVersion, customDependencies, onDependenciesChange]);

  // Handle dependency remove
  const handleRemoveDependency = useCallback((name: string) => {
    const newDeps = { ...customDependencies };
    delete newDeps[name];
    setCustomDependencies(newDeps);
    onDependenciesChange?.(newDeps);
  }, [customDependencies, onDependenciesChange]);

  // Handle preset selection
  const handleSelectPreset = useCallback((preset: PackagePreset) => {
    const presetDeps = generateSandpackDependencies(PACKAGE_PRESETS[preset] as unknown as string[]);
    const newDeps = { ...customDependencies, ...presetDeps };
    setCustomDependencies(newDeps);
    onDependenciesChange?.(newDeps);
  }, [customDependencies, onDependenciesChange]);

  // Auto-detect dependencies from code
  const handleAutoDetect = useCallback(() => {
    const detected = detectPackagesFromCode(actualCode);
    const detectedDeps = generateSandpackDependencies(detected);
    const newDeps = { ...customDependencies, ...detectedDeps };
    setCustomDependencies(newDeps);
    onDependenciesChange?.(newDeps);
  }, [actualCode, customDependencies, onDependenciesChange]);

  // Note: onFilesChange is passed to SandboxFileExplorer for handling file changes
  // It will be called when files are created, deleted, or renamed

  const viewportStyles = useMemo(() => {
    switch (viewport) {
      case 'mobile':
        return { width: '375px', height: '667px' };
      case 'tablet':
        return { width: '768px', height: '1024px' };
      case 'desktop':
        return { width: '1280px', height: '800px' };
      default:
        return { width: '100%', height: '100%' };
    }
  }, [viewport]);

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      <SandpackProvider
        template={sandpackTemplate}
        theme={customTheme}
        files={files}
        customSetup={{
          dependencies: allDependencies,
        }}
        options={{
          externalResources: [
            'https://cdn.tailwindcss.com',
          ],
          // Inject Tailwind config via script
          initMode: 'immediate',
          classes: {
            'sp-wrapper': 'h-full',
            'sp-layout': 'h-full',
          },
        }}
      >
        {/* Toolbar */}
        <SandboxToolbar
          viewMode={viewMode}
          setViewMode={setViewMode}
          viewport={viewport}
          setViewport={setViewport}
          isConsoleOpen={isConsoleOpen}
          setIsConsoleOpen={setIsConsoleOpen}
          isFileExplorerOpen={isFileExplorerOpen}
          setIsFileExplorerOpen={setIsFileExplorerOpen}
          onCodeChange={onCodeChange}
          onAIEdit={onAIEdit}
          onShowDeps={() => setShowDepsDialog(true)}
          onAutoDetect={handleAutoDetect}
          customDependencies={customDependencies}
          isComponentLibraryOpen={isComponentLibraryOpen}
          setIsComponentLibraryOpen={setIsComponentLibraryOpen}
        />

        {/* Main content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <SandpackLayout className="h-full rounded-none border-0">
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* File Explorer */}
              {isFileExplorerOpen && (
                <>
                  <ResizablePanel defaultSize={15} minSize={10} maxSize={25}>
                    <div className="h-full border-r overflow-hidden">
                      <SandboxFileExplorer
                        onFileCreate={(path) => {
                          const newFiles: Record<string, string> = {};
                          newFiles[path] = '';
                          onFilesChange?.(newFiles);
                        }}
                        onFileDelete={(path) => {
                          onFilesChange?.({ [path]: '' });
                        }}
                        onFileRename={(oldPath, newPath) => {
                          onFilesChange?.({ [oldPath]: '', [newPath]: '' });
                        }}
                      />
                    </div>
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                </>
              )}

              {/* Editor with Monaco + Minimap */}
              {(viewMode === 'editor' || viewMode === 'split') && (
                <>
                  <ResizablePanel defaultSize={viewMode === 'split' ? 50 : 100}>
                    <div className="h-full min-h-0">
                      <MonacoSandpackEditor readOnly={readOnly} />
                    </div>
                  </ResizablePanel>
                  {viewMode === 'split' && <ResizableHandle withHandle />}
                </>
              )}

              {/* Component Library Panel */}
              {isComponentLibraryOpen && (
                <>
                  <ResizablePanel defaultSize={18} minSize={15} maxSize={30}>
                    <div className="h-full border-l overflow-hidden">
                      <ComponentLibrary />
                    </div>
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                </>
              )}

              {/* Preview */}
              {(viewMode === 'preview' || viewMode === 'split') && (
                <ResizablePanel defaultSize={viewMode === 'split' ? 50 : 100}>
                  <div className="h-full flex flex-col">
                    <div className="flex-1 overflow-auto bg-muted/20 flex items-center justify-center">
                      <PreviewWithLoading
                        viewport={viewport}
                        viewportStyles={viewportStyles}
                      />
                    </div>

                    {/* Console */}
                    {isConsoleOpen && (
                      <div className="h-48 border-t">
                        <SandpackConsole
                          showHeader
                          showResetConsoleButton
                          style={{ height: '100%' }}
                        />
                      </div>
                    )}
                  </div>
                </ResizablePanel>
              )}
            </ResizablePanelGroup>
          </SandpackLayout>
        </div>

        {/* Code sync handler */}
        {onCodeChange && <CodeSyncHandler onCodeChange={onCodeChange} />}
      </SandpackProvider>

      {/* Dependencies Dialog */}
      <Dialog open={showDepsDialog} onOpenChange={setShowDepsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Manage Dependencies
            </DialogTitle>
            <DialogDescription>
              Add npm packages to your project. They will be loaded via CDN.
            </DialogDescription>
          </DialogHeader>

          {/* Add new dependency */}
          <div className="flex gap-2">
            <Input
              value={newDepName}
              onChange={(e) => setNewDepName(e.target.value)}
              placeholder="Package name (e.g., axios)"
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleAddDependency()}
            />
            <Input
              value={newDepVersion}
              onChange={(e) => setNewDepVersion(e.target.value)}
              placeholder="Version"
              className="w-24"
            />
            <Button onClick={handleAddDependency} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Quick Presets</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PACKAGE_PRESETS) as PackagePreset[]).map((preset) => (
                <Badge
                  key={preset}
                  variant="outline"
                  className="cursor-pointer hover:bg-secondary"
                  onClick={() => handleSelectPreset(preset)}
                >
                  {preset}
                </Badge>
              ))}
            </div>
          </div>

          {/* Current dependencies */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Custom Dependencies</p>
            <ScrollArea className="h-40">
              {Object.keys(customDependencies).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No custom dependencies added
                </p>
              ) : (
                <div className="space-y-1">
                  {Object.entries(customDependencies).map(([name, version]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between px-2 py-1 rounded hover:bg-muted"
                    >
                      <span className="text-sm font-mono">
                        {name}@{version}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveDependency(name)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleAutoDetect}>
              Auto-detect from code
            </Button>
            <Button onClick={() => setShowDepsDialog(false)}>
              <Check className="h-4 w-4 mr-2" />
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Toolbar component
interface SandboxToolbarProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  viewport: ViewportSize;
  setViewport: (size: ViewportSize) => void;
  isConsoleOpen: boolean;
  setIsConsoleOpen: (open: boolean) => void;
  isFileExplorerOpen: boolean;
  setIsFileExplorerOpen: (open: boolean) => void;
  onCodeChange?: (code: string) => void;
  onAIEdit?: () => void;
  onShowDeps?: () => void;
  onAutoDetect?: () => void;
  customDependencies?: Record<string, string>;
  isComponentLibraryOpen?: boolean;
  setIsComponentLibraryOpen?: (open: boolean) => void;
}

function SandboxToolbar({
  viewMode,
  setViewMode,
  viewport,
  setViewport,
  isConsoleOpen,
  setIsConsoleOpen,
  isFileExplorerOpen,
  setIsFileExplorerOpen,
  onAIEdit,
  onShowDeps,
  customDependencies = {},
  isComponentLibraryOpen = false,
  setIsComponentLibraryOpen,
}: SandboxToolbarProps) {
  const { sandpack } = useSandpack();
  const { code } = useActiveCode();

  const handleRefresh = useCallback(() => {
    sandpack.runSandpack();
  }, [sandpack]);

  const handleCopyCode = useCallback(async () => {
    await navigator.clipboard.writeText(code);
  }, [code]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'App.jsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [code]);

  const handleOpenInCodeSandbox = useCallback(() => {
    // Create CodeSandbox URL
    const parameters = {
      files: {
        'App.js': { content: code },
        'index.js': {
          content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`,
        },
        'package.json': {
          content: JSON.stringify({
            dependencies: {
              react: '^18.0.0',
              'react-dom': '^18.0.0',
              ...COMMON_DEPENDENCIES,
            },
          }),
        },
      },
    };

    const encoded = btoa(JSON.stringify(parameters));
    window.open(`https://codesandbox.io/api/v1/sandboxes/define?parameters=${encoded}`, '_blank');
  }, [code]);

  // Download as project ZIP file
  const handleDownloadProject = useCallback(async () => {
    // Create a simple project structure
    const files = sandpack.files;
    const projectFiles: Record<string, string> = {};
    
    // Add all sandbox files
    for (const [path, file] of Object.entries(files)) {
      projectFiles[path.replace(/^\//, '')] = file.code;
    }
    
    // Add package.json if not present
    if (!projectFiles['package.json']) {
      projectFiles['package.json'] = JSON.stringify({
        name: 'sandbox-project',
        version: '1.0.0',
        dependencies: {
          react: '^18.0.0',
          'react-dom': '^18.0.0',
          ...COMMON_DEPENDENCIES,
        },
        scripts: {
          start: 'react-scripts start',
          build: 'react-scripts build',
        },
      }, null, 2);
    }
    
    // Create a simple blob with file list (real ZIP would need a library)
    const fileList = Object.entries(projectFiles)
      .map(([name, content]) => `// ${name}\n${content}`)
      .join('\n\n// ---\n\n');
    
    const blob = new Blob([fileList], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project-files.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [sandpack.files]);

  // Open in StackBlitz
  const handleOpenInStackBlitz = useCallback(() => {
    const projectFiles: Record<string, string> = {};
    
    // Add main app code
    projectFiles['src/App.jsx'] = code;
    projectFiles['src/index.jsx'] = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
    projectFiles['src/index.css'] = `@tailwind base;
@tailwind components;
@tailwind utilities;`;
    projectFiles['index.html'] = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sandbox Project</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.jsx"></script>
  </body>
</html>`;
    projectFiles['package.json'] = JSON.stringify({
      name: 'sandbox-project',
      version: '0.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
      },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        ...COMMON_DEPENDENCIES,
      },
      devDependencies: {
        vite: '^5.0.0',
        '@vitejs/plugin-react': '^4.0.0',
      },
    }, null, 2);
    projectFiles['vite.config.js'] = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});`;

    // Encode for StackBlitz
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://stackblitz.com/run';
    form.target = '_blank';

    // Add project files
    for (const [filename, content] of Object.entries(projectFiles)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = `project[files][${filename}]`;
      input.value = content;
      form.appendChild(input);
    }

    // Add project settings
    const titleInput = document.createElement('input');
    titleInput.type = 'hidden';
    titleInput.name = 'project[title]';
    titleInput.value = 'Sandbox Project';
    form.appendChild(titleInput);

    const templateInput = document.createElement('input');
    templateInput.type = 'hidden';
    templateInput.name = 'project[template]';
    templateInput.value = 'node';
    form.appendChild(templateInput);

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  }, [code]);

  const viewModeButtons = [
    { value: 'editor' as ViewMode, icon: <Code2 className="h-4 w-4" />, label: 'Code' },
    { value: 'split' as ViewMode, icon: <Split className="h-4 w-4" />, label: 'Split' },
    { value: 'preview' as ViewMode, icon: <Eye className="h-4 w-4" />, label: 'Preview' },
  ];

  const viewportButtons = [
    { value: 'mobile' as ViewportSize, icon: <Smartphone className="h-4 w-4" />, label: 'Mobile' },
    { value: 'tablet' as ViewportSize, icon: <Tablet className="h-4 w-4" />, label: 'Tablet' },
    { value: 'desktop' as ViewportSize, icon: <Monitor className="h-4 w-4" />, label: 'Desktop' },
    { value: 'full' as ViewportSize, icon: <Maximize className="h-4 w-4" />, label: 'Full' },
  ];

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 border-b bg-background px-2 py-1.5">
        {/* View mode */}
        <ButtonGroup className="border rounded-md p-0.5">
          {viewModeButtons.map((btn) => (
            <Tooltip key={btn.value}>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === btn.value ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2.5"
                  onClick={() => setViewMode(btn.value)}
                >
                  {btn.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{btn.label}</TooltipContent>
            </Tooltip>
          ))}
        </ButtonGroup>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Viewport */}
        <div className="flex items-center gap-0.5">
          {viewportButtons.map((btn) => (
            <Tooltip key={btn.value}>
              <TooltipTrigger asChild>
                <Button
                  variant={viewport === btn.value ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewport(btn.value)}
                >
                  {btn.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{btn.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Actions */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh Preview</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isFileExplorerOpen ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsFileExplorerOpen(!isFileExplorerOpen)}
            >
              <FolderTree className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>File Explorer</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isConsoleOpen ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsConsoleOpen(!isConsoleOpen)}
            >
              <Terminal className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Console</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isComponentLibraryOpen ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsComponentLibraryOpen?.(!isComponentLibraryOpen)}
            >
              <Blocks className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Component Library</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Dependencies */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5"
              onClick={onShowDeps}
            >
              <Package className="h-4 w-4" />
              <span className="text-xs">Deps</span>
              {Object.keys(customDependencies).length > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {Object.keys(customDependencies).length}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Manage Dependencies</TooltipContent>
        </Tooltip>

        {/* Spacer */}
        <div className="flex-1" />

        {/* AI Edit */}
        {onAIEdit && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="default" size="sm" className="h-7 gap-1.5" onClick={onAIEdit}>
                <Sparkles className="h-3.5 w-3.5" />
                <span className="text-xs">AI Edit</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit with AI</TooltipContent>
          </Tooltip>
        )}

        {/* More actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1">
              <span className="text-xs">More</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleCopyCode}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Code
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download File
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownloadProject}>
              <Download className="h-4 w-4 mr-2" />
              Download Project (ZIP)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleOpenInCodeSandbox}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in CodeSandbox
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleOpenInStackBlitz}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in StackBlitz
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}

// Preview wrapper with loading states
interface PreviewWithLoadingProps {
  viewport: ViewportSize;
  viewportStyles: React.CSSProperties;
}

function PreviewWithLoading({ viewport, viewportStyles }: PreviewWithLoadingProps) {
  const { sandpack } = useSandpack();
  const [isReady, setIsReady] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);

  // Map Sandpack status to our loading status
  const getLoadingStatus = () => {
    switch (sandpack.status) {
      case 'initial':
      case 'idle':
        return 'loading';
      case 'running':
        return isReady ? 'ready' : 'bundling';
      default:
        return 'loading';
    }
  };

  const status = getLoadingStatus();

  // Track when preview becomes ready
  useEffect(() => {
    if (sandpack.status === 'running') {
      // Give the preview a moment to render
      const timer = setTimeout(() => {
        setIsReady(true);
        setShowSkeleton(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // Use startTransition to avoid synchronous setState warnings
      startTransition(() => {
        setIsReady(false);
        setShowSkeleton(true);
      });
    }
  }, [sandpack.status]);

  return (
    <div
      className={cn(
        'bg-background transition-all duration-200 overflow-hidden relative',
        viewport !== 'full' && 'border rounded-md shadow-sm'
      )}
      style={viewport !== 'full' ? viewportStyles : { width: '100%', height: '100%' }}
    >
      {/* Loading overlay */}
      {showSkeleton && (
        <div className="absolute inset-0 z-10">
          <PreviewLoading variant="skeleton" status={status} />
        </div>
      )}

      {/* Actual preview - always rendered but hidden during loading */}
      <div className={cn('h-full transition-opacity duration-300', showSkeleton ? 'opacity-0' : 'opacity-100')}>
        <SandpackPreview
          showNavigator={false}
          showRefreshButton={false}
          showOpenInCodeSandbox={false}
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
}

// Code sync handler component with debouncing for better hot reload performance
function CodeSyncHandler({ onCodeChange }: { onCodeChange: (code: string) => void }) {
  const { code } = useActiveCode();
  const lastCodeRef = useRef<string>(code);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced code change handler to prevent excessive updates
  useEffect(() => {
    // Skip if code hasn't actually changed
    if (lastCodeRef.current === code) {
      return;
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce the callback (300ms delay for smoother hot reload)
    debounceTimerRef.current = setTimeout(() => {
      lastCodeRef.current = code;
      onCodeChange(code);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [code, onCodeChange]);

  // Force immediate sync on unmount - intentionally empty deps as cleanup-only effect
  useEffect(() => {
    return () => {
      if (lastCodeRef.current !== code) {
        onCodeChange(code);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default ReactSandbox;
