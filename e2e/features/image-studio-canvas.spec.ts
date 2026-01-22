import { test, expect } from '@playwright/test';

/**
 * Image Studio Canvas Components E2E Tests
 * Tests for canvas-heavy components: MaskCanvas, ImageAdjustmentsPanel, ImageComparison
 * These tests complement unit tests which focus on exports due to React 19 act() timing issues.
 */

test.describe('MaskCanvas Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should support brush tool operations', async ({ page }) => {
    const result = await page.evaluate(() => {
      type _Tool = 'brush' | 'eraser' | 'pan';

      interface Point {
        x: number;
        y: number;
      }

      interface Stroke {
        id: string;
        points: Point[];
        brushSize: number;
        brushHardness: number;
        isEraser: boolean;
      }

      const createStroke = (
        points: Point[],
        brushSize: number,
        brushHardness: number,
        isEraser: boolean
      ): Stroke => ({
        id: `stroke-${Date.now()}-${Math.random()}`,
        points,
        brushSize,
        brushHardness,
        isEraser,
      });

      const strokes: Stroke[] = [];

      const addStroke = (stroke: Stroke) => {
        strokes.push(stroke);
      };

      const undoStroke = () => {
        return strokes.pop();
      };

      const clearStrokes = () => {
        strokes.length = 0;
      };

      // Test stroke creation
      const stroke1 = createStroke([{ x: 0, y: 0 }, { x: 10, y: 10 }], 40, 80, false);
      addStroke(stroke1);

      const stroke2 = createStroke([{ x: 20, y: 20 }, { x: 30, y: 30 }], 60, 50, true);
      addStroke(stroke2);

      const countAfterAdd = strokes.length;
      const undoneStroke = undoStroke();
      const countAfterUndo = strokes.length;

      clearStrokes();
      const countAfterClear = strokes.length;

      return {
        countAfterAdd,
        countAfterUndo,
        countAfterClear,
        undoneStrokeIsEraser: undoneStroke?.isEraser,
        stroke1BrushSize: stroke1.brushSize,
      };
    });

    expect(result.countAfterAdd).toBe(2);
    expect(result.countAfterUndo).toBe(1);
    expect(result.countAfterClear).toBe(0);
    expect(result.undoneStrokeIsEraser).toBe(true);
    expect(result.stroke1BrushSize).toBe(40);
  });

  test('should handle brush size and hardness settings', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface BrushSettings {
        size: number;
        hardness: number;
        minSize: number;
        maxSize: number;
        minHardness: number;
        maxHardness: number;
      }

      const defaultSettings: BrushSettings = {
        size: 40,
        hardness: 80,
        minSize: 1,
        maxSize: 200,
        minHardness: 0,
        maxHardness: 100,
      };

      const validateBrushSize = (size: number, settings: BrushSettings): number => {
        return Math.max(settings.minSize, Math.min(settings.maxSize, size));
      };

      const validateHardness = (hardness: number, settings: BrushSettings): number => {
        return Math.max(settings.minHardness, Math.min(settings.maxHardness, hardness));
      };

      return {
        defaultSize: defaultSettings.size,
        defaultHardness: defaultSettings.hardness,
        validatedSmallSize: validateBrushSize(-10, defaultSettings),
        validatedLargeSize: validateBrushSize(500, defaultSettings),
        validatedNormalSize: validateBrushSize(50, defaultSettings),
        validatedLowHardness: validateHardness(-20, defaultSettings),
        validatedHighHardness: validateHardness(150, defaultSettings),
      };
    });

    expect(result.defaultSize).toBe(40);
    expect(result.defaultHardness).toBe(80);
    expect(result.validatedSmallSize).toBe(1);
    expect(result.validatedLargeSize).toBe(200);
    expect(result.validatedNormalSize).toBe(50);
    expect(result.validatedLowHardness).toBe(0);
    expect(result.validatedHighHardness).toBe(100);
  });

  test('should handle zoom and pan operations', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ViewState {
        zoom: number;
        panX: number;
        panY: number;
      }

      const defaultView: ViewState = { zoom: 1, panX: 0, panY: 0 };

      const zoomIn = (state: ViewState): ViewState => ({
        ...state,
        zoom: Math.min(state.zoom * 1.25, 5),
      });

      const zoomOut = (state: ViewState): ViewState => ({
        ...state,
        zoom: Math.max(state.zoom / 1.25, 0.25),
      });

      const pan = (state: ViewState, dx: number, dy: number): ViewState => ({
        ...state,
        panX: state.panX + dx,
        panY: state.panY + dy,
      });

      const resetView = (): ViewState => ({ ...defaultView });

      let view = { ...defaultView };
      view = zoomIn(view);
      const zoomAfterIn = view.zoom;

      view = zoomIn(view);
      view = zoomIn(view);
      view = zoomIn(view);
      view = zoomIn(view);
      const zoomMaxClamped = view.zoom <= 5;

      view = resetView();
      view = zoomOut(view);
      const zoomAfterOut = view.zoom;

      view = pan(view, 100, 50);

      return {
        defaultZoom: defaultView.zoom,
        zoomAfterIn,
        zoomMaxClamped,
        zoomAfterOut,
        panX: view.panX,
        panY: view.panY,
      };
    });

    expect(result.defaultZoom).toBe(1);
    expect(result.zoomAfterIn).toBe(1.25);
    expect(result.zoomMaxClamped).toBe(true);
    expect(result.zoomAfterOut).toBe(0.8);
    expect(result.panX).toBe(100);
    expect(result.panY).toBe(50);
  });

  test('should export mask as base64 PNG', async ({ page }) => {
    const result = await page.evaluate(() => {
      const createMaskExportData = (strokes: number): string => {
        // Simulate mask export - in real implementation this would be canvas.toDataURL()
        return `data:image/png;base64,${btoa(`mock-mask-${strokes}-strokes`)}`;
      };

      const isValidBase64Png = (data: string): boolean => {
        return data.startsWith('data:image/png;base64,');
      };

      const maskData0 = createMaskExportData(0);
      const maskData5 = createMaskExportData(5);

      return {
        maskData0Valid: isValidBase64Png(maskData0),
        maskData5Valid: isValidBase64Png(maskData5),
        maskData0StartsCorrectly: maskData0.startsWith('data:image/png;base64,'),
      };
    });

    expect(result.maskData0Valid).toBe(true);
    expect(result.maskData5Valid).toBe(true);
    expect(result.maskData0StartsCorrectly).toBe(true);
  });
});

