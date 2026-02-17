import { executeCodeStep } from './code-executor';

const mockExecuteSandboxCode = jest.fn();
const mockIsTauri = jest.fn();

jest.mock('@/lib/native/sandbox', () => ({
  executeCode: (...args: unknown[]) => mockExecuteSandboxCode(...args),
}));

jest.mock('@/lib/utils', () => ({
  isTauri: () => mockIsTauri(),
}));

describe('executeCodeStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
    mockExecuteSandboxCode.mockResolvedValue({
      stdout: '{"ok":true}',
      stderr: '',
      runtime: 'native',
      exit_code: 0,
      execution_time_ms: 10,
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

    expect(mockExecuteSandboxCode).toHaveBeenCalledWith(
      expect.objectContaining({
        timeout_secs: 30,
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

    expect(mockExecuteSandboxCode).toHaveBeenCalledWith(
      expect.objectContaining({
        timeout_secs: 1,
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

    expect(mockExecuteSandboxCode).toHaveBeenCalledWith(
      expect.objectContaining({
        runtime: 'docker',
        memory_limit_mb: 1024,
        network_enabled: true,
        env: { FOO: 'bar' },
        args: ['--test'],
        files: { 'data/input.txt': 'ok' },
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

    expect(mockExecuteSandboxCode).toHaveBeenCalledWith(
      expect.not.objectContaining({
        runtime: 'auto',
      })
    );
  });
});
