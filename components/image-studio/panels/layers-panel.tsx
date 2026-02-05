'use client';

/**
 * LayersPanel - Layer management UI component
 * Features:
 * - View and manage layers
 * - Toggle visibility
 * - Reorder layers via drag-and-drop
 * - Adjust opacity
 * - Lock/unlock layers
 * - Blend modes
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Empty, EmptyTitle } from '@/components/ui/empty';
import {
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  Plus,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  Image as ImageIcon,
  Paintbrush,
  SlidersHorizontal,
  Merge,
} from 'lucide-react';

export type LayerType = 'image' | 'mask' | 'adjustment' | 'text' | 'shape';
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn' | 'soft-light' | 'hard-light';

export interface Layer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  thumbnail?: string;
  order: number;
}

export interface LayersPanelProps {
  layers: Layer[];
  activeLayerId: string | null;
  onLayerSelect: (id: string) => void;
  onLayerUpdate: (id: string, updates: Partial<Layer>) => void;
  onLayerDelete: (id: string) => void;
  onLayerDuplicate: (id: string) => void;
  onLayerAdd: (type: LayerType) => void;
  onLayerReorder: (fromIndex: number, toIndex: number) => void;
  onLayerMerge?: (ids: string[]) => void;
  className?: string;
}

const BLEND_MODES: Array<{ value: BlendMode; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'color-burn', label: 'Color Burn' },
  { value: 'soft-light', label: 'Soft Light' },
  { value: 'hard-light', label: 'Hard Light' },
];

const LAYER_TYPE_ICONS: Record<LayerType, React.ReactNode> = {
  image: <ImageIcon className="h-3 w-3" />,
  mask: <Paintbrush className="h-3 w-3" />,
  adjustment: <SlidersHorizontal className="h-3 w-3" />,
  text: <span className="text-xs font-bold">T</span>,
  shape: <span className="text-xs">◆</span>,
};

export function LayersPanel({
  layers,
  activeLayerId,
  onLayerSelect,
  onLayerUpdate,
  onLayerDelete,
  onLayerDuplicate,
  onLayerAdd,
  onLayerReorder,
  onLayerMerge,
  className,
}: LayersPanelProps) {
  const t = useTranslations('imageStudio.layersPanel');

  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const sortedLayers = [...layers].sort((a, b) => b.order - a.order);
  const activeLayer = layers.find((l) => l.id === activeLayerId);

  const handleDragStart = useCallback((e: React.DragEvent, layerId: string) => {
    setDraggedLayerId(layerId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetLayerId: string) => {
      e.preventDefault();
      if (!draggedLayerId || draggedLayerId === targetLayerId) return;

      const draggedIndex = layers.findIndex((l) => l.id === draggedLayerId);
      const targetIndex = layers.findIndex((l) => l.id === targetLayerId);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        onLayerReorder(draggedIndex, targetIndex);
      }

      setDraggedLayerId(null);
    },
    [draggedLayerId, layers, onLayerReorder]
  );

  const handleStartRename = useCallback((layer: Layer) => {
    setEditingNameId(layer.id);
    setEditingName(layer.name);
  }, []);

  const handleFinishRename = useCallback(() => {
    if (editingNameId && editingName.trim()) {
      onLayerUpdate(editingNameId, { name: editingName.trim() });
    }
    setEditingNameId(null);
    setEditingName('');
  }, [editingNameId, editingName, onLayerUpdate]);

  const handleMoveUp = useCallback(
    (layerId: string) => {
      const index = sortedLayers.findIndex((l) => l.id === layerId);
      if (index > 0) {
        const originalIndex = layers.findIndex((l) => l.id === layerId);
        const targetIndex = layers.findIndex((l) => l.id === sortedLayers[index - 1].id);
        onLayerReorder(originalIndex, targetIndex);
      }
    },
    [sortedLayers, layers, onLayerReorder]
  );

  const handleMoveDown = useCallback(
    (layerId: string) => {
      const index = sortedLayers.findIndex((l) => l.id === layerId);
      if (index < sortedLayers.length - 1) {
        const originalIndex = layers.findIndex((l) => l.id === layerId);
        const targetIndex = layers.findIndex((l) => l.id === sortedLayers[index + 1].id);
        onLayerReorder(originalIndex, targetIndex);
      }
    },
    [sortedLayers, layers, onLayerReorder]
  );

  return (
    <Card className={cn('flex flex-col gap-0 py-0', className)} role="region" aria-label="Layers Panel">
      {/* Header */}
      <CardHeader className="p-3 border-b flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4" aria-hidden="true" />
          <h3 className="font-medium text-sm" id="layers-panel-title">{t('title')}</h3>
          <span className="text-xs text-muted-foreground">({layers.length})</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onLayerAdd('image')}>
              <ImageIcon className="h-4 w-4 mr-2" />
              {t('layerTypes.image')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onLayerAdd('mask')}>
              <Paintbrush className="h-4 w-4 mr-2" />
              {t('layerTypes.mask')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onLayerAdd('adjustment')}>
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              {t('layerTypes.adjustment')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      {/* Active layer settings */}
      {activeLayer && (
        <div className="p-3 border-b space-y-3 bg-muted/30">
          {/* Opacity */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t('opacity')}</Label>
              <span className="text-xs text-muted-foreground">{activeLayer.opacity}%</span>
            </div>
            <Slider
              value={[activeLayer.opacity]}
              onValueChange={([v]) => onLayerUpdate(activeLayer.id, { opacity: v })}
              min={0}
              max={100}
              step={1}
              disabled={activeLayer.locked}
            />
          </div>

          {/* Blend mode */}
          <div className="space-y-1">
            <Label className="text-xs">{t('blendMode')}</Label>
            <Select
              value={activeLayer.blendMode}
              onValueChange={(v) => onLayerUpdate(activeLayer.id, { blendMode: v as BlendMode })}
              disabled={activeLayer.locked}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BLEND_MODES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Layers list */}
      <CardContent className="flex-1 p-0">
        <ScrollArea className="max-h-[300px]">
          <div className="p-2 space-y-1">
            {sortedLayers.length === 0 ? (
              <Empty className="py-4 border-0">
                <EmptyTitle className="text-xs">{t('noLayers')}</EmptyTitle>
              </Empty>
            ) : (
            sortedLayers.map((layer) => (
              <div
                key={layer.id}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors group',
                  activeLayerId === layer.id ? 'bg-muted' : 'hover:bg-muted/50',
                  draggedLayerId === layer.id && 'opacity-50'
                )}
                onClick={() => onLayerSelect(layer.id)}
                draggable
                onDragStart={(e) => handleDragStart(e, layer.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, layer.id)}
              >
                {/* Thumbnail */}
                <div className="w-8 h-8 rounded border bg-muted/50 flex items-center justify-center shrink-0 overflow-hidden">
                  {layer.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={layer.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    LAYER_TYPE_ICONS[layer.type]
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  {editingNameId === layer.id ? (
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={handleFinishRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFinishRename();
                        if (e.key === 'Escape') {
                          setEditingNameId(null);
                          setEditingName('');
                        }
                      }}
                      className="h-6 text-xs"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      className="text-sm truncate block"
                      onDoubleClick={() => handleStartRename(layer)}
                    >
                      {layer.name}
                    </span>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLayerUpdate(layer.id, { visible: !layer.visible });
                        }}
                      >
                        {layer.visible ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3 text-muted-foreground" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      {layer.visible ? t('hide') : t('show')}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLayerUpdate(layer.id, { locked: !layer.locked });
                        }}
                      >
                        {layer.locked ? (
                          <Lock className="h-3 w-3" />
                        ) : (
                          <Unlock className="h-3 w-3 text-muted-foreground" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      {layer.locked ? t('unlock') : t('lock')}
                    </TooltipContent>
                  </Tooltip>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleStartRename(layer)}>
                        {t('rename')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onLayerDuplicate(layer.id)}>
                        <Copy className="h-3 w-3 mr-2" />
                        {t('duplicate')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleMoveUp(layer.id)}>
                        <ChevronUp className="h-3 w-3 mr-2" />
                        {t('moveUp')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleMoveDown(layer.id)}>
                        <ChevronDown className="h-3 w-3 mr-2" />
                        {t('moveDown')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onLayerDelete(layer.id)}
                        className="text-destructive"
                        disabled={layers.length === 1}
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        {t('delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Footer actions */}
      {onLayerMerge && layers.length > 1 && (
        <CardFooter className="p-2 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => onLayerMerge(layers.map((l) => l.id))}
          >
            <Merge className="h-3 w-3 mr-1" />
            {t('mergeVisible')}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export default LayersPanel;
