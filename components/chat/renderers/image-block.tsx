'use client';

/**
 * ImageBlock - Enhanced image renderer with lightbox, zoom, and download
 * Features:
 * - Lightbox modal for fullscreen view
 * - Zoom in/out capability
 * - Download image
 * - Copy image URL
 * - Lazy loading
 * - Alt text display
 * - Image loading states
 */

import { useState, memo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  ZoomIn,
  ZoomOut,
  Download,
  Copy,
  Check,
  Maximize2,
  X,
  ImageIcon,
  ExternalLink,
  RotateCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCopy } from '@/hooks/ui';
import { LoadingAnimation } from './loading-animation';

interface ImageBlockProps {
  src: string;
  alt?: string;
  title?: string;
  className?: string;
  width?: number;
  height?: number;
}

export const ImageBlock = memo(function ImageBlock({
  src,
  alt = '',
  title,
  className,
  width,
  height,
}: ImageBlockProps) {
  const _t = useTranslations('renderer');
  const tToasts = useTranslations('toasts');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const { copy, isCopying } = useCopy({ toastMessage: tToasts('linkCopied') });

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setRotation(0);
  }, []);

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = src.split('/').pop() || 'image';
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(src, '_blank');
    }
  }, [src]);

  const handleCopyUrl = useCallback(async () => {
    await copy(src);
  }, [copy, src]);

  const handleOpenExternal = useCallback(() => {
    window.open(src, '_blank');
  }, [src]);

  if (hasError) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-8 my-4',
          className
        )}
      >
        <ImageIcon className="h-12 w-12 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">Failed to load image</p>
        {alt && <p className="text-xs text-muted-foreground/70 mt-1">{alt}</p>}
        <Button
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={handleOpenExternal}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Open URL
        </Button>
      </div>
    );
  }

  return (
    <>
      <figure
        className={cn(
          'group relative rounded-lg overflow-hidden my-4 inline-block max-w-full',
          className
        )}
      >
        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30 backdrop-blur-[2px]">
            <LoadingAnimation variant="pulse" size="sm" showText={false} className="border-0 bg-transparent p-0" />
          </div>
        )}

        {/* Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          title={title}
          width={width}
          height={height}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'max-w-full h-auto rounded-lg cursor-zoom-in transition-opacity',
            isLoading && 'opacity-0'
          )}
          onClick={() => setIsOpen(true)}
        />

        {/* Hover actions */}
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7 bg-background/80 backdrop-blur-sm"
                onClick={() => setIsOpen(true)}
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>View fullscreen</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7 bg-background/80 backdrop-blur-sm"
                onClick={handleDownload}
              >
                <Download className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7 bg-background/80 backdrop-blur-sm"
                onClick={handleCopyUrl}
                disabled={isCopying}
              >
                {isCopying ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy URL</TooltipContent>
          </Tooltip>
        </div>

        {/* Caption */}
        {(alt || title) && (
          <figcaption className="text-center text-sm text-muted-foreground mt-2 px-2">
            {title || alt}
          </figcaption>
        )}
      </figure>

      {/* Lightbox Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden" showCloseButton={false}>
          <DialogHeader className="absolute top-0 left-0 right-0 z-10 flex flex-row items-center justify-between p-3 bg-gradient-to-b from-black/60 to-transparent">
            <DialogTitle className="text-white text-sm truncate max-w-[60%]">
              {title || alt || 'Image'}
            </DialogTitle>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.5}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom out</TooltipContent>
              </Tooltip>

              <span className="text-white text-xs px-2 min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={handleZoomIn}
                    disabled={zoom >= 3}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom in</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={handleRotate}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rotate</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={handleOpenExternal}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open in new tab</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Close</TooltipContent>
              </Tooltip>
            </div>
          </DialogHeader>

          {/* Image container with zoom/pan */}
          <div
            className="flex items-center justify-center bg-black/90 overflow-auto"
            style={{ height: 'calc(95vh - 60px)' }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleResetView();
              }
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="max-w-none transition-transform duration-200"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
              }}
              draggable={false}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

export default ImageBlock;
