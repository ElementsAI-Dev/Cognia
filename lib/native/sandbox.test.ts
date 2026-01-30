/**
 * Sandbox Service Tests
 */

import {
  DEFAULT_SANDBOX_CONFIG,
  LANGUAGE_INFO,
  EXTENSION_TO_LANGUAGE,
  getLanguageInfo,
  isValidLanguage,
  getLanguageFromExtension,
} from '@/types/system/sandbox';
import type {
  ExecutionRequest,
  SandboxExecutionResult,
  RuntimeType,
  BackendSandboxConfig,
  Language,
} from '@/types/system/sandbox';

// Mock Tauri invoke function
const mockInvoke = jest.fn();
jest.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

describe('Sandbox Types', () => {
  describe('DEFAULT_SANDBOX_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_SANDBOX_CONFIG.preferred_runtime).toBe('docker');
      expect(DEFAULT_SANDBOX_CONFIG.enable_docker).toBe(true);
      expect(DEFAULT_SANDBOX_CONFIG.enable_podman).toBe(true);
      expect(DEFAULT_SANDBOX_CONFIG.enable_native).toBe(false);
      expect(DEFAULT_SANDBOX_CONFIG.default_timeout_secs).toBe(30);
      expect(DEFAULT_SANDBOX_CONFIG.default_memory_limit_mb).toBe(256);
      expect(DEFAULT_SANDBOX_CONFIG.default_cpu_limit_percent).toBe(50);
      expect(DEFAULT_SANDBOX_CONFIG.network_enabled).toBe(false);
    });

    it('should have all major languages enabled', () => {
      const { enabled_languages } = DEFAULT_SANDBOX_CONFIG;
      expect(enabled_languages).toContain('python');
      expect(enabled_languages).toContain('javascript');
      expect(enabled_languages).toContain('typescript');
      expect(enabled_languages).toContain('go');
      expect(enabled_languages).toContain('rust');
      expect(enabled_languages).toContain('java');
    });

    it('should have 25 languages enabled by default', () => {
      expect(DEFAULT_SANDBOX_CONFIG.enabled_languages.length).toBe(25);
    });
  });

  describe('LANGUAGE_INFO', () => {
    it('should have info for all major languages', () => {
      expect(LANGUAGE_INFO.python).toBeDefined();
      expect(LANGUAGE_INFO.javascript).toBeDefined();
      expect(LANGUAGE_INFO.typescript).toBeDefined();
      expect(LANGUAGE_INFO.go).toBeDefined();
      expect(LANGUAGE_INFO.rust).toBeDefined();
    });

    it('should have name, icon, and color for each language', () => {
      Object.values(LANGUAGE_INFO).forEach((info) => {
        expect(info.name).toBeDefined();
        expect(info.icon).toBeDefined();
        expect(info.color).toBeDefined();
        expect(info.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });

    it('should have correct info for Python', () => {
      expect(LANGUAGE_INFO.python.name).toBe('Python');
      expect(LANGUAGE_INFO.python.icon).toBe('🐍');
      expect(LANGUAGE_INFO.python.color).toBe('#3776ab');
    });

    it('should have correct info for Rust', () => {
      expect(LANGUAGE_INFO.rust.name).toBe('Rust');
      expect(LANGUAGE_INFO.rust.icon).toBe('🦀');
    });
  });

  describe('getLanguageInfo', () => {
    it('should return correct info for valid languages', () => {
      const pythonInfo = getLanguageInfo('python');
      expect(pythonInfo.name).toBe('Python');
      expect(pythonInfo.icon).toBe('🐍');
    });

    it('should be case insensitive', () => {
      expect(getLanguageInfo('PYTHON').name).toBe('Python');
      expect(getLanguageInfo('Python').name).toBe('Python');
      expect(getLanguageInfo('pYtHoN').name).toBe('Python');
    });

    it('should return default info for unknown languages', () => {
      const unknownInfo = getLanguageInfo('unknownlang');
      expect(unknownInfo.name).toBe('unknownlang');
      expect(unknownInfo.icon).toBe('📄');
      expect(unknownInfo.color).toBe('#666666');
    });
  });

  describe('isValidLanguage', () => {
    it('should return true for valid languages', () => {
      expect(isValidLanguage('python')).toBe(true);
      expect(isValidLanguage('javascript')).toBe(true);
      expect(isValidLanguage('rust')).toBe(true);
    });

    it('should return false for invalid languages', () => {
      expect(isValidLanguage('unknownlang')).toBe(false);
      expect(isValidLanguage('')).toBe(false);
      expect(isValidLanguage('cobol')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isValidLanguage('PYTHON')).toBe(true);
      expect(isValidLanguage('Python')).toBe(true);
    });
  });

  describe('EXTENSION_TO_LANGUAGE', () => {
    it('should map common extensions correctly', () => {
      expect(EXTENSION_TO_LANGUAGE.py).toBe('python');
      expect(EXTENSION_TO_LANGUAGE.js).toBe('javascript');
      expect(EXTENSION_TO_LANGUAGE.ts).toBe('typescript');
      expect(EXTENSION_TO_LANGUAGE.rs).toBe('rust');
      expect(EXTENSION_TO_LANGUAGE.go).toBe('go');
    });

    it('should map C++ extensions correctly', () => {
      expect(EXTENSION_TO_LANGUAGE.cpp).toBe('cpp');
      expect(EXTENSION_TO_LANGUAGE.cxx).toBe('cpp');
      expect(EXTENSION_TO_LANGUAGE.cc).toBe('cpp');
    });

    it('should map shell extensions correctly', () => {
      expect(EXTENSION_TO_LANGUAGE.sh).toBe('bash');
      expect(EXTENSION_TO_LANGUAGE.bash).toBe('bash');
      expect(EXTENSION_TO_LANGUAGE.ps1).toBe('powershell');
    });
  });

  describe('getLanguageFromExtension', () => {
    it('should return correct language for valid extensions', () => {
      expect(getLanguageFromExtension('py')).toBe('python');
      expect(getLanguageFromExtension('js')).toBe('javascript');
      expect(getLanguageFromExtension('rs')).toBe('rust');
    });

    it('should handle extensions with leading dot', () => {
      expect(getLanguageFromExtension('.py')).toBe('python');
      expect(getLanguageFromExtension('.js')).toBe('javascript');
    });

    it('should be case insensitive', () => {
      expect(getLanguageFromExtension('PY')).toBe('python');
      expect(getLanguageFromExtension('.JS')).toBe('javascript');
    });

    it('should return null for unknown extensions', () => {
      expect(getLanguageFromExtension('xyz')).toBeNull();
      expect(getLanguageFromExtension('.unknown')).toBeNull();
    });
  });
});

describe('ExecutionRequest Type', () => {
  it('should accept minimal request', () => {
    const request: ExecutionRequest = {
      language: 'python',
      code: 'print("hello")',
    };
    expect(request.language).toBe('python');
    expect(request.code).toBe('print("hello")');
  });

  it('should accept full request with all options', () => {
    const request: ExecutionRequest = {
      language: 'python',
      code: 'x = input()',
      stdin: 'test input',
      args: ['--arg1', 'value'],
      env: { MY_VAR: 'value' },
      timeout_secs: 60,
      memory_limit_mb: 512,
      runtime: 'docker',
      files: { 'data.txt': 'file content' },
      network_enabled: false,
    };
    
    expect(request.stdin).toBe('test input');
    expect(request.args).toEqual(['--arg1', 'value']);
    expect(request.env).toEqual({ MY_VAR: 'value' });
    expect(request.timeout_secs).toBe(60);
    expect(request.memory_limit_mb).toBe(512);
    expect(request.runtime).toBe('docker');
    expect(request.files).toEqual({ 'data.txt': 'file content' });
    expect(request.network_enabled).toBe(false);
  });
});

describe('SandboxExecutionResult Type', () => {
  it('should represent successful execution', () => {
    const result: SandboxExecutionResult = {
      id: 'test-id',
      status: 'completed',
      stdout: 'Hello, World!',
      stderr: '',
      exit_code: 0,
      execution_time_ms: 150,
      memory_used_bytes: null,
      error: null,
      runtime: 'docker',
      language: 'python',
    };
    
    expect(result.status).toBe('completed');
    expect(result.exit_code).toBe(0);
    expect(result.stdout).toBe('Hello, World!');
  });

  it('should represent failed execution', () => {
    const result: SandboxExecutionResult = {
      id: 'test-id',
      status: 'failed',
      stdout: '',
      stderr: 'Error: division by zero',
      exit_code: 1,
      execution_time_ms: 50,
      memory_used_bytes: null,
      error: 'Runtime error',
      runtime: 'docker',
      language: 'python',
    };
    
    expect(result.status).toBe('failed');
    expect(result.exit_code).toBe(1);
    expect(result.error).toBe('Runtime error');
  });

  it('should represent timeout', () => {
    const result: SandboxExecutionResult = {
      id: 'test-id',
      status: 'timeout',
      stdout: 'partial output',
      stderr: '',
      exit_code: null,
      execution_time_ms: 30000,
      memory_used_bytes: null,
      error: 'Execution timeout after 30 seconds',
      runtime: 'docker',
      language: 'python',
    };
    
    expect(result.status).toBe('timeout');
    expect(result.exit_code).toBeNull();
    expect(result.error).toContain('timeout');
  });
});

describe('RuntimeType', () => {
  it('should accept valid runtime types', () => {
    const docker: RuntimeType = 'docker';
    const podman: RuntimeType = 'podman';
    const native: RuntimeType = 'native';
    
    expect(docker).toBe('docker');
    expect(podman).toBe('podman');
    expect(native).toBe('native');
  });
});

describe('BackendSandboxConfig Type', () => {
  it('should be assignable from default config', () => {
    const config: BackendSandboxConfig = { ...DEFAULT_SANDBOX_CONFIG };
    expect(config.preferred_runtime).toBe('docker');
  });

  it('should allow partial overrides', () => {
    const config: BackendSandboxConfig = {
      ...DEFAULT_SANDBOX_CONFIG,
      preferred_runtime: 'podman',
      default_timeout_secs: 60,
      network_enabled: true,
    };
    
    expect(config.preferred_runtime).toBe('podman');
    expect(config.default_timeout_secs).toBe(60);
    expect(config.network_enabled).toBe(true);
    // Unchanged from default
    expect(config.enable_docker).toBe(true);
  });
});

describe('Language Type', () => {
  it('should have correct structure', () => {
    const lang: Language = {
      id: 'python',
      name: 'Python',
      extension: 'py',
      category: 'interpreted',
    };
    
    expect(lang.id).toBe('python');
    expect(lang.category).toBe('interpreted');
  });

  it('should accept all category types', () => {
    const categories = ['interpreted', 'compiled', 'jit', 'shell'] as const;
    categories.forEach((cat) => {
      const lang: Language = {
        id: 'test',
        name: 'Test',
        extension: 'test',
        category: cat,
      };
      expect(lang.category).toBe(cat);
    });
  });
});

describe('New Sandbox API Functions', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  describe('getAllLanguages', () => {
    it('should call sandbox_get_all_languages command', async () => {
      const mockLanguages: Language[] = [
        { id: 'python', name: 'Python', extension: 'py', category: 'interpreted' },
        { id: 'javascript', name: 'JavaScript', extension: 'js', category: 'interpreted' },
      ];
      mockInvoke.mockResolvedValue(mockLanguages);

      const { getAllLanguages } = await import('@/lib/native/sandbox');
      const result = await getAllLanguages();

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_get_all_languages');
      expect(result).toEqual(mockLanguages);
    });

    it('should throw error if not in Tauri environment', async () => {
      delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;

      const { getAllLanguages } = await import('@/lib/native/sandbox');
      await expect(getAllLanguages()).rejects.toThrow('Sandbox requires Tauri environment');
    });
  });

  describe('getAvailableLanguages', () => {
    it('should call sandbox_get_available_languages command', async () => {
      const mockLanguages = ['python', 'javascript', 'bash'];
      mockInvoke.mockResolvedValue(mockLanguages);

      const { getAvailableLanguages } = await import('@/lib/native/sandbox');
      const result = await getAvailableLanguages();

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_get_available_languages');
      expect(result).toEqual(mockLanguages);
    });
  });

  describe('updateSession', () => {
    it('should call sandbox_update_session command', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { updateSession } = await import('@/lib/native/sandbox');
      await updateSession('session-123', 'Updated Session Name', 'Updated description');

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_update_session', {
        session_id: 'session-123',
        name: 'Updated Session Name',
        description: 'Updated description',
      });
    });

    it('should handle optional description', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { updateSession } = await import('@/lib/native/sandbox');
      await updateSession('session-123', 'Updated Session Name');

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_update_session', {
        session_id: 'session-123',
        name: 'Updated Session Name',
        description: undefined,
      });
    });
  });

  describe('getSessionExecutions', () => {
    it('should call sandbox_get_session_executions command', async () => {
      const mockExecutions: ExecutionRequest[] = [
        {
          language: 'python',
          code: 'print("hello")',
          stdin: undefined,
          args: [],
          env: {},
          timeout_secs: 30,
          memory_limit_mb: 256,
          runtime: 'docker',
          files: {},
          network_enabled: false,
        },
      ];
      mockInvoke.mockResolvedValue(mockExecutions);

      const { getSessionExecutions } = await import('@/lib/native/sandbox');
      const result = await getSessionExecutions('session-123');

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_get_session_executions', {
        session_id: 'session-123',
      });
      expect(result).toEqual(mockExecutions);
    });
  });
});
