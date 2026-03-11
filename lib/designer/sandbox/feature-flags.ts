const UNIFIED_SANDBOX_ENV = 'NEXT_PUBLIC_DESIGNER_UNIFIED_SANDBOX_RUNTIME';
const UNIFIED_SANDBOX_STORAGE_KEY = 'designer.unifiedSandboxRuntime';

function parseBooleanFlag(value: string | undefined): boolean | null {
  if (value === undefined) return null;

  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
    return true;
  }

  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return false;
  }

  return null;
}

export function isUnifiedDesignerSandboxRuntimeEnabled(): boolean {
  const envValue = parseBooleanFlag(process.env[UNIFIED_SANDBOX_ENV]);
  if (envValue !== null) {
    return envValue;
  }

  if (typeof window === 'undefined') {
    return true;
  }

  try {
    const localValue = parseBooleanFlag(window.localStorage.getItem(UNIFIED_SANDBOX_STORAGE_KEY) ?? undefined);
    return localValue ?? true;
  } catch {
    return true;
  }
}

export function setUnifiedDesignerSandboxRuntimeEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(UNIFIED_SANDBOX_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore storage writes in restricted environments.
  }
}

export { UNIFIED_SANDBOX_ENV, UNIFIED_SANDBOX_STORAGE_KEY };
