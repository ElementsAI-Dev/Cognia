/**
 * Create Command Unit Tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { createCommand } from './create';
import type { CreateOptions } from './create';

// Mock fs module
jest.mock('fs');
jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

// Mock ink and React for wizard
jest.mock('ink', () => ({
  render: jest.fn(() => ({
    waitUntilExit: () => Promise.resolve(),
  })),
}));

jest.mock('react', () => ({
  createElement: jest.fn(),
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('createCommand', () => {
  const defaultOptions: CreateOptions = {
    template: 'basic',
    directory: '/test',
    typescript: true,
    git: true,
    install: false,
    interactive: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockImplementation(() => undefined);
    mockFs.writeFileSync.mockImplementation(() => undefined);
  });

  describe('non-interactive mode', () => {
    it('should require name in non-interactive mode', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      const mockError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        createCommand(undefined, { ...defaultOptions, interactive: false })
      ).rejects.toThrow('process.exit called');

      expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Plugin name is required'));

      mockExit.mockRestore();
      mockError.mockRestore();
    });

    it('should create directory structure', async () => {
      const mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      await createCommand('test-plugin', defaultOptions);

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('test-plugin'),
        expect.objectContaining({ recursive: true })
      );

      mockLog.mockRestore();
    });

    it('should create package.json', async () => {
      const mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      await createCommand('test-plugin', defaultOptions);

      const packageJsonCall = mockFs.writeFileSync.mock.calls.find(
        (call) => (call[0] as string).includes('package.json')
      );

      expect(packageJsonCall).toBeDefined();
      const packageJson = JSON.parse(packageJsonCall![1] as string);
      expect(packageJson.name).toBe('cognia-plugin-test-plugin');

      mockLog.mockRestore();
    });

    it('should create plugin.json manifest', async () => {
      const mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      await createCommand('test-plugin', defaultOptions);

      const manifestCall = mockFs.writeFileSync.mock.calls.find(
        (call) => (call[0] as string).includes('plugin.json')
      );

      expect(manifestCall).toBeDefined();
      const manifest = JSON.parse(manifestCall![1] as string);
      expect(manifest.id).toBe('test-plugin');
      expect(manifest.name).toBe('test-plugin');

      mockLog.mockRestore();
    });

    it('should create tsconfig.json when typescript is true', async () => {
      const mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      await createCommand('test-plugin', { ...defaultOptions, typescript: true });

      const tsconfigCall = mockFs.writeFileSync.mock.calls.find(
        (call) => (call[0] as string).includes('tsconfig.json')
      );

      expect(tsconfigCall).toBeDefined();

      mockLog.mockRestore();
    });

    it('should not create tsconfig.json when typescript is false', async () => {
      const mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      await createCommand('test-plugin', { ...defaultOptions, typescript: false });

      const tsconfigCall = mockFs.writeFileSync.mock.calls.find(
        (call) => (call[0] as string).includes('tsconfig.json')
      );

      expect(tsconfigCall).toBeUndefined();

      mockLog.mockRestore();
    });

    it('should create tools directory for tool template', async () => {
      const mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      await createCommand('test-plugin', { ...defaultOptions, template: 'tool' });

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('tools'),
        expect.any(Object)
      );

      mockLog.mockRestore();
    });

    it('should create commands directory for command template', async () => {
      const mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      await createCommand('test-plugin', { ...defaultOptions, template: 'command' });

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('commands'),
        expect.any(Object)
      );

      mockLog.mockRestore();
    });

    it('should create all directories for full template', async () => {
      const mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      await createCommand('test-plugin', { ...defaultOptions, template: 'full' });

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('tools'),
        expect.any(Object)
      );
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('commands'),
        expect.any(Object)
      );
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('hooks'),
        expect.any(Object)
      );
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('components'),
        expect.any(Object)
      );

      mockLog.mockRestore();
    });

    it('should fail if directory already exists', async () => {
      mockFs.existsSync.mockReturnValue(true);

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      const mockError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        createCommand('test-plugin', defaultOptions)
      ).rejects.toThrow('process.exit called');

      expect(mockError).toHaveBeenCalledWith(expect.stringContaining('already exists'));

      mockExit.mockRestore();
      mockError.mockRestore();
    });

    it('should create .gitignore when git is enabled', async () => {
      const { execSync } = require('child_process');
      const mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      await createCommand('test-plugin', { ...defaultOptions, git: true });

      expect(execSync).toHaveBeenCalledWith('git init', expect.any(Object));

      const gitignoreCall = mockFs.writeFileSync.mock.calls.find(
        (call) => (call[0] as string).includes('.gitignore')
      );
      expect(gitignoreCall).toBeDefined();

      mockLog.mockRestore();
    });

    it('should create README.md', async () => {
      const mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      await createCommand('test-plugin', defaultOptions);

      const readmeCall = mockFs.writeFileSync.mock.calls.find(
        (call) => (call[0] as string).includes('README.md')
      );

      expect(readmeCall).toBeDefined();
      expect(readmeCall![1]).toContain('test-plugin');

      mockLog.mockRestore();
    });
  });

  describe('interactive mode', () => {
    it('should launch wizard when name is not provided', async () => {
      const { render } = require('ink');

      // Set TTY to true
      const originalIsTTY = process.stdout.isTTY;
      Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });

      await createCommand(undefined, { ...defaultOptions, interactive: true });

      expect(render).toHaveBeenCalled();

      Object.defineProperty(process.stdout, 'isTTY', { value: originalIsTTY });
    });

    it('should launch wizard when interactive flag is set', async () => {
      const { render } = require('ink');

      await createCommand('test-plugin', { ...defaultOptions, interactive: true });

      expect(render).toHaveBeenCalled();
    });
  });
});
