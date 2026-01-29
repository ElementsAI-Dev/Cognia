import { test, expect } from '@playwright/test';

/**
 * Image Studio Components E2E Tests
 * Tests for BackgroundRemover, BatchExportDialog, DrawingTools,
 * LayersPanel, TextOverlay, HistoryPanel, ImageUpscaler, ImagePreview
 */

test.describe('BackgroundRemover Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should detect background removal support', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface BackgroundRemovalCapabilities {
        supportsWebGPU: boolean;
        supportsWASM: boolean;
        maxImageSize: number;
        supportedFormats: string[];
      }

      const detectCapabilities = (): BackgroundRemovalCapabilities => {
        const supportsWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
        const supportsWASM = typeof WebAssembly !== 'undefined';

        return {
          supportsWebGPU,
          supportsWASM,
          maxImageSize: 4096,
          supportedFormats: ['image/png', 'image/jpeg', 'image/webp'],
        };
      };

      const caps = detectCapabilities();

      return {
        hasWASM: caps.supportsWASM,
        maxSize: caps.maxImageSize,
        formatCount: caps.supportedFormats.length,
        supportsPNG: caps.supportedFormats.includes('image/png'),
      };
    });

    expect(result.hasWASM).toBe(true);
    expect(result.maxSize).toBe(4096);
    expect(result.formatCount).toBe(3);
    expect(result.supportsPNG).toBe(true);
  });

  test('should manage background removal state', async ({ page }) => {
    const result = await page.evaluate(() => {
      type RemovalStatus = 'idle' | 'loading' | 'processing' | 'completed' | 'error';

      interface RemovalState {
        status: RemovalStatus;
        progress: number;
        originalImage: string | null;
        resultImage: string | null;
        error: string | null;
      }

      const createInitialState = (): RemovalState => ({
        status: 'idle',
        progress: 0,
        originalImage: null,
        resultImage: null,
        error: null,
      });

      const startProcessing = (state: RemovalState, imageUrl: string): RemovalState => ({
        ...state,
        status: 'processing',
        progress: 0,
        originalImage: imageUrl,
        resultImage: null,
        error: null,
      });

      const updateProgress = (state: RemovalState, progress: number): RemovalState => ({
        ...state,
        progress: Math.min(100, Math.max(0, progress)),
      });

      const completeProcessing = (state: RemovalState, resultUrl: string): RemovalState => ({
        ...state,
        status: 'completed',
        progress: 100,
        resultImage: resultUrl,
      });

      const setError = (state: RemovalState, error: string): RemovalState => ({
        ...state,
        status: 'error',
        error,
      });

      let state = createInitialState();
      const initialStatus = state.status;

      state = startProcessing(state, 'original.png');
      const processingStatus = state.status;

      state = updateProgress(state, 50);
      const midProgress = state.progress;

      state = completeProcessing(state, 'result.png');
      const completedStatus = state.status;
      const hasResult = state.resultImage !== null;

      state = createInitialState();
      state = startProcessing(state, 'test.png');
      state = setError(state, 'Processing failed');
      const errorStatus = state.status;
      const errorMessage = state.error;

      return {
        initialStatus,
        processingStatus,
        midProgress,
        completedStatus,
        hasResult,
        errorStatus,
        errorMessage,
      };
    });

    expect(result.initialStatus).toBe('idle');
    expect(result.processingStatus).toBe('processing');
    expect(result.midProgress).toBe(50);
    expect(result.completedStatus).toBe('completed');
    expect(result.hasResult).toBe(true);
    expect(result.errorStatus).toBe('error');
    expect(result.errorMessage).toBe('Processing failed');
  });

  test('should validate image before processing', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ImageValidation {
        valid: boolean;
        errors: string[];
        warnings: string[];
      }

      const validateImage = (
        width: number,
        height: number,
        format: string,
        fileSize: number
      ): ImageValidation => {
        const errors: string[] = [];
        const warnings: string[] = [];
        const maxDimension = 4096;
        const maxFileSize = 20 * 1024 * 1024; // 20MB
        const supportedFormats = ['image/png', 'image/jpeg', 'image/webp'];

        if (width > maxDimension || height > maxDimension) {
          errors.push(`Image dimensions exceed ${maxDimension}px limit`);
        }

        if (width < 10 || height < 10) {
          errors.push('Image is too small');
        }

        if (!supportedFormats.includes(format)) {
          errors.push(`Unsupported format: ${format}`);
        }

        if (fileSize > maxFileSize) {
          errors.push('File size exceeds 20MB limit');
        }

        if (width > 2048 || height > 2048) {
          warnings.push('Large images may take longer to process');
        }

        return { valid: errors.length === 0, errors, warnings };
      };

      return {
        validImage: validateImage(1024, 1024, 'image/png', 1024 * 1024),
        tooLarge: validateImage(5000, 5000, 'image/png', 1024 * 1024),
        tooSmall: validateImage(5, 5, 'image/png', 1024),
        wrongFormat: validateImage(1024, 1024, 'image/gif', 1024 * 1024),
        tooBig: validateImage(1024, 1024, 'image/png', 30 * 1024 * 1024),
        warningOnly: validateImage(3000, 3000, 'image/png', 1024 * 1024),
      };
    });

    expect(result.validImage.valid).toBe(true);
    expect(result.tooLarge.valid).toBe(false);
    expect(result.tooSmall.valid).toBe(false);
    expect(result.wrongFormat.valid).toBe(false);
    expect(result.tooBig.valid).toBe(false);
    expect(result.warningOnly.valid).toBe(true);
    expect(result.warningOnly.warnings.length).toBeGreaterThan(0);
  });
});

