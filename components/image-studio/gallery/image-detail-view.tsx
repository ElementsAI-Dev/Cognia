'use client';

/**
 * ImageDetailView - Single image view with details panel, layers, histogram, and batch status
 */

import {
  Copy,
  Check,
  Download,
  RefreshCw,
  Layers,
  BarChart3,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LayersPanel } from '../panels/layers-panel';
import type { Layer, LayerType } from '@/types/media/image-studio';
import type { GeneratedImageWithMeta } from '@/lib/image-studio';

export interface HistogramData {
  red: number[];
  green: number[];
  blue: number[];
  luminance: number[];
}

export interface ImageDetailViewProps {
  image: GeneratedImageWithMeta;
  // Zoom & Pan
  previewZoom: number;
  previewPan: { x: number; y: number };
  onPreviewZoomChange: (zoom: number) => void;
  onPreviewPanChange: (pan: { x: number; y: number }) => void;
  // Actions
  onDownload: (image: GeneratedImageWithMeta) => void;
  onRegenerate: (image: GeneratedImageWithMeta) => void;
  // Layers
  layers: Layer[];
  activeLayerId: string | null;
  onLayerSelect: (id: string) => void;
  onLayerUpdate: (id: string, updates: Partial<Layer>) => void;
  onLayerDelete: (id: string) => void;
  onLayerDuplicate: (id: string) => void;
  onLayerAdd: (type: LayerType) => void;
  onLayerReorder: (fromIndex: number, toIndex: number) => void;
  // Histogram
  showHistogram: boolean;
  onShowHistogramChange: (show: boolean) => void;
  histogramData: HistogramData | null;
  isLoadingHistogram: boolean;
  // Batch processing
  batchProcessing: {
    isProcessing: boolean;
    processedCount: number;
    errorCount: number;
    progress: number;
    onPause: () => void;
    onCancel: () => void;
  };
  batchPresetsCount: number;
}

