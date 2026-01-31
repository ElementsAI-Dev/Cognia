/**
 * Tests for usePythonRuntime hook
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { usePythonRuntime, getPythonRuntimeInfo, listPythonPlugins, isPythonAvailable } from './use-python-runtime'

// Mock Tauri invoke
const mockInvoke = jest.fn()
jest.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}))

// Mock isTauri
jest.mock('@/lib/utils', () => ({
  isTauri: () => true,
}))

describe('usePythonRuntime', () => {
  beforeEach(() => {
    mockInvoke.mockClear()
  })

  it('should fetch runtime info on mount', async () => {
    const mockRuntimeInfo = {
      available: true,
      version: '3.11.0',
      plugin_count: 2,
      total_calls: 100,
      total_execution_time_ms: 5000,
      failed_calls: 5,
    }
    const mockPlugins = ['plugin-a', 'plugin-b']

    mockInvoke
      .mockResolvedValueOnce(mockRuntimeInfo)
      .mockResolvedValueOnce(mockPlugins)

    const { result } = renderHook(() => usePythonRuntime())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.runtimeInfo).toEqual(mockRuntimeInfo)
    expect(result.current.loadedPlugins).toEqual(mockPlugins)
    expect(result.current.error).toBeNull()
  })

  it('should handle errors', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Runtime not initialized'))

    const { result } = renderHook(() => usePythonRuntime())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('Runtime not initialized')
    expect(result.current.runtimeInfo).toBeNull()
  })

  it('should refresh runtime info', async () => {
    const mockRuntimeInfo = {
      available: true,
      version: '3.11.0',
      plugin_count: 1,
      total_calls: 50,
      total_execution_time_ms: 2500,
      failed_calls: 2,
    }

    mockInvoke
      .mockResolvedValueOnce(mockRuntimeInfo)
      .mockResolvedValueOnce(['plugin-a'])
      .mockResolvedValueOnce({ ...mockRuntimeInfo, total_calls: 60 })
      .mockResolvedValueOnce(['plugin-a', 'plugin-b'])

    const { result } = renderHook(() => usePythonRuntime())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.runtimeInfo?.total_calls).toBe(50)

    await act(async () => {
      await result.current.refresh()
    })

    expect(result.current.runtimeInfo?.total_calls).toBe(60)
    expect(result.current.loadedPlugins).toHaveLength(2)
  })

  it('should check if plugin is initialized', async () => {
    mockInvoke
      .mockResolvedValueOnce({ available: true, version: '3.11.0', plugin_count: 1, total_calls: 0, total_execution_time_ms: 0, failed_calls: 0 })
      .mockResolvedValueOnce(['plugin-a'])
      .mockResolvedValueOnce(true)

    const { result } = renderHook(() => usePythonRuntime())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const isInitialized = await result.current.isPluginInitialized('plugin-a')
    expect(isInitialized).toBe(true)
    expect(mockInvoke).toHaveBeenCalledWith('plugin_python_is_initialized', { pluginId: 'plugin-a' })
  })

  it('should get plugin info', async () => {
    const mockPluginInfo = {
      plugin_id: 'plugin-a',
      tool_count: 3,
      hook_count: 2,
    }

    mockInvoke
      .mockResolvedValueOnce({ available: true, version: '3.11.0', plugin_count: 1, total_calls: 0, total_execution_time_ms: 0, failed_calls: 0 })
      .mockResolvedValueOnce(['plugin-a'])
      .mockResolvedValueOnce(mockPluginInfo)

    const { result } = renderHook(() => usePythonRuntime())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const info = await result.current.getPluginInfo('plugin-a')
    expect(info).toEqual(mockPluginInfo)
    expect(mockInvoke).toHaveBeenCalledWith('plugin_python_get_info', { pluginId: 'plugin-a' })
  })

  it('should unload plugin and refresh', async () => {
    mockInvoke
      .mockResolvedValueOnce({ available: true, version: '3.11.0', plugin_count: 2, total_calls: 0, total_execution_time_ms: 0, failed_calls: 0 })
      .mockResolvedValueOnce(['plugin-a', 'plugin-b'])
      .mockResolvedValueOnce(undefined) // unload
      .mockResolvedValueOnce({ available: true, version: '3.11.0', plugin_count: 1, total_calls: 0, total_execution_time_ms: 0, failed_calls: 0 })
      .mockResolvedValueOnce(['plugin-b'])

    const { result } = renderHook(() => usePythonRuntime())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.loadedPlugins).toHaveLength(2)

    await act(async () => {
      await result.current.unloadPlugin('plugin-a')
    })

    expect(mockInvoke).toHaveBeenCalledWith('plugin_python_unload', { pluginId: 'plugin-a' })
    expect(result.current.loadedPlugins).toHaveLength(1)
    expect(result.current.loadedPlugins).not.toContain('plugin-a')
  })
})

describe('getPythonRuntimeInfo', () => {
  beforeEach(() => {
    mockInvoke.mockClear()
  })

  it('should return runtime info', async () => {
    const mockInfo = {
      available: true,
      version: '3.11.0',
      plugin_count: 1,
      total_calls: 10,
      total_execution_time_ms: 500,
      failed_calls: 0,
    }

    mockInvoke.mockResolvedValueOnce(mockInfo)

    const info = await getPythonRuntimeInfo()
    expect(info).toEqual(mockInfo)
  })

  it('should return null on error', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Failed'))

    const info = await getPythonRuntimeInfo()
    expect(info).toBeNull()
  })
})

describe('listPythonPlugins', () => {
  beforeEach(() => {
    mockInvoke.mockClear()
  })

  it('should return plugin list', async () => {
    const mockPlugins = ['plugin-a', 'plugin-b']
    mockInvoke.mockResolvedValueOnce(mockPlugins)

    const plugins = await listPythonPlugins()
    expect(plugins).toEqual(mockPlugins)
  })

  it('should return empty array on error', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Failed'))

    const plugins = await listPythonPlugins()
    expect(plugins).toEqual([])
  })
})

describe('isPythonAvailable', () => {
  beforeEach(() => {
    mockInvoke.mockClear()
  })

  it('should return true when available', async () => {
    mockInvoke.mockResolvedValueOnce({ available: true, version: '3.11.0', plugin_count: 0, total_calls: 0, total_execution_time_ms: 0, failed_calls: 0 })

    const available = await isPythonAvailable()
    expect(available).toBe(true)
  })

  it('should return false when not available', async () => {
    mockInvoke.mockResolvedValueOnce({ available: false, version: null, plugin_count: 0, total_calls: 0, total_execution_time_ms: 0, failed_calls: 0 })

    const available = await isPythonAvailable()
    expect(available).toBe(false)
  })

  it('should return false on error', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Failed'))

    const available = await isPythonAvailable()
    expect(available).toBe(false)
  })
})
