'use client';

/**
 * ImageExportDialog - Export chat conversations as images
 *
 * Supports: PNG, JPG, WebP with customization options
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Image as ImageIcon,
  Download,
  Copy,
  Check,
  Loader2,
  Sun,
  Moon,
  Monitor,
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
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Session } from '@/types';
import { useExportMessages } from '@/hooks/export';
import {
  downloadAsImage,
  generateThumbnail,
  copyImageToClipboard,
  getImageExportFormats,
  estimateImageSize,
} from '@/lib/export/image/image-export';

interface ImageExportDialogProps {
  session: Session;
  trigger?: React.ReactNode;
}

type ThemeOption = 'light' | 'dark' | 'system';
type FormatOption = 'png' | 'jpg' | 'webp';
type ScaleOption = 1 | 2 | 3;

const THEME_OPTIONS: { value: ThemeOption; labelKey: string; icon: React.ReactNode }[] = [
  { value: 'light', labelKey: 'lightTheme', icon: <Sun className="h-4 w-4" /> },
  { value: 'dark', labelKey: 'darkTheme', icon: <Moon className="h-4 w-4" /> },
  { value: 'system', labelKey: 'systemTheme', icon: <Monitor className="h-4 w-4" /> },
];

const SCALE_OPTIONS: { value: ScaleOption; labelKey: string }[] = [
  { value: 1, labelKey: 'scale1x' },
  { value: 2, labelKey: 'scale2x' },
  { value: 3, labelKey: 'scale3x' },
];

export function ImageExportDialog({ session, trigger }: ImageExportDialogProps) {
  const t = useTranslations('export');
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  // Export options
  const [format, setFormat] = useState<FormatOption>('png');
  const [theme, setTheme] = useState<ThemeOption>('light');
  const [scale, setScale] = useState<ScaleOption>(2);
  const [quality, setQuality] = useState(92);
  const [includeHeader, setIncludeHeader] = useState(true);
  const [includeFooter, setIncludeFooter] = useState(true);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [showModel, setShowModel] = useState(true);
  const [maxMessages] = useState(20);

  const formats = getImageExportFormats();

  const { messages, isLoading } = useExportMessages(session.id, open);

  // Generate preview when options change
  useEffect(() => {
    if (!open || messages.length === 0) return;

    const generatePreviewAsync = async () => {
      setIsGeneratingPreview(true);
      try {
        const thumbnail = await generateThumbnail(session, messages.slice(0, 3), {
          width: 400,
          maxMessages: 3,
        });
        setPreview(thumbnail);
      } catch (error) {
        console.error('Preview generation failed:', error);
        setPreview(null);
      } finally {
        setIsGeneratingPreview(false);
      }
    };

    const timeoutId = setTimeout(generatePreviewAsync, 300);
    return () => clearTimeout(timeoutId);
  }, [open, messages, session, theme]);

  // Handle export
  const handleExport = useCallback(async () => {
    if (messages.length === 0) return;

    setIsExporting(true);
    try {
      await downloadAsImage(session, messages.slice(0, maxMessages), {
        format,
        theme,
        scale,
        quality: quality / 100,
        includeHeader,
        includeFooter,
        showTimestamps,
        showModel,
      });
      toast.success(t('imageExported'));
      setOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(t('exportFailed'));
    } finally {
      setIsExporting(false);
    }
  }, [
    session,
    messages,
    maxMessages,
    format,
    theme,
    scale,
    quality,
    includeHeader,
    includeFooter,
    showTimestamps,
    showModel,
    t,
  ]);

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    if (messages.length === 0) return;

    setIsCopying(true);
    try {
      const success = await copyImageToClipboard(session, messages.slice(0, maxMessages), {
        theme,
        scale,
        includeHeader,
        includeFooter,
        showTimestamps,
        showModel,
      });

      if (success) {
        setCopied(true);
        toast.success(t('imageCopied'));
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast.error(t('copyFailedTryDownload'));
      }
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error(t('copyFailed'));
    } finally {
      setIsCopying(false);
    }
  }, [
    session,
    messages,
    maxMessages,
    theme,
    scale,
    includeHeader,
    includeFooter,
    showTimestamps,
    showModel,
    t,
  ]);

  const estimatedSize = estimateImageSize(Math.min(messages.length, maxMessages), {
    format,
    scale,
    width: 800,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <ImageIcon className="h-4 w-4 mr-2" />
            {t('exportImage')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            {t('exportAsImage')}
          </DialogTitle>
          <DialogDescription>{t('exportImageDescription')}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6">
            {/* Preview */}
            <div className="space-y-2">
              <Label>{t('imagePreview')}</Label>
              <div className="relative rounded-lg border bg-muted/50 p-4 flex items-center justify-center min-h-[200px]">
                {isGeneratingPreview ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-w-full max-h-[200px] rounded shadow-md"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-sm">{t('previewPlaceholder')}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Format */}
              <div className="space-y-2">
                <Label>{t('imageFormatType')}</Label>
                <RadioGroup
                  value={format}
                  onValueChange={(v) => setFormat(v as FormatOption)}
                  className="flex gap-2"
                >
                  {formats.map((f) => (
                    <div key={f.value} className="flex items-center">
                      <RadioGroupItem value={f.value} id={f.value} className="peer sr-only" />
                      <Label
                        htmlFor={f.value}
                        className={cn(
                          'flex items-center justify-center px-4 py-2 rounded-lg border cursor-pointer transition-colors',
                          'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10',
                          'hover:bg-muted'
                        )}
                      >
                        {f.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Theme */}
              <div className="space-y-2">
                <Label>{t('imageTheme')}</Label>
                <RadioGroup
                  value={theme}
                  onValueChange={(v) => setTheme(v as ThemeOption)}
                  className="flex gap-2"
                >
                  {THEME_OPTIONS.map((themeOpt) => (
                    <div key={themeOpt.value} className="flex items-center">
                      <RadioGroupItem
                        value={themeOpt.value}
                        id={`theme-${themeOpt.value}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`theme-${themeOpt.value}`}
                        className={cn(
                          'flex items-center gap-1 px-3 py-2 rounded-lg border cursor-pointer transition-colors',
                          'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10',
                          'hover:bg-muted'
                        )}
                      >
                        {themeOpt.icon}
                        <span className="text-xs">{t(themeOpt.labelKey)}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>

            {/* Scale */}
            <div className="space-y-2">
              <Label>{t('imageScale')}</Label>
              <RadioGroup
                value={String(scale)}
                onValueChange={(v) => setScale(Number(v) as ScaleOption)}
                className="flex gap-2"
              >
                {SCALE_OPTIONS.map((s) => (
                  <div key={s.value} className="flex items-center">
                    <RadioGroupItem
                      value={String(s.value)}
                      id={`scale-${s.value}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`scale-${s.value}`}
                      className={cn(
                        'px-4 py-2 rounded-lg border cursor-pointer transition-colors',
                        'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10',
                        'hover:bg-muted'
                      )}
                    >
                      {t(s.labelKey)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Quality (for JPG/WebP) */}
            {format !== 'png' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('imageQuality')}</Label>
                  <span className="text-sm text-muted-foreground">{quality}%</span>
                </div>
                <Slider
                  value={[quality]}
                  onValueChange={([v]) => setQuality(v)}
                  min={10}
                  max={100}
                  step={5}
                />
              </div>
            )}

            {/* Options */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="include-header" className="text-sm font-normal">
                  {t('includeHeader')}
                </Label>
                <Switch
                  id="include-header"
                  checked={includeHeader}
                  onCheckedChange={setIncludeHeader}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="include-footer" className="text-sm font-normal">
                  {t('includeFooter')}
                </Label>
                <Switch
                  id="include-footer"
                  checked={includeFooter}
                  onCheckedChange={setIncludeFooter}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="show-timestamps" className="text-sm font-normal">
                  {t('showTimestampsOption')}
                </Label>
                <Switch
                  id="show-timestamps"
                  checked={showTimestamps}
                  onCheckedChange={setShowTimestamps}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="show-model" className="text-sm font-normal">
                  {t('showModelOption')}
                </Label>
                <Switch id="show-model" checked={showModel} onCheckedChange={setShowModel} />
              </div>
            </div>

            {/* Info */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{t('messageCountLimit', { count: messages.length, max: maxMessages })}</span>
              <Badge variant="outline">
                {t('estimatedSize')}: {estimatedSize}
              </Badge>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleCopy}
                variant="outline"
                className="flex-1"
                disabled={isCopying || messages.length === 0}
              >
                {isCopying ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : copied ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {copied ? t('copied') : t('copyImageBtn')}
              </Button>
              <Button
                onClick={handleExport}
                className="flex-1"
                disabled={isExporting || messages.length === 0}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isExporting
                  ? t('exportingImage')
                  : t('downloadFormat', { format: format.toUpperCase() })}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ImageExportDialog;
