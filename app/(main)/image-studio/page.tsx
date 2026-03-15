'use client';

/**
 * Image Studio Page - Orchestrator
 * Composes sub-components for image generation, editing, gallery, and export.
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSettingsStore, useImageStudioStore } from '@/stores';
import {
  HistoryPanel,
  ImageStudioHeader,
  ImageGenerationSidebar,
  ImageStudioDialogs,
  ImageGalleryGrid,
  ImageDetailView,
} from '@/components/image-studio';
import type { HistoryOperationType, Layer, LayerType, EditMode, EditorSaveResult, ImageEditAction } from '@/components/image-studio';
import { useImageEditorShortcuts, useAdvancedImageEditor, useBatchProcessor } from '@/hooks/image-studio';
import { useImageGeneration } from '@/hooks/media';
import { toHistoryOperationType, type GeneratedImageWithMeta } from '@/lib/image-studio';
import { proxyFetch } from '@/lib/network/proxy-fetch';
import {
  createProviderSettingsSnapshot,
} from '@/lib/ai/provider-consumption';
import {
  resolveImageEditingAccess,
  resolveImageInpaintingAccess,
  resolveImageStudioGenerationAccess,
  resolveImageVariationAccess,
} from '@/lib/ai/provider-consumption/capability-provider';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { loggers } from '@/lib/logger';
import {
  downloadImageAsBlob,
  saveImageToFile,
  estimateImageCost,
  type ImageSize,
  type ImageQuality,
  type ImageStyle,
} from '@/lib/ai';
import { generateImageWithSDK } from '@/lib/ai/media/image-generation-sdk';
import type { ImageSizeOption, ImageQualityOption } from '@/lib/ai/media/image-generation-sdk';
import { useBatchEditStore } from '@/stores/media';

export default function ImageStudioPage() {
  const t = useTranslations('imageGeneration');

  // ─── Store State ───────────────────────────────────────────────────
  const {
    images: storeImages,
    selectedImageId,
    addImage,
    getImageById,
    deleteImage,
    selectImage,
    toggleFavorite,
    editHistory,
    historyIndex,
    clearHistory,
    undo: storeUndo,
    redo: storeRedo,
    goToHistoryIndex,
    canUndo,
    canRedo,
    editSession,
    operationStates,
    startEditSession,
    updateEditDraft,
    discardEditDraft,
    commitEditOperation,
    endEditSession,
    startOperation,
    finishOperation,
    failOperation,
    clearOperationErrors,
    prompt,
    negativePrompt,
    setPrompt,
    setNegativePrompt,
    activeTab: storeActiveTab,
    setActiveTab: setStoreActiveTab,
    viewMode,
    setViewMode,
    showSidebar,
    setShowSidebar,
    showSettings,
    setShowSettings,
    showHistory,
    setShowHistory,
    filterFavorites,
    setFilterFavorites,
    gridZoomLevel: zoomLevel,
    setGridZoomLevel: setZoomLevel,
    searchQuery,
    setSearchQuery,
    generationQueue,
    addToQueue,
    updateQueueJob,
    removeFromQueue,
    clearQueue,
    generationSettings,
    updateGenerationSettings,
    // Layers
    layers: storeLayers,
    activeLayerId: storeActiveLayerId,
    addLayer,
    updateLayer,
    deleteLayer,
    setActiveLayer,
    reorderLayers,
  } = useImageStudioStore();

  // Derive activeTab (store has wider union, page only uses 3 values)
  const activeTab = (storeActiveTab === 'generate' || storeActiveTab === 'edit' || storeActiveTab === 'variations')
    ? storeActiveTab : 'generate';
  const setActiveTab = useCallback((tab: 'generate' | 'edit' | 'variations') => setStoreActiveTab(tab), [setStoreActiveTab]);

  const [localError, setLocalError] = useState<string | null>(null);
  const [retryOperationKey, setRetryOperationKey] = useState<
    'generate' | 'edit' | 'variation' | 'inpaint' | 'export' | null
  >(null);

  // Derive generation settings from store
  const { provider, model, size, quality, style, numberOfImages, seed } = generationSettings;
  const setProvider = (p: typeof provider) => updateGenerationSettings({ provider: p });
  const setModel = (m: string) => updateGenerationSettings({ model: m });
  const setSize = (s: ImageSize) => updateGenerationSettings({ size: s });
  const setQuality = (q: ImageQuality) => updateGenerationSettings({ quality: q });
  const setStyle = (s: ImageStyle) => updateGenerationSettings({ style: s });
  const setNumberOfImages = (n: number) => updateGenerationSettings({ numberOfImages: n });
  const setSeed = (s: number | null) => updateGenerationSettings({ seed: s });

  // Edit mode state
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [maskFile, setMaskFile] = useState<File | null>(null);
  const [variationImage, setVariationImage] = useState<File | null>(null);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);

  // Editing dialog state
  const [editingImage, setEditingImage] = useState<GeneratedImageWithMeta | null>(null);
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null);
  const [compareBeforeImage, setCompareBeforeImage] = useState<string | null>(null);

  // Preview state
  const [previewImage, setPreviewImage] = useState<GeneratedImageWithMeta | null>(null);
  const [showHistogram, setShowHistogram] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewPan, setPreviewPan] = useState({ x: 0, y: 0 });
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maskInputRef = useRef<HTMLInputElement>(null);
  const variationInputRef = useRef<HTMLInputElement>(null);

  // ─── Derived Data ──────────────────────────────────────────────────
  const generatedImages: GeneratedImageWithMeta[] = useMemo(
    () =>
      storeImages.map((img) => ({
        url: img.url,
        base64: img.base64,
        revisedPrompt: img.revisedPrompt,
        id: img.id,
        prompt: img.prompt,
        model: img.model,
        timestamp: img.timestamp,
        settings: { size: img.size, quality: img.quality, style: img.style },
        isFavorite: img.isFavorite,
        parentId: img.parentId,
        version: img.version,
      })),
    [storeImages]
  );

  const selectedImage = useMemo(() => {
    if (!selectedImageId) return null;
    return generatedImages.find((img) => img.id === selectedImageId) ?? null;
  }, [generatedImages, selectedImageId]);

  const displayedImages = useMemo(() => {
    let filtered = filterFavorites ? generatedImages.filter((img) => img.isFavorite) : generatedImages;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((img) => img.prompt.toLowerCase().includes(q) || img.model.toLowerCase().includes(q));
    }
    return filtered;
  }, [generatedImages, filterFavorites, searchQuery]);

  const estimatedCost = estimateImageCost(model, size, quality, model === 'dall-e-3' ? 1 : numberOfImages);

  const currentOperationKey = useMemo<'generate' | 'edit' | 'variation'>(() => {
    if (activeTab === 'edit') {
      return 'edit';
    }
    if (activeTab === 'variations') {
      return 'variation';
    }
    return 'generate';
  }, [activeTab]);

  const currentOperationState = operationStates[currentOperationKey];
  const latestFailedOperation = useMemo(() => {
    return (
      (Object.entries(operationStates)
        .filter(([, state]) => state.status === 'error')
        .sort(
          (a, b) =>
            (b[1].lastCompletedAt ?? 0) -
            (a[1].lastCompletedAt ?? 0)
        )[0]?.[0] as 'generate' | 'edit' | 'variation' | 'inpaint' | 'export' | undefined) ??
      null
    );
  }, [operationStates]);

  const isGenerating =
    operationStates.generate.status === 'running' ||
    operationStates.edit.status === 'running' ||
    operationStates.variation.status === 'running' ||
    operationStates.inpaint.status === 'running';
  const sidebarError =
    currentOperationState.status === 'error'
      ? currentOperationState.error
      : localError ??
        (latestFailedOperation
          ? operationStates[latestFailedOperation]?.error
          : null);
  const canRetry =
    (currentOperationState.status === 'error' && currentOperationState.retryable) ||
    !!retryOperationKey;

  // ─── External Hooks ────────────────────────────────────────────────
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const customProviders = useSettingsStore((state) => state.customProviders);
  const imageEditingAccess = useMemo(
    () =>
      resolveImageEditingAccess(
        createProviderSettingsSnapshot({
          defaultProvider: '',
          providerSettings,
          customProviders,
        })
      ),
    [providerSettings, customProviders]
  );
  const imageVariationAccess = useMemo(
    () =>
      resolveImageVariationAccess(
        createProviderSettingsSnapshot({
          defaultProvider: '',
          providerSettings,
          customProviders,
        })
      ),
    [providerSettings, customProviders]
  );
  const imageInpaintingAccess = useMemo(
    () =>
      resolveImageInpaintingAccess(
        createProviderSettingsSnapshot({
          defaultProvider: '',
          providerSettings,
          customProviders,
        })
      ),
    [providerSettings, customProviders]
  );
  const imageStudioGenerationAccess = useMemo(
    () =>
      resolveImageStudioGenerationAccess(
        provider,
        createProviderSettingsSnapshot({
          defaultProvider: '',
          providerSettings,
          customProviders,
        })
      ),
    [provider, providerSettings, customProviders]
  );

  const imageGen = useImageGeneration({ defaultSize: size, defaultQuality: quality, defaultStyle: style });
  const advancedEditor = useAdvancedImageEditor({ useWorker: true, useWebGL: true });
  const batchProcessor = useBatchProcessor({
    onJobComplete: (jobId) => loggers.media.info(`Batch job ${jobId} completed`),
    onImageComplete: (_jobId, _imageId, outputPath) => {
      if (!outputPath) {
        return;
      }
      addImage({ url: outputPath, prompt: 'Batch processed', model, size, quality, style });
    },
    onImageError: (_jobId, imageId, err) => loggers.media.error(`Batch image ${imageId} failed`, new Error(err)),
  });
  const { presets: batchPresets } = useBatchEditStore();

  // ─── Keyboard Shortcuts ────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) || (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) { e.preventDefault(); handleRedo(); }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !isGenerating) { e.preventDefault(); handleGenerate(); }
      if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) { setFilterFavorites(!filterFavorites); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // ─── Histogram ─────────────────────────────────────────────────────
  const [histogramData, setHistogramData] = useState<{
    red: number[]; green: number[]; blue: number[]; luminance: number[];
  } | null>(null);

  useEffect(() => {
    if (!showHistogram || !selectedImage?.url) { setHistogramData(null); return; }
    const load = async () => {
      try {
        await advancedEditor.loadImage(selectedImage.url!);
        setHistogramData(await advancedEditor.getHistogram());
      } catch { setHistogramData(null); }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHistogram, selectedImage?.url]);

  // ─── Handlers ──────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || imageStudioGenerationAccess.kind !== 'resolved') {
      const message =
        imageStudioGenerationAccess.kind !== 'resolved'
          ? imageStudioGenerationAccess.reason
          : 'Prompt is required';
      setLocalError(message);
      failOperation('generate', message, { retryable: false });
      return;
    }
    clearOperationErrors();
    setLocalError(null);
    setRetryOperationKey(null);

    const fullPrompt = prompt.trim() + (negativePrompt ? ` Avoid: ${negativePrompt}` : '');
    const n = model === 'dall-e-3' ? 1 : numberOfImages;

    // Add job to queue
    const jobId = addToQueue({ prompt: fullPrompt, provider, model, size, quality, style, seed: seed ?? undefined });
    updateQueueJob(jobId, { status: 'generating' });
    startOperation('generate', { prompt: fullPrompt, provider, model, size, quality, style, n });

    try {
      const results: Array<{
        url: string;
        base64?: string;
        revisedPrompt?: string;
      }> = [];

      if (provider === 'openai') {
        const result = await imageGen.generate(fullPrompt, {
          model: model as 'dall-e-3' | 'dall-e-2' | 'gpt-image-1',
          size, quality, style, n,
        });
        if (!result?.length) {
          throw new Error(imageGen.error || 'Failed to generate image');
        }
        for (const img of result) {
          const resolvedUrl = img.url ?? (img.base64 ? `data:image/png;base64,${img.base64}` : undefined);
          if (!resolvedUrl) {
            continue;
          }
          const normalizedUrl: string = resolvedUrl;
          results.push({
            url: normalizedUrl,
            base64: img.base64,
            revisedPrompt: img.revisedPrompt,
          });
        }
      } else {
        const sdkResult = await generateImageWithSDK(
          { apiKey: imageStudioGenerationAccess.apiKey },
          { prompt: fullPrompt, provider, model, size: size as ImageSizeOption, quality: quality as ImageQualityOption, n, seed: seed ?? undefined }
        );
        if (!sdkResult.images.length) {
          throw new Error('No images returned');
        }
        results.push(
          ...sdkResult.images.map((img) => ({
            url: `data:image/png;base64,${img.base64}`,
            base64: img.base64,
            revisedPrompt: img.revisedPrompt,
          }))
        );
      }

      if (results.length === 0) {
        throw new Error('No images returned');
      }

      let committedId: string | null = null;
      for (const [index, result] of results.entries()) {
        if (index === 0) {
          committedId = commitEditOperation({
            mode: 'generate',
            description: `Generated: ${prompt.trim().substring(0, 50)}...`,
            resultImage: {
              url: result.url,
              base64: result.base64,
              revisedPrompt: result.revisedPrompt,
              prompt: prompt.trim(),
              model,
              size,
              quality,
              style,
            },
          });
        } else {
          addImage({
            url: result.url,
            base64: result.base64,
            revisedPrompt: result.revisedPrompt,
            prompt: prompt.trim(),
            model,
            size,
            quality,
            style,
          });
        }
      }

      if (committedId) {
        selectImage(committedId);
        updateQueueJob(jobId, { status: 'completed', completedAt: Date.now(), resultImageId: committedId });
        finishOperation('generate', { resultImageId: committedId, count: results.length });
        setRetryOperationKey(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate image';
      updateQueueJob(jobId, { status: 'failed', error: msg });
      failOperation('generate', msg, {
        retryable: true,
        context: { prompt: fullPrompt, provider, model, size, quality, style, n },
      });
      setRetryOperationKey('generate');
    }
  }, [prompt, negativePrompt, provider, model, size, quality, style, numberOfImages, seed, imageStudioGenerationAccess, imageGen, addImage, selectImage, commitEditOperation, addToQueue, updateQueueJob, startOperation, finishOperation, failOperation, clearOperationErrors]);

  const handleEditImage = useCallback(async () => {
    if (!editImageFile || !prompt.trim() || imageEditingAccess.kind !== 'resolved') {
      const message =
        imageEditingAccess.kind !== 'resolved'
          ? imageEditingAccess.reason
          : 'Image and prompt are required';
      setLocalError(message);
      failOperation('edit', message, { retryable: false });
      return;
    }
    clearOperationErrors();
    setLocalError(null);
    setRetryOperationKey(null);
    startOperation('edit', {
      prompt: prompt.trim(),
      size,
      numberOfImages,
      sourceImageId: selectedImageId,
    });

    try {
      const result = await imageGen.edit(editImageFile, prompt.trim(), maskFile || undefined, { size: size as '256x256' | '512x512' | '1024x1024', n: numberOfImages });
      if (!result?.length) {
        throw new Error(imageGen.error || 'Failed to edit image');
      }

      let committedId: string | null = null;
      for (const [index, img] of result.entries()) {
        if (index === 0) {
          committedId = commitEditOperation({
            mode: 'edit',
            description: `Edited: ${prompt.trim().substring(0, 50)}...`,
            sourceImageId: selectedImageId,
            resultImage: {
              url: img.url,
              base64: img.base64,
              revisedPrompt: img.revisedPrompt,
              prompt: prompt.trim(),
              model: 'dall-e-2',
              size: size as ImageSize,
              quality,
              style,
            },
          });
        } else {
          addImage({
            url: img.url,
            base64: img.base64,
            revisedPrompt: img.revisedPrompt,
            prompt: prompt.trim(),
            model: 'dall-e-2',
            size: size as ImageSize,
            quality,
            style,
            parentId: selectedImageId ?? undefined,
          });
        }
      }

      if (committedId) {
        selectImage(committedId);
        finishOperation('edit', { resultImageId: committedId, count: result.length });
        setRetryOperationKey(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to edit image';
      failOperation('edit', message, {
        retryable: true,
        context: {
          prompt: prompt.trim(),
          size,
          numberOfImages,
          sourceImageId: selectedImageId,
        },
      });
      setRetryOperationKey('edit');
    }
  }, [editImageFile, maskFile, prompt, size, numberOfImages, imageEditingAccess, quality, style, addImage, selectImage, imageGen, selectedImageId, commitEditOperation, startOperation, finishOperation, failOperation, clearOperationErrors]);

  const handleCreateVariations = useCallback(async () => {
    if (!variationImage || imageVariationAccess.kind !== 'resolved') {
      const message =
        imageVariationAccess.kind !== 'resolved'
          ? imageVariationAccess.reason
          : 'Variation image is required';
      setLocalError(message);
      failOperation('variation', message, { retryable: false });
      return;
    }
    clearOperationErrors();
    setLocalError(null);
    setRetryOperationKey(null);
    startOperation('variation', {
      size,
      numberOfImages,
      sourceImageId: selectedImageId,
    });

    try {
      const result = await imageGen.createVariations(variationImage, { size: size as '256x256' | '512x512' | '1024x1024', n: numberOfImages });
      if (!result?.length) {
        throw new Error(imageGen.error || 'Failed to create variations');
      }

      let committedId: string | null = null;
      for (const [index, img] of result.entries()) {
        if (index === 0) {
          committedId = commitEditOperation({
            mode: 'variation',
            description: 'Created variation',
            sourceImageId: selectedImageId,
            resultImage: {
              url: img.url,
              base64: img.base64,
              revisedPrompt: img.revisedPrompt,
              prompt: 'Variation',
              model: 'dall-e-2',
              size: size as ImageSize,
              quality,
              style,
              parentId: selectedImageId ?? undefined,
            },
          });
        } else {
          addImage({
            url: img.url,
            base64: img.base64,
            revisedPrompt: img.revisedPrompt,
            prompt: 'Variation',
            model: 'dall-e-2',
            size: size as ImageSize,
            quality,
            style,
            parentId: selectedImageId ?? undefined,
          });
        }
      }

      if (committedId) {
        selectImage(committedId);
        finishOperation('variation', { resultImageId: committedId, count: result.length });
        setRetryOperationKey(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create variations';
      failOperation('variation', message, {
        retryable: true,
        context: { size, numberOfImages, sourceImageId: selectedImageId },
      });
      setRetryOperationKey('variation');
    }
  }, [variationImage, size, numberOfImages, imageVariationAccess, quality, style, addImage, selectImage, imageGen, selectedImageId, commitEditOperation, startOperation, finishOperation, failOperation, clearOperationErrors]);

  const handleDownload = useCallback(async (image: GeneratedImageWithMeta) => {
    try {
      if (!image.url) return;
      const blob = await downloadImageAsBlob(image.url);
      saveImageToFile(blob, `image-${image.id}.png`);
    } catch (err) {
      loggers.media.error('Download error', err as Error);
    }
  }, []);

  const handleUndo = useCallback(() => { if (canUndo()) storeUndo(); }, [canUndo, storeUndo]);
  const handleRedo = useCallback(() => { if (canRedo()) storeRedo(); }, [canRedo, storeRedo]);

  useImageEditorShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    onDelete: () => { if (selectedImageId) deleteImage(selectedImageId); },
    onZoomIn: () => setPreviewZoom((z) => Math.min(10, z * 1.2)),
    onZoomOut: () => setPreviewZoom((z) => Math.max(0.1, z / 1.2)),
    onZoomReset: () => { setPreviewZoom(1); setPreviewPan({ x: 0, y: 0 }); },
    onCancel: () => {
      if (editingImage) {
        discardEditDraft();
        endEditSession();
        setEditingImage(null);
        setEditMode(null);
        setMaskDataUrl(null);
      }
    },
    onNavigateNext: () => {
      if (!generatedImages.length) return;
      const idx = generatedImages.findIndex((img) => img.id === selectedImageId);
      if (idx < generatedImages.length - 1) selectImage(generatedImages[idx + 1].id);
    },
    onNavigatePrev: () => {
      if (!generatedImages.length) return;
      const idx = generatedImages.findIndex((img) => img.id === selectedImageId);
      if (idx > 0) selectImage(generatedImages[idx - 1].id);
    },
    onPreview: () => {
      const img = generatedImages.find((i) => i.id === selectedImageId);
      if (img) setPreviewImage(img);
    },
    onToggleFavorite: () => { if (selectedImageId) toggleFavorite(selectedImageId); },
    enabled: true,
  });

  const handleUseForEdit = useCallback(async (image: GeneratedImageWithMeta) => {
    if (!image.url) return;
    try {
      const response = await proxyFetch(image.url);
      const blob = await response.blob();
      setEditImageFile(new File([blob], 'image.png', { type: 'image/png' }));
      setActiveTab('edit');
      setPrompt('');
    } catch (err) { loggers.media.error('Failed to use image for edit', err as Error); }
  }, [setActiveTab, setPrompt]);

  const handleUseForVariation = useCallback(async (image: GeneratedImageWithMeta) => {
    if (!image.url) return;
    try {
      const response = await proxyFetch(image.url);
      const blob = await response.blob();
      setVariationImage(new File([blob], 'image.png', { type: 'image/png' }));
      setActiveTab('variations');
    } catch (err) { loggers.media.error('Failed to use image for variation', err as Error); }
  }, [setActiveTab]);

  const handleEditAction = useCallback((image: GeneratedImageWithMeta, action: ImageEditAction) => {
    switch (action) {
      case 'use-for-edit': handleUseForEdit(image); break;
      case 'use-for-variation': handleUseForVariation(image); break;
      case 'compare':
        setCompareBeforeImage(image.url || null);
        setEditingImage(image);
        setEditMode('compare');
        break;
      default:
        {
        const sessionMode = (action === 'filter' ? 'filter' : action) as
          | 'mask'
          | 'crop'
          | 'adjust'
          | 'upscale'
          | 'remove-bg'
          | 'filter'
          | 'text'
          | 'draw';
        startEditSession({
          sourceImageId: image.id,
          sourceImageUrl: image.url ?? null,
          mode: sessionMode,
        });
        setEditingImage(image);
        setEditMode(action);
        break;
        }
    }
  }, [handleUseForEdit, handleUseForVariation, startEditSession]);

  const handleEditorSave = useCallback((result: EditorSaveResult) => {
    if (!editingImage) return;
    if (result.mode === 'mask') {
      updateEditDraft({
        draftImageUrl: result.dataUrl,
        pendingOperation: 'mask',
        metadata: { sourceImageId: editingImage.id },
      });
      setMaskDataUrl(result.dataUrl);
      return;
    }

    const mode = toHistoryOperationType(result.mode);
    const operationKey =
      result.mode === 'upscale' ? 'upscale' : result.mode === 'remove-bg' ? 'remove-bg' : null;
    if (operationKey) {
      startOperation(operationKey, { sourceImageId: editingImage.id });
    }

    const newImageId = commitEditOperation({
      mode,
      description: `Applied ${result.mode} edit`,
      sourceImageId: editingImage.id,
      resultImage: {
        url: result.dataUrl,
        prompt: editingImage.prompt,
        model: editingImage.model,
        size: editingImage.settings.size,
        quality: editingImage.settings.quality,
        style: editingImage.settings.style,
        parentId: editingImage.id,
      },
      metadata: { sessionId: editSession.sessionId, mode: result.mode },
    });

    if (!newImageId) {
      if (operationKey) {
        failOperation(operationKey, 'Failed to commit image edit', { retryable: false });
      }
      return;
    }

    const committedImage = getImageById(newImageId);
    if (committedImage) {
      setEditingImage({
        id: committedImage.id,
        url: committedImage.url,
        base64: committedImage.base64,
        revisedPrompt: committedImage.revisedPrompt,
        prompt: committedImage.prompt,
        model: committedImage.model,
        timestamp: committedImage.timestamp,
        settings: {
          size: committedImage.size,
          quality: committedImage.quality,
          style: committedImage.style,
        },
        isFavorite: committedImage.isFavorite,
        parentId: committedImage.parentId,
        version: committedImage.version,
      });
    }
    setMaskDataUrl(null);
    if (operationKey) {
      finishOperation(operationKey, { resultImageId: newImageId });
    }
    setRetryOperationKey(null);
  }, [editingImage, updateEditDraft, commitEditOperation, editSession.sessionId, getImageById, startOperation, finishOperation, failOperation]);

  const handleApplyInpainting = useCallback(async () => {
    if (!editingImage?.url || !maskDataUrl || imageInpaintingAccess.kind !== 'resolved') {
      const message =
        imageInpaintingAccess.kind !== 'resolved'
          ? imageInpaintingAccess.reason
          : 'Mask and source image are required';
      setLocalError(message);
      failOperation('inpaint', message, { retryable: false });
      return;
    }

    const currentEditingImage = editingImage;
    clearOperationErrors();
    setLocalError(null);
    setRetryOperationKey(null);
    startOperation('inpaint', {
      sourceImageId: currentEditingImage.id,
      sourceImageUrl: currentEditingImage.url,
      maskDataUrl,
      prompt: prompt || 'Continue the image naturally',
    });

    try {
      const imgBlob = await (await proxyFetch(currentEditingImage.url!)).blob();
      const imgFile = new File([imgBlob], 'image.png', { type: 'image/png' });
      const maskBlob = await (await fetch(maskDataUrl)).blob();
      const maskFileData = new File([maskBlob], 'mask.png', { type: 'image/png' });
      const result = await imageGen.edit(imgFile, prompt || 'Continue the image naturally', maskFileData, { size: '1024x1024' });
      if (!result?.length) {
        throw new Error(imageGen.error || 'Inpainting failed');
      }

      let committedId: string | null = null;
      for (const [index, img] of result.entries()) {
        if (index === 0) {
          committedId = commitEditOperation({
            mode: 'mask',
            description: 'Inpainted image',
            sourceImageId: currentEditingImage.id,
            resultImage: {
              url: img.url,
              base64: img.base64,
              revisedPrompt: img.revisedPrompt,
              prompt: prompt || 'Inpainted',
              model: 'dall-e-2',
              size: '1024x1024' as ImageSize,
              quality,
              style,
              parentId: currentEditingImage.id,
            },
            metadata: {
              maskDataUrl,
              sessionId: editSession.sessionId,
            },
          });
        } else {
          addImage({
            url: img.url,
            base64: img.base64,
            revisedPrompt: img.revisedPrompt,
            prompt: prompt || 'Inpainted',
            model: 'dall-e-2',
            size: '1024x1024' as ImageSize,
            quality,
            style,
            parentId: currentEditingImage.id,
          });
        }
      }

      if (committedId) {
        selectImage(committedId);
        finishOperation('inpaint', { resultImageId: committedId, count: result.length });
        setRetryOperationKey(null);
      }
      setMaskDataUrl(null);
      setEditingImage(null);
      setEditMode(null);
      endEditSession();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Inpainting failed';
      failOperation('inpaint', message, {
        retryable: true,
        context: {
          sourceImageId: currentEditingImage.id,
          sourceImageUrl: currentEditingImage.url,
          maskDataUrl,
          prompt: prompt || 'Continue the image naturally',
        },
      });
      setRetryOperationKey('inpaint');
    }
  }, [editingImage, maskDataUrl, imageInpaintingAccess, prompt, quality, style, imageGen, addImage, selectImage, commitEditOperation, editSession.sessionId, startOperation, finishOperation, failOperation, clearOperationErrors, endEditSession]);

  const handleRegenerate = useCallback((image: GeneratedImageWithMeta) => {
    setPrompt(image.prompt);
    // Trigger generation after prompt is set
    setTimeout(() => handleGenerate(), 0);
  }, [handleGenerate, setPrompt]);

  const handleRetryCurrentOperation = useCallback(() => {
    const retryKey = retryOperationKey ?? latestFailedOperation;
    if (!retryKey) {
      return;
    }

    if (retryKey === 'generate') {
      void handleGenerate();
    } else if (retryKey === 'edit') {
      void handleEditImage();
    } else if (retryKey === 'variation') {
      void handleCreateVariations();
    } else if (retryKey === 'inpaint') {
      void handleApplyInpainting();
    } else if (retryKey === 'export') {
      setShowExportDialog(true);
    }
  }, [retryOperationKey, latestFailedOperation, handleGenerate, handleEditImage, handleCreateVariations, handleApplyInpainting]);

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-background">
      <ImageStudioHeader
        imageCount={generatedImages.length}
        canUndo={canUndo()}
        canRedo={canRedo()}
        viewMode={viewMode}
        zoomLevel={zoomLevel}
        filterFavorites={filterFavorites}
        showSidebar={showSidebar}
        showHistory={showHistory}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onViewModeChange={setViewMode}
        onZoomLevelChange={setZoomLevel}
        onFilterFavoritesChange={setFilterFavorites}
        onShowSidebarChange={setShowSidebar}
        onShowHistoryChange={setShowHistory}
        onExport={() => setShowExportDialog(true)}
        isGenerating={isGenerating}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        {showSidebar && (
          <>
          <ResizablePanel defaultSize={25} minSize={18} maxSize={40} className="min-w-0">
            <ImageGenerationSidebar
              show={showSidebar}
              activeTab={activeTab}
              onActiveTabChange={setActiveTab}
              prompt={prompt}
              onPromptChange={setPrompt}
              negativePrompt={negativePrompt}
              onNegativePromptChange={setNegativePrompt}
              provider={provider}
              onProviderChange={setProvider}
              model={model}
              onModelChange={setModel}
              size={size}
              onSizeChange={setSize}
              quality={quality}
              onQualityChange={setQuality}
              style={style}
              onStyleChange={setStyle}
              numberOfImages={numberOfImages}
              onNumberOfImagesChange={setNumberOfImages}
              seed={seed}
              onSeedChange={setSeed}
              estimatedCost={estimatedCost}
              referenceImage={referenceImage}
              onReferenceImageChange={setReferenceImage}
              editImageFile={editImageFile}
              onEditImageFileChange={setEditImageFile}
              maskFile={maskFile}
              onMaskFileChange={setMaskFile}
              variationImage={variationImage}
              onVariationImageChange={setVariationImage}
              fileInputRef={fileInputRef}
              maskInputRef={maskInputRef}
              variationInputRef={variationInputRef}
              isGenerating={isGenerating}
              error={sidebarError}
              canRetry={canRetry}
              onRetry={handleRetryCurrentOperation}
              onGenerate={handleGenerate}
              onEdit={handleEditImage}
              onCreateVariations={handleCreateVariations}
              showSettings={showSettings}
              onShowSettingsChange={setShowSettings}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          </>
        )}

        {/* Main Content */}
        <ResizablePanel defaultSize={showSidebar ? 75 : 100} className="min-w-0">
        <div className="flex-1 flex flex-col overflow-hidden h-full">
          {/* Generation Queue Status */}
          {generationQueue.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-1.5 border-b bg-muted/30 text-xs shrink-0">
              <span className="font-medium">{t('queue') ?? 'Queue'}:</span>
              {generationQueue.filter(j => j.status === 'generating').length > 0 && (
                <span className="text-primary animate-pulse">{generationQueue.filter(j => j.status === 'generating').length} generating</span>
              )}
              {generationQueue.filter(j => j.status === 'queued').length > 0 && (
                <span className="text-muted-foreground">{generationQueue.filter(j => j.status === 'queued').length} queued</span>
              )}
              <span className="text-green-600">{generationQueue.filter(j => j.status === 'completed').length} done</span>
              {generationQueue.filter(j => j.status === 'failed').map(j => (
                <span key={j.id} className="text-destructive cursor-pointer hover:line-through" onClick={() => removeFromQueue(j.id)}>✕ {j.prompt.substring(0, 20)}…</span>
              ))}
              <button onClick={clearQueue} className="ml-auto text-muted-foreground hover:text-foreground transition-colors">{t('clearAll') ?? 'Clear'}</button>
            </div>
          )}
          {viewMode === 'grid' || generatedImages.length === 0 ? (
            <ImageGalleryGrid
              images={displayedImages}
              selectedImageId={selectedImageId}
              zoomLevel={zoomLevel}
              onSelectImage={selectImage}
              onToggleFavorite={toggleFavorite}
              onPreview={setPreviewImage}
              onDownload={handleDownload}
              onDelete={deleteImage}
              onEditAction={handleEditAction}
              onApplyTemplate={setPrompt}
              isGenerating={isGenerating}
              generatingPrompt={prompt}
            />
          ) : selectedImage ? (
            <ImageDetailView
              image={selectedImage}
              previewZoom={previewZoom}
              previewPan={previewPan}
              onPreviewZoomChange={setPreviewZoom}
              onPreviewPanChange={setPreviewPan}
              onDownload={handleDownload}
              onRegenerate={handleRegenerate}
              layers={storeLayers as Layer[]}
              activeLayerId={storeActiveLayerId}
              onLayerSelect={setActiveLayer}
              onLayerUpdate={updateLayer}
              onLayerDelete={deleteLayer}
              onLayerDuplicate={(id) => {
                const layer = storeLayers.find((l) => l.id === id);
                if (layer) addLayer({ ...layer, name: `${layer.name} copy` });
              }}
              onLayerAdd={(type: LayerType) => {
                addLayer({ name: `New ${type} layer`, type, visible: true, locked: false, opacity: 100, blendMode: 'normal' });
              }}
              onLayerReorder={reorderLayers}
              showHistogram={showHistogram}
              onShowHistogramChange={setShowHistogram}
              histogramData={histogramData}
              isLoadingHistogram={advancedEditor.state.isLoading}
              batchProcessing={{
                isProcessing: batchProcessor.isProcessing,
                processedCount: batchProcessor.processedCount,
                errorCount: batchProcessor.errorCount,
                progress: batchProcessor.progress,
                onPause: batchProcessor.pauseJob,
                onCancel: batchProcessor.cancelJob,
              }}
              batchPresetsCount={batchPresets.length}
              allImages={generatedImages}
              onSelectImage={selectImage}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">Select an image to view details</p>
            </div>
          )}
        </div>
        </ResizablePanel>

        {/* Right Panel - History */}
        {showHistory && (
          <>
          <ResizableHandle />
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="min-w-0">
            <HistoryPanel
              entries={editHistory.map((entry, idx) => ({
                id: `${entry.imageId}-${idx}`,
                type: entry.type as HistoryOperationType,
                description: entry.description,
                timestamp: entry.timestamp,
                thumbnail: storeImages.find((img) => img.id === entry.imageId)?.url,
              }))}
              currentIndex={historyIndex}
              onNavigate={goToHistoryIndex}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onClear={clearHistory}
              canUndo={canUndo()}
              canRedo={canRedo()}
            />
          </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      <ImageStudioDialogs
        previewImage={previewImage}
        onPreviewClose={() => setPreviewImage(null)}
        previewZoom={previewZoom}
        previewPan={previewPan}
        onPreviewZoomChange={setPreviewZoom}
        onPreviewPanChange={(x, y) => setPreviewPan({ x, y })}
        showHistogram={showHistogram}
        histogramData={histogramData}
        advancedEditorImageData={advancedEditor.state.imageData}
        advancedEditorOriginalImageData={advancedEditor.state.originalImageData}
        editingImage={editingImage}
        editMode={editMode}
        onEditingClose={() => {
          discardEditDraft();
          endEditSession();
          setEditingImage(null);
          setEditMode(null);
          setMaskDataUrl(null);
        }}
        compareBeforeImage={compareBeforeImage}
        onCompareClose={() => { setEditingImage(null); setEditMode(null); setCompareBeforeImage(null); }}
        onEditorSave={handleEditorSave}
        onEditorModeChange={(mode) => {
          updateEditDraft({
            pendingOperation: mode === 'filters' ? 'filter' : mode,
            metadata: { sourceImageId: editingImage?.id ?? null },
          });
        }}
        maskDataUrl={maskDataUrl}
        onApplyInpainting={handleApplyInpainting}
        onMaskCancel={() => {
          discardEditDraft();
          setMaskDataUrl(null);
          setEditingImage(null);
          setEditMode(null);
          endEditSession();
        }}
        isGenerating={isGenerating}
        showExportDialog={showExportDialog}
        onExportDialogChange={setShowExportDialog}
        onExportStart={() => {
          clearOperationErrors();
          setLocalError(null);
          startOperation('export', { selectedImageId, sessionId: editSession.sessionId });
        }}
        onExportComplete={(count) => {
          finishOperation('export', { count });
          setRetryOperationKey(null);
        }}
        onExportError={(message) => {
          failOperation('export', message, {
            retryable: true,
            context: { selectedImageId, sessionId: editSession.sessionId },
          });
          setRetryOperationKey('export');
        }}
        allImages={generatedImages}
      />
    </div>
  );
}
