'use client';

/**
 * ReactSandbox - Sandpack-based React sandbox for live preview
 * Provides isolated React runtime for code execution
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  SandpackCodeEditor,
  SandpackConsole,
  useSandpack,
} from '@codesandbox/sandpack-react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDesignerStore } from '@/stores/designer';
import { useSettingsStore } from '@/stores';
import type { FrameworkType } from '@/lib/designer';
import { SandboxErrorBoundary, useErrorBoundaryReset, useConsoleErrorInterceptor } from './sandbox-error-boundary';
import { SandboxFileExplorer } from './sandbox-file-explorer';

export type { FrameworkType };

export interface ReactSandboxProps {
  className?: string;
  showEditor?: boolean;
  showPreview?: boolean;
  code?: string;
  onCodeChange?: (code: string) => void;
  showFileExplorer?: boolean;
  showConsole?: boolean;
  framework?: FrameworkType;
  onAIEdit?: () => void;
}

// Default templates per framework
const DEFAULT_APP_CODE = `export default function App() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Hello World</h1>
      <p className="text-gray-600 mt-2">Start editing to see changes.</p>
    </div>
  );
}`;

const DEFAULT_VUE_CODE = `<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold">Hello World</h1>
    <p class="text-gray-600 mt-2">Start editing to see changes.</p>
  </div>
</template>

<script setup>
</script>`;

const DEFAULT_HTML_CODE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"><\/script>
</head>
<body>
  <div class="p-4">
    <h1 class="text-2xl font-bold">Hello World</h1>
    <p class="text-gray-600 mt-2">Start editing to see changes.</p>
  </div>
</body>
</html>`;

// Tailwind CSS setup
const TAILWIND_CONFIG = `module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
}`;

const INDEX_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;

// Map framework to Sandpack template and main file path
function getFrameworkConfig(framework: FrameworkType) {
  switch (framework) {
    case 'vue':
      return { template: 'vue' as const, mainFile: '/src/App.vue', defaultCode: DEFAULT_VUE_CODE };
    case 'html':
      return { template: 'vanilla' as const, mainFile: '/index.html', defaultCode: DEFAULT_HTML_CODE };
    case 'react':
    default:
      return { template: 'react-ts' as const, mainFile: '/App.tsx', defaultCode: DEFAULT_APP_CODE };
  }
}

// Internal component to sync code with store
function SandboxSync({ onCodeChange, framework = 'react' }: { onCodeChange?: (code: string) => void; framework?: FrameworkType }) {
  const { sandpack } = useSandpack();
  const setCode = useDesignerStore((state) => state.setCode);
  const lastCodeRef = useRef<string | null>(null);
  const { mainFile } = getFrameworkConfig(framework);

  // Sync changes to store
  const handleChange = useCallback(() => {
    const files = sandpack.files;
    const appFile = files[mainFile] || files['/App.tsx'] || files['/App.jsx'];
    if (appFile && appFile.code !== lastCodeRef.current) {
      lastCodeRef.current = appFile.code;
      setCode(appFile.code, false);
      onCodeChange?.(appFile.code);
    }
  }, [sandpack.files, setCode, onCodeChange, mainFile]);

  // Listen for file changes
  useEffect(() => {
    handleChange();
  }, [handleChange]);

  return null;
}

export function ReactSandbox({
  className,
  showEditor = true,
  showPreview = true,
  code: propCode,
  onCodeChange,
  showFileExplorer = false,
  showConsole = false,
  framework = 'react',
  onAIEdit,
}: ReactSandboxProps) {
  const storeCode = useDesignerStore((state) => state.code);
  const addPreviewError = useDesignerStore((state) => state.addPreviewError);
  const code = propCode ?? storeCode;
  const theme = useSettingsStore((state) => state.theme);
  const { resetKey, reset } = useErrorBoundaryReset();
  const { errors: interceptedErrors } = useConsoleErrorInterceptor();

  // Forward intercepted console errors to designer store
  const lastErrorCountRef = useRef(0);
  useEffect(() => {
    if (interceptedErrors.length > lastErrorCountRef.current) {
      const newErrors = interceptedErrors.slice(lastErrorCountRef.current);
      for (const err of newErrors) {
        addPreviewError(err);
      }
    }
    lastErrorCountRef.current = interceptedErrors.length;
  }, [interceptedErrors, addPreviewError]);

  const fwConfig = getFrameworkConfig(framework);

  // Build files object for Sandpack based on framework
  const files = useMemo(() => {
    if (framework === 'vue') {
      return {
        '/src/App.vue': {
          code: code || fwConfig.defaultCode,
          active: true,
        },
      };
    }
    if (framework === 'html') {
      return {
        '/index.html': {
          code: code || fwConfig.defaultCode,
          active: true,
        },
      };
    }
    // React (default)
    return {
      '/App.tsx': {
        code: code || fwConfig.defaultCode,
        active: true,
      },
      '/index.css': {
        code: INDEX_CSS,
      },
      '/tailwind.config.js': {
        code: TAILWIND_CONFIG,
        hidden: true,
      },
    };
  }, [code, framework, fwConfig.defaultCode]);

  // Dependencies vary by framework
  const customSetup = useMemo(() => {
    if (framework === 'react') {
      return {
        dependencies: {
          'tailwindcss': 'latest',
          'autoprefixer': 'latest',
          'postcss': 'latest',
        },
      };
    }
    return undefined;
  }, [framework]);

  return (
    <div className={cn('h-full flex flex-col min-h-0 relative', className)}>
      <SandboxErrorBoundary key={resetKey} onReset={reset} className="h-full flex-1 min-h-0">
        <SandpackProvider
          template={fwConfig.template}
          theme={theme === 'dark' ? 'dark' : 'light'}
          files={files}
          customSetup={customSetup}
          options={{
            externalResources: framework === 'react' ? ['https://cdn.tailwindcss.com'] : [],
            recompileMode: 'delayed',
            recompileDelay: 300,
          }}
        >
          <SandboxSync onCodeChange={onCodeChange} framework={framework} />
          <SandpackLayout className="h-full flex-1 min-h-0">
            <SandboxContent
              showEditor={showEditor}
              showPreview={showPreview}
              showFileExplorer={showFileExplorer}
              showConsole={showConsole}
            />
          </SandpackLayout>
        </SandpackProvider>
      </SandboxErrorBoundary>

      {/* Floating AI edit button */}
      {onAIEdit && (
        <Button
          variant="secondary"
          size="sm"
          className="absolute bottom-3 right-3 z-10 gap-1.5 shadow-md"
          onClick={onAIEdit}
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI Edit
        </Button>
      )}
    </div>
  );
}

