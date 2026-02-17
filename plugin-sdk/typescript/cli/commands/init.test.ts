/**
 * Init Command Unit Tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { initCommand } from './init';
import type { InitOptions } from './init';

// Mock fs module
jest.mock('fs');
jest.mock('readline', () => ({
  createInterface: jest.fn(() => ({
    question: jest.fn((prompt, callback) => callback('')),
    close: jest.fn(),
  })),
}));

// Mock ink and React for wizard
jest.mock('ink', () => ({
  render: jest.fn(() => ({
    waitUntilExit: () => Promise.resolve(),
  })),
}));

jest.mock('react', () => ({
  createElement: jest.fn((component, props) => ({ component, props })),
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('initCommand', () => {
  const defaultOptions: InitOptions = {
    force: false,
    interactive: false,
  };

  const mockCwd = '/test/project';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(process, 'cwd').mockReturnValue(mockCwd);
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
    }));
    mockFs.writeFileSync.mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('non-interactive mode', () => {
    it('should fail if plugin.json already exists without force', async () => {
      mockFs.existsSync.mockImplementation((p) => {
        return (p as string).includes('plugin.json');
      });

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      const mockError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(initCommand(defaultOptions)).rejects.toThrow('process.exit called');

      expect(mockError).toHaveBeenCalledWith(expect.stringContaining('already exists'));

      mockExit.mockRestore();
      mockError.mockRestore();
    });

    it('should allow overwrite with force flag', async () => {
      mockFs.existsSync.mockImplementation((p) => {
        if ((p as string).includes('plugin.json')) return true;
        if ((p as string).includes('package.json')) return true;
        return false;
      });

      const mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      await initCommand({ ...defaultOptions, force: true, interactive: false });

      expect(mockFs.writeFileSync).toHaveBeenCalled();

      mockLog.mockRestore();
    });

    it('should create plugin.json', async () => {
      mockFs.existsSync.mockImplementation((p) => {
        if ((p as string).includes('package.json')) return true;
        return false;
      });

      const mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      await initCommand({ ...defaultOptions, interactive: false });

      const pluginJsonCall = mockFs.writeFileSync.mock.calls.find(
        (call) => (call[0] as string).includes('plugin.json')
      );

      expect(pluginJsonCall).toBeDefined();
      const manifest = JSON.parse(pluginJsonCall![1] as string);
      expect(manifest.id).toBeDefined();
      expect(manifest.name).toBeDefined();
      expect(manifest.version).toBeDefined();

      mockLog.mockRestore();
    });

    it('should update package.json with scripts', async () => {
      mockFs.existsSync.mockImplementation((p) => {
        if ((p as string).includes('package.json')) return true;
        return false;
      });

      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        scripts: {},
      }));

      const mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      await initCommand({ ...defaultOptions, interactive: false });

      const packageJsonCall = mockFs.writeFileSync.mock.calls.find(
        (call) => (call[0] as string).includes('package.json')
      );

      expect(packageJsonCall).toBeDefined();
      const pkg = JSON.parse(packageJsonCall![1] as string);
      expect(pkg.scripts.dev).toBe('cognia-plugin dev');
      expect(pkg.scripts.build).toBe('cognia-plugin build');
      expect(pkg.scripts.validate).toBe('cognia-plugin validate');

      mockLog.mockRestore();
    });

    it('should add devDependencies for plugin-sdk', async () => {
      mockFs.existsSync.mockImplementation((p) => {
        if ((p as string).includes('package.json')) return true;
        return false;
      });

      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
      }));

      const mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      await initCommand({ ...defaultOptions, interactive: false });

      const packageJsonCall = mockFs.writeFileSync.mock.calls.find(
        (call) => (call[0] as string).includes('package.json')
      );

      expect(packageJsonCall).toBeDefined();
      const pkg = JSON.parse(packageJsonCall![1] as string);
      expect(pkg.devDependencies['@cognia/plugin-sdk']).toBe('^2.0.0');

      mockLog.mockRestore();
    });

    it('should create index.ts if not exists', async () => {
      mockFs.existsSync.mockImplementation((p) => {
        if ((p as string).includes('package.json')) return true;
        return false;
      });

      const mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      await initCommand({ ...defaultOptions, interactive: false });

      const indexCall = mockFs.writeFileSync.mock.calls.find(
        (call) => (call[0] as string).includes('index.ts')
      );

      expect(indexCall).toBeDefined();
      expect(indexCall![1]).toContain('definePlugin');

      mockLog.mockRestore();
    });
  });

  describe('interactive mode', () => {
    it('should launch wizard in interactive mode', async () => {
      const { render } = require('ink');

      await initCommand({ ...defaultOptions, interactive: true });

      expect(render).toHaveBeenCalled();
    });

    it('should persist scheduler capability without injecting scheduledTasks', async () => {
      const { render } = require('ink');
      const renderMock = render as jest.Mock;
      const mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      mockFs.existsSync.mockImplementation((p) => {
        if ((p as string).includes('plugin.json')) return false;
        if ((p as string).includes('package.json')) return true;
        return false;
      });

      renderMock.mockImplementationOnce((element: { props: { onComplete: (data: unknown) => Promise<void> } }) => {
        void element.props.onComplete({
          id: 'scheduler-plugin',
          name: 'Scheduler Plugin',
          version: '1.0.0',
          description: 'test',
          author: 'tester',
          capabilities: ['tools', 'scheduler'],
          permissions: ['network:fetch'],
        });

        return {
          waitUntilExit: () => Promise.resolve(),
        };
      });

      await initCommand({ ...defaultOptions, interactive: true });

      const pluginJsonCall = mockFs.writeFileSync.mock.calls.find(
        (call) => (call[0] as string).includes('plugin.json')
      );
      expect(pluginJsonCall).toBeDefined();
      const manifest = JSON.parse(pluginJsonCall![1] as string);
      expect(manifest.capabilities).toContain('scheduler');
      expect(manifest.scheduledTasks).toBeUndefined();

      mockLog.mockRestore();
    });
  });
});