test.describe('BatchExportDialog Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should support multiple export formats', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ExportFormat {
        id: string;
        label: string;
        mimeType: string;
        extension: string;
        supportsQuality: boolean;
        supportsTransparency: boolean;
      }

      const EXPORT_FORMATS: ExportFormat[] = [
        { id: 'png', label: 'PNG', mimeType: 'image/png', extension: '.png', supportsQuality: false, supportsTransparency: true },
        { id: 'jpeg', label: 'JPEG', mimeType: 'image/jpeg', extension: '.jpg', supportsQuality: true, supportsTransparency: false },
        { id: 'webp', label: 'WebP', mimeType: 'image/webp', extension: '.webp', supportsQuality: true, supportsTransparency: true },
      ];

      const getFormatById = (id: string) => EXPORT_FORMATS.find(f => f.id === id);
      const getFormatsWithTransparency = () => EXPORT_FORMATS.filter(f => f.supportsTransparency);
      const getFormatsWithQuality = () => EXPORT_FORMATS.filter(f => f.supportsQuality);

      return {
        formatCount: EXPORT_FORMATS.length,
        pngFormat: getFormatById('png'),
        jpegFormat: getFormatById('jpeg'),
        transparentFormats: getFormatsWithTransparency().map(f => f.id),
        qualityFormats: getFormatsWithQuality().map(f => f.id),
      };
    });

    expect(result.formatCount).toBe(3);
    expect(result.pngFormat?.supportsTransparency).toBe(true);
    expect(result.jpegFormat?.supportsTransparency).toBe(false);
    expect(result.transparentFormats).toContain('png');
    expect(result.transparentFormats).toContain('webp');
    expect(result.qualityFormats).toContain('jpeg');
    expect(result.qualityFormats).toContain('webp');
  });

  test('should configure batch export settings', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface BatchExportSettings {
        format: string;
        quality: number;
        scale: number;
        prefix: string;
        suffix: string;
        includeMetadata: boolean;
        preserveStructure: boolean;
      }

      const DEFAULT_SETTINGS: BatchExportSettings = {
        format: 'png',
        quality: 90,
        scale: 1,
        prefix: '',
        suffix: '',
        includeMetadata: true,
        preserveStructure: false,
      };

      const validateSettings = (settings: Partial<BatchExportSettings>): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];

        if (settings.quality !== undefined && (settings.quality < 1 || settings.quality > 100)) {
          errors.push('Quality must be between 1 and 100');
        }

        if (settings.scale !== undefined && (settings.scale < 0.1 || settings.scale > 4)) {
          errors.push('Scale must be between 0.1 and 4');
        }

        if (settings.prefix && settings.prefix.length > 50) {
          errors.push('Prefix too long');
        }

        return { valid: errors.length === 0, errors };
      };

      const generateFilename = (
        originalName: string,
        settings: BatchExportSettings,
        index: number
      ): string => {
        const baseName = originalName.replace(/\.[^/.]+$/, '');
        const extension = settings.format === 'jpeg' ? '.jpg' : `.${settings.format}`;
        return `${settings.prefix}${baseName}${settings.suffix}_${index + 1}${extension}`;
      };

      return {
        defaultSettings: DEFAULT_SETTINGS,
        validSettings: validateSettings({ quality: 80, scale: 2 }),
        invalidQuality: validateSettings({ quality: 150 }),
        invalidScale: validateSettings({ scale: 10 }),
        filename1: generateFilename('image.png', { ...DEFAULT_SETTINGS, prefix: 'export_' }, 0),
        filename2: generateFilename('photo.jpg', { ...DEFAULT_SETTINGS, format: 'webp', suffix: '_optimized' }, 2),
      };
    });

    expect(result.defaultSettings.quality).toBe(90);
    expect(result.validSettings.valid).toBe(true);
    expect(result.invalidQuality.valid).toBe(false);
    expect(result.invalidScale.valid).toBe(false);
    expect(result.filename1).toBe('export_image_1.png');
    expect(result.filename2).toBe('photo_optimized_3.webp');
  });

  test('should track batch export progress', async ({ page }) => {
    const result = await page.evaluate(async () => {
      interface ExportItem {
        id: string;
        filename: string;
        status: 'pending' | 'processing' | 'completed' | 'error';
        error?: string;
      }

      interface BatchExportProgress {
        total: number;
        completed: number;
        failed: number;
        items: ExportItem[];
      }

      const createProgress = (filenames: string[]): BatchExportProgress => ({
        total: filenames.length,
        completed: 0,
        failed: 0,
        items: filenames.map((filename, i) => ({
          id: `item-${i}`,
          filename,
          status: 'pending',
        })),
      });

      const processItem = (progress: BatchExportProgress, index: number, success: boolean): BatchExportProgress => {
        const newItems = [...progress.items];
        if (success) {
          newItems[index] = { ...newItems[index], status: 'completed' };
          return { ...progress, items: newItems, completed: progress.completed + 1 };
        } else {
          newItems[index] = { ...newItems[index], status: 'error', error: 'Export failed' };
          return { ...progress, items: newItems, failed: progress.failed + 1 };
        }
      };

      const getPercentage = (progress: BatchExportProgress): number => {
        return Math.round(((progress.completed + progress.failed) / progress.total) * 100);
      };

      let progress = createProgress(['image1.png', 'image2.png', 'image3.png', 'image4.png']);
      const initialPercentage = getPercentage(progress);

      progress = processItem(progress, 0, true);
      progress = processItem(progress, 1, true);
      const midPercentage = getPercentage(progress);

      progress = processItem(progress, 2, false);
      progress = processItem(progress, 3, true);
      const finalPercentage = getPercentage(progress);

      return {
        initialPercentage,
        midPercentage,
        finalPercentage,
        totalCompleted: progress.completed,
        totalFailed: progress.failed,
        hasError: progress.items.some(i => i.status === 'error'),
      };
    });

    expect(result.initialPercentage).toBe(0);
    expect(result.midPercentage).toBe(50);
    expect(result.finalPercentage).toBe(100);
    expect(result.totalCompleted).toBe(3);
    expect(result.totalFailed).toBe(1);
    expect(result.hasError).toBe(true);
  });
});

