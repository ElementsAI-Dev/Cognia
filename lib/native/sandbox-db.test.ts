/**
 * Sandbox Database Tests
 *
 * Tests for sandbox database API functions.
 */

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import {
  executeCode,
  executeCodeWithOptions,
  quickExecute,
  executeWithStdin,
  executeWithLimits,
  getSandboxStatus,
  getSandboxConfig,
  updateSandboxConfig,
  getAvailableRuntimes,
  getSupportedLanguages,
  checkRuntime,
  setPreferredRuntime,
  setDefaultTimeout,
  setDefaultMemoryLimit,
  setNetworkEnabled,
  toggleLanguage,
  prepareLanguage,
  getRuntimeInfo,
  cleanupSandbox,
  startSession,
  getCurrentSession,
  setCurrentSession,
  endSession,
  listSessions,
  getSession,
  deleteSession,
  getExecution,
  createSnippet,
  getLanguageStats,
  formatExecutionTime,
  formatMemorySize,
  calculateSuccessRate,
  getStatusColor,
  getStatusIcon,
  SandboxDbApi,
} from './sandbox-db';

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;

describe('SandboxDb - Execution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeCode', () => {
    it('should call invoke with request', async () => {
      const request = { language: 'python', code: 'print("hello")' };
      mockInvoke.mockResolvedValue({ id: 'exec-1', status: 'completed' });

      await executeCode(request);
      expect(mockInvoke).toHaveBeenCalledWith('sandbox_execute', { request });
    });
  });

  describe('executeCodeWithOptions', () => {
    it('should call invoke with options', async () => {
      const request = { language: 'python', code: 'print("hello")' };
      mockInvoke.mockResolvedValue({ id: 'exec-1', status: 'completed' });

      await executeCodeWithOptions(request, ['test'], true);
      expect(mockInvoke).toHaveBeenCalledWith('sandbox_execute_with_options', {
        request,
        tags: ['test'],
        saveToHistory: true,
      });
    });
  });

  describe('quickExecute', () => {
    it('should call invoke with language and code', async () => {
      mockInvoke.mockResolvedValue({ id: 'exec-1', status: 'completed' });

      await quickExecute('python', 'print("hello")');
      expect(mockInvoke).toHaveBeenCalledWith('sandbox_quick_execute', {
        language: 'python',
        code: 'print("hello")',
      });
    });
  });

  describe('executeWithStdin', () => {
    it('should call invoke with stdin', async () => {
      mockInvoke.mockResolvedValue({ id: 'exec-1', status: 'completed' });

      await executeWithStdin('python', 'x = input()', 'test input');
      expect(mockInvoke).toHaveBeenCalledWith('sandbox_execute_with_stdin', {
        language: 'python',
        code: 'x = input()',
        stdin: 'test input',
      });
    });
  });

  describe('executeWithLimits', () => {
    it('should call invoke with limits', async () => {
      mockInvoke.mockResolvedValue({ id: 'exec-1', status: 'completed' });

      await executeWithLimits('python', 'print(1)', 30, 256);
      expect(mockInvoke).toHaveBeenCalledWith('sandbox_execute_with_limits', {
        language: 'python',
        code: 'print(1)',
        timeoutSecs: 30,
        memoryMb: 256,
      });
    });
  });
});

