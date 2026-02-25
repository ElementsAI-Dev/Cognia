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
    deleteImage,
    selectImage,
    toggleFavorite,
    editHistory,
    historyIndex,
    addToHistory,
    clearHistory,
    undo: storeUndo,
    redo: storeRedo,
    canUndo,
    canRedo,
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

  // Generation state (transient, not persisted)
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // ─── External Hooks ────────────────────────────────────────────────
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const openaiApiKey = providerSettings.openai?.apiKey;

  // Get API key based on selected provider
  const getProviderApiKey = useCallback((): string | undefined => {
    const providerKeyMap: Record<string, string> = {
      openai: 'openai',
      xai: 'xai',
      together: 'together',
      fireworks: 'fireworks',
      deepinfra: 'deepinfra',
    };
    const settingsKey = providerKeyMap[provider] || provider;
    return providerSettings[settingsKey]?.apiKey;
  }, [provider, providerSettings]);

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
    const apiKey = getProviderApiKey();
    if (!prompt.trim() || !apiKey) {
      if (!apiKey) setError(t('noApiKey'));
      return;
    }
    setIsGenerating(true); setError(null);
    try {
      const n = model === 'dall-e-3' ? 1 : numberOfImages;
      const fullPrompt = prompt.trim() + (negativePrompt ? ` Avoid: ${negativePrompt}` : '');

      if (provider === 'openai') {
        // Use legacy OpenAI hook for backward compatibility
        const result = await imageGen.generate(fullPrompt, {
          model: model as 'dall-e-3' | 'dall-e-2' | 'gpt-image-1',
          size, quality, style, n,
        });
        if (!result?.length) { setError(imageGen.error || 'Failed to generate image'); return; }
        const ids: string[] = [];
        for (const img of result) {
          ids.push(addImage({ url: img.url, base64: img.base64, revisedPrompt: img.revisedPrompt, prompt: prompt.trim(), model, size, quality, style }));
        }
        if (ids.length > 0) {
          selectImage(ids[0]);
          addToHistory({ type: 'generate', imageId: ids[0], description: `Generated: ${prompt.trim().substring(0, 50)}...` });
        }
      } else {
        // Use SDK for non-OpenAI providers (xAI, Together, Fireworks, DeepInfra)
        const sdkResult = await generateImageWithSDK(
          { apiKey },
          { prompt: fullPrompt, provider, model, size: size as ImageSizeOption, quality: quality as ImageQualityOption, n, seed: seed ?? undefined }
        );
        if (!sdkResult.images.length) { setError('Failed to generate image'); return; }
        const ids: string[] = [];
        for (const img of sdkResult.images) {
          const base64DataUrl = `data:image/png;base64,${img.base64}`;
          ids.push(addImage({ url: base64DataUrl, base64: img.base64, revisedPrompt: img.revisedPrompt, prompt: prompt.trim(), model, size, quality, style }));
        }
        if (ids.length > 0) {
          selectImage(ids[0]);
          addToHistory({ type: 'generate', imageId: ids[0], description: `Generated: ${prompt.trim().substring(0, 50)}...` });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally { setIsGenerating(false); }
  }, [prompt, negativePrompt, provider, model, size, quality, style, numberOfImages, seed, getProviderApiKey, t, imageGen, addImage, selectImage, addToHistory]);

  const handleEditImage = useCallback(async () => {
    if (!editImageFile || !prompt.trim() || !openaiApiKey) {
      if (!openaiApiKey) setError(t('noApiKey'));
      return;
    }
    setIsGenerating(true); setError(null);
    try {
      const result = await imageGen.edit(editImageFile, prompt.trim(), maskFile || undefined, { size: size as '256x256' | '512x512' | '1024x1024', n: numberOfImages });
      if (!result?.length) { setError(imageGen.error || 'Failed to edit image'); return; }
      const ids: string[] = [];
      for (const img of result) {
        ids.push(addImage({ url: img.url, base64: img.base64, revisedPrompt: img.revisedPrompt, prompt: prompt.trim(), model: 'dall-e-2', size: size as ImageSize, quality, style }));
      }
      if (ids.length > 0) {
        selectImage(ids[0]);
        addToHistory({ type: 'edit', imageId: ids[0], description: `Edited: ${prompt.trim().substring(0, 50)}...` });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to edit image');
    } finally { setIsGenerating(false); }
  }, [editImageFile, maskFile, prompt, size, numberOfImages, openaiApiKey, t, quality, style, addImage, addToHistory, selectImage, imageGen]);

  const handleCreateVariations = useCallback(async () => {
    if (!variationImage || !openaiApiKey) {
      if (!openaiApiKey) setError(t('noApiKey'));
      return;
    }
    setIsGenerating(true); setError(null);
    try {
      const result = await imageGen.createVariations(variationImage, { size: size as '256x256' | '512x512' | '1024x1024', n: numberOfImages });
      if (!result?.length) { setError(imageGen.error || 'Failed to create variations'); return; }
      const ids: string[] = [];
      for (const img of result) {
        ids.push(addImage({ url: img.url, base64: img.base64, revisedPrompt: img.revisedPrompt, prompt: 'Variation', model: 'dall-e-2', size: size as ImageSize, quality, style }));
      }
      if (ids.length > 0) {
        selectImage(ids[0]);
        addToHistory({ type: 'variation', imageId: ids[0], description: 'Created variation' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create variations');
    } finally { setIsGenerating(false); }
  }, [variationImage, size, numberOfImages, openaiApiKey, t, quality, style, addImage, addToHistory, selectImage, imageGen]);

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
    onCancel: () => { if (editingImage) { setEditingImage(null); setEditMode(null); } },
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
        setEditingImage(image);
        setEditMode(action);
        break;
    }
  }, [handleUseForEdit, handleUseForVariation]);

  const handleEditorSave = useCallback((result: EditorSaveResult) => {
    if (!editingImage) return;
    if (result.mode === 'mask') { setMaskDataUrl(result.dataUrl); return; }
    const newImageId = addImage({
      url: result.dataUrl, prompt: editingImage.prompt, model: editingImage.model,
      size: editingImage.settings.size, quality: editingImage.settings.quality, style: editingImage.settings.style,
      parentId: editingImage.id,
    });
    selectImage(newImageId);
    setEditingImage(null); setEditMode(null);
    addToHistory({
      type: toHistoryOperationType(result.mode),
      imageId: newImageId,
      description: `Applied ${result.mode} edit`,
    });
  }, [editingImage, addImage, selectImage, addToHistory]);

  const handleApplyInpainting = useCallback(async () => {
    if (!editingImage?.url || !maskDataUrl || !openaiApiKey) return;
    const currentEditingImage = editingImage;
    setEditingImage(null); setEditMode(null); setIsGenerating(true);
    try {
      const imgBlob = await (await proxyFetch(currentEditingImage.url!)).blob();
      const imgFile = new File([imgBlob], 'image.png', { type: 'image/png' });
      const maskBlob = await (await fetch(maskDataUrl)).blob();
      const maskFileData = new File([maskBlob], 'mask.png', { type: 'image/png' });
      const result = await imageGen.edit(imgFile, prompt || 'Continue the image naturally', maskFileData, { size: '1024x1024' });
      if (!result?.length) { setError(imageGen.error || 'Inpainting failed'); return; }
      const ids: string[] = [];
      for (const img of result) {
        ids.push(addImage({
          url: img.url, base64: img.base64, revisedPrompt: img.revisedPrompt,
          prompt: prompt || 'Inpainted', model: 'dall-e-2', size: '1024x1024' as ImageSize, quality, style,
          parentId: currentEditingImage.id,
        }));
      }
      if (ids.length > 0) {
        selectImage(ids[0]);
        addToHistory({ type: 'mask', imageId: ids[0], description: 'Inpainted image' });
      }
      setMaskDataUrl(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Inpainting failed'); }
    finally { setIsGenerating(false); }
  }, [editingImage, maskDataUrl, openaiApiKey, prompt, quality, style, imageGen, addImage, selectImage, addToHistory]);

  const handleRegenerate = useCallback((image: GeneratedImageWithMeta) => {
    setPrompt(image.prompt);
    // Trigger generation after prompt is set
    setTimeout(() => handleGenerate(), 0);
  }, [handleGenerate, setPrompt]);

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
              error={error}
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
              onNavigate={(index) => {
                const targetEntry = editHistory[index];
                if (targetEntry) selectImage(targetEntry.imageId);
              }}
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
        onEditingClose={() => { setEditingImage(null); setEditMode(null); setMaskDataUrl(null); }}
        compareBeforeImage={compareBeforeImage}
        onCompareClose={() => { setEditingImage(null); setEditMode(null); setCompareBeforeImage(null); }}
        onEditorSave={handleEditorSave}
        maskDataUrl={maskDataUrl}
        onApplyInpainting={handleApplyInpainting}
        onMaskCancel={() => { setEditingImage(null); setEditMode(null); setMaskDataUrl(null); }}
        isGenerating={isGenerating}
        showExportDialog={showExportDialog}
        onExportDialogChange={setShowExportDialog}
        allImages={generatedImages}
      />
    </div>
  );
}