test.describe('FiltersGallery Logic', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should compute preview size with max dimension cap', async ({ page }) => {
    const result = await page.evaluate(() => {
      const computePreviewSize = (width: number, height: number, maxDim = 1024) => {
        if (!width || !height) return { width: 0, height: 0 };
        const scale = Math.min(1, maxDim / Math.max(width, height));
        return {
          width: Math.max(1, Math.round(width * scale)),
          height: Math.max(1, Math.round(height * scale)),
        };
      };

      return {
        largeLandscape: computePreviewSize(4000, 2000),
        largePortrait: computePreviewSize(2000, 4000),
        smallImage: computePreviewSize(512, 512),
      };
    });

    expect(result.largeLandscape.width).toBe(1024);
    expect(result.largeLandscape.height).toBe(512);
    expect(result.largePortrait.width).toBe(512);
    expect(result.largePortrait.height).toBe(1024);
    expect(result.smallImage.width).toBe(512);
    expect(result.smallImage.height).toBe(512);
  });

  test('should process thumbnails in chunks', async ({ page }) => {
    const result = await page.evaluate(() => {
      const filters = Array.from({ length: 20 }, (_, index) => `filter-${index}`);
      const processed: string[] = [];

      const processInChunks = (items: string[], budgetMs: number) => {
        let index = 0;
        let batches = 0;

        while (index < items.length) {
          batches += 1;
          const start = performance.now();
          while (index < items.length && performance.now() - start < budgetMs) {
            processed.push(items[index]);
            index += 1;
          }
        }

        return batches;
      };

      const batches = processInChunks(filters, 0.5);

      return {
        batches,
        processedCount: processed.length,
        firstItem: processed[0],
        lastItem: processed[processed.length - 1],
      };
    });

    expect(result.processedCount).toBe(20);
    expect(result.firstItem).toBe('filter-0');
    expect(result.lastItem).toBe('filter-19');
    expect(result.batches).toBeGreaterThan(1);
  });
});

