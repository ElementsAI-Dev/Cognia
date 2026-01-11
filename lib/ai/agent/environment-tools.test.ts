/**
 * Tests for Agent Environment Tools
 */

import {
  createVenvTool,
  createInstallPackagesTool,
  createRunPythonTool,
  createRunPythonFileTool,
  createGetPythonInfoTool,
  createRunInEnvTool,
  createListPackagesTool,
  createCheckEnvTool,
  createGetPythonVersionsTool,
  createDeleteEnvTool,
  createUninstallPackagesTool,
  createExportRequirementsTool,
  createImportRequirementsTool,
  createUpgradePackagesTool,
  getEnvironmentTools,
  initializeEnvironmentTools,
  getEnvironmentToolsSystemPrompt,
  getEnvironmentToolsPromptSnippet,
} from './environment-tools';
import type { AgentEnvResult } from '@/types/system/environment';

// Mock the native environment service
jest.mock('@/lib/native/environment', () => ({
  virtualEnvService: {
    create: jest.fn(),
    list: jest.fn(),
    delete: jest.fn(),
    listPackages: jest.fn(),
    installPackages: jest.fn(),
    runCommand: jest.fn(),
    getAvailablePythonVersions: jest.fn(),
    installPythonVersion: jest.fn(),
    onProgress: jest.fn(),
    executePython: jest.fn(),
    executePythonStream: jest.fn(),
    executePythonFile: jest.fn(),
    getPythonInfo: jest.fn(),
    onPythonExecutionOutput: jest.fn(),
    generateExecutionId: jest.fn(),
  },
  isEnvironmentAvailable: jest.fn(),
}));

import { virtualEnvService, isEnvironmentAvailable } from '@/lib/native/environment';

const mockIsEnvironmentAvailable = isEnvironmentAvailable as jest.MockedFunction<typeof isEnvironmentAvailable>;
const mockVirtualEnvService = virtualEnvService as jest.Mocked<typeof virtualEnvService>;

