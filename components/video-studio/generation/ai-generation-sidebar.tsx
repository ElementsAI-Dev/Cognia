'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  Wand2,
  Image as ImageIcon,
  Upload,
  Trash2,
  ChevronUp,
  ChevronDown,
  Settings2,
  Sparkles,
  Loader2,
  AlertCircle,
  Clapperboard,
  Gauge,
  Ratio,
  Timer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type {
  VideoProvider,
  VideoModel,
  VideoResolution,
  VideoAspectRatio,
  VideoDuration,
  VideoStyle,
} from '@/types/media/video';
import {
  VIDEO_PROMPT_TEMPLATES,
  VIDEO_STYLE_PRESETS,
  RESOLUTION_OPTIONS,
  ASPECT_RATIO_OPTIONS,
  DURATION_OPTIONS,
} from '../constants';

interface ModelOption {
  id: string;
  name: string;
  provider: VideoProvider;
}

export interface AIGenerationSidebarProps {
  // Tab state
  activeTab: 'text-to-video' | 'image-to-video';
  onActiveTabChange: (tab: 'text-to-video' | 'image-to-video') => void;
  // Prompt state
  prompt: string;
  onPromptChange: (prompt: string) => void;
  negativePrompt: string;
  onNegativePromptChange: (prompt: string) => void;
  // Image state
  referenceImage: string | null;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
  // Settings state
  showSettings: boolean;
  onShowSettingsChange: (show: boolean) => void;
  showMoreTemplates: boolean;
  onShowMoreTemplatesChange: (show: boolean) => void;
  // Generation settings
  provider: VideoProvider;
  onProviderChange: (provider: VideoProvider) => void;
  model: VideoModel;
  onModelChange: (model: VideoModel) => void;
  providerModels: ModelOption[];
  resolution: VideoResolution;
  onResolutionChange: (resolution: VideoResolution) => void;
  aspectRatio: VideoAspectRatio;
  onAspectRatioChange: (aspectRatio: VideoAspectRatio) => void;
  duration: VideoDuration;
  onDurationChange: (duration: VideoDuration) => void;
  style: VideoStyle;
  onStyleChange: (style: VideoStyle) => void;
  fps: number;
  onFpsChange: (fps: number) => void;
  enhancePrompt: boolean;
  onEnhancePromptChange: (enhance: boolean) => void;
  includeAudio: boolean;
  onIncludeAudioChange: (include: boolean) => void;
  audioPrompt: string;
  onAudioPromptChange: (prompt: string) => void;
  seed: number | undefined;
  onSeedChange: (seed: number | undefined) => void;
  // Status
  isGenerating: boolean;
  error: string | null;
  estimatedCost: number;
  // Actions
  onGenerate: () => void;
}

