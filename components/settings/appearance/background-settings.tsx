'use client';

/**
 * BackgroundSettings - Configure window background image and effects
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTranslations } from 'next-intl';
import { useBackgroundEditor } from '@/hooks/settings/use-background-editor';
import {
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  Palette,
  X,
  RefreshCw,
  Check,
  Sliders,
  Eye,
  EyeOff,
  Sun,
  Droplets,
  Sparkles,
  Plus,
  Trash2,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useSettingsStore } from '@/stores';
import {
  BACKGROUND_PRESETS,
  BACKGROUND_FIT_OPTIONS,
  BACKGROUND_POSITION_OPTIONS,
  BACKGROUND_LIMITS,
  sanitizeBackgroundUrl,
} from '@/lib/themes';
import { getBackgroundImageAssetBlob, saveBackgroundImageAsset } from '@/lib/themes/background-assets';
import { cn } from '@/lib/utils';
import { isTauri } from '@/lib/native/utils';
import { BackgroundImportExport } from './background-import-export';

export function BackgroundSettings() {
  const t = useTranslations('backgroundSettings');
  
  // Use custom hook for editor logic - eliminates 20+ editorMode checks
  const {
    isSingleMode,
    items,
    activeItemIndex,
    setActiveItemIndex,
    effectiveSettings,
    updateSelectedItem,
    updateFit,
    updatePosition,
    updateOpacity,
    updateBlur,
    updateBrightness,
    updateSaturation,
    updateContrast,
    updateGrayscale,
    updateAttachment,
    updateAnimation,
    updateAnimationSpeed,
    updateOverlayColor,
    updateOverlayOpacity,
    addItem,
    removeItem,
    backgroundSettings,
    setBackgroundSettings,
  } = useBackgroundEditor();

  // Additional store subscriptions for actions not in hook
  const {
    setBackgroundEnabled,
    setBackgroundPreset,
    setBackgroundLocalFile,
    clearBackground,
  } = useSettingsStore(
    useShallow((state) => ({
      setBackgroundEnabled: state.setBackgroundEnabled,
      setBackgroundPreset: state.setBackgroundPreset,
      setBackgroundLocalFile: state.setBackgroundLocalFile,
      clearBackground: state.clearBackground,
    }))
  );

  const [urlInput, setUrlInput] = useState(effectiveSettings.imageUrl || '');
  const [localPreviewMap, setLocalPreviewMap] = useState<Record<string, string>>({});
  const localPreviewMapRef = useRef<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [presetCategory, setPresetCategory] = useState<'all' | 'gradient' | 'mesh' | 'abstract'>('all');
  
  // Loading and error states for file operations
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const derivedTab = useMemo(() => {
    if (effectiveSettings.source === 'url') return 'url';
    if (effectiveSettings.source === 'local') return 'file';
    return 'presets';
  }, [effectiveSettings.source]);

  const [activeTab, setActiveTab] = useState(derivedTab);

  useEffect(() => {
    setActiveTab(derivedTab);
  }, [derivedTab]);

  useEffect(() => {
    if (effectiveSettings.source === 'url') {
      setUrlInput(effectiveSettings.imageUrl || '');
    }
  }, [effectiveSettings.imageUrl, effectiveSettings.source]);

  useEffect(() => {
    localPreviewMapRef.current = localPreviewMap;
  }, [localPreviewMap]);

  // Restore web-local preview from IndexedDB
  useEffect(() => {
    const controller = new AbortController();

    const resolve = async () => {
      if (typeof window === 'undefined') return;
      if (isTauri()) return;

      const requiredAssetIds = new Set<string>();
      if (backgroundSettings.enabled && effectiveSettings.source === 'local' && effectiveSettings.localAssetId) {
        requiredAssetIds.add(effectiveSettings.localAssetId);
      }

      const existing = localPreviewMapRef.current;
      const additions: Record<string, string> = {};

      for (const assetId of requiredAssetIds) {
        if (existing[assetId]) continue;
        const blob = await getBackgroundImageAssetBlob(assetId);
        if (!blob || controller.signal.aborted) continue;
        additions[assetId] = URL.createObjectURL(blob);
      }

      if (controller.signal.aborted) return;

      setLocalPreviewMap((prev) => {
        const nextMap: Record<string, string> = {};
        for (const assetId of requiredAssetIds) {
          const url = prev[assetId] ?? additions[assetId];
          if (url) nextMap[assetId] = url;
        }

        for (const [assetId, url] of Object.entries(prev)) {
          if (!requiredAssetIds.has(assetId)) {
            URL.revokeObjectURL(url);
          }
        }

        const prevKeys = Object.keys(prev).sort();
        const nextKeys = Object.keys(nextMap).sort();
        const unchanged =
          prevKeys.length === nextKeys.length &&
          prevKeys.every((key, index) => key === nextKeys[index] && prev[key] === nextMap[key]);

        if (unchanged) return prev;
        return nextMap;
      });
    };

    void resolve();

    return () => {
      controller.abort();
    };
  }, [backgroundSettings.enabled, effectiveSettings.localAssetId, effectiveSettings.source]);

  useEffect(() => {
    return () => {
      for (const url of Object.values(localPreviewMapRef.current)) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  // Validate image URL by attempting to load it
  const validateImageUrl = useCallback((url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      // Skip validation for gradient strings
      if (url.startsWith('linear-gradient') || url.startsWith('radial-gradient')) {
        resolve(true);
        return;
      }
      
      const img = new Image();
      const timeoutId = setTimeout(() => {
        img.src = ''; // Cancel loading
        resolve(false);
      }, BACKGROUND_LIMITS.urlValidationTimeout);
      
      img.onload = () => {
        clearTimeout(timeoutId);
        resolve(true);
      };
      img.onerror = () => {
        clearTimeout(timeoutId);
        resolve(false);
      };
      img.src = url;
    });
  }, []);

  const handleUrlSubmit = useCallback(async () => {
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) return;
    
    setUrlError(null);
    setIsValidatingUrl(true);
    
    try {
      const isGradientInput =
        trimmedUrl.startsWith('linear-gradient') || trimmedUrl.startsWith('radial-gradient');
      const sanitized = isGradientInput ? { valid: true, normalized: trimmedUrl } : sanitizeBackgroundUrl(trimmedUrl);
      if (!sanitized.valid || !sanitized.normalized) {
        setUrlError(sanitized.reason || t('invalidImageUrl') || 'Invalid image URL');
        return;
      }

      const isValid = await validateImageUrl(sanitized.normalized);
      
      if (!isValid) {
        setUrlError(t('invalidImageUrl') || 'Invalid image URL or failed to load');
        return;
      }
      
      if (isSingleMode) {
        setBackgroundSettings({
          enabled: true,
          source: 'url',
          imageUrl: sanitized.normalized,
          presetId: null,
          localAssetId: null,
        });
      } else {
        updateSelectedItem({
          enabled: true,
          source: 'url',
          imageUrl: sanitized.normalized,
          presetId: null,
          localAssetId: null,
        });
      }
    } catch (error) {
      console.error('URL validation error:', error);
      setUrlError(t('invalidImageUrl') || 'Failed to validate URL');
    } finally {
      setIsValidatingUrl(false);
    }
  }, [isSingleMode, setBackgroundSettings, t, updateSelectedItem, urlInput, validateImageUrl]);

  const handlePresetSelect = useCallback((presetId: string) => {
    if (isSingleMode) {
      setBackgroundPreset(presetId);
      setBackgroundSettings({ enabled: true, source: 'preset' });
      return;
    }
    updateSelectedItem({ enabled: true, source: 'preset', presetId, imageUrl: '', localAssetId: null });
  }, [isSingleMode, setBackgroundPreset, setBackgroundSettings, updateSelectedItem]);

  const handleClearBackground = useCallback(() => {
    void clearBackground();
    setUrlInput('');
  }, [clearBackground]);

  const handleFileSelect = useCallback(async () => {
    setUploadError(null);
    setIsUploading(true);
    
    // Check if we're in Tauri environment
    if (isTauri()) {
      try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const result = await open({
          multiple: false,
          filters: [
            { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] },
          ],
        });
        if (result) {
          // Convert path to asset URL for Tauri
          const { convertFileSrc } = await import('@tauri-apps/api/core');
          const assetUrl = convertFileSrc(result as string);
          setUrlInput(assetUrl);
          if (isSingleMode) {
            setBackgroundSettings({
              enabled: true,
              source: 'local',
              imageUrl: assetUrl,
              presetId: null,
              localAssetId: null,
            });
          } else {
            updateSelectedItem({
              enabled: true,
              source: 'local',
              imageUrl: assetUrl,
              presetId: null,
              localAssetId: null,
            });
          }
        }
      } catch (error) {
        console.error('Failed to open file dialog:', error);
        setUploadError(t('uploadError') || 'Failed to open file dialog');
      } finally {
        setIsUploading(false);
      }
    } else {
      // Web fallback - use file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          void (async () => {
            try {
              if (isSingleMode) {
                await setBackgroundLocalFile(file);
                setBackgroundSettings({
                  enabled: true,
                  source: 'local',
                  presetId: null,
                  imageUrl: '',
                });
                return;
              }

              const { assetId } = await saveBackgroundImageAsset(file);
              updateSelectedItem({
                enabled: true,
                source: 'local',
                presetId: null,
                imageUrl: '',
                localAssetId: assetId,
              });
            } catch (error) {
              console.error('Failed to upload file:', error);
              setUploadError(t('uploadError') || 'Failed to upload file');
            } finally {
              setIsUploading(false);
            }
          })();
        } else {
          setIsUploading(false);
        }
      };
      input.click();
    }
  }, [isSingleMode, setBackgroundLocalFile, setBackgroundSettings, t, updateSelectedItem]);

  // Generate preview background style
  // Use only non-shorthand properties to avoid React warning about conflicting shorthand/non-shorthand properties
  const previewStyle = useMemo((): React.CSSProperties => {
    if (!backgroundSettings.enabled || effectiveSettings.source === 'none') {
      return {};
    }

    const localPreviewUrl = effectiveSettings.localAssetId
      ? localPreviewMap[effectiveSettings.localAssetId]
      : null;

    let backgroundValue = '';
    if (effectiveSettings.source === 'preset' && effectiveSettings.presetId) {
      const preset = BACKGROUND_PRESETS.find(p => p.id === effectiveSettings.presetId);
      if (preset) {
        backgroundValue = preset.url;
      }
    } else if (effectiveSettings.source === 'local') {
      const src = effectiveSettings.imageUrl || localPreviewUrl || '';
      if (src) {
        backgroundValue = src.startsWith('linear-gradient') || src.startsWith('radial-gradient')
          ? src
          : `url("${src}")`;
      }
    } else if (effectiveSettings.imageUrl) {
      const src = effectiveSettings.imageUrl;
      if (src.startsWith('linear-gradient') || src.startsWith('radial-gradient')) {
        backgroundValue = src;
      } else {
        backgroundValue = `url("${src}")`;
      }
    }

    if (!backgroundValue) return {};

    const isGradient = backgroundValue.startsWith('linear-gradient') || backgroundValue.startsWith('radial-gradient');

    // Use backgroundImage instead of background shorthand to avoid React warning
    // when combining with backgroundSize, backgroundPosition, backgroundRepeat
    return {
      backgroundImage: backgroundValue,
      backgroundSize: isGradient ? undefined : (effectiveSettings.fit === 'tile' ? 'auto' : effectiveSettings.fit === 'fill' ? '100% 100%' : effectiveSettings.fit),
      backgroundPosition: effectiveSettings.position.replace('-', ' '),
      backgroundRepeat: effectiveSettings.fit === 'tile' ? 'repeat' : 'no-repeat',
      opacity: effectiveSettings.opacity / 100,
      filter: `blur(${effectiveSettings.blur}px) brightness(${effectiveSettings.brightness}%) saturate(${effectiveSettings.saturation}%) contrast(${effectiveSettings.contrast ?? 100}%) grayscale(${effectiveSettings.grayscale ?? 0}%)`,
    };
  }, [backgroundSettings.enabled, effectiveSettings, localPreviewMap]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">
                {t('title')}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('description')}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BackgroundImportExport />
            {backgroundSettings.enabled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearBackground}
                className="h-7 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                {t('clear')}
              </Button>
            )}
            <Switch
              checked={backgroundSettings.enabled}
              onCheckedChange={setBackgroundEnabled}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t('mode')}</Label>
            <Select
              value={backgroundSettings.mode}
              onValueChange={(v) => {
                setActiveItemIndex(0);
                setBackgroundSettings({ mode: v as 'single' | 'layers' | 'slideshow' });
              }}
            >
              <SelectTrigger aria-label="Background mode" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single" className="text-xs">{t('modeSingle')}</SelectItem>
                <SelectItem value="layers" className="text-xs">{t('modeLayers')}</SelectItem>
                <SelectItem value="slideshow" className="text-xs">{t('modeSlideshow')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {backgroundSettings.mode === 'slideshow' && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t('slideshowInterval')}</Label>
              <Input
                type="number"
                min={1}
                value={Math.round(backgroundSettings.slideshow.intervalMs / 1000)}
                onChange={(e) => {
                  const seconds = Number(e.target.value);
                  setBackgroundSettings({
                    slideshow: {
                      ...backgroundSettings.slideshow,
                      intervalMs: Math.max(1, seconds) * 1000,
                    },
                  });
                }}
                className="h-8 text-xs"
              />
            </div>
          )}
        </div>

        {backgroundSettings.mode === 'slideshow' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('slideshowTransition')}</Label>
              <Input
                type="number"
                min={0}
                value={Math.round(backgroundSettings.slideshow.transitionMs / 1000)}
                onChange={(e) => {
                  const seconds = Number(e.target.value);
                  setBackgroundSettings({
                    slideshow: {
                      ...backgroundSettings.slideshow,
                      transitionMs: Math.max(0, seconds) * 1000,
                    },
                  });
                }}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex items-end justify-between gap-3">
              <Label className="text-xs">{t('slideshowShuffle')}</Label>
              <Switch
                checked={backgroundSettings.slideshow.shuffle}
                onCheckedChange={(checked) =>
                  setBackgroundSettings({
                    slideshow: { ...backgroundSettings.slideshow, shuffle: checked },
                  })
                }
              />
            </div>
          </div>
        )}

        {(backgroundSettings.mode === 'layers' || backgroundSettings.mode === 'slideshow') && items && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">
                {backgroundSettings.mode === 'layers' ? t('layers') : t('slides')}
              </Label>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  aria-label={backgroundSettings.mode === 'layers' ? 'Add background layer' : 'Add background slide'}
                  onClick={addItem}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  aria-label={backgroundSettings.mode === 'layers' ? 'Remove background layer' : 'Remove background slide'}
                  disabled={items.length <= 1}
                  onClick={() => removeItem(activeItemIndex)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {items.map((item, idx) => (
                <Button
                  key={item.id}
                  variant={idx === activeItemIndex ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setActiveItemIndex(idx)}
                >
                  {backgroundSettings.mode === 'layers'
                    ? `${t('layer')} ${idx + 1}`
                    : `${t('slide')} ${idx + 1}`}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Preview */}
        {backgroundSettings.enabled && isPreviewVisible && (
          <div className="relative rounded-lg overflow-hidden border h-32">
            <div
              className="absolute inset-0"
              style={previewStyle}
            />
            {effectiveSettings.overlayOpacity > 0 && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: effectiveSettings.overlayColor,
                  opacity: effectiveSettings.overlayOpacity / 100,
                }}
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-muted-foreground">
                {t('backgroundPreview')}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6"
              onClick={() => setIsPreviewVisible(false)}
            >
              <EyeOff className="h-3 w-3" />
            </Button>
          </div>
        )}
        {!isPreviewVisible && backgroundSettings.enabled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPreviewVisible(true)}
            className="w-full h-8"
          >
            <Eye className="h-3 w-3 mr-1.5" />
            {t('showPreview')}
          </Button>
        )}

        {/* Source Selection Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="presets" className="text-xs">
              <Palette className="h-3 w-3 mr-1" />
              {t('presets')}
            </TabsTrigger>
            <TabsTrigger value="url" className="text-xs">
              <LinkIcon className="h-3 w-3 mr-1" />
              {t('url')}
            </TabsTrigger>
            <TabsTrigger value="file" className="text-xs">
              <Upload className="h-3 w-3 mr-1" />
              {t('file')}
            </TabsTrigger>
          </TabsList>

          {/* Presets Tab */}
          <TabsContent value="presets" className="mt-3 space-y-3">
            {/* Category Filter */}
            <div className="flex gap-1 flex-wrap">
              {(['all', 'gradient', 'mesh', 'abstract'] as const).map((cat) => (
                <Button
                  key={cat}
                  variant={presetCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => setPresetCategory(cat)}
                >
                  {cat === 'all' ? t('categoryAll') :
                   cat === 'gradient' ? t('categoryGradient') :
                   cat === 'mesh' ? t('categoryMesh') :
                   t('categoryAbstract')}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {BACKGROUND_PRESETS
                .filter((p) => presetCategory === 'all' || p.category === presetCategory)
                .map((preset) => {
                const isSelected = effectiveSettings.presetId === preset.id && effectiveSettings.source === 'preset';
                return (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset.id)}
                    className={cn(
                      'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                      isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-muted-foreground/30'
                    )}
                  >
                    <div
                      className="absolute inset-0"
                      style={{ background: preset.url }}
                    />
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <span className="absolute bottom-0.5 left-0.5 right-0.5 text-[9px] text-white font-medium truncate text-center drop-shadow-md">
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </TabsContent>

          {/* URL Tab */}
          <TabsContent value="url" className="mt-3 space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder={t('enterImageUrl')}
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setUrlError(null);
                }}
                className={cn('h-8 text-xs', urlError && 'border-destructive')}
                disabled={isValidatingUrl}
              />
              <Button
                size="sm"
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim() || isValidatingUrl}
                className="h-8"
              >
                {isValidatingUrl ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  t('apply')
                )}
              </Button>
            </div>
            {urlError && (
              <p className="text-[10px] text-destructive">
                {urlError}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground">
              {t('supportedFormats')}
            </p>
          </TabsContent>

          {/* File Tab */}
          <TabsContent value="file" className="mt-3 space-y-2">
            <Button
              variant="outline"
              className="w-full h-20 flex-col gap-2"
              onClick={handleFileSelect}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />
                  <span className="text-xs">
                    {t('uploading') || 'Uploading...'}
                  </span>
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs">
                    {t('clickToSelectFile')}
                  </span>
                </>
              )}
            </Button>
            {uploadError && (
              <p className="text-[10px] text-destructive">
                {uploadError}
              </p>
            )}
          </TabsContent>
        </Tabs>

        {/* Image Settings */}
        {backgroundSettings.enabled && effectiveSettings.source !== 'none' && (
          <div className="space-y-3 pt-2 border-t">
            {/* Basic controls */}
            <div className="grid grid-cols-2 gap-3">
              {/* Fit */}
              <div className="space-y-1.5">
                <Label className="text-xs">{t('fit')}</Label>
                <Select
                  value={effectiveSettings.fit}
                  onValueChange={(v) => updateFit(v as 'cover' | 'contain' | 'fill' | 'tile')}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BACKGROUND_FIT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {t(opt.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Position */}
              <div className="space-y-1.5">
                <Label className="text-xs">{t('position')}</Label>
                <Select
                  value={effectiveSettings.position}
                  onValueChange={(v) => updatePosition(v as 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right')}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BACKGROUND_POSITION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {t(opt.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Opacity */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t('opacity')}</Label>
                <span className="text-xs text-muted-foreground">{effectiveSettings.opacity}%</span>
              </div>
              <Slider
                value={[effectiveSettings.opacity]}
                onValueChange={([v]) => updateOpacity(v)}
                min={BACKGROUND_LIMITS.opacity.min}
                max={BACKGROUND_LIMITS.opacity.max}
                step={BACKGROUND_LIMITS.opacity.step}
              />
            </div>

            {/* Blur */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t('blur')}</Label>
                <span className="text-xs text-muted-foreground">{effectiveSettings.blur}px</span>
              </div>
              <Slider
                value={[effectiveSettings.blur]}
                onValueChange={([v]) => updateBlur(v)}
                min={BACKGROUND_LIMITS.blur.min}
                max={BACKGROUND_LIMITS.blur.max}
                step={BACKGROUND_LIMITS.blur.step}
              />
            </div>

            {/* Advanced Settings Collapsible */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full h-7 text-xs">
                  <Sliders className="h-3 w-3 mr-1.5" />
                  {t('advancedSettings')}
                  <RefreshCw className={cn('h-3 w-3 ml-auto transition-transform', showAdvanced && 'rotate-180')} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                {/* Overlay */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-muted-foreground" />
                    <Label className="text-xs">{t('overlay')}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={effectiveSettings.overlayColor}
                      onChange={(e) => updateOverlayColor(e.target.value)}
                      className="h-8 w-12 rounded border cursor-pointer"
                      title={t('selectOverlayColor')}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">{t('opacity')}</span>
                        <span className="text-xs text-muted-foreground">{effectiveSettings.overlayOpacity}%</span>
                      </div>
                      <Slider
                        value={[effectiveSettings.overlayOpacity]}
                        onValueChange={([v]) => updateOverlayOpacity(v)}
                        min={BACKGROUND_LIMITS.overlayOpacity.min}
                        max={BACKGROUND_LIMITS.overlayOpacity.max}
                        step={BACKGROUND_LIMITS.overlayOpacity.step}
                      />
                    </div>
                  </div>
                </div>

                {/* Brightness */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sun className="h-3 w-3 text-muted-foreground" />
                      <Label className="text-xs">{t('brightness')}</Label>
                    </div>
                    <span className="text-xs text-muted-foreground">{effectiveSettings.brightness}%</span>
                  </div>
                  <Slider
                    value={[effectiveSettings.brightness]}
                    onValueChange={([v]) => updateBrightness(v)}
                    min={BACKGROUND_LIMITS.brightness.min}
                    max={BACKGROUND_LIMITS.brightness.max}
                    step={BACKGROUND_LIMITS.brightness.step}
                  />
                </div>

                {/* Saturation */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Droplets className="h-3 w-3 text-muted-foreground" />
                      <Label className="text-xs">{t('saturation')}</Label>
                    </div>
                    <span className="text-xs text-muted-foreground">{effectiveSettings.saturation}%</span>
                  </div>
                  <Slider
                    value={[effectiveSettings.saturation]}
                    onValueChange={([v]) => updateSaturation(v)}
                    min={BACKGROUND_LIMITS.saturation.min}
                    max={BACKGROUND_LIMITS.saturation.max}
                    step={BACKGROUND_LIMITS.saturation.step}
                  />
                </div>

                {/* Contrast */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{t('contrast')}</Label>
                    <span className="text-xs text-muted-foreground">{effectiveSettings.contrast ?? 100}%</span>
                  </div>
                  <Slider
                    value={[effectiveSettings.contrast ?? 100]}
                    onValueChange={([v]) => updateContrast(v)}
                    min={BACKGROUND_LIMITS.contrast.min}
                    max={BACKGROUND_LIMITS.contrast.max}
                    step={BACKGROUND_LIMITS.contrast.step}
                  />
                </div>

                {/* Grayscale */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{t('grayscale')}</Label>
                    <span className="text-xs text-muted-foreground">{effectiveSettings.grayscale ?? 0}%</span>
                  </div>
                  <Slider
                    value={[effectiveSettings.grayscale ?? 0]}
                    onValueChange={([v]) => updateGrayscale(v)}
                    min={BACKGROUND_LIMITS.grayscale.min}
                    max={BACKGROUND_LIMITS.grayscale.max}
                    step={BACKGROUND_LIMITS.grayscale.step}
                  />
                </div>

                {/* Attachment Mode */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('attachment')}</Label>
                  <Select
                    value={effectiveSettings.attachment ?? 'fixed'}
                    onValueChange={(v) => updateAttachment(v as 'fixed' | 'scroll' | 'local')}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed" className="text-xs">
                        {t('attachmentFixed')}
                      </SelectItem>
                      <SelectItem value="scroll" className="text-xs">
                        {t('attachmentScroll')}
                      </SelectItem>
                      <SelectItem value="local" className="text-xs">
                        {t('attachmentLocal')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Animation */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('animation')}</Label>
                  <Select
                    value={effectiveSettings.animation ?? 'none'}
                    onValueChange={(v) => updateAnimation(v as 'none' | 'kenburns' | 'parallax' | 'gradient-shift')}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">
                        {t('animationNone')}
                      </SelectItem>
                      <SelectItem value="kenburns" className="text-xs">
                        Ken Burns
                      </SelectItem>
                      <SelectItem value="parallax" className="text-xs">
                        {t('animationParallax')}
                      </SelectItem>
                      <SelectItem value="gradient-shift" className="text-xs">
                        {t('animationGradientShift')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Animation Speed */}
                {(effectiveSettings.animation ?? 'none') !== 'none' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">{t('animationSpeed')}</Label>
                      <span className="text-xs text-muted-foreground">{effectiveSettings.animationSpeed ?? 5}</span>
                    </div>
                    <Slider
                      value={[effectiveSettings.animationSpeed ?? 5]}
                      onValueChange={([v]) => updateAnimationSpeed(v)}
                      min={1}
                      max={10}
                      step={1}
                    />
                  </div>
                )}

                {/* Reset Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={() => void clearBackground()}
                >
                  <RefreshCw className="h-3 w-3 mr-1.5" />
                  {t('resetAllSettings')}
                </Button>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default BackgroundSettings;