export function ImageDetailView({
  image,
  previewZoom,
  previewPan,
  onPreviewZoomChange,
  onPreviewPanChange,
  onDownload,
  onRegenerate,
  layers,
  activeLayerId,
  onLayerSelect,
  onLayerUpdate,
  onLayerDelete,
  onLayerDuplicate,
  onLayerAdd,
  onLayerReorder,
  showHistogram,
  onShowHistogramChange,
  histogramData,
  isLoadingHistogram,
  batchProcessing,
  batchPresetsCount,
}: ImageDetailViewProps) {
  const [copied, setCopied] = useState(false);
  const [showLayersPanel, setShowLayersPanel] = useState(false);

  const handleCopyPrompt = useCallback(async (promptText: string) => {
    await navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <div className="flex-1 flex">
      {/* Image display */}
      <div className="flex-1 p-4 flex flex-col bg-muted/30">
        {image.url ? (
          <div className="flex-1 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={image.prompt}
              className="absolute inset-0 m-auto max-w-full max-h-full object-contain rounded-lg shadow-lg transition-transform duration-100 ease-out"
              style={{
                transform: `scale(${previewZoom}) translate(${previewPan.x}px, ${previewPan.y}px)`,
              }}
            />
            {/* Zoom controls */}
            <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-black/50 rounded-lg px-2 py-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white hover:bg-white/20"
                onClick={() => onPreviewZoomChange(Math.max(0.1, previewZoom / 1.2))}
              >
                <span className="text-sm">−</span>
              </Button>
              <span className="text-white text-xs w-12 text-center">
                {Math.round(previewZoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white hover:bg-white/20"
                onClick={() => onPreviewZoomChange(Math.min(10, previewZoom * 1.2))}
              >
                <span className="text-sm">+</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white hover:bg-white/20"
                onClick={() => {
                  onPreviewZoomChange(1);
                  onPreviewPanChange({ x: 0, y: 0 });
                }}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">No image to display</p>
          </div>
        )}
      </div>

      {/* Details panel */}
      <div className="w-64 border-l p-4 space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium">Prompt</Label>
          <div className="flex gap-2">
            <p className="text-sm text-muted-foreground flex-1">
              {image.prompt}
            </p>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 shrink-0"
              onClick={() => handleCopyPrompt(image.prompt)}
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {image.revisedPrompt && image.revisedPrompt !== image.prompt && (
          <div className="space-y-2">
            <Label className="text-xs font-medium">Revised Prompt</Label>
            <p className="text-xs text-muted-foreground">
              {image.revisedPrompt}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs font-medium">Details</Label>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Model:</span>
              <span>{image.model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size:</span>
              <span>{image.settings.size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quality:</span>
              <span>{image.settings.quality}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Style:</span>
              <span>{image.settings.style}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onDownload(image)}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onRegenerate(image)}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Regenerate
          </Button>
        </div>

        {/* Layers Panel Toggle */}
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowLayersPanel(!showLayersPanel)}
          >
            <Layers className="h-4 w-4 mr-2" />
            {showLayersPanel ? 'Hide Layers' : 'Show Layers'}
          </Button>
        </div>

        {/* Layers Panel */}
        {showLayersPanel && (
          <LayersPanel
            layers={layers}
            activeLayerId={activeLayerId}
            onLayerSelect={onLayerSelect}
            onLayerUpdate={onLayerUpdate}
            onLayerDelete={onLayerDelete}
            onLayerDuplicate={onLayerDuplicate}
            onLayerAdd={onLayerAdd}
            onLayerReorder={onLayerReorder}
            className="mt-2"
          />
        )}

        {/* Histogram Toggle & Display */}
        <div className="pt-2 space-y-2">
          <Button
            variant={showHistogram ? 'secondary' : 'outline'}
            size="sm"
            className="w-full"
            onClick={() => onShowHistogramChange(!showHistogram)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {showHistogram ? 'Hide Histogram' : 'Show Histogram'}
          </Button>
          {showHistogram && histogramData && (
            <div className="bg-black/80 rounded-lg p-2">
              <svg viewBox="0 0 256 100" className="w-full h-20" preserveAspectRatio="none">
                {/* Luminance */}
                <polyline
                  points={histogramData.luminance.map((v, i) => `${i},${100 - (v / Math.max(...histogramData.luminance)) * 100}`).join(' ')}
                  fill="none"
                  stroke="white"
                  strokeWidth="0.5"
                  opacity="0.6"
                />
                {/* Red */}
                <polyline
                  points={histogramData.red.map((v, i) => `${i},${100 - (v / Math.max(...histogramData.red)) * 100}`).join(' ')}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="0.5"
                  opacity="0.5"
                />
                {/* Green */}
                <polyline
                  points={histogramData.green.map((v, i) => `${i},${100 - (v / Math.max(...histogramData.green)) * 100}`).join(' ')}
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="0.5"
                  opacity="0.5"
                />
                {/* Blue */}
                <polyline
                  points={histogramData.blue.map((v, i) => `${i},${100 - (v / Math.max(...histogramData.blue)) * 100}`).join(' ')}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="0.5"
                  opacity="0.5"
                />
              </svg>
              <div className="flex justify-between text-[10px] text-white/50 mt-1">
                <span>Shadows</span>
                <span>Midtones</span>
                <span>Highlights</span>
              </div>
            </div>
          )}
          {showHistogram && !histogramData && isLoadingHistogram && (
            <div className="flex items-center justify-center h-20 bg-muted rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
        </div>

        {/* Batch Processing Status */}
        {batchProcessing.isProcessing && (
          <div className="pt-2 border-t space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Batch Processing</span>
              <Badge variant="outline" className="text-[10px]">
                {batchProcessing.processedCount} / {batchProcessing.processedCount + batchProcessing.errorCount}
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-primary rounded-full h-1.5 transition-all"
                style={{ width: `${batchProcessing.progress}%` }}
              />
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="h-6 text-[10px] flex-1" onClick={batchProcessing.onPause}>
                Pause
              </Button>
              <Button size="sm" variant="destructive" className="h-6 text-[10px] flex-1" onClick={batchProcessing.onCancel}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Batch Presets Info */}
        {batchPresetsCount > 0 && !batchProcessing.isProcessing && (
          <div className="pt-2 border-t">
            <p className="text-[10px] text-muted-foreground">
              {batchPresetsCount} batch preset(s) available
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
