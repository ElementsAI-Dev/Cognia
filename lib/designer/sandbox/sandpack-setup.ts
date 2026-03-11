import type { FrameworkType } from '@/lib/designer/config/templates';
import { getSandboxAdapter } from './registry';
import type {
  DesignerSandboxAdapter,
  DesignerSandboxConfig,
  SandboxAdapterBuildContext,
} from './types';

export interface BuildFrameworkSandboxOptions extends SandboxAdapterBuildContext {
  framework: FrameworkType;
}

export interface BuildFrameworkSandboxResult extends DesignerSandboxConfig {
  adapter: DesignerSandboxAdapter;
}

export function buildFrameworkSandboxConfig(
  options: BuildFrameworkSandboxOptions
): BuildFrameworkSandboxResult | null {
  const adapter = getSandboxAdapter(options.framework);
  if (!adapter) {
    return null;
  }

  return {
    ...adapter.buildConfig(options),
    adapter,
  };
}

export function getFrameworkDefaultCode(framework: FrameworkType): string {
  const adapter = getSandboxAdapter(framework);
  if (!adapter) {
    return '';
  }

  return adapter.defaultCode;
}

export function sandpackTemplateToFramework(template: string): FrameworkType | null {
  if (template === 'react' || template === 'react-ts') {
    return 'react';
  }

  if (template === 'vue' || template === 'vue-ts') {
    return 'vue';
  }

  if (template === 'vanilla' || template === 'vanilla-ts' || template === 'static') {
    return 'html';
  }

  return null;
}
