import { createInlineDesignerBridgeScript } from '../runtime-bridge';
import type { DesignerSandboxAdapter, SandboxAdapterBuildContext } from '../types';

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

function injectBridgeIntoHtml(html: string): string {
  const bridge = `<script>${createInlineDesignerBridgeScript().replace(/<\/script/gi, '<\\/script')}<\/script>`;

  if (html.includes('</body>')) {
    return html.replace('</body>', `${bridge}\n</body>`);
  }

  return `${html}\n${bridge}`;
}

function buildHtmlConfig(context: SandboxAdapterBuildContext) {
  const code = context.code?.trim().length ? context.code : DEFAULT_HTML_CODE;

  return {
    template: 'vanilla' as const,
    mainFile: '/index.html',
    files: {
      '/index.html': {
        code: context.enableBridge ? injectBridgeIntoHtml(code) : code,
        active: true,
      },
    },
    customSetup: undefined,
    externalResources: [],
  };
}

export const htmlSandboxAdapter: DesignerSandboxAdapter = {
  framework: 'html',
  template: 'vanilla',
  mainFile: '/index.html',
  defaultCode: DEFAULT_HTML_CODE,
  buildConfig: buildHtmlConfig,
};

export default htmlSandboxAdapter;
