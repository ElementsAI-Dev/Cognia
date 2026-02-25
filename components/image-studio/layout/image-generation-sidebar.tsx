'use client';

/**
 * ImageGenerationSidebar - Left sidebar with generate/edit/variations tabs and settings
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Sparkles,
  Brush,
  Layers,
  Settings2,
  Upload,
  Loader2,
  ChevronDown,
  ChevronUp,
  Dices,
  Wand2,
} from 'lucide-react';
import { PromptOptimizerDialog } from '@/components/prompt/optimization/prompt-optimizer-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { PROMPT_TEMPLATES, STYLE_PRESETS, ASPECT_RATIOS } from '@/lib/image-studio';
import { getAvailableImageModels, type ImageProviderType } from '@/lib/ai/media/image-generation-sdk';
import { ProviderIcon } from '@/components/providers/ai/provider-icon';
import type { ImageSize, ImageQuality, ImageStyle } from '@/lib/ai';

export interface ImageGenerationSidebarProps {
  /** Whether sidebar is visible */
  show: boolean;
  /** Current active tab */
  activeTab: 'generate' | 'edit' | 'variations';
  onActiveTabChange: (tab: 'generate' | 'edit' | 'variations') => void;
  // Prompt
  prompt: string;
  onPromptChange: (value: string) => void;
  negativePrompt: string;
  onNegativePromptChange: (value: string) => void;
  // Settings
  provider: ImageProviderType;
  onProviderChange: (provider: ImageProviderType) => void;
  model: string;
  onModelChange: (model: string) => void;
  size: ImageSize;
  onSizeChange: (size: ImageSize) => void;
  quality: ImageQuality;
  onQualityChange: (quality: ImageQuality) => void;
  style: ImageStyle;
  onStyleChange: (style: ImageStyle) => void;
  numberOfImages: number;
  onNumberOfImagesChange: (n: number) => void;
  seed: number | null;
  onSeedChange: (seed: number | null) => void;
  estimatedCost: number;
  // Edit mode
  editImageFile: File | null;
  onEditImageFileChange: (file: File | null) => void;
  maskFile: File | null;
  onMaskFileChange: (file: File | null) => void;
  variationImage: File | null;
  onVariationImageChange: (file: File | null) => void;
  // File input refs
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  maskInputRef: React.RefObject<HTMLInputElement | null>;
  variationInputRef: React.RefObject<HTMLInputElement | null>;
  // Generation
  isGenerating: boolean;
  error: string | null;
  onGenerate: () => void;
  onEdit: () => void;
  onCreateVariations: () => void;
  // Settings visibility
  showSettings: boolean;
  onShowSettingsChange: (value: boolean) => void;
  className?: string;
}

