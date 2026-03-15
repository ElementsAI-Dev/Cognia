export type CanvasFeatureFlag = 'canvas.aiWorkbench.v1';

const CANVAS_FEATURE_FLAGS_KEY = 'cognia-canvas-feature-flags-v1';

const DEFAULT_CANVAS_FEATURE_FLAGS: Record<CanvasFeatureFlag, boolean> = {
  'canvas.aiWorkbench.v1': true,
};

function readStoredCanvasFeatureFlags(): Partial<Record<CanvasFeatureFlag, boolean>> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(CANVAS_FEATURE_FLAGS_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Partial<Record<CanvasFeatureFlag, unknown>>;
    const result: Partial<Record<CanvasFeatureFlag, boolean>> = {};
    if (typeof parsed['canvas.aiWorkbench.v1'] === 'boolean') {
      result['canvas.aiWorkbench.v1'] = parsed['canvas.aiWorkbench.v1'];
    }
    return result;
  } catch {
    return {};
  }
}

function readEnvCanvasFeatureFlags(): Partial<Record<CanvasFeatureFlag, boolean>> {
  const raw = process.env.NEXT_PUBLIC_CANVAS_AI_WORKBENCH_V1;
  if (raw === '0' || raw === 'false') {
    return { 'canvas.aiWorkbench.v1': false };
  }
  if (raw === '1' || raw === 'true') {
    return { 'canvas.aiWorkbench.v1': true };
  }
  return {};
}

export function getCanvasFeatureFlags(): Record<CanvasFeatureFlag, boolean> {
  return {
    ...DEFAULT_CANVAS_FEATURE_FLAGS,
    ...readEnvCanvasFeatureFlags(),
    ...readStoredCanvasFeatureFlags(),
  };
}

export function isCanvasFeatureFlagEnabled(flag: CanvasFeatureFlag): boolean {
  return getCanvasFeatureFlags()[flag];
}
