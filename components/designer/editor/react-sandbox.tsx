'use client';

/**
 * ReactSandbox - Sandpack-based React sandbox for live preview
 * Provides isolated React runtime for code execution
 */

import { useCallback, useMemo } from 'react';
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  SandpackCodeEditor,
  useSandpack,
} from '@codesandbox/sandpack-react';
import { cn } from '@/lib/utils';
import { useDesignerStore } from '@/stores/designer-store';
import { useSettingsStore } from '@/stores';

interface ReactSandboxProps {
  className?: string;
  showEditor?: boolean;
  showPreview?: boolean;
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
function SandboxSync() {
  const { sandpack } = useSandpack();
  const setCode = useDesignerStore((state) => state.setCode);

  // Sync changes to store
  const handleChange = useCallback(() => {
    const files = sandpack.files;
    const appFile = files['/App.tsx'] || files['/App.jsx'];
    if (appFile) {
      setCode(appFile.code, false);
    }
  }, [sandpack.files, setCode]);

  // Listen for file changes
  useMemo(() => {
    handleChange();
  }, [handleChange]);

  return null;
}

export function ReactSandbox({
  className,
  showEditor = true,
  showPreview = true,
}: ReactSandboxProps) {
  const code = useDesignerStore((state) => state.code);
  const theme = useSettingsStore((state) => state.theme);

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
    <div className={cn('h-full', className)}>
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
        <SandboxSync />
        <SandpackLayout className="h-full">
          {showEditor && (
            <SandpackCodeEditor
              showTabs={false}
              showLineNumbers
              showInlineErrors
              wrapContent
              style={{ height: '100%' }}
            />
          )}
          {showPreview && (
            <SandpackPreview
              showNavigator={false}
              showRefreshButton
              style={{ height: '100%' }}
            />
          )}
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}

export default ReactSandbox;