export function AIGenerationSidebar({
  activeTab,
  onActiveTabChange,
  prompt,
  onPromptChange,
  negativePrompt,
  onNegativePromptChange,
  referenceImage,
  onImageUpload,
  onClearImage,
  showSettings,
  onShowSettingsChange,
  showMoreTemplates,
  onShowMoreTemplatesChange,
  provider,
  onProviderChange,
  model,
  onModelChange,
  providerModels,
  resolution,
  onResolutionChange,
  aspectRatio,
  onAspectRatioChange,
  duration,
  onDurationChange,
  style,
  onStyleChange,
  fps,
  onFpsChange,
  enhancePrompt,
  onEnhancePromptChange,
  includeAudio,
  onIncludeAudioChange,
  audioPrompt,
  onAudioPromptChange,
  seed,
  onSeedChange,
  isGenerating,
  error,
  estimatedCost,
  onGenerate,
}: AIGenerationSidebarProps) {
  const t = useTranslations('videoGeneration');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleApplyTemplate = (templatePrompt: string) => {
    onPromptChange(templatePrompt);
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => onActiveTabChange(v as typeof activeTab)}
      className="flex-1 flex flex-col min-h-0 overflow-hidden"
    >
      <div className="px-4 pt-4 pb-2">
        <TabsList className="w-full h-10 p-1 bg-secondary/50 backdrop-blur-sm rounded-xl border border-border/50">
          <TabsTrigger
            value="text-to-video"
            className="flex-1 h-8 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <Wand2 className="h-3.5 w-3.5 mr-2" />
            <span className="text-sm font-medium">{t('text')}</span>
          </TabsTrigger>
          <TabsTrigger
            value="image-to-video"
            className="flex-1 h-8 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <ImageIcon className="h-3.5 w-3.5 mr-2" />
            <span className="text-sm font-medium">{t('image')}</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 space-y-6 pb-20">
          <TabsContent value="text-to-video" className="mt-0 space-y-4">
            {/* Prompt */}
            <div className="space-y-2">
              <Label>{t('prompt')}</Label>
              <Textarea
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                placeholder={t('promptPlaceholder')}
                className="min-h-25 resize-none"
              />
            </div>

            {/* Quick Templates */}
            <Collapsible open={showMoreTemplates} onOpenChange={onShowMoreTemplatesChange}>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">{t('quickTemplates')}</Label>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {showMoreTemplates ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {VIDEO_PROMPT_TEMPLATES.slice(0, 4).map((template) => (
                  <Button
                    key={template.label}
                    variant="outline"
                    size="sm"
                    className="text-xs flex-1 sm:flex-none"
                    onClick={() => handleApplyTemplate(template.prompt)}
                  >
                    {t(`templates.${template.label}`) || template.label}
                  </Button>
                ))}
              </div>
              <CollapsibleContent>
                <div className="flex flex-wrap gap-1 mt-1">
                  {VIDEO_PROMPT_TEMPLATES.slice(4).map((template) => (
                    <Button
                      key={template.label}
                      variant="outline"
                      size="sm"
                      className="text-xs flex-1 sm:flex-none"
                      onClick={() => handleApplyTemplate(template.prompt)}
                    >
                      {template.label}
                    </Button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Negative Prompt */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">{t('negativePrompt')}</Label>
              <Textarea
                value={negativePrompt}
                onChange={(e) => onNegativePromptChange(e.target.value)}
                placeholder={t('negativePromptPlaceholder')}
                className="min-h-15 resize-none"
              />
            </div>
          </TabsContent>

          <TabsContent value="image-to-video" className="mt-0 space-y-4">
            {/* Reference Image Upload */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold tracking-tight text-foreground/80">
                {t('referenceImage')}
              </Label>
              <div
                className={cn(
                  'group relative border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-300',
                  'hover:border-primary/50 hover:bg-primary/5 bg-secondary/30',
                  referenceImage ? 'border-primary bg-primary/5' : 'border-border/60'
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                {referenceImage ? (
                  <div className="relative aspect-video flex items-center justify-center overflow-hidden rounded-xl border border-border/50 shadow-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:image/png;base64,${referenceImage}`}
                      alt="Reference"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 rounded-full shadow-2xl scale-90 transition-transform group-hover:scale-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClearImage();
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        {t('remove')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 flex flex-col items-center gap-3">
                    <div className="p-4 rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110 duration-300">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{t('uploadImage')}</p>
                      <p className="text-xs text-muted-foreground/80">{t('uploadHint')}</p>
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onImageUpload}
              />
            </div>

            {/* Prompt for image-to-video */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold tracking-tight text-foreground/80">
                {t('motionDescription')}
              </Label>
              <Textarea
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                placeholder={t('motionDescriptionPlaceholder')}
                className="min-h-35 p-4 rounded-2xl bg-secondary/30 border-border/60 focus:bg-background focus:ring-1 focus:ring-primary/20 transition-all resize-none shadow-sm leading-relaxed"
              />
            </div>
          </TabsContent>

          {/* Settings */}
          <Collapsible
            open={showSettings}
            onOpenChange={onShowSettingsChange}
            className="mt-8 border-t border-border/40 pt-6"
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="secondary"
                className="w-full flex items-center justify-between px-4 h-11 bg-secondary/30 hover:bg-secondary/50 rounded-xl group transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-background/50 group-hover:bg-background transition-colors">
                    <Settings2 className="h-4 w-4 text-foreground/70" />
                  </div>
                  <span className="text-sm font-semibold text-foreground/80">
                    {t('advancedOptions')}
                  </span>
                </div>
                {showSettings ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              {/* Provider */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clapperboard className="h-4 w-4" />
                  {t('provider')}
                </Label>
                <Select
                  value={provider}
                  onValueChange={(v) => onProviderChange(v as VideoProvider)}
                >
                  <SelectTrigger className="h-10 rounded-xl bg-secondary/20 border-transparent hover:bg-secondary/40 transition-all">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google-veo">Google Veo</SelectItem>
                    <SelectItem value="openai-sora">OpenAI Sora</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Model */}
              <div className="space-y-2">
                <Label>{t('model')}</Label>
                <Select value={model} onValueChange={(v) => onModelChange(v as VideoModel)}>
                  <SelectTrigger className="h-10 rounded-xl bg-secondary/20 border-transparent hover:bg-secondary/40 transition-all">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providerModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Resolution */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  {t('resolution')}
                </Label>
                <Select
                  value={resolution}
                  onValueChange={(v) => onResolutionChange(v as VideoResolution)}
                >
                  <SelectTrigger className="h-10 rounded-xl bg-secondary/20 border-transparent hover:bg-secondary/40 transition-all">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOLUTION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label} - {t(`resolutions.${opt.value}`) || opt.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-medium text-foreground/70">
                  <Ratio className="h-3.5 w-3.5" />
                  {t('aspectRatio')}
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {ASPECT_RATIO_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      variant={aspectRatio === opt.value ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'h-10 rounded-xl transition-all font-medium',
                        aspectRatio === opt.value
                          ? 'shadow-lg shadow-primary/20 scale-[1.02]'
                          : 'bg-secondary/20 border-transparent hover:bg-secondary/40 hover:border-border/50 text-muted-foreground hover:text-foreground'
                      )}
                      onClick={() => onAspectRatioChange(opt.value)}
                    >
                      <span className="text-lg mr-2 leading-none">{opt.icon}</span>
                      <span className="text-xs uppercase tracking-wider">{opt.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  {t('duration')}
                </Label>
                <Select
                  value={duration}
                  onValueChange={(v) => onDurationChange(v as VideoDuration)}
                >
                  <SelectTrigger className="h-10 rounded-xl bg-secondary/20 border-transparent hover:bg-secondary/40 transition-all">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {t(`durations.${opt.value}`) || opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Style */}
              <div className="space-y-2">
                <Label>{t('style')}</Label>
                <div className="flex flex-wrap gap-2">
                  {VIDEO_STYLE_PRESETS.slice(0, 4).map((preset) => (
                    <Tooltip key={preset.value}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={style === preset.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => onStyleChange(preset.value)}
                        >
                          {preset.icon} {t(`styles.${preset.value}`) || preset.label}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t(`styleDescriptions.${preset.value}`) || preset.description}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>

              {/* FPS */}
              <div className="space-y-2">
                <Label>{t('fpsDisplay', { fps })}</Label>
                <Slider
                  value={[fps]}
                  onValueChange={([v]) => onFpsChange(v)}
                  min={12}
                  max={60}
                  step={1}
                />
              </div>

              {/* Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t('enhancePrompt')}</Label>
                  <Switch checked={enhancePrompt} onCheckedChange={onEnhancePromptChange} />
                </div>

                {model === 'veo-3.1' && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">{t('includeAudio')}</Label>
                      <Switch checked={includeAudio} onCheckedChange={onIncludeAudioChange} />
                    </div>
                    {includeAudio && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">{t('audioPrompt')}</Label>
                        <Input
                          value={audioPrompt}
                          onChange={(e) => onAudioPromptChange(e.target.value)}
                          placeholder={t('audioPromptPlaceholder')}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Seed */}
              <div className="space-y-2">
                <Label className="text-sm">{t('seed')}</Label>
                <Input
                  type="number"
                  value={seed || ''}
                  onChange={(e) =>
                    onSeedChange(e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  placeholder={t('seedPlaceholder')}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Cost Estimate */}
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('estimatedCost')}</span>
              <span className="font-medium">${estimatedCost.toFixed(2)}</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* Generate Button */}
          <Button
            className={cn(
              'w-full h-12 mt-6 rounded-2xl text-base font-bold transition-all duration-300',
              'shadow-xl hover:shadow-primary/25',
              isGenerating
                ? 'bg-secondary cursor-not-allowed opacity-80'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-[1.01] active:scale-[0.99]'
            )}
            onClick={onGenerate}
            disabled={isGenerating || (!prompt.trim() && !referenceImage)}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                {t('generating')}
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-3" />
                <span>{t('generate')}</span>
              </>
            )}
          </Button>
        </div>
      </ScrollArea>
    </Tabs>
  );
}
