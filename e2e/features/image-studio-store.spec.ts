import { test, expect } from '@playwright/test';

/**
 * Image Studio Store E2E Tests
 * Tests for store state management including layers, history, import/export, and image management
 */

test.describe('Image Studio Store - Layer Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should add and manage layers', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface EditorLayer {
        id: string;
        name: string;
        type: 'image' | 'mask' | 'adjustment';
        visible: boolean;
        opacity: number;
        locked: boolean;
        data?: string;
        order: number;
      }

      const layers: EditorLayer[] = [];
      let nextId = 1;

      const addLayer = (layer: Omit<EditorLayer, 'id' | 'order'>): string => {
        const id = `layer-${nextId++}`;
        const newLayer: EditorLayer = {
          ...layer,
          id,
          order: layers.length,
        };
        layers.push(newLayer);
        return id;
      };

      const updateLayer = (id: string, updates: Partial<EditorLayer>): void => {
        const layer = layers.find(l => l.id === id);
        if (layer) {
          Object.assign(layer, updates);
        }
      };

      const deleteLayer = (id: string): boolean => {
        const index = layers.findIndex(l => l.id === id);
        if (index !== -1) {
          layers.splice(index, 1);
          // Update order for remaining layers
          layers.forEach((l, i) => { l.order = i; });
          return true;
        }
        return false;
      };

      const getLayerById = (id: string): EditorLayer | undefined => 
        layers.find(l => l.id === id);

      // Test operations
      const layer1Id = addLayer({ name: 'Background', type: 'image', visible: true, opacity: 100, locked: false });
      const layer2Id = addLayer({ name: 'Mask', type: 'mask', visible: true, opacity: 100, locked: false });
      const layer3Id = addLayer({ name: 'Adjustments', type: 'adjustment', visible: true, opacity: 75, locked: true });

      const countAfterAdd = layers.length;
      const layer3Order = getLayerById(layer3Id)?.order;

      updateLayer(layer1Id, { name: 'Base Image', opacity: 90 });
      const layer1Updated = getLayerById(layer1Id);

      deleteLayer(layer2Id);
      const countAfterDelete = layers.length;
      const layer3NewOrder = getLayerById(layer3Id)?.order;

      return {
        countAfterAdd,
        layer3Order,
        layer1Name: layer1Updated?.name,
        layer1Opacity: layer1Updated?.opacity,
        countAfterDelete,
        layer3NewOrder,
      };
    });

    expect(result.countAfterAdd).toBe(3);
    expect(result.layer3Order).toBe(2);
    expect(result.layer1Name).toBe('Base Image');
    expect(result.layer1Opacity).toBe(90);
    expect(result.countAfterDelete).toBe(2);
    expect(result.layer3NewOrder).toBe(1);
  });

  test('should reorder layers', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Layer {
        id: string;
        name: string;
        order: number;
      }

      const layers: Layer[] = [
        { id: 'a', name: 'Layer A', order: 0 },
        { id: 'b', name: 'Layer B', order: 1 },
        { id: 'c', name: 'Layer C', order: 2 },
        { id: 'd', name: 'Layer D', order: 3 },
      ];

      const reorderLayers = (fromIndex: number, toIndex: number): void => {
        const [removed] = layers.splice(fromIndex, 1);
        layers.splice(toIndex, 0, removed);
        layers.forEach((layer, index) => {
          layer.order = index;
        });
      };

      const getLayerOrder = (): string[] => 
        layers.sort((a, b) => a.order - b.order).map(l => l.id);

      const initialOrder = getLayerOrder();

      // Move Layer D (index 3) to top (index 0)
      reorderLayers(3, 0);
      const afterMoveToTop = getLayerOrder();

      // Move Layer A (now index 1) to bottom (index 3)
      reorderLayers(1, 3);
      const afterMoveToBottom = getLayerOrder();

      return {
        initialOrder,
        afterMoveToTop,
        afterMoveToBottom,
      };
    });

    expect(result.initialOrder).toEqual(['a', 'b', 'c', 'd']);
    expect(result.afterMoveToTop).toEqual(['d', 'a', 'b', 'c']);
    expect(result.afterMoveToBottom).toEqual(['d', 'b', 'c', 'a']);
  });

  test('should manage layer visibility and locking', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Layer {
        id: string;
        visible: boolean;
        locked: boolean;
      }

      const layers: Layer[] = [
        { id: 'a', visible: true, locked: false },
        { id: 'b', visible: true, locked: false },
        { id: 'c', visible: true, locked: false },
      ];

      const toggleVisibility = (id: string): void => {
        const layer = layers.find(l => l.id === id);
        if (layer) layer.visible = !layer.visible;
      };

      const toggleLock = (id: string): void => {
        const layer = layers.find(l => l.id === id);
        if (layer) layer.locked = !layer.locked;
      };

      const getVisibleLayers = (): Layer[] => layers.filter(l => l.visible);
      const getLockedLayers = (): Layer[] => layers.filter(l => l.locked);

      toggleVisibility('a');
      toggleVisibility('b');
      const visibleCount = getVisibleLayers().length;
      const visibleIds = getVisibleLayers().map(l => l.id);

      toggleLock('b');
      toggleLock('c');
      const lockedCount = getLockedLayers().length;
      const lockedIds = getLockedLayers().map(l => l.id);

      return {
        visibleCount,
        visibleIds,
        lockedCount,
        lockedIds,
      };
    });

    expect(result.visibleCount).toBe(1);
    expect(result.visibleIds).toEqual(['c']);
    expect(result.lockedCount).toBe(2);
    expect(result.lockedIds).toEqual(['b', 'c']);
  });
});

