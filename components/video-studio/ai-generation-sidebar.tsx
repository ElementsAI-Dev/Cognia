'use client';

import { useRef } from 'react';
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
} from './constants';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleApplyTemplate = (templatePrompt: string) => {
    onPromptChange(templatePrompt);
  };

  return (
    <Tabs value={activeTab} onValueChange={(v) => onActiveTabChange(v as typeof activeTab)} className="flex-1 flex flex-col">
      <TabsList className="mx-2 sm:mx-4 mt-4">
        <TabsTrigger value="text-to-video" className="flex-1 text-xs sm:text-sm">
          <Wand2 className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Text</span>
        </TabsTrigger>
        <TabsTrigger value="image-to-video" className="flex-1 text-xs sm:text-sm">
          <ImageIcon className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Image</span>
        </TabsTrigger>
      </TabsList>

      <ScrollArea className="flex-1 p-2 sm:p-4">
        <TabsContent value="text-to-video" className="mt-0 space-y-4">
          {/* Prompt */}
          <div className="space-y-2">
            <Label>Prompt</Label>
            <Textarea
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder="Describe the video you want to create..."
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Quick Templates */}
          <Collapsible open={showMoreTemplates} onOpenChange={onShowMoreTemplatesChange}>
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">Quick Templates</Label>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {showMoreTemplates ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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
                  {template.label}
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
            <Label className="text-sm text-muted-foreground">Negative Prompt (optional)</Label>
            <Textarea
              value={negativePrompt}
              onChange={(e) => onNegativePromptChange(e.target.value)}
              placeholder="Things to avoid..."
              className="min-h-[60px] resize-none"
            />
          </div>
        </TabsContent>

        <TabsContent value="image-to-video" className="mt-0 space-y-4">
          {/* Reference Image Upload */}
          <div className="space-y-2">
            <Label>Reference Image</Label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors",
                referenceImage && "border-primary"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              {referenceImage ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${referenceImage}`}
                    alt="Reference"
                    className="max-h-40 mx-auto rounded"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearImage();
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="py-4">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload an image</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 4MB</p>
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
          <div className="space-y-2">
            <Label>Motion Description (optional)</Label>
            <Textarea
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder="Describe how the image should animate..."
              className="min-h-[80px] resize-none"
            />
          </div>
        </TabsContent>

        {/* Settings */}
        <Collapsible open={showSettings} onOpenChange={onShowSettingsChange} className="mt-6">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Settings
              </span>
              {showSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Provider */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clapperboard className="h-4 w-4" />
                Provider
              </Label>
              <Select value={provider} onValueChange={(v) => onProviderChange(v as VideoProvider)}>
                <SelectTrigger>
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
              <Label>Model</Label>
              <Select value={model} onValueChange={(v) => onModelChange(v as VideoModel)}>
                <SelectTrigger>
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
                Resolution
              </Label>
              <Select value={resolution} onValueChange={(v) => onResolutionChange(v as VideoResolution)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOLUTION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label} - {opt.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Ratio className="h-4 w-4" />
                Aspect Ratio
              </Label>
              <div className="flex flex-wrap gap-2">
                {ASPECT_RATIO_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={aspectRatio === opt.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onAspectRatioChange(opt.value)}
                  >
                    {opt.icon} {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Duration
              </Label>
              <Select value={duration} onValueChange={(v) => onDurationChange(v as VideoDuration)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Style */}
            <div className="space-y-2">
              <Label>Style</Label>
              <div className="flex flex-wrap gap-2">
                {VIDEO_STYLE_PRESETS.slice(0, 4).map((preset) => (
                  <Tooltip key={preset.value}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={style === preset.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onStyleChange(preset.value)}
                      >
                        {preset.icon} {preset.label}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{preset.description}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>

            {/* FPS */}
            <div className="space-y-2">
              <Label>FPS: {fps}</Label>
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
                <Label className="text-sm">Enhance Prompt</Label>
                <Switch checked={enhancePrompt} onCheckedChange={onEnhancePromptChange} />
              </div>
              
              {model === 'veo-3.1' && (
                <>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Include Audio</Label>
                    <Switch checked={includeAudio} onCheckedChange={onIncludeAudioChange} />
                  </div>
                  {includeAudio && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Audio Description</Label>
                      <Input
                        value={audioPrompt}
                        onChange={(e) => onAudioPromptChange(e.target.value)}
                        placeholder="Ambient sounds, music..."
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Seed */}
            <div className="space-y-2">
              <Label className="text-sm">Seed (optional)</Label>
              <Input
                type="number"
                value={seed || ''}
                onChange={(e) => onSeedChange(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Random"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Cost Estimate */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Estimated Cost</span>
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
          className="w-full mt-4 text-sm sm:text-base"
          onClick={onGenerate}
          disabled={isGenerating || (!prompt.trim() && !referenceImage)}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Generate Video</span>
              <span className="sm:hidden">Generate</span>
            </>
          )}
        </Button>
      </ScrollArea>
    </Tabs>
  );
}