export function ImageGenerationSidebar({
  show,
  activeTab,
  onActiveTabChange,
  prompt,
  onPromptChange,
  negativePrompt,
  onNegativePromptChange,
  provider,
  onProviderChange,
  model,
  onModelChange,
  size,
  onSizeChange,
  quality,
  onQualityChange,
  style,
  onStyleChange,
  numberOfImages,
  onNumberOfImagesChange,
  seed,
  onSeedChange,
  estimatedCost,
  editImageFile,
  onEditImageFileChange,
  maskFile,
  onMaskFileChange,
  variationImage,
  onVariationImageChange,
  fileInputRef,
  maskInputRef,
  variationInputRef,
  isGenerating,
  error,
  onGenerate,
  onEdit,
  onCreateVariations,
  showSettings,
  onShowSettingsChange,
  className,
}: ImageGenerationSidebarProps) {
  const t = useTranslations('imageGeneration');
  const [showMoreTemplates, setShowMoreTemplates] = useState(false);
  const [showOptimizer, setShowOptimizer] = useState(false);

  const handleApplyTemplate = (templatePrompt: string) => {
    onPromptChange(templatePrompt);
  };

  const handleApplyStyle = (styleValue: string) => {
    onPromptChange(prompt ? `${prompt}, ${styleValue}` : styleValue);
  };

  const availableModels = useMemo(() => getAvailableImageModels(provider), [provider]);

  // Drag-drop state
  const [isDraggingEdit, setIsDraggingEdit] = useState(false);
  const [isDraggingVariation, setIsDraggingVariation] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent, onFileChange: (file: File | null) => void, setDragging: (v: boolean) => void) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) onFileChange(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, setDragging: (v: boolean) => void) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent, setDragging: (v: boolean) => void) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const isDisabled =
    isGenerating ||
    (activeTab === 'generate' && !prompt.trim()) ||
    (activeTab === 'edit' && (!editImageFile || !prompt.trim())) ||
    (activeTab === 'variations' && !variationImage);

  return (
    <>
    <div
      className={cn(
        'border-r flex flex-col shrink-0 transition-all duration-300 h-full',
        show ? 'w-full' : 'w-0 overflow-hidden',
        className
      )}
    >
      <Tabs
        value={activeTab}
        onValueChange={(v) => onActiveTabChange(v as typeof activeTab)}
        className="flex-1 flex flex-col"
      >
        <TabsList className="w-full justify-start rounded-none border-b h-10 px-2">
          <TabsTrigger value="generate" className="text-xs">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {t('tabGenerate')}
          </TabsTrigger>
          <TabsTrigger value="edit" className="text-xs">
            <Brush className="h-3.5 w-3.5 mr-1.5" />
            {t('tabEdit')}
          </TabsTrigger>
          <TabsTrigger value="variations" className="text-xs">
            <Layers className="h-3.5 w-3.5 mr-1.5" />
            {t('tabVariations')}
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Generate Tab */}
            <TabsContent value="generate" className="mt-0 space-y-3">
              {/* Prompt */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">{t('prompt')}</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-xs gap-1 text-muted-foreground hover:text-primary"
                    onClick={() => setShowOptimizer(true)}
                    disabled={!prompt.trim()}
                  >
                    <Wand2 className="h-3 w-3" />
                    Enhance
                  </Button>
                </div>
                <Textarea
                  value={prompt}
                  onChange={(e) => onPromptChange(e.target.value)}
                  placeholder={t('promptPlaceholder')}
                  className="min-h-[100px] resize-none text-sm"
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      if (!isDisabled) {
                        (activeTab === 'generate' ? onGenerate : activeTab === 'edit' ? onEdit : onCreateVariations)();
                      }
                    }
                  }}
                />
                <span className="text-[10px] text-muted-foreground text-right block">{prompt.length}/4000</span>
              </div>

              {/* Aspect Ratio Quick Select */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('aspectRatio')}</Label>
                <div className="flex flex-wrap gap-1">
                  {ASPECT_RATIOS.map((ratio) => (
                    <Button
                      key={ratio.label}
                      variant={size === ratio.size ? 'secondary' : 'outline'}
                      size="sm"
                      className="flex-1 text-xs h-8"
                      onClick={() => onSizeChange(ratio.size)}
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
                    <Label className="text-xs font-medium">{t('templates')}</Label>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-5 px-1 text-xs text-muted-foreground">
                        {showMoreTemplates ? t('lessTemplates') : t('moreTemplates')}
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
                <Label className="text-xs font-medium">{t('style')}</Label>
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
                    <span className="text-xs font-medium">{t('negativePrompt')}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-1.5">
                  <Textarea
                    value={negativePrompt}
                    onChange={(e) => onNegativePromptChange(e.target.value)}
                    placeholder={t('negativePromptPlaceholder')}
                    className="min-h-[50px] resize-none text-sm"
                  />
                </CollapsibleContent>
              </Collapsible>
            </TabsContent>

            {/* Edit Tab */}
            <TabsContent value="edit" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">{t('uploadImage')}</Label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png"
                  className="hidden"
                  aria-label="Upload image for editing"
                  onChange={(e) => onEditImageFileChange(e.target.files?.[0] || null)}
                />
                <div
                  className={cn(
                    'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
                    isDraggingEdit ? 'border-primary bg-primary/10' : 'hover:bg-muted/50'
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => handleDragOver(e, setIsDraggingEdit)}
                  onDragLeave={(e) => handleDragLeave(e, setIsDraggingEdit)}
                  onDrop={(e) => handleDrop(e, onEditImageFileChange, setIsDraggingEdit)}
                >
                  {editImageFile ? (
                    <p className="text-xs font-medium truncate">{editImageFile.name}</p>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">{t('selectImagePng')}</p>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">{t('maskOptional')}</Label>
                <input
                  type="file"
                  ref={maskInputRef}
                  accept="image/png"
                  className="hidden"
                  aria-label="Upload mask image"
                  onChange={(e) => onMaskFileChange(e.target.files?.[0] || null)}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => maskInputRef.current?.click()}
                >
                  <Brush className="h-4 w-4 mr-2" />
                  {maskFile ? maskFile.name : t('selectMaskPng')}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {t('maskDescription')}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">{t('editPrompt')}</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => onPromptChange(e.target.value)}
                  placeholder={t('editPromptPlaceholder')}
                  className="min-h-[80px] resize-none text-sm"
                />
              </div>
            </TabsContent>

            {/* Variations Tab */}
            <TabsContent value="variations" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">{t('sourceImage')}</Label>
                <input
                  type="file"
                  ref={variationInputRef}
                  accept="image/png"
                  className="hidden"
                  aria-label="Upload source image for variations"
                  onChange={(e) => onVariationImageChange(e.target.files?.[0] || null)}
                />
                <div
                  className={cn(
                    'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
                    isDraggingVariation ? 'border-primary bg-primary/10' : 'hover:bg-muted/50'
                  )}
                  onClick={() => variationInputRef.current?.click()}
                  onDragOver={(e) => handleDragOver(e, setIsDraggingVariation)}
                  onDragLeave={(e) => handleDragLeave(e, setIsDraggingVariation)}
                  onDrop={(e) => handleDrop(e, onVariationImageChange, setIsDraggingVariation)}
                >
                  {variationImage ? (
                    <p className="text-xs font-medium truncate">{variationImage.name}</p>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">{t('selectImagePng')}</p>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('variationDescription')}
                </p>
              </div>
            </TabsContent>

            {/* Settings - Common for all tabs */}
            <Collapsible open={showSettings} onOpenChange={onShowSettingsChange}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    <span className="text-xs font-medium">{t('settings')}</span>
                  </span>
                  {showSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                {/* Provider */}
                <div className="space-y-2">
                  <Label className="text-xs">{t('provider')}</Label>
                  <Select value={provider} onValueChange={(v) => {
                    const newProvider = v as ImageProviderType;
                    onProviderChange(newProvider);
                    const models = getAvailableImageModels(newProvider);
                    if (models.length > 0 && !models.find(m => m.id === model)) {
                      onModelChange(models[0].id);
                    }
                  }}>
                    <SelectTrigger className="h-8 text-xs">
                      <div className="flex items-center gap-1.5">
                        <ProviderIcon providerId={provider} size={14} />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="xai">xAI (Grok)</SelectItem>
                      <SelectItem value="together">Together AI</SelectItem>
                      <SelectItem value="fireworks">Fireworks AI</SelectItem>
                      <SelectItem value="deepinfra">DeepInfra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Model */}
                <div className="space-y-2">
                  <Label className="text-xs">{t('model')}</Label>
                  <Select value={model} onValueChange={(v) => onModelChange(v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Size */}
                <div className="space-y-2">
                  <Label className="text-xs">{t('size')}</Label>
                  <Select value={size} onValueChange={(v) => onSizeChange(v as ImageSize)}>
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

                {/* Quality */}
                {(model === 'dall-e-3' || model === 'gpt-image-1') && (
                  <div className="space-y-2">
                    <Label className="text-xs">{t('quality')}</Label>
                    <Select value={quality} onValueChange={(v) => onQualityChange(v as ImageQuality)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {model === 'dall-e-3' ? (
                          <>
                            <SelectItem value="standard">{t('standardQuality')}</SelectItem>
                            <SelectItem value="hd">{t('hdQuality')}</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="low">{t('lowQuality')}</SelectItem>
                            <SelectItem value="medium">{t('mediumQuality')}</SelectItem>
                            <SelectItem value="high">{t('highQuality')}</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Style (DALL-E 3 only) */}
                {model === 'dall-e-3' && (
                  <div className="space-y-2">
                    <Label className="text-xs">{t('style')}</Label>
                    <Select value={style} onValueChange={(v) => onStyleChange(v as ImageStyle)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vivid">{t('vividStyle')}</SelectItem>
                        <SelectItem value="natural">{t('naturalStyle')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Number of images */}
                {model !== 'dall-e-3' && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-xs">{t('numberOfImages')}</Label>
                      <span className="text-xs text-muted-foreground">{numberOfImages}</span>
                    </div>
                    <Slider
                      value={[numberOfImages]}
                      onValueChange={([v]) => onNumberOfImagesChange(v)}
                      min={1}
                      max={model === 'gpt-image-1' ? 4 : 10}
                      step={1}
                    />
                  </div>
                )}

                {/* Seed */}
                <div className="space-y-2">
                  <Label className="text-xs">{t('seed')}</Label>
                  <div className="flex gap-1">
                    <Input
                      type="number"
                      placeholder={t('seedPlaceholder')}
                      value={seed ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        onSeedChange(val === '' ? null : parseInt(val, 10));
                      }}
                      className="h-8 text-xs flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => onSeedChange(null)}
                      title={t('randomize')}
                    >
                      <Dices className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Cost estimate */}
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t('estimatedCost')}:</span>
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
              onClick={activeTab === 'generate' ? onGenerate : activeTab === 'edit' ? onEdit : onCreateVariations}
              disabled={isDisabled}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('generating')}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {activeTab === 'generate' ? t('generateImage') : activeTab === 'edit' ? t('editImage') : t('createVariations')}
                </>
              )}
            </Button>
          </div>
        </ScrollArea>
      </Tabs>
    </div>

    <PromptOptimizerDialog
      open={showOptimizer}
      onOpenChange={setShowOptimizer}
      initialPrompt={prompt}
      onApply={(optimized) => onPromptChange(optimized)}
    />
  </>
  );
}
