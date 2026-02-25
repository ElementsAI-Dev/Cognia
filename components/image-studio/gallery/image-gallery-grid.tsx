'use client';

/**
 * ImageGalleryGrid - Grid view for displaying generated images
 */

import { useTranslations } from 'next-intl';
import {
  Download,
  Maximize2,
  Star,
  StarOff,
  Clock,
  MoreHorizontal,
  Brush,
  Layers,
  Crop,
  SlidersHorizontal,
  ZoomIn,
  Eraser,
  Wand2,
  Palette,
  Type,
  Pencil,
  Split,
  Trash2,
  Sparkles,
  Dices,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ZOOM_LEVELS, PROMPT_TEMPLATES } from '@/lib/image-studio';
import type { GeneratedImageWithMeta, ImageEditAction } from '@/lib/image-studio';

const CATEGORY_EMOJI: Record<string, string> = {
  nature: '🌿',
  portrait: '📷',
  art: '🎨',
  genre: '✨',
  commercial: '💼',
};

export type { ImageEditAction };

export interface ImageGalleryGridProps {
  images: GeneratedImageWithMeta[];
  selectedImageId: string | null;
  zoomLevel: number;
  onSelectImage: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onPreview: (image: GeneratedImageWithMeta) => void;
  onDownload: (image: GeneratedImageWithMeta) => void;
  onDelete: (id: string) => void;
  onEditAction: (image: GeneratedImageWithMeta, action: ImageEditAction) => void;
  onApplyTemplate?: (prompt: string) => void;
  isGenerating?: boolean;
  generatingPrompt?: string;
  onCancelGeneration?: () => void;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ImageGalleryGrid({
  images,
  selectedImageId,
  zoomLevel,
  onSelectImage,
  onToggleFavorite,
  onPreview,
  onDownload,
  onDelete,
  onEditAction,
  onApplyTemplate,
  isGenerating,
  generatingPrompt,
  onCancelGeneration,
}: ImageGalleryGridProps) {
  const t = useTranslations('imageGeneration');
  if (images.length === 0) {
    const handleRandomInspiration = () => {
      const random = PROMPT_TEMPLATES[Math.floor(Math.random() * PROMPT_TEMPLATES.length)];
      onApplyTemplate?.(random.prompt);
    };

    return (
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6 max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">{t('emptyTitle')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('emptyDescription')}
            </p>
          </div>

          {/* Random Inspiration Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRandomInspiration}
              className="gap-2"
            >
              <Dices className="h-4 w-4" />
              {t('randomInspiration')}
            </Button>
          </div>

          {/* Template Cards Grid */}
          <div className="grid grid-cols-3 gap-3">
            {PROMPT_TEMPLATES.map((template) => (
              <button
                key={template.label}
                onClick={() => onApplyTemplate?.(template.prompt)}
                className={cn(
                  'group text-left p-3 rounded-lg border bg-card transition-all',
                  'hover:border-primary/50 hover:shadow-md hover:bg-accent/50',
                  'dark:hover:shadow-primary/5'
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-base">{CATEGORY_EMOJI[template.category] || '✨'}</span>
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">{template.label}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {template.prompt}
                </p>
              </button>
            ))}
          </div>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div
        className="p-4 grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${ZOOM_LEVELS[zoomLevel].cols}, minmax(0, 1fr))`,
        }}
      >
        {/* Skeleton placeholder while generating */}
        {isGenerating && (
          <Card className="overflow-hidden border-dashed border-primary/40 animate-in fade-in">
            <div className="aspect-square relative bg-muted">
              <Skeleton className="absolute inset-0 rounded-none" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-xs text-muted-foreground text-center line-clamp-2">
                  {generatingPrompt}
                </p>
                {onCancelGeneration && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-6"
                    onClick={onCancelGeneration}
                  >
                    {t('cancel')}
                  </Button>
                )}
              </div>
            </div>
            <CardContent className="p-2">
              <p className="text-xs text-muted-foreground">{t('generating')}</p>
            </CardContent>
          </Card>
        )}
        {images.map((image) => (
          <Card
            key={image.id}
            className={cn(
              'group cursor-pointer overflow-hidden transition-all hover:shadow-lg dark:border-border/50 dark:shadow-md dark:shadow-black/20 dark:hover:shadow-primary/10',
              selectedImageId === image.id && 'ring-2 ring-primary shadow-lg shadow-primary/20'
            )}
            onClick={() => onSelectImage(image.id)}
          >
            <div className="aspect-square relative">
              {image.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image.url}
                  alt={image.prompt}
                  className="w-full h-full object-cover"
                />
              )}
              {/* Favorite badge */}
              {image.isFavorite && (
                <div className="absolute top-2 right-2">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                </div>
              )}
              {/* Timestamp */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-white flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(image.timestamp)}
                </span>
              </div>
              {/* Action overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(image.id);
                      }}
                    >
                      {image.isFavorite ? <Star className="h-4 w-4 fill-current text-yellow-400" /> : <StarOff className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{image.isFavorite ? t('removeFromFavorites') : t('addToFavorites')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreview(image);
                      }}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('preview')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload(image);
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('download')}</TooltipContent>
                </Tooltip>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEditAction(image, 'use-for-edit')}>
                      <Brush className="h-4 w-4 mr-2" />
                      {t('inpaintUploadMask')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditAction(image, 'mask')}>
                      <Wand2 className="h-4 w-4 mr-2" />
                      {t('drawMaskInpaint')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditAction(image, 'use-for-variation')}>
                      <Layers className="h-4 w-4 mr-2" />
                      {t('createVariations')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEditAction(image, 'crop')}>
                      <Crop className="h-4 w-4 mr-2" />
                      {t('cropTransform')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditAction(image, 'adjust')}>
                      <SlidersHorizontal className="h-4 w-4 mr-2" />
                      {t('adjustColors')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditAction(image, 'upscale')}>
                      <ZoomIn className="h-4 w-4 mr-2" />
                      {t('upscale')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditAction(image, 'remove-bg')}>
                      <Eraser className="h-4 w-4 mr-2" />
                      {t('removeBackground')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditAction(image, 'filter')}>
                      <Palette className="h-4 w-4 mr-2" />
                      {t('applyFilter')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditAction(image, 'text')}>
                      <Type className="h-4 w-4 mr-2" />
                      {t('addTextWatermark')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditAction(image, 'draw')}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {t('drawAnnotate')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditAction(image, 'compare')}>
                      <Split className="h-4 w-4 mr-2" />
                      {t('compareImages')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete(image.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <CardContent className="p-2 space-y-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs text-muted-foreground truncate cursor-default">
                    {image.prompt}
                  </p>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-xs">{image.prompt}</p>
                </TooltipContent>
              </Tooltip>
              <div className="flex items-center gap-1 flex-wrap">
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{image.model}</Badge>
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">{image.settings.size.replace('x', '×')}</Badge>
                {image.parentId && (
                  <Badge variant="default" className="text-[10px] px-1 py-0 h-4">v{image.version || 2}</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
