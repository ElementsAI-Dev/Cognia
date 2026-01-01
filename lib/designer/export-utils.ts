/**
 * Export utilities for the designer sandbox
 * Provides proper export functionality for CodeSandbox, StackBlitz, and local downloads
 */

import type { SandpackFiles } from '@codesandbox/sandpack-react';
import { safeBase64Encode } from './cdn-resolver';

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
  // Use safe base64 encoding that handles Unicode
  parametersInput.value = safeBase64Encode(JSON.stringify(parameters));
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

/**
 * Create a GitHub Gist with the code
 * Note: Requires a GitHub token for authentication
 */
export async function createGitHubGist(
  files: ProjectFiles,
  config: ExportConfig & { githubToken: string; isPublic?: boolean; description?: string }
): Promise<{ success: boolean; url?: string; id?: string; error?: string }> {
  const { githubToken, isPublic = true, description = 'Created with Designer' } = config;

  if (!githubToken) {
    return { success: false, error: 'GitHub token is required' };
  }

  try {
    const projectFiles = generateViteProject(files, config);
    
    // Convert to Gist format
    const gistFiles: Record<string, { content: string }> = {};
    for (const [filename, content] of Object.entries(projectFiles)) {
      // Gist doesn't support nested paths, flatten with underscore
      const flatName = filename.replace(/\//g, '_');
      gistFiles[flatName] = { content };
    }

    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        description,
        public: isPublic,
        files: gistFiles,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `GitHub API error: ${response.status} - ${errorData.message || 'Unknown error'}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      url: data.html_url,
      id: data.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create Gist',
    };
  }
}

/**
 * Generate a shareable code snippet with syntax highlighting support
 */
export interface CodeSnippet {
  id: string;
  code: string;
  language: 'jsx' | 'tsx' | 'html' | 'css';
  title?: string;
  createdAt: Date;
  expiresAt?: Date;
}

/**
 * Encode code as a URL-safe base64 string for sharing
 */
export function encodeCodeForSharing(code: string): string {
  try {
    // Use safe base64 encoding
    return safeBase64Encode(code);
  } catch {
    // Fallback
    return btoa(unescape(encodeURIComponent(code)));
  }
}

/**
 * Decode a shared code string
 */
export function decodeSharedCode(encoded: string): string {
  try {
    // Try safe base64 decoding first
    const binString = atob(encoded);
    const bytes = Uint8Array.from(binString, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    // Fallback
    return decodeURIComponent(escape(atob(encoded)));
  }
}

/**
 * Generate a compact shareable URL with embedded code
 * Uses compression for smaller URLs
 */
export function generateCompactShareUrl(code: string, baseUrl?: string): string {
  const encoded = encodeCodeForSharing(code);
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/designer?code=${encoded}`;
}

/**
 * Parse code from a shared URL
 */
export function parseSharedUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const encoded = urlObj.searchParams.get('code');
    if (encoded) {
      return decodeSharedCode(encoded);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Generate an embeddable iframe HTML for the code
 */
export function generateEmbedCode(
  code: string,
  options: { width?: string; height?: string; theme?: 'light' | 'dark' } = {}
): string {
  const { width = '100%', height = '400px', theme = 'light' } = options;
  const encoded = encodeCodeForSharing(code);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return `<iframe
  src="${baseUrl}/designer/embed?code=${encoded}&theme=${theme}"
  width="${width}"
  height="${height}"
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
  loading="lazy"
  sandbox="allow-scripts allow-same-origin"
></iframe>`;
}

/**
 * Export code as different file formats
 */
export function exportAsFormat(
  code: string,
  format: 'jsx' | 'tsx' | 'html' | 'json',
  filename?: string
): void {
  let content = code;
  let mimeType = 'text/plain';
  const extension = format;

  switch (format) {
    case 'jsx':
    case 'tsx':
      mimeType = 'text/javascript';
      break;
    case 'html':
      mimeType = 'text/html';
      // Wrap JSX in HTML if needed
      if (!code.includes('<!DOCTYPE') && !code.includes('<html')) {
        content = wrapInHTML(code);
      }
      break;
    case 'json':
      mimeType = 'application/json';
      content = JSON.stringify({ code, exportedAt: new Date().toISOString() }, null, 2);
      break;
  }

  const finalFilename = filename || `component.${extension}`;
  downloadFile(content, finalFilename, mimeType);
}

/**
 * Wrap React code in a complete HTML document
 */
function wrapInHTML(reactCode: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React Component</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
${reactCode}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
  </script>
</body>
</html>`;
}

/**
 * Generate QR code data URL for sharing (requires external QR library)
 * Returns the data that should be encoded in QR
 */
export function getQRCodeData(code: string): string {
  const shareUrl = generateCompactShareUrl(code);
  // Return URL for QR encoding - actual QR generation requires a library like 'qrcode'
  return shareUrl;
}

/**
 * Create a snippet for sharing on social platforms
 */
export function generateSocialShareLinks(code: string, title?: string): {
  twitter: string;
  linkedin: string;
  reddit: string;
} {
  const shareUrl = encodeURIComponent(generateCompactShareUrl(code));
  const shareTitle = encodeURIComponent(title || 'Check out this React component!');

  return {
    twitter: `https://twitter.com/intent/tweet?text=${shareTitle}&url=${shareUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
    reddit: `https://www.reddit.com/submit?url=${shareUrl}&title=${shareTitle}`,
  };
}

const exportUtils = {
  normalizeSandpackFiles,
  generateViteProject,
  openInCodeSandbox,
  openInStackBlitz,
  downloadAsZip,
  downloadFile,
  copyToClipboard,
  generateShareableUrl,
  // New exports
  createGitHubGist,
  encodeCodeForSharing,
  decodeSharedCode,
  generateCompactShareUrl,
  parseSharedUrl,
  generateEmbedCode,
  exportAsFormat,
  getQRCodeData,
  generateSocialShareLinks,
};

export default exportUtils;
