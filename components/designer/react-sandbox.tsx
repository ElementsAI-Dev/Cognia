'use client';

/**
 * ReactSandbox - V0-style React sandbox with live preview
 * Uses Sandpack for browser-based code execution
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackConsole,
  useSandpack,
  useActiveCode,
  SandpackFileExplorer,
} from '@codesandbox/sandpack-react';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
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

// Common dependencies for React projects
const COMMON_DEPENDENCIES = {
  'lucide-react': 'latest',
  'clsx': 'latest',
  'tailwind-merge': 'latest',
  'class-variance-authority': 'latest',
  'framer-motion': 'latest',
  'react-icons': 'latest',
  '@radix-ui/react-slot': 'latest',
  '@radix-ui/react-dialog': 'latest',
  '@radix-ui/react-dropdown-menu': 'latest',
  '@radix-ui/react-tabs': 'latest',
  '@radix-ui/react-tooltip': 'latest',
  '@radix-ui/react-accordion': 'latest',
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
import { cn } from "./utils";

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
import { cn } from "./utils";

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
import { cn } from "./utils";

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
import { cn } from "./utils";

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

interface ReactSandboxProps {
  code?: string;
  onCodeChange?: (code: string) => void;
  className?: string;
  showFileExplorer?: boolean;
  showConsole?: boolean;
  readOnly?: boolean;
  onAIEdit?: (prompt: string, code: string) => Promise<string>;
}

export function ReactSandbox({
  code = DEFAULT_APP_CODE,
  onCodeChange,
  className,
  showFileExplorer = false,
  showConsole = false,
  readOnly = false,
  onAIEdit,
}: ReactSandboxProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [isConsoleOpen, setIsConsoleOpen] = useState(showConsole);
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState(showFileExplorer);

  // Build files object with components
  const files = useMemo(() => ({
    '/App.js': { code, active: true },
    '/utils.js': { code: UTILS_CODE, hidden: true },
    '/Button.js': { code: BUTTON_COMPONENT, hidden: true },
    '/Card.js': { code: CARD_COMPONENT, hidden: true },
    '/Input.js': { code: INPUT_COMPONENT, hidden: true },
    '/Badge.js': { code: BADGE_COMPONENT, hidden: true },
  }), [code]);

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
        template="react"
        theme={customTheme}
        files={files}
        customSetup={{
          dependencies: COMMON_DEPENDENCIES,
        }}
        options={{
          externalResources: [
            'https://cdn.tailwindcss.com',
          ],
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
        />

        {/* Main content */}
        <div className="flex-1 overflow-hidden">
          <SandpackLayout className="h-full !rounded-none !border-0">
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* File Explorer */}
              {isFileExplorerOpen && (
                <>
                  <ResizablePanel defaultSize={15} minSize={10} maxSize={25}>
                    <div className="h-full border-r overflow-auto">
                      <SandpackFileExplorer />
                    </div>
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                </>
              )}

              {/* Editor */}
              {(viewMode === 'editor' || viewMode === 'split') && (
                <>
                  <ResizablePanel defaultSize={viewMode === 'split' ? 50 : 100}>
                    <div className="h-full flex flex-col">
                      <SandpackCodeEditor
                        showTabs
                        showLineNumbers
                        showInlineErrors
                        wrapContent
                        closableTabs
                        readOnly={readOnly}
                        extensions={[autocompletion()]}
                        extensionsKeymap={[...completionKeymap]}
                        style={{ height: '100%' }}
                      />
                    </div>
                  </ResizablePanel>
                  {viewMode === 'split' && <ResizableHandle withHandle />}
                </>
              )}

              {/* Preview */}
              {(viewMode === 'preview' || viewMode === 'split') && (
                <ResizablePanel defaultSize={viewMode === 'split' ? 50 : 100}>
                  <div className="h-full flex flex-col">
                    <div className="flex-1 overflow-auto bg-muted/20 flex items-center justify-center">
                      <div
                        className={cn(
                          'bg-background transition-all duration-200 overflow-hidden',
                          viewport !== 'full' && 'border rounded-md shadow-sm'
                        )}
                        style={viewport !== 'full' ? viewportStyles : { width: '100%', height: '100%' }}
                      >
                        <SandpackPreview
                          showNavigator={false}
                          showRefreshButton={false}
                          showOpenInCodeSandbox={false}
                          style={{ height: '100%' }}
                        />
                      </div>
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
  onAIEdit?: (prompt: string, code: string) => Promise<string>;
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

        {/* Spacer */}
        <div className="flex-1" />

        {/* AI Edit */}
        {onAIEdit && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="default" size="sm" className="h-7 gap-1.5">
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
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleCopyCode}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Code
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleOpenInCodeSandbox}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in CodeSandbox
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}

// Code sync handler component
function CodeSyncHandler({ onCodeChange }: { onCodeChange: (code: string) => void }) {
  const { code } = useActiveCode();

  useEffect(() => {
    onCodeChange(code);
  }, [code, onCodeChange]);

  return null;
}

export default ReactSandbox;
