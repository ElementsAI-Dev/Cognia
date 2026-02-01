'use client';

/**
 * ImageEditorPanel - Main editing panel that switches between different editing modes
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { MaskCanvas } from '../tools/mask-canvas';
import { ImageCropper } from '../tools/image-cropper';
import { ImageAdjustmentsPanel } from '../adjustments/image-adjustments';
import { ImageUpscaler } from '../ai/image-upscaler';
import { BackgroundRemover } from '../ai/background-remover';
import { TextOverlay } from '../tools/text-overlay';
import { DrawingTools } from '../tools/drawing-tools';
import { FiltersGallery } from '../adjustments/filters-gallery';

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

const EDITOR_TAB_IDS: EditorMode[] = ['mask', 'crop', 'adjust', 'filters', 'text', 'draw', 'upscale', 'remove-bg'];

const EDITOR_TAB_ICONS: Record<EditorMode, React.ReactNode> = {
  mask: <Brush className="h-4 w-4" />,
  crop: <Crop className="h-4 w-4" />,
  adjust: <SlidersHorizontal className="h-4 w-4" />,
  filters: <Sparkles className="h-4 w-4" />,
  text: <Type className="h-4 w-4" />,
  draw: <Pencil className="h-4 w-4" />,
  upscale: <ZoomIn className="h-4 w-4" />,
  'remove-bg': <Eraser className="h-4 w-4" />,
};

export function ImageEditorPanel({
  imageUrl,
  initialMode = 'crop',
  onSave,
  onCancel,
  className,
}: ImageEditorPanelProps) {
  const t = useTranslations('imageStudio.editorPanel');
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
            {EDITOR_TAB_IDS.map((id) => (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <TabsTrigger value={id} className="gap-1.5">
                    {EDITOR_TAB_ICONS[id]}
                    <span className="hidden sm:inline">{t(`modes.${id}`)}</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>{t(`descriptions.${id}`)}</TooltipContent>
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
          {t('maskReadyForInpainting')}
        </div>
      )}
    </div>
  );
}

export default ImageEditorPanel;
