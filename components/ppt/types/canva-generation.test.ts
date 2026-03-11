import {
  createDefaultBlueprintWithStyleKit,
  parseGenerationBlueprint,
  resolveStyleKitId,
} from './canva-generation';
import { DEFAULT_PPT_STYLE_KITS } from '@/types/workflow';

describe('canva-generation types helpers', () => {
  it('parseGenerationBlueprint applies runtime-safe defaults', () => {
    const blueprint = parseGenerationBlueprint();

    expect(blueprint.templateDirection).toBe('storytelling');
    expect(blueprint.audienceTone).toBe('professional');
    expect(blueprint.contentDensity).toBe('balanced');
    expect(blueprint.styleKitId).toBe('canva-clean');
    expect(blueprint.styleTokens).toEqual(DEFAULT_PPT_STYLE_KITS['canva-clean']);
  });

  it('parseGenerationBlueprint keeps explicit style-kit intent', () => {
    const blueprint = parseGenerationBlueprint({
      styleKitId: 'canva-bold',
      templateDirection: 'pitch-deck',
      audienceTone: 'executive',
      contentDensity: 'dense',
    });

    expect(blueprint.styleKitId).toBe('canva-bold');
    expect(blueprint.styleTokens).toEqual(DEFAULT_PPT_STYLE_KITS['canva-bold']);
    expect(blueprint.templateDirection).toBe('pitch-deck');
    expect(blueprint.audienceTone).toBe('executive');
    expect(blueprint.contentDensity).toBe('dense');
  });

  it('resolveStyleKitId falls back to canva-clean for unknown values', () => {
    expect(resolveStyleKitId('canva-elegant')).toBe('canva-elegant');
    expect(resolveStyleKitId('unknown-kit')).toBe('canva-clean');
    expect(resolveStyleKitId()).toBe('canva-clean');
  });

  it('createDefaultBlueprintWithStyleKit uses selected kit tokens', () => {
    const blueprint = createDefaultBlueprintWithStyleKit('canva-playful');
    expect(blueprint.styleKitId).toBe('canva-playful');
    expect(blueprint.styleTokens).toEqual(DEFAULT_PPT_STYLE_KITS['canva-playful']);
  });

  it('parseGenerationBlueprint rejects invalid token shape', () => {
    expect(() =>
      parseGenerationBlueprint({
        styleTokens: {
          palette: ['#fff'] as unknown as [string, string, string, string],
          typographyPair: ['Inter', 'Inter'],
          spacingRhythm: 'balanced',
          visualWeight: 'balanced',
          cornerRadius: 'rounded',
        },
      })
    ).toThrow();
  });
});
