'use client';

/**
 * ImageGenerationDialog - Dialog for generating images with DALL-E
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Image as ImageIcon,
  Loader2,
  Download,
  Sparkles,
  Settings2,
  RefreshCw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSettingsStore } from '@/stores';
import {
  generateImage,
  downloadImageAsBlob,
  saveImageToFile,
  type ImageSize,
  type ImageQuality,
  type ImageStyle,
  type GeneratedImage,
} from '@/lib/ai';

interface ImageGenerationDialogProps {
  trigger?: React.ReactNode;
  onImageGenerated?: (images: GeneratedImage[]) => void;
}

export function ImageGenerationDialog({
  trigger,
  onImageGenerated,
}: ImageGenerationDialogProps) {
  const t = useTranslations('imageGeneration');
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced options
  const [model, setModel] = useState<'dall-e-3' | 'dall-e-2'>('dall-e-3');
  const [size, setSize] = useState<ImageSize>('1024x1024');
  const [quality, setQuality] = useState<ImageQuality>('standard');
  const [style, setStyle] = useState<ImageStyle>('vivid');

  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const openaiApiKey = providerSettings.openai?.apiKey;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    if (!openaiApiKey) {
      setError('OpenAI API key is required. Please configure it in Settings.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateImage(openaiApiKey, {
        prompt: prompt.trim(),
        model,
        size,
        quality,
        style,
      });

      setGeneratedImages(result.images);
      onImageGenerated?.(result.images);
    } catch (err) {
      console.error('Image generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (image: GeneratedImage, index: number) => {
    try {
      if (!image.url) {
        console.error('No URL available for download');
        return;
      }
      const blob = await downloadImageAsBlob(image.url);
      const filename = `generated-image-${Date.now()}-${index + 1}.png`;
      saveImageToFile(blob, filename);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleRegenerate = () => {
    setGeneratedImages([]);
    handleGenerate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <ImageIcon className="mr-2 h-4 w-4" />
            {t('title')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Prompt input */}
          <div className="space-y-2">
            <Label htmlFor="prompt">{t('prompt')}</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A serene Japanese garden with cherry blossoms, koi pond, and wooden bridge at sunset..."
              rows={3}
              disabled={isGenerating}
            />
          </div>

          {/* Advanced options */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Settings2 className="mr-2 h-4 w-4" />
                {showAdvanced ? t('hideAdvanced') : t('showAdvanced')}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('model')}</Label>
                  <Select
                    value={model}
                    onValueChange={(v) => setModel(v as typeof model)}
                    disabled={isGenerating}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dall-e-3">DALL-E 3 (Best quality)</SelectItem>
                      <SelectItem value="dall-e-2">DALL-E 2 (Faster)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('size')}</Label>
                  <Select
                    value={size}
                    onValueChange={(v) => setSize(v as ImageSize)}
                    disabled={isGenerating}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1024x1024">Square (1024x1024)</SelectItem>
                      <SelectItem value="1024x1792">Portrait (1024x1792)</SelectItem>
                      <SelectItem value="1792x1024">Landscape (1792x1024)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('quality')}</Label>
                  <Select
                    value={quality}
                    onValueChange={(v) => setQuality(v as ImageQuality)}
                    disabled={isGenerating || model === 'dall-e-2'}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="hd">HD (Higher detail)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('style')}</Label>
                  <Select
                    value={style}
                    onValueChange={(v) => setStyle(v as ImageStyle)}
                    disabled={isGenerating || model === 'dall-e-2'}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vivid">Vivid (Dramatic)</SelectItem>
                      <SelectItem value="natural">Natural (Realistic)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Error message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Generate button */}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('generating')}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t('generate')}
                </>
              )}
            </Button>
            {generatedImages.length > 0 && (
              <Button
                variant="outline"
                onClick={handleRegenerate}
                disabled={isGenerating}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('regenerate')}
              </Button>
            )}
          </div>

          {/* Generated images */}
          {generatedImages.length > 0 && (
            <div className="space-y-3">
              <Label>{t('generatedImages')}</Label>
              <ScrollArea className="h-[300px]">
                <div className="grid gap-4">
                  {generatedImages.map((image, index) => (
                    <div key={index} className="space-y-2">
                      <div className="relative group">
                        <img
                          src={image.url}
                          alt={`Generated image ${index + 1}`}
                          className="w-full rounded-lg border"
                        />
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDownload(image, index)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {image.revisedPrompt && (
                        <p className="text-xs text-muted-foreground">
                          <strong>{t('revisedPrompt')}:</strong> {image.revisedPrompt}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ImageGenerationDialog;
