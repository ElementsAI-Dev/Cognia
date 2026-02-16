'use client';

/**
 * ImageGalleryGrid - Grid view for displaying generated images
 */

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
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { ZOOM_LEVELS } from '@/lib/image-studio';
import type { GeneratedImageWithMeta, ImageEditAction } from '@/lib/image-studio';

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
}: ImageGalleryGridProps) {
  if (images.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium">No images yet</h3>
          <p className="text-sm text-muted-foreground">
            Enter a prompt and click Generate to create your first image
          </p>
        </div>
      </div>
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
        {images.map((image) => (
          <Card
            key={image.id}
            className={cn(
              'group cursor-pointer overflow-hidden transition-all hover:shadow-lg',
              selectedImageId === image.id && 'ring-2 ring-primary'
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
                  <TooltipContent>{image.isFavorite ? 'Remove from favorites' : 'Add to favorites'}</TooltipContent>
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
                  <TooltipContent>Preview</TooltipContent>
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
                  <TooltipContent>Download</TooltipContent>
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
                      Inpaint (Upload Mask)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditAction(image, 'mask')}>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Draw Mask & Inpaint
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditAction(image, 'use-for-variation')}>
                      <Layers className="h-4 w-4 mr-2" />
                      Create variations
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEditAction(image, 'crop')}>
                      <Crop className="h-4 w-4 mr-2" />
                      Crop & Transform
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditAction(image, 'adjust')}>
                      <SlidersHorizontal className="h-4 w-4 mr-2" />
                      Adjust Colors
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditAction(image, 'upscale')}>
                      <ZoomIn className="h-4 w-4 mr-2" />
                      Upscale
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditAction(image, 'remove-bg')}>
                      <Eraser className="h-4 w-4 mr-2" />
                      Remove Background
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditAction(image, 'filter')}>
                      <Palette className="h-4 w-4 mr-2" />
                      Apply Filter
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditAction(image, 'text')}>
                      <Type className="h-4 w-4 mr-2" />
                      Add Text/Watermark
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditAction(image, 'draw')}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Draw & Annotate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditAction(image, 'compare')}>
                      <Split className="h-4 w-4 mr-2" />
                      Compare Images
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete(image.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <CardContent className="p-2">
              <p className="text-xs text-muted-foreground truncate">
                {image.prompt}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
