/**
 * Export utilities for the designer sandbox
 * Provides proper export functionality for CodeSandbox, StackBlitz, and local downloads
 */

import type { SandpackFiles } from '@codesandbox/sandpack-react';

export interface ProjectFiles {
  [path: string]: string;
}

export interface ExportConfig {
  projectName?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

// Default dependencies for React projects
const DEFAULT_DEPENDENCIES = {
  'react': '^18.2.0',
  'react-dom': '^18.2.0',
};

const DEFAULT_DEV_DEPENDENCIES = {
  'vite': '^5.0.0',
  '@vitejs/plugin-react': '^4.0.0',
  'autoprefixer': '^10.4.16',
  'postcss': '^8.4.32',
  'tailwindcss': '^3.4.0',
};

/**
 * Convert Sandpack files to a standard file structure
 */
export function normalizeSandpackFiles(files: SandpackFiles): ProjectFiles {
  const result: ProjectFiles = {};

  for (const [path, file] of Object.entries(files)) {
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    result[normalizedPath] = typeof file === 'string' ? file : file.code;
  }

  return result;
}

/**
 * Generate a complete Vite + React project structure
 */
export function generateViteProject(
  files: ProjectFiles,
  config: ExportConfig = {}
): ProjectFiles {
  const {
    projectName = 'sandbox-project',
    dependencies = {},
    devDependencies = {},
  } = config;

  const projectFiles: ProjectFiles = {};

  // Find the main App file
  const appCode = files['App.js'] || files['App.jsx'] || files['App.tsx'] ||
    files['src/App.js'] || files['src/App.jsx'] || files['src/App.tsx'] ||
    `export default function App() { return <div>Hello World</div>; }`;

  // Main entry point
  projectFiles['src/App.jsx'] = appCode;

  projectFiles['src/main.jsx'] = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;

  // Styles with Tailwind
  projectFiles['src/index.css'] = `@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom styles */
${files['styles.css'] || files['src/styles.css'] || ''}`;

  // Copy component files
  for (const [path, content] of Object.entries(files)) {
    if (path.includes('components/') || path.includes('lib/')) {
      const normalizedPath = path.startsWith('src/') ? path : `src/${path}`;
      projectFiles[normalizedPath] = content;
    }
  }

  // HTML entry
  projectFiles['index.html'] = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;

  // Vite config
  projectFiles['vite.config.js'] = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});`;

  // Tailwind config
  projectFiles['tailwind.config.js'] = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};`;

  // PostCSS config
  projectFiles['postcss.config.js'] = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};`;

  // Package.json
  projectFiles['package.json'] = JSON.stringify({
    name: projectName,
    private: true,
    version: '0.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: {
      ...DEFAULT_DEPENDENCIES,
      ...dependencies,
    },
    devDependencies: {
      ...DEFAULT_DEV_DEPENDENCIES,
      ...devDependencies,
    },
  }, null, 2);

  return projectFiles;
}

/**
 * Open project in CodeSandbox
 */
export function openInCodeSandbox(files: ProjectFiles, config: ExportConfig = {}): void {
  const projectFiles = generateViteProject(files, config);

  // CodeSandbox API format
  const parameters = {
    files: Object.fromEntries(
      Object.entries(projectFiles).map(([path, content]) => [
        path,
        { content },
      ])
    ),
  };

  // Create form and submit
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = 'https://codesandbox.io/api/v1/sandboxes/define';
  form.target = '_blank';

  const parametersInput = document.createElement('input');
  parametersInput.type = 'hidden';
  parametersInput.name = 'parameters';
  parametersInput.value = btoa(unescape(encodeURIComponent(JSON.stringify(parameters))));
  form.appendChild(parametersInput);

  const queryInput = document.createElement('input');
  queryInput.type = 'hidden';
  queryInput.name = 'query';
  queryInput.value = 'file=/src/App.jsx';
  form.appendChild(queryInput);

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}

/**
 * Open project in StackBlitz
 */
export function openInStackBlitz(files: ProjectFiles, config: ExportConfig = {}): void {
  const projectFiles = generateViteProject(files, config);

  // Create form for StackBlitz
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
  titleInput.value = config.projectName || 'Sandbox Project';
  form.appendChild(titleInput);

  const templateInput = document.createElement('input');
  templateInput.type = 'hidden';
  templateInput.name = 'project[template]';
  templateInput.value = 'node';
  form.appendChild(templateInput);

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}

/**
 * Download project as ZIP file
 * Uses JSZip if available, otherwise falls back to text file
 */
export async function downloadAsZip(
  files: ProjectFiles,
  config: ExportConfig = {}
): Promise<void> {
  const projectFiles = generateViteProject(files, config);
  const projectName = config.projectName || 'sandbox-project';

  // Try to use JSZip if available
  try {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    for (const [path, content] of Object.entries(projectFiles)) {
      zip.file(path, content);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, `${projectName}.zip`);
  } catch {
    // Fallback: download as combined text file
    const fileList = Object.entries(projectFiles)
      .map(([name, content]) => `// ===== ${name} =====\n${content}`)
      .join('\n\n');

    const blob = new Blob([fileList], { type: 'text/plain' });
    downloadBlob(blob, `${projectName}-files.txt`);
  }
}

/**
 * Download a single file
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}

/**
 * Helper to download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copy code to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch {
      document.body.removeChild(textArea);
      return false;
    }
  }
}

/**
 * Generate shareable URL with code embedded (for simple projects)
 */
export function generateShareableUrl(code: string): string {
  const encoded = btoa(unescape(encodeURIComponent(code)));
  // This would need a backend to work properly
  // For now, just return a data URL scheme
  return `data:text/javascript;base64,${encoded}`;
}

export default {
  normalizeSandpackFiles,
  generateViteProject,
  openInCodeSandbox,
  openInStackBlitz,
  downloadAsZip,
  downloadFile,
  copyToClipboard,
  generateShareableUrl,
};