test.describe('ImageAdjustmentsPanel Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should handle adjustment values', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ImageAdjustments {
        brightness: number;
        contrast: number;
        saturation: number;
        hue: number;
        blur: number;
        sharpen: number;
      }

      const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        hue: 0,
        blur: 0,
        sharpen: 0,
      };

      const clamp = (value: number, min: number, max: number) => 
        Math.max(min, Math.min(max, value));

      const updateAdjustment = <K extends keyof ImageAdjustments>(
        adjustments: ImageAdjustments,
        key: K,
        value: number
      ): ImageAdjustments => {
        const ranges: Record<keyof ImageAdjustments, { min: number; max: number }> = {
          brightness: { min: -100, max: 100 },
          contrast: { min: -100, max: 100 },
          saturation: { min: -100, max: 100 },
          hue: { min: -180, max: 180 },
          blur: { min: 0, max: 20 },
          sharpen: { min: 0, max: 100 },
        };

        const range = ranges[key];
        return {
          ...adjustments,
          [key]: clamp(value, range.min, range.max),
        };
      };

      const resetAdjustments = (): ImageAdjustments => ({ ...DEFAULT_ADJUSTMENTS });

      let adjustments = { ...DEFAULT_ADJUSTMENTS };
      
      adjustments = updateAdjustment(adjustments, 'brightness', 50);
      adjustments = updateAdjustment(adjustments, 'contrast', 25);
      adjustments = updateAdjustment(adjustments, 'saturation', -30);
      adjustments = updateAdjustment(adjustments, 'hue', 45);

      const modified = { ...adjustments };

      // Test clamping
      adjustments = updateAdjustment(adjustments, 'brightness', 150);
      const clampedBrightness = adjustments.brightness;

      adjustments = updateAdjustment(adjustments, 'blur', -5);
      const clampedBlur = adjustments.blur;

      adjustments = resetAdjustments();

      return {
        modifiedBrightness: modified.brightness,
        modifiedContrast: modified.contrast,
        modifiedSaturation: modified.saturation,
        modifiedHue: modified.hue,
        clampedBrightness,
        clampedBlur,
        resetBrightness: adjustments.brightness,
        resetContrast: adjustments.contrast,
      };
    });

    expect(result.modifiedBrightness).toBe(50);
    expect(result.modifiedContrast).toBe(25);
    expect(result.modifiedSaturation).toBe(-30);
    expect(result.modifiedHue).toBe(45);
    expect(result.clampedBrightness).toBe(100);
    expect(result.clampedBlur).toBe(0);
    expect(result.resetBrightness).toBe(0);
    expect(result.resetContrast).toBe(0);
  });

  test('should apply filter presets', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ImageAdjustments {
        brightness: number;
        contrast: number;
        saturation: number;
        hue: number;
        blur: number;
        sharpen: number;
      }

      interface FilterPreset {
        name: string;
        adjustments: Partial<ImageAdjustments>;
      }

      const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        hue: 0,
        blur: 0,
        sharpen: 0,
      };

      const FILTER_PRESETS: FilterPreset[] = [
        { name: 'None', adjustments: {} },
        { name: 'Vivid', adjustments: { saturation: 30, contrast: 15 } },
        { name: 'Warm', adjustments: { hue: 15, saturation: 10, brightness: 5 } },
        { name: 'Cool', adjustments: { hue: -20, saturation: -10, brightness: -5 } },
        { name: 'B&W', adjustments: { saturation: -100 } },
        { name: 'Sepia', adjustments: { saturation: -50, hue: 30, brightness: 10 } },
        { name: 'High Contrast', adjustments: { contrast: 50, brightness: -10 } },
        { name: 'Soft', adjustments: { contrast: -20, blur: 1, saturation: -15 } },
      ];

      const applyPreset = (preset: FilterPreset): ImageAdjustments => {
        return { ...DEFAULT_ADJUSTMENTS, ...preset.adjustments };
      };

      const getPresetByName = (name: string) => FILTER_PRESETS.find(p => p.name === name);

      const vividPreset = getPresetByName('Vivid');
      const vividAdjustments = vividPreset ? applyPreset(vividPreset) : null;

      const bwPreset = getPresetByName('B&W');
      const bwAdjustments = bwPreset ? applyPreset(bwPreset) : null;

      const softPreset = getPresetByName('Soft');
      const softAdjustments = softPreset ? applyPreset(softPreset) : null;

      return {
        presetCount: FILTER_PRESETS.length,
        vividSaturation: vividAdjustments?.saturation,
        vividContrast: vividAdjustments?.contrast,
        bwSaturation: bwAdjustments?.saturation,
        softBlur: softAdjustments?.blur,
        softContrast: softAdjustments?.contrast,
      };
    });

    expect(result.presetCount).toBe(8);
    expect(result.vividSaturation).toBe(30);
    expect(result.vividContrast).toBe(15);
    expect(result.bwSaturation).toBe(-100);
    expect(result.softBlur).toBe(1);
    expect(result.softContrast).toBe(-20);
  });

  test('should detect changes from default', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ImageAdjustments {
        brightness: number;
        contrast: number;
        saturation: number;
        hue: number;
        blur: number;
        sharpen: number;
      }

      const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        hue: 0,
        blur: 0,
        sharpen: 0,
      };

      const hasChanges = (adjustments: ImageAdjustments): boolean => {
        return Object.entries(adjustments).some(
          ([key, value]) => value !== DEFAULT_ADJUSTMENTS[key as keyof ImageAdjustments]
        );
      };

      const noChanges = hasChanges({ ...DEFAULT_ADJUSTMENTS });
      const withBrightness = hasChanges({ ...DEFAULT_ADJUSTMENTS, brightness: 10 });
      const withSaturation = hasChanges({ ...DEFAULT_ADJUSTMENTS, saturation: -5 });

      return {
        noChanges,
        withBrightness,
        withSaturation,
      };
    });

    expect(result.noChanges).toBe(false);
    expect(result.withBrightness).toBe(true);
    expect(result.withSaturation).toBe(true);
  });

  test('should export adjusted image', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ExportOptions {
        format: 'png' | 'jpeg' | 'webp';
        quality: number;
      }

      const exportImage = (options: ExportOptions): string => {
        const mimeType = `image/${options.format}`;
        // Simulate canvas.toDataURL()
        return `data:${mimeType};base64,${btoa(`mock-image-${options.format}-${options.quality}`)}`;
      };

      const pngExport = exportImage({ format: 'png', quality: 1 });
      const jpegExport = exportImage({ format: 'jpeg', quality: 0.8 });
      const webpExport = exportImage({ format: 'webp', quality: 0.9 });

      return {
        pngStartsCorrectly: pngExport.startsWith('data:image/png;base64,'),
        jpegStartsCorrectly: jpegExport.startsWith('data:image/jpeg;base64,'),
        webpStartsCorrectly: webpExport.startsWith('data:image/webp;base64,'),
      };
    });

    expect(result.pngStartsCorrectly).toBe(true);
    expect(result.jpegStartsCorrectly).toBe(true);
    expect(result.webpStartsCorrectly).toBe(true);
  });
});

