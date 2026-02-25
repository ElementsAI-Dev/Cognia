import type { WebSandboxExecutionOutput, WebSandboxLanguage } from './web-executor-runtime';

export interface WebSandboxExecutionRequest {
  code: string;
  language: string;
  timeoutMs?: number;
}

export function normalizeWebSandboxLanguage(language: string): WebSandboxLanguage | null {
  const normalized = language.trim().toLowerCase();
  if (normalized === 'javascript' || normalized === 'js') return 'javascript';
  if (normalized === 'typescript' || normalized === 'ts') return 'typescript';
  return null;
}

function makeUnsupportedResult(language: string): WebSandboxExecutionOutput {
  return {
    success: false,
    stdout: '',
    stderr: `Language '${language}' is not supported in web mode. Only JavaScript/TypeScript can run in the browser.`,
    durationMs: 0,
    language: 'javascript',
  };
}

let requestCounter = 0;
function nextId(): string {
  requestCounter += 1;
  return `web_sandbox_${requestCounter}_${Date.now()}`;
}

export async function executeInWebSandbox(
  request: WebSandboxExecutionRequest
): Promise<WebSandboxExecutionOutput> {
  const normalized = normalizeWebSandboxLanguage(request.language);
  if (!normalized) {
    return makeUnsupportedResult(request.language);
  }

  if (typeof Worker === 'undefined') {
    return {
      success: false,
      stdout: '',
      stderr: 'Web Workers are not available in this environment.',
      durationMs: 0,
      language: normalized,
    };
  }

  const timeoutMs = request.timeoutMs ?? 10_000;
  const id = nextId();

  const worker = new Worker(new URL('./web-executor.worker.ts', import.meta.url), {
    type: 'module',
  });

  return await new Promise((resolve) => {
    let finished = false;

    const finish = (result: WebSandboxExecutionOutput) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutHandle);
      worker.terminate();
      resolve(result);
    };

    const timeoutHandle = setTimeout(() => {
      finish({
        success: false,
        stdout: '',
        stderr: `Execution timed out after ${timeoutMs}ms`,
        durationMs: timeoutMs,
        language: normalized,
      });
    }, timeoutMs);

    worker.addEventListener('message', (event: MessageEvent) => {
      const data = event.data as
        | { id: string; type: 'result'; payload: WebSandboxExecutionOutput }
        | { id: string; type: 'error'; payload: { message: string } }
        | unknown;

      if (!data || typeof data !== 'object' || !('id' in data)) return;
      if ((data as { id: string }).id !== id) return;

      if ('type' in data && (data as { type: string }).type === 'result') {
        finish((data as unknown as { payload: WebSandboxExecutionOutput }).payload);
        return;
      }

      if ('type' in data && (data as { type: string }).type === 'error') {
        finish({
          success: false,
          stdout: '',
          stderr: (data as unknown as { payload: { message: string } }).payload.message,
          durationMs: 0,
          language: normalized,
        });
      }
    });

    worker.addEventListener('error', (event: ErrorEvent) => {
      finish({
        success: false,
        stdout: '',
        stderr: `Worker error: ${event.message}`,
        durationMs: 0,
        language: normalized,
      });
    });

    worker.postMessage({
      id,
      type: 'execute',
      payload: { code: request.code, language: normalized },
    });
  });
}