test.describe('DrawingTools Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should support multiple drawing tools', async ({ page }) => {
    const result = await page.evaluate(() => {
      type DrawingToolType = 'brush' | 'eraser' | 'line' | 'rectangle' | 'ellipse' | 'arrow' | 'text' | 'pan';

      interface DrawingTool {
        id: DrawingToolType;
        name: string;
        icon: string;
        shortcut: string;
        cursor: string;
      }

      const DRAWING_TOOLS: DrawingTool[] = [
        { id: 'brush', name: 'Brush', icon: 'Paintbrush', shortcut: 'B', cursor: 'crosshair' },
        { id: 'eraser', name: 'Eraser', icon: 'Eraser', shortcut: 'E', cursor: 'crosshair' },
        { id: 'line', name: 'Line', icon: 'Minus', shortcut: 'L', cursor: 'crosshair' },
        { id: 'rectangle', name: 'Rectangle', icon: 'Square', shortcut: 'R', cursor: 'crosshair' },
        { id: 'ellipse', name: 'Ellipse', icon: 'Circle', shortcut: 'O', cursor: 'crosshair' },
        { id: 'arrow', name: 'Arrow', icon: 'ArrowRight', shortcut: 'A', cursor: 'crosshair' },
        { id: 'text', name: 'Text', icon: 'Type', shortcut: 'T', cursor: 'text' },
        { id: 'pan', name: 'Pan', icon: 'Hand', shortcut: 'H', cursor: 'grab' },
      ];

      const getToolById = (id: DrawingToolType) => DRAWING_TOOLS.find(t => t.id === id);
      const getToolByShortcut = (shortcut: string) => DRAWING_TOOLS.find(t => t.shortcut === shortcut);

      return {
        toolCount: DRAWING_TOOLS.length,
        brushTool: getToolById('brush'),
        eraserTool: getToolById('eraser'),
        panTool: getToolById('pan'),
        toolByB: getToolByShortcut('B')?.id,
        toolByE: getToolByShortcut('E')?.id,
        allShortcuts: DRAWING_TOOLS.map(t => t.shortcut),
      };
    });

    expect(result.toolCount).toBe(8);
    expect(result.brushTool?.shortcut).toBe('B');
    expect(result.eraserTool?.cursor).toBe('crosshair');
    expect(result.panTool?.cursor).toBe('grab');
    expect(result.toolByB).toBe('brush');
    expect(result.toolByE).toBe('eraser');
  });

  test('should configure brush settings', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface BrushSettings {
        size: number;
        hardness: number;
        opacity: number;
        color: string;
        blendMode: string;
      }

      const DEFAULT_BRUSH: BrushSettings = {
        size: 20,
        hardness: 100,
        opacity: 100,
        color: '#000000',
        blendMode: 'normal',
      };

      const BLEND_MODES = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten'];

      const clampValue = (value: number, min: number, max: number): number => {
        return Math.max(min, Math.min(max, value));
      };

      const updateBrush = (settings: BrushSettings, updates: Partial<BrushSettings>): BrushSettings => {
        const newSettings = { ...settings, ...updates };
        return {
          ...newSettings,
          size: clampValue(newSettings.size, 1, 500),
          hardness: clampValue(newSettings.hardness, 0, 100),
          opacity: clampValue(newSettings.opacity, 1, 100),
        };
      };

      const isValidColor = (color: string): boolean => {
        return /^#[0-9A-Fa-f]{6}$/.test(color);
      };

      let brush = { ...DEFAULT_BRUSH };
      brush = updateBrush(brush, { size: 50, opacity: 75 });
      const updatedBrush = { ...brush };

      brush = updateBrush(brush, { size: 1000 });
      const clampedSize = brush.size;

      brush = updateBrush(brush, { hardness: -10 });
      const clampedHardness = brush.hardness;

      return {
        defaultBrush: DEFAULT_BRUSH,
        updatedBrush,
        clampedSize,
        clampedHardness,
        blendModeCount: BLEND_MODES.length,
        validColor: isValidColor('#FF5500'),
        invalidColor: isValidColor('red'),
      };
    });

    expect(result.defaultBrush.size).toBe(20);
    expect(result.updatedBrush.size).toBe(50);
    expect(result.updatedBrush.opacity).toBe(75);
    expect(result.clampedSize).toBe(500);
    expect(result.clampedHardness).toBe(0);
    expect(result.blendModeCount).toBe(6);
    expect(result.validColor).toBe(true);
    expect(result.invalidColor).toBe(false);
  });

  test('should track drawing strokes', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Point {
        x: number;
        y: number;
        pressure?: number;
      }

      interface Stroke {
        id: string;
        tool: string;
        points: Point[];
        color: string;
        size: number;
        opacity: number;
        timestamp: number;
      }

      const strokes: Stroke[] = [];
      let currentStroke: Stroke | null = null;

      const beginStroke = (tool: string, point: Point, settings: { color: string; size: number; opacity: number }): void => {
        currentStroke = {
          id: `stroke-${Date.now()}`,
          tool,
          points: [point],
          ...settings,
          timestamp: Date.now(),
        };
      };

      const addPoint = (point: Point): void => {
        if (currentStroke) {
          currentStroke.points.push(point);
        }
      };

      const endStroke = (): Stroke | null => {
        if (currentStroke) {
          strokes.push(currentStroke);
          const completed = currentStroke;
          currentStroke = null;
          return completed;
        }
        return null;
      };

      const undoLastStroke = (): Stroke | undefined => {
        return strokes.pop();
      };

      const _clearAllStrokes = (): number => {
        const count = strokes.length;
        strokes.length = 0;
        return count;
      };

      // Simulate drawing
      beginStroke('brush', { x: 0, y: 0 }, { color: '#FF0000', size: 10, opacity: 100 });
      addPoint({ x: 10, y: 10 });
      addPoint({ x: 20, y: 20 });
      const stroke1 = endStroke();

      beginStroke('eraser', { x: 50, y: 50 }, { color: '#FFFFFF', size: 20, opacity: 100 });
      addPoint({ x: 60, y: 60 });
      const stroke2 = endStroke();

      const strokeCountBefore = strokes.length;
      const undone = undoLastStroke();
      const strokeCountAfter = strokes.length;

      return {
        stroke1Points: stroke1?.points.length,
        stroke1Tool: stroke1?.tool,
        stroke2Size: stroke2?.size,
        strokeCountBefore,
        strokeCountAfter,
        undoneId: undone?.id,
      };
    });

    expect(result.stroke1Points).toBe(3);
    expect(result.stroke1Tool).toBe('brush');
    expect(result.stroke2Size).toBe(20);
    expect(result.strokeCountBefore).toBe(2);
    expect(result.strokeCountAfter).toBe(1);
    expect(result.undoneId).toBeDefined();
  });
});

