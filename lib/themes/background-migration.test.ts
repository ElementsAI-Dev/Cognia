import { DEFAULT_BACKGROUND_SETTINGS } from './presets';
import { migrateAndSanitizeBackgroundSettings } from './background-migration';

describe('background-migration', () => {
  it('normalizes legacy values and keeps valid URLs', () => {
    const result = migrateAndSanitizeBackgroundSettings({
      enabled: true,
      source: 'url',
      imageUrl: 'https://example.com/image.jpg',
      opacity: 500,
      blur: -10,
      mode: 'single',
    });

    expect(result.success).toBe(true);
    expect(result.settings.opacity).toBeLessThanOrEqual(100);
    expect(result.settings.blur).toBeGreaterThanOrEqual(0);
    expect(result.settings.imageUrl).toContain('https://example.com/image.jpg');
  });

  it('downgrades unresolved local source during migration', () => {
    const result = migrateAndSanitizeBackgroundSettings(
      {
        ...DEFAULT_BACKGROUND_SETTINGS,
        enabled: true,
        source: 'local',
        localAssetId: null,
        imageUrl: '',
      },
      { downgradeUnresolvedLocalToNone: true }
    );

    expect(result.success).toBe(true);
    expect(result.settings.source).toBe('none');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('rejects unsafe URL protocols', () => {
    const result = migrateAndSanitizeBackgroundSettings({
      enabled: true,
      source: 'url',
      imageUrl: 'javascript:alert(1)',
      mode: 'single',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('not allowed');
  });

  it('rejects remote svg URLs', () => {
    const result = migrateAndSanitizeBackgroundSettings({
      enabled: true,
      source: 'url',
      imageUrl: 'https://example.com/image.svg',
      mode: 'single',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('SVG');
  });

  it('allows incomplete URL source only in runtime mode', () => {
    const strictResult = migrateAndSanitizeBackgroundSettings({
      enabled: true,
      source: 'url',
      imageUrl: '',
      mode: 'single',
    });
    expect(strictResult.success).toBe(false);

    const runtimeResult = migrateAndSanitizeBackgroundSettings(
      {
        enabled: true,
        source: 'url',
        imageUrl: '',
        mode: 'single',
      },
      { allowIncompleteUrlSource: true }
    );
    expect(runtimeResult.success).toBe(true);
  });
});

