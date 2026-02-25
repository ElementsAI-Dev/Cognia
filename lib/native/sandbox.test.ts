/**
 * Sandbox Service Tests
 */

import {
  DEFAULT_SANDBOX_CONFIG,
  LANGUAGE_INFO,
  LANGUAGE_TEMPLATES,
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
  OutputLine,
  ExecutionStatus,
  LanguageCategory,
  CompilerSettings,
  SandboxExecutionRecord,
  CodeSnippet,
  ExecutionSession,
  LanguageStats,
  SandboxStats,
  ExecutionFilter,
  SnippetFilter,
  CreateSnippetRequest,
  DailyExecutionCount,
  RuntimeStatus,
  SandboxStatus,
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
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
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

  describe('parameter serialization', () => {
    it('should send snake_case timeout and memory args', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { setDefaultTimeout, setMemoryLimit } = await import('@/lib/native/sandbox');
      await setDefaultTimeout(42);
      await setMemoryLimit(768);

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_set_timeout', {
        timeout_secs: 42,
      });
      expect(mockInvoke).toHaveBeenCalledWith('sandbox_set_memory_limit', {
        memory_mb: 768,
      });
    });

    it('should send save_to_history in executeWithOptions', async () => {
      mockInvoke.mockResolvedValue({ id: 'exec', status: 'completed' });

      const { executeWithOptions } = await import('@/lib/native/sandbox');
      await executeWithOptions({ language: 'python', code: 'print(1)' }, ['x'], true);

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_execute_with_options', {
        request: { language: 'python', code: 'print(1)' },
        tags: ['x'],
        save_to_history: true,
      });
    });
  });

  describe('executeCodeStreaming', () => {
    it('should call sandbox_execute_streaming command', async () => {
      const mockResult: SandboxExecutionResult = {
        id: 'stream-exec-1',
        status: 'completed',
        stdout: 'Hello streaming',
        stderr: '',
        exit_code: 0,
        execution_time_ms: 200,
        memory_used_bytes: null,
        error: null,
        runtime: 'native',
        language: 'python',
      };
      mockInvoke.mockResolvedValue(mockResult);

      const { executeCodeStreaming } = await import('@/lib/native/sandbox');
      const result = await executeCodeStreaming({ language: 'python', code: 'print("hi")' });

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_execute_streaming', {
        request: { language: 'python', code: 'print("hi")' },
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('importData', () => {
    it('should call sandbox_import_data command', async () => {
      const mockImportResult = { imported_snippets: 3, skipped_snippets: 1 };
      mockInvoke.mockResolvedValue(mockImportResult);

      const { importData } = await import('@/lib/native/sandbox');
      const result = await importData('{"version":"1.0","snippets":[]}');

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_import_data', {
        json_data: '{"version":"1.0","snippets":[]}',
      });
      expect(result).toEqual(mockImportResult);
    });

    it('should handle empty import', async () => {
      mockInvoke.mockResolvedValue({ imported_snippets: 0, skipped_snippets: 0 });

      const { importData } = await import('@/lib/native/sandbox');
      const result = await importData('{"version":"1.0"}');

      expect(result.imported_snippets).toBe(0);
      expect(result.skipped_snippets).toBe(0);
    });
  });

  describe('cancelExecution', () => {
    it('should call sandbox_cancel_execution command', async () => {
      mockInvoke.mockResolvedValue(true);

      const { cancelExecution } = await import('@/lib/native/sandbox');
      const result = await cancelExecution('exec-to-cancel');

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_cancel_execution', {
        execution_id: 'exec-to-cancel',
      });
      expect(result).toBe(true);
    });

    it('should return false for unknown execution', async () => {
      mockInvoke.mockResolvedValue(false);

      const { cancelExecution } = await import('@/lib/native/sandbox');
      const result = await cancelExecution('nonexistent');
      expect(result).toBe(false);
    });
  });
});

