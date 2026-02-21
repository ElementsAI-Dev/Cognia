import {
  DEFAULT_BACKGROUND_SETTINGS,
  type BackgroundLayerSettings,
  type BackgroundSettings,
} from './presets';
import { getRenderableLayers, isBackgroundRenderable } from './background-activity';

function createLayer(overrides: Partial<BackgroundLayerSettings> = {}): BackgroundLayerSettings {
  return {
    ...DEFAULT_BACKGROUND_SETTINGS.layers[0],
    id: overrides.id ?? 'layer-test',
    ...overrides,
  };
}

describe('background-activity', () => {
  it('detects renderable single background', () => {
    const settings: BackgroundSettings = {
      ...DEFAULT_BACKGROUND_SETTINGS,
      enabled: true,
      mode: 'single',
      source: 'url',
      imageUrl: 'https://example.com/bg.png',
    };

    expect(isBackgroundRenderable(settings)).toBe(true);
    expect(getRenderableLayers(settings)).toHaveLength(1);
  });

  it('single mode with empty source is not renderable', () => {
    const settings: BackgroundSettings = {
      ...DEFAULT_BACKGROUND_SETTINGS,
      enabled: true,
      mode: 'single',
      source: 'url',
      imageUrl: '',
    };

    expect(isBackgroundRenderable(settings)).toBe(false);
  });

  it('filters non-renderable layers in layers mode', () => {
    const settings: BackgroundSettings = {
      ...DEFAULT_BACKGROUND_SETTINGS,
      enabled: true,
      mode: 'layers',
      layers: [
        createLayer({ id: 'a', source: 'none' }),
        createLayer({ id: 'b', source: 'url', imageUrl: 'https://example.com/a.jpg' }),
        createLayer({ id: 'c', source: 'preset', presetId: 'gradient-blue' }),
        createLayer({ id: 'd', source: 'local', localAssetId: null, imageUrl: '' }),
      ],
    };

    const layers = getRenderableLayers(settings);
    expect(layers.map((layer) => layer.id)).toEqual(['b', 'c']);
  });

  it('slideshow mode only keeps renderable slides', () => {
    const settings: BackgroundSettings = {
      ...DEFAULT_BACKGROUND_SETTINGS,
      enabled: true,
      mode: 'slideshow',
      slideshow: {
        ...DEFAULT_BACKGROUND_SETTINGS.slideshow,
        slides: [
          createLayer({ id: 's1', source: 'url', imageUrl: 'https://example.com/1.jpg' }),
          createLayer({ id: 's2', source: 'url', imageUrl: '' }),
          createLayer({ id: 's3', source: 'preset', presetId: 'gradient-blue' }),
        ],
      },
    };

    const slides = getRenderableLayers(settings);
    expect(slides.map((slide) => slide.id)).toEqual(['s1', 's3']);
    expect(isBackgroundRenderable(settings)).toBe(true);
  });
});

