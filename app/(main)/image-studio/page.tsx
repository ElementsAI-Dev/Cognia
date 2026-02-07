'use client';

/**
 * Image Studio Page - Dedicated image generation and editing interface
 * Features:
 * - Text to image generation (DALL-E 3, DALL-E 2, GPT Image 1)
 * - Image editing/inpainting
 * - Image variations
 * - Gallery with history
 * - Advanced settings & histogram
 * - Batch processing
 * - Download and export
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  Image as ImageIcon,
  Settings2,
  Download,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Upload,
  Loader2,
  Grid3X3,
  LayoutGrid,
  Maximize2,
  Brush,
  Layers,
  History,
  ChevronDown,
  ChevronUp,
  Undo2,
  Redo2,
  Clock,
  Star,
  StarOff,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeft,
  Crop,
  SlidersHorizontal,
  ZoomIn,
  Eraser,
  Wand2,
  Palette,
  Type,
  Pencil,
  Split,
  BarChart3,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useSettingsStore, useImageStudioStore } from '@/stores';
import type { StudioImage as _StudioImage, EditOperation as _EditOperation } from '@/stores/media/image-studio-store';
import {
  BatchExportDialog,
  HistoryPanel,
  ImageComparison,
  LayersPanel,
  ImageEditorPanel,
  ImagePreview,
} from '@/components/image-studio';
import type { HistoryOperationType, Layer, LayerType } from '@/components/image-studio';
import { useImageEditorShortcuts, useAdvancedImageEditor, useBatchProcessor } from '@/hooks/image-studio';
import { useImageGeneration } from '@/hooks/media';
import type { EditorMode } from '@/types/media/image-studio';
import { proxyFetch } from '@/lib/network/proxy-fetch';
import {
  downloadImageAsBlob,
  saveImageToFile,
  estimateImageCost,
  type ImageSize,
  type ImageQuality,
  type ImageStyle,
  type GeneratedImage,
} from '@/lib/ai';
import { useBatchEditStore } from '@/stores/media';

// Prompt templates for quick start - organized by category
const PROMPT_TEMPLATES = [
  // Nature & Landscape
  { label: 'Landscape', prompt: 'A beautiful mountain landscape at sunset with dramatic clouds and a lake reflection', category: 'nature' },
  { label: 'Nature', prompt: 'Macro photography of a dewdrop on a flower petal with morning light', category: 'nature' },
  { label: 'Ocean', prompt: 'Dramatic ocean waves crashing on rocky cliffs at golden hour', category: 'nature' },
  { label: 'Forest', prompt: 'Misty ancient forest with sunbeams filtering through tall trees', category: 'nature' },
  // People & Portrait
  { label: 'Portrait', prompt: 'A professional portrait photo with soft studio lighting and bokeh background', category: 'portrait' },
  { label: 'Fashion', prompt: 'High fashion editorial photography with dramatic lighting and elegant pose', category: 'portrait' },
  // Art & Design
  { label: 'Abstract', prompt: 'Abstract geometric art with vibrant colors and flowing shapes', category: 'art' },
  { label: 'Architecture', prompt: 'Modern minimalist architecture with clean lines and natural light', category: 'art' },
  { label: 'Interior', prompt: 'Cozy modern interior design with warm lighting and plants', category: 'art' },
  // Genre
  { label: 'Sci-Fi', prompt: 'Futuristic cyberpunk cityscape with neon lights and flying vehicles', category: 'genre' },
  { label: 'Fantasy', prompt: 'Magical enchanted forest with glowing mushrooms and fairy lights', category: 'genre' },
  { label: 'Steampunk', prompt: 'Victorian steampunk machinery with brass gears and steam pipes', category: 'genre' },
  // Commercial
  { label: 'Product', prompt: 'Professional product photography on white background with soft shadows', category: 'commercial' },
  { label: 'Food', prompt: 'Gourmet food photography with beautiful plating and natural lighting', category: 'commercial' },
  { label: 'Logo', prompt: 'Modern minimalist logo design on clean background', category: 'commercial' },
];

// Style presets with icons
const STYLE_PRESETS = [
  { label: 'Photo', value: 'photorealistic, high detail, 8k resolution, professional photography', short: '📷' },
  { label: 'Digital', value: 'digital art, vibrant colors, detailed illustration', short: '🎨' },
  { label: 'Oil', value: 'oil painting style, textured brushstrokes, artistic, masterpiece', short: '🖼️' },
  { label: 'Watercolor', value: 'watercolor painting, soft edges, flowing colors, artistic', short: '💧' },
  { label: 'Anime', value: 'anime style, manga art, detailed linework, studio ghibli', short: '🎌' },
  { label: 'Minimal', value: 'minimalist design, clean lines, simple shapes, modern', short: '◻️' },
  { label: '3D', value: '3D render, octane render, cinema 4d, realistic lighting, unreal engine', short: '🔮' },
  { label: 'Sketch', value: 'pencil sketch, hand drawn, artistic illustration, detailed', short: '✏️' },
  { label: 'Vintage', value: 'vintage photography, film grain, retro colors, nostalgic', short: '📜' },
  { label: 'Neon', value: 'neon lights, cyberpunk, glowing, dark background, vibrant', short: '💜' },
];

// Aspect ratio presets
const ASPECT_RATIOS = [
  { label: '1:1', size: '1024x1024' as ImageSize, icon: '⬜' },
  { label: '9:16', size: '1024x1792' as ImageSize, icon: '📱' },
  { label: '16:9', size: '1792x1024' as ImageSize, icon: '🖥️' },
];

// Zoom levels for grid
const ZOOM_LEVELS = [
  { label: 'XS', cols: 6, size: 80 },
  { label: 'S', cols: 5, size: 120 },
  { label: 'M', cols: 4, size: 160 },
  { label: 'L', cols: 3, size: 200 },
  { label: 'XL', cols: 2, size: 280 },
];

interface GeneratedImageWithMeta extends GeneratedImage {
  id: string;
  prompt: string;
  model: string;
  timestamp: number;
  settings: {
    size: ImageSize;
    quality: ImageQuality;
    style: ImageStyle;
  };
  isFavorite?: boolean;
  parentId?: string; // For version tracking
  version?: number;
}

export default function ImageStudioPage() {
  const t = useTranslations('imageGeneration');
  
  // Get store state and actions
  const {
    images: storeImages,
    selectedImageId,
    addImage,
    updateImage: _updateImage,
    deleteImage,
    selectImage,
    toggleFavorite,
    editHistory,
    historyIndex,
    addToHistory,
    undo: storeUndo,
    redo: storeRedo,
    canUndo,
    canRedo,
    prompt: storePrompt,
    negativePrompt: storeNegativePrompt,
    setPrompt: setStorePrompt,
    setNegativePrompt: setStoreNegativePrompt,
    generationSettings: _generationSettings,
    updateGenerationSettings: _updateGenerationSettings,
    activeTab: storeActiveTab,
    setActiveTab: _setStoreActiveTab,
    viewMode: storeViewMode,
    setViewMode: setStoreViewMode,
    showSidebar: storeShowSidebar,
    toggleSidebar: _toggleSidebar,
    filterFavorites: storeFilterFavorites,
    setFilterFavorites: setStoreFilterFavorites,
    gridZoomLevel,
    setGridZoomLevel,
    showSettings: storeShowSettings,
    toggleSettings: _toggleSettings,
    // Layers
    layers: storeLayers,
    activeLayerId: storeActiveLayerId,
    addLayer,
    updateLayer,
    deleteLayer,
    setActiveLayer,
    reorderLayers,
  } = useImageStudioStore();

  // Convert store images to component format for backwards compatibility
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
        settings: {
          size: img.size,
          quality: img.quality,
          style: img.style,
        },
        isFavorite: img.isFavorite,
        parentId: img.parentId,
        version: img.version,
      })),
    [storeImages]
  );

  const imagesById = useMemo(() => {
    const map = new Map<string, GeneratedImageWithMeta>();
    for (const img of generatedImages) {
      map.set(img.id, img);
    }
    return map;
  }, [generatedImages]);

  const selectedImage = useMemo(() => {
    if (!selectedImageId) return null;
    return imagesById.get(selectedImageId) ?? null;
  }, [imagesById, selectedImageId]);

  // Sync local prompt state for controlled input
  const [prompt, setPrompt] = useState(storePrompt);
  const [negativePrompt, setNegativePrompt] = useState(storeNegativePrompt);
  
  // State for UI
  const [activeTab, setActiveTab] = useState<'generate' | 'edit' | 'variations'>(
    storeActiveTab === 'generate' || storeActiveTab === 'edit' || storeActiveTab === 'variations' 
      ? storeActiveTab 
      : 'generate'
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(storeShowSettings);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'single'>(storeViewMode);
  const [previewImage, setPreviewImage] = useState<GeneratedImageWithMeta | null>(null);
  const [showSidebar, setShowSidebar] = useState(storeShowSidebar);
  const [filterFavorites, setFilterFavorites] = useState(storeFilterFavorites);
  const [zoomLevel, setZoomLevel] = useState(gridZoomLevel ?? 2); // Index into ZOOM_LEVELS (default M)
  const [showMoreTemplates, setShowMoreTemplates] = useState(false);

  // Sync with store when local state changes
  useEffect(() => {
    setStorePrompt(prompt);
  }, [prompt, setStorePrompt]);

  useEffect(() => {
    setStoreNegativePrompt(negativePrompt);
  }, [negativePrompt, setStoreNegativePrompt]);

  useEffect(() => {
    setStoreViewMode(viewMode);
  }, [viewMode, setStoreViewMode]);

  useEffect(() => {
    setStoreFilterFavorites(filterFavorites);
  }, [filterFavorites, setStoreFilterFavorites]);

  useEffect(() => {
    setGridZoomLevel(zoomLevel);
  }, [zoomLevel, setGridZoomLevel]);

  // Advanced editing state
  const [editingImage, setEditingImage] = useState<GeneratedImageWithMeta | null>(null);
  const [editMode, setEditMode] = useState<'mask' | 'crop' | 'adjust' | 'upscale' | 'remove-bg' | 'filter' | 'text' | 'draw' | 'compare' | null>(null);
  const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showLayersPanel, setShowLayersPanel] = useState(false);
  const [compareBeforeImage, setCompareBeforeImage] = useState<string | null>(null);
  
  // Image preview state
  const [showHistogram, setShowHistogram] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewPan, setPreviewPan] = useState({ x: 0, y: 0 });

  // Settings
  const [model, setModel] = useState<'dall-e-3' | 'dall-e-2' | 'gpt-image-1'>('dall-e-3');
  const [size, setSize] = useState<ImageSize>('1024x1024');
  const [quality, setQuality] = useState<ImageQuality>('standard');
  const [style, setStyle] = useState<ImageStyle>('vivid');
  const [numberOfImages, setNumberOfImages] = useState(1);

  // Edit mode state
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [maskFile, setMaskFile] = useState<File | null>(null);
  const [variationImage, setVariationImage] = useState<File | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maskInputRef = useRef<HTMLInputElement>(null);
  const variationInputRef = useRef<HTMLInputElement>(null);

  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const openaiApiKey = providerSettings.openai?.apiKey;

  // Integrate useImageGeneration hook for generation/edit/variations
  const imageGen = useImageGeneration({
    defaultSize: size,
    defaultQuality: quality,
    defaultStyle: style,
  });

  // Advanced image editor for histogram support
  const advancedEditor = useAdvancedImageEditor({
    useWorker: true,
    useWebGL: true,
  });

  // Batch processor for multi-image operations
  const batchProcessor = useBatchProcessor({
    onJobComplete: (jobId) => {
      console.log(`Batch job ${jobId} completed`);
    },
    onImageComplete: (_jobId, _imageId, outputPath) => {
      addImage({
        url: outputPath,
        prompt: 'Batch processed',
        model,
        size,
        quality,
        style,
      });
    },
    onImageError: (_jobId, imageId, error) => {
      console.error(`Batch image ${imageId} failed:`, error);
    },
  });

  // Batch edit store for presets and job management
  const { presets: batchPresets, createPreset: _createBatchPreset } = useBatchEditStore();

  // Histogram data from advanced editor
  const [histogramData, setHistogramData] = useState<{
    red: number[];
    green: number[];
    blue: number[];
    luminance: number[];
  } | null>(null);

  // Load histogram when selected image changes and histogram is visible
  useEffect(() => {
    if (!showHistogram || !selectedImage?.url) {
      setHistogramData(null);
      return;
    }
    const loadHistogram = async () => {
      try {
        await advancedEditor.loadImage(selectedImage.url!);
        const data = await advancedEditor.getHistogram();
        setHistogramData(data);
      } catch {
        setHistogramData(null);
      }
    };
    loadHistogram();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHistogram, selectedImage?.url]);

  // Generate images using useImageGeneration hook
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    
    if (!openaiApiKey) {
      setError(t('noApiKey'));
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const n = model === 'dall-e-3' ? 1 : numberOfImages;
      const result = await imageGen.generate(
        prompt.trim() + (negativePrompt ? ` Avoid: ${negativePrompt}` : ''),
        { model, size, quality, style, n }
      );

      if (!result || result.length === 0) {
        setError(imageGen.error || 'Failed to generate image');
        return;
      }

      // Add images to store
      const newImageIds: string[] = [];
      for (const img of result) {
        const id = addImage({
          url: img.url,
          base64: img.base64,
          revisedPrompt: img.revisedPrompt,
          prompt: prompt.trim(),
          model,
          size,
          quality,
          style,
        });
        newImageIds.push(id);
      }
      
      if (newImageIds.length > 0) {
        selectImage(newImageIds[0]);
        addToHistory({
          type: 'generate',
          imageId: newImageIds[0],
          description: `Generated: ${prompt.trim().substring(0, 50)}...`,
        });
      }
    } catch (err) {
      console.error('Image generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, negativePrompt, model, size, quality, style, numberOfImages, openaiApiKey, t, imageGen]);

  // Edit image (inpainting) using useImageGeneration hook
  const handleEditImage = useCallback(async () => {
    if (!editImageFile || !prompt.trim()) return;
    
    if (!openaiApiKey) {
      setError(t('noApiKey'));
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await imageGen.edit(
        editImageFile,
        prompt.trim(),
        maskFile || undefined,
        { size: size as '256x256' | '512x512' | '1024x1024', n: numberOfImages }
      );

      if (!result || result.length === 0) {
        setError(imageGen.error || 'Failed to edit image');
        return;
      }

      // Add edited images to store
      const newImageIds: string[] = [];
      for (const img of result) {
        const id = addImage({
          url: img.url,
          base64: img.base64,
          revisedPrompt: img.revisedPrompt,
          prompt: prompt.trim(),
          model: 'dall-e-2',
          size: size as ImageSize,
          quality,
          style,
        });
        newImageIds.push(id);
      }
      
      if (newImageIds.length > 0) {
        selectImage(newImageIds[0]);
        addToHistory({
          type: 'edit',
          imageId: newImageIds[0],
          description: `Edited: ${prompt.trim().substring(0, 50)}...`,
        });
      }
    } catch (err) {
      console.error('Image edit error:', err);
      setError(err instanceof Error ? err.message : 'Failed to edit image');
    } finally {
      setIsGenerating(false);
    }
  }, [editImageFile, maskFile, prompt, size, numberOfImages, openaiApiKey, t, quality, style, addImage, addToHistory, selectImage, imageGen]);

  // Create variations using useImageGeneration hook
  const handleCreateVariations = useCallback(async () => {
    if (!variationImage) return;
    
    if (!openaiApiKey) {
      setError(t('noApiKey'));
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await imageGen.createVariations(
        variationImage,
        { size: size as '256x256' | '512x512' | '1024x1024', n: numberOfImages }
      );

      if (!result || result.length === 0) {
        setError(imageGen.error || 'Failed to create variations');
        return;
      }

      // Add variation images to store
      const newImageIds: string[] = [];
      for (const img of result) {
        const id = addImage({
          url: img.url,
          base64: img.base64,
          revisedPrompt: img.revisedPrompt,
          prompt: 'Variation',
          model: 'dall-e-2',
          size: size as ImageSize,
          quality,
          style,
        });
        newImageIds.push(id);
      }
      
      if (newImageIds.length > 0) {
        selectImage(newImageIds[0]);
        addToHistory({
          type: 'variation',
          imageId: newImageIds[0],
          description: 'Created variation',
        });
      }
    } catch (err) {
      console.error('Variation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create variations');
    } finally {
      setIsGenerating(false);
    }
  }, [variationImage, size, numberOfImages, openaiApiKey, t, quality, style, addImage, addToHistory, selectImage, imageGen]);

  // Download image
  const handleDownload = useCallback(async (image: GeneratedImageWithMeta) => {
    try {
      if (!image.url) return;
      const blob = await downloadImageAsBlob(image.url);
      const filename = `image-${image.id}.png`;
      saveImageToFile(blob, filename);
    } catch (err) {
      console.error('Download error:', err);
    }
  }, []);

  // Copy prompt
  const handleCopyPrompt = useCallback(async (promptText: string) => {
    await navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // Delete image
  const handleDeleteImage = useCallback((imageId: string) => {
    deleteImage(imageId);
  }, [deleteImage]);

  // Toggle favorite
  const handleToggleFavorite = useCallback((imageId: string) => {
    toggleFavorite(imageId);
  }, [toggleFavorite]);

  // Undo - go to previous version (using store)
  const handleUndo = useCallback(() => {
    if (canUndo()) {
      storeUndo();
    }
  }, [canUndo, storeUndo]);

  // Redo - go to next version (using store)
  const handleRedo = useCallback(() => {
    if (canRedo()) {
      storeRedo();
    }
  }, [canRedo, storeRedo]);

  // Keyboard shortcuts - placed after handleUndo/handleRedo definitions
  useImageEditorShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    onDelete: () => {
      if (selectedImageId) {
        handleDeleteImage(selectedImageId);
      }
    },
    onZoomIn: () => setPreviewZoom(z => Math.min(10, z * 1.2)),
    onZoomOut: () => setPreviewZoom(z => Math.max(0.1, z / 1.2)),
    onZoomReset: () => {
      setPreviewZoom(1);
      setPreviewPan({ x: 0, y: 0 });
    },
    onCancel: () => {
      if (editingImage) {
        setEditingImage(null);
        setEditMode(null);
      }
    },
    enabled: true,
  });

  // Use selected image for editing
  const handleUseForEdit = useCallback(async (image: GeneratedImageWithMeta) => {
    if (!image.url) return;
    try {
      const response = await proxyFetch(image.url);
      const blob = await response.blob();
      const file = new File([blob], 'image.png', { type: 'image/png' });
      setEditImageFile(file);
      setActiveTab('edit');
      setPrompt('');
    } catch (err) {
      console.error('Failed to use image for edit:', err);
    }
  }, []);

  // Use selected image for variations
  const handleUseForVariation = useCallback(async (image: GeneratedImageWithMeta) => {
    if (!image.url) return;
    try {
      const response = await proxyFetch(image.url);
      const blob = await response.blob();
      const file = new File([blob], 'image.png', { type: 'image/png' });
      setVariationImage(file);
      setActiveTab('variations');
    } catch (err) {
      console.error('Failed to use image for variation:', err);
    }
  }, []);

  // Filtered images based on favorites
  const displayedImages = useMemo(() => {
    if (filterFavorites) {
      return generatedImages.filter(img => img.isFavorite);
    }
    return generatedImages;
  }, [generatedImages, filterFavorites]);

  // Format timestamp
  const formatTime = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  // Apply template
  const handleApplyTemplate = useCallback((templatePrompt: string) => {
    setPrompt(templatePrompt);
  }, []);

  // Apply style preset
  const handleApplyStyle = useCallback((styleValue: string) => {
    setPrompt(prev => prev ? `${prev}, ${styleValue}` : styleValue);
  }, []);

  // Calculate estimated cost
  const estimatedCost = estimateImageCost(
    model,
    size,
    quality,
    model === 'dall-e-3' ? 1 : numberOfImages
  );

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-2 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('back')}
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <ImageIcon className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-medium text-sm">{t('title')}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <div className="flex items-center border rounded-md">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-r-none"
                  onClick={handleUndo}
                  disabled={!canUndo()}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('undo')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-l-none border-l"
                  onClick={handleRedo}
                  disabled={!canRedo()}
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('redo')}</TooltipContent>
            </Tooltip>
          </div>

          {/* Favorites filter */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={filterFavorites ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setFilterFavorites(!filterFavorites)}
              >
                {filterFavorites ? <Star className="h-4 w-4 mr-2 fill-current" /> : <StarOff className="h-4 w-4 mr-2" />}
                {t('favorites')}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{filterFavorites ? t('showAll') : t('showFavoritesOnly')}</TooltipContent>
          </Tooltip>

          {/* History */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="h-4 w-4 mr-2" />
            {generatedImages.length}
          </Button>

          {/* Export */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportDialog(true)}
                disabled={generatedImages.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                {t('export')}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('exportMultiple')}</TooltipContent>
          </Tooltip>

          {/* View mode toggle */}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-r-none"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'single' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-l-none border-l"
              onClick={() => setViewMode('single')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>

          {/* Zoom control */}
          {viewMode === 'grid' && (
            <div className="flex items-center gap-2 border rounded-md px-2">
              <span className="text-xs text-muted-foreground">{t('zoom')}</span>
              <div className="flex items-center">
                {ZOOM_LEVELS.map((level, idx) => (
                  <Button
                    key={level.label}
                    variant={zoomLevel === idx ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-6 w-6 p-0 text-xs"
                    onClick={() => setZoomLevel(idx)}
                  >
                    {level.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Sidebar toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowSidebar(!showSidebar)}
              >
                {showSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{showSidebar ? t('hideSidebar') : t('showSidebar')}</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Settings */}
        <div className={cn(
          'border-r flex flex-col shrink-0 transition-all duration-300',
          showSidebar ? 'w-80' : 'w-0 overflow-hidden'
        )}>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b h-10 px-2">
              <TabsTrigger value="generate" className="text-xs">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Generate
              </TabsTrigger>
              <TabsTrigger value="edit" className="text-xs">
                <Brush className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </TabsTrigger>
              <TabsTrigger value="variations" className="text-xs">
                <Layers className="h-3.5 w-3.5 mr-1.5" />
                Variations
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Generate Tab */}
                <TabsContent value="generate" className="mt-0 space-y-3">
                  {/* Prompt */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Prompt</Label>
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe the image you want to create..."
                      className="min-h-[80px] resize-none text-sm"
                    />
                  </div>

                  {/* Aspect Ratio Quick Select */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Aspect Ratio</Label>
                    <div className="flex gap-1">
                      {ASPECT_RATIOS.map((ratio) => (
                        <Button
                          key={ratio.label}
                          variant={size === ratio.size ? 'secondary' : 'outline'}
                          size="sm"
                          className="flex-1 text-xs h-8"
                          onClick={() => setSize(ratio.size)}
                        >
                          <span className="mr-1">{ratio.icon}</span>
                          {ratio.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Templates - Collapsible */}
                  <Collapsible open={showMoreTemplates} onOpenChange={setShowMoreTemplates}>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Templates</Label>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-5 px-1 text-xs text-muted-foreground">
                            {showMoreTemplates ? 'Less' : 'More'}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {PROMPT_TEMPLATES.slice(0, 6).map((template) => (
                          <Badge
                            key={template.label}
                            variant="outline"
                            className="cursor-pointer hover:bg-muted text-xs py-0.5"
                            onClick={() => handleApplyTemplate(template.prompt)}
                          >
                            {template.label}
                          </Badge>
                        ))}
                      </div>
                      <CollapsibleContent className="pt-1">
                        <div className="flex flex-wrap gap-1">
                          {PROMPT_TEMPLATES.slice(6).map((template) => (
                            <Badge
                              key={template.label}
                              variant="outline"
                              className="cursor-pointer hover:bg-muted text-xs py-0.5"
                              onClick={() => handleApplyTemplate(template.prompt)}
                            >
                              {template.label}
                            </Badge>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>

                  {/* Style Presets - Compact Grid */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Style</Label>
                    <div className="grid grid-cols-5 gap-1">
                      {STYLE_PRESETS.map((preset) => (
                        <Tooltip key={preset.label}>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-full p-0 text-base"
                              onClick={() => handleApplyStyle(preset.value)}
                            >
                              {preset.short}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">{preset.label}</TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>

                  {/* Negative Prompt - More Compact */}
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between p-0 h-6">
                        <span className="text-xs font-medium">Negative Prompt</span>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-1.5">
                      <Textarea
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        placeholder="What to avoid..."
                        className="min-h-[50px] resize-none text-sm"
                      />
                    </CollapsibleContent>
                  </Collapsible>
                </TabsContent>

                {/* Edit Tab */}
                <TabsContent value="edit" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Upload Image</Label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/png"
                      className="hidden"
                      onChange={(e) => setEditImageFile(e.target.files?.[0] || null)}
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {editImageFile ? editImageFile.name : 'Select Image (PNG)'}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Mask (Optional)</Label>
                    <input
                      type="file"
                      ref={maskInputRef}
                      accept="image/png"
                      className="hidden"
                      onChange={(e) => setMaskFile(e.target.files?.[0] || null)}
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => maskInputRef.current?.click()}
                    >
                      <Brush className="h-4 w-4 mr-2" />
                      {maskFile ? maskFile.name : 'Select Mask (PNG)'}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Upload a mask where transparent areas will be edited
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Edit Prompt</Label>
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe what to add or change..."
                      className="min-h-[80px] resize-none text-sm"
                    />
                  </div>
                </TabsContent>

                {/* Variations Tab */}
                <TabsContent value="variations" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Source Image</Label>
                    <input
                      type="file"
                      ref={variationInputRef}
                      accept="image/png"
                      className="hidden"
                      onChange={(e) => setVariationImage(e.target.files?.[0] || null)}
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => variationInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {variationImage ? variationImage.name : 'Select Image (PNG)'}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Create variations of an existing image
                    </p>
                  </div>
                </TabsContent>

                {/* Settings - Common for all tabs */}
                <Collapsible open={showSettings} onOpenChange={setShowSettings}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Settings2 className="h-4 w-4" />
                        <span className="text-xs font-medium">Settings</span>
                      </span>
                      {showSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-2">
                    {/* Model */}
                    <div className="space-y-2">
                      <Label className="text-xs">Model</Label>
                      <Select value={model} onValueChange={(v) => setModel(v as typeof model)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-image-1">GPT Image 1 (Latest)</SelectItem>
                          <SelectItem value="dall-e-3">DALL-E 3 (Best Quality)</SelectItem>
                          <SelectItem value="dall-e-2">DALL-E 2 (Faster, Multiple)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Size */}
                    <div className="space-y-2">
                      <Label className="text-xs">Size</Label>
                      <Select value={size} onValueChange={(v) => setSize(v as ImageSize)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1024x1024">1024×1024 (Square)</SelectItem>
                          <SelectItem value="1024x1792">1024×1792 (Portrait)</SelectItem>
                          <SelectItem value="1792x1024">1792×1024 (Landscape)</SelectItem>
                          {model === 'dall-e-2' && (
                            <>
                              <SelectItem value="512x512">512×512</SelectItem>
                              <SelectItem value="256x256">256×256</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Quality (DALL-E 3 and GPT Image 1) */}
                    {(model === 'dall-e-3' || model === 'gpt-image-1') && (
                      <div className="space-y-2">
                        <Label className="text-xs">Quality</Label>
                        <Select value={quality} onValueChange={(v) => setQuality(v as ImageQuality)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {model === 'dall-e-3' ? (
                              <>
                                <SelectItem value="standard">Standard</SelectItem>
                                <SelectItem value="hd">HD (More Detail)</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="low">Low (Fastest)</SelectItem>
                                <SelectItem value="medium">Medium (Balanced)</SelectItem>
                                <SelectItem value="high">High (Best Detail)</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Style (DALL-E 3 only) */}
                    {model === 'dall-e-3' && (
                      <div className="space-y-2">
                        <Label className="text-xs">Style</Label>
                        <Select value={style} onValueChange={(v) => setStyle(v as ImageStyle)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vivid">Vivid (Dramatic)</SelectItem>
                            <SelectItem value="natural">Natural (Realistic)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Number of images (DALL-E 2 and GPT Image 1) */}
                    {model !== 'dall-e-3' && (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label className="text-xs">Number of Images</Label>
                          <span className="text-xs text-muted-foreground">{numberOfImages}</span>
                        </div>
                        <Slider
                          value={[numberOfImages]}
                          onValueChange={([v]) => setNumberOfImages(v)}
                          min={1}
                          max={model === 'gpt-image-1' ? 4 : 10}
                          step={1}
                        />
                      </div>
                    )}

                    {/* Cost estimate */}
                    <div className="pt-2 border-t">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Estimated cost:</span>
                        <span className="font-medium">${estimatedCost.toFixed(3)}</span>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Error */}
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                  </Alert>
                )}

                {/* Generate Button */}
                <Button
                  className="w-full"
                  onClick={activeTab === 'generate' ? handleGenerate : activeTab === 'edit' ? handleEditImage : handleCreateVariations}
                  disabled={isGenerating || (activeTab === 'generate' && !prompt.trim()) || (activeTab === 'edit' && (!editImageFile || !prompt.trim())) || (activeTab === 'variations' && !variationImage)}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {activeTab === 'generate' ? 'Generate Image' : activeTab === 'edit' ? 'Edit Image' : 'Create Variations'}
                    </>
                  )}
                </Button>
              </div>
            </ScrollArea>
          </Tabs>
        </div>

        {/* Main Content - Image Display */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {generatedImages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4 max-w-md px-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium">No images yet</h3>
                <p className="text-sm text-muted-foreground">
                  Enter a prompt and click Generate to create your first image
                </p>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <ScrollArea className="flex-1">
              <div 
                className="p-4 grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(${ZOOM_LEVELS[zoomLevel].cols}, minmax(0, 1fr))`,
                }}
              >
                {displayedImages.map((image) => (
                  <Card
                    key={image.id}
                    className={cn(
                      'group cursor-pointer overflow-hidden transition-all hover:shadow-lg',
                      selectedImage?.id === image.id && 'ring-2 ring-primary'
                    )}
                    onClick={() => selectImage(image.id)}
                  >
                    <div className="aspect-square relative">
                      {image.url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={image.url}
                          alt={image.prompt}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {/* Favorite badge */}
                      {image.isFavorite && (
                        <div className="absolute top-2 right-2">
                          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        </div>
                      )}
                      {/* Timestamp */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-white flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(image.timestamp)}
                        </span>
                      </div>
                      {/* Action overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFavorite(image.id);
                              }}
                            >
                              {image.isFavorite ? <Star className="h-4 w-4 fill-current text-yellow-400" /> : <StarOff className="h-4 w-4" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{image.isFavorite ? 'Remove from favorites' : 'Add to favorites'}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewImage(image);
                              }}
                            >
                              <Maximize2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Preview</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(image);
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Download</TooltipContent>
                        </Tooltip>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-8 w-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleUseForEdit(image)}>
                              <Brush className="h-4 w-4 mr-2" />
                              Inpaint (Upload Mask)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setEditingImage(image); setEditMode('mask'); }}>
                              <Wand2 className="h-4 w-4 mr-2" />
                              Draw Mask & Inpaint
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUseForVariation(image)}>
                              <Layers className="h-4 w-4 mr-2" />
                              Create variations
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { setEditingImage(image); setEditMode('crop'); }}>
                              <Crop className="h-4 w-4 mr-2" />
                              Crop & Transform
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setEditingImage(image); setEditMode('adjust'); }}>
                              <SlidersHorizontal className="h-4 w-4 mr-2" />
                              Adjust Colors
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setEditingImage(image); setEditMode('upscale'); }}>
                              <ZoomIn className="h-4 w-4 mr-2" />
                              Upscale
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setEditingImage(image); setEditMode('remove-bg'); }}>
                              <Eraser className="h-4 w-4 mr-2" />
                              Remove Background
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setEditingImage(image); setEditMode('filter'); }}>
                              <Palette className="h-4 w-4 mr-2" />
                              Apply Filter
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setEditingImage(image); setEditMode('text'); }}>
                              <Type className="h-4 w-4 mr-2" />
                              Add Text/Watermark
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setEditingImage(image); setEditMode('draw'); }}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Draw & Annotate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { 
                              setCompareBeforeImage(image.url || null);
                              setEditingImage(image);
                              setEditMode('compare');
                            }}>
                              <Split className="h-4 w-4 mr-2" />
                              Compare Images
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDeleteImage(image.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <CardContent className="p-2">
                      <p className="text-xs text-muted-foreground truncate">
                        {image.prompt}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : selectedImage ? (
            <div className="flex-1 flex">
              <div className="flex-1 p-4 flex flex-col bg-muted/30">
                {selectedImage.url ? (
                  <div className="flex-1 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedImage.url}
                      alt={selectedImage.prompt}
                      className="absolute inset-0 m-auto max-w-full max-h-full object-contain rounded-lg shadow-lg"
                      style={{
                        transform: `scale(${previewZoom}) translate(${previewPan.x}px, ${previewPan.y}px)`,
                        transition: 'transform 0.1s ease-out',
                      }}
                    />
                    {/* Zoom controls */}
                    <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-black/50 rounded-lg px-2 py-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-white hover:bg-white/20"
                        onClick={() => setPreviewZoom(z => Math.max(0.1, z / 1.2))}
                      >
                        <span className="text-sm">−</span>
                      </Button>
                      <span className="text-white text-xs w-12 text-center">
                        {Math.round(previewZoom * 100)}%
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-white hover:bg-white/20"
                        onClick={() => setPreviewZoom(z => Math.min(10, z * 1.2))}
                      >
                        <span className="text-sm">+</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-white hover:bg-white/20"
                        onClick={() => {
                          setPreviewZoom(1);
                          setPreviewPan({ x: 0, y: 0 });
                        }}
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-muted-foreground">No image to display</p>
                  </div>
                )}
              </div>
              <div className="w-64 border-l p-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Prompt</Label>
                  <div className="flex gap-2">
                    <p className="text-sm text-muted-foreground flex-1">
                      {selectedImage.prompt}
                    </p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 shrink-0"
                      onClick={() => handleCopyPrompt(selectedImage.prompt)}
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                {selectedImage.revisedPrompt && selectedImage.revisedPrompt !== selectedImage.prompt && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Revised Prompt</Label>
                    <p className="text-xs text-muted-foreground">
                      {selectedImage.revisedPrompt}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Details</Label>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Model:</span>
                      <span>{selectedImage.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Size:</span>
                      <span>{selectedImage.settings.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quality:</span>
                      <span>{selectedImage.settings.quality}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Style:</span>
                      <span>{selectedImage.settings.style}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDownload(selectedImage)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setPrompt(selectedImage.prompt);
                      handleGenerate();
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate
                  </Button>
                </div>

                {/* Layers Panel Toggle */}
                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowLayersPanel(!showLayersPanel)}
                  >
                    <Layers className="h-4 w-4 mr-2" />
                    {showLayersPanel ? 'Hide Layers' : 'Show Layers'}
                  </Button>
                </div>

                {/* Layers Panel */}
                {showLayersPanel && (
                  <LayersPanel
                    layers={storeLayers as Layer[]}
                    activeLayerId={storeActiveLayerId}
                    onLayerSelect={setActiveLayer}
                    onLayerUpdate={updateLayer}
                    onLayerDelete={deleteLayer}
                    onLayerDuplicate={(id) => {
                      const layer = storeLayers.find(l => l.id === id);
                      if (layer) {
                        addLayer({
                          ...layer,
                          name: `${layer.name} copy`,
                        });
                      }
                    }}
                    onLayerAdd={(type: LayerType) => {
                      addLayer({
                        name: `New ${type} layer`,
                        type: type,
                        visible: true,
                        locked: false,
                        opacity: 100,
                        blendMode: 'normal',
                      });
                    }}
                    onLayerReorder={reorderLayers}
                    className="mt-2"
                  />
                )}

                {/* Histogram Toggle & Display */}
                <div className="pt-2 space-y-2">
                  <Button
                    variant={showHistogram ? 'secondary' : 'outline'}
                    size="sm"
                    className="w-full"
                    onClick={() => setShowHistogram(!showHistogram)}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    {showHistogram ? 'Hide Histogram' : 'Show Histogram'}
                  </Button>
                  {showHistogram && histogramData && (
                    <div className="bg-black/80 rounded-lg p-2">
                      <svg viewBox="0 0 256 100" className="w-full h-20" preserveAspectRatio="none">
                        {/* Luminance */}
                        <polyline
                          points={histogramData.luminance.map((v, i) => `${i},${100 - (v / Math.max(...histogramData.luminance)) * 100}`).join(' ')}
                          fill="none"
                          stroke="white"
                          strokeWidth="0.5"
                          opacity="0.6"
                        />
                        {/* Red */}
                        <polyline
                          points={histogramData.red.map((v, i) => `${i},${100 - (v / Math.max(...histogramData.red)) * 100}`).join(' ')}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="0.5"
                          opacity="0.5"
                        />
                        {/* Green */}
                        <polyline
                          points={histogramData.green.map((v, i) => `${i},${100 - (v / Math.max(...histogramData.green)) * 100}`).join(' ')}
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth="0.5"
                          opacity="0.5"
                        />
                        {/* Blue */}
                        <polyline
                          points={histogramData.blue.map((v, i) => `${i},${100 - (v / Math.max(...histogramData.blue)) * 100}`).join(' ')}
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="0.5"
                          opacity="0.5"
                        />
                      </svg>
                      <div className="flex justify-between text-[10px] text-white/50 mt-1">
                        <span>Shadows</span>
                        <span>Midtones</span>
                        <span>Highlights</span>
                      </div>
                    </div>
                  )}
                  {showHistogram && !histogramData && advancedEditor.state.isLoading && (
                    <div className="flex items-center justify-center h-20 bg-muted rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Batch Processing Status */}
                {batchProcessor.isProcessing && (
                  <div className="pt-2 border-t space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">Batch Processing</span>
                      <Badge variant="outline" className="text-[10px]">
                        {batchProcessor.processedCount} / {batchProcessor.processedCount + batchProcessor.errorCount}
                      </Badge>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-primary rounded-full h-1.5 transition-all"
                        style={{ width: `${batchProcessor.progress}%` }}
                      />
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-6 text-[10px] flex-1" onClick={batchProcessor.pauseJob}>
                        Pause
                      </Button>
                      <Button size="sm" variant="destructive" className="h-6 text-[10px] flex-1" onClick={batchProcessor.cancelJob}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Batch Presets Info */}
                {batchPresets.length > 0 && !batchProcessor.isProcessing && (
                  <div className="pt-2 border-t">
                    <p className="text-[10px] text-muted-foreground">
                      {batchPresets.length} batch preset(s) available
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">Select an image to view details</p>
            </div>
          )}
        </div>

        {/* Right Panel - History */}
        <div className={cn(
          'border-l flex flex-col shrink-0 transition-all duration-300',
          showHistory ? 'w-72' : 'w-0 overflow-hidden'
        )}>
          {showHistory && (
            <HistoryPanel
              entries={editHistory.map((entry, idx) => ({
                id: `${entry.imageId}-${idx}`,
                type: entry.type as HistoryOperationType,
                description: entry.description,
                timestamp: entry.timestamp,
                thumbnail: storeImages.find(img => img.id === entry.imageId)?.url,
              }))}
              currentIndex={historyIndex}
              onNavigate={(index) => {
                // Navigate to specific history point
                const targetEntry = editHistory[index];
                if (targetEntry) {
                  selectImage(targetEntry.imageId);
                }
              }}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onClear={() => {
                // Clear history is handled by store reset
                // For now, we don't expose this functionality
              }}
              canUndo={canUndo()}
              canRedo={canRedo()}
            />
          )}
        </div>
      </div>

      {/* Preview Dialog - Enhanced with ImagePreview when comparison data available */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {previewImage?.url && advancedEditor.state.imageData ? (
            <div className="h-[85vh] p-4">
              <ImagePreview
                originalImage={advancedEditor.state.originalImageData}
                editedImage={advancedEditor.state.imageData}
                zoom={previewZoom}
                panX={previewPan.x}
                panY={previewPan.y}
                showHistogram={showHistogram}
                histogram={histogramData}
                onZoomChange={setPreviewZoom}
                onPanChange={(x, y) => setPreviewPan({ x, y })}
                className="h-full"
              />
            </div>
          ) : previewImage?.url ? (
            <div className="flex items-center justify-center p-4 max-h-[85vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage.url}
                alt={previewImage.prompt}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Advanced Editing Dialog - Uses unified ImageEditorPanel */}
      <Dialog open={!!editingImage && !!editMode} onOpenChange={() => { setEditingImage(null); setEditMode(null); setMaskDataUrl(null); }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
          {editMode === 'compare' ? (
            <>
              <DialogHeader className="p-4 border-b">
                <DialogTitle className="flex items-center gap-2">
                  <Split className="h-5 w-5" /> Compare Images
                </DialogTitle>
              </DialogHeader>
              <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
                {editingImage?.url && compareBeforeImage && (
                  <div className="flex flex-col gap-4">
                    <ImageComparison
                      beforeImage={compareBeforeImage}
                      afterImage={editingImage.url}
                      beforeLabel="Before"
                      afterLabel="After"
                      initialMode="slider-h"
                    />
                    <div className="flex justify-end">
                      <Button variant="outline" onClick={() => { setEditingImage(null); setEditMode(null); setCompareBeforeImage(null); }}>
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : editingImage?.url ? (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>Image Editor</DialogTitle>
              </DialogHeader>
              <div className="h-[85vh]">
                <ImageEditorPanel
                  imageUrl={editingImage.url}
                  initialMode={editMode === 'filter' ? 'filters' : (editMode as EditorMode) || 'crop'}
                  onSave={(result) => {
                    if (!editingImage) return;
                    // For mask mode, just save the mask data URL for inpainting
                    if (result.mode === 'mask') {
                      setMaskDataUrl(result.dataUrl);
                      return;
                    }
                    // For all other modes, create new image in gallery
                    const newImageId = addImage({
                      url: result.dataUrl,
                      prompt: editingImage.prompt,
                      model: editingImage.model,
                      size: editingImage.settings.size,
                      quality: editingImage.settings.quality,
                      style: editingImage.settings.style,
                      parentId: editingImage.id,
                    });
                    selectImage(newImageId);
                    setEditingImage(null);
                    setEditMode(null);
                    addToHistory({
                      type: result.mode as _EditOperation['type'],
                      imageId: newImageId,
                      description: `Applied ${result.mode} edit`,
                    });
                  }}
                  onCancel={() => { setEditingImage(null); setEditMode(null); setMaskDataUrl(null); }}
                  className="h-full"
                />
              </div>
              {/* Mask mode has special Apply button for inpainting */}
              {maskDataUrl && (
                <div className="p-4 border-t flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Mask ready. Use this mask to regenerate the marked areas.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setEditingImage(null); setEditMode(null); setMaskDataUrl(null); }}>
                      Cancel
                    </Button>
                    <Button onClick={async () => {
                      if (!editingImage?.url || !maskDataUrl || !openaiApiKey) return;
                      const currentEditingImage = editingImage;
                      setEditingImage(null);
                      setEditMode(null);
                      setIsGenerating(true);
                      try {
                        const imgResponse = await proxyFetch(currentEditingImage.url!);
                        const imgBlob = await imgResponse.blob();
                        const imgFile = new File([imgBlob], 'image.png', { type: 'image/png' });
                        
                        const maskBlob = await (await fetch(maskDataUrl)).blob();
                        const maskFileData = new File([maskBlob], 'mask.png', { type: 'image/png' });
                        
                        // Use imageGen hook for inpainting instead of direct API call
                        const result = await imageGen.edit(
                          imgFile,
                          prompt || 'Continue the image naturally',
                          maskFileData,
                          { size: '1024x1024' }
                        );
                        
                        if (!result || result.length === 0) {
                          setError(imageGen.error || 'Inpainting failed');
                          return;
                        }
                        
                        // Add inpainted images to store
                        const newImageIds: string[] = [];
                        for (const img of result) {
                          const id = addImage({
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
                          newImageIds.push(id);
                        }
                        
                        if (newImageIds.length > 0) {
                          selectImage(newImageIds[0]);
                          addToHistory({
                            type: 'mask',
                            imageId: newImageIds[0],
                            description: 'Inpainted image',
                          });
                        }
                        setMaskDataUrl(null);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Inpainting failed');
                      } finally {
                        setIsGenerating(false);
                      }
                    }}>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Apply Inpainting
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Batch Export Dialog */}
      <BatchExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        images={generatedImages.map(img => ({
          id: img.id,
          url: img.url,
          base64: img.base64,
          prompt: img.prompt,
          timestamp: img.timestamp,
        }))}
        onExport={(count) => {
          console.log(`Exported ${count} images`);
        }}
      />
    </div>
  );
}
