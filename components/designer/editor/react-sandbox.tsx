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
import { cn } from '@/lib/utils';
import { useDesignerStore } from '@/stores/designer';
import { useSettingsStore } from '@/stores';
import type { FrameworkType } from '@/lib/designer';
import { SandboxErrorBoundary, useErrorBoundaryReset } from './sandbox-error-boundary';
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

// Default App.tsx template
const DEFAULT_APP_CODE = `export default function App() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Hello World</h1>
      <p className="text-gray-600 mt-2">Start editing to see changes.</p>
    </div>
  );
}`;

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

// Internal component to sync code with store
function SandboxSync({ onCodeChange }: { onCodeChange?: (code: string) => void }) {
  const { sandpack } = useSandpack();
  const setCode = useDesignerStore((state) => state.setCode);
  const lastCodeRef = useRef<string | null>(null);

  // Sync changes to store
  const handleChange = useCallback(() => {
    const files = sandpack.files;
    const appFile = files['/App.tsx'] || files['/App.jsx'];
    if (appFile && appFile.code !== lastCodeRef.current) {
      lastCodeRef.current = appFile.code;
      setCode(appFile.code, false);
      onCodeChange?.(appFile.code);
    }
  }, [sandpack.files, setCode, onCodeChange]);

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
  framework: _framework,
  onAIEdit: _onAIEdit,
}: ReactSandboxProps) {
  const storeCode = useDesignerStore((state) => state.code);
  const code = propCode ?? storeCode;
  const theme = useSettingsStore((state) => state.theme);
  const { resetKey, reset } = useErrorBoundaryReset();

  // Build files object for Sandpack
  const files = useMemo(() => ({
    '/App.tsx': {
      code: code || DEFAULT_APP_CODE,
      active: true,
    },
    '/index.css': {
      code: INDEX_CSS,
    },
    '/tailwind.config.js': {
      code: TAILWIND_CONFIG,
      hidden: true,
    },
  }), [code]);

  return (
    <div className={cn('h-full flex flex-col min-h-0', className)}>
      <SandboxErrorBoundary key={resetKey} onReset={reset} className="h-full flex-1 min-h-0">
        <SandpackProvider
          template="react-ts"
          theme={theme === 'dark' ? 'dark' : 'light'}
          files={files}
          customSetup={{
            dependencies: {
              'tailwindcss': 'latest',
              'autoprefixer': 'latest',
              'postcss': 'latest',
            },
          }}
          options={{
            externalResources: ['https://cdn.tailwindcss.com'],
            recompileMode: 'delayed',
            recompileDelay: 300,
          }}
        >
          <SandboxSync onCodeChange={onCodeChange} />
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
