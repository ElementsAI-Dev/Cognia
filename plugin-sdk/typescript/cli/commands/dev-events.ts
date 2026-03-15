interface DevManifestLike {
  id: string;
  name: string;
  version: string;
  main: string;
}

interface DevBuildResult {
  ok: boolean;
  error?: string;
}

export function createDevReloadEvent(
  manifest: DevManifestLike,
  buildResult: DevBuildResult,
  changedFile: string,
) {
  return {
    type: 'cognia-dev-extension-update',
    pluginId: manifest.id,
    payload: {
      event: buildResult.ok ? 'reload-ready' : 'reload-error',
      pluginId: manifest.id,
      pluginName: manifest.name,
      version: manifest.version,
      output: manifest.main,
      changedFile,
      error: buildResult.error,
    },
    timestamp: Date.now(),
  };
}
