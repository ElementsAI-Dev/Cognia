'use client';

/**
 * FlowNodeThumbnailStrip - Displays media thumbnails in flow chat nodes
 * Shows image/video previews with lightbox support
 */

import { useState, useCallback, memo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useCopy } from '@/hooks/ui';
import type { FlowNodeAttachment } from '@/types/chat/flow-chat';

interface FlowNodeThumbnailStripProps {
  /** Attachments to display */
  attachments: FlowNodeAttachment[];
  /** Maximum thumbnails to show before collapsing */
  maxVisible?: number;
  /** Thumbnail size */
  size?: 'sm' | 'md' | 'lg';
  /** Whether the node is expanded */
  isExpanded?: boolean;
  /** Callback when media is clicked */
  onMediaClick?: (attachment: FlowNodeAttachment, index: number) => void;
  /** Callback when download is requested */
  onDownload?: (attachment: FlowNodeAttachment) => void;
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};

function ThumbnailItem({
  attachment,
  size = 'md',
  onClick,
}: {
  attachment: FlowNodeAttachment;
  size?: 'sm' | 'md' | 'lg';
  onClick: () => void;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const sizeClass = SIZE_CLASSES[size];

  // Render based on attachment type
  if (attachment.type === 'image') {
    return (
      <button
        onClick={onClick}
        className={cn(
          'relative rounded-md overflow-hidden border border-border/50 transition-all',
          'hover:border-primary hover:ring-2 hover:ring-primary/20',
          'focus:outline-none focus:ring-2 focus:ring-primary',
          sizeClass
        )}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}
        {hasError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attachment.thumbnailUrl || attachment.url}
            alt={attachment.name}
            className={cn(
              'h-full w-full object-cover',
              isLoading && 'opacity-0'
            )}
            onLoad={handleLoad}
            onError={handleError}
            loading="lazy"
          />
        )}
      </button>
    );
  }

  if (attachment.type === 'video') {
    return (
      <button
        onClick={onClick}
        className={cn(
          'relative rounded-md overflow-hidden border border-border/50 bg-muted transition-all',
          'hover:border-primary hover:ring-2 hover:ring-primary/20',
          'focus:outline-none focus:ring-2 focus:ring-primary',
          sizeClass
        )}
      >
        {attachment.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attachment.thumbnailUrl}
            alt={attachment.name}
            className="h-full w-full object-cover"
            onLoad={handleLoad}
            onError={handleError}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Video className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <Play className="h-3 w-3 text-white" />
        </div>
        {attachment.duration && (
          <span className="absolute bottom-0.5 right-0.5 text-[8px] text-white bg-black/60 px-0.5 rounded">
            {formatDuration(attachment.duration)}
          </span>
        )}
      </button>
    );
  }

  if (attachment.type === 'audio') {
    return (
      <button
        onClick={onClick}
        className={cn(
          'relative rounded-md overflow-hidden border border-border/50 bg-muted transition-all',
          'hover:border-primary hover:ring-2 hover:ring-primary/20',
          'focus:outline-none focus:ring-2 focus:ring-primary flex items-center justify-center',
          sizeClass
        )}
      >
        <Music className="h-4 w-4 text-muted-foreground" />
        {attachment.duration && (
          <span className="absolute bottom-0.5 right-0.5 text-[8px] text-muted-foreground">
            {formatDuration(attachment.duration)}
          </span>
        )}
      </button>
    );
  }

  // File type
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative rounded-md overflow-hidden border border-border/50 bg-muted transition-all',
        'hover:border-primary hover:ring-2 hover:ring-primary/20',
        'focus:outline-none focus:ring-2 focus:ring-primary flex items-center justify-center',
        sizeClass
      )}
    >
      <FileText className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FlowNodeThumbnailStripComponent({
  attachments,
  maxVisible = 4,
  size = 'md',
  isExpanded = false,
  onMediaClick,
  onDownload,
  className,
}: FlowNodeThumbnailStripProps) {
  const t = useTranslations('flowChat');
  const tToasts = useTranslations('toasts');
  const { copy, isCopying } = useCopy({ toastMessage: tToasts('linkCopied') });

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const visibleAttachments = isExpanded
    ? attachments
    : attachments.slice(0, maxVisible);
  const hiddenCount = attachments.length - visibleAttachments.length;

  const currentAttachment = attachments[currentIndex];

  const handleThumbnailClick = useCallback(
    (attachment: FlowNodeAttachment, index: number) => {
      onMediaClick?.(attachment, index);
      setCurrentIndex(index);
      setLightboxOpen(true);
      setZoom(1);
      setRotation(0);
    },
    [onMediaClick]
  );

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : attachments.length - 1));
    setZoom(1);
    setRotation(0);
  }, [attachments.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < attachments.length - 1 ? prev + 1 : 0));
    setZoom(1);
    setRotation(0);
  }, [attachments.length]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!currentAttachment) return;
    onDownload?.(currentAttachment);

    try {
      const response = await fetch(currentAttachment.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = currentAttachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      window.open(currentAttachment.url, '_blank');
    }
  }, [currentAttachment, onDownload]);

  const handleCopyUrl = useCallback(async () => {
    if (currentAttachment) {
      await copy(currentAttachment.url);
    }
  }, [currentAttachment, copy]);

  const handleOpenExternal = useCallback(() => {
    if (currentAttachment) {
      window.open(currentAttachment.url, '_blank');
    }
  }, [currentAttachment]);

  if (attachments.length === 0) {
    return null;
  }

  return (
    <>
      <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
        {visibleAttachments.map((attachment, index) => (
          <ThumbnailItem
            key={attachment.id}
            attachment={attachment}
            size={size}
            onClick={() => handleThumbnailClick(attachment, index)}
          />
        ))}
        {hiddenCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleThumbnailClick(attachments[maxVisible], maxVisible)}
                className={cn(
                  'rounded-md border border-border/50 bg-muted/50 transition-all',
                  'hover:border-primary hover:bg-muted flex items-center justify-center',
                  SIZE_CLASSES[size]
                )}
              >
                <span className="text-xs font-medium text-muted-foreground">
                  +{hiddenCount}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent>{t('moreAttachments', { count: hiddenCount })}</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden"
          showCloseButton={false}
        >
          <DialogHeader className="absolute top-0 left-0 right-0 z-10 flex flex-row items-center justify-between p-3 bg-gradient-to-b from-black/60 to-transparent">
            <div>
              <DialogTitle className="text-white text-sm truncate max-w-[40%]">
                {currentAttachment?.name}
                {currentAttachment?.size && (
                  <span className="ml-2 text-xs opacity-70">
                    ({formatFileSize(currentAttachment.size)})
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Media viewer for {currentAttachment?.name}
              </DialogDescription>
            </div>

            <div className="flex items-center gap-1">
              {/* Navigation */}
              {attachments.length > 1 && (
                <>
                  <Badge variant="secondary" className="text-xs mr-2">
                    {currentIndex + 1} / {attachments.length}
                  </Badge>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:bg-white/20"
                        onClick={handlePrevious}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Previous</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:bg-white/20"
                        onClick={handleNext}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Next</TooltipContent>
                  </Tooltip>
                </>
              )}

              {/* Zoom controls (for images) */}
              {currentAttachment?.type === 'image' && (
                <>
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
                </>
              )}

              {/* Actions */}
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
                    onClick={handleCopyUrl}
                    disabled={isCopying}
                  >
                    {isCopying ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy URL</TooltipContent>
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
                    onClick={() => setLightboxOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Close</TooltipContent>
              </Tooltip>
            </div>
          </DialogHeader>

          {/* Content area */}
          <div
            className="flex items-center justify-center bg-black/90 overflow-auto"
            style={{ height: 'calc(95vh - 60px)' }}
          >
            {currentAttachment?.type === 'image' && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentAttachment.url}
                alt={currentAttachment.name}
                className="max-w-none transition-transform duration-200"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                }}
                draggable={false}
              />
            )}

            {currentAttachment?.type === 'video' && (
              <video
                src={currentAttachment.url}
                controls
                autoPlay
                className="max-w-full max-h-full"
                style={{ maxHeight: 'calc(95vh - 80px)' }}
              >
                <track kind="captions" />
              </video>
            )}

            {currentAttachment?.type === 'audio' && (
              <div className="flex flex-col items-center gap-4 p-8">
                <Music className="h-24 w-24 text-white/50" />
                <p className="text-white text-lg">{currentAttachment.name}</p>
                <audio src={currentAttachment.url} controls autoPlay className="w-80">
                  <track kind="captions" />
                </audio>
              </div>
            )}

            {currentAttachment?.type === 'file' && (
              <div className="flex flex-col items-center gap-4 p-8">
                <FileText className="h-24 w-24 text-white/50" />
                <p className="text-white text-lg">{currentAttachment.name}</p>
                {currentAttachment.size && (
                  <p className="text-white/60">{formatFileSize(currentAttachment.size)}</p>
                )}
                <Button onClick={handleDownload} variant="secondary">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            )}
          </div>

          {/* Thumbnail strip at bottom */}
          {attachments.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
              <div className="flex items-center justify-center gap-1.5 overflow-x-auto py-1">
                {attachments.map((attachment, index) => (
                  <button
                    key={attachment.id}
                    onClick={() => {
                      setCurrentIndex(index);
                      setZoom(1);
                      setRotation(0);
                    }}
                    className={cn(
                      'h-12 w-12 rounded-md overflow-hidden border-2 transition-all shrink-0',
                      index === currentIndex
                        ? 'border-white ring-2 ring-white/50'
                        : 'border-white/20 opacity-60 hover:opacity-100'
                    )}
                  >
                    {attachment.type === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={attachment.thumbnailUrl || attachment.url}
                        alt={attachment.name}
                        className="h-full w-full object-cover"
                      />
                    ) : attachment.type === 'video' ? (
                      <div className="h-full w-full bg-muted flex items-center justify-center">
                        <Video className="h-4 w-4 text-white/60" />
                      </div>
                    ) : attachment.type === 'audio' ? (
                      <div className="h-full w-full bg-muted flex items-center justify-center">
                        <Music className="h-4 w-4 text-white/60" />
                      </div>
                    ) : (
                      <div className="h-full w-full bg-muted flex items-center justify-center">
                        <FileText className="h-4 w-4 text-white/60" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export const FlowNodeThumbnailStrip = memo(FlowNodeThumbnailStripComponent);
export default FlowNodeThumbnailStrip;
