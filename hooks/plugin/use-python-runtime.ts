/**
 * usePythonRuntime - Hook for accessing Python runtime information
 *
 * Provides access to Python runtime stats, plugin info, and management functions.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { isTauri } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

/** Python runtime information */
export interface PythonRuntimeInfo {
  available: boolean
  version: string | null
  plugin_count: number
  total_calls: number
  total_execution_time_ms: number
  failed_calls: number
}

/** Python plugin information */
export interface PythonPluginInfo {
  plugin_id: string
  tool_count: number
  hook_count: number
}

interface UsePythonRuntimeReturn {
  /** Python runtime information */
  runtimeInfo: PythonRuntimeInfo | null
  /** Whether the runtime info is loading */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** List of loaded Python plugins */
  loadedPlugins: string[]
  /** Refresh runtime information */
  refresh: () => Promise<void>
  /** Check if a specific plugin is initialized */
  isPluginInitialized: (pluginId: string) => Promise<boolean>
  /** Get info for a specific plugin */
  getPluginInfo: (pluginId: string) => Promise<PythonPluginInfo | null>
  /** Unload a Python plugin */
  unloadPlugin: (pluginId: string) => Promise<void>
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook to access Python runtime information and management
 */
export function usePythonRuntime(): UsePythonRuntimeReturn {
  const [runtimeInfo, setRuntimeInfo] = useState<PythonRuntimeInfo | null>(null)
  const [loadedPlugins, setLoadedPlugins] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!isTauri()) {
      setError('Python runtime is only available in desktop mode')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [info, plugins] = await Promise.all([
        invoke<PythonRuntimeInfo>('plugin_python_runtime_info'),
        invoke<string[]>('plugin_python_list'),
      ])

      setRuntimeInfo(info)
      setLoadedPlugins(plugins)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const isPluginInitialized = useCallback(async (pluginId: string): Promise<boolean> => {
    if (!isTauri()) return false

    try {
      return await invoke<boolean>('plugin_python_is_initialized', { pluginId })
    } catch {
      return false
    }
  }, [])

  const getPluginInfo = useCallback(
    async (pluginId: string): Promise<PythonPluginInfo | null> => {
      if (!isTauri()) return null

      try {
        return await invoke<PythonPluginInfo | null>('plugin_python_get_info', { pluginId })
      } catch {
        return null
      }
    },
    []
  )

  const unloadPlugin = useCallback(
    async (pluginId: string): Promise<void> => {
      if (!isTauri()) {
        throw new Error('Python runtime is only available in desktop mode')
      }

      await invoke('plugin_python_unload', { pluginId })
      // Refresh the list after unloading
      await refresh()
    },
    [refresh]
  )

  // Auto-refresh on mount
  useEffect(() => {
    if (isTauri()) {
      refresh()
    }
  }, [refresh])

  return useMemo(
    () => ({
      runtimeInfo,
      isLoading,
      error,
      loadedPlugins,
      refresh,
      isPluginInitialized,
      getPluginInfo,
      unloadPlugin,
    }),
    [runtimeInfo, isLoading, error, loadedPlugins, refresh, isPluginInitialized, getPluginInfo, unloadPlugin]
  )
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get Python runtime info directly (non-hook version)
 */
export async function getPythonRuntimeInfo(): Promise<PythonRuntimeInfo | null> {
  if (!isTauri()) return null

  try {
    return await invoke<PythonRuntimeInfo>('plugin_python_runtime_info')
  } catch {
    return null
  }
}

/**
 * List all loaded Python plugins
 */
export async function listPythonPlugins(): Promise<string[]> {
  if (!isTauri()) return []

  try {
    return await invoke<string[]>('plugin_python_list')
  } catch {
    return []
  }
}

/**
 * Check if Python runtime is available
 */
export async function isPythonAvailable(): Promise<boolean> {
  const info = await getPythonRuntimeInfo()
  return info?.available ?? false
}
