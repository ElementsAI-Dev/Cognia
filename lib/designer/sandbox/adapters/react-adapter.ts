import { TAILWIND_CDN_SCRIPT } from '@/lib/designer/config/tailwind-config';
import { createDesignerBridgeModuleSource } from '../runtime-bridge';
import type { DesignerSandboxAdapter, SandboxAdapterBuildContext } from '../types';

const DEFAULT_REACT_CODE = `export default function App() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Hello World</h1>
      <p className="text-gray-600 mt-2">Start editing to see changes.</p>
    </div>
  );
}`;

const INDEX_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;

const TAILWIND_CONFIG = `module.exports = {
  content: ["./**/*.{js,jsx,ts,tsx,html,vue}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
`;

function buildReactEntry(enableBridge: boolean): string {
  const bridge = enableBridge
    ? "import { installDesignerRuntimeBridge } from './designer-bridge';\ninstallDesignerRuntimeBridge();\n"
    : '';

  return `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
${bridge}
const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
`;
}

function buildReactConfig(context: SandboxAdapterBuildContext) {
  const code = context.code?.trim().length ? context.code : DEFAULT_REACT_CODE;
  const enableBridge = context.enableBridge === true;

  return {
    template: 'react-ts' as const,
    mainFile: '/App.tsx',
    files: {
      '/App.tsx': {
        code,
        active: true,
      },
      '/index.tsx': {
        code: buildReactEntry(enableBridge),
      },
      '/index.css': {
        code: INDEX_CSS,
      },
      '/tailwind.config.js': {
        code: TAILWIND_CONFIG,
        hidden: true,
      },
      ...(enableBridge
        ? {
            '/designer-bridge.ts': {
              code: createDesignerBridgeModuleSource(),
              hidden: true,
            },
          }
        : {}),
    },
    customSetup: {
      dependencies: {
        tailwindcss: 'latest',
        autoprefixer: 'latest',
        postcss: 'latest',
      },
    },
    externalResources: [TAILWIND_CDN_SCRIPT],
  };
}

export const reactSandboxAdapter: DesignerSandboxAdapter = {
  framework: 'react',
  template: 'react-ts',
  mainFile: '/App.tsx',
  defaultCode: DEFAULT_REACT_CODE,
  buildConfig: buildReactConfig,
};

export default reactSandboxAdapter;
