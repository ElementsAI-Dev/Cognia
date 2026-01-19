'use client';

/**
 * LayerPanel - Video layer management panel
 * 
 * Features:
 * - Layer visibility toggle
 * - Layer ordering (drag and drop)
 * - Opacity control
 * - Blend mode selection
 * - Layer locking
 * - Layer grouping
 */

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Layers,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Film,
  Image,
  Type,
  Music,
  Square,
  Copy,
} from 'lucide-react';

export type LayerType = 'video' | 'image' | 'text' | 'audio' | 'shape' | 'group';

export type BlendMode = 
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion';

export interface VideoLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  parentId?: string;
  children?: string[];
  startTime: number;
  duration: number;
  position: { x: number; y: number };
  scale: { x: number; y: number };
  rotation: number;
}

export interface LayerPanelProps {
  layers: VideoLayer[];
  selectedLayerIds: string[];
  onLayerSelect: (layerIds: string[]) => void;
  onLayerVisibilityToggle: (layerId: string) => void;
  onLayerLockToggle: (layerId: string) => void;
  onLayerOpacityChange: (layerId: string, opacity: number) => void;
  onLayerBlendModeChange: (layerId: string, blendMode: BlendMode) => void;
  onLayerRename: (layerId: string, name: string) => void;
  onLayerReorder: (layerId: string, direction: 'up' | 'down') => void;
  onLayerDelete: (layerId: string) => void;
  onLayerDuplicate: (layerId: string) => void;
  onAddLayer: (type: LayerType) => void;
  className?: string;
}

const LAYER_TYPE_ICONS: Record<LayerType, typeof Film> = {
  video: Film,
  image: Image,
  text: Type,
  audio: Music,
  shape: Square,
  group: Layers,
};

const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'color-burn', label: 'Color Burn' },
  { value: 'hard-light', label: 'Hard Light' },
  { value: 'soft-light', label: 'Soft Light' },
  { value: 'difference', label: 'Difference' },
  { value: 'exclusion', label: 'Exclusion' },
];