interface SandboxContentProps {
  showEditor: boolean;
  showPreview: boolean;
  showFileExplorer: boolean;
  showConsole: boolean;
}

function SandboxContent({
  showEditor,
  showPreview,
  showFileExplorer,
  showConsole,
}: SandboxContentProps) {
  const { sandpack } = useSandpack();

  const handleFileSelect = useCallback(
    (path: string) => {
      sandpack.openFile(path);
    },
    [sandpack]
  );

  const handleFileCreate = useCallback(
    (path: string) => {
      sandpack.addFile(path, '', true);
      sandpack.openFile(path);
    },
    [sandpack]
  );

  const handleFileDelete = useCallback(
    (path: string) => {
      sandpack.deleteFile(path, true);
    },
    [sandpack]
  );

  return (
    <div className="flex h-full w-full min-h-0">
      {showFileExplorer && (
        <div className="w-56 border-r bg-muted/10">
          <SandboxFileExplorer
            files={sandpack.files}
            activeFile={sandpack.activeFile}
            onFileSelect={handleFileSelect}
            onFileCreate={handleFileCreate}
            onFileDelete={handleFileDelete}
          />
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        {showEditor && (
          <div className="flex min-h-0 flex-1 flex-col">
            <SandpackCodeEditor
              showTabs={false}
              showLineNumbers
              showInlineErrors
              wrapContent
              style={{ height: '100%' }}
            />
          </div>
        )}
        {showPreview && (
          <SandpackPreview
            showNavigator={false}
            showRefreshButton
            className={cn(showEditor ? 'border-l' : '')}
            style={{ height: '100%' }}
          />
        )}
        {showConsole && (
          <SandpackConsole className={cn('border-l', showEditor || showPreview ? 'w-64' : 'flex-1')} />
        )}
      </div>
    </div>
  );
}

export default ReactSandbox;
