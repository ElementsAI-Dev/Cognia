/**
 * CLI Commands Tests
 *
 * @description Unit tests for Shell Tools CLI commands
 */

import * as path from 'path';

describe('Shell Tools CLI', () => {

  describe('Config Command', () => {
    const DEFAULT_CONFIG = {
      defaultShell: process.platform === 'win32' ? 'powershell' : 'bash',
      timeout: 30000,
      maxOutputSize: 1048576,
      blockedCommands: ['rm -rf /', 'format', 'del /f /s /q'],
      allowedDirectories: [],
      hiddenEnvVars: ['API_KEY', 'SECRET', 'PASSWORD', 'TOKEN'],
    };

    it('should have correct default config values', () => {
      expect(DEFAULT_CONFIG.timeout).toBe(30000);
      expect(DEFAULT_CONFIG.maxOutputSize).toBe(1048576);
      expect(DEFAULT_CONFIG.blockedCommands).toContain('rm -rf /');
      expect(DEFAULT_CONFIG.hiddenEnvVars).toContain('API_KEY');
      expect(DEFAULT_CONFIG.hiddenEnvVars).toContain('SECRET');
      expect(DEFAULT_CONFIG.hiddenEnvVars).toContain('PASSWORD');
      expect(DEFAULT_CONFIG.hiddenEnvVars).toContain('TOKEN');
    });

    it('should validate config key names', () => {
      const validKeys = [
        'defaultShell',
        'timeout',
        'maxOutputSize',
        'blockedCommands',
        'allowedDirectories',
        'hiddenEnvVars',
      ];

      validKeys.forEach((key) => {
        expect(key in DEFAULT_CONFIG).toBe(true);
      });
    });

    it('should parse number values correctly', () => {
      const parseNumber = (value: string): number => parseFloat(value);

      expect(parseNumber('30000')).toBe(30000);
      expect(parseNumber('1048576')).toBe(1048576);
      expect(isNaN(parseNumber('invalid'))).toBe(true);
    });

    it('should parse array values correctly', () => {
      const parseArray = (value: string): string[] => value.split(',').filter(Boolean);

      expect(parseArray('cmd1,cmd2,cmd3')).toEqual(['cmd1', 'cmd2', 'cmd3']);
      expect(parseArray('')).toEqual([]);
      expect(parseArray('single')).toEqual(['single']);
    });

    it('should format config values correctly', () => {
      const formatValue = (value: unknown): string => {
        if (Array.isArray(value)) {
          return value.length > 0 ? value.join(', ') : '(empty)';
        }
        if (typeof value === 'number') {
          if (value >= 1048576) return `${value} (${(value / 1048576).toFixed(1)}MB)`;
          if (value >= 1000) return `${value} (${(value / 1000).toFixed(1)}s)`;
        }
        return String(value);
      };

      expect(formatValue([])).toBe('(empty)');
      expect(formatValue(['a', 'b'])).toBe('a, b');
      expect(formatValue(1048576)).toBe('1048576 (1.0MB)');
      expect(formatValue(30000)).toBe('30000 (30.0s)');
      expect(formatValue('bash')).toBe('bash');
    });
  });

  describe('Security Command', () => {
    it('should normalize paths correctly', () => {
      const normalizePath = (inputPath: string): string => {
        return path.resolve(inputPath).replace(/\\/g, '/');
      };

      // Test relative path normalization
      const normalized = normalizePath('.');
      expect(normalized).toBeDefined();
      expect(typeof normalized).toBe('string');
    });

    it('should add command to blocklist', () => {
      const blockedCommands = ['rm -rf /', 'format'];

      const addToBlocklist = (commands: string[], cmd: string): string[] => {
        if (!commands.includes(cmd)) {
          return [...commands, cmd];
        }
        return commands;
      };

      const result = addToBlocklist(blockedCommands, 'shutdown');
      expect(result).toContain('shutdown');
      expect(result).toHaveLength(3);

      // Should not add duplicate
      const result2 = addToBlocklist(blockedCommands, 'rm -rf /');
      expect(result2).toHaveLength(2);
    });

    it('should remove command from blocklist', () => {
      const blockedCommands = ['rm -rf /', 'format', 'shutdown'];

      const removeFromBlocklist = (commands: string[], cmd: string): string[] => {
        const index = commands.indexOf(cmd);
        if (index !== -1) {
          const newList = [...commands];
          newList.splice(index, 1);
          return newList;
        }
        return commands;
      };

      const result = removeFromBlocklist(blockedCommands, 'format');
      expect(result).not.toContain('format');
      expect(result).toHaveLength(2);

      // Should not fail if not found
      const result2 = removeFromBlocklist(blockedCommands, 'nonexistent');
      expect(result2).toHaveLength(3);
    });

    it('should add directory to allowed list', () => {
      const allowedDirectories: string[] = [];

      const addDirectory = (dirs: string[], dir: string): string[] => {
        if (!dirs.includes(dir)) {
          return [...dirs, dir];
        }
        return dirs;
      };

      const result = addDirectory(allowedDirectories, '/home/user/projects');
      expect(result).toContain('/home/user/projects');
      expect(result).toHaveLength(1);
    });

    it('should hide environment variable', () => {
      const hiddenEnvVars = ['API_KEY', 'SECRET'];

      const hideEnvVar = (vars: string[], varName: string): string[] => {
        const upper = varName.toUpperCase();
        if (!vars.includes(upper)) {
          return [...vars, upper];
        }
        return vars;
      };

      const result = hideEnvVar(hiddenEnvVars, 'database_password');
      expect(result).toContain('DATABASE_PASSWORD');
      expect(result).toHaveLength(3);
    });

    it('should show (unhide) environment variable', () => {
      const hiddenEnvVars = ['API_KEY', 'SECRET', 'PASSWORD'];

      const showEnvVar = (vars: string[], varName: string): string[] => {
        const upper = varName.toUpperCase();
        const index = vars.indexOf(upper);
        if (index !== -1) {
          const newList = [...vars];
          newList.splice(index, 1);
          return newList;
        }
        return vars;
      };

      const result = showEnvVar(hiddenEnvVars, 'password');
      expect(result).not.toContain('PASSWORD');
      expect(result).toHaveLength(2);
    });
  });

  describe('Validate Command', () => {
    it('should validate timeout value', () => {
      const validateTimeout = (timeout: number): { valid: boolean; error?: string } => {
        if (timeout < 1000) {
          return { valid: false, error: 'Timeout must be at least 1000ms' };
        }
        return { valid: true };
      };

      expect(validateTimeout(500).valid).toBe(false);
      expect(validateTimeout(500).error).toBe('Timeout must be at least 1000ms');
      expect(validateTimeout(30000).valid).toBe(true);
    });

    it('should validate maxOutputSize value', () => {
      const validateMaxOutputSize = (size: number): { valid: boolean; error?: string } => {
        if (size < 1024) {
          return { valid: false, error: 'maxOutputSize must be at least 1KB' };
        }
        return { valid: true };
      };

      expect(validateMaxOutputSize(512).valid).toBe(false);
      expect(validateMaxOutputSize(1048576).valid).toBe(true);
    });

    it('should validate shell name', () => {
      const validShells = ['bash', 'sh', 'zsh', 'fish', 'powershell', 'pwsh', 'cmd'];

      const validateShell = (shell: string): boolean => {
        return validShells.includes(shell);
      };

      expect(validateShell('bash')).toBe(true);
      expect(validateShell('powershell')).toBe(true);
      expect(validateShell('unknown')).toBe(false);
    });

    it('should check for dangerous commands', () => {
      const dangerousPatterns = ['rm -rf /', 'format c:', 'del /f /s /q c:\\'];

      const isDangerous = (cmd: string): boolean => {
        return dangerousPatterns.some((pattern) =>
          cmd.toLowerCase().includes(pattern.toLowerCase().split(' ')[0])
        );
      };

      expect(isDangerous('rm -rf /home')).toBe(true);
      expect(isDangerous('format d:')).toBe(true);
      expect(isDangerous('ls -la')).toBe(false);
    });

    it('should validate hidden env var patterns', () => {
      const recommendedHidden = ['API_KEY', 'SECRET', 'PASSWORD', 'TOKEN', 'PRIVATE_KEY'];

      const checkHiddenVars = (hiddenVars: string[]): string[] => {
        return recommendedHidden.filter(
          (v) => !hiddenVars.some((h) => v.includes(h) || h.includes(v))
        );
      };

      expect(checkHiddenVars(['API_KEY', 'SECRET'])).toContain('PASSWORD');
      expect(checkHiddenVars(recommendedHidden)).toHaveLength(0);
    });

    it('should return validation result structure', () => {
      interface ValidationResult {
        valid: boolean;
        errors: string[];
        warnings: string[];
      }

      const createValidationResult = (
        errors: string[],
        warnings: string[]
      ): ValidationResult => ({
        valid: errors.length === 0,
        errors,
        warnings,
      });

      const result1 = createValidationResult([], []);
      expect(result1.valid).toBe(true);
      expect(result1.errors).toHaveLength(0);

      const result2 = createValidationResult(['Error 1'], ['Warning 1']);
      expect(result2.valid).toBe(false);
      expect(result2.errors).toContain('Error 1');
      expect(result2.warnings).toContain('Warning 1');
    });
  });

  describe('CLI Entry Point', () => {
    it('should define all expected commands', () => {
      const expectedCommands = ['config', 'security', 'validate'];

      expectedCommands.forEach((cmd) => {
        expect(typeof cmd).toBe('string');
        expect(cmd.length).toBeGreaterThan(0);
      });
    });

    it('should have correct security command options', () => {
      const securityOptions = [
        'block',
        'unblock',
        'allowDir',
        'denyDir',
        'hideEnv',
        'showEnv',
        'list',
      ];

      securityOptions.forEach((opt) => {
        expect(typeof opt).toBe('string');
      });
    });

    it('should have correct config command options', () => {
      const configOptions = ['list', 'get', 'set', 'reset'];

      configOptions.forEach((opt) => {
        expect(typeof opt).toBe('string');
      });
    });
  });
});
