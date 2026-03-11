import type {
  SandboxConsoleLevel,
  SandboxRuntimeEvent,
  SandboxRuntimeStatus,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asConsoleLevel(value: unknown): SandboxConsoleLevel {
  if (value === 'warn' || value === 'error' || value === 'info') {
    return value;
  }
  return 'log';
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function normalizeSandpackStatus(status: string | undefined): SandboxRuntimeStatus {
  switch (status) {
    case 'running':
    case 'idle':
      return 'loading';
    case 'timeout':
      return 'error';
    default:
      return status === 'ready' ? 'ready' : 'idle';
  }
}

export function normalizeBridgeMessage(data: unknown): SandboxRuntimeEvent | null {
  if (!isRecord(data) || typeof data.type !== 'string') {
    return null;
  }

  switch (data.type) {
    case 'preview-ready':
      return { type: 'ready' };
    case 'preview-console':
      if (typeof data.message !== 'string') {
        return null;
      }
      return {
        type: 'console',
        level: asConsoleLevel(data.level),
        message: data.message,
        timestamp: asNumber(data.timestamp, Date.now()),
      };
    case 'preview-error':
      if (typeof data.message !== 'string') {
        return null;
      }
      return {
        type: 'runtime-error',
        message: data.message,
        stack: typeof data.stack === 'string' ? data.stack : undefined,
      };
    case 'element-select':
      return {
        type: 'element-select',
        elementId: typeof data.elementId === 'string' ? data.elementId : null,
      };
    case 'element-hover':
      return {
        type: 'element-hover',
        elementId: typeof data.elementId === 'string' ? data.elementId : null,
      };
    case 'component-dropped':
      if (typeof data.code !== 'string') {
        return null;
      }
      return {
        type: 'component-dropped',
        code: data.code,
        targetElementId: typeof data.targetElementId === 'string' ? data.targetElementId : null,
        position:
          data.position === 'before' ||
          data.position === 'after' ||
          data.position === 'inside' ||
          data.position === 'first-child' ||
          data.position === 'last-child'
            ? data.position
            : undefined,
      };
    case 'scroll-position':
      return {
        type: 'scroll-position',
        scrollX: asNumber(data.scrollX, 0),
        scrollY: asNumber(data.scrollY, 0),
      };
    default:
      return null;
  }
}