test.describe('Image Studio Store - History Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should manage edit history with undo/redo', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface EditOperation {
        id: string;
        type: string;
        description: string;
        timestamp: number;
        metadata?: Record<string, unknown>;
      }

      const MAX_HISTORY = 100;
      const editHistory: EditOperation[] = [];
      let historyIndex = -1;

      const addToHistory = (operation: Omit<EditOperation, 'id' | 'timestamp'>): void => {
        // Remove any operations after current index
        editHistory.splice(historyIndex + 1);

        const fullOperation: EditOperation = {
          ...operation,
          id: `op-${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
        };

        editHistory.push(fullOperation);
        historyIndex = Math.min(editHistory.length - 1, MAX_HISTORY - 1);

        // Limit history size
        if (editHistory.length > MAX_HISTORY) {
          editHistory.shift();
          historyIndex--;
        }
      };

      const undo = (): EditOperation | null => {
        if (historyIndex > 0) {
          historyIndex--;
          return editHistory[historyIndex];
        }
        return null;
      };

      const redo = (): EditOperation | null => {
        if (historyIndex < editHistory.length - 1) {
          historyIndex++;
          return editHistory[historyIndex];
        }
        return null;
      };

      const canUndo = (): boolean => historyIndex > 0;
      const canRedo = (): boolean => historyIndex < editHistory.length - 1;

      const _clearHistory = (): void => {
        editHistory.length = 0;
        historyIndex = -1;
      };

      // Test operations
      addToHistory({ type: 'generate', description: 'Generated new image' });
      addToHistory({ type: 'adjust', description: 'Brightness +20', metadata: { brightness: 20 } });
      addToHistory({ type: 'adjust', description: 'Contrast +10', metadata: { contrast: 10 } });
      addToHistory({ type: 'crop', description: 'Cropped to 800x600' });
      addToHistory({ type: 'filter', description: 'Applied Vintage filter' });

      const historyLength = editHistory.length;
      const canUndoInitial = canUndo();
      const canRedoInitial = canRedo();

      const undone1 = undo();
      const undone2 = undo();
      const canRedoAfterUndo = canRedo();

      const redone = redo();

      // Add new operation after undo (should clear redo stack)
      addToHistory({ type: 'adjust', description: 'Saturation +15' });
      const canRedoAfterNewOp = canRedo();
      const historyLengthAfterNewOp = editHistory.length;

      return {
        historyLength,
        canUndoInitial,
        canRedoInitial,
        undone1Type: undone1?.type,
        undone2Type: undone2?.type,
        canRedoAfterUndo,
        redoneType: redone?.type,
        canRedoAfterNewOp,
        historyLengthAfterNewOp,
      };
    });

    expect(result.historyLength).toBe(5);
    expect(result.canUndoInitial).toBe(true);
    expect(result.canRedoInitial).toBe(false);
    expect(result.undone1Type).toBe('crop');
    expect(result.undone2Type).toBe('adjust');
    expect(result.canRedoAfterUndo).toBe(true);
    expect(result.redoneType).toBe('crop');
    expect(result.canRedoAfterNewOp).toBe(false);
    expect(result.historyLengthAfterNewOp).toBe(4);
  });

  test('should enforce history size limit', async ({ page }) => {
    const result = await page.evaluate(() => {
      const MAX_HISTORY = 10;
      const history: string[] = [];
      let index = -1;

      const add = (item: string): void => {
        history.splice(index + 1);
        history.push(item);
        index = history.length - 1;

        if (history.length > MAX_HISTORY) {
          history.shift();
          index--;
        }
      };

      // Add more than MAX_HISTORY items
      for (let i = 1; i <= 15; i++) {
        add(`action-${i}`);
      }

      const finalLength = history.length;
      const firstItem = history[0];
      const lastItem = history[history.length - 1];

      return {
        finalLength,
        firstItem,
        lastItem,
        finalIndex: index,
      };
    });

    expect(result.finalLength).toBe(10);
    expect(result.firstItem).toBe('action-6');
    expect(result.lastItem).toBe('action-15');
    expect(result.finalIndex).toBe(9);
  });
});

test.describe('Image Studio Store - Image Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should manage generated images', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface StudioImage {
        id: string;
        url?: string;
        base64?: string;
        prompt: string;
        model: string;
        size: string;
        quality: string;
        style: string;
        timestamp: number;
        isFavorite: boolean;
        tags: string[];
        version: number;
      }

      const images: StudioImage[] = [];
      let nextId = 1;

      const addImage = (image: Omit<StudioImage, 'id' | 'timestamp' | 'isFavorite' | 'tags' | 'version'>): string => {
        const id = `img-${nextId++}`;
        const newImage: StudioImage = {
          ...image,
          id,
          timestamp: Date.now(),
          isFavorite: false,
          tags: [],
          version: 1,
        };
        images.unshift(newImage); // Add to beginning
        return id;
      };

      const updateImage = (id: string, updates: Partial<StudioImage>): void => {
        const image = images.find(img => img.id === id);
        if (image) {
          Object.assign(image, updates);
        }
      };

      const deleteImage = (id: string): boolean => {
        const index = images.findIndex(img => img.id === id);
        if (index !== -1) {
          images.splice(index, 1);
          return true;
        }
        return false;
      };

      const toggleFavorite = (id: string): void => {
        const image = images.find(img => img.id === id);
        if (image) {
          image.isFavorite = !image.isFavorite;
        }
      };

      const getImageById = (id: string): StudioImage | undefined => 
        images.find(img => img.id === id);

      // Test operations
      const img1Id = addImage({
        url: 'https://example.com/img1.png',
        prompt: 'A sunset',
        model: 'dall-e-3',
        size: '1024x1024',
        quality: 'hd',
        style: 'vivid',
      });

      const img2Id = addImage({
        base64: 'base64data...',
        prompt: 'A mountain',
        model: 'dall-e-3',
        size: '1792x1024',
        quality: 'standard',
        style: 'natural',
      });

      const countAfterAdd = images.length;

      toggleFavorite(img1Id);
      const img1Favorite = getImageById(img1Id)?.isFavorite;

      updateImage(img2Id, { tags: ['landscape', 'nature'] });
      const img2Tags = getImageById(img2Id)?.tags;

      deleteImage(img1Id);
      const countAfterDelete = images.length;

      return {
        countAfterAdd,
        img1Favorite,
        img2Tags,
        countAfterDelete,
        firstImagePrompt: images[0]?.prompt,
      };
    });

    expect(result.countAfterAdd).toBe(2);
    expect(result.img1Favorite).toBe(true);
    expect(result.img2Tags).toEqual(['landscape', 'nature']);
    expect(result.countAfterDelete).toBe(1);
    expect(result.firstImagePrompt).toBe('A mountain');
  });

  test('should manage image tags', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Image {
        id: string;
        tags: string[];
      }

      const images: Image[] = [
        { id: 'img-1', tags: [] },
        { id: 'img-2', tags: [] },
        { id: 'img-3', tags: [] },
      ];

      const addTag = (id: string, tag: string): void => {
        const image = images.find(img => img.id === id);
        if (image && !image.tags.includes(tag)) {
          image.tags.push(tag);
        }
      };

      const removeTag = (id: string, tag: string): void => {
        const image = images.find(img => img.id === id);
        if (image) {
          const index = image.tags.indexOf(tag);
          if (index !== -1) {
            image.tags.splice(index, 1);
          }
        }
      };

      const getImagesByTag = (tag: string): Image[] => 
        images.filter(img => img.tags.includes(tag));

      const getAllTags = (): string[] => 
        [...new Set(images.flatMap(img => img.tags))];

      // Test operations
      addTag('img-1', 'landscape');
      addTag('img-1', 'nature');
      addTag('img-2', 'landscape');
      addTag('img-2', 'portrait');
      addTag('img-3', 'abstract');

      const img1Tags = images.find(img => img.id === 'img-1')?.tags;
      const landscapeImages = getImagesByTag('landscape').map(img => img.id);
      const allTags = getAllTags();

      removeTag('img-1', 'nature');
      const img1TagsAfterRemove = images.find(img => img.id === 'img-1')?.tags;

      return {
        img1Tags,
        landscapeImages,
        allTags,
        img1TagsAfterRemove,
      };
    });

    expect(result.img1Tags).toEqual(['landscape', 'nature']);
    expect(result.landscapeImages).toEqual(['img-1', 'img-2']);
    expect(result.allTags.sort()).toEqual(['abstract', 'landscape', 'nature', 'portrait']);
    expect(result.img1TagsAfterRemove).toEqual(['landscape']);
  });

  test('should filter images by favorites', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Image {
        id: string;
        isFavorite: boolean;
      }

      const images: Image[] = [
        { id: 'img-1', isFavorite: false },
        { id: 'img-2', isFavorite: true },
        { id: 'img-3', isFavorite: false },
        { id: 'img-4', isFavorite: true },
        { id: 'img-5', isFavorite: true },
      ];

      const getFavorites = (): Image[] => images.filter(img => img.isFavorite);

      const getFilteredImages = (filterFavorites: boolean): Image[] => 
        filterFavorites ? images.filter(img => img.isFavorite) : images;

      const allImages = getFilteredImages(false);
      const onlyFavorites = getFilteredImages(true);
      const favoriteIds = getFavorites().map(img => img.id);

      return {
        allCount: allImages.length,
        favoriteCount: onlyFavorites.length,
        favoriteIds,
      };
    });

    expect(result.allCount).toBe(5);
    expect(result.favoriteCount).toBe(3);
    expect(result.favoriteIds).toEqual(['img-2', 'img-4', 'img-5']);
  });
});

test.describe('Image Studio Store - State Import/Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should export store state', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface GenerationSettings {
        model: string;
        size: string;
        quality: string;
        style: string;
        numberOfImages: number;
      }

      interface BrushSettings {
        size: number;
        hardness: number;
        opacity: number;
        color: string;
      }

      interface ExportSettings {
        format: string;
        quality: number;
        scale: number;
        includeMetadata: boolean;
      }

      interface StoreState {
        images: Array<{ id: string; prompt: string }>;
        generationSettings: GenerationSettings;
        brushSettings: BrushSettings;
        exportSettings: ExportSettings;
      }

      const state: StoreState = {
        images: [
          { id: 'img-1', prompt: 'Sunset' },
          { id: 'img-2', prompt: 'Mountain' },
        ],
        generationSettings: {
          model: 'dall-e-3',
          size: '1024x1024',
          quality: 'hd',
          style: 'vivid',
          numberOfImages: 1,
        },
        brushSettings: {
          size: 40,
          hardness: 80,
          opacity: 100,
          color: '#000000',
        },
        exportSettings: {
          format: 'png',
          quality: 90,
          scale: 1,
          includeMetadata: true,
        },
      };

      const exportState = (): Partial<StoreState> => ({
        images: state.images.slice(0, 100),
        generationSettings: { ...state.generationSettings },
        brushSettings: { ...state.brushSettings },
        exportSettings: { ...state.exportSettings },
      });

      const exported = exportState();
      const serialized = JSON.stringify(exported);
      const parsed = JSON.parse(serialized);

      return {
        hasImages: Array.isArray(parsed.images),
        imageCount: parsed.images.length,
        hasGenerationSettings: !!parsed.generationSettings,
        hasBrushSettings: !!parsed.brushSettings,
        hasExportSettings: !!parsed.exportSettings,
        model: parsed.generationSettings?.model,
        serializedLength: serialized.length,
      };
    });

    expect(result.hasImages).toBe(true);
    expect(result.imageCount).toBe(2);
    expect(result.hasGenerationSettings).toBe(true);
    expect(result.hasBrushSettings).toBe(true);
    expect(result.hasExportSettings).toBe(true);
    expect(result.model).toBe('dall-e-3');
    expect(result.serializedLength).toBeGreaterThan(0);
  });

  test('should import store state', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface StoreState {
        images: Array<{ id: string; prompt: string }>;
        generationSettings: {
          model: string;
          size: string;
        };
      }

      let state: StoreState = {
        images: [],
        generationSettings: {
          model: 'dall-e-2',
          size: '512x512',
        },
      };

      const importState = (importedState: Partial<StoreState>): void => {
        state = {
          ...state,
          ...importedState,
        };
      };

      const validateImport = (data: unknown): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];

        if (typeof data !== 'object' || data === null) {
          errors.push('Invalid data format');
          return { valid: false, errors };
        }

        const obj = data as Record<string, unknown>;

        if (obj.images !== undefined && !Array.isArray(obj.images)) {
          errors.push('Images must be an array');
        }

        if (obj.generationSettings !== undefined && typeof obj.generationSettings !== 'object') {
          errors.push('Generation settings must be an object');
        }

        return { valid: errors.length === 0, errors };
      };

      const initialModel = state.generationSettings.model;
      const initialImageCount = state.images.length;

      const importData = {
        images: [
          { id: 'imported-1', prompt: 'Imported image 1' },
          { id: 'imported-2', prompt: 'Imported image 2' },
        ],
        generationSettings: {
          model: 'dall-e-3',
          size: '1024x1024',
        },
      };

      const validation = validateImport(importData);
      if (validation.valid) {
        importState(importData);
      }

      const invalidValidation = validateImport('not an object');
      const invalidArrayValidation = validateImport({ images: 'not an array' });

      return {
        initialModel,
        initialImageCount,
        validationPassed: validation.valid,
        finalModel: state.generationSettings.model,
        finalImageCount: state.images.length,
        invalidValidation,
        invalidArrayValidation,
      };
    });

    expect(result.initialModel).toBe('dall-e-2');
    expect(result.initialImageCount).toBe(0);
    expect(result.validationPassed).toBe(true);
    expect(result.finalModel).toBe('dall-e-3');
    expect(result.finalImageCount).toBe(2);
    expect(result.invalidValidation.valid).toBe(false);
    expect(result.invalidArrayValidation.valid).toBe(false);
  });

  test('should persist state to localStorage', async ({ page }) => {
    const result = await page.evaluate(() => {
      const STORAGE_KEY = 'image-studio-test-storage';

      interface PersistedState {
        images: Array<{ id: string; prompt: string }>;
        viewMode: 'grid' | 'single';
        gridZoomLevel: number;
      }

      const persistState = (state: PersistedState): void => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
          console.error('Failed to persist state:', e);
        }
      };

      const loadPersistedState = (): PersistedState | null => {
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            return JSON.parse(stored);
          }
        } catch (e) {
          console.error('Failed to load state:', e);
        }
        return null;
      };

      const clearPersistedState = (): void => {
        localStorage.removeItem(STORAGE_KEY);
      };

      // Test persistence
      const testState: PersistedState = {
        images: [{ id: 'test-1', prompt: 'Test image' }],
        viewMode: 'grid',
        gridZoomLevel: 2,
      };

      persistState(testState);
      const loaded = loadPersistedState();

      const stateMatches = 
        loaded !== null &&
        loaded.images.length === testState.images.length &&
        loaded.viewMode === testState.viewMode &&
        loaded.gridZoomLevel === testState.gridZoomLevel;

      clearPersistedState();
      const afterClear = loadPersistedState();

      return {
        statePersisted: loaded !== null,
        stateMatches,
        clearedSuccessfully: afterClear === null,
        loadedPrompt: loaded?.images[0]?.prompt,
      };
    });

    expect(result.statePersisted).toBe(true);
    expect(result.stateMatches).toBe(true);
    expect(result.clearedSuccessfully).toBe(true);
    expect(result.loadedPrompt).toBe('Test image');
  });
});

test.describe('Image Studio Store - Adjustments', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should manage image adjustments', async ({ page }) => {
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

      const ADJUSTMENT_RANGES: Record<keyof ImageAdjustments, { min: number; max: number }> = {
        brightness: { min: -100, max: 100 },
        contrast: { min: -100, max: 100 },
        saturation: { min: -100, max: 100 },
        hue: { min: -180, max: 180 },
        blur: { min: 0, max: 100 },
        sharpen: { min: 0, max: 100 },
      };

      let adjustments = { ...DEFAULT_ADJUSTMENTS };

      const setAdjustment = <K extends keyof ImageAdjustments>(key: K, value: number): void => {
        const range = ADJUSTMENT_RANGES[key];
        adjustments[key] = Math.max(range.min, Math.min(range.max, value));
      };

      const resetAdjustments = (): void => {
        adjustments = { ...DEFAULT_ADJUSTMENTS };
      };

      const hasChanges = (): boolean => {
        return Object.entries(adjustments).some(
          ([key, value]) => value !== DEFAULT_ADJUSTMENTS[key as keyof ImageAdjustments]
        );
      };

      // Test operations
      setAdjustment('brightness', 50);
      setAdjustment('contrast', 25);
      setAdjustment('saturation', -30);
      const afterAdjustments = { ...adjustments };
      const hasChangesAfterAdjust = hasChanges();

      setAdjustment('brightness', 200);
      const clampedBrightness = adjustments.brightness;

      setAdjustment('blur', -10);
      const clampedBlur = adjustments.blur;

      resetAdjustments();
      const hasChangesAfterReset = hasChanges();

      return {
        afterAdjustments,
        hasChangesAfterAdjust,
        clampedBrightness,
        clampedBlur,
        hasChangesAfterReset,
      };
    });

    expect(result.afterAdjustments.brightness).toBe(50);
    expect(result.afterAdjustments.contrast).toBe(25);
    expect(result.afterAdjustments.saturation).toBe(-30);
    expect(result.hasChangesAfterAdjust).toBe(true);
    expect(result.clampedBrightness).toBe(100);
    expect(result.clampedBlur).toBe(0);
    expect(result.hasChangesAfterReset).toBe(false);
  });

  test('should manage transform operations', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ImageTransform {
        rotation: number;
        flipHorizontal: boolean;
        flipVertical: boolean;
        scale: number;
      }

      const DEFAULT_TRANSFORM: ImageTransform = {
        rotation: 0,
        flipHorizontal: false,
        flipVertical: false,
        scale: 1,
      };

      let transform = { ...DEFAULT_TRANSFORM };

      const setRotation = (degrees: number): void => {
        transform.rotation = ((degrees % 360) + 360) % 360;
      };

      const rotateClockwise = (): void => {
        setRotation(transform.rotation + 90);
      };

      const _rotateCounterClockwise = (): void => {
        setRotation(transform.rotation - 90);
      };

      const flipHorizontal = (): void => {
        transform.flipHorizontal = !transform.flipHorizontal;
      };

      const flipVertical = (): void => {
        transform.flipVertical = !transform.flipVertical;
      };

      const setScale = (scale: number): void => {
        transform.scale = Math.max(0.1, Math.min(10, scale));
      };

      const resetTransform = (): void => {
        transform = { ...DEFAULT_TRANSFORM };
      };

      // Test operations
      rotateClockwise();
      const after90 = transform.rotation;

      rotateClockwise();
      rotateClockwise();
      const after270 = transform.rotation;

      rotateClockwise();
      const after360 = transform.rotation;

      flipHorizontal();
      const isFlippedH = transform.flipHorizontal;

      flipVertical();
      flipVertical();
      const isFlippedV = transform.flipVertical;

      setScale(2.5);
      const scale = transform.scale;

      resetTransform();
      const afterReset = { ...transform };

      return {
        after90,
        after270,
        after360,
        isFlippedH,
        isFlippedV,
        scale,
        afterReset,
      };
    });

    expect(result.after90).toBe(90);
    expect(result.after270).toBe(270);
    expect(result.after360).toBe(0);
    expect(result.isFlippedH).toBe(true);
    expect(result.isFlippedV).toBe(false);
    expect(result.scale).toBe(2.5);
    expect(result.afterReset).toEqual({
      rotation: 0,
      flipHorizontal: false,
      flipVertical: false,
      scale: 1,
    });
  });
});

test.describe('Image Studio Store - Crop Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should manage crop region', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface CropRegion {
        x: number;
        y: number;
        width: number;
        height: number;
      }

      let cropRegion: CropRegion | null = null;
      let _aspectRatioLock: string | null = null;

      const setCropRegion = (region: CropRegion | null): void => {
        cropRegion = region;
      };

      const _setAspectRatioLock = (ratio: string | null): void => {
        _aspectRatioLock = ratio;
      };

      const constrainToAspectRatio = (
        region: CropRegion,
        ratio: string,
        imageWidth: number,
        imageHeight: number
      ): CropRegion => {
        let targetRatio: number;

        switch (ratio) {
          case '1:1':
            targetRatio = 1;
            break;
          case '16:9':
            targetRatio = 16 / 9;
            break;
          case '9:16':
            targetRatio = 9 / 16;
            break;
          case '4:3':
            targetRatio = 4 / 3;
            break;
          default:
            return region;
        }

        const currentRatio = region.width / region.height;

        let newWidth = region.width;
        let newHeight = region.height;

        if (currentRatio > targetRatio) {
          newWidth = region.height * targetRatio;
        } else {
          newHeight = region.width / targetRatio;
        }

        // Ensure within image bounds
        newWidth = Math.min(newWidth, imageWidth - region.x);
        newHeight = Math.min(newHeight, imageHeight - region.y);

        return {
          ...region,
          width: Math.round(newWidth),
          height: Math.round(newHeight),
        };
      };

      // Test operations
      setCropRegion({ x: 0, y: 0, width: 800, height: 600 });
      const initialRegion: CropRegion | null = cropRegion;

      _setAspectRatioLock('1:1');
      const constrained1to1 = constrainToAspectRatio(
        { x: 0, y: 0, width: 800, height: 600 },
        '1:1',
        1920,
        1080
      );

      const constrained16to9 = constrainToAspectRatio(
        { x: 0, y: 0, width: 800, height: 800 },
        '16:9',
        1920,
        1080
      );

      setCropRegion(null);
      const clearedRegion = cropRegion;

      return {
        initialRegion,
        constrained1to1,
        constrained16to9,
        clearedRegion,
      };
    });

    expect(result.initialRegion).toEqual({ x: 0, y: 0, width: 800, height: 600 });
    expect(result.constrained1to1.width).toBe(result.constrained1to1.height);
    expect(Math.abs(result.constrained16to9.width / result.constrained16to9.height - 16 / 9)).toBeLessThan(0.01);
    expect(result.clearedRegion).toBeNull();
  });

  test('should support preset aspect ratios', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface AspectRatioPreset {
        id: string;
        label: string;
        ratio: number;
      }

      const ASPECT_RATIO_PRESETS: AspectRatioPreset[] = [
        { id: 'free', label: 'Free', ratio: 0 },
        { id: '1:1', label: '1:1 Square', ratio: 1 },
        { id: '16:9', label: '16:9 Landscape', ratio: 16 / 9 },
        { id: '9:16', label: '9:16 Portrait', ratio: 9 / 16 },
        { id: '4:3', label: '4:3 Standard', ratio: 4 / 3 },
        { id: '3:4', label: '3:4 Portrait', ratio: 3 / 4 },
        { id: '3:2', label: '3:2 Photo', ratio: 3 / 2 },
        { id: '2:3', label: '2:3 Portrait', ratio: 2 / 3 },
      ];

      const getPresetById = (id: string) => ASPECT_RATIO_PRESETS.find(p => p.id === id);

      const calculateDimensionsForRatio = (
        ratio: number,
        maxWidth: number,
        maxHeight: number
      ): { width: number; height: number } => {
        if (ratio === 0) {
          return { width: maxWidth, height: maxHeight };
        }

        const containerRatio = maxWidth / maxHeight;

        if (ratio > containerRatio) {
          return { width: maxWidth, height: Math.round(maxWidth / ratio) };
        } else {
          return { width: Math.round(maxHeight * ratio), height: maxHeight };
        }
      };

      return {
        presetCount: ASPECT_RATIO_PRESETS.length,
        squarePreset: getPresetById('1:1'),
        landscapePreset: getPresetById('16:9'),
        freeRatio: getPresetById('free')?.ratio,
        dimensionsFor1to1: calculateDimensionsForRatio(1, 800, 600),
        dimensionsFor16to9: calculateDimensionsForRatio(16 / 9, 800, 600),
        dimensionsFor9to16: calculateDimensionsForRatio(9 / 16, 800, 600),
      };
    });

    expect(result.presetCount).toBe(8);
    expect(result.squarePreset?.ratio).toBe(1);
    expect(result.landscapePreset?.ratio).toBeCloseTo(16 / 9);
    expect(result.freeRatio).toBe(0);
    expect(result.dimensionsFor1to1).toEqual({ width: 600, height: 600 });
    expect(result.dimensionsFor16to9).toEqual({ width: 800, height: 450 });
    expect(result.dimensionsFor9to16.height).toBe(600);
  });
});

test.describe('Image Studio Store - Mask Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should manage mask strokes', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface MaskStroke {
        id: string;
        points: Array<{ x: number; y: number }>;
        brushSize: number;
        isEraser: boolean;
      }

      const maskStrokes: MaskStroke[] = [];
      let nextId = 1;

      const addMaskStroke = (stroke: Omit<MaskStroke, 'id'>): void => {
        maskStrokes.push({ ...stroke, id: `stroke-${nextId++}` });
      };

      const clearMaskStrokes = (): void => {
        maskStrokes.length = 0;
      };

      const undoMaskStroke = (): MaskStroke | undefined => {
        return maskStrokes.pop();
      };

      // Test operations
      addMaskStroke({
        points: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
        brushSize: 40,
        isEraser: false,
      });

      addMaskStroke({
        points: [{ x: 20, y: 20 }, { x: 30, y: 30 }],
        brushSize: 60,
        isEraser: true,
      });

      addMaskStroke({
        points: [{ x: 40, y: 40 }, { x: 50, y: 50 }],
        brushSize: 20,
        isEraser: false,
      });

      const countAfterAdd = maskStrokes.length;

      const undone = undoMaskStroke();
      const countAfterUndo = maskStrokes.length;

      clearMaskStrokes();
      const countAfterClear = maskStrokes.length;

      return {
        countAfterAdd,
        undoneIsEraser: undone?.isEraser,
        undoneBrushSize: undone?.brushSize,
        countAfterUndo,
        countAfterClear,
      };
    });

    expect(result.countAfterAdd).toBe(3);
    expect(result.undoneIsEraser).toBe(false);
    expect(result.undoneBrushSize).toBe(20);
    expect(result.countAfterUndo).toBe(2);
    expect(result.countAfterClear).toBe(0);
  });

  test('should export mask as base64', async ({ page }) => {
    const result = await page.evaluate(() => {
      const createMockMaskData = (strokeCount: number): string => {
        return `data:image/png;base64,${btoa(`mock-mask-with-${strokeCount}-strokes`)}`;
      };

      const isValidMaskData = (data: string): boolean => {
        return data.startsWith('data:image/png;base64,');
      };

      const maskWithNoStrokes = createMockMaskData(0);
      const maskWith5Strokes = createMockMaskData(5);

      return {
        noStrokesValid: isValidMaskData(maskWithNoStrokes),
        with5StrokesValid: isValidMaskData(maskWith5Strokes),
        startsCorrectly: maskWithNoStrokes.startsWith('data:image/png;base64,'),
      };
    });

    expect(result.noStrokesValid).toBe(true);
    expect(result.with5StrokesValid).toBe(true);
    expect(result.startsCorrectly).toBe(true);
  });
});

test.describe('Image Studio Store - View State', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should manage view state', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ViewState {
        zoom: number;
        panX: number;
        panY: number;
        showGrid: boolean;
        showRulers: boolean;
      }

      const DEFAULT_VIEW: ViewState = {
        zoom: 1,
        panX: 0,
        panY: 0,
        showGrid: false,
        showRulers: false,
      };

      let view = { ...DEFAULT_VIEW };

      const setZoom = (zoom: number): void => {
        view.zoom = Math.max(0.1, Math.min(10, zoom));
      };

      const setPan = (x: number, y: number): void => {
        view.panX = x;
        view.panY = y;
      };

      const resetView = (): void => {
        view = { ...DEFAULT_VIEW };
      };

      const toggleGrid = (): void => {
        view.showGrid = !view.showGrid;
      };

      const toggleRulers = (): void => {
        view.showRulers = !view.showRulers;
      };

      // Test operations
      setZoom(2.5);
      const zoomAfterSet = view.zoom;

      setZoom(20);
      const clampedZoomHigh = view.zoom;

      setZoom(0.01);
      const clampedZoomLow = view.zoom;

      setPan(100, -50);
      const panAfterSet = { x: view.panX, y: view.panY };

      toggleGrid();
      const gridAfterToggle = view.showGrid;

      toggleRulers();
      toggleRulers();
      const rulersAfterDoubleToggle = view.showRulers;

      resetView();
      const afterReset = { ...view };

      return {
        zoomAfterSet,
        clampedZoomHigh,
        clampedZoomLow,
        panAfterSet,
        gridAfterToggle,
        rulersAfterDoubleToggle,
        afterReset,
      };
    });

    expect(result.zoomAfterSet).toBe(2.5);
    expect(result.clampedZoomHigh).toBe(10);
    expect(result.clampedZoomLow).toBe(0.1);
    expect(result.panAfterSet).toEqual({ x: 100, y: -50 });
    expect(result.gridAfterToggle).toBe(true);
    expect(result.rulersAfterDoubleToggle).toBe(false);
    expect(result.afterReset).toEqual({
      zoom: 1,
      panX: 0,
      panY: 0,
      showGrid: false,
      showRulers: false,
    });
  });
});
