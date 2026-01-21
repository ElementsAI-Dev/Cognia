/**
 * Tests for Agent Jupyter Tools
 */

// Mock kernel service - must be defined before jest.mock
const mockKernelService = {
  isAvailable: jest.fn(),
  execute: jest.fn(),
  quickExecute: jest.fn(),
  createSession: jest.fn(),
  executeCell: jest.fn(),
  deleteSession: jest.fn(),
  inspectVariable: jest.fn(),
  getVariables: jest.fn(),
  ensureKernel: jest.fn(),
};

// Mock virtual environment service
const mockVirtualEnvService = {
  list: jest.fn(),
  installPackages: jest.fn(),
};

jest.mock('@/lib/jupyter/kernel', () => ({
  kernelService: {
    isAvailable: jest.fn(),
    execute: jest.fn(),
    quickExecute: jest.fn(),
    createSession: jest.fn(),
    executeCell: jest.fn(),
    deleteSession: jest.fn(),
    inspectVariable: jest.fn(),
    getVariables: jest.fn(),
    ensureKernel: jest.fn(),
  },
}));

jest.mock('@/lib/native/environment', () => ({
  virtualEnvService: {
    list: jest.fn(),
    installPackages: jest.fn(),
  },
  isEnvironmentAvailable: jest.fn(() => true),
}));

import {
  createExecuteCodeTool,
  createJupyterSessionTool,
  createExecuteNotebookTool,
  createInspectVariableTool,
  createGetVariablesTool,
  createInstallAndRunTool,
  getJupyterToolsSystemPrompt,
  getJupyterTools,
} from './jupyter-tools';
import { kernelService } from '@/lib/jupyter/kernel';
import { virtualEnvService } from '@/lib/native/environment';

const mockedKernelService = kernelService as jest.Mocked<typeof kernelService>;
const mockedVirtualEnvService = virtualEnvService as jest.Mocked<typeof virtualEnvService>;

// Re-assign for easier access
Object.assign(mockKernelService, mockedKernelService);
Object.assign(mockVirtualEnvService, mockedVirtualEnvService);

describe('createExecuteCodeTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates tool with correct properties', () => {
    const tool = createExecuteCodeTool();

    expect(tool.name).toBe('execute_python_code');
    expect(tool.description).toContain('Execute Python code');
    expect(tool.requiresApproval).toBe(true);
  });

  it('returns error when kernel not available', async () => {
    mockedKernelService.isAvailable.mockReturnValue(false);

    const tool = createExecuteCodeTool();
    const result = await tool.execute({ code: 'print("hello")' });

    expect(result).toMatchObject({
      success: false,
      message: expect.stringContaining('Tauri desktop environment'),
    });
  });

  it('executes code in existing session', async () => {
    mockedKernelService.isAvailable.mockReturnValue(true);
    mockedKernelService.execute.mockResolvedValue({
      success: true,
      stdout: 'Hello World',
      displayData: [],
    } as never);

    const tool = createExecuteCodeTool();
    const result = await tool.execute({
      code: 'print("Hello World")',
      sessionId: 'session-1',
    });

    expect(mockedKernelService.execute).toHaveBeenCalledWith('session-1', 'print("Hello World")');
    expect(result).toMatchObject({
      success: true,
      message: 'Code executed successfully',
    });
  });

  it('executes code with quick execute when envPath provided', async () => {
    mockedKernelService.isAvailable.mockReturnValue(true);
    mockedKernelService.quickExecute.mockResolvedValue({
      success: true,
      stdout: 'result',
      displayData: [],
    } as never);

    const tool = createExecuteCodeTool();
    await tool.execute({
      code: 'x = 1',
      envPath: '/path/to/env',
    });

    expect(mockedKernelService.quickExecute).toHaveBeenCalledWith('/path/to/env', 'x = 1');
  });

  it('uses first available environment when none specified', async () => {
    mockedKernelService.isAvailable.mockReturnValue(true);
    mockedVirtualEnvService.list.mockResolvedValue([{ path: '/default/env' }] as never);
    mockedKernelService.quickExecute.mockResolvedValue({
      success: true,
      stdout: 'ok',
      displayData: [],
    } as never);

    const tool = createExecuteCodeTool();
    await tool.execute({ code: 'x = 1' });

    expect(mockedKernelService.quickExecute).toHaveBeenCalledWith('/default/env', 'x = 1');
  });

  it('returns error when no environments available', async () => {
    mockedKernelService.isAvailable.mockReturnValue(true);
    mockedVirtualEnvService.list.mockResolvedValue([] as never);

    const tool = createExecuteCodeTool();
    const result = await tool.execute({ code: 'x = 1' });

    expect(result).toMatchObject({
      success: false,
      message: expect.stringContaining('No virtual environments'),
    });
  });

  it('handles execution errors', async () => {
    mockedKernelService.isAvailable.mockReturnValue(true);
    mockedKernelService.quickExecute.mockRejectedValue(new Error('Kernel crashed'));
    mockedVirtualEnvService.list.mockResolvedValue([{ path: '/env' }] as never);

    const tool = createExecuteCodeTool();
    const result = await tool.execute({ code: 'bad code' });

    expect(result).toMatchObject({
      success: false,
      message: expect.stringContaining('Kernel crashed'),
    });
  });
});