describe('OutputLine Type', () => {
  it('should represent stdout output', () => {
    const line: OutputLine = {
      execution_id: 'exec-1',
      stream: 'stdout',
      text: 'Hello, World!',
      timestamp_ms: 42,
    };
    expect(line.execution_id).toBe('exec-1');
    expect(line.stream).toBe('stdout');
    expect(line.text).toBe('Hello, World!');
    expect(line.timestamp_ms).toBe(42);
  });

  it('should represent stderr output', () => {
    const line: OutputLine = {
      execution_id: 'exec-2',
      stream: 'stderr',
      text: 'Error: something went wrong',
      timestamp_ms: 100,
    };
    expect(line.stream).toBe('stderr');
  });

  it('should only accept stdout or stderr as stream', () => {
    const stdoutLine: OutputLine = {
      execution_id: 'exec-1',
      stream: 'stdout',
      text: 'output',
      timestamp_ms: 0,
    };
    const stderrLine: OutputLine = {
      execution_id: 'exec-1',
      stream: 'stderr',
      text: 'error',
      timestamp_ms: 1,
    };
    expect(['stdout', 'stderr']).toContain(stdoutLine.stream);
    expect(['stdout', 'stderr']).toContain(stderrLine.stream);
  });
});

describe('ExecutionRequest with CompilerSettings', () => {
  it('should accept request without compiler_settings', () => {
    const request: ExecutionRequest = {
      language: 'python',
      code: 'print("hello")',
    };
    expect(request.compiler_settings).toBeUndefined();
  });

  it('should accept request with C++ compiler settings', () => {
    const request: ExecutionRequest = {
      language: 'cpp',
      code: 'int main() {}',
      compiler_settings: {
        cpp_standard: 'c++20',
        optimization: '-O2',
        cpp_compiler: 'clang++',
        enable_warnings: true,
      },
    };
    expect(request.compiler_settings).toBeDefined();
    expect(request.compiler_settings?.cpp_standard).toBe('c++20');
    expect(request.compiler_settings?.optimization).toBe('-O2');
    expect(request.compiler_settings?.cpp_compiler).toBe('clang++');
    expect(request.compiler_settings?.enable_warnings).toBe(true);
  });

  it('should accept request with Rust compiler settings', () => {
    const request: ExecutionRequest = {
      language: 'rust',
      code: 'fn main() {}',
      compiler_settings: {
        rust_edition: '2021',
        rust_release: true,
      },
    };
    expect(request.compiler_settings?.rust_edition).toBe('2021');
    expect(request.compiler_settings?.rust_release).toBe(true);
  });

  it('should accept request with Python interpreter settings', () => {
    const request: ExecutionRequest = {
      language: 'python',
      code: 'print(1)',
      compiler_settings: {
        python_unbuffered: true,
        python_optimize: true,
      },
    };
    expect(request.compiler_settings?.python_unbuffered).toBe(true);
    expect(request.compiler_settings?.python_optimize).toBe(true);
  });

  it('should accept all compiler settings fields', () => {
    const request: ExecutionRequest = {
      language: 'c',
      code: 'int main() { return 0; }',
      compiler_settings: {
        cpp_standard: 'c++17',
        optimization: '-O3',
        c_compiler: 'clang',
        cpp_compiler: 'clang++',
        enable_warnings: true,
        rust_edition: '2021',
        rust_release: true,
        python_unbuffered: true,
        python_optimize: false,
        custom_args: ['-DFOO=1', '-lm'],
      },
    };
    expect(request.compiler_settings?.c_compiler).toBe('clang');
    expect(request.compiler_settings?.custom_args).toEqual(['-DFOO=1', '-lm']);
  });
});

// ==================== LANGUAGE_TEMPLATES Tests ====================

describe('LANGUAGE_TEMPLATES', () => {
  it('should have templates for all languages in LANGUAGE_INFO', () => {
    Object.keys(LANGUAGE_INFO).forEach((langId) => {
      expect(LANGUAGE_TEMPLATES[langId]).toBeDefined();
      expect(typeof LANGUAGE_TEMPLATES[langId]).toBe('string');
      expect(LANGUAGE_TEMPLATES[langId].length).toBeGreaterThan(0);
    });
  });

  it('should have Hello World in most templates', () => {
    const helloWorldLangs = ['python', 'javascript', 'typescript', 'go', 'rust', 'java', 'c', 'cpp'];
    helloWorldLangs.forEach((lang) => {
      expect(LANGUAGE_TEMPLATES[lang]).toContain('Hello');
    });
  });
});

// ==================== ExecutionStatus & LanguageCategory Types ====================

describe('ExecutionStatus Type', () => {
  it('should accept all valid status values', () => {
    const statuses: ExecutionStatus[] = ['pending', 'running', 'completed', 'failed', 'timeout', 'cancelled'];
    expect(statuses).toHaveLength(6);
    statuses.forEach((s) => expect(typeof s).toBe('string'));
  });
});

describe('LanguageCategory Type', () => {
  it('should accept all valid categories', () => {
    const categories: LanguageCategory[] = ['interpreted', 'compiled', 'jit', 'shell'];
    expect(categories).toHaveLength(4);
  });
});

