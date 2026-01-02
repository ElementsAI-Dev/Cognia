'use client';

/**
 * ImageEditorPanel - Main editing panel that switches between different editing modes
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Crop,
  SlidersHorizontal,
  ZoomIn,
  Eraser,
  Brush,
  X,
  Type,
  Pencil,
  Sparkles,
} from 'lucide-react';
import { MaskCanvas } from './mask-canvas';
import { ImageCropper } from './image-cropper';
import { ImageAdjustmentsPanel } from './image-adjustments';
import { ImageUpscaler } from './image-upscaler';
import { BackgroundRemover } from './background-remover';
import { TextOverlay } from './text-overlay';
import { DrawingTools } from './drawing-tools';
import { FiltersGallery } from './filters-gallery';

import type { EditorMode } from '@/types';

// Re-export types for backward compatibility
export type { EditorMode } from '@/types';

export interface ImageEditorPanelProps {
  imageUrl: string;
  initialMode?: EditorMode;
  onSave?: (result: { dataUrl: string; mode: EditorMode }) => void;
  onCancel?: () => void;
  className?: string;
}

interface EditorTab {
  id: EditorMode;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const EDITOR_TABS: EditorTab[] = [
  {
    id: 'mask',
    label: 'Mask',
    icon: <Brush className="h-4 w-4" />,
    description: 'Draw mask for inpainting',
  },
  {
    id: 'crop',
    label: 'Crop',
    icon: <Crop className="h-4 w-4" />,
    description: 'Crop, rotate, and flip',
  },
  {
    id: 'adjust',
    label: 'Adjust',
    icon: <SlidersHorizontal className="h-4 w-4" />,
    description: 'Brightness, contrast, etc.',
  },
  {
    id: 'filters',
    label: 'Filters',
    icon: <Sparkles className="h-4 w-4" />,
    description: 'Apply filter presets',
  },
  {
    id: 'text',
    label: 'Text',
    icon: <Type className="h-4 w-4" />,
    description: 'Add text and watermarks',
  },
  {
    id: 'draw',
    label: 'Draw',
    icon: <Pencil className="h-4 w-4" />,
    description: 'Annotate with shapes',
  },
  {
    id: 'upscale',
    label: 'Upscale',
    icon: <ZoomIn className="h-4 w-4" />,
    description: 'Increase resolution',
  },
  {
    id: 'remove-bg',
    label: 'Remove BG',
    icon: <Eraser className="h-4 w-4" />,
    description: 'Remove background',
  },
];

export function ImageEditorPanel({
  imageUrl,
  initialMode = 'crop',
  onSave,
  onCancel,
  className,
}: ImageEditorPanelProps) {
  const [activeMode, setActiveMode] = useState<EditorMode>(initialMode);
  const [maskBase64, setMaskBase64] = useState<string | null>(null);

  const handleMaskSave = (dataUrl: string) => {
    setMaskBase64(dataUrl);
    onSave?.({ dataUrl, mode: 'mask' });
  };

  const handleCropApply = (result: { dataUrl: string }) => {
    onSave?.({ dataUrl: result.dataUrl, mode: 'crop' });
  };

  const handleAdjustApply = (dataUrl: string) => {
    onSave?.({ dataUrl, mode: 'adjust' });
  };

  const handleUpscaleApply = (result: { dataUrl: string }) => {
    onSave?.({ dataUrl: result.dataUrl, mode: 'upscale' });
  };

  const handleRemoveBgApply = (result: { dataUrl: string }) => {
    onSave?.({ dataUrl: result.dataUrl, mode: 'remove-bg' });
  };

  const handleTextApply = (result: { dataUrl: string }) => {
    onSave?.({ dataUrl: result.dataUrl, mode: 'text' });
  };

  const handleDrawApply = (result: { dataUrl: string }) => {
    onSave?.({ dataUrl: result.dataUrl, mode: 'draw' });
  };

  const handleFiltersApply = (result: { dataUrl: string }) => {
    onSave?.({ dataUrl: result.dataUrl, mode: 'filters' });
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with mode tabs */}
      <div className="flex items-center justify-between border-b p-2">
        <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as EditorMode)}>
          <TabsList>
            {EDITOR_TABS.map((tab) => (
              <Tooltip key={tab.id}>
                <TooltipTrigger asChild>
                  <TabsTrigger value={tab.id} className="gap-1.5">
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>{tab.description}</TooltipContent>
              </Tooltip>
            ))}
          </TabsList>
        </Tabs>

        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-auto p-4">
        {activeMode === 'mask' && (
          <MaskCanvas
            imageUrl={imageUrl}
            onMaskChange={handleMaskSave}
            className="h-full"
          />
        )}

        {activeMode === 'crop' && (
          <ImageCropper
            imageUrl={imageUrl}
            onApply={handleCropApply}
            onCancel={onCancel}
            className="h-full"
          />
        )}

        {activeMode === 'adjust' && (
          <ImageAdjustmentsPanel
            imageUrl={imageUrl}
            onApply={handleAdjustApply}
            onCancel={onCancel}
            className="h-full"
          />
        )}

        {activeMode === 'upscale' && (
          <ImageUpscaler
            imageUrl={imageUrl}
            onUpscale={handleUpscaleApply}
            onCancel={onCancel}
            className="h-full"
          />
        )}

        {activeMode === 'remove-bg' && (
          <BackgroundRemover
            imageUrl={imageUrl}
            onRemove={handleRemoveBgApply}
            onCancel={onCancel}
            className="h-full"
          />
        )}

        {activeMode === 'text' && (
          <TextOverlay
            imageUrl={imageUrl}
            onApply={handleTextApply}
            onCancel={onCancel}
            className="h-full"
          />
        )}

        {activeMode === 'draw' && (
          <DrawingTools
            imageUrl={imageUrl}
            onApply={handleDrawApply}
            onCancel={onCancel}
            className="h-full"
          />
        )}

        {activeMode === 'filters' && (
          <FiltersGallery
            imageUrl={imageUrl}
            onApply={handleFiltersApply}
            onCancel={onCancel}
            className="h-full"
          />
        )}
      </div>

      {/* Footer with mask info if in mask mode */}
      {activeMode === 'mask' && maskBase64 && (
        <div className="border-t p-2 text-xs text-muted-foreground">
          Mask ready for inpainting
        </div>
      )}
    </div>
  );
}

export default ImageEditorPanel;
