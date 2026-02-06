'use client';

/**
 * QRCodeGenerator - Styled QR code generator component
 *
 * Features:
 * - Real-time preview
 * - Style preset selection
 * - Logo upload support
 * - Download (PNG/SVG)
 * - Copy to clipboard
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Copy, Check, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import {
  createQRInstance,
  downloadQR,
  copyQRToClipboard,
  QR_PRESETS,
  type QRGeneratorOptions,
} from '@/lib/export/qr';

export interface QRCodeGeneratorProps {
  data: string;
  defaultPreset?: string;
  defaultWidth?: number;
  showDownload?: boolean;
  showCopy?: boolean;
  showPresetSelector?: boolean;
  showSizeSelector?: boolean;
  showLogoUpload?: boolean;
  className?: string;
  onGenerated?: (dataUrl: string) => void;
}

export function QRCodeGenerator({
  data,
  defaultPreset = 'default',
  defaultWidth = 256,
  showDownload = true,
  showCopy = true,
  showPresetSelector = true,
  showSizeSelector = false,
  showLogoUpload = false,
  className = '',
  onGenerated,
}: QRCodeGeneratorProps) {
  const t = useTranslations('export');
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preset, setPreset] = useState(defaultPreset);
  const [width, setWidth] = useState(defaultWidth);
  const [logo, setLogo] = useState<string | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Generate QR code when parameters change
  useEffect(() => {
    if (!containerRef.current || !data) return;

    setIsGenerating(true);

    const options: QRGeneratorOptions = {
      data,
      width,
      height: width,
      preset,
      logo,
      margin: 10,
    };

    // Clear previous QR code
    containerRef.current.innerHTML = '';

    try {
      const qrCode = createQRInstance(options);
      qrCode.append(containerRef.current);

      // Get data URL for callback
      qrCode.getRawData('png').then((blob) => {
        if (blob && onGenerated) {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              onGenerated(reader.result);
            }
          };
          reader.readAsDataURL(blob as Blob);
        }
      });
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      toast.error(t('qrCodeFailed'));
    } finally {
      setIsGenerating(false);
    }
  }, [data, preset, width, logo, onGenerated, t]);

  // Handle download
  const handleDownload = useCallback(
    async (format: 'png' | 'svg') => {
      if (!data) return;

      setIsDownloading(true);
      try {
        const filename = `qrcode-${Date.now()}`;
        await downloadQR(
          {
            data,
            width,
            height: width,
            preset,
            logo,
            margin: 10,
          },
          filename,
          format
        );
        toast.success(format === 'png' ? t('qrDownloadPNG') : t('qrDownloadSVG'));
      } catch (error) {
        console.error('Download failed:', error);
        toast.error(t('exportFailed'));
      } finally {
        setIsDownloading(false);
      }
    },
    [data, width, preset, logo, t]
  );

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!data) return;

    try {
      const success = await copyQRToClipboard({
        data,
        width,
        height: width,
        preset,
        logo,
        margin: 10,
      });

      if (success) {
        setIsCopied(true);
        toast.success(t('qrCopySuccess'));
        setTimeout(() => setIsCopied(false), 2000);
      } else {
        toast.error(t('copyFailed'));
      }
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error(t('copyFailed'));
    }
  }, [data, width, preset, logo, t]);

  // Handle logo upload
  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setLogo(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  // Remove logo
  const handleRemoveLogo = useCallback(() => {
    setLogo(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* QR Code Preview */}
      <div className="flex justify-center">
        <div
          ref={containerRef}
          className="relative flex items-center justify-center rounded-lg border bg-white p-2"
          style={{ minWidth: width, minHeight: width }}
        >
          {isGenerating && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* Preset Selector */}
      {showPresetSelector && (
        <div className="space-y-2">
          <Label>{t('qrPreset')}</Label>
          <Select value={preset} onValueChange={setPreset}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QR_PRESETS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: p.colors.dots }}
                    />
                    <span>{p.nameZh}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Size Selector */}
      {showSizeSelector && (
        <div className="space-y-2">
          <Label>
            {t('qrSize')}: {width}px
          </Label>
          <Slider
            value={[width]}
            onValueChange={([v]) => setWidth(v)}
            min={128}
            max={512}
            step={32}
          />
        </div>
      )}

      {/* Logo Upload */}
      {showLogoUpload && (
        <div className="space-y-2">
          <Label>{t('qrLogo')}</Label>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              {logo ? t('qrChangeLogo') : t('qrAddLogo')}
            </Button>
            {logo && (
              <Button variant="ghost" size="sm" onClick={handleRemoveLogo}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {showDownload && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload('png')}
              disabled={isDownloading || !data}
            >
              {isDownloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              PNG
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload('svg')}
              disabled={isDownloading || !data}
            >
              <Download className="mr-2 h-4 w-4" />
              SVG
            </Button>
          </>
        )}
        {showCopy && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!data}
          >
            {isCopied ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {isCopied ? t('copied') : t('copyImageBtn')}
          </Button>
        )}
      </div>
    </div>
  );
}

export default QRCodeGenerator;