// ==================== CompilerSettings (camelCase) Type ====================

describe('CompilerSettings Type (camelCase)', () => {
  it('should accept all settings fields', () => {
    const settings: CompilerSettings = {
      cppStandard: 'c++20',
      optimization: '-O2',
      cCompiler: 'clang',
      cppCompiler: 'clang++',
      enableWarnings: true,
      rustEdition: '2021',
      rustRelease: true,
      pythonUnbuffered: true,
      pythonOptimize: false,
      customArgs: ['-DFOO=1'],
    };
    expect(settings.cppStandard).toBe('c++20');
    expect(settings.rustEdition).toBe('2021');
    expect(settings.customArgs).toEqual(['-DFOO=1']);
  });

  it('should accept empty/partial settings', () => {
    const settings: CompilerSettings = {};
    expect(settings.cppStandard).toBeUndefined();
    expect(settings.optimization).toBeUndefined();
  });
});

// ==================== Database Types ====================

describe('SandboxExecutionRecord Type', () => {
  it('should accept a full execution record', () => {
    const record: SandboxExecutionRecord = {
      id: 'exec-1',
      session_id: 'sess-1',
      language: 'python',
      code: 'print(1)',
      stdin: null,
      stdout: '1\n',
      stderr: '',
      exit_code: 0,
      status: 'completed',
      runtime: 'docker',
      execution_time_ms: 150,
      memory_used_bytes: 4096,
      error: null,
      created_at: '2024-01-01T00:00:00Z',
      tags: ['test'],
      is_favorite: false,
    };
    expect(record.id).toBe('exec-1');
    expect(record.status).toBe('completed');
    expect(record.tags).toContain('test');
  });
});

describe('CodeSnippet Type', () => {
  it('should accept a full snippet', () => {
    const snippet: CodeSnippet = {
      id: 'snip-1',
      title: 'Hello World',
      description: 'A basic example',
      language: 'python',
      code: 'print("Hello")',
      tags: ['example', 'beginner'],
      category: 'basics',
      is_template: false,
      usage_count: 5,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    };
    expect(snippet.title).toBe('Hello World');
    expect(snippet.tags).toHaveLength(2);
    expect(snippet.usage_count).toBe(5);
  });
});

describe('ExecutionSession Type', () => {
  it('should accept a full session', () => {
    const session: ExecutionSession = {
      id: 'sess-1',
      name: 'Debug Session',
      description: 'Debugging the sort algorithm',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T01:00:00Z',
      execution_count: 12,
      is_active: true,
    };
    expect(session.name).toBe('Debug Session');
    expect(session.is_active).toBe(true);
    expect(session.execution_count).toBe(12);
  });
});

describe('LanguageStats Type', () => {
  it('should accept full stats', () => {
    const stats: LanguageStats = {
      language: 'python',
      total_executions: 100,
      successful_executions: 85,
      failed_executions: 10,
      timeout_executions: 5,
      total_execution_time_ms: 50000,
      avg_execution_time_ms: 500,
      total_memory_used_bytes: 1048576,
      last_used: '2024-01-15T12:00:00Z',
    };
    expect(stats.language).toBe('python');
    expect(stats.total_executions).toBe(100);
    expect(stats.successful_executions + stats.failed_executions + stats.timeout_executions).toBe(100);
  });
});

describe('SandboxStats Type', () => {
  it('should accept full sandbox stats', () => {
    const stats: SandboxStats = {
      total_executions: 200,
      successful_executions: 160,
      failed_executions: 30,
      timeout_executions: 10,
      total_execution_time_ms: 100000,
      avg_execution_time_ms: 500,
      total_snippets: 15,
      total_sessions: 8,
      most_used_language: 'python',
      languages: [],
    };
    expect(stats.total_executions).toBe(200);
    expect(stats.most_used_language).toBe('python');
  });
});

describe('ExecutionFilter Type', () => {
  it('should accept all filter fields', () => {
    const filter: ExecutionFilter = {
      language: 'python',
      status: 'completed',
      runtime: 'docker',
      session_id: 'sess-1',
      tags: ['important'],
      is_favorite: true,
      from_date: '2024-01-01T00:00:00Z',
      to_date: '2024-12-31T23:59:59Z',
      search_query: 'hello',
      limit: 50,
      offset: 0,
    };
    expect(filter.language).toBe('python');
    expect(filter.limit).toBe(50);
  });

  it('should accept empty filter', () => {
    const filter: ExecutionFilter = {};
    expect(filter.language).toBeUndefined();
  });
});