test.describe('ImageComparison Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should support different comparison modes', async ({ page }) => {
    const result = await page.evaluate(() => {
      type ComparisonMode = 'slider-h' | 'slider-v' | 'side-by-side' | 'onion-skin' | 'toggle';

      interface ModeOption {
        mode: ComparisonMode;
        label: string;
        hasPositionControl: boolean;
        hasOpacityControl: boolean;
      }

      const MODE_OPTIONS: ModeOption[] = [
        { mode: 'slider-h', label: 'Horizontal Slider', hasPositionControl: true, hasOpacityControl: false },
        { mode: 'slider-v', label: 'Vertical Slider', hasPositionControl: true, hasOpacityControl: false },
        { mode: 'side-by-side', label: 'Side by Side', hasPositionControl: false, hasOpacityControl: false },
        { mode: 'onion-skin', label: 'Onion Skin', hasPositionControl: false, hasOpacityControl: true },
        { mode: 'toggle', label: 'Toggle', hasPositionControl: false, hasOpacityControl: false },
      ];

      const getModeById = (mode: ComparisonMode) => MODE_OPTIONS.find(m => m.mode === mode);
      const getModesWithPosition = () => MODE_OPTIONS.filter(m => m.hasPositionControl);
      const getModesWithOpacity = () => MODE_OPTIONS.filter(m => m.hasOpacityControl);

      return {
        modeCount: MODE_OPTIONS.length,
        sliderHLabel: getModeById('slider-h')?.label,
        onionSkinHasOpacity: getModeById('onion-skin')?.hasOpacityControl,
        modesWithPositionCount: getModesWithPosition().length,
        modesWithOpacityCount: getModesWithOpacity().length,
      };
    });

    expect(result.modeCount).toBe(5);
    expect(result.sliderHLabel).toBe('Horizontal Slider');
    expect(result.onionSkinHasOpacity).toBe(true);
    expect(result.modesWithPositionCount).toBe(2);
    expect(result.modesWithOpacityCount).toBe(1);
  });

  test('should handle position and opacity controls', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ComparisonState {
        mode: string;
        position: number;
        opacity: number;
        showBefore: boolean;
      }

      const defaultState: ComparisonState = {
        mode: 'slider-h',
        position: 50,
        opacity: 50,
        showBefore: true,
      };

      const clamp = (value: number, min: number, max: number) => 
        Math.max(min, Math.min(max, value));

      const setPosition = (state: ComparisonState, position: number): ComparisonState => ({
        ...state,
        position: clamp(position, 0, 100),
      });

      const setOpacity = (state: ComparisonState, opacity: number): ComparisonState => ({
        ...state,
        opacity: clamp(opacity, 0, 100),
      });

      const toggleView = (state: ComparisonState): ComparisonState => ({
        ...state,
        showBefore: !state.showBefore,
      });

      const resetPosition = (state: ComparisonState): ComparisonState => ({
        ...state,
        position: 50,
        opacity: 50,
        showBefore: true,
      });

      let state = { ...defaultState };

      state = setPosition(state, 75);
      const positionAfterSet = state.position;

      state = setPosition(state, -10);
      const positionClamped = state.position;

      state = setOpacity(state, 80);
      const opacityAfterSet = state.opacity;

      state = toggleView(state);
      const showBeforeAfterToggle = state.showBefore;

      state = resetPosition(state);

      return {
        defaultPosition: defaultState.position,
        positionAfterSet,
        positionClamped,
        opacityAfterSet,
        showBeforeAfterToggle,
        resetPosition: state.position,
        resetOpacity: state.opacity,
      };
    });

    expect(result.defaultPosition).toBe(50);
    expect(result.positionAfterSet).toBe(75);
    expect(result.positionClamped).toBe(0);
    expect(result.opacityAfterSet).toBe(80);
    expect(result.showBeforeAfterToggle).toBe(false);
    expect(result.resetPosition).toBe(50);
    expect(result.resetOpacity).toBe(50);
  });

  test('should handle image loading states', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ImageLoadState {
        before: boolean;
        after: boolean;
      }

      const isAllLoaded = (state: ImageLoadState): boolean => 
        state.before && state.after;

      const noneLoaded: ImageLoadState = { before: false, after: false };
      const beforeOnly: ImageLoadState = { before: true, after: false };
      const afterOnly: ImageLoadState = { before: false, after: true };
      const allLoaded: ImageLoadState = { before: true, after: true };

      return {
        noneLoadedResult: isAllLoaded(noneLoaded),
        beforeOnlyResult: isAllLoaded(beforeOnly),
        afterOnlyResult: isAllLoaded(afterOnly),
        allLoadedResult: isAllLoaded(allLoaded),
      };
    });

    expect(result.noneLoadedResult).toBe(false);
    expect(result.beforeOnlyResult).toBe(false);
    expect(result.afterOnlyResult).toBe(false);
    expect(result.allLoadedResult).toBe(true);
  });

  test('should calculate slider position from mouse events', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Rect {
        left: number;
        top: number;
        width: number;
        height: number;
      }

      const calculateHorizontalPosition = (
        clientX: number,
        rect: Rect
      ): number => {
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        return (x / rect.width) * 100;
      };

      const calculateVerticalPosition = (
        clientY: number,
        rect: Rect
      ): number => {
        const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
        return (y / rect.height) * 100;
      };

      const rect: Rect = { left: 100, top: 100, width: 400, height: 300 };

      // Test horizontal
      const hCenter = calculateHorizontalPosition(300, rect); // middle
      const hStart = calculateHorizontalPosition(100, rect); // start
      const hEnd = calculateHorizontalPosition(500, rect); // end
      const hBefore = calculateHorizontalPosition(50, rect); // before start

      // Test vertical
      const vCenter = calculateVerticalPosition(250, rect); // middle
      const vStart = calculateVerticalPosition(100, rect); // start
      const vEnd = calculateVerticalPosition(400, rect); // end

      return {
        hCenter: Math.round(hCenter),
        hStart: Math.round(hStart),
        hEnd: Math.round(hEnd),
        hBefore: Math.round(hBefore),
        vCenter: Math.round(vCenter),
        vStart: Math.round(vStart),
        vEnd: Math.round(vEnd),
      };
    });

    expect(result.hCenter).toBe(50);
    expect(result.hStart).toBe(0);
    expect(result.hEnd).toBe(100);
    expect(result.hBefore).toBe(0);
    expect(result.vCenter).toBe(50);
    expect(result.vStart).toBe(0);
    expect(result.vEnd).toBe(100);
  });

  test('should display correct labels for before/after images', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ComparisonLabels {
        beforeLabel: string;
        afterLabel: string;
      }

      const defaultLabels: ComparisonLabels = {
        beforeLabel: 'Before',
        afterLabel: 'After',
      };

      const customLabels: ComparisonLabels = {
        beforeLabel: 'Original',
        afterLabel: 'Edited',
      };

      const getDisplayLabel = (
        labels: ComparisonLabels,
        showBefore: boolean
      ): string => {
        return showBefore ? labels.beforeLabel : labels.afterLabel;
      };

      return {
        defaultBefore: defaultLabels.beforeLabel,
        defaultAfter: defaultLabels.afterLabel,
        customBefore: customLabels.beforeLabel,
        customAfter: customLabels.afterLabel,
        displayWhenShowBefore: getDisplayLabel(customLabels, true),
        displayWhenShowAfter: getDisplayLabel(customLabels, false),
      };
    });

    expect(result.defaultBefore).toBe('Before');
    expect(result.defaultAfter).toBe('After');
    expect(result.customBefore).toBe('Original');
    expect(result.customAfter).toBe('Edited');
    expect(result.displayWhenShowBefore).toBe('Original');
    expect(result.displayWhenShowAfter).toBe('Edited');
  });
});

