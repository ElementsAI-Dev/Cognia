import { getPPTFeatureFlags, isPPTFeatureFlagEnabled } from './feature-flags';

describe('ppt feature flags', () => {
  const originalEnv = process.env.NEXT_PUBLIC_PPT_CANVA_EXPERIENCE_V1;

  beforeEach(() => {
    window.localStorage.clear();
    delete process.env.NEXT_PUBLIC_PPT_CANVA_EXPERIENCE_V1;
  });

  afterAll(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_PPT_CANVA_EXPERIENCE_V1;
      return;
    }
    process.env.NEXT_PUBLIC_PPT_CANVA_EXPERIENCE_V1 = originalEnv;
  });

  it('defaults canva experience flag to false', () => {
    expect(getPPTFeatureFlags()['ppt.canvaExperience.v1']).toBe(false);
    expect(isPPTFeatureFlagEnabled('ppt.canvaExperience.v1')).toBe(false);
  });

  it('supports env override', () => {
    process.env.NEXT_PUBLIC_PPT_CANVA_EXPERIENCE_V1 = 'true';
    expect(getPPTFeatureFlags()['ppt.canvaExperience.v1']).toBe(true);
  });

  it('prefers localStorage override over env value', () => {
    process.env.NEXT_PUBLIC_PPT_CANVA_EXPERIENCE_V1 = 'false';
    window.localStorage.setItem(
      'cognia-ppt-feature-flags-v1',
      JSON.stringify({ 'ppt.canvaExperience.v1': true })
    );

    expect(getPPTFeatureFlags()['ppt.canvaExperience.v1']).toBe(true);
  });
});

