import path from 'node:path';
import type {
  ExtensionCompatibilityDiagnostic,
  ExtensionDescriptor,
  ExtensionOperation,
  PluginInstallRootKind,
  PluginManifest,
  PluginSource,
} from '@/types/plugin';

export interface BuildExtensionDescriptorOptions {
  manifest: PluginManifest;
  source: PluginSource;
  path: string;
  pluginDirectory?: string;
  installRootKind?: PluginInstallRootKind;
  compatibilityDiagnostics?: ExtensionCompatibilityDiagnostic[];
}

export function derivePluginInstallRootKind(source: PluginSource): PluginInstallRootKind {
  if (source === 'builtin') return 'builtin';
  if (source === 'dev') return 'dev';
  return 'installed';
}

function buildCompatibilityStatus(
  diagnostics: ExtensionCompatibilityDiagnostic[],
): ExtensionDescriptor['compatibility']['status'] {
  if (diagnostics.some((entry) => entry.severity === 'error')) {
    return 'blocked';
  }
  if (diagnostics.some((entry) => entry.severity === 'warning')) {
    return 'warning';
  }
  return 'compatible';
}

function buildAvailableOperations(
  source: PluginSource,
  installRootKind: PluginInstallRootKind,
): ExtensionOperation[] {
  const operations: ExtensionOperation[] = ['enable', 'disable', 'configure'];

  if (source === 'marketplace') {
    operations.push('update');
  }

  if (installRootKind === 'dev') {
    operations.push('reload');
  }

  if (installRootKind !== 'builtin') {
    operations.push('uninstall');
  }

  return operations;
}

export function buildExtensionDescriptor({
  manifest,
  source,
  path: resolvedPath,
  pluginDirectory,
  installRootKind = derivePluginInstallRootKind(source),
  compatibilityDiagnostics = [],
}: BuildExtensionDescriptorOptions): ExtensionDescriptor {
  return {
    id: manifest.id,
    version: manifest.version,
    source,
    resolvedPath,
    installRoot: {
      kind: installRootKind,
      path: pluginDirectory || path.dirname(resolvedPath),
    },
    entrypoints: {
      main: manifest.main,
      pythonMain: manifest.pythonMain,
      styles: manifest.styles,
    },
    declaredCapabilities: [...manifest.capabilities],
    compatibility: {
      status: buildCompatibilityStatus(compatibilityDiagnostics),
      diagnostics: [...compatibilityDiagnostics],
    },
    availableOperations: buildAvailableOperations(source, installRootKind),
  };
}
