export type PPTFeatureFlag = 'ppt.canvaExperience.v1';

const PPT_FEATURE_FLAGS_KEY = 'cognia-ppt-feature-flags-v1';

const DEFAULT_PPT_FEATURE_FLAGS: Record<PPTFeatureFlag, boolean> = {
  'ppt.canvaExperience.v1': false,
};

function readStoredFlags(): Partial<Record<PPTFeatureFlag, boolean>> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(PPT_FEATURE_FLAGS_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Partial<Record<PPTFeatureFlag, unknown>>;
    const result: Partial<Record<PPTFeatureFlag, boolean>> = {};
    if (typeof parsed['ppt.canvaExperience.v1'] === 'boolean') {
      result['ppt.canvaExperience.v1'] = parsed['ppt.canvaExperience.v1'];
    }
    return result;
  } catch {
    return {};
  }
}

function readEnvFlags(): Partial<Record<PPTFeatureFlag, boolean>> {
  const raw = process.env.NEXT_PUBLIC_PPT_CANVA_EXPERIENCE_V1;
  if (raw === '1' || raw === 'true') {
    return { 'ppt.canvaExperience.v1': true };
  }
  if (raw === '0' || raw === 'false') {
    return { 'ppt.canvaExperience.v1': false };
  }
  return {};
}

export function getPPTFeatureFlags(): Record<PPTFeatureFlag, boolean> {
  return {
    ...DEFAULT_PPT_FEATURE_FLAGS,
    ...readEnvFlags(),
    ...readStoredFlags(),
  };
}

export function isPPTFeatureFlagEnabled(flag: PPTFeatureFlag): boolean {
  return getPPTFeatureFlags()[flag];
}

