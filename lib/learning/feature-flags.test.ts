/**
 * @jest-environment jsdom
 */
import {
  isLearningInteropV2Enabled,
  isLearningModeV2Enabled,
  learningFeatureFlagKeys,
} from './feature-flags';

describe('learning feature flags', () => {
  const originalModeEnv = process.env.NEXT_PUBLIC_LEARNING_MODE_V2_ENABLED;
  const originalInteropEnv = process.env.NEXT_PUBLIC_LEARNING_INTEROP_V2_ENABLED;
  const originalNodeEnv = process.env.NODE_ENV;
  const mutableEnv = process.env as Record<string, string | undefined>;

  beforeEach(() => {
    localStorage.clear();
    process.env.NEXT_PUBLIC_LEARNING_MODE_V2_ENABLED = undefined;
    process.env.NEXT_PUBLIC_LEARNING_INTEROP_V2_ENABLED = undefined;
    mutableEnv.NODE_ENV = 'production';
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_LEARNING_MODE_V2_ENABLED = originalModeEnv;
    process.env.NEXT_PUBLIC_LEARNING_INTEROP_V2_ENABLED = originalInteropEnv;
    mutableEnv.NODE_ENV = originalNodeEnv;
  });

  it('defaults to disabled in production without overrides', () => {
    expect(isLearningModeV2Enabled()).toBe(false);
    expect(isLearningInteropV2Enabled()).toBe(false);
  });

  it('respects environment variable overrides', () => {
    process.env.NEXT_PUBLIC_LEARNING_MODE_V2_ENABLED = 'true';
    process.env.NEXT_PUBLIC_LEARNING_INTEROP_V2_ENABLED = '1';

    expect(isLearningModeV2Enabled()).toBe(true);
    expect(isLearningInteropV2Enabled()).toBe(true);
  });

  it('prioritizes localStorage override over environment variable', () => {
    process.env.NEXT_PUBLIC_LEARNING_MODE_V2_ENABLED = 'false';
    localStorage.setItem(learningFeatureFlagKeys.learningModeV2Enabled, 'true');

    expect(isLearningModeV2Enabled()).toBe(true);
  });

  it('defaults to enabled in non-production when unset', () => {
    mutableEnv.NODE_ENV = 'development';

    expect(isLearningModeV2Enabled()).toBe(true);
    expect(isLearningInteropV2Enabled()).toBe(true);
  });
});
