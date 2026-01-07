'use client';

/**
 * BackgroundSettings - Configure window background image and effects
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
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
  type BackgroundImageFit,
  type BackgroundImagePosition,
} from '@/lib/themes';
import { getBackgroundImageAssetBlob } from '@/lib/themes/background-assets';
import { cn } from '@/lib/utils';

const fitOptions: { value: BackgroundImageFit; label: string; labelZh: string }[] = [
  { value: 'cover', label: 'Cover', labelZh: '覆盖' },
  { value: 'contain', label: 'Contain', labelZh: '包含' },
  { value: 'fill', label: 'Stretch', labelZh: '拉伸' },
  { value: 'tile', label: 'Tile', labelZh: '平铺' },
];

const positionOptions: { value: BackgroundImagePosition; label: string; labelZh: string }[] = [
  { value: 'center', label: 'Center', labelZh: '居中' },
  { value: 'top', label: 'Top', labelZh: '顶部' },
  { value: 'bottom', label: 'Bottom', labelZh: '底部' },
  { value: 'left', label: 'Left', labelZh: '左侧' },
  { value: 'right', label: 'Right', labelZh: '右侧' },
  { value: 'top-left', label: 'Top Left', labelZh: '左上' },
  { value: 'top-right', label: 'Top Right', labelZh: '右上' },
  { value: 'bottom-left', label: 'Bottom Left', labelZh: '左下' },
  { value: 'bottom-right', label: 'Bottom Right', labelZh: '右下' },
];

export function BackgroundSettings() {
  const _t = useTranslations('settings');
  const language = useSettingsStore((state) => state.language);
  
  const backgroundSettings = useSettingsStore((state) => state.backgroundSettings);
  const setBackgroundSettings = useSettingsStore((state) => state.setBackgroundSettings);
  const setBackgroundEnabled = useSettingsStore((state) => state.setBackgroundEnabled);
  const setBackgroundPreset = useSettingsStore((state) => state.setBackgroundPreset);
  const setBackgroundFit = useSettingsStore((state) => state.setBackgroundFit);
  const setBackgroundPosition = useSettingsStore((state) => state.setBackgroundPosition);
  const setBackgroundOpacity = useSettingsStore((state) => state.setBackgroundOpacity);
  const setBackgroundBlur = useSettingsStore((state) => state.setBackgroundBlur);
  const setBackgroundOverlay = useSettingsStore((state) => state.setBackgroundOverlay);
  const setBackgroundBrightness = useSettingsStore((state) => state.setBackgroundBrightness);
  const setBackgroundSaturation = useSettingsStore((state) => state.setBackgroundSaturation);
  const setBackgroundLocalFile = useSettingsStore((state) => state.setBackgroundLocalFile);
  const clearBackground = useSettingsStore((state) => state.clearBackground);

  const [urlInput, setUrlInput] = useState(backgroundSettings.imageUrl || '');
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);

  const derivedTab = useMemo(() => {
    if (backgroundSettings.source === 'url') return 'url';
    if (backgroundSettings.source === 'local') return 'file';
    return 'presets';
  }, [backgroundSettings.source]);

  const [activeTab, setActiveTab] = useState(derivedTab);

  useEffect(() => {
    setActiveTab(derivedTab);
  }, [derivedTab]);

  useEffect(() => {
    if (backgroundSettings.source === 'url') {
      setUrlInput(backgroundSettings.imageUrl || '');
    }
  }, [backgroundSettings.source, backgroundSettings.imageUrl]);

  // Restore web-local preview from IndexedDB
  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const resolve = async () => {
      if (!backgroundSettings.enabled) return;
      if (typeof window === 'undefined') return;
      if ((window as typeof window & { __TAURI__?: unknown }).__TAURI__) return;
      if (backgroundSettings.source !== 'local') return;
      if (!backgroundSettings.localAssetId) return;

      const blob = await getBackgroundImageAssetBlob(backgroundSettings.localAssetId);
      if (!blob || cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setLocalPreviewUrl(objectUrl);
    };

    resolve();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [backgroundSettings.enabled, backgroundSettings.source, backgroundSettings.localAssetId]);

  const isZh = language === 'zh-CN';

  const handleUrlSubmit = useCallback(() => {
    if (urlInput.trim()) {
      setBackgroundSettings({
        enabled: true,
        source: 'url',
        imageUrl: urlInput.trim(),
        presetId: null,
        localAssetId: null,
      });
    }
  }, [urlInput, setBackgroundSettings]);

  const handlePresetSelect = useCallback((presetId: string) => {
    setBackgroundPreset(presetId);
    setBackgroundSettings({ enabled: true, source: 'preset' });
  }, [setBackgroundPreset, setBackgroundSettings]);

  const handleClearBackground = useCallback(() => {
    void clearBackground();
    setUrlInput('');
    setLocalPreviewUrl(null);
  }, [clearBackground]);

  const handleFileSelect = useCallback(async () => {
    // Check if we're in Tauri environment
    if (typeof window !== 'undefined' && window.__TAURI__) {
      try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const result = await open({
          multiple: false,
          filters: [
            { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'] },
          ],
        });
        if (result) {
          // Convert path to asset URL for Tauri
          const { convertFileSrc } = await import('@tauri-apps/api/core');
          const assetUrl = convertFileSrc(result as string);
          setUrlInput(assetUrl);
          setBackgroundSettings({
            enabled: true,
            source: 'local',
            imageUrl: assetUrl,
            presetId: null,
            localAssetId: null,
          });
        }
      } catch (error) {
        console.error('Failed to open file dialog:', error);
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
            // Immediate preview
            setLocalPreviewUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return URL.createObjectURL(file);
            });

            await setBackgroundLocalFile(file);
            setBackgroundSettings({
              enabled: true,
              source: 'local',
              presetId: null,
              imageUrl: '',
            });
          })();
        }
      };
      input.click();
    }
  }, [setBackgroundLocalFile, setBackgroundSettings]);

  // Generate preview background style
  const previewStyle = useMemo(() => {
    if (!backgroundSettings.enabled || backgroundSettings.source === 'none') {
      return {};
    }

    let backgroundValue = '';
    if (backgroundSettings.source === 'preset' && backgroundSettings.presetId) {
      const preset = BACKGROUND_PRESETS.find(p => p.id === backgroundSettings.presetId);
      if (preset) {
        backgroundValue = preset.url;
      }
    } else if (backgroundSettings.imageUrl || localPreviewUrl) {
      const src = backgroundSettings.imageUrl || localPreviewUrl || '';
      if (src.startsWith('linear-gradient') || src.startsWith('radial-gradient')) {
        backgroundValue = src;
      } else {
        backgroundValue = `url("${src}")`;
      }
    }

    if (!backgroundValue) return {};

    const isGradient = backgroundValue.startsWith('linear-gradient') || backgroundValue.startsWith('radial-gradient');

    return {
      background: backgroundValue,
      backgroundSize: isGradient ? undefined : (backgroundSettings.fit === 'tile' ? 'auto' : backgroundSettings.fit === 'fill' ? '100% 100%' : backgroundSettings.fit),
      backgroundPosition: backgroundSettings.position.replace('-', ' '),
      backgroundRepeat: backgroundSettings.fit === 'tile' ? 'repeat' : 'no-repeat',
      opacity: backgroundSettings.opacity / 100,
      filter: `blur(${backgroundSettings.blur}px) brightness(${backgroundSettings.brightness}%) saturate(${backgroundSettings.saturation}%)`,
    };
  }, [backgroundSettings, localPreviewUrl]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">
                {isZh ? '背景图片' : 'Background Image'}
              </CardTitle>
              <CardDescription className="text-xs">
                {isZh ? '自定义窗口背景' : 'Customize window background'}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {backgroundSettings.enabled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearBackground}
                className="h-7 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                {isZh ? '清除' : 'Clear'}
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
        {/* Preview */}
        {backgroundSettings.enabled && isPreviewVisible && (
          <div className="relative rounded-lg overflow-hidden border h-32">
            <div
              className="absolute inset-0"
              style={previewStyle}
            />
            {backgroundSettings.overlayOpacity > 0 && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: backgroundSettings.overlayColor,
                  opacity: backgroundSettings.overlayOpacity / 100,
                }}
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-muted-foreground">
                {isZh ? '背景预览' : 'Background Preview'}
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
            {isZh ? '显示预览' : 'Show Preview'}
          </Button>
        )}

        {/* Source Selection Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="presets" className="text-xs">
              <Palette className="h-3 w-3 mr-1" />
              {isZh ? '预设' : 'Presets'}
            </TabsTrigger>
            <TabsTrigger value="url" className="text-xs">
              <LinkIcon className="h-3 w-3 mr-1" />
              URL
            </TabsTrigger>
            <TabsTrigger value="file" className="text-xs">
              <Upload className="h-3 w-3 mr-1" />
              {isZh ? '文件' : 'File'}
            </TabsTrigger>
          </TabsList>

          {/* Presets Tab */}
          <TabsContent value="presets" className="mt-3">
            <div className="grid grid-cols-4 gap-2">
              {BACKGROUND_PRESETS.map((preset) => {
                const isSelected = backgroundSettings.presetId === preset.id && backgroundSettings.source === 'preset';
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
                placeholder={isZh ? '输入图片URL...' : 'Enter image URL...'}
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim()}
                className="h-8"
              >
                {isZh ? '应用' : 'Apply'}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {isZh
                ? '支持 PNG, JPG, WebP, GIF, SVG 格式'
                : 'Supports PNG, JPG, WebP, GIF, SVG formats'}
            </p>
          </TabsContent>

          {/* File Tab */}
          <TabsContent value="file" className="mt-3">
            <Button
              variant="outline"
              className="w-full h-20 flex-col gap-2"
              onClick={handleFileSelect}
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs">
                {isZh ? '点击选择图片文件' : 'Click to select image file'}
              </span>
            </Button>
          </TabsContent>
        </Tabs>

        {/* Image Settings */}
        {backgroundSettings.enabled && backgroundSettings.source !== 'none' && (
          <div className="space-y-3 pt-2 border-t">
            {/* Basic controls */}
            <div className="grid grid-cols-2 gap-3">
              {/* Fit */}
              <div className="space-y-1.5">
                <Label className="text-xs">{isZh ? '填充方式' : 'Fit'}</Label>
                <Select
                  value={backgroundSettings.fit}
                  onValueChange={(v) => setBackgroundFit(v as BackgroundImageFit)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fitOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {isZh ? opt.labelZh : opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Position */}
              <div className="space-y-1.5">
                <Label className="text-xs">{isZh ? '位置' : 'Position'}</Label>
                <Select
                  value={backgroundSettings.position}
                  onValueChange={(v) => setBackgroundPosition(v as BackgroundImagePosition)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {positionOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {isZh ? opt.labelZh : opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Opacity */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{isZh ? '透明度' : 'Opacity'}</Label>
                <span className="text-xs text-muted-foreground">{backgroundSettings.opacity}%</span>
              </div>
              <Slider
                value={[backgroundSettings.opacity]}
                onValueChange={([v]) => setBackgroundOpacity(v)}
                min={10}
                max={100}
                step={5}
              />
            </div>

            {/* Blur */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{isZh ? '模糊度' : 'Blur'}</Label>
                <span className="text-xs text-muted-foreground">{backgroundSettings.blur}px</span>
              </div>
              <Slider
                value={[backgroundSettings.blur]}
                onValueChange={([v]) => setBackgroundBlur(v)}
                min={0}
                max={20}
                step={1}
              />
            </div>

            {/* Advanced Settings Collapsible */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full h-7 text-xs">
                  <Sliders className="h-3 w-3 mr-1.5" />
                  {isZh ? '高级设置' : 'Advanced Settings'}
                  <RefreshCw className={cn('h-3 w-3 ml-auto transition-transform', showAdvanced && 'rotate-180')} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                {/* Overlay */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-muted-foreground" />
                    <Label className="text-xs">{isZh ? '叠加层' : 'Overlay'}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={backgroundSettings.overlayColor}
                      onChange={(e) => setBackgroundOverlay(e.target.value, backgroundSettings.overlayOpacity)}
                      className="h-8 w-12 rounded border cursor-pointer"
                      title={isZh ? '选择叠加层颜色' : 'Select overlay color'}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">{isZh ? '不透明度' : 'Opacity'}</span>
                        <span className="text-xs text-muted-foreground">{backgroundSettings.overlayOpacity}%</span>
                      </div>
                      <Slider
                        value={[backgroundSettings.overlayOpacity]}
                        onValueChange={([v]) => setBackgroundOverlay(backgroundSettings.overlayColor, v)}
                        min={0}
                        max={80}
                        step={5}
                      />
                    </div>
                  </div>
                </div>

                {/* Brightness */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sun className="h-3 w-3 text-muted-foreground" />
                      <Label className="text-xs">{isZh ? '亮度' : 'Brightness'}</Label>
                    </div>
                    <span className="text-xs text-muted-foreground">{backgroundSettings.brightness}%</span>
                  </div>
                  <Slider
                    value={[backgroundSettings.brightness]}
                    onValueChange={([v]) => setBackgroundBrightness(v)}
                    min={50}
                    max={150}
                    step={5}
                  />
                </div>

                {/* Saturation */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Droplets className="h-3 w-3 text-muted-foreground" />
                      <Label className="text-xs">{isZh ? '饱和度' : 'Saturation'}</Label>
                    </div>
                    <span className="text-xs text-muted-foreground">{backgroundSettings.saturation}%</span>
                  </div>
                  <Slider
                    value={[backgroundSettings.saturation]}
                    onValueChange={([v]) => setBackgroundSaturation(v)}
                    min={0}
                    max={200}
                    step={10}
                  />
                </div>

                {/* Reset Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={() => void clearBackground()}
                >
                  <RefreshCw className="h-3 w-3 mr-1.5" />
                  {isZh ? '重置所有设置' : 'Reset All Settings'}
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
