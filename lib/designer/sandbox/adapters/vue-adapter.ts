import { createDesignerBridgeModuleSource } from '../runtime-bridge';
import type { DesignerSandboxAdapter, SandboxAdapterBuildContext } from '../types';

const DEFAULT_VUE_CODE = `<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold">Hello World</h1>
    <p class="text-gray-600 mt-2">Start editing to see changes.</p>
  </div>
</template>

<script setup lang="ts">
</script>
`;

function buildVueEntry(enableBridge: boolean): string {
  const bridge = enableBridge
    ? "import { installDesignerRuntimeBridge } from './designer-bridge';\ninstallDesignerRuntimeBridge();\n"
    : '';

  return `import { createApp } from 'vue';
import App from './App.vue';
${bridge}
createApp(App).mount('#app');
`;
}

function buildVueConfig(context: SandboxAdapterBuildContext) {
  const code = context.code?.trim().length ? context.code : DEFAULT_VUE_CODE;
  const enableBridge = context.enableBridge === true;

  return {
    template: 'vue' as const,
    mainFile: '/src/App.vue',
    files: {
      '/src/App.vue': {
        code,
        active: true,
      },
      '/src/main.js': {
        code: buildVueEntry(enableBridge),
      },
      ...(enableBridge
        ? {
            '/src/designer-bridge.js': {
              code: createDesignerBridgeModuleSource(),
              hidden: true,
            },
          }
        : {}),
    },
    customSetup: undefined,
    externalResources: [],
  };
}

export const vueSandboxAdapter: DesignerSandboxAdapter = {
  framework: 'vue',
  template: 'vue',
  mainFile: '/src/App.vue',
  defaultCode: DEFAULT_VUE_CODE,
  buildConfig: buildVueConfig,
};

export default vueSandboxAdapter;
