import type { FrameworkType } from '@/lib/designer/config/templates';
import { htmlSandboxAdapter } from './adapters/html-adapter';
import { reactSandboxAdapter } from './adapters/react-adapter';
import { vueSandboxAdapter } from './adapters/vue-adapter';
import type { DesignerSandboxAdapter } from './types';

const adapterRegistry = new Map<FrameworkType, DesignerSandboxAdapter>();

export function registerSandboxAdapter(adapter: DesignerSandboxAdapter): void {
  adapterRegistry.set(adapter.framework, adapter);
}

export function getSandboxAdapter(framework: FrameworkType): DesignerSandboxAdapter | null {
  return adapterRegistry.get(framework) ?? null;
}

export function listSandboxAdapters(): DesignerSandboxAdapter[] {
  return Array.from(adapterRegistry.values());
}

export function clearSandboxAdapters(): void {
  adapterRegistry.clear();
}

registerSandboxAdapter(reactSandboxAdapter);
registerSandboxAdapter(vueSandboxAdapter);
registerSandboxAdapter(htmlSandboxAdapter);
