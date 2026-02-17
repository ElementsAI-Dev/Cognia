import { sandboxService } from '@/lib/native/sandbox';

export interface UnifiedCodeExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  executionTime: number;
  language: string;
  runtime?: string;
  isSimulated?: boolean;
}

const BROWSER_EXECUTABLE = ['javascript', 'typescript'];
const SANDBOX_EXECUTABLE = ['python', 'go', 'rust', 'java', 'c', 'cpp', 'ruby', 'php', 'bash'];

async function simulateExecution(
  code: string,
  language: string
): Promise<UnifiedCodeExecutionResult> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const lineCount = code.split('\n').length;
  const hasMain = code.includes('main') || code.includes('def ') || code.includes('function');
  const hasPrint =
    code.includes('print') || code.includes('console.log') || code.includes('fmt.Print');

  let simulatedOutput = `[Simulated execution for ${language}]\n`;
  simulatedOutput += 'Code analysis:\n';
  simulatedOutput += `- ${lineCount} lines of code\n`;
  simulatedOutput += `- ${hasMain ? 'Contains entry point' : 'No main entry point detected'}\n`;
  simulatedOutput += `- ${hasPrint ? 'Has output statements' : 'No output statements detected'}\n`;

  return {
    success: true,
    stdout: simulatedOutput,
    stderr: '',
    exitCode: 0,
    executionTime: 500,
    language,
    runtime: 'simulated',
    isSimulated: true,
  };
}

async function executeBrowser(
  code: string,
  language: string
): Promise<UnifiedCodeExecutionResult> {
  const startTime = performance.now();
  const logs: string[] = [];
  const errors: string[] = [];

  const originalConsole = { ...console };
  const sandboxConsole = {
    log: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
    error: (...args: unknown[]) => errors.push(args.map(String).join(' ')),
    warn: (...args: unknown[]) => logs.push(`[warn] ${args.map(String).join(' ')}`),
    info: (...args: unknown[]) => logs.push(`[info] ${args.map(String).join(' ')}`),
  };

  try {
    Object.assign(console, sandboxConsole);

    let executableCode = code;
    if (language === 'typescript') {
      executableCode = code
        .replace(/:\s*(string|number|boolean|any|void|never|unknown|object)\b/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\binterface\s+\w+\s*\{[^}]*\}/g, '')
        .replace(/\btype\s+\w+\s*=\s*[^;]+;/g, '');
    }

    const asyncWrapper = `
      return (async () => {
        ${executableCode}
      })();
    `;

    const fn = new Function(asyncWrapper);
    const result = await fn();

    if (result !== undefined) {
      logs.push(String(result));
    }

    return {
      success: true,
      stdout: logs.join('\n'),
      stderr: errors.join('\n'),
      exitCode: 0,
      executionTime: Math.round(performance.now() - startTime),
      language,
      runtime: 'browser',
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      stdout: logs.join('\n'),
      stderr: `Error: ${errorMessage}`,
      exitCode: 1,
      executionTime: Math.round(performance.now() - startTime),
      language,
      runtime: 'browser',
    };
  } finally {
    Object.assign(console, originalConsole);
  }
}

async function executeSandbox(
  code: string,
  language: string,
  stdin: string
): Promise<UnifiedCodeExecutionResult> {
  try {
    const result = await sandboxService.executeWithStdin(language, code, stdin);
    return {
      success: result.status === 'completed' && result.exit_code === 0,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exit_code,
      executionTime: result.execution_time_ms,
      language: result.language,
      runtime: result.runtime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      stdout: '',
      stderr: `Execution failed: ${errorMessage}`,
      exitCode: 1,
      executionTime: 0,
      language,
    };
  }
}

export async function executeCodeWithSandboxPriority(options: {
  code: string;
  language: string;
  isDesktop: boolean;
  stdin?: string;
}): Promise<UnifiedCodeExecutionResult> {
  const { code, isDesktop } = options;
  const language = options.language.toLowerCase();
  const stdin = options.stdin || '';

  if (isDesktop) {
    const sandboxResult = await executeSandbox(code, language, stdin);
    if (sandboxResult.success) {
      return sandboxResult;
    }
    if (BROWSER_EXECUTABLE.includes(language)) {
      return executeBrowser(code, language);
    }
    if (!SANDBOX_EXECUTABLE.includes(language)) {
      return simulateExecution(code, language);
    }
    return sandboxResult;
  }

  if (BROWSER_EXECUTABLE.includes(language)) {
    return executeBrowser(code, language);
  }
  return simulateExecution(code, language);
}