describe('createJupyterSessionTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates tool with correct properties', () => {
    const tool = createJupyterSessionTool();

    expect(tool.name).toBe('create_jupyter_session');
    expect(tool.description).toContain('Jupyter kernel session');
    expect(tool.requiresApproval).toBe(true);
  });

  it('returns error when kernel not available', async () => {
    mockedKernelService.isAvailable.mockReturnValue(false);

    const tool = createJupyterSessionTool();
    const result = await tool.execute({
      name: 'test-session',
      envPath: '/env',
    });

    expect(result).toMatchObject({
      success: false,
    });
  });

  it('creates session successfully', async () => {
    mockedKernelService.isAvailable.mockReturnValue(true);
    mockedKernelService.ensureKernel.mockResolvedValue(undefined as never);
    mockedKernelService.createSession.mockResolvedValue({
      id: 'session-123',
      name: 'test-session',
    } as never);

    const tool = createJupyterSessionTool();
    const result = await tool.execute({
      name: 'test-session',
      envPath: '/env',
      installKernel: true,
    });

    expect(mockedKernelService.ensureKernel).toHaveBeenCalledWith('/env');
    expect(mockedKernelService.createSession).toHaveBeenCalled();
    expect(result).toMatchObject({
      success: true,
      data: { sessionId: 'session-123' },
    });
  });
});

describe('createExecuteNotebookTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates tool with correct properties', () => {
    const tool = createExecuteNotebookTool();

    expect(tool.name).toBe('execute_jupyter_notebook');
    expect(tool.requiresApproval).toBe(true);
  });

  it('returns error when kernel not available', async () => {
    mockedKernelService.isAvailable.mockReturnValue(false);

    const tool = createExecuteNotebookTool();
    const result = await tool.execute({
      notebookContent: JSON.stringify({ cells: [] }),
    });

    expect(result).toMatchObject({
      success: false,
    });
  });

  it('handles notebook with no code cells', async () => {
    mockedKernelService.isAvailable.mockReturnValue(true);

    const tool = createExecuteNotebookTool();
    const result = await tool.execute({
      notebookContent: JSON.stringify({
        cells: [{ cell_type: 'markdown', source: '# Title' }],
      }),
    });

    expect(result).toMatchObject({
      success: true,
      message: expect.stringContaining('no code cells'),
    });
  });

  it('executes notebook cells sequentially', async () => {
    mockedKernelService.isAvailable.mockReturnValue(true);
    mockedVirtualEnvService.list.mockResolvedValue([{ path: '/env' }] as never);
    mockedKernelService.createSession.mockResolvedValue({ id: 'session-1' } as never);
    mockedKernelService.executeCell.mockResolvedValue({
      success: true,
      stdout: 'cell output',
    } as never);
    mockedKernelService.deleteSession.mockResolvedValue(undefined as never);

    const notebook = {
      cells: [
        { cell_type: 'code', source: 'x = 1' },
        { cell_type: 'code', source: 'print(x)' },
      ],
    };

    const tool = createExecuteNotebookTool();
    const result = await tool.execute({
      notebookContent: JSON.stringify(notebook),
    });

    expect(mockedKernelService.executeCell).toHaveBeenCalledTimes(2);
    expect(mockedKernelService.deleteSession).toHaveBeenCalled();
    expect(result).toMatchObject({
      success: true,
    });
  });

  it('stops on error when stopOnError is true', async () => {
    mockedKernelService.isAvailable.mockReturnValue(true);
    mockedVirtualEnvService.list.mockResolvedValue([{ path: '/env' }] as never);
    mockedKernelService.createSession.mockResolvedValue({ id: 'session-1' } as never);
    mockedKernelService.executeCell
      .mockResolvedValueOnce({ success: true, stdout: 'ok' } as never)
      .mockResolvedValueOnce({ success: false, error: { evalue: 'Error!' } } as never);
    mockedKernelService.deleteSession.mockResolvedValue(undefined as never);

    const notebook = {
      cells: [
        { cell_type: 'code', source: 'x = 1' },
        { cell_type: 'code', source: 'raise Error()' },
        { cell_type: 'code', source: 'print("never")' },
      ],
    };

    const tool = createExecuteNotebookTool();
    const result = await tool.execute({
      notebookContent: JSON.stringify(notebook),
      stopOnError: true,
    });

    expect(mockedKernelService.executeCell).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      success: false,
    });
  });
});

