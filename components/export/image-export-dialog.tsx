'use client';

/**
 * ImageExportDialog - Export chat conversations as images
 *
 * Supports: PNG, JPG, WebP with customization options
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Image as ImageIcon,
  Download,
  Copy,
  Check,
  Loader2,
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
import { cn } from '@/lib/utils';
import type { ImageExportDialogProps } from '@/types/export/image-export';
import type { ImageFormatOption } from '@/types/export/image-export';
import type { ImageScaleOption } from '@/types/export/image-export';
import type { ThemeOption } from '@/types/export/common';
import { useExportMessages, useImageExport } from '@/hooks/export';
import { IMAGE_THEME_OPTIONS, IMAGE_SCALE_OPTIONS } from '@/lib/export/constants';
import { getImageExportFormats } from '@/lib/export/image/image-export';

export function ImageExportDialog({ session, trigger }: ImageExportDialogProps) {
  const t = useTranslations('export');
  const [open, setOpen] = useState(false);

  const formats = getImageExportFormats();
  const { messages, isLoading } = useExportMessages(session.id, open);

  const {
    isExporting,
    isCopying,
    copied,
    preview,
    isGeneratingPreview,
    format,
    theme,
    scale,
    quality,
    includeHeader,
    includeFooter,
    showTimestamps,
    showModel,
    maxMessages,
    estimatedSize,
    setFormat,
    setTheme,
    setScale,
    setQuality,
    setIncludeHeader,
    setIncludeFooter,
    setShowTimestamps,
    setShowModel,
    handleExport,
    handleCopy,
  } = useImageExport(session, messages, open, t);

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
                  onValueChange={(v) => setFormat(v as ImageFormatOption)}
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
                  {IMAGE_THEME_OPTIONS.map((themeOpt) => {
                    const ThemeIcon = themeOpt.icon;
                    return (
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
                          <ThemeIcon className="h-4 w-4" />
                          <span className="text-xs">{t(themeOpt.labelKey)}</span>
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>
            </div>

            {/* Scale */}
            <div className="space-y-2">
              <Label>{t('imageScale')}</Label>
              <RadioGroup
                value={String(scale)}
                onValueChange={(v) => setScale(Number(v) as ImageScaleOption)}
                className="flex gap-2"
              >
                {IMAGE_SCALE_OPTIONS.map((s) => (
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
                onClick={() => handleExport(() => setOpen(false))}
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