export function LayerPanel({
  layers,
  selectedLayerIds,
  onLayerSelect,
  onLayerVisibilityToggle,
  onLayerLockToggle,
  onLayerOpacityChange,
  onLayerBlendModeChange,
  onLayerRename,
  onLayerReorder,
  onLayerDelete,
  onLayerDuplicate,
  onAddLayer,
  className,
}: LayerPanelProps) {
  const [expandedLayerId, setExpandedLayerId] = useState<string | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleLayerClick = useCallback(
    (e: React.MouseEvent, layerId: string) => {
      if (e.shiftKey && selectedLayerIds.length > 0) {
        // Range selection
        const lastSelected = selectedLayerIds[selectedLayerIds.length - 1];
        const lastIndex = layers.findIndex((l) => l.id === lastSelected);
        const currentIndex = layers.findIndex((l) => l.id === layerId);
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeIds = layers.slice(start, end + 1).map((l) => l.id);
        onLayerSelect([...new Set([...selectedLayerIds, ...rangeIds])]);
      } else if (e.ctrlKey || e.metaKey) {
        // Toggle selection
        if (selectedLayerIds.includes(layerId)) {
          onLayerSelect(selectedLayerIds.filter((id) => id !== layerId));
        } else {
          onLayerSelect([...selectedLayerIds, layerId]);
        }
      } else {
        onLayerSelect([layerId]);
      }
    },
    [layers, selectedLayerIds, onLayerSelect]
  );

  const handleStartRename = useCallback((layer: VideoLayer) => {
    setEditingLayerId(layer.id);
    setEditName(layer.name);
  }, []);

  const handleConfirmRename = useCallback(() => {
    if (editingLayerId && editName.trim()) {
      onLayerRename(editingLayerId, editName.trim());
    }
    setEditingLayerId(null);
    setEditName('');
  }, [editingLayerId, editName, onLayerRename]);

  const selectedLayer = selectedLayerIds.length === 1
    ? layers.find((l) => l.id === selectedLayerIds[0])
    : null;

  return (
    <div className={cn('flex flex-col h-full bg-background border rounded-lg', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-medium flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Layers
        </h3>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onAddLayer('video')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add Layer</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Layer list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {layers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No layers</p>
            </div>
          ) : (
            layers.map((layer, index) => {
              const Icon = LAYER_TYPE_ICONS[layer.type];
              const isSelected = selectedLayerIds.includes(layer.id);
              const isExpanded = expandedLayerId === layer.id;
              const isEditing = editingLayerId === layer.id;

              return (
                <Collapsible
                  key={layer.id}
                  open={isExpanded}
                  onOpenChange={(open) => setExpandedLayerId(open ? layer.id : null)}
                >
                  <div
                    className={cn(
                      'group flex items-center gap-1 p-2 rounded-lg cursor-pointer transition-colors',
                      isSelected ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted',
                      !layer.visible && 'opacity-50',
                      layer.locked && 'cursor-not-allowed'
                    )}
                    onClick={(e) => handleLayerClick(e, layer.id)}
                  >
                    {/* Drag handle */}
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />

                    {/* Expand toggle */}
                    <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </Button>
                    </CollapsibleTrigger>

                    {/* Layer icon */}
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />

                    {/* Layer name */}
                    {isEditing ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={handleConfirmRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleConfirmRename();
                          if (e.key === 'Escape') setEditingLayerId(null);
                        }}
                        className="h-6 text-sm flex-1"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className="flex-1 text-sm truncate"
                        onDoubleClick={() => handleStartRename(layer)}
                      >
                        {layer.name}
                      </span>
                    )}

                    {/* Quick actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={(e) => {
                              e.stopPropagation();
                              onLayerVisibilityToggle(layer.id);
                            }}
                          >
                            {layer.visible ? (
                              <Eye className="h-3 w-3" />
                            ) : (
                              <EyeOff className="h-3 w-3" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{layer.visible ? 'Hide' : 'Show'}</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={(e) => {
                              e.stopPropagation();
                              onLayerLockToggle(layer.id);
                            }}
                          >
                            {layer.locked ? (
                              <Lock className="h-3 w-3" />
                            ) : (
                              <Unlock className="h-3 w-3" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{layer.locked ? 'Unlock' : 'Lock'}</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Expanded controls */}
                  <CollapsibleContent>
                    <div className="ml-6 p-2 space-y-3 border-l-2 border-muted">
                      {/* Opacity */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Opacity</Label>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(layer.opacity * 100)}%
                          </span>
                        </div>
                        <Slider
                          value={[layer.opacity]}
                          onValueChange={(v) => onLayerOpacityChange(layer.id, v[0])}
                          min={0}
                          max={1}
                          step={0.01}
                          disabled={layer.locked}
                        />
                      </div>

                      {/* Blend mode */}
                      <div className="space-y-1">
                        <Label className="text-xs">Blend Mode</Label>
                        <Select
                          value={layer.blendMode}
                          onValueChange={(v) => onLayerBlendModeChange(layer.id, v as BlendMode)}
                          disabled={layer.locked}
                        >
                          <SelectTrigger className="h-7 text-xs">
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

                      {/* Layer actions */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => onLayerDuplicate(layer.id)}
                          disabled={layer.locked}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Duplicate
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive"
                          onClick={() => onLayerDelete(layer.id)}
                          disabled={layer.locked}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Selected layer properties */}
      {selectedLayer && (
        <div className="p-3 border-t bg-muted/30 space-y-2">
          <div className="text-xs text-muted-foreground">Selected: {selectedLayer.name}</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Position:</span>{' '}
              {selectedLayer.position.x}, {selectedLayer.position.y}
            </div>
            <div>
              <span className="text-muted-foreground">Scale:</span>{' '}
              {Math.round(selectedLayer.scale.x * 100)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LayerPanel;