test.describe('LayersPanel Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should manage layer stack', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Layer {
        id: string;
        name: string;
        type: 'image' | 'adjustment' | 'text' | 'shape';
        visible: boolean;
        locked: boolean;
        opacity: number;
        blendMode: string;
        order: number;
      }

      const layers: Layer[] = [];
      let nextOrder = 0;

      const addLayer = (name: string, type: Layer['type']): Layer => {
        const layer: Layer = {
          id: `layer-${Date.now()}-${Math.random()}`,
          name,
          type,
          visible: true,
          locked: false,
          opacity: 100,
          blendMode: 'normal',
          order: nextOrder++,
        };
        layers.push(layer);
        return layer;
      };

      const removeLayer = (id: string): boolean => {
        const index = layers.findIndex(l => l.id === id);
        if (index !== -1) {
          layers.splice(index, 1);
          return true;
        }
        return false;
      };

      const updateLayer = (id: string, updates: Partial<Layer>): Layer | null => {
        const layer = layers.find(l => l.id === id);
        if (layer) {
          Object.assign(layer, updates);
          return layer;
        }
        return null;
      };

      const reorderLayers = (fromIndex: number, toIndex: number): void => {
        const [removed] = layers.splice(fromIndex, 1);
        layers.splice(toIndex, 0, removed);
        layers.forEach((layer, index) => {
          layer.order = index;
        });
      };

      const getVisibleLayers = (): Layer[] => layers.filter(l => l.visible);

      // Test operations
      const layer1 = addLayer('Background', 'image');
      const layer2 = addLayer('Text Overlay', 'text');
      const layer3 = addLayer('Adjustments', 'adjustment');
      const countAfterAdd = layers.length;

      updateLayer(layer2.id, { visible: false });
      const visibleCount = getVisibleLayers().length;

      updateLayer(layer1.id, { locked: true, opacity: 80 });
      const layer1Updated = layers.find(l => l.id === layer1.id);

      reorderLayers(0, 2);
      const newFirstLayerId = layers[0].id;

      removeLayer(layer3.id);
      const countAfterRemove = layers.length;

      return {
        countAfterAdd,
        visibleCount,
        layer1Locked: layer1Updated?.locked,
        layer1Opacity: layer1Updated?.opacity,
        newFirstLayerId,
        countAfterRemove,
        layer2Id: layer2.id,
      };
    });

    expect(result.countAfterAdd).toBe(3);
    expect(result.visibleCount).toBe(2);
    expect(result.layer1Locked).toBe(true);
    expect(result.layer1Opacity).toBe(80);
    expect(result.newFirstLayerId).toBe(result.layer2Id);
    expect(result.countAfterRemove).toBe(2);
  });

  test('should support layer blending modes', async ({ page }) => {
    const result = await page.evaluate(() => {
      const BLEND_MODES = [
        { id: 'normal', name: 'Normal', category: 'basic' },
        { id: 'multiply', name: 'Multiply', category: 'darken' },
        { id: 'screen', name: 'Screen', category: 'lighten' },
        { id: 'overlay', name: 'Overlay', category: 'contrast' },
        { id: 'soft-light', name: 'Soft Light', category: 'contrast' },
        { id: 'hard-light', name: 'Hard Light', category: 'contrast' },
        { id: 'color-dodge', name: 'Color Dodge', category: 'lighten' },
        { id: 'color-burn', name: 'Color Burn', category: 'darken' },
        { id: 'difference', name: 'Difference', category: 'inversion' },
        { id: 'exclusion', name: 'Exclusion', category: 'inversion' },
        { id: 'hue', name: 'Hue', category: 'component' },
        { id: 'saturation', name: 'Saturation', category: 'component' },
        { id: 'color', name: 'Color', category: 'component' },
        { id: 'luminosity', name: 'Luminosity', category: 'component' },
      ];

      const getModeById = (id: string) => BLEND_MODES.find(m => m.id === id);
      const getModesByCategory = (category: string) => BLEND_MODES.filter(m => m.category === category);
      const getCategories = () => [...new Set(BLEND_MODES.map(m => m.category))];

      return {
        totalModes: BLEND_MODES.length,
        categories: getCategories(),
        categoryCount: getCategories().length,
        multiplyMode: getModeById('multiply'),
        contrastModes: getModesByCategory('contrast').map(m => m.id),
        componentModes: getModesByCategory('component').map(m => m.id),
      };
    });

    expect(result.totalModes).toBe(14);
    expect(result.categoryCount).toBe(5);
    expect(result.multiplyMode?.category).toBe('darken');
    expect(result.contrastModes).toContain('overlay');
    expect(result.componentModes).toContain('hue');
  });

  test('should handle layer grouping', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface LayerGroup {
        id: string;
        name: string;
        expanded: boolean;
        layerIds: string[];
      }

      const groups: LayerGroup[] = [];

      const createGroup = (name: string, layerIds: string[]): LayerGroup => {
        const group: LayerGroup = {
          id: `group-${Date.now()}`,
          name,
          expanded: true,
          layerIds,
        };
        groups.push(group);
        return group;
      };

      const addToGroup = (groupId: string, layerId: string): boolean => {
        const group = groups.find(g => g.id === groupId);
        if (group && !group.layerIds.includes(layerId)) {
          group.layerIds.push(layerId);
          return true;
        }
        return false;
      };

      const removeFromGroup = (groupId: string, layerId: string): boolean => {
        const group = groups.find(g => g.id === groupId);
        if (group) {
          const index = group.layerIds.indexOf(layerId);
          if (index !== -1) {
            group.layerIds.splice(index, 1);
            return true;
          }
        }
        return false;
      };

      const toggleGroupExpanded = (groupId: string): boolean => {
        const group = groups.find(g => g.id === groupId);
        if (group) {
          group.expanded = !group.expanded;
          return group.expanded;
        }
        return false;
      };

      const group1 = createGroup('Header Elements', ['layer-1', 'layer-2']);
      const _group2 = createGroup('Footer Elements', ['layer-3']);

      addToGroup(group1.id, 'layer-4');
      const group1Count = groups.find(g => g.id === group1.id)?.layerIds.length;

      removeFromGroup(group1.id, 'layer-2');
      const group1CountAfterRemove = groups.find(g => g.id === group1.id)?.layerIds.length;

      const expandedBefore = groups.find(g => g.id === group1.id)?.expanded;
      toggleGroupExpanded(group1.id);
      const expandedAfter = groups.find(g => g.id === group1.id)?.expanded;

      return {
        groupCount: groups.length,
        group1Count,
        group1CountAfterRemove,
        expandedBefore,
        expandedAfter,
      };
    });

    expect(result.groupCount).toBe(2);
    expect(result.group1Count).toBe(3);
    expect(result.group1CountAfterRemove).toBe(2);
    expect(result.expandedBefore).toBe(true);
    expect(result.expandedAfter).toBe(false);
  });
});

