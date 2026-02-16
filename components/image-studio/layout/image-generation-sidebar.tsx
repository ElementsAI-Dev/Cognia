'use client';

/**
 * ImageGenerationSidebar - Left sidebar with generate/edit/variations tabs and settings
 */

import { useState } from 'react';
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
  model: 'dall-e-3' | 'dall-e-2' | 'gpt-image-1';
  onModelChange: (model: 'dall-e-3' | 'dall-e-2' | 'gpt-image-1') => void;
  size: ImageSize;
  onSizeChange: (size: ImageSize) => void;
  quality: ImageQuality;
  onQualityChange: (quality: ImageQuality) => void;
  style: ImageStyle;
  onStyleChange: (style: ImageStyle) => void;
  numberOfImages: number;
  onNumberOfImagesChange: (n: number) => void;
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
  const _t = useTranslations('imageGeneration');
  const [showMoreTemplates, setShowMoreTemplates] = useState(false);

  const handleApplyTemplate = (templatePrompt: string) => {
    onPromptChange(templatePrompt);
  };

  const handleApplyStyle = (styleValue: string) => {
    onPromptChange(prompt ? `${prompt}, ${styleValue}` : styleValue);
  };

  const isDisabled =
    isGenerating ||
    (activeTab === 'generate' && !prompt.trim()) ||
    (activeTab === 'edit' && (!editImageFile || !prompt.trim())) ||
    (activeTab === 'variations' && !variationImage);

  return (
    <div
      className={cn(
        'border-r flex flex-col shrink-0 transition-all duration-300',
        show ? 'w-80' : 'w-0 overflow-hidden',
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
                  onChange={(e) => onPromptChange(e.target.value)}
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
                    onChange={(e) => onNegativePromptChange(e.target.value)}
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
                  aria-label="Upload image for editing"
                  onChange={(e) => onEditImageFileChange(e.target.files?.[0] || null)}
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
                  aria-label="Upload mask image"
                  onChange={(e) => onMaskFileChange(e.target.files?.[0] || null)}
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
                  onChange={(e) => onPromptChange(e.target.value)}
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
                  aria-label="Upload source image for variations"
                  onChange={(e) => onVariationImageChange(e.target.files?.[0] || null)}
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
            <Collapsible open={showSettings} onOpenChange={onShowSettingsChange}>
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
                  <Select value={model} onValueChange={(v) => onModelChange(v as typeof model)}>
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
                    <Label className="text-xs">Quality</Label>
                    <Select value={quality} onValueChange={(v) => onQualityChange(v as ImageQuality)}>
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
                    <Select value={style} onValueChange={(v) => onStyleChange(v as ImageStyle)}>
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

                {/* Number of images */}
                {model !== 'dall-e-3' && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-xs">Number of Images</Label>
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
              onClick={activeTab === 'generate' ? onGenerate : activeTab === 'edit' ? onEdit : onCreateVariations}
              disabled={isDisabled}
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
  );
}
