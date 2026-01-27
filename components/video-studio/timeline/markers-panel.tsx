'use client';

/**
 * MarkersPanel - Timeline markers and chapters management
 * 
 * Features:
 * - Add/edit/delete markers
 * - Marker colors and icons
 * - Chapter markers for export
 * - Jump to marker navigation
 * - Marker descriptions
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  Bookmark,
  Plus,
  Trash2,
  Edit,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  Clock,
  BookOpen,
  Flag,
  Star,
  CheckCircle,
  Circle,
} from 'lucide-react';

export type MarkerType = 'marker' | 'chapter' | 'note' | 'todo';
export type MarkerColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'gray';

export interface Marker {
  id: string;
  time: number;
  name: string;
  description?: string;
  type: MarkerType;
  color: MarkerColor;
  completed?: boolean;
}

export interface MarkersPanelProps {
  markers: Marker[];
  currentTime: number;
  duration: number;
  onAddMarker: (marker: Omit<Marker, 'id'>) => void;
  onUpdateMarker: (id: string, updates: Partial<Marker>) => void;
  onDeleteMarker: (id: string) => void;
  onJumpToMarker: (time: number) => void;
  className?: string;
}

const MARKER_COLORS: { value: MarkerColor; labelKey: string; class: string }[] = [
  { value: 'red', labelKey: 'colors.red', class: 'bg-red-500' },
  { value: 'orange', labelKey: 'colors.orange', class: 'bg-orange-500' },
  { value: 'yellow', labelKey: 'colors.yellow', class: 'bg-yellow-500' },
  { value: 'green', labelKey: 'colors.green', class: 'bg-green-500' },
  { value: 'blue', labelKey: 'colors.blue', class: 'bg-blue-500' },
  { value: 'purple', labelKey: 'colors.purple', class: 'bg-purple-500' },
  { value: 'pink', labelKey: 'colors.pink', class: 'bg-pink-500' },
  { value: 'gray', labelKey: 'colors.gray', class: 'bg-gray-500' },
];

const MARKER_TYPES: { value: MarkerType; labelKey: string; icon: typeof Bookmark }[] = [
  { value: 'marker', labelKey: 'types.marker', icon: Flag },
  { value: 'chapter', labelKey: 'types.chapter', icon: BookOpen },
  { value: 'note', labelKey: 'types.note', icon: Star },
  { value: 'todo', labelKey: 'types.todo', icon: CheckCircle },
];

export function MarkersPanel({
  markers,
  currentTime,
  duration,
  onAddMarker,
  onUpdateMarker,
  onDeleteMarker,
  onJumpToMarker,
  className,
}: MarkersPanelProps) {
  const t = useTranslations('markers');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMarker, setEditingMarker] = useState<Marker | null>(null);
  const [newMarker, setNewMarker] = useState<Partial<Marker>>({
    name: '',
    type: 'marker',
    color: 'blue',
  });

  const sortedMarkers = useMemo(() => {
    return [...markers].sort((a, b) => a.time - b.time);
  }, [markers]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }, []);

  const handleAddMarker = useCallback(() => {
    setEditingMarker(null);
    setNewMarker({
      name: `Marker ${markers.length + 1}`,
      type: 'marker',
      color: 'blue',
      time: currentTime,
    });
    setEditDialogOpen(true);
  }, [markers.length, currentTime]);

  const handleEditMarker = useCallback((marker: Marker) => {
    setEditingMarker(marker);
    setNewMarker(marker);
    setEditDialogOpen(true);
  }, []);

  const handleSaveMarker = useCallback(() => {
    if (editingMarker) {
      onUpdateMarker(editingMarker.id, newMarker);
    } else {
      onAddMarker({
        name: newMarker.name || 'Untitled',
        time: newMarker.time ?? currentTime,
        type: newMarker.type || 'marker',
        color: newMarker.color || 'blue',
        description: newMarker.description,
      });
    }
    setEditDialogOpen(false);
    setEditingMarker(null);
    setNewMarker({ name: '', type: 'marker', color: 'blue' });
  }, [editingMarker, newMarker, currentTime, onAddMarker, onUpdateMarker]);

  const findNearestMarker = useCallback(
    (direction: 'next' | 'prev') => {
      if (direction === 'next') {
        return sortedMarkers.find((m) => m.time > currentTime);
      } else {
        return [...sortedMarkers].reverse().find((m) => m.time < currentTime);
      }
    },
    [sortedMarkers, currentTime]
  );

  const getColorClass = (color: MarkerColor) => {
    return MARKER_COLORS.find((c) => c.value === color)?.class || 'bg-blue-500';
  };

  const getTypeIcon = (type: MarkerType) => {
    return MARKER_TYPES.find((t) => t.value === type)?.icon || Flag;
  };

  return (
    <div className={cn('flex flex-col h-full bg-background border rounded-lg', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-medium flex items-center gap-2">
          <Bookmark className="h-4 w-4" />
          {t('title')}
          <Badge variant="secondary" className="text-xs">
            {markers.length}
          </Badge>
        </h3>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  const prev = findNearestMarker('prev');
                  if (prev) onJumpToMarker(prev.time);
                }}
                disabled={!findNearestMarker('prev')}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('previousMarker')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  const next = findNearestMarker('next');
                  if (next) onJumpToMarker(next.time);
                }}
                disabled={!findNearestMarker('next')}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('nextMarker')}</TooltipContent>
          </Tooltip>
          <Button size="sm" onClick={handleAddMarker}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t('add')}
          </Button>
        </div>
      </div>

      {/* Markers list */}
      <ScrollArea className="flex-1">
        {sortedMarkers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bookmark className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">{t('noMarkers')}</p>
            <p className="text-xs mt-1">{t('noMarkersHint')}</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {sortedMarkers.map((marker) => {
              const Icon = getTypeIcon(marker.type);
              const isActive = Math.abs(currentTime - marker.time) < 0.1;

              return (
                <div
                  key={marker.id}
                  className={cn(
                    'group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors',
                    isActive ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted'
                  )}
                  onClick={() => onJumpToMarker(marker.time)}
                >
                  {/* Color indicator */}
                  <div className={cn('w-1 h-8 rounded-full shrink-0', getColorClass(marker.color))} />

                  {/* Icon */}
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{marker.name}</span>
                      {marker.type === 'chapter' && (
                        <Badge variant="outline" className="text-xs">
                          {t('chapter')}
                        </Badge>
                      )}
                      {marker.type === 'todo' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateMarker(marker.id, { completed: !marker.completed });
                          }}
                        >
                          {marker.completed ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <Circle className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span className="font-mono">{formatTime(marker.time)}</span>
                      {marker.description && (
                        <>
                          <span>•</span>
                          <span className="truncate">{marker.description}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditMarker(marker)}>
                        <Edit className="h-4 w-4 mr-2" />
                        {t('edit')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDeleteMarker(marker.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMarker ? t('editMarker') : t('addMarker')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label>{t('name')}</Label>
              <Input
                value={newMarker.name || ''}
                onChange={(e) => setNewMarker({ ...newMarker, name: e.target.value })}
                placeholder={t('markerNamePlaceholder')}
              />
            </div>

            {/* Time */}
            <div className="space-y-2">
              <Label>{t('time')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={newMarker.time ?? currentTime}
                  onChange={(e) => setNewMarker({ ...newMarker, time: parseFloat(e.target.value) })}
                  step={0.1}
                  min={0}
                  max={duration}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewMarker({ ...newMarker, time: currentTime })}
                >
                  {t('current')}
                </Button>
              </div>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>{t('type')}</Label>
              <div className="flex flex-wrap gap-1">
                {MARKER_TYPES.map((type) => (
                  <Button
                    key={type.value}
                    variant={newMarker.type === type.value ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setNewMarker({ ...newMarker, type: type.value })}
                  >
                    <type.icon className="h-3 w-3 mr-1" />
                    {t(type.labelKey)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label>{t('color')}</Label>
              <div className="flex gap-1">
                {MARKER_COLORS.map((color) => (
                  <Button
                    key={color.value}
                    variant="outline"
                    size="icon"
                    className={cn(
                      'h-7 w-7',
                      newMarker.color === color.value && 'ring-2 ring-primary'
                    )}
                    onClick={() => setNewMarker({ ...newMarker, color: color.value })}
                  >
                    <div className={cn('w-4 h-4 rounded-full', color.class)} />
                  </Button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>{t('descriptionOptional')}</Label>
              <Textarea
                value={newMarker.description || ''}
                onChange={(e) => setNewMarker({ ...newMarker, description: e.target.value })}
                placeholder={t('descriptionPlaceholder')}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSaveMarker}>{editingMarker ? t('save') : t('add')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MarkersPanel;