describe('Environment Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createVenvTool', () => {
    it('should create a tool with correct properties', () => {
      const tool = createVenvTool();

      expect(tool.name).toBe('create_virtual_env');
      expect(tool.description).toContain('Python virtual environment');
      expect(tool.requiresApproval).toBe(true);
      expect(typeof tool.execute).toBe('function');
    });

    it('should return error when not in Tauri environment', async () => {
      mockIsEnvironmentAvailable.mockReturnValue(false);

      const tool = createVenvTool();
      const result = await tool.execute({ name: 'test-env' });

      expect(result).toEqual({
        success: false,
        action: 'create_venv',
        message: 'Environment management requires Tauri desktop environment',
        error: 'Not available in browser',
      });
    });

    it('should create environment successfully', async () => {
      mockIsEnvironmentAvailable.mockReturnValue(true);
      mockVirtualEnvService.create.mockResolvedValue({
        id: 'venv-123',
        name: 'test-env',
        type: 'uv',
        path: '/path/to/test-env',
        pythonVersion: '3.11.0',
        pythonPath: '/path/to/test-env/bin/python',
        status: 'inactive',
        packages: 0,
        size: null,
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        isDefault: false,
        projectPath: null,
      });

      const tool = createVenvTool();
      const result = await tool.execute({ name: 'test-env', type: 'uv' }) as AgentEnvResult;

      expect(result.success).toBe(true);
      expect(result.action).toBe('create_venv');
      expect(result.message).toContain('test-env');
      expect(result.data?.envPath).toBe('/path/to/test-env');
    });

    it('should handle creation errors', async () => {
      mockIsEnvironmentAvailable.mockReturnValue(true);
      mockVirtualEnvService.create.mockRejectedValue(new Error('Failed to create'));

      const tool = createVenvTool();
      const result = await tool.execute({ name: 'test-env' }) as AgentEnvResult;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create');
    });
  });

  describe('createInstallPackagesTool', () => {
    it('should create a tool with correct properties', () => {
      const tool = createInstallPackagesTool();

      expect(tool.name).toBe('install_packages');
      expect(tool.description).toContain('Install Python packages');
      expect(tool.requiresApproval).toBe(true);
    });

    it('should install packages successfully', async () => {
      mockIsEnvironmentAvailable.mockReturnValue(true);
      mockVirtualEnvService.installPackages.mockResolvedValue(true);

      const tool = createInstallPackagesTool();
      const result = await tool.execute({
        envPath: '/path/to/env',
        packages: ['numpy', 'pandas'],
      }) as AgentEnvResult;

      expect(result.success).toBe(true);
      expect(result.message).toContain('numpy');
      expect(result.message).toContain('pandas');
    });
  });

  describe('createRunPythonTool', () => {
    it('should create a tool with correct properties', () => {
      const tool = createRunPythonTool();

      expect(tool.name).toBe('run_python');
      expect(tool.description).toContain('Execute Python code');
      expect(tool.requiresApproval).toBe(true);
    });

    it('should execute Python code successfully using safe execution', async () => {
      mockIsEnvironmentAvailable.mockReturnValue(true);
      mockVirtualEnvService.executePython.mockResolvedValue({
        id: 'exec-123',
        status: 'completed',
        stdout: 'Hello, World!',
        stderr: '',
        exitCode: 0,
        executionTimeMs: 100,
        error: null,
        envPath: '/path/to/env',
      });

      const tool = createRunPythonTool();
      const result = await tool.execute({
        envPath: '/path/to/env',
        code: 'print("Hello, World!")',
      }) as AgentEnvResult;

      expect(result.success).toBe(true);
      expect((result as { data?: { output?: string } }).data?.output).toBe('Hello, World!');
      expect(mockVirtualEnvService.executePython).toHaveBeenCalledWith(
        '/path/to/env',
        'print("Hello, World!")',
        expect.objectContaining({ timeoutSecs: 60 })
      );
    });

    it('should handle timeout errors', async () => {
      mockIsEnvironmentAvailable.mockReturnValue(true);
      mockVirtualEnvService.executePython.mockResolvedValue({
        id: 'exec-123',
        status: 'timeout',
        stdout: '',
        stderr: '',
        exitCode: null,
        executionTimeMs: 60000,
        error: 'Execution timed out after 60 seconds',
        envPath: '/path/to/env',
      });

      const tool = createRunPythonTool();
      const result = await tool.execute({
        envPath: '/path/to/env',
        code: 'import time; time.sleep(120)',
      }) as AgentEnvResult;

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });

    it('should handle execution failures', async () => {
      mockIsEnvironmentAvailable.mockReturnValue(true);
      mockVirtualEnvService.executePython.mockResolvedValue({
        id: 'exec-123',
        status: 'failed',
        stdout: '',
        stderr: 'NameError: name "foo" is not defined',
        exitCode: 1,
        executionTimeMs: 50,
        error: null,
        envPath: '/path/to/env',
      });

      const tool = createRunPythonTool();
      const result = await tool.execute({
        envPath: '/path/to/env',
        code: 'print(foo)',
      }) as AgentEnvResult;

      expect(result.success).toBe(false);
      expect(result.error).toContain('NameError');
    });
  });

  describe('createRunPythonFileTool', () => {
    it('should create a tool with correct properties', () => {
      const tool = createRunPythonFileTool();

      expect(tool.name).toBe('run_python_file');
      expect(tool.description).toContain('Execute a Python file');
      expect(tool.requiresApproval).toBe(true);
    });

    it('should execute Python file successfully', async () => {
      mockIsEnvironmentAvailable.mockReturnValue(true);
      mockVirtualEnvService.executePythonFile.mockResolvedValue({
        id: 'exec-456',
        status: 'completed',
        stdout: 'Script output',
        stderr: '',
        exitCode: 0,
        executionTimeMs: 200,
        error: null,
        envPath: '/path/to/env',
      });

      const tool = createRunPythonFileTool();
      const result = await tool.execute({
        envPath: '/path/to/env',
        filePath: '/path/to/script.py',
      }) as AgentEnvResult;

      expect(result.success).toBe(true);
      expect((result as { data?: { output?: string } }).data?.output).toBe('Script output');
    });
  });

  describe('createGetPythonInfoTool', () => {
    it('should create a tool with correct properties', () => {
      const tool = createGetPythonInfoTool();

      expect(tool.name).toBe('get_python_info');
      expect(tool.description).toContain('Python interpreter');
      expect(tool.requiresApproval).toBe(false);
    });

    it('should get Python info successfully', async () => {
      mockIsEnvironmentAvailable.mockReturnValue(true);
      mockVirtualEnvService.getPythonInfo.mockResolvedValue({
        version: '3.12.0',
        executable: '/path/to/env/bin/python',
        envPath: '/path/to/env',
        sysPath: ['/path/to/env/lib/python3.12'],
        platform: 'Linux-5.15.0-x86_64',
      });

      const tool = createGetPythonInfoTool();
      const result = await tool.execute({
        envPath: '/path/to/env',
      }) as AgentEnvResult;

      expect(result.success).toBe(true);
      expect((result as { data?: { pythonVersion?: string } }).data?.pythonVersion).toBe('3.12.0');
    });
  });

  describe('createRunInEnvTool', () => {
    it('should create a tool with correct properties', () => {
      const tool = createRunInEnvTool();

      expect(tool.name).toBe('run_in_env');
      expect(tool.description).toContain('shell command');
      expect(tool.requiresApproval).toBe(true);
    });

    it('should run command successfully', async () => {
      mockIsEnvironmentAvailable.mockReturnValue(true);
      mockVirtualEnvService.runCommand.mockResolvedValue('pip 23.0.1');

      const tool = createRunInEnvTool();
      const result = await tool.execute({
        envPath: '/path/to/env',
        command: 'pip --version',
      }) as AgentEnvResult;

      expect(result.success).toBe(true);
      expect(result.data?.output).toBe('pip 23.0.1');
    });
  });

  describe('createListPackagesTool', () => {
    it('should create a tool with correct properties', () => {
      const tool = createListPackagesTool();

      expect(tool.name).toBe('list_env_packages');
      expect(tool.requiresApproval).toBe(false);
    });

    it('should list packages successfully', async () => {
      mockIsEnvironmentAvailable.mockReturnValue(true);
      mockVirtualEnvService.listPackages.mockResolvedValue([
        { name: 'numpy', version: '1.24.0', latest: null, description: null, location: null },
        { name: 'pandas', version: '2.0.0', latest: null, description: null, location: null },
      ]);

      const tool = createListPackagesTool();
      const result = await tool.execute({ envPath: '/path/to/env' }) as AgentEnvResult;

      expect(result.success).toBe(true);
      expect(result.message).toContain('2 packages');
    });
  });

  describe('createCheckEnvTool', () => {
    it('should create a tool with correct properties', () => {
      const tool = createCheckEnvTool();

      expect(tool.name).toBe('check_environments');
      expect(tool.requiresApproval).toBe(false);
    });

    it('should list all environments', async () => {
      mockIsEnvironmentAvailable.mockReturnValue(true);
      mockVirtualEnvService.list.mockResolvedValue([
        {
          id: 'env-1',
          name: 'project-env',
          type: 'uv',
          path: '/path/to/env',
          pythonVersion: '3.11.0',
          pythonPath: null,
          status: 'inactive',
          packages: 10,
          size: null,
          createdAt: new Date().toISOString(),
          lastUsedAt: null,
          isDefault: false,
          projectPath: null,
        },
      ]);

      const tool = createCheckEnvTool();
      const result = await tool.execute({}) as AgentEnvResult;

      expect(result.success).toBe(true);
      expect(result.message).toContain('1 virtual environment');
    });
  });

  describe('createGetPythonVersionsTool', () => {
    it('should create a tool with correct properties', () => {
      const tool = createGetPythonVersionsTool();

      expect(tool.name).toBe('get_python_versions');
      expect(tool.requiresApproval).toBe(false);
    });

    it('should get Python versions successfully', async () => {
      mockIsEnvironmentAvailable.mockReturnValue(true);
      mockVirtualEnvService.getAvailablePythonVersions.mockResolvedValue([
        '3.12',
        '3.11',
        '3.10',
      ]);

      const tool = createGetPythonVersionsTool();
      const result = await tool.execute({}) as AgentEnvResult;

      expect(result.success).toBe(true);
      expect(result.data?.output).toContain('3.12');
    });
  });

  describe('getEnvironmentTools', () => {
    it('should return all environment tools', () => {
      const tools = getEnvironmentTools();

      expect(Object.keys(tools)).toContain('create_virtual_env');
      expect(Object.keys(tools)).toContain('install_packages');
      expect(Object.keys(tools)).toContain('run_python');
      expect(Object.keys(tools)).toContain('run_in_env');
      expect(Object.keys(tools)).toContain('list_env_packages');
      expect(Object.keys(tools)).toContain('check_environments');
      expect(Object.keys(tools)).toContain('get_python_versions');
    });
  });

  describe('initializeEnvironmentTools', () => {
    it('should initialize all tools by default', () => {
      const tools = initializeEnvironmentTools();

      expect(Object.keys(tools).length).toBeGreaterThan(0);
      expect(tools.check_environments).toBeDefined();
      expect(tools.get_python_versions).toBeDefined();
    });

    it('should respect configuration options', () => {
      const tools = initializeEnvironmentTools({
        enableCreate: false,
        enableInstall: false,
        enableRun: false,
        enableList: true,
      });

      expect(tools.create_virtual_env).toBeUndefined();
      expect(tools.install_packages).toBeUndefined();
      expect(tools.run_python).toBeUndefined();
      expect(tools.list_env_packages).toBeDefined();
    });
  });

  describe('System Prompts', () => {
    it('should return detailed system prompt', () => {
      const prompt = getEnvironmentToolsSystemPrompt();

      expect(prompt).toContain('Python Environment Management');
      expect(prompt).toContain('CREATE a virtual environment');
      expect(prompt).toContain('INSTALL packages');
      expect(prompt).toContain('RUN Python code');
      expect(prompt).toContain('Best Practices');
    });

    it('should return concise prompt snippet', () => {
      const prompt = getEnvironmentToolsPromptSnippet();

      expect(prompt).toContain('virtual environments');
      expect(prompt.length).toBeLessThan(500);
    });
  });

  describe('createDeleteEnvTool', () => {
    it('should create a tool with correct properties', () => {
      const tool = createDeleteEnvTool();

      expect(tool.name).toBe('delete_virtual_env');
      expect(tool.description).toContain('Delete');
      expect(tool.requiresApproval).toBe(true);
      expect(typeof tool.execute).toBe('function');
    });

    it('should return error when not in Tauri environment', async () => {
      mockIsEnvironmentAvailable.mockReturnValue(false);

      const tool = createDeleteEnvTool();
      const result = await tool.execute({ envPath: '/path/to/env', confirm: true });

      expect(result).toMatchObject({
        success: false,
        message: expect.stringContaining('Tauri'),
      });
    });

    it('should delete environment successfully', async () => {
      mockIsEnvironmentAvailable.mockReturnValue(true);
      mockVirtualEnvService.delete.mockResolvedValue(true);

      const tool = createDeleteEnvTool();
      const result = await tool.execute({ envPath: '/path/to/env', confirm: true });

      expect(result).toMatchObject({
        success: true,
        message: expect.stringContaining('deleted'),
      });
      expect(mockVirtualEnvService.delete).toHaveBeenCalledWith('/path/to/env');
    });

    it('should not delete without confirmation', async () => {
      mockIsEnvironmentAvailable.mockReturnValue(true);

      const tool = createDeleteEnvTool();
      const result = await tool.execute({ envPath: '/path/to/env', confirm: false });

      expect(result).toMatchObject({
        success: false,
        message: expect.stringContaining('cancelled'),
      });
      expect(mockVirtualEnvService.delete).not.toHaveBeenCalled();
    });
  });

  describe('createUninstallPackagesTool', () => {
    it('should create a tool with correct properties', () => {
      const tool = createUninstallPackagesTool();

      expect(tool.name).toBe('uninstall_packages');
      expect(tool.description).toContain('Uninstall');
      expect(tool.requiresApproval).toBe(true);
    });

    it('should uninstall packages successfully', async () => {
      mockIsEnvironmentAvailable.mockReturnValue(true);
      mockVirtualEnvService.runCommand.mockResolvedValue('Successfully uninstalled numpy');

      const tool = createUninstallPackagesTool();
      const result = await tool.execute({ envPath: '/path/to/env', packages: ['numpy', 'pandas'] });

      expect(result).toMatchObject({
        success: true,
        message: expect.stringContaining('uninstalled'),
      });
      expect(mockVirtualEnvService.runCommand).toHaveBeenCalledWith(
        '/path/to/env',
        'pip uninstall -y numpy pandas'
      );
    });

    it('should handle uninstall errors', async () => {
      mockIsEnvironmentAvailable.mockReturnValue(true);
      mockVirtualEnvService.runCommand.mockRejectedValue(new Error('Package not found'));

      const tool = createUninstallPackagesTool();
      const result = await tool.execute({ envPath: '/path/to/env', packages: ['unknown'] });

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('Package not found'),
      });
    });
  });

  describe('createExportRequirementsTool', () => {
    it('should create a tool with correct properties', () => {
      const tool = createExportRequirementsTool();

      expect(tool.name).toBe('export_requirements');
      expect(tool.description).toContain('Export');
      expect(tool.requiresApproval).toBe(false);
    });

    it('should export requirements successfully', async () => {
      mockIsEnvironmentAvailable.mockReturnValue(true);
      mockVirtualEnvService.listPackages.mockResolvedValue([
        { name: 'numpy', version: '1.24.0', latest: null, description: null, location: null },
        { name: 'pandas', version: '2.0.0', latest: null, description: null, location: null },
      ]);

      const tool = createExportRequirementsTool();
      const result = await tool.execute({ envPath: '/path/to/env', pinVersions: true }) as AgentEnvResult;

      expect(result).toMatchObject({
        success: true,
        message: expect.stringContaining('2 packages'),
      });
      expect(result.data?.output).toContain('numpy==1.24.0');
      expect(result.data?.output).toContain('pandas==2.0.0');
    });

    it('should handle empty package list', async () => {
      mockIsEnvironmentAvailable.mockReturnValue(true);
      mockVirtualEnvService.listPackages.mockResolvedValue([]);

      const tool = createExportRequirementsTool();
      const result = await tool.execute({ envPath: '/path/to/env', pinVersions: true });

      expect(result).toMatchObject({
        success: true,
        message: expect.stringContaining('0 packages'),
      });
    });
  });

  describe('createImportRequirementsTool', () => {
    it('should create a tool with correct properties', () => {
      const tool = createImportRequirementsTool();

      expect(tool.name).toBe('import_requirements');
      expect(tool.description).toContain('Install');
      expect(tool.requiresApproval).toBe(true);
    });

    it('should import requirements successfully', async () => {
      mockIsEnvironmentAvailable.mockReturnValue(true);
      mockVirtualEnvService.installPackages.mockResolvedValue(true);

      const content = `numpy==1.24.0
pandas>=2.0.0
requests`;

      const tool = createImportRequirementsTool();
      const result = await tool.execute({ envPath: '/path/to/env', content });

      expect(result).toMatchObject({
        success: true,
        message: expect.stringContaining('3 packages'),
      });
      expect(mockVirtualEnvService.installPackages).toHaveBeenCalled();
    });

    it('should handle empty requirements', async () => {
      mockIsEnvironmentAvailable.mockReturnValue(true);

      const tool = createImportRequirementsTool();
      const result = await tool.execute({ envPath: '/path/to/env', content: '# Just comments\n' });

      expect(result).toMatchObject({
        success: false,
        message: expect.stringContaining('No valid packages'),
      });
    });
  });

  describe('createUpgradePackagesTool', () => {
    it('should create a tool with correct properties', () => {
      const tool = createUpgradePackagesTool();

      expect(tool.name).toBe('upgrade_packages');
      expect(tool.description).toContain('Upgrade');
      expect(tool.requiresApproval).toBe(true);
    });

    it('should upgrade specific packages', async () => {
      mockIsEnvironmentAvailable.mockReturnValue(true);
      mockVirtualEnvService.installPackages.mockResolvedValue(true);

      const tool = createUpgradePackagesTool();
      const result = await tool.execute({ envPath: '/path/to/env', packages: ['numpy', 'pandas'] });

      expect(result).toMatchObject({
        success: true,
        message: expect.stringContaining('2 package'),
      });
      expect(mockVirtualEnvService.installPackages).toHaveBeenCalledWith(
        '/path/to/env',
        ['numpy', 'pandas'],
        true
      );
    });

    it('should upgrade all packages when none specified', async () => {
      mockIsEnvironmentAvailable.mockReturnValue(true);
      mockVirtualEnvService.listPackages.mockResolvedValue([
        { name: 'numpy', version: '1.24.0', latest: null, description: null, location: null },
        { name: 'pandas', version: '2.0.0', latest: null, description: null, location: null },
      ]);
      mockVirtualEnvService.installPackages.mockResolvedValue(true);

      const tool = createUpgradePackagesTool();
      const result = await tool.execute({ envPath: '/path/to/env' }) as AgentEnvResult;

      expect(result).toMatchObject({
        success: true,
        message: expect.stringContaining('2 package'),
      });
      expect(mockVirtualEnvService.installPackages).toHaveBeenCalledWith(
        '/path/to/env',
        ['numpy', 'pandas'],
        true
      );
    });

    it('should handle empty package list', async () => {
      mockIsEnvironmentAvailable.mockReturnValue(true);
      mockVirtualEnvService.listPackages.mockResolvedValue([]);

      const tool = createUpgradePackagesTool();
      const result = await tool.execute({ envPath: '/path/to/env' }) as AgentEnvResult;

      expect(result).toMatchObject({
        success: true,
        message: expect.stringContaining('No packages'),
      });
    });
  });

  describe('getEnvironmentTools - new tools', () => {
    it('should include all new tools', () => {
      const tools = getEnvironmentTools();

      expect(Object.keys(tools)).toContain('delete_virtual_env');
      expect(Object.keys(tools)).toContain('uninstall_packages');
      expect(Object.keys(tools)).toContain('upgrade_packages');
      expect(Object.keys(tools)).toContain('export_requirements');
      expect(Object.keys(tools)).toContain('import_requirements');
    });
  });

  describe('initializeEnvironmentTools - new options', () => {
    it('should respect new configuration options', () => {
      const tools = initializeEnvironmentTools({
        enableDelete: false,
        enableUninstall: false,
        enableUpgrade: false,
        enableExport: false,
        enableImport: false,
      });

      expect(tools.delete_virtual_env).toBeUndefined();
      expect(tools.uninstall_packages).toBeUndefined();
      expect(tools.upgrade_packages).toBeUndefined();
      expect(tools.export_requirements).toBeUndefined();
      expect(tools.import_requirements).toBeUndefined();
    });

    it('should include new tools by default', () => {
      const tools = initializeEnvironmentTools();

      expect(tools.delete_virtual_env).toBeDefined();
      expect(tools.uninstall_packages).toBeDefined();
      expect(tools.upgrade_packages).toBeDefined();
      expect(tools.export_requirements).toBeDefined();
      expect(tools.import_requirements).toBeDefined();
    });
  });

  describe('System Prompts - new content', () => {
    it('should include guidance for new tools', () => {
      const prompt = getEnvironmentToolsSystemPrompt();

      expect(prompt).toContain('DELETE');
      expect(prompt).toContain('UNINSTALL');
      expect(prompt).toContain('EXPORT');
      expect(prompt).toContain('requirements.txt');
    });
  });
});
