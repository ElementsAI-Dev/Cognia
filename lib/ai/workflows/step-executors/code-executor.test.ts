import { executeCodeStep } from './code-executor';

const mockExecuteSandboxCode = jest.fn();
const mockIsTauri = jest.fn();
const mockExecuteSandboxEntrypoint = jest.fn();

jest.mock('@/lib/native/sandbox', () => ({
  executeCode: (...args: unknown[]) => mockExecuteSandboxCode(...args),
}));

jest.mock('@/lib/sandbox/consumption', () => ({
  SANDBOX_ENTRYPOINT_POLICIES: {
    workflowCodeStep: {
      entrypoint: 'workflow-code-step',
    },
  },
  executeSandboxEntrypoint: (...args: unknown[]) => mockExecuteSandboxEntrypoint(...args),
}));

jest.mock('@/lib/utils', () => ({
  isTauri: () => mockIsTauri(),
}));

describe('executeCodeStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
    mockExecuteSandboxEntrypoint.mockResolvedValue({
      kind: 'executed',
      metadata: {
        entrypoint: 'workflow-code-step',
        blocked: false,
        bypassed: false,
      },
      result: {
        stdout: '{"ok":true}',
        stderr: '',
        runtime: 'native',
        exit_code: 0,
        execution_time_ms: 10,
        status: 'completed',
        lifecycle_status: 'success',
      },
    });
  });

  it('converts step timeout from ms to secs', async () => {
    await executeCodeStep(
      {
        id: 'code-1',
        name: 'Code',
        description: '',
        type: 'code',
        code: 'console.log("x")',
        language: 'javascript',
        inputs: {},
        outputs: {},
        timeout: 30_000,
      },
      { value: 1 }
    );

    expect(mockExecuteSandboxEntrypoint).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          timeout_secs: 30,
        }),
      })
    );
  });

  it('uses codeSandbox timeout override and rounds up', async () => {
    await executeCodeStep(
      {
        id: 'code-1',
        name: 'Code',
        description: '',
        type: 'code',
        code: 'console.log("x")',
        language: 'javascript',
        inputs: {},
        outputs: {},
        timeout: 30_000,
        codeSandbox: {
          timeoutMs: 1,
        },
      },
      {}
    );

    expect(mockExecuteSandboxEntrypoint).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          timeout_secs: 1,
        }),
      })
    );
  });

  it('passes codeSandbox runtime/options to sandbox request', async () => {
    await executeCodeStep(
      {
        id: 'code-1',
        name: 'Code',
        description: '',
        type: 'code',
        code: 'print("x")',
        language: 'python',
        inputs: {},
        outputs: {},
        codeSandbox: {
          runtime: 'docker',
          memoryLimitMb: 1024,
          networkEnabled: true,
          env: { FOO: 'bar' },
          args: ['--test'],
          files: { 'data/input.txt': 'ok' },
        },
      },
      { foo: 'bar' }
    );

    expect(mockExecuteSandboxEntrypoint).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          runtime: 'docker',
          memory_limit_mb: 1024,
          network_enabled: true,
          env: { FOO: 'bar' },
          args: ['--test'],
          files: { 'data/input.txt': 'ok' },
        }),
      })
    );
  });

  it('maps auto runtime to undefined', async () => {
    await executeCodeStep(
      {
        id: 'code-1',
        name: 'Code',
        description: '',
        type: 'code',
        code: 'print("x")',
        language: 'python',
        inputs: {},
        outputs: {},
        codeSandbox: {
          runtime: 'auto',
        },
      },
      {}
    );

    expect(mockExecuteSandboxEntrypoint).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.not.objectContaining({
          runtime: 'auto',
        }),
      })
    );
  });

  it('throws blocked contract errors before raw sandbox execution', async () => {
    mockExecuteSandboxEntrypoint.mockResolvedValue({
      kind: 'blocked',
      metadata: {
        entrypoint: 'workflow-code-step',
        blocked: true,
        bypassed: false,
      },
      result: {
        status: 'failed',
        lifecycle_status: 'error',
        error: 'Sandbox is unavailable',
        stdout: '',
        stderr: '',
        runtime: 'native',
        exit_code: null,
        execution_time_ms: 0,
        language: 'python',
      },
    });

    await expect(
      executeCodeStep(
        {
          id: 'code-1',
          name: 'Code',
          description: '',
          type: 'code',
          code: 'print("x")',
          language: 'python',
          inputs: {},
          outputs: {},
        },
        {}
      )
    ).rejects.toThrow('Code execution failed: Sandbox is unavailable');

    expect(mockExecuteSandboxCode).not.toHaveBeenCalled();
  });
});