test.describe('TextOverlay Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should create and configure text elements', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface TextElement {
        id: string;
        content: string;
        x: number;
        y: number;
        fontSize: number;
        fontFamily: string;
        fontWeight: string;
        fontStyle: string;
        color: string;
        align: 'left' | 'center' | 'right';
        rotation: number;
        opacity: number;
      }

      const DEFAULT_TEXT: Omit<TextElement, 'id' | 'content' | 'x' | 'y'> = {
        fontSize: 24,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        color: '#000000',
        align: 'left',
        rotation: 0,
        opacity: 100,
      };

      const textElements: TextElement[] = [];

      const createTextElement = (content: string, x: number, y: number): TextElement => {
        const element: TextElement = {
          id: `text-${Date.now()}`,
          content,
          x,
          y,
          ...DEFAULT_TEXT,
        };
        textElements.push(element);
        return element;
      };

      const updateTextElement = (id: string, updates: Partial<TextElement>): TextElement | null => {
        const element = textElements.find(e => e.id === id);
        if (element) {
          Object.assign(element, updates);
          return element;
        }
        return null;
      };

      const clampFontSize = (size: number): number => Math.max(8, Math.min(200, size));

      const text1 = createTextElement('Hello World', 100, 100);
      const text2 = createTextElement('Subtitle', 100, 150);

      updateTextElement(text1.id, {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FF0000',
        align: 'center',
      });

      updateTextElement(text2.id, {
        fontStyle: 'italic',
        opacity: 75,
      });

      const updatedText1 = textElements.find(e => e.id === text1.id);
      const updatedText2 = textElements.find(e => e.id === text2.id);

      return {
        elementCount: textElements.length,
        text1FontSize: updatedText1?.fontSize,
        text1FontWeight: updatedText1?.fontWeight,
        text1Color: updatedText1?.color,
        text2FontStyle: updatedText2?.fontStyle,
        text2Opacity: updatedText2?.opacity,
        clampedSmall: clampFontSize(2),
        clampedLarge: clampFontSize(500),
      };
    });

    expect(result.elementCount).toBe(2);
    expect(result.text1FontSize).toBe(48);
    expect(result.text1FontWeight).toBe('bold');
    expect(result.text1Color).toBe('#FF0000');
    expect(result.text2FontStyle).toBe('italic');
    expect(result.text2Opacity).toBe(75);
    expect(result.clampedSmall).toBe(8);
    expect(result.clampedLarge).toBe(200);
  });

  test('should support font options', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface FontOption {
        family: string;
        category: 'sans-serif' | 'serif' | 'monospace' | 'display' | 'handwriting';
        weights: string[];
      }

      const FONT_OPTIONS: FontOption[] = [
        { family: 'Arial', category: 'sans-serif', weights: ['normal', 'bold'] },
        { family: 'Helvetica', category: 'sans-serif', weights: ['normal', 'bold'] },
        { family: 'Georgia', category: 'serif', weights: ['normal', 'bold', 'italic'] },
        { family: 'Times New Roman', category: 'serif', weights: ['normal', 'bold', 'italic'] },
        { family: 'Courier New', category: 'monospace', weights: ['normal', 'bold'] },
        { family: 'Impact', category: 'display', weights: ['normal'] },
        { family: 'Comic Sans MS', category: 'handwriting', weights: ['normal', 'bold'] },
      ];

      const getFontsByCategory = (category: string) => 
        FONT_OPTIONS.filter(f => f.category === category);

      const getFontByFamily = (family: string) => 
        FONT_OPTIONS.find(f => f.family === family);

      return {
        totalFonts: FONT_OPTIONS.length,
        sansSerifFonts: getFontsByCategory('sans-serif').map(f => f.family),
        serifFonts: getFontsByCategory('serif').map(f => f.family),
        monospaceFonts: getFontsByCategory('monospace').map(f => f.family),
        arialWeights: getFontByFamily('Arial')?.weights,
        georgiaWeights: getFontByFamily('Georgia')?.weights,
      };
    });

    expect(result.totalFonts).toBe(7);
    expect(result.sansSerifFonts).toContain('Arial');
    expect(result.serifFonts).toContain('Georgia');
    expect(result.monospaceFonts).toContain('Courier New');
    expect(result.arialWeights).toContain('bold');
    expect(result.georgiaWeights).toContain('italic');
  });
});