describe('SandboxDb - Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSandboxStatus', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue({ available: true });
      await getSandboxStatus();
      expect(mockInvoke).toHaveBeenCalledWith('sandbox_get_status');
    });
  });

  describe('getSandboxConfig', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue({});
      await getSandboxConfig();
      expect(mockInvoke).toHaveBeenCalledWith('sandbox_get_config');
    });
  });

  describe('updateSandboxConfig', () => {
    it('should call invoke with config', async () => {
      const config = { preferred_runtime: 'docker' as const };
      mockInvoke.mockResolvedValue(undefined);
      await updateSandboxConfig(config as Parameters<typeof updateSandboxConfig>[0]);
      expect(mockInvoke).toHaveBeenCalledWith('sandbox_update_config', { config });
    });
  });

  describe('getAvailableRuntimes', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue(['docker', 'podman']);
      const result = await getAvailableRuntimes();
      expect(mockInvoke).toHaveBeenCalledWith('sandbox_get_runtimes');
      expect(result).toEqual(['docker', 'podman']);
    });
  });

  describe('getSupportedLanguages', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue([]);
      await getSupportedLanguages();
      expect(mockInvoke).toHaveBeenCalledWith('sandbox_get_languages');
    });
  });

  describe('checkRuntime', () => {
    it('should call invoke with runtime', async () => {
      mockInvoke.mockResolvedValue(true);
      const result = await checkRuntime('docker');
      expect(mockInvoke).toHaveBeenCalledWith('sandbox_check_runtime', { runtime: 'docker' });
      expect(result).toBe(true);
    });
  });

  describe('setPreferredRuntime', () => {
    it('should call invoke with runtime', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await setPreferredRuntime('podman');
      expect(mockInvoke).toHaveBeenCalledWith('sandbox_set_runtime', { runtime: 'podman' });
    });
  });

  describe('setDefaultTimeout', () => {
    it('should call invoke with timeout', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await setDefaultTimeout(60);
      expect(mockInvoke).toHaveBeenCalledWith('sandbox_set_timeout', { timeoutSecs: 60 });
    });
  });

  describe('setDefaultMemoryLimit', () => {
    it('should call invoke with memory limit', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await setDefaultMemoryLimit(512);
      expect(mockInvoke).toHaveBeenCalledWith('sandbox_set_memory_limit', { memoryMb: 512 });
    });
  });

  describe('setNetworkEnabled', () => {
    it('should call invoke with enabled flag', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await setNetworkEnabled(true);
      expect(mockInvoke).toHaveBeenCalledWith('sandbox_set_network', { enabled: true });
    });
  });

  describe('toggleLanguage', () => {
    it('should call invoke with language and enabled', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await toggleLanguage('rust', true);
      expect(mockInvoke).toHaveBeenCalledWith('sandbox_toggle_language', { language: 'rust', enabled: true });
    });
  });

  describe('prepareLanguage', () => {
    it('should call invoke with language', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await prepareLanguage('python');
      expect(mockInvoke).toHaveBeenCalledWith('sandbox_prepare_language', { language: 'python' });
    });
  });

  describe('getRuntimeInfo', () => {
    it('should call invoke with runtime', async () => {
      mockInvoke.mockResolvedValue(['docker', '24.0.0']);
      const result = await getRuntimeInfo('docker');
      expect(mockInvoke).toHaveBeenCalledWith('sandbox_get_runtime_info', { runtime: 'docker' });
      expect(result).toEqual(['docker', '24.0.0']);
    });
  });

  describe('cleanupSandbox', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await cleanupSandbox();
      expect(mockInvoke).toHaveBeenCalledWith('sandbox_cleanup');
    });
  });
});

describe('SandboxDb - Sessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startSession', () => {
    it('should call invoke with name and description', async () => {
      mockInvoke.mockResolvedValue({ id: 'session-1' });
      await startSession('Test Session', 'Description');
      expect(mockInvoke).toHaveBeenCalledWith('sandbox_start_session', {
        name: 'Test Session',
        description: 'Description',
      });
    });
  });

  describe('getCurrentSession', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue('session-1');
      const result = await getCurrentSession();
      expect(mockInvoke).toHaveBeenCalledWith('sandbox_get_current_session');
      expect(result).toBe('session-1');
    });
  });

  describe('setCurrentSession', () => {
    it('should call invoke with session id', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await setCurrentSession('session-1');
      expect(mockInvoke).toHaveBeenCalledWith('sandbox_set_current_session', { sessionId: 'session-1' });
    });
  });

  describe('endSession', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await endSession();
      expect(mockInvoke).toHaveBeenCalledWith('sandbox_end_session');
    });
  });

  describe('listSessions', () => {
    it('should call invoke with activeOnly', async () => {
      mockInvoke.mockResolvedValue([]);
      await listSessions(true);
      expect(mockInvoke).toHaveBeenCalledWith('sandbox_list_sessions', { activeOnly: true });
    });
  });

  describe('getSession', () => {
    it('should call invoke with id', async () => {
      mockInvoke.mockResolvedValue({ id: 'session-1' });
      await getSession('session-1');
      expect(mockInvoke).toHaveBeenCalledWith('sandbox_get_session', { id: 'session-1' });
    });
  });

  describe('deleteSession', () => {
    it('should call invoke with id and deleteExecutions', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await deleteSession('session-1', true);
      expect(mockInvoke).toHaveBeenCalledWith('sandbox_delete_session', { id: 'session-1', deleteExecutions: true });
    });
  });
});

