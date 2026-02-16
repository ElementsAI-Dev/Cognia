import { renderHook, act } from '@testing-library/react';
import { useBackgroundEditor } from './use-background-editor';
import { useSettingsStore } from '@/stores';
import { DEFAULT_BACKGROUND_SETTINGS } from '@/lib/themes';

// Mock the stores module
jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn(),
}));

const mockUseSettingsStore = useSettingsStore as jest.MockedFunction<typeof useSettingsStore>;

describe('useBackgroundEditor', () => {
  // Mock all store functions
  const mockSetBackgroundSettings = jest.fn();
  const mockSetBackgroundFit = jest.fn();
  const mockSetBackgroundPosition = jest.fn();
  const mockSetBackgroundOpacity = jest.fn();
  const mockSetBackgroundBlur = jest.fn();
  const mockSetBackgroundOverlay = jest.fn();
  const mockSetBackgroundBrightness = jest.fn();
  const mockSetBackgroundSaturation = jest.fn();
  const mockSetBackgroundContrast = jest.fn();
  const mockSetBackgroundGrayscale = jest.fn();
  const mockSetBackgroundAttachment = jest.fn();
  const mockSetBackgroundAnimation = jest.fn();
  const mockSetBackgroundAnimationSpeed = jest.fn();

  const createMockState = (overrides = {}) => ({
    backgroundSettings: { ...DEFAULT_BACKGROUND_SETTINGS },
    setBackgroundSettings: mockSetBackgroundSettings,
    setBackgroundFit: mockSetBackgroundFit,
    setBackgroundPosition: mockSetBackgroundPosition,
    setBackgroundOpacity: mockSetBackgroundOpacity,
    setBackgroundBlur: mockSetBackgroundBlur,
    setBackgroundOverlay: mockSetBackgroundOverlay,
    setBackgroundBrightness: mockSetBackgroundBrightness,
    setBackgroundSaturation: mockSetBackgroundSaturation,
    setBackgroundContrast: mockSetBackgroundContrast,
    setBackgroundGrayscale: mockSetBackgroundGrayscale,
    setBackgroundAttachment: mockSetBackgroundAttachment,
    setBackgroundAnimation: mockSetBackgroundAnimation,
    setBackgroundAnimationSpeed: mockSetBackgroundAnimationSpeed,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSettingsStore.mockImplementation((selector) => {
      const state = createMockState();
      return selector(state as unknown as Parameters<typeof selector>[0]);
    });
  });

  it('returns correct initial state for single mode', () => {
    const { result } = renderHook(() => useBackgroundEditor());

    expect(result.current.editorMode).toBe('single');
    expect(result.current.items).toBeNull();
    expect(result.current.selectedItem).toBeNull();
    expect(result.current.activeItemIndex).toBe(0);
  });

  it('returns items for layers mode', () => {
    mockUseSettingsStore.mockImplementation((selector) => {
      const state = createMockState({
        backgroundSettings: {
          ...DEFAULT_BACKGROUND_SETTINGS,
          mode: 'layers' as const,
          layers: [
            { ...DEFAULT_BACKGROUND_SETTINGS.layers[0], id: 'layer-1' },
            { ...DEFAULT_BACKGROUND_SETTINGS.layers[0], id: 'layer-2' },
          ],
        },
      });
      return selector(state as unknown as Parameters<typeof selector>[0]);
    });

    const { result } = renderHook(() => useBackgroundEditor());

    expect(result.current.editorMode).toBe('layers');
    expect(result.current.items).toHaveLength(2);
    expect(result.current.selectedItem?.id).toBe('layer-1');
  });

  it('returns items for slideshow mode', () => {
    mockUseSettingsStore.mockImplementation((selector) => {
      const state = createMockState({
        backgroundSettings: {
          ...DEFAULT_BACKGROUND_SETTINGS,
          mode: 'slideshow' as const,
          slideshow: {
            ...DEFAULT_BACKGROUND_SETTINGS.slideshow,
            slides: [
              { ...DEFAULT_BACKGROUND_SETTINGS.layers[0], id: 'slide-1' },
              { ...DEFAULT_BACKGROUND_SETTINGS.layers[0], id: 'slide-2' },
            ],
          },
        },
      });
      return selector(state as unknown as Parameters<typeof selector>[0]);
    });

    const { result } = renderHook(() => useBackgroundEditor());

    expect(result.current.editorMode).toBe('slideshow');
    expect(result.current.items).toHaveLength(2);
  });

  it('setActiveItemIndex updates selected item', () => {
    mockUseSettingsStore.mockImplementation((selector) => {
      const state = createMockState({
        backgroundSettings: {
          ...DEFAULT_BACKGROUND_SETTINGS,
          mode: 'layers' as const,
          layers: [
            { ...DEFAULT_BACKGROUND_SETTINGS.layers[0], id: 'layer-1' },
            { ...DEFAULT_BACKGROUND_SETTINGS.layers[0], id: 'layer-2' },
          ],
        },
      });
      return selector(state as unknown as Parameters<typeof selector>[0]);
    });

    const { result } = renderHook(() => useBackgroundEditor());

    act(() => {
      result.current.setActiveItemIndex(1);
    });

    expect(result.current.activeItemIndex).toBe(1);
    expect(result.current.selectedItem?.id).toBe('layer-2');
  });

  it('bounds activeItemIndex to valid range', () => {
    mockUseSettingsStore.mockImplementation((selector) => {
      const state = createMockState({
        backgroundSettings: {
          ...DEFAULT_BACKGROUND_SETTINGS,
          mode: 'layers' as const,
          layers: [
            { ...DEFAULT_BACKGROUND_SETTINGS.layers[0], id: 'layer-1' },
          ],
        },
      });
      return selector(state as unknown as Parameters<typeof selector>[0]);
    });

    const { result } = renderHook(() => useBackgroundEditor());

    act(() => {
      result.current.setActiveItemIndex(10); // Out of bounds
    });

    // Should be clamped to valid range
    expect(result.current.activeItemIndex).toBe(0);
  });

  it('updateSelectedItem calls setBackgroundSettings for single mode', () => {
    const { result } = renderHook(() => useBackgroundEditor());

    act(() => {
      result.current.updateSelectedItem({ opacity: 50 });
    });

    expect(mockSetBackgroundSettings).toHaveBeenCalledWith({ opacity: 50 });
  });

  it('updateSelectedItem updates correct layer in layers mode', () => {
    mockUseSettingsStore.mockImplementation((selector) => {
      const state = createMockState({
        backgroundSettings: {
          ...DEFAULT_BACKGROUND_SETTINGS,
          mode: 'layers' as const,
          layers: [
            { ...DEFAULT_BACKGROUND_SETTINGS.layers[0], id: 'layer-1', opacity: 100 },
            { ...DEFAULT_BACKGROUND_SETTINGS.layers[0], id: 'layer-2', opacity: 100 },
          ],
        },
      });
      return selector(state as unknown as Parameters<typeof selector>[0]);
    });

    const { result } = renderHook(() => useBackgroundEditor());

    act(() => {
      result.current.updateSelectedItem({ opacity: 50 });
    });

    expect(mockSetBackgroundSettings).toHaveBeenCalledWith({
      layers: expect.arrayContaining([
        expect.objectContaining({ id: 'layer-1', opacity: 50 }),
        expect.objectContaining({ id: 'layer-2', opacity: 100 }),
      ]),
    });
  });

  it('effectiveSettings merges selectedItem properties', () => {
    mockUseSettingsStore.mockImplementation((selector) => {
      const state = createMockState({
        backgroundSettings: {
          ...DEFAULT_BACKGROUND_SETTINGS,
          mode: 'layers' as const,
          layers: [
            { ...DEFAULT_BACKGROUND_SETTINGS.layers[0], id: 'layer-1', opacity: 75 },
          ],
        },
      });
      return selector(state as unknown as Parameters<typeof selector>[0]);
    });

    const { result } = renderHook(() => useBackgroundEditor());

    expect(result.current.effectiveSettings.opacity).toBe(75);
  });

  it('isSingleMode is true for single mode', () => {
    const { result } = renderHook(() => useBackgroundEditor());
    expect(result.current.isSingleMode).toBe(true);
  });

  it('isSingleMode is false for layers mode', () => {
    mockUseSettingsStore.mockImplementation((selector) => {
      const state = createMockState({
        backgroundSettings: {
          ...DEFAULT_BACKGROUND_SETTINGS,
          mode: 'layers' as const,
          layers: [{ ...DEFAULT_BACKGROUND_SETTINGS.layers[0], id: 'layer-1' }],
        },
      });
      return selector(state as unknown as Parameters<typeof selector>[0]);
    });

    const { result } = renderHook(() => useBackgroundEditor());
    expect(result.current.isSingleMode).toBe(false);
  });

  describe('specific updaters in single mode', () => {
    it('updateFit calls setBackgroundFit', () => {
      const { result } = renderHook(() => useBackgroundEditor());

      act(() => {
        result.current.updateFit('contain');
      });

      expect(mockSetBackgroundFit).toHaveBeenCalledWith('contain');
    });

    it('updatePosition calls setBackgroundPosition', () => {
      const { result } = renderHook(() => useBackgroundEditor());

      act(() => {
        result.current.updatePosition('top-left');
      });

      expect(mockSetBackgroundPosition).toHaveBeenCalledWith('top-left');
    });

    it('updateOpacity calls setBackgroundOpacity', () => {
      const { result } = renderHook(() => useBackgroundEditor());

      act(() => {
        result.current.updateOpacity(80);
      });

      expect(mockSetBackgroundOpacity).toHaveBeenCalledWith(80);
    });

    it('updateBlur calls setBackgroundBlur', () => {
      const { result } = renderHook(() => useBackgroundEditor());

      act(() => {
        result.current.updateBlur(10);
      });

      expect(mockSetBackgroundBlur).toHaveBeenCalledWith(10);
    });

    it('updateBrightness calls setBackgroundBrightness', () => {
      const { result } = renderHook(() => useBackgroundEditor());

      act(() => {
        result.current.updateBrightness(120);
      });

      expect(mockSetBackgroundBrightness).toHaveBeenCalledWith(120);
    });

    it('updateSaturation calls setBackgroundSaturation', () => {
      const { result } = renderHook(() => useBackgroundEditor());

      act(() => {
        result.current.updateSaturation(150);
      });

      expect(mockSetBackgroundSaturation).toHaveBeenCalledWith(150);
    });

    it('updateContrast calls setBackgroundContrast', () => {
      const { result } = renderHook(() => useBackgroundEditor());

      act(() => {
        result.current.updateContrast(110);
      });

      expect(mockSetBackgroundContrast).toHaveBeenCalledWith(110);
    });

    it('updateGrayscale calls setBackgroundGrayscale', () => {
      const { result } = renderHook(() => useBackgroundEditor());

      act(() => {
        result.current.updateGrayscale(50);
      });

      expect(mockSetBackgroundGrayscale).toHaveBeenCalledWith(50);
    });

    it('updateAttachment calls setBackgroundAttachment', () => {
      const { result } = renderHook(() => useBackgroundEditor());

      act(() => {
        result.current.updateAttachment('scroll');
      });

      expect(mockSetBackgroundAttachment).toHaveBeenCalledWith('scroll');
    });

    it('updateAnimation calls setBackgroundAnimation', () => {
      const { result } = renderHook(() => useBackgroundEditor());

      act(() => {
        result.current.updateAnimation('kenburns');
      });

      expect(mockSetBackgroundAnimation).toHaveBeenCalledWith('kenburns');
    });

    it('updateAnimationSpeed calls setBackgroundAnimationSpeed', () => {
      const { result } = renderHook(() => useBackgroundEditor());

      act(() => {
        result.current.updateAnimationSpeed(8);
      });

      expect(mockSetBackgroundAnimationSpeed).toHaveBeenCalledWith(8);
    });

    it('updateOverlayColor calls setBackgroundOverlay with color and current opacity', () => {
      const { result } = renderHook(() => useBackgroundEditor());

      act(() => {
        result.current.updateOverlayColor('#ff0000');
      });

      expect(mockSetBackgroundOverlay).toHaveBeenCalledWith(
        '#ff0000',
        DEFAULT_BACKGROUND_SETTINGS.overlayOpacity
      );
    });

    it('updateOverlayOpacity calls setBackgroundOverlay with current color and opacity', () => {
      const { result } = renderHook(() => useBackgroundEditor());

      act(() => {
        result.current.updateOverlayOpacity(0.5);
      });

      expect(mockSetBackgroundOverlay).toHaveBeenCalledWith(
        DEFAULT_BACKGROUND_SETTINGS.overlayColor,
        0.5
      );
    });
  });

  describe('specific updaters in layers mode', () => {
    beforeEach(() => {
      mockUseSettingsStore.mockImplementation((selector) => {
        const state = createMockState({
          backgroundSettings: {
            ...DEFAULT_BACKGROUND_SETTINGS,
            mode: 'layers' as const,
            layers: [
              { ...DEFAULT_BACKGROUND_SETTINGS.layers[0], id: 'layer-1', opacity: 100 },
              { ...DEFAULT_BACKGROUND_SETTINGS.layers[0], id: 'layer-2', opacity: 100 },
            ],
          },
        });
        return selector(state as unknown as Parameters<typeof selector>[0]);
      });
    });

    it('updateFit updates layer via updateSelectedItem', () => {
      const { result } = renderHook(() => useBackgroundEditor());

      act(() => {
        result.current.updateFit('contain');
      });

      expect(mockSetBackgroundSettings).toHaveBeenCalledWith({
        layers: expect.arrayContaining([
          expect.objectContaining({ id: 'layer-1', fit: 'contain' }),
        ]),
      });
      expect(mockSetBackgroundFit).not.toHaveBeenCalled();
    });

    it('updateOpacity updates layer via updateSelectedItem', () => {
      const { result } = renderHook(() => useBackgroundEditor());

      act(() => {
        result.current.updateOpacity(75);
      });

      expect(mockSetBackgroundSettings).toHaveBeenCalledWith({
        layers: expect.arrayContaining([
          expect.objectContaining({ id: 'layer-1', opacity: 75 }),
        ]),
      });
      expect(mockSetBackgroundOpacity).not.toHaveBeenCalled();
    });

    it('updateBlur updates layer via updateSelectedItem', () => {
      const { result } = renderHook(() => useBackgroundEditor());

      act(() => {
        result.current.updateBlur(15);
      });

      expect(mockSetBackgroundSettings).toHaveBeenCalledWith({
        layers: expect.arrayContaining([
          expect.objectContaining({ id: 'layer-1', blur: 15 }),
        ]),
      });
    });

    it('updateOverlayColor updates layer via updateSelectedItem', () => {
      const { result } = renderHook(() => useBackgroundEditor());

      act(() => {
        result.current.updateOverlayColor('#00ff00');
      });

      expect(mockSetBackgroundSettings).toHaveBeenCalledWith({
        layers: expect.arrayContaining([
          expect.objectContaining({ id: 'layer-1', overlayColor: '#00ff00' }),
        ]),
      });
      expect(mockSetBackgroundOverlay).not.toHaveBeenCalled();
    });
  });

  describe('addItem and removeItem', () => {
    it('addItem adds a new layer in layers mode', () => {
      mockUseSettingsStore.mockImplementation((selector) => {
        const state = createMockState({
          backgroundSettings: {
            ...DEFAULT_BACKGROUND_SETTINGS,
            mode: 'layers' as const,
            layers: [{ ...DEFAULT_BACKGROUND_SETTINGS.layers[0], id: 'layer-1' }],
          },
        });
        return selector(state as unknown as Parameters<typeof selector>[0]);
      });

      const { result } = renderHook(() => useBackgroundEditor());

      act(() => {
        result.current.addItem();
      });

      const updatePayload = mockSetBackgroundSettings.mock.calls[0]?.[0] as {
        layers: Array<{ id: string }>;
      };

      expect(updatePayload.layers).toHaveLength(2);
      expect(updatePayload.layers).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 'layer-1' })])
      );
      expect(
        updatePayload.layers.some(
          (layer) => layer.id.startsWith('layer-') && layer.id !== 'layer-1'
        )
      ).toBe(true);
    });

    it('removeItem removes a layer in layers mode', () => {
      mockUseSettingsStore.mockImplementation((selector) => {
        const state = createMockState({
          backgroundSettings: {
            ...DEFAULT_BACKGROUND_SETTINGS,
            mode: 'layers' as const,
            layers: [
              { ...DEFAULT_BACKGROUND_SETTINGS.layers[0], id: 'layer-1' },
              { ...DEFAULT_BACKGROUND_SETTINGS.layers[0], id: 'layer-2' },
            ],
          },
        });
        return selector(state as unknown as Parameters<typeof selector>[0]);
      });

      const { result } = renderHook(() => useBackgroundEditor());

      act(() => {
        result.current.removeItem(0);
      });

      expect(mockSetBackgroundSettings).toHaveBeenCalledWith({
        layers: [expect.objectContaining({ id: 'layer-2' })],
      });
    });

    it('removeItem does not remove last item', () => {
      mockUseSettingsStore.mockImplementation((selector) => {
        const state = createMockState({
          backgroundSettings: {
            ...DEFAULT_BACKGROUND_SETTINGS,
            mode: 'layers' as const,
            layers: [{ ...DEFAULT_BACKGROUND_SETTINGS.layers[0], id: 'layer-1' }],
          },
        });
        return selector(state as unknown as Parameters<typeof selector>[0]);
      });

      const { result } = renderHook(() => useBackgroundEditor());

      act(() => {
        result.current.removeItem(0);
      });

      // Should not call setBackgroundSettings since we can't remove last item
      expect(mockSetBackgroundSettings).not.toHaveBeenCalled();
    });
  });
});
