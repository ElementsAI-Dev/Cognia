import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { Session, UIMessage } from '@/types';
import type { ImageFormatOption, ImageScaleOption } from '@/types/export/image-export';
import type { ThemeOption } from '@/types/export/common';
import {
  downloadAsImage,
  generateThumbnail,
  copyImageToClipboard,
  estimateImageSize,
} from '@/lib/export/image/image-export';

/**
 * Hook for image export — format/theme/scale/quality state, preview generation, download, copy
 */
export function useImageExport(
  session: Session,
  messages: UIMessage[],
  open: boolean,
  t: (key: string) => string
) {
  const [isExporting, setIsExporting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  // Export options
  const [format, setFormat] = useState<ImageFormatOption>('png');
  const [theme, setTheme] = useState<ThemeOption>('light');
  const [scale, setScale] = useState<ImageScaleOption>(2);
  const [quality, setQuality] = useState(92);
  const [includeHeader, setIncludeHeader] = useState(true);
  const [includeFooter, setIncludeFooter] = useState(true);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [showModel, setShowModel] = useState(true);
  const [maxMessages] = useState(20);

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

  const handleExport = useCallback(async (onSuccess?: () => void) => {
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
      onSuccess?.();
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(t('exportFailed'));
    } finally {
      setIsExporting(false);
    }
  }, [session, messages, maxMessages, format, theme, scale, quality, includeHeader, includeFooter, showTimestamps, showModel, t]);

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
  }, [session, messages, maxMessages, theme, scale, includeHeader, includeFooter, showTimestamps, showModel, t]);

  const estimatedSize = estimateImageSize(Math.min(messages.length, maxMessages), {
    format,
    scale,
    width: 800,
  });

  return {
    // State
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
    // Setters
    setFormat,
    setTheme,
    setScale,
    setQuality,
    setIncludeHeader,
    setIncludeFooter,
    setShowTimestamps,
    setShowModel,
    // Actions
    handleExport,
    handleCopy,
  };
}