describe('SnippetFilter Type', () => {
  it('should accept all filter fields', () => {
    const filter: SnippetFilter = {
      language: 'rust',
      category: 'algorithms',
      tags: ['sorting'],
      is_template: true,
      search_query: 'quick sort',
      limit: 20,
      offset: 10,
    };
    expect(filter.language).toBe('rust');
    expect(filter.is_template).toBe(true);
  });
});

describe('CreateSnippetRequest Type', () => {
  it('should accept a full create request', () => {
    const req: CreateSnippetRequest = {
      title: 'Quick Sort',
      description: 'Efficient sorting algorithm',
      language: 'python',
      code: 'def quicksort(arr): ...',
      tags: ['algorithm', 'sorting'],
      category: 'algorithms',
      is_template: false,
    };
    expect(req.title).toBe('Quick Sort');
    expect(req.is_template).toBe(false);
  });
});

describe('DailyExecutionCount Type', () => {
  it('should accept daily count', () => {
    const count: DailyExecutionCount = {
      date: '2024-01-15',
      count: 42,
    };
    expect(count.date).toBe('2024-01-15');
    expect(count.count).toBe(42);
  });
});

describe('RuntimeStatus Type', () => {
  it('should represent available runtime', () => {
    const status: RuntimeStatus = {
      runtime_type: 'docker',
      available: true,
      version: '24.0.5',
    };
    expect(status.available).toBe(true);
    expect(status.version).toBe('24.0.5');
  });

  it('should represent unavailable runtime', () => {
    const status: RuntimeStatus = {
      runtime_type: 'podman',
      available: false,
      version: null,
    };
    expect(status.available).toBe(false);
    expect(status.version).toBeNull();
  });
});

describe('SandboxStatus Type', () => {
  it('should accept full status', () => {
    const status: SandboxStatus = {
      available_runtimes: [
        { runtime_type: 'docker', available: true, version: '24.0' },
        { runtime_type: 'native', available: true, version: null },
      ],
      supported_languages: [
        { id: 'python', name: 'Python', extension: 'py', category: 'interpreted' },
      ],
      config: DEFAULT_SANDBOX_CONFIG,
    };
    expect(status.available_runtimes).toHaveLength(2);
    expect(status.supported_languages[0].id).toBe('python');
  });
});

// ==================== Remaining Sandbox API Functions ====================

