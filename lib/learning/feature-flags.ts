const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSY_VALUES = new Set(['0', 'false', 'no', 'off']);

const LEARNING_MODE_V2_STORAGE_KEY = 'cognia.learningModeV2Enabled';
const LEARNING_INTEROP_V2_STORAGE_KEY = 'cognia.learningInteropV2Enabled';

function parseBooleanLike(value: string | null | undefined): boolean | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (TRUTHY_VALUES.has(normalized)) {
    return true;
  }
  if (FALSY_VALUES.has(normalized)) {
    return false;
  }
  return undefined;
}

function readLocalStorageFlag(storageKey: string): boolean | undefined {
  if (typeof window === 'undefined' || !window.localStorage) {
    return undefined;
  }

  try {
    return parseBooleanLike(window.localStorage.getItem(storageKey));
  } catch {
    return undefined;
  }
}

function resolveDefaultEnabled(): boolean {
  return process.env.NODE_ENV !== 'production';
}

export function isLearningModeV2Enabled(): boolean {
  const localOverride = readLocalStorageFlag(LEARNING_MODE_V2_STORAGE_KEY);
  if (localOverride !== undefined) {
    return localOverride;
  }

  const envOverride = parseBooleanLike(process.env.NEXT_PUBLIC_LEARNING_MODE_V2_ENABLED);
  if (envOverride !== undefined) {
    return envOverride;
  }

  return resolveDefaultEnabled();
}

export function isLearningInteropV2Enabled(): boolean {
  const localOverride = readLocalStorageFlag(LEARNING_INTEROP_V2_STORAGE_KEY);
  if (localOverride !== undefined) {
    return localOverride;
  }

  const envOverride = parseBooleanLike(process.env.NEXT_PUBLIC_LEARNING_INTEROP_V2_ENABLED);
  if (envOverride !== undefined) {
    return envOverride;
  }

  return resolveDefaultEnabled();
}

export const learningFeatureFlagKeys = {
  learningModeV2Enabled: LEARNING_MODE_V2_STORAGE_KEY,
  learningInteropV2Enabled: LEARNING_INTEROP_V2_STORAGE_KEY,
} as const;