describe('SandboxDb - Helper Functions', () => {
  describe('formatExecutionTime', () => {
    it('should format milliseconds', () => {
      expect(formatExecutionTime(500)).toBe('500ms');
      expect(formatExecutionTime(1500)).toBe('1.50s');
      expect(formatExecutionTime(65000)).toBe('1m 5.0s');
    });
  });

  describe('formatMemorySize', () => {
    it('should format bytes', () => {
      expect(formatMemorySize(500)).toBe('500 B');
      expect(formatMemorySize(1536)).toBe('1.5 KB');
      expect(formatMemorySize(1572864)).toBe('1.5 MB');
      expect(formatMemorySize(1610612736)).toBe('1.50 GB');
    });
  });

  describe('calculateSuccessRate', () => {
    it('should calculate percentage', () => {
      expect(calculateSuccessRate({ total_executions: 100, successful_executions: 75 } as Parameters<typeof calculateSuccessRate>[0])).toBe(75);
      expect(calculateSuccessRate({ total_executions: 0, successful_executions: 0 } as Parameters<typeof calculateSuccessRate>[0])).toBe(0);
    });
  });

  describe('getStatusColor', () => {
    it('should return correct colors', () => {
      expect(getStatusColor('completed')).toBe('text-green-500');
      expect(getStatusColor('failed')).toBe('text-red-500');
      expect(getStatusColor('timeout')).toBe('text-orange-500');
      expect(getStatusColor('running')).toBe('text-blue-500');
      expect(getStatusColor('pending')).toBe('text-gray-500');
      expect(getStatusColor('cancelled')).toBe('text-gray-400');
      expect(getStatusColor('unknown')).toBe('text-gray-500');
    });
  });

  describe('getStatusIcon', () => {
    it('should return correct icons', () => {
      expect(getStatusIcon('completed')).toBe('✓');
      expect(getStatusIcon('failed')).toBe('✗');
      expect(getStatusIcon('timeout')).toBe('⏱');
      expect(getStatusIcon('running')).toBe('⟳');
      expect(getStatusIcon('pending')).toBe('○');
      expect(getStatusIcon('cancelled')).toBe('⊘');
      expect(getStatusIcon('unknown')).toBe('?');
    });
  });
});

describe('SandboxDb - SandboxDbApi', () => {
  it('should expose all functions', () => {
    expect(SandboxDbApi.executeCode).toBe(executeCode);
    expect(SandboxDbApi.quickExecute).toBe(quickExecute);
    expect(SandboxDbApi.getSandboxStatus).toBe(getSandboxStatus);
    expect(SandboxDbApi.getSandboxConfig).toBe(getSandboxConfig);
    expect(SandboxDbApi.startSession).toBe(startSession);
    expect(SandboxDbApi.getExecution).toBe(getExecution);
    expect(SandboxDbApi.createSnippet).toBe(createSnippet);
    expect(SandboxDbApi.getLanguageStats).toBe(getLanguageStats);
    expect(SandboxDbApi.formatExecutionTime).toBe(formatExecutionTime);
    expect(SandboxDbApi.formatMemorySize).toBe(formatMemorySize);
  });
});