describe('Sandbox Service Functions (complete coverage)', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
  });

  describe('executeCode', () => {
    it('should call sandbox_execute command', async () => {
      const mockResult: SandboxExecutionResult = {
        id: 'exec-1', status: 'completed', stdout: 'ok', stderr: '',
        exit_code: 0, execution_time_ms: 100, memory_used_bytes: null,
        error: null, runtime: 'docker', language: 'python',
      };
      mockInvoke.mockResolvedValue(mockResult);

      const { executeCode } = await import('@/lib/native/sandbox');
      const result = await executeCode({ language: 'python', code: 'print("ok")' });

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_execute', {
        request: { language: 'python', code: 'print("ok")' },
      });
      expect(result.stdout).toBe('ok');
    });
  });

  describe('quickExecute', () => {
    it('should call sandbox_quick_execute command', async () => {
      mockInvoke.mockResolvedValue({ id: 'q1', status: 'completed', stdout: '42' });

      const { quickExecute } = await import('@/lib/native/sandbox');
      await quickExecute('python', 'print(42)');

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_quick_execute', {
        language: 'python',
        code: 'print(42)',
      });
    });
  });

  describe('executeWithStdin', () => {
    it('should call sandbox_execute_with_stdin command', async () => {
      mockInvoke.mockResolvedValue({ id: 'e1', status: 'completed' });

      const { executeWithStdin } = await import('@/lib/native/sandbox');
      await executeWithStdin('python', 'x=input()', 'hello');

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_execute_with_stdin', {
        language: 'python',
        code: 'x=input()',
        stdin: 'hello',
      });
    });
  });

  describe('executeWithLimits', () => {
    it('should call sandbox_execute_with_limits with correct args', async () => {
      mockInvoke.mockResolvedValue({ id: 'l1', status: 'completed' });

      const { executeWithLimits } = await import('@/lib/native/sandbox');
      await executeWithLimits('go', 'package main', 60, 1024);

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_execute_with_limits', {
        language: 'go',
        code: 'package main',
        timeout_secs: 60,
        memory_mb: 1024,
      });
    });
  });

  describe('getSandboxStatus', () => {
    it('should call sandbox_get_status command', async () => {
      mockInvoke.mockResolvedValue({
        available_runtimes: [],
        supported_languages: [],
        config: DEFAULT_SANDBOX_CONFIG,
      });

      const { getSandboxStatus } = await import('@/lib/native/sandbox');
      const status = await getSandboxStatus();

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_get_status');
      expect(status.config).toBeDefined();
    });
  });

  describe('getBackendSandboxConfig', () => {
    it('should call sandbox_get_config command', async () => {
      mockInvoke.mockResolvedValue(DEFAULT_SANDBOX_CONFIG);

      const { getBackendSandboxConfig } = await import('@/lib/native/sandbox');
      const config = await getBackendSandboxConfig();

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_get_config');
      expect(config.preferred_runtime).toBe('docker');
    });
  });

  describe('getAvailableRuntimes', () => {
    it('should call sandbox_get_runtimes command', async () => {
      mockInvoke.mockResolvedValue(['docker', 'native']);

      const { getAvailableRuntimes } = await import('@/lib/native/sandbox');
      const runtimes = await getAvailableRuntimes();

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_get_runtimes');
      expect(runtimes).toContain('docker');
    });
  });

  describe('getSupportedLanguages', () => {
    it('should call sandbox_get_languages command', async () => {
      const langs: Language[] = [
        { id: 'python', name: 'Python', extension: 'py', category: 'interpreted' },
      ];
      mockInvoke.mockResolvedValue(langs);

      const { getSupportedLanguages } = await import('@/lib/native/sandbox');
      const result = await getSupportedLanguages();

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_get_languages');
      expect(result[0].id).toBe('python');
    });
  });

  describe('checkRuntime', () => {
    it('should call sandbox_check_runtime command', async () => {
      mockInvoke.mockResolvedValue(true);

      const { checkRuntime } = await import('@/lib/native/sandbox');
      const available = await checkRuntime('docker');

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_check_runtime', { runtime: 'docker' });
      expect(available).toBe(true);
    });
  });

  describe('getRuntimeInfo', () => {
    it('should call sandbox_get_runtime_info command', async () => {
      mockInvoke.mockResolvedValue(['native', 'native-1.0']);

      const { getRuntimeInfo } = await import('@/lib/native/sandbox');
      const info = await getRuntimeInfo('native');

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_get_runtime_info', { runtime: 'native' });
      expect(info).toEqual(['native', 'native-1.0']);
    });

    it('should return null for unavailable runtime', async () => {
      mockInvoke.mockResolvedValue(null);

      const { getRuntimeInfo } = await import('@/lib/native/sandbox');
      const info = await getRuntimeInfo('podman');
      expect(info).toBeNull();
    });
  });

  describe('prepareLanguage', () => {
    it('should call sandbox_prepare_language command', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { prepareLanguage } = await import('@/lib/native/sandbox');
      await prepareLanguage('python');

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_prepare_language', { language: 'python' });
    });
  });

  describe('toggleLanguage', () => {
    it('should call sandbox_toggle_language to enable', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { toggleLanguage } = await import('@/lib/native/sandbox');
      await toggleLanguage('zig', true);

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_toggle_language', {
        language: 'zig',
        enabled: true,
      });
    });

    it('should call sandbox_toggle_language to disable', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { toggleLanguage } = await import('@/lib/native/sandbox');
      await toggleLanguage('zig', false);

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_toggle_language', {
        language: 'zig',
        enabled: false,
      });
    });
  });

  describe('setPreferredRuntime', () => {
    it('should call sandbox_set_runtime command', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { setPreferredRuntime } = await import('@/lib/native/sandbox');
      await setPreferredRuntime('native');

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_set_runtime', { runtime: 'native' });
    });
  });

  describe('setNetworkEnabled', () => {
    it('should call sandbox_set_network command', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { setNetworkEnabled } = await import('@/lib/native/sandbox');
      await setNetworkEnabled(true);

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_set_network', { enabled: true });
    });
  });

  describe('exportData', () => {
    it('should call sandbox_export_data command', async () => {
      mockInvoke.mockResolvedValue('{"version":"1.0","snippets":[]}');

      const { exportData } = await import('@/lib/native/sandbox');
      const data = await exportData();

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_export_data');
      expect(data).toContain('version');
    });
  });

  describe('getDatabaseSize', () => {
    it('should call sandbox_get_db_size command', async () => {
      mockInvoke.mockResolvedValue(1048576);

      const { getDatabaseSize } = await import('@/lib/native/sandbox');
      const size = await getDatabaseSize();

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_get_db_size');
      expect(size).toBe(1048576);
    });
  });

  describe('vacuumDatabase', () => {
    it('should call sandbox_vacuum_db command', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { vacuumDatabase } = await import('@/lib/native/sandbox');
      await vacuumDatabase();

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_vacuum_db');
    });
  });

  describe('cleanupRuntimes', () => {
    it('should call sandbox_cleanup command', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { cleanupRuntimes } = await import('@/lib/native/sandbox');
      await cleanupRuntimes();

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_cleanup');
    });
  });

  describe('updateBackendSandboxConfig', () => {
    it('should call sandbox_update_config command', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { updateBackendSandboxConfig } = await import('@/lib/native/sandbox');
      await updateBackendSandboxConfig(DEFAULT_SANDBOX_CONFIG);

      expect(mockInvoke).toHaveBeenCalledWith('sandbox_update_config', {
        config: DEFAULT_SANDBOX_CONFIG,
      });
    });
  });

  describe('isSandboxAvailable', () => {
    it('should return true when runtimes available', async () => {
      mockInvoke.mockResolvedValue(['docker']);

      const { isSandboxAvailable } = await import('@/lib/native/sandbox');
      const available = await isSandboxAvailable();

      expect(available).toBe(true);
    });

    it('should return false when no runtimes', async () => {
      mockInvoke.mockResolvedValue([]);

      const { isSandboxAvailable } = await import('@/lib/native/sandbox');
      const available = await isSandboxAvailable();

      expect(available).toBe(false);
    });

    it('should return false when not in Tauri', async () => {
      delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;

      const { isSandboxAvailable } = await import('@/lib/native/sandbox');
      const available = await isSandboxAvailable();

      expect(available).toBe(false);
    });
  });
});