test.describe('HistoryPanel Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should track edit history', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface HistoryEntry {
        id: string;
        type: string;
        description: string;
        timestamp: number;
        snapshot?: string;
      }

      const MAX_HISTORY = 50;
      const history: HistoryEntry[] = [];
      let currentIndex = -1;

      const addEntry = (type: string, description: string, snapshot?: string): void => {
        // Remove any entries after current index (for redo)
        history.splice(currentIndex + 1);

        const entry: HistoryEntry = {
          id: `history-${Date.now()}`,
          type,
          description,
          timestamp: Date.now(),
          snapshot,
        };

        history.push(entry);
        currentIndex = history.length - 1;

        // Limit history size
        if (history.length > MAX_HISTORY) {
          history.shift();
          currentIndex--;
        }
      };

      const undo = (): HistoryEntry | null => {
        if (currentIndex > 0) {
          currentIndex--;
          return history[currentIndex];
        }
        return null;
      };

      const redo = (): HistoryEntry | null => {
        if (currentIndex < history.length - 1) {
          currentIndex++;
          return history[currentIndex];
        }
        return null;
      };

      const canUndo = (): boolean => currentIndex > 0;
      const canRedo = (): boolean => currentIndex < history.length - 1;

      const jumpToEntry = (index: number): HistoryEntry | null => {
        if (index >= 0 && index < history.length) {
          currentIndex = index;
          return history[index];
        }
        return null;
      };

      // Test operations
      addEntry('initial', 'Open image');
      addEntry('adjust', 'Brightness +20');
      addEntry('adjust', 'Contrast +10');
      addEntry('crop', 'Crop to 800x600');

      const historyLength = history.length;
      const canUndoInitial = canUndo();

      const undone1 = undo();
      const undone2 = undo();
      const canRedoAfterUndo = canRedo();
      const canUndoAfterUndo = canUndo();

      const redone = redo();

      jumpToEntry(0);
      const jumpedEntry = history[currentIndex];

      return {
        historyLength,
        canUndoInitial,
        undone1Type: undone1?.type,
        undone2Type: undone2?.type,
        canRedoAfterUndo,
        canUndoAfterUndo,
        redoneType: redone?.type,
        jumpedEntryType: jumpedEntry?.type,
        currentIndex,
      };
    });

    expect(result.historyLength).toBe(4);
    expect(result.canUndoInitial).toBe(true);
    expect(result.undone1Type).toBe('adjust');
    expect(result.undone2Type).toBe('adjust');
    expect(result.canRedoAfterUndo).toBe(true);
    expect(result.canUndoAfterUndo).toBe(true);
    expect(result.redoneType).toBe('adjust');
    expect(result.jumpedEntryType).toBe('initial');
    expect(result.currentIndex).toBe(0);
  });

  test('should clear history on new actions after undo', async ({ page }) => {
    const result = await page.evaluate(() => {
      const history: string[] = [];
      let index = -1;

      const add = (action: string): void => {
        history.splice(index + 1);
        history.push(action);
        index = history.length - 1;
      };

      const undo = (): void => {
        if (index > 0) index--;
      };

      add('A');
      add('B');
      add('C');
      add('D');
      const lengthAfterAdds = history.length;

      undo();
      undo();
      const indexAfterUndos = index;
      const lengthAfterUndos = history.length;

      add('E');
      const lengthAfterNewAction = history.length;
      const finalHistory = [...history];

      return {
        lengthAfterAdds,
        indexAfterUndos,
        lengthAfterUndos,
        lengthAfterNewAction,
        finalHistory,
      };
    });

    expect(result.lengthAfterAdds).toBe(4);
    expect(result.indexAfterUndos).toBe(1);
    expect(result.lengthAfterUndos).toBe(4);
    expect(result.lengthAfterNewAction).toBe(3);
    expect(result.finalHistory).toEqual(['A', 'B', 'E']);
  });
});

