'use client';

/**
 * Image Studio Page - Dedicated image generation and editing interface
 * Features:
 * - Text to image generation (DALL-E 3, DALL-E 2)
 * - Image editing/inpainting
 * - Image variations
 * - Gallery with history
 * - Advanced settings
 * - Download and export
 */

import { useState, useCallback, useRef, useMemo } from 'react';
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
import {
  MaskCanvas,
  ImageCropper,
  ImageAdjustmentsPanel,
  ImageUpscaler,
  BackgroundRemover,
  BatchExportDialog,
} from '@/components/image-studio';
import { proxyFetch } from '@/lib/proxy-fetch';
import {
  generateImage,
  editImage,
  createImageVariation,
  downloadImageAsBlob,
  saveImageToFile,
  estimateImageCost,
  type ImageSize,
  type ImageQuality,
  type ImageStyle,
  type GeneratedImage,
} from '@/lib/ai';

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
  
  // State
  const [activeTab, setActiveTab] = useState<'generate' | 'edit' | 'variations'>('generate');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageWithMeta[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImageWithMeta | null>(null);
  const [showSettings, setShowSettings] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'single'>('grid');
  const [previewImage, setPreviewImage] = useState<GeneratedImageWithMeta | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(2); // Index into ZOOM_LEVELS (default M)
  const [showMoreTemplates, setShowMoreTemplates] = useState(false);

  // Advanced editing state
  const [editingImage, setEditingImage] = useState<GeneratedImageWithMeta | null>(null);
  const [editMode, setEditMode] = useState<'mask' | 'crop' | 'adjust' | 'upscale' | 'remove-bg' | null>(null);
  const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Image Studio Store integration
  const studioStore = useImageStudioStore();

  // Version history tracking
  const [versionHistory, setVersionHistory] = useState<Array<{
    id: string;
    imageId: string;
    prompt: string;
    timestamp: number;
    action: 'generate' | 'edit' | 'variation';
  }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Settings
  const [model, setModel] = useState<'dall-e-3' | 'dall-e-2'>('dall-e-3');
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

  // Generate images
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    
    if (!openaiApiKey) {
      setError(t('noApiKey'));
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateImage(openaiApiKey, {
        prompt: prompt.trim() + (negativePrompt ? ` Avoid: ${negativePrompt}` : ''),
        model,
        size,
        quality,
        style,
        n: model === 'dall-e-3' ? 1 : numberOfImages,
      });

      const newImages: GeneratedImageWithMeta[] = result.images.map((img, index) => ({
        ...img,
        id: `${Date.now()}-${index}`,
        prompt: prompt.trim(),
        model,
        timestamp: Date.now(),
        settings: { size, quality, style },
        version: 1,
      }));

      setGeneratedImages(prev => [...newImages, ...prev]);
      
      if (newImages.length > 0) {
        setSelectedImage(newImages[0]);
        addToVersionHistory(newImages[0].id, prompt.trim(), 'generate');
      }
    } catch (err) {
      console.error('Image generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, negativePrompt, model, size, quality, style, numberOfImages, openaiApiKey, t]);

  // Edit image (inpainting)
  const handleEditImage = useCallback(async () => {
    if (!editImageFile || !prompt.trim()) return;
    
    if (!openaiApiKey) {
      setError(t('noApiKey'));
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await editImage(openaiApiKey, {
        image: editImageFile,
        prompt: prompt.trim(),
        mask: maskFile || undefined,
        size: size as '256x256' | '512x512' | '1024x1024',
        n: numberOfImages,
      });

      const newImages: GeneratedImageWithMeta[] = result.images.map((img, index) => ({
        ...img,
        id: `edit-${Date.now()}-${index}`,
        prompt: prompt.trim(),
        model: 'dall-e-2',
        timestamp: Date.now(),
        settings: { size: size as ImageSize, quality, style },
      }));

      setGeneratedImages(prev => [...newImages, ...prev]);
      
      if (newImages.length > 0) {
        setSelectedImage(newImages[0]);
      }
    } catch (err) {
      console.error('Image edit error:', err);
      setError(err instanceof Error ? err.message : 'Failed to edit image');
    } finally {
      setIsGenerating(false);
    }
  }, [editImageFile, maskFile, prompt, size, numberOfImages, openaiApiKey, t, quality, style]);

  // Create variations
  const handleCreateVariations = useCallback(async () => {
    if (!variationImage) return;
    
    if (!openaiApiKey) {
      setError(t('noApiKey'));
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await createImageVariation(openaiApiKey, {
        image: variationImage,
        size: size as '256x256' | '512x512' | '1024x1024',
        n: numberOfImages,
      });

      const newImages: GeneratedImageWithMeta[] = result.images.map((img, index) => ({
        ...img,
        id: `var-${Date.now()}-${index}`,
        prompt: 'Variation',
        model: 'dall-e-2',
        timestamp: Date.now(),
        settings: { size: size as ImageSize, quality, style },
      }));

      setGeneratedImages(prev => [...newImages, ...prev]);
      
      if (newImages.length > 0) {
        setSelectedImage(newImages[0]);
      }
    } catch (err) {
      console.error('Variation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create variations');
    } finally {
      setIsGenerating(false);
    }
  }, [variationImage, size, numberOfImages, openaiApiKey, t, quality, style]);

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
    setGeneratedImages(prev => prev.filter(img => img.id !== imageId));
    if (selectedImage?.id === imageId) {
      setSelectedImage(null);
    }
  }, [selectedImage]);

  // Toggle favorite
  const handleToggleFavorite = useCallback((imageId: string) => {
    setGeneratedImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, isFavorite: !img.isFavorite } : img
    ));
  }, []);

  // Add to version history
  const addToVersionHistory = useCallback((imageId: string, prompt: string, action: 'generate' | 'edit' | 'variation') => {
    const entry = {
      id: `v-${Date.now()}`,
      imageId,
      prompt,
      timestamp: Date.now(),
      action,
    };
    setVersionHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(entry);
      return newHistory.slice(-50); // Keep last 50 entries
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // Undo - go to previous version
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevEntry = versionHistory[historyIndex - 1];
      const image = generatedImages.find(img => img.id === prevEntry.imageId);
      if (image) {
        setSelectedImage(image);
      }
      setHistoryIndex(historyIndex - 1);
    }
  }, [historyIndex, versionHistory, generatedImages]);

  // Redo - go to next version
  const handleRedo = useCallback(() => {
    if (historyIndex < versionHistory.length - 1) {
      const nextEntry = versionHistory[historyIndex + 1];
      const image = generatedImages.find(img => img.id === nextEntry.imageId);
      if (image) {
        setSelectedImage(image);
      }
      setHistoryIndex(historyIndex + 1);
    }
  }, [historyIndex, versionHistory, generatedImages]);

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
  const estimatedCost = estimateImageCost(model, size, quality, model === 'dall-e-3' ? 1 : numberOfImages);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-2 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <ImageIcon className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-medium text-sm">Image Studio</span>
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
                  disabled={historyIndex <= 0}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-l-none border-l"
                  onClick={handleRedo}
                  disabled={historyIndex >= versionHistory.length - 1}
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo</TooltipContent>
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
                Favorites
              </Button>
            </TooltipTrigger>
            <TooltipContent>{filterFavorites ? 'Show all' : 'Show favorites only'}</TooltipContent>
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
                Export
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export multiple images</TooltipContent>
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
              <span className="text-xs text-muted-foreground">Zoom</span>
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
            <TooltipContent>{showSidebar ? 'Hide sidebar' : 'Show sidebar'}</TooltipContent>
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

                    {/* Quality (DALL-E 3 only) */}
                    {model === 'dall-e-3' && (
                      <div className="space-y-2">
                        <Label className="text-xs">Quality</Label>
                        <Select value={quality} onValueChange={(v) => setQuality(v as ImageQuality)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="hd">HD (More Detail)</SelectItem>
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

                    {/* Number of images (DALL-E 2 only) */}
                    {model === 'dall-e-2' && (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label className="text-xs">Number of Images</Label>
                          <span className="text-xs text-muted-foreground">{numberOfImages}</span>
                        </div>
                        <Slider
                          value={[numberOfImages]}
                          onValueChange={([v]) => setNumberOfImages(v)}
                          min={1}
                          max={4}
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
                    onClick={() => setSelectedImage(image)}
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
              <div className="flex-1 p-4 flex items-center justify-center bg-muted/30">
                {selectedImage.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedImage.url}
                    alt={selectedImage.prompt}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                  />
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
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">Select an image to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="sr-only">Image Preview</DialogTitle>
          </DialogHeader>
          {previewImage?.url && (
            <div className="flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage.url}
                alt={previewImage.prompt}
                className="max-w-full max-h-[80vh] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Advanced Editing Dialog */}
      <Dialog open={!!editingImage && !!editMode} onOpenChange={() => { setEditingImage(null); setEditMode(null); }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              {editMode === 'mask' && <><Brush className="h-5 w-5" /> Draw Mask for Inpainting</>}
              {editMode === 'crop' && <><Crop className="h-5 w-5" /> Crop & Transform</>}
              {editMode === 'adjust' && <><SlidersHorizontal className="h-5 w-5" /> Adjust Image</>}
              {editMode === 'upscale' && <><ZoomIn className="h-5 w-5" /> Upscale Image</>}
              {editMode === 'remove-bg' && <><Eraser className="h-5 w-5" /> Remove Background</>}
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
            {editingImage?.url && editMode === 'mask' && (
              <MaskCanvas
                imageUrl={editingImage.url}
                onMaskChange={(base64) => setMaskDataUrl(base64)}
                className="w-full"
              />
            )}
            {editingImage?.url && editMode === 'crop' && (
              <ImageCropper
                imageUrl={editingImage.url}
                onApply={(result) => {
                  const newImage: GeneratedImageWithMeta = {
                    ...editingImage,
                    id: `crop-${Date.now()}`,
                    url: result.dataUrl,
                    timestamp: Date.now(),
                    parentId: editingImage.id,
                    version: (editingImage.version || 1) + 1,
                  };
                  setGeneratedImages(prev => [newImage, ...prev]);
                  setSelectedImage(newImage);
                  setEditingImage(null);
                  setEditMode(null);
                  studioStore.addToHistory({
                    type: 'crop',
                    imageId: newImage.id,
                    description: 'Cropped image',
                  });
                }}
                onCancel={() => { setEditingImage(null); setEditMode(null); }}
              />
            )}
            {editingImage?.url && editMode === 'adjust' && (
              <ImageAdjustmentsPanel
                imageUrl={editingImage.url}
                onApply={(dataUrl) => {
                  const newImage: GeneratedImageWithMeta = {
                    ...editingImage,
                    id: `adjust-${Date.now()}`,
                    url: dataUrl,
                    timestamp: Date.now(),
                    parentId: editingImage.id,
                    version: (editingImage.version || 1) + 1,
                  };
                  setGeneratedImages(prev => [newImage, ...prev]);
                  setSelectedImage(newImage);
                  setEditingImage(null);
                  setEditMode(null);
                }}
                onCancel={() => { setEditingImage(null); setEditMode(null); }}
              />
            )}
            {editingImage?.url && editMode === 'upscale' && (
              <ImageUpscaler
                imageUrl={editingImage.url}
                onUpscale={(result) => {
                  const newImage: GeneratedImageWithMeta = {
                    ...editingImage,
                    id: `upscale-${Date.now()}`,
                    url: result.dataUrl,
                    timestamp: Date.now(),
                    parentId: editingImage.id,
                    version: (editingImage.version || 1) + 1,
                  };
                  setGeneratedImages(prev => [newImage, ...prev]);
                  setSelectedImage(newImage);
                  setEditingImage(null);
                  setEditMode(null);
                }}
                onCancel={() => { setEditingImage(null); setEditMode(null); }}
              />
            )}
            {editingImage?.url && editMode === 'remove-bg' && (
              <BackgroundRemover
                imageUrl={editingImage.url}
                onRemove={(result) => {
                  const newImage: GeneratedImageWithMeta = {
                    ...editingImage,
                    id: `remove-bg-${Date.now()}`,
                    url: result.dataUrl,
                    timestamp: Date.now(),
                    parentId: editingImage.id,
                    version: (editingImage.version || 1) + 1,
                  };
                  setGeneratedImages(prev => [newImage, ...prev]);
                  setSelectedImage(newImage);
                  setEditingImage(null);
                  setEditMode(null);
                }}
                onCancel={() => { setEditingImage(null); setEditMode(null); }}
              />
            )}
          </div>
          {/* Mask mode has special Apply button for inpainting */}
          {editMode === 'mask' && maskDataUrl && (
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
                  setEditingImage(null);
                  setEditMode(null);
                  setIsGenerating(true);
                  try {
                    const imgResponse = await proxyFetch(editingImage.url);
                    const imgBlob = await imgResponse.blob();
                    const imgFile = new File([imgBlob], 'image.png', { type: 'image/png' });
                    
                    const maskBlob = await (await fetch(maskDataUrl)).blob();
                    const maskFile = new File([maskBlob], 'mask.png', { type: 'image/png' });
                    
                    const result = await editImage(openaiApiKey, {
                      image: imgFile,
                      mask: maskFile,
                      prompt: prompt || 'Continue the image naturally',
                      size: '1024x1024',
                    });
                    
                    const newImages: GeneratedImageWithMeta[] = result.images.map((img, index) => ({
                      ...img,
                      id: `inpaint-${Date.now()}-${index}`,
                      prompt: prompt || 'Inpainted',
                      model: 'dall-e-2',
                      timestamp: Date.now(),
                      settings: { size: '1024x1024' as ImageSize, quality, style },
                      parentId: editingImage.id,
                      version: (editingImage.version || 1) + 1,
                    }));
                    
                    setGeneratedImages(prev => [...newImages, ...prev]);
                    if (newImages.length > 0) setSelectedImage(newImages[0]);
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