// ==================== Error Handling Tests ====================

describe('Sandbox Service Error Handling', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  it('should throw when executeCode called outside Tauri', async () => {
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;

    const { executeCode } = await import('@/lib/native/sandbox');
    await expect(executeCode({ language: 'python', code: 'pass' })).rejects.toThrow(
      'Sandbox requires Tauri environment'
    );
  });

  it('should throw when quickExecute called outside Tauri', async () => {
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;

    const { quickExecute } = await import('@/lib/native/sandbox');
    await expect(quickExecute('python', 'pass')).rejects.toThrow(
      'Sandbox requires Tauri environment'
    );
  });

  it('should throw when checkRuntime called outside Tauri', async () => {
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;

    const { checkRuntime } = await import('@/lib/native/sandbox');
    await expect(checkRuntime('docker')).rejects.toThrow('Sandbox requires Tauri environment');
  });

  it('should normalize backend errors with command name', async () => {
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    mockInvoke.mockRejectedValue(new Error('Language not found'));

    const { executeCode } = await import('@/lib/native/sandbox');
    await expect(executeCode({ language: 'unknown', code: '' })).rejects.toThrow(
      '[sandbox:sandbox_execute] Language not found'
    );
  });

  it('should normalize non-Error backend failures', async () => {
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    mockInvoke.mockRejectedValue('string error');

    const { exportData } = await import('@/lib/native/sandbox');
    await expect(exportData()).rejects.toThrow('[sandbox:sandbox_export_data] string error');
  });
});

// ==================== sandboxService Object Shape ====================

describe('sandboxService object', () => {
  it('should export all expected methods', async () => {
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    const { sandboxService } = await import('@/lib/native/sandbox');

    const expectedMethods = [
      'execute', 'quickExecute', 'executeWithStdin', 'executeWithLimits',
      'executeWithOptions', 'getStatus', 'getConfig', 'updateConfig',
      'getRuntimes', 'getLanguages', 'getAllLanguages', 'getAvailableLanguages',
      'checkRuntime', 'getRuntimeInfo', 'prepareLanguage', 'toggleLanguage',
      'setRuntime', 'setTimeout', 'setMemoryLimit', 'setNetworkEnabled',
      'cancelExecution', 'executeStreaming', 'cleanup', 'isAvailable',
      'exportData', 'importData', 'getDatabaseSize', 'vacuumDatabase',
    ];

    expectedMethods.forEach((method) => {
      expect(typeof (sandboxService as Record<string, unknown>)[method]).toBe('function');
    });
  });
});