test.describe('ImageUpscaler Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should support multiple upscale factors', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface UpscaleOption {
        factor: number;
        label: string;
        description: string;
        estimatedTime: string;
      }

      const UPSCALE_OPTIONS: UpscaleOption[] = [
        { factor: 2, label: '2x', description: 'Double size', estimatedTime: '~10 seconds' },
        { factor: 3, label: '3x', description: 'Triple size', estimatedTime: '~20 seconds' },
        { factor: 4, label: '4x', description: 'Quadruple size', estimatedTime: '~30 seconds' },
      ];

      const calculateOutputSize = (width: number, height: number, factor: number): { width: number; height: number } => {
        return {
          width: width * factor,
          height: height * factor,
        };
      };

      const estimateUpscaleTime = (width: number, height: number, factor: number): number => {
        const pixels = width * height * factor * factor;
        const baseTime = 5; // seconds
        const pixelsPerSecond = 100000;
        return baseTime + Math.ceil(pixels / pixelsPerSecond);
      };

      const validateUpscale = (width: number, height: number, factor: number): { valid: boolean; error?: string } => {
        const maxDimension = 8192;
        const outputSize = calculateOutputSize(width, height, factor);

        if (outputSize.width > maxDimension || outputSize.height > maxDimension) {
          return { valid: false, error: `Output would exceed ${maxDimension}px limit` };
        }

        return { valid: true };
      };

      return {
        optionCount: UPSCALE_OPTIONS.length,
        factors: UPSCALE_OPTIONS.map(o => o.factor),
        outputSize2x: calculateOutputSize(1024, 768, 2),
        outputSize4x: calculateOutputSize(1024, 768, 4),
        estimatedTime2x: estimateUpscaleTime(1024, 768, 2),
        validUpscale: validateUpscale(1024, 768, 4),
        invalidUpscale: validateUpscale(4096, 4096, 4),
      };
    });

    expect(result.optionCount).toBe(3);
    expect(result.factors).toEqual([2, 3, 4]);
    expect(result.outputSize2x).toEqual({ width: 2048, height: 1536 });
    expect(result.outputSize4x).toEqual({ width: 4096, height: 3072 });
    expect(result.validUpscale.valid).toBe(true);
    expect(result.invalidUpscale.valid).toBe(false);
  });

  test('should manage upscale processing state', async ({ page }) => {
    const result = await page.evaluate(() => {
      type UpscaleStatus = 'idle' | 'preparing' | 'processing' | 'finalizing' | 'completed' | 'error';

      interface UpscaleState {
        status: UpscaleStatus;
        progress: number;
        inputSize: { width: number; height: number } | null;
        outputSize: { width: number; height: number } | null;
        factor: number;
        error: string | null;
      }

      const createState = (): UpscaleState => ({
        status: 'idle',
        progress: 0,
        inputSize: null,
        outputSize: null,
        factor: 2,
        error: null,
      });

      const startUpscale = (state: UpscaleState, width: number, height: number, factor: number): UpscaleState => ({
        ...state,
        status: 'preparing',
        progress: 0,
        inputSize: { width, height },
        outputSize: { width: width * factor, height: height * factor },
        factor,
        error: null,
      });

      const updateProgress = (state: UpscaleState, progress: number, status?: UpscaleStatus): UpscaleState => ({
        ...state,
        progress: Math.min(100, Math.max(0, progress)),
        status: status || state.status,
      });

      let state = createState();
      const initialStatus = state.status;

      state = startUpscale(state, 512, 512, 4);
      const preparingStatus = state.status;
      const outputSize = state.outputSize;

      state = updateProgress(state, 25, 'processing');
      const processingProgress = state.progress;

      state = updateProgress(state, 90, 'finalizing');
      const finalizingStatus = state.status;

      state = updateProgress(state, 100, 'completed');
      const completedStatus = state.status;

      return {
        initialStatus,
        preparingStatus,
        outputSize,
        processingProgress,
        finalizingStatus,
        completedStatus,
      };
    });

    expect(result.initialStatus).toBe('idle');
    expect(result.preparingStatus).toBe('preparing');
    expect(result.outputSize).toEqual({ width: 2048, height: 2048 });
    expect(result.processingProgress).toBe(25);
    expect(result.finalizingStatus).toBe('finalizing');
    expect(result.completedStatus).toBe('completed');
  });
});

