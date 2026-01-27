'use client';

/**
 * TextOverlay - Add text and watermarks to images
 * Features:
 * - Multiple text layers
 * - Font family, size, color, opacity
 * - Text alignment and positioning
 * - Rotation and shadow effects
 * - Draggable text elements
 * - Export with text baked in
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import {
  Type,
  Plus,
  Trash2,
  Check,
  X,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Copy,
  Eye,
  EyeOff,
  Move,
  RotateCcw,
} from 'lucide-react';

export interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  opacity: number;
  rotation: number;
  align: 'left' | 'center' | 'right';
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  visible: boolean;
}

export interface TextOverlayProps {
  imageUrl: string;
  initialLayers?: TextLayer[];
  onApply?: (result: { dataUrl: string; layers: TextLayer[] }) => void;
  onCancel?: () => void;
  className?: string;
}

const FONT_FAMILIES = [
  { label: 'Sans Serif', value: 'Arial, sans-serif' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Monospace', value: 'Courier New, monospace' },
  { label: 'Cursive', value: 'Brush Script MT, cursive' },
  { label: 'Impact', value: 'Impact, sans-serif' },
  { label: 'Comic Sans', value: 'Comic Sans MS, cursive' },
  { label: 'Times', value: 'Times New Roman, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
];

const PRESET_COLORS = [
  '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#ff6600', '#9900ff',
];

const createDefaultLayer = (): TextLayer => ({
  id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  text: 'Your Text Here',
  x: 50,
  y: 50,
  fontSize: 32,
  fontFamily: 'Arial, sans-serif',
  fontWeight: 'normal',
  fontStyle: 'normal',
  color: '#ffffff',
  opacity: 100,
  rotation: 0,
  align: 'center',
  shadowEnabled: true,
  shadowColor: '#000000',
  shadowBlur: 4,
  shadowOffsetX: 2,
  shadowOffsetY: 2,
  visible: true,
});

export function TextOverlay({
  imageUrl,
  initialLayers = [],
  onApply,
  onCancel,
  className,
}: TextOverlayProps) {
  const t = useTranslations('imageStudio.textOverlay');
  const tc = useTranslations('imageStudio.common');

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // State
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [layers, setLayers] = useState<TextLayer[]>(
    initialLayers.length > 0 ? initialLayers : [createDefaultLayer()]
  );
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    layers[0]?.id || null
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const selectedLayer = layers.find((l) => l.id === selectedLayerId);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageSize({ width: img.width, height: img.height });
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Calculate display size
  useEffect(() => {
    const updateDisplaySize = () => {
      const container = containerRef.current;
      if (!container || !imageLoaded) return;

      const containerRect = container.getBoundingClientRect();
      const maxWidth = containerRect.width - 40;
      const maxHeight = containerRect.height - 40;

      const imageAspect = imageSize.width / imageSize.height;
      let displayWidth = maxWidth;
      let displayHeight = maxWidth / imageAspect;

      if (displayHeight > maxHeight) {
        displayHeight = maxHeight;
        displayWidth = maxHeight * imageAspect;
      }

      setDisplaySize({ width: displayWidth, height: displayHeight });
    };

    updateDisplaySize();
    window.addEventListener('resize', updateDisplaySize);
    return () => window.removeEventListener('resize', updateDisplaySize);
  }, [imageLoaded, imageSize]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = displaySize.width;
    canvas.height = displaySize.height;

    // Draw image
    ctx.drawImage(img, 0, 0, displaySize.width, displaySize.height);

    // Draw text layers
    const scaleX = displaySize.width / 100;
    const scaleY = displaySize.height / 100;

    layers.forEach((layer) => {
      if (!layer.visible) return;

      ctx.save();

      const x = layer.x * scaleX;
      const y = layer.y * scaleY;

      ctx.translate(x, y);
      ctx.rotate((layer.rotation * Math.PI) / 180);

      ctx.font = `${layer.fontStyle} ${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
      ctx.textAlign = layer.align;
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = layer.opacity / 100;

      if (layer.shadowEnabled) {
        ctx.shadowColor = layer.shadowColor;
        ctx.shadowBlur = layer.shadowBlur;
        ctx.shadowOffsetX = layer.shadowOffsetX;
        ctx.shadowOffsetY = layer.shadowOffsetY;
      }

      ctx.fillStyle = layer.color;
      ctx.fillText(layer.text, 0, 0);

      // Draw selection indicator
      if (layer.id === selectedLayerId) {
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        const metrics = ctx.measureText(layer.text);
        const textWidth = metrics.width;
        const textHeight = layer.fontSize;
        let offsetX = 0;
        if (layer.align === 'center') offsetX = -textWidth / 2;
        else if (layer.align === 'right') offsetX = -textWidth;
        ctx.strokeRect(offsetX - 5, -textHeight / 2 - 5, textWidth + 10, textHeight + 10);
      }

      ctx.restore();
    });
  }, [layers, displaySize, imageLoaded, selectedLayerId]);

  // Update layer
  const updateLayer = useCallback((id: string, updates: Partial<TextLayer>) => {
    setLayers((prev) =>
      prev.map((layer) => (layer.id === id ? { ...layer, ...updates } : layer))
    );
  }, []);

  // Add layer
  const addLayer = useCallback(() => {
    const newLayer = createDefaultLayer();
    newLayer.y = 50 + layers.length * 10;
    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
  }, [layers.length]);

  // Delete layer
  const deleteLayer = useCallback((id: string) => {
    setLayers((prev) => {
      const newLayers = prev.filter((l) => l.id !== id);
      if (selectedLayerId === id) {
        setSelectedLayerId(newLayers[0]?.id || null);
      }
      return newLayers;
    });
  }, [selectedLayerId]);

  // Duplicate layer
  const duplicateLayer = useCallback((id: string) => {
    const layer = layers.find((l) => l.id === id);
    if (!layer) return;

    const newLayer: TextLayer = {
      ...layer,
      id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      y: layer.y + 10,
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
  }, [layers]);

  // Mouse handlers for dragging
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!selectedLayer) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / displaySize.width) * 100;
      const y = ((e.clientY - rect.top) / displaySize.height) * 100;

      // Check if clicking on selected layer
      const layerX = selectedLayer.x;
      const layerY = selectedLayer.y;
      const threshold = 15;

      if (Math.abs(x - layerX) < threshold && Math.abs(y - layerY) < threshold) {
        setIsDragging(true);
        setDragStart({ x: x - layerX, y: y - layerY });
      }
    },
    [selectedLayer, displaySize]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging || !selectedLayerId) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / displaySize.width) * 100;
      const y = ((e.clientY - rect.top) / displaySize.height) * 100;

      const newX = Math.max(0, Math.min(100, x - dragStart.x));
      const newY = Math.max(0, Math.min(100, y - dragStart.y));

      updateLayer(selectedLayerId, { x: newX, y: newY });
    },
    [isDragging, selectedLayerId, displaySize, dragStart, updateLayer]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Export result
  const handleApply = useCallback(() => {
    const img = imageRef.current;
    if (!img) return;

    // Create full-resolution canvas
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = imageSize.width;
    outputCanvas.height = imageSize.height;
    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return;

    // Draw image at full resolution
    ctx.drawImage(img, 0, 0);

    // Draw text layers at full resolution
    const scaleX = imageSize.width / 100;
    const scaleY = imageSize.height / 100;
    const fontScale = imageSize.width / displaySize.width;

    layers.forEach((layer) => {
      if (!layer.visible) return;

      ctx.save();

      const x = layer.x * scaleX;
      const y = layer.y * scaleY;

      ctx.translate(x, y);
      ctx.rotate((layer.rotation * Math.PI) / 180);

      ctx.font = `${layer.fontStyle} ${layer.fontWeight} ${layer.fontSize * fontScale}px ${layer.fontFamily}`;
      ctx.textAlign = layer.align;
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = layer.opacity / 100;

      if (layer.shadowEnabled) {
        ctx.shadowColor = layer.shadowColor;
        ctx.shadowBlur = layer.shadowBlur * fontScale;
        ctx.shadowOffsetX = layer.shadowOffsetX * fontScale;
        ctx.shadowOffsetY = layer.shadowOffsetY * fontScale;
      }

      ctx.fillStyle = layer.color;
      ctx.fillText(layer.text, 0, 0);

      ctx.restore();
    });

    const dataUrl = outputCanvas.toDataURL('image/png');
    onApply?.({ dataUrl, layers });
  }, [imageSize, displaySize, layers, onApply]);

  // Reset all
  const handleReset = useCallback(() => {
    setLayers([createDefaultLayer()]);
    setSelectedLayerId(layers[0]?.id || null);
  }, [layers]);

  return (
    <div className={cn('flex gap-4', className)}>
      {/* Canvas area */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            <h3 className="font-medium">{t('title')}</h3>
          </div>
          <div className="text-sm text-muted-foreground">
            {imageSize.width} × {imageSize.height}
          </div>
        </div>

        <div
          ref={containerRef}
          className="relative flex-1 border rounded-lg overflow-hidden bg-muted/30 min-h-[400px] flex items-center justify-center"
        >
          <canvas
            ref={canvasRef}
            className={cn(
              'max-w-full max-h-full',
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            )}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground">{tc('loadingImage')}</div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            {tc('reset')}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              {tc('cancel')}
            </Button>
            <Button onClick={handleApply}>
              <Check className="h-4 w-4 mr-1" />
              {tc('apply')}
            </Button>
          </div>
        </div>
      </div>

      {/* Controls panel */}
      <div className="w-72 flex flex-col border rounded-lg">
        <div className="p-3 border-b flex items-center justify-between">
          <h3 className="font-medium text-sm">{t('textLayers')}</h3>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={addLayer}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            {/* Layer list */}
            <div className="space-y-1">
              {layers.map((layer) => (
                <div
                  key={layer.id}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors',
                    selectedLayerId === layer.id ? 'bg-muted' : 'hover:bg-muted/50'
                  )}
                  onClick={() => setSelectedLayerId(layer.id)}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateLayer(layer.id, { visible: !layer.visible });
                    }}
                  >
                    {layer.visible ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3 text-muted-foreground" />
                    )}
                  </Button>
                  <span className="flex-1 text-sm truncate">{layer.text || t('empty')}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateLayer(layer.id);
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteLayer(layer.id);
                    }}
                    disabled={layers.length === 1}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            {selectedLayer && (
              <>
                <Separator />

                {/* Text input */}
                <div className="space-y-2">
                  <Label className="text-xs">{t('text')}</Label>
                  <Input
                    value={selectedLayer.text}
                    onChange={(e) => updateLayer(selectedLayer.id, { text: e.target.value })}
                    placeholder={t('enterText')}
                  />
                </div>

                {/* Font family */}
                <div className="space-y-2">
                  <Label className="text-xs">{t('font')}</Label>
                  <Select
                    value={selectedLayer.fontFamily}
                    onValueChange={(v) => updateLayer(selectedLayer.id, { fontFamily: v })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_FAMILIES.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          <span style={{ fontFamily: font.value }}>{font.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Font size */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{t('size')}</Label>
                    <span className="text-xs text-muted-foreground">{selectedLayer.fontSize}px</span>
                  </div>
                  <Slider
                    value={[selectedLayer.fontSize]}
                    onValueChange={([v]) => updateLayer(selectedLayer.id, { fontSize: v })}
                    min={8}
                    max={200}
                    step={1}
                  />
                </div>

                {/* Font style */}
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={selectedLayer.fontWeight === 'bold' ? 'secondary' : 'outline'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateLayer(selectedLayer.id, {
                            fontWeight: selectedLayer.fontWeight === 'bold' ? 'normal' : 'bold',
                          })
                        }
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('bold')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={selectedLayer.fontStyle === 'italic' ? 'secondary' : 'outline'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateLayer(selectedLayer.id, {
                            fontStyle: selectedLayer.fontStyle === 'italic' ? 'normal' : 'italic',
                          })
                        }
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('italic')}</TooltipContent>
                  </Tooltip>
                  <Separator orientation="vertical" className="h-6 mx-1" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={selectedLayer.align === 'left' ? 'secondary' : 'outline'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateLayer(selectedLayer.id, { align: 'left' })}
                      >
                        <AlignLeft className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('alignLeft')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={selectedLayer.align === 'center' ? 'secondary' : 'outline'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateLayer(selectedLayer.id, { align: 'center' })}
                      >
                        <AlignCenter className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('alignCenter')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={selectedLayer.align === 'right' ? 'secondary' : 'outline'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateLayer(selectedLayer.id, { align: 'right' })}
                      >
                        <AlignRight className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('alignRight')}</TooltipContent>
                  </Tooltip>
                </div>

                {/* Color */}
                <div className="space-y-2">
                  <Label className="text-xs">{t('color')}</Label>
                  <div className="flex items-center gap-1 flex-wrap">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        className={cn(
                          'w-6 h-6 rounded border-2 transition-all',
                          selectedLayer.color === color ? 'border-primary scale-110' : 'border-transparent'
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => updateLayer(selectedLayer.id, { color })}
                      />
                    ))}
                    <input
                      type="color"
                      value={selectedLayer.color}
                      onChange={(e) => updateLayer(selectedLayer.id, { color: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* Opacity */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{t('opacity')}</Label>
                    <span className="text-xs text-muted-foreground">{selectedLayer.opacity}%</span>
                  </div>
                  <Slider
                    value={[selectedLayer.opacity]}
                    onValueChange={([v]) => updateLayer(selectedLayer.id, { opacity: v })}
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>

                {/* Rotation */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{t('rotation')}</Label>
                    <span className="text-xs text-muted-foreground">{selectedLayer.rotation}°</span>
                  </div>
                  <Slider
                    value={[selectedLayer.rotation]}
                    onValueChange={([v]) => updateLayer(selectedLayer.id, { rotation: v })}
                    min={-180}
                    max={180}
                    step={1}
                  />
                </div>

                {/* Position */}
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <Move className="h-3 w-3" />
                    {t('position')}
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">X</Label>
                      <Slider
                        value={[selectedLayer.x]}
                        onValueChange={([v]) => updateLayer(selectedLayer.id, { x: v })}
                        min={0}
                        max={100}
                        step={1}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Y</Label>
                      <Slider
                        value={[selectedLayer.y]}
                        onValueChange={([v]) => updateLayer(selectedLayer.id, { y: v })}
                        min={0}
                        max={100}
                        step={1}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Shadow */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{t('shadow')}</Label>
                    <Button
                      variant={selectedLayer.shadowEnabled ? 'secondary' : 'outline'}
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() =>
                        updateLayer(selectedLayer.id, {
                          shadowEnabled: !selectedLayer.shadowEnabled,
                        })
                      }
                    >
                      {selectedLayer.shadowEnabled ? tc('on') : tc('off')}
                    </Button>
                  </div>
                  {selectedLayer.shadowEnabled && (
                    <div className="space-y-2 pl-2 border-l-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs w-12">Color</Label>
                        <input
                          type="color"
                          value={selectedLayer.shadowColor}
                          onChange={(e) =>
                            updateLayer(selectedLayer.id, { shadowColor: e.target.value })
                          }
                          className="w-6 h-6 rounded cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Blur: {selectedLayer.shadowBlur}</Label>
                        <Slider
                          value={[selectedLayer.shadowBlur]}
                          onValueChange={([v]) => updateLayer(selectedLayer.id, { shadowBlur: v })}
                          min={0}
                          max={20}
                          step={1}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export default TextOverlay;
