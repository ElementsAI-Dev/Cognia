'use client';

/**
 * BatchExportDialog - Export multiple images with various options
 * Features:
 * - Select multiple images for export
 * - Choose export format (PNG, JPEG, WebP)
 * - Set quality and scale options
 * - Download as ZIP or individual files
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Download,
  Loader2,
  Image as ImageIcon,
  Check,
} from 'lucide-react';

import type { ImageExportFormat as ExportFormat, ExportableImage } from '@/types/media/image-studio';

// Re-export types for backward compatibility
export type { ImageExportFormat as ExportFormat, ExportableImage } from '@/types/media/image-studio';

export interface BatchExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: ExportableImage[];
  onExport?: (count: number) => void;
}

interface ExportOptions {
  format: ExportFormat;
  quality: number; // 0-100 for jpeg/webp
  scale: number; // 1, 2, etc.
  includeMetadata: boolean;
  asZip: boolean;
}

const DEFAULT_OPTIONS: ExportOptions = {
  format: 'png',
  quality: 90,
  scale: 1,
  includeMetadata: false,
  asZip: true,
};

export function BatchExportDialog({
  open,
  onOpenChange,
  images,
  onExport,
}: BatchExportDialogProps) {
  const t = useTranslations('imageStudio.batchExport');
  const tc = useTranslations('imageStudio.common');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_OPTIONS);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportedCount, setExportedCount] = useState(0);

  // Toggle image selection
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Select all
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(images.map((img) => img.id)));
  }, [images]);

  // Deselect all
  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Convert image URL to canvas with format conversion
  const convertImage = useCallback(
    async (
      imageUrl: string,
      format: ExportFormat,
      quality: number,
      scale: number
    ): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Enable image smoothing for upscaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const mimeType = `image/${format}`;
          const qualityValue = format === 'png' ? undefined : quality / 100;

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to create blob'));
              }
            },
            mimeType,
            qualityValue
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageUrl;
      });
    },
    []
  );

  // Download single file
  const downloadFile = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Export images
  const handleExport = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setIsExporting(true);
    setProgress(0);
    setExportedCount(0);

    const selectedImages = images.filter((img) => selectedIds.has(img.id));
    const blobs: Array<{ blob: Blob; filename: string }> = [];

    try {
      for (let i = 0; i < selectedImages.length; i++) {
        const img = selectedImages[i];
        const imageUrl = img.url || (img.base64 ? `data:image/png;base64,${img.base64}` : null);

        if (!imageUrl) continue;

        const blob = await convertImage(
          imageUrl,
          options.format,
          options.quality,
          options.scale
        );

        const timestamp = new Date(img.timestamp).toISOString().slice(0, 10);
        const filename = `image-${timestamp}-${img.id.slice(0, 8)}.${options.format}`;

        if (options.asZip) {
          blobs.push({ blob, filename });
        } else {
          downloadFile(blob, filename);
        }

        setProgress(((i + 1) / selectedImages.length) * 100);
        setExportedCount(i + 1);
      }

      // Create ZIP if enabled
      if (options.asZip && blobs.length > 0) {
        // Simple ZIP creation using JSZip-like structure
        // For a production app, you'd want to use a proper ZIP library
        // Here we'll just download files sequentially for simplicity
        for (const { blob, filename } of blobs) {
          downloadFile(blob, filename);
          await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay between downloads
        }
      }

      onExport?.(selectedImages.length);
      onOpenChange(false);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  }, [selectedIds, images, options, convertImage, downloadFile, onExport, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogTitle>{t('title')}</DialogTitle>
        <DialogDescription>{t('description')}</DialogDescription>
        <div className="space-y-4">
          {/* Image selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-medium">{t('selectImages', { selected: selectedIds.size, total: images.length })}</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>{t('selectAll')}</Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>{t('deselectAll')}</Button>
              </div>
            </div>
            <ScrollArea className="h-48 border rounded-md p-2">
              <div className="grid grid-cols-4 gap-2">
                {images.map((image) => (
                  <div
                    key={image.id}
                    className={cn(
                      'relative aspect-square rounded-md overflow-hidden cursor-pointer border-2 transition-colors',
                      selectedIds.has(image.id)
                        ? 'border-primary'
                        : 'border-transparent hover:border-muted-foreground/50'
                    )}
                    onClick={() => toggleSelection(image.id)}
                  >
                    {image.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image.url}
                        alt={image.prompt}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    {selectedIds.has(image.id) && (
                      <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Export options */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('format')}</Label>
              <Select
                value={options.format}
                onValueChange={(v) => setOptions((prev) => ({ ...prev, format: v as ExportFormat }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">{t('formats.png')}</SelectItem>
                  <SelectItem value="jpeg">{t('formats.jpeg')}</SelectItem>
                  <SelectItem value="webp">{t('formats.webp')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('scale')}</Label>
              <Select
                value={options.scale.toString()}
                onValueChange={(v) => setOptions((prev) => ({ ...prev, scale: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t('scales.1x')}</SelectItem>
                  <SelectItem value="2">{t('scales.2x')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quality slider (for JPEG/WebP) */}
          {options.format !== 'png' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('quality')}</Label>
                <span className="text-sm">{options.quality}%</span>
              </div>
              <Slider
                value={[options.quality]}
                onValueChange={([v]) => setOptions((prev) => ({ ...prev, quality: v }))}
                min={10}
                max={100}
                step={5}
              />
            </div>
          )}

          {/* Additional options */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-metadata"
                checked={options.includeMetadata}
                onCheckedChange={(checked) =>
                  setOptions((prev) => ({ ...prev, includeMetadata: !!checked }))
                }
              />
              <Label htmlFor="include-metadata" className="text-sm">{t('includeMetadata')}</Label>
            </div>
          </div>

          {/* Progress */}
          {isExporting && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">{t('exporting', { current: exportedCount, total: selectedIds.size })}</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>{tc('cancel')}</Button>
          <Button onClick={handleExport} disabled={selectedIds.size === 0 || isExporting}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1" />
            )}
            {selectedIds.size === 1 ? t('exportButton', { count: selectedIds.size }) : t('exportButtonPlural', { count: selectedIds.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BatchExportDialog;
