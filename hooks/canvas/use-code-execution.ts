'use client';

/**
 * useCodeExecution - Hook for executing code in Canvas
 * Supports Tauri sandbox, browser-based evaluation, and simulated execution
 */

import { useCallback, useState, useRef } from 'react';
import { useNativeStore } from '@/stores';
import type { SandboxExecutionResult, ExecutionRequest } from '@/types/system/sandbox';

export interface ExecutionOptions {
  timeout?: number;
  stdin?: string;
  language?: string;
}

interface UseCodeExecutionReturn {
  isExecuting: boolean;
  result: CodeSandboxExecutionResult | null;
  error: string | null;
  execute: (code: string, language: string, options?: ExecutionOptions) => Promise<CodeSandboxExecutionResult>;
  cancel: () => void;
  clear: () => void;
}

export interface CodeSandboxExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  executionTime: number;
  language: string;
  isSimulated?: boolean;
}

// Languages that can be executed in browser
const BROWSER_EXECUTABLE = ['javascript', 'typescript'];

// Languages that require Tauri sandbox
const SANDBOX_EXECUTABLE = ['python', 'go', 'rust', 'java', 'c', 'cpp', 'ruby', 'php', 'bash'];

/**
 * Simulate code execution for languages without runtime
 */
async function simulateExecution(
  code: string,
  language: string
): Promise<CodeSandboxExecutionResult> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const lineCount = code.split('\n').length;
  const hasMain = code.includes('main') || code.includes('def ') || code.includes('function');
  const hasPrint = code.includes('print') || code.includes('console.log') || code.includes('fmt.Print');

  let simulatedOutput = `[Simulated execution for ${language}]\n`;
  simulatedOutput += `Code analysis:\n`;
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
    isSimulated: true,
  };
}

/**
 * Execute JavaScript/TypeScript in browser sandbox
 */
async function executeBrowser(
  code: string,
  language: string
): Promise<CodeSandboxExecutionResult> {
  const startTime = performance.now();
  const logs: string[] = [];
  const errors: string[] = [];

  // Create sandbox with captured console
  const originalConsole = { ...console };
  const sandboxConsole = {
    log: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
    error: (...args: unknown[]) => errors.push(args.map(String).join(' ')),
    warn: (...args: unknown[]) => logs.push(`[warn] ${args.map(String).join(' ')}`),
    info: (...args: unknown[]) => logs.push(`[info] ${args.map(String).join(' ')}`),
  };

  try {
    // Replace console temporarily
    Object.assign(console, sandboxConsole);

    // TypeScript - basic transpilation (remove type annotations)
    let executableCode = code;
    if (language === 'typescript') {
      executableCode = code
        .replace(/:\s*(string|number|boolean|any|void|never|unknown|object)\b/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\binterface\s+\w+\s*\{[^}]*\}/g, '')
        .replace(/\btype\s+\w+\s*=\s*[^;]+;/g, '');
    }

    // Execute with Function constructor (safer than eval)
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

    const executionTime = performance.now() - startTime;

    return {
      success: true,
      stdout: logs.join('\n'),
      stderr: errors.join('\n'),
      exitCode: 0,
      executionTime: Math.round(executionTime),
      language,
    };
  } catch (err) {
    const executionTime = performance.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    return {
      success: false,
      stdout: logs.join('\n'),
      stderr: `Error: ${errorMessage}`,
      exitCode: 1,
      executionTime: Math.round(executionTime),
      language,
    };
  } finally {
    // Restore original console
    Object.assign(console, originalConsole);
  }
}

/**
 * Execute code via Tauri sandbox
 */
async function executeTauri(
  code: string,
  language: string,
  options: ExecutionOptions = {}
): Promise<CodeSandboxExecutionResult> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    
    const request: ExecutionRequest = {
      language,
      code,
      stdin: options.stdin,
      timeout_secs: options.timeout ? Math.floor(options.timeout / 1000) : 30,
    };

    const result = await invoke<SandboxExecutionResult>('sandbox_execute', { request });

    return {
      success: result.status === 'completed' && result.exit_code === 0,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exit_code,
      executionTime: result.execution_time_ms,
      language: result.language,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
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

export function useCodeExecution(): UseCodeExecutionReturn {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<CodeSandboxExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const isDesktop = useNativeStore((state) => state.isDesktop);

  const execute = useCallback(
    async (
      code: string,
      language: string,
      options: ExecutionOptions = {}
    ): Promise<CodeSandboxExecutionResult> => {
      setIsExecuting(true);
      setError(null);
      abortRef.current = false;

      try {
        const normalizedLang = language.toLowerCase();
        let execResult: CodeSandboxExecutionResult;

        // Determine execution strategy
        if (BROWSER_EXECUTABLE.includes(normalizedLang)) {
          // Execute in browser
          execResult = await executeBrowser(code, normalizedLang);
        } else if (SANDBOX_EXECUTABLE.includes(normalizedLang) && isDesktop) {
          // Execute in Tauri sandbox
          execResult = await executeTauri(code, normalizedLang, options);
        } else {
          // Simulate execution
          execResult = await simulateExecution(code, normalizedLang);
        }

        if (!abortRef.current) {
          setResult(execResult);
        }

        return execResult;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Execution failed';
        setError(errorMessage);

        const errorResult: CodeSandboxExecutionResult = {
          success: false,
          stdout: '',
          stderr: errorMessage,
          exitCode: 1,
          executionTime: 0,
          language,
        };
        setResult(errorResult);
        return errorResult;
      } finally {
        if (!abortRef.current) {
          setIsExecuting(false);
        }
      }
    },
    [isDesktop]
  );

  const cancel = useCallback(() => {
    abortRef.current = true;
    setIsExecuting(false);
  }, []);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    isExecuting,
    result,
    error,
    execute,
    cancel,
    clear,
  };
}

export default useCodeExecution;
