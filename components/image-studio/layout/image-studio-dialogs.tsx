'use client';

/**
 * ImageStudioDialogs - Preview, editing, batch export dialogs for Image Studio
 */

import {
  Split,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  BatchExportDialog,
} from '../export/batch-export-dialog';
import { ImageComparison } from '../core/image-comparison';
import { ImageEditorPanel } from '../core/image-editor-panel';
import { ImagePreview } from '../core/image-preview';
import type {
  GeneratedImageWithMeta,
  ImageDialogEditMode,
  ImageEditorSaveResult,
} from '@/lib/image-studio';
import type { EditorMode } from '@/types/media/image-studio';

export type EditMode = ImageDialogEditMode;
export type EditorSaveResult = ImageEditorSaveResult;

export interface ImageStudioDialogsProps {
  // Preview dialog
  previewImage: GeneratedImageWithMeta | null;
  onPreviewClose: () => void;
  previewZoom: number;
  previewPan: { x: number; y: number };
  onPreviewZoomChange: (zoom: number) => void;
  onPreviewPanChange: (x: number, y: number) => void;
  showHistogram: boolean;
  histogramData: { red: number[]; green: number[]; blue: number[]; luminance: number[] } | null;
  // Advanced editor state for preview
  advancedEditorImageData: ImageData | null;
  advancedEditorOriginalImageData: ImageData | null;
  // Editing dialog
  editingImage: GeneratedImageWithMeta | null;
  editMode: EditMode;
  onEditingClose: () => void;
  compareBeforeImage: string | null;
  onCompareClose: () => void;
  onEditorSave: (result: EditorSaveResult) => void;
  // Mask inpainting
  maskDataUrl: string | null;
  onApplyInpainting: () => void;
  onMaskCancel: () => void;
  isGenerating: boolean;
  // Batch export
  showExportDialog: boolean;
  onExportDialogChange: (show: boolean) => void;
  allImages: GeneratedImageWithMeta[];
}

export function ImageStudioDialogs({
  previewImage,
  onPreviewClose,
  previewZoom,
  previewPan,
  onPreviewZoomChange,
  onPreviewPanChange,
  showHistogram,
  histogramData,
  advancedEditorImageData,
  advancedEditorOriginalImageData,
  editingImage,
  editMode,
  onEditingClose,
  compareBeforeImage,
  onCompareClose,
  onEditorSave,
  maskDataUrl,
  onApplyInpainting,
  onMaskCancel,
  isGenerating,
  showExportDialog,
  onExportDialogChange,
  allImages,
}: ImageStudioDialogsProps) {
  return (
    <>
      {/* Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => onPreviewClose()}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {previewImage?.url && advancedEditorImageData ? (
            <div className="h-[85vh] p-4">
              <ImagePreview
                originalImage={advancedEditorOriginalImageData}
                editedImage={advancedEditorImageData}
                zoom={previewZoom}
                panX={previewPan.x}
                panY={previewPan.y}
                showHistogram={showHistogram}
                histogram={histogramData}
                onZoomChange={onPreviewZoomChange}
                onPanChange={(x, y) => onPreviewPanChange(x, y)}
                className="h-full"
              />
            </div>
          ) : previewImage?.url ? (
            <div className="flex items-center justify-center p-4 max-h-[85vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage.url}
                alt={previewImage.prompt}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Advanced Editing Dialog */}
      <Dialog open={!!editingImage && !!editMode} onOpenChange={() => onEditingClose()}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
          {editMode === 'compare' ? (
            <>
              <DialogHeader className="p-4 border-b">
                <DialogTitle className="flex items-center gap-2">
                  <Split className="h-5 w-5" /> Compare Images
                </DialogTitle>
              </DialogHeader>
              <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
                {editingImage?.url && compareBeforeImage && (
                  <div className="flex flex-col gap-4">
                    <ImageComparison
                      beforeImage={compareBeforeImage}
                      afterImage={editingImage.url}
                      beforeLabel="Before"
                      afterLabel="After"
                      initialMode="slider-h"
                    />
                    <div className="flex justify-end">
                      <Button variant="outline" onClick={onCompareClose}>
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : editingImage?.url ? (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>Image Editor</DialogTitle>
              </DialogHeader>
              <div className="h-[85vh]">
                <ImageEditorPanel
                  imageUrl={editingImage.url}
                  initialMode={editMode === 'filter' ? 'filters' : (editMode as EditorMode) || 'crop'}
                  onSave={onEditorSave}
                  onCancel={onEditingClose}
                  className="h-full"
                />
              </div>
              {/* Mask mode has special Apply button for inpainting */}
              {maskDataUrl && (
                <div className="p-4 border-t flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Mask ready. Use this mask to regenerate the marked areas.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={onMaskCancel}>
                      Cancel
                    </Button>
                    <Button onClick={onApplyInpainting} disabled={isGenerating}>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Apply Inpainting
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Batch Export Dialog */}
      <BatchExportDialog
        open={showExportDialog}
        onOpenChange={onExportDialogChange}
        images={allImages.map(img => ({
          id: img.id,
          url: img.url,
          base64: img.base64,
          prompt: img.prompt,
          timestamp: img.timestamp,
        }))}
        onExport={(count) => {
          console.log(`Exported ${count} images`);
        }}
      />
    </>
  );
}