describe('createInspectVariableTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates tool with correct properties', () => {
    const tool = createInspectVariableTool();

    expect(tool.name).toBe('inspect_variable');
    expect(tool.requiresApproval).toBe(false);
  });

  it('inspects variable successfully', async () => {
    mockedKernelService.isAvailable.mockReturnValue(true);
    mockedKernelService.inspectVariable.mockResolvedValue({
      success: true,
      stdout: '<class "int">\n42',
    } as never);

    const tool = createInspectVariableTool();
    const result = await tool.execute({
      variableName: 'x',
      sessionId: 'session-1',
    });

    expect(mockedKernelService.inspectVariable).toHaveBeenCalledWith('session-1', 'x');
    expect(result).toMatchObject({
      success: true,
      data: { output: '<class "int">\n42' },
    });
  });

  it('handles variable not found', async () => {
    mockedKernelService.isAvailable.mockReturnValue(true);
    mockedKernelService.inspectVariable.mockResolvedValue({
      success: false,
      error: { evalue: 'NameError' },
    } as never);

    const tool = createInspectVariableTool();
    const result = await tool.execute({
      variableName: 'undefined_var',
      sessionId: 'session-1',
    });

    expect(result).toMatchObject({
      success: false,
      message: expect.stringContaining('Variable not found'),
    });
  });
});

describe('createGetVariablesTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates tool with correct properties', () => {
    const tool = createGetVariablesTool();

    expect(tool.name).toBe('get_session_variables');
    expect(tool.requiresApproval).toBe(false);
  });

  it('gets variables successfully', async () => {
    mockedKernelService.isAvailable.mockReturnValue(true);
    mockedKernelService.getVariables.mockResolvedValue([
      { name: 'x', type: 'int', value: '42' },
      { name: 'y', type: 'str', value: '"hello"' },
    ] as never);

    const tool = createGetVariablesTool();
    const result = await tool.execute({ sessionId: 'session-1' });

    expect(result).toMatchObject({
      success: true,
      message: 'Found 2 variables',
      data: {
        variables: [
          { name: 'x', type: 'int', value: '42' },
          { name: 'y', type: 'str', value: '"hello"' },
        ],
      },
    });
  });
});

describe('createInstallAndRunTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates tool with correct properties', () => {
    const tool = createInstallAndRunTool();

    expect(tool.name).toBe('install_and_execute');
    expect(tool.requiresApproval).toBe(true);
  });

  it('installs packages and executes code', async () => {
    mockedKernelService.isAvailable.mockReturnValue(true);
    mockedVirtualEnvService.list.mockResolvedValue([{ path: '/env' }] as never);
    mockedVirtualEnvService.installPackages.mockResolvedValue(undefined as never);
    mockedKernelService.quickExecute.mockResolvedValue({
      success: true,
      stdout: 'result',
      displayData: [],
    } as never);

    const tool = createInstallAndRunTool();
    const result = await tool.execute({
      code: 'import pandas; print("ok")',
      packages: ['pandas', 'numpy'],
    });

    expect(mockedVirtualEnvService.installPackages).toHaveBeenCalledWith(
      '/env',
      ['pandas', 'numpy'],
      false
    );
    expect(mockedKernelService.quickExecute).toHaveBeenCalled();
    expect(result).toMatchObject({
      success: true,
      message: expect.stringContaining('pandas, numpy'),
    });
  });
});

describe('getJupyterToolsSystemPrompt', () => {
  it('returns comprehensive system prompt', () => {
    const prompt = getJupyterToolsSystemPrompt();

    expect(prompt).toContain('Jupyter');
    expect(prompt).toContain('execute');
    expect(prompt).toContain('session');
  });
});

describe('getJupyterTools', () => {
  it('returns all Jupyter tools', () => {
    const tools = getJupyterTools();

    expect(tools.execute_python_code).toBeDefined();
    expect(tools.create_jupyter_session).toBeDefined();
    expect(tools.execute_jupyter_notebook).toBeDefined();
    expect(tools.inspect_variable).toBeDefined();
    expect(tools.get_session_variables).toBeDefined();
    expect(tools.install_and_execute).toBeDefined();
    expect(Object.keys(tools)).toHaveLength(6);
  });
});