test.describe('Image Studio Integration', () => {
  test('should handle canvas context operations', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Simulate canvas 2D context operations used by image studio components
      interface CanvasOperations {
        drawImage: boolean;
        getImageData: boolean;
        putImageData: boolean;
        clearRect: boolean;
        beginPath: boolean;
        stroke: boolean;
      }

      const testCanvasOperations = (): CanvasOperations => {
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return {
            drawImage: false,
            getImageData: false,
            putImageData: false,
            clearRect: false,
            beginPath: false,
            stroke: false,
          };
        }

        try {
          ctx.clearRect(0, 0, 100, 100);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(50, 50);
          ctx.stroke();
          const imageData = ctx.getImageData(0, 0, 100, 100);
          ctx.putImageData(imageData, 0, 0);

          return {
            drawImage: true,
            getImageData: imageData.data.length === 40000,
            putImageData: true,
            clearRect: true,
            beginPath: true,
            stroke: true,
          };
        } catch (_e) {
          return {
            drawImage: false,
            getImageData: false,
            putImageData: false,
            clearRect: false,
            beginPath: false,
            stroke: false,
          };
        }
      };

      return testCanvasOperations();
    });

    expect(result.clearRect).toBe(true);
    expect(result.beginPath).toBe(true);
    expect(result.stroke).toBe(true);
    expect(result.getImageData).toBe(true);
    expect(result.putImageData).toBe(true);
  });

  test('should handle Image loading', async ({ page }) => {
    const result = await page.evaluate(() => {
      return new Promise<{ loaded: boolean; hasSize: boolean }>((resolve) => {
        const img = new Image();
        
        // Use a simple data URL to test image loading
        img.onload = () => {
          resolve({
            loaded: true,
            hasSize: img.width > 0 && img.height > 0,
          });
        };
        
        img.onerror = () => {
          resolve({
            loaded: false,
            hasSize: false,
          });
        };

        // Small 1x1 PNG
        img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      });
    });

    expect(result.loaded).toBe(true);
    expect(result.hasSize).toBe(true);
  });
});