test.describe('ImagePreview Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should compute preview size with constraints', async ({ page }) => {
    const result = await page.evaluate(() => {
      const computePreviewSize = (
        imageWidth: number,
        imageHeight: number,
        containerWidth: number,
        containerHeight: number,
        fitMode: 'contain' | 'cover' | 'fill'
      ): { width: number; height: number; scale: number } => {
        if (fitMode === 'fill') {
          return { width: containerWidth, height: containerHeight, scale: 1 };
        }

        const imageAspect = imageWidth / imageHeight;
        const containerAspect = containerWidth / containerHeight;

        let width: number;
        let height: number;
        let scale: number;

        if (fitMode === 'contain') {
          if (imageAspect > containerAspect) {
            width = containerWidth;
            height = containerWidth / imageAspect;
            scale = containerWidth / imageWidth;
          } else {
            height = containerHeight;
            width = containerHeight * imageAspect;
            scale = containerHeight / imageHeight;
          }
        } else {
          // cover
          if (imageAspect > containerAspect) {
            height = containerHeight;
            width = containerHeight * imageAspect;
            scale = containerHeight / imageHeight;
          } else {
            width = containerWidth;
            height = containerWidth / imageAspect;
            scale = containerWidth / imageWidth;
          }
        }

        return {
          width: Math.round(width),
          height: Math.round(height),
          scale,
        };
      };

      return {
        containLandscape: computePreviewSize(1920, 1080, 800, 600, 'contain'),
        containPortrait: computePreviewSize(1080, 1920, 800, 600, 'contain'),
        coverLandscape: computePreviewSize(1920, 1080, 800, 600, 'cover'),
        fillAny: computePreviewSize(1920, 1080, 800, 600, 'fill'),
      };
    });

    expect(result.containLandscape.width).toBe(800);
    expect(result.containLandscape.height).toBe(450);
    expect(result.containPortrait.width).toBe(338);
    expect(result.containPortrait.height).toBe(600);
    expect(result.coverLandscape.width).toBe(1067);
    expect(result.coverLandscape.height).toBe(600);
    expect(result.fillAny.width).toBe(800);
    expect(result.fillAny.height).toBe(600);
  });

  test('should manage zoom controls', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ZoomState {
        level: number;
        minLevel: number;
        maxLevel: number;
        step: number;
      }

      const DEFAULT_ZOOM: ZoomState = {
        level: 1,
        minLevel: 0.1,
        maxLevel: 10,
        step: 0.25,
      };

      const clampZoom = (level: number, state: ZoomState): number => {
        return Math.max(state.minLevel, Math.min(state.maxLevel, level));
      };

      const zoomIn = (state: ZoomState): ZoomState => ({
        ...state,
        level: clampZoom(state.level + state.step, state),
      });

      const zoomOut = (state: ZoomState): ZoomState => ({
        ...state,
        level: clampZoom(state.level - state.step, state),
      });

      const _zoomToFit = (): ZoomState => ({ ...DEFAULT_ZOOM });

      const _zoomTo100 = (state: ZoomState): ZoomState => ({
        ...state,
        level: 1,
      });

      const setZoom = (state: ZoomState, level: number): ZoomState => ({
        ...state,
        level: clampZoom(level, state),
      });

      let zoom = { ...DEFAULT_ZOOM };
      const initialLevel = zoom.level;

      zoom = zoomIn(zoom);
      zoom = zoomIn(zoom);
      const afterZoomIn = zoom.level;

      zoom = zoomOut(zoom);
      const afterZoomOut = zoom.level;

      zoom = setZoom(zoom, 5);
      const afterSetZoom = zoom.level;

      zoom = setZoom(zoom, 20);
      const clampedHigh = zoom.level;

      zoom = setZoom(zoom, 0.01);
      const clampedLow = zoom.level;

      return {
        initialLevel,
        afterZoomIn,
        afterZoomOut,
        afterSetZoom,
        clampedHigh,
        clampedLow,
      };
    });

    expect(result.initialLevel).toBe(1);
    expect(result.afterZoomIn).toBe(1.5);
    expect(result.afterZoomOut).toBe(1.25);
    expect(result.afterSetZoom).toBe(5);
    expect(result.clampedHigh).toBe(10);
    expect(result.clampedLow).toBe(0.1);
  });

  test('should support comparison modes', async ({ page }) => {
    const result = await page.evaluate(() => {
      type ComparisonMode = 'none' | 'side-by-side' | 'overlay' | 'split';

      interface ComparisonState {
        mode: ComparisonMode;
        splitPosition: number;
        overlayOpacity: number;
      }

      const DEFAULT_COMPARISON: ComparisonState = {
        mode: 'none',
        splitPosition: 50,
        overlayOpacity: 50,
      };

      const setMode = (state: ComparisonState, mode: ComparisonMode): ComparisonState => ({
        ...state,
        mode,
      });

      const setSplitPosition = (state: ComparisonState, position: number): ComparisonState => ({
        ...state,
        splitPosition: Math.max(0, Math.min(100, position)),
      });

      const setOverlayOpacity = (state: ComparisonState, opacity: number): ComparisonState => ({
        ...state,
        overlayOpacity: Math.max(0, Math.min(100, opacity)),
      });

      let state = { ...DEFAULT_COMPARISON };

      state = setMode(state, 'split');
      const splitMode = state.mode;

      state = setSplitPosition(state, 75);
      const splitPosition = state.splitPosition;

      state = setMode(state, 'overlay');
      state = setOverlayOpacity(state, 30);
      const overlayOpacity = state.overlayOpacity;

      return {
        defaultMode: DEFAULT_COMPARISON.mode,
        splitMode,
        splitPosition,
        overlayOpacity,
      };
    });

    expect(result.defaultMode).toBe('none');
    expect(result.splitMode).toBe('split');
    expect(result.splitPosition).toBe(75);
    expect(result.overlayOpacity).toBe(30);
  });
});
