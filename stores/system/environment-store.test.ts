/**
 * Tests for Environment Store
 */

import { act, renderHook } from '@testing-library/react';
import {
  useEnvironmentStore,
  useEnvironmentPlatform,
  useToolStatus,
  useInstallProgress,
  useIsToolInstalled,
  useEnvironmentRefreshing,
  useEnvironmentInstalling,
} from './environment-store';
import type { EnvironmentTool, ToolStatus } from '@/types/system/environment';

describe('useEnvironmentStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useEnvironmentStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const { result } = renderHook(() => useEnvironmentStore());

      expect(result.current.platform).toBe('unknown');
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.isInstalling).toBe(false);
      expect(result.current.globalError).toBeNull();
      expect(result.current.installProgress).toBeNull();
      expect(result.current.pythonEnv).toBeNull();
      expect(result.current.nodeEnv).toBeNull();
    });

    it('has default tool statuses', () => {
      const { result } = renderHook(() => useEnvironmentStore());

      expect(result.current.tools.uv).toBeDefined();
      expect(result.current.tools.nvm).toBeDefined();
      expect(result.current.tools.docker).toBeDefined();
      expect(result.current.tools.podman).toBeDefined();
      expect(result.current.tools.ffmpeg).toBeDefined();
    });
  });

  describe('Platform', () => {
    it('sets platform', () => {
      const { result } = renderHook(() => useEnvironmentStore());

      act(() => {
        result.current.setPlatform('macos');
      });

      expect(result.current.platform).toBe('macos');
    });
  });

  describe('Tool Status', () => {
    it('sets tool status', () => {
      const { result } = renderHook(() => useEnvironmentStore());

      act(() => {
        result.current.setToolStatus('uv', {
          installed: true,
          version: '0.1.0',
          status: 'installed',
        });
      });

      expect(result.current.tools.uv.installed).toBe(true);
      expect(result.current.tools.uv.version).toBe('0.1.0');
      expect(result.current.tools.uv.status).toBe('installed');
      expect(result.current.tools.uv.lastChecked).toBeDefined();
    });

    it('sets all tool statuses', () => {
      const { result } = renderHook(() => useEnvironmentStore());

      const statuses: Record<EnvironmentTool, ToolStatus> = {
        uv: { tool: 'uv', installed: true, status: 'installed', version: '1.0', path: null, error: null, lastChecked: null },
        nvm: { tool: 'nvm', installed: true, status: 'installed', version: '0.39', path: null, error: null, lastChecked: null },
        docker: { tool: 'docker', installed: false, status: 'not_installed', version: null, path: null, error: null, lastChecked: null },
        podman: { tool: 'podman', installed: false, status: 'not_installed', version: null, path: null, error: null, lastChecked: null },
        ffmpeg: { tool: 'ffmpeg', installed: true, status: 'installed', version: '6.0', path: null, error: null, lastChecked: null },
      };

      act(() => {
        result.current.setAllToolStatuses(statuses);
      });

      expect(result.current.tools.uv.installed).toBe(true);
      expect(result.current.tools.nvm.installed).toBe(true);
      expect(result.current.tools.docker.installed).toBe(false);
      expect(result.current.lastRefreshed).toBeDefined();
    });
  });

  describe('Installation', () => {
    it('starts installation', () => {
      const { result } = renderHook(() => useEnvironmentStore());

      act(() => {
        result.current.startInstallation('uv');
      });

      expect(result.current.isInstalling).toBe(true);
      expect(result.current.installProgress).toBeDefined();
      expect(result.current.installProgress?.tool).toBe('uv');
      expect(result.current.installProgress?.stage).toBe('downloading');
      expect(result.current.tools.uv.status).toBe('installing');
    });

    it('completes installation successfully', () => {
      const { result } = renderHook(() => useEnvironmentStore());

      act(() => {
        result.current.startInstallation('docker');
      });

      act(() => {
        result.current.completeInstallation('docker', true);
      });

      expect(result.current.isInstalling).toBe(false);
      expect(result.current.installProgress?.stage).toBe('done');
      expect(result.current.installProgress?.progress).toBe(100);
      expect(result.current.tools.docker.status).toBe('installed');
      expect(result.current.tools.docker.installed).toBe(true);
    });

    it('completes installation with error', () => {
      const { result } = renderHook(() => useEnvironmentStore());

      act(() => {
        result.current.startInstallation('nvm');
      });

      act(() => {
        result.current.completeInstallation('nvm', false, 'Download failed');
      });

      expect(result.current.isInstalling).toBe(false);
      expect(result.current.installProgress?.stage).toBe('error');
      expect(result.current.installProgress?.error).toBe('Download failed');
      expect(result.current.tools.nvm.status).toBe('error');
      expect(result.current.tools.nvm.error).toBe('Download failed');
    });

    it('sets install progress directly', () => {
      const { result } = renderHook(() => useEnvironmentStore());

      act(() => {
        result.current.setInstallProgress({
          tool: 'podman',
          stage: 'installing',
          progress: 50,
          message: 'Installing...',
          error: null,
        });
      });

      expect(result.current.installProgress?.tool).toBe('podman');
      expect(result.current.installProgress?.progress).toBe(50);
    });
  });

  describe('Environment Info', () => {
    it('sets Python environment', () => {
      const { result } = renderHook(() => useEnvironmentStore());

      const pythonEnv = {
        version: '3.11.0',
        path: '/usr/bin/python3',
        packages: [],
      };

      act(() => {
        result.current.setPythonEnv(pythonEnv as never);
      });

      expect(result.current.pythonEnv).toEqual(pythonEnv);
    });

    it('sets Node environment', () => {
      const { result } = renderHook(() => useEnvironmentStore());

      const nodeEnv = {
        version: '20.0.0',
        path: '/usr/bin/node',
      };

      act(() => {
        result.current.setNodeEnv(nodeEnv as never);
      });

      expect(result.current.nodeEnv).toEqual(nodeEnv);
    });
  });

  describe('Loading States', () => {
    it('sets refreshing state', () => {
      const { result } = renderHook(() => useEnvironmentStore());

      act(() => {
        result.current.setRefreshing(true);
      });

      expect(result.current.isRefreshing).toBe(true);

      act(() => {
        result.current.setRefreshing(false);
      });

      expect(result.current.isRefreshing).toBe(false);
    });

    it('sets installing state', () => {
      const { result } = renderHook(() => useEnvironmentStore());

      act(() => {
        result.current.setInstalling(true);
      });

      expect(result.current.isInstalling).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('sets global error', () => {
      const { result } = renderHook(() => useEnvironmentStore());

      act(() => {
        result.current.setGlobalError('Network error');
      });

      expect(result.current.globalError).toBe('Network error');
    });

    it('clears all errors', () => {
      const { result } = renderHook(() => useEnvironmentStore());

      act(() => {
        result.current.setGlobalError('Global error');
        result.current.setToolStatus('uv', { error: 'Tool error' });
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.globalError).toBeNull();
      expect(result.current.tools.uv.error).toBeNull();
    });
  });

  describe('Refresh', () => {
    it('sets last refreshed timestamp', () => {
      const { result } = renderHook(() => useEnvironmentStore());

      const timestamp = new Date().toISOString();

      act(() => {
        result.current.setLastRefreshed(timestamp);
      });

      expect(result.current.lastRefreshed).toBe(timestamp);
    });
  });

  describe('Reset', () => {
    it('resets to initial state', () => {
      const { result } = renderHook(() => useEnvironmentStore());

      act(() => {
        result.current.setPlatform('linux');
        result.current.setGlobalError('Some error');
        result.current.setRefreshing(true);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.platform).toBe('unknown');
      expect(result.current.globalError).toBeNull();
      expect(result.current.isRefreshing).toBe(false);
    });
  });
});

describe('Selector Hooks', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useEnvironmentStore());
    act(() => {
      result.current.reset();
    });
  });

  it('useEnvironmentPlatform returns platform', () => {
    const store = renderHook(() => useEnvironmentStore());
    act(() => {
      store.result.current.setPlatform('windows');
    });

    const { result } = renderHook(() => useEnvironmentPlatform());
    expect(result.current).toBe('windows');
  });

  it('useToolStatus returns specific tool status', () => {
    const store = renderHook(() => useEnvironmentStore());
    act(() => {
      store.result.current.setToolStatus('docker', { installed: true, version: '24.0' });
    });

    const { result } = renderHook(() => useToolStatus('docker'));
    expect(result.current.installed).toBe(true);
    expect(result.current.version).toBe('24.0');
  });

  it('useInstallProgress returns install progress', () => {
    const store = renderHook(() => useEnvironmentStore());
    act(() => {
      store.result.current.startInstallation('ffmpeg');
    });

    const { result } = renderHook(() => useInstallProgress());
    expect(result.current?.tool).toBe('ffmpeg');
  });

  it('useIsToolInstalled returns installation status', () => {
    const store = renderHook(() => useEnvironmentStore());
    act(() => {
      store.result.current.setToolStatus('uv', { installed: true });
    });

    const { result } = renderHook(() => useIsToolInstalled('uv'));
    expect(result.current).toBe(true);
  });

  it('useEnvironmentRefreshing returns refreshing state', () => {
    const store = renderHook(() => useEnvironmentStore());
    act(() => {
      store.result.current.setRefreshing(true);
    });

    const { result } = renderHook(() => useEnvironmentRefreshing());
    expect(result.current).toBe(true);
  });

  it('useEnvironmentInstalling returns installing state', () => {
    const store = renderHook(() => useEnvironmentStore());
    act(() => {
      store.result.current.setInstalling(true);
    });

    const { result } = renderHook(() => useEnvironmentInstalling());
    expect(result.current).toBe(true);
  });
});
