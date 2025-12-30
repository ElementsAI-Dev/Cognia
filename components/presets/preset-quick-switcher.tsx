'use client';

/**
 * PresetQuickSwitcher - quick preset switching button for chat input toolbar
 * Similar to the thinking toggle button, allows quick switching between presets
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Layers, ChevronDown, Star, Check, Plus, Settings2, Heart, GripVertical, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { usePresetStore, useSessionStore } from '@/stores';
import { toast } from '@/components/ui/sonner';
import type { Preset } from '@/types/preset';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PresetQuickSwitcherProps {
  onPresetChange?: (preset: Preset) => void;
  onCreateNew?: () => void;
  onManage?: () => void;
  disabled?: boolean;
}

export function PresetQuickSwitcher({
  onPresetChange,
  onCreateNew,
  onManage,
  disabled = false,
}: PresetQuickSwitcherProps) {
  const t = useTranslations('presetQuickSwitcher');
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Preset store
  const presets = usePresetStore((state) => state.presets);
  const selectPreset = usePresetStore((state) => state.selectPreset);
  const trackPresetUsage = usePresetStore((state) => state.usePreset);
  const toggleFavorite = usePresetStore((state) => state.toggleFavorite);
  const reorderPresets = usePresetStore((state) => state.reorderPresets);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      reorderPresets(active.id as string, over.id as string);
      toast.success(t('orderUpdated'));
    }
  }, [reorderPresets, t]);

  // Session store
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const sessions = useSessionStore((state) => state.sessions);
  const updateSession = useSessionStore((state) => state.updateSession);

  // Get current session and its preset
  const currentSession = useMemo(() => 
    activeSessionId ? sessions.find(s => s.id === activeSessionId) : null,
    [activeSessionId, sessions]
  );
  
  const currentPresetId = currentSession?.presetId;
  const currentPreset = useMemo(() => 
    currentPresetId ? presets.find(p => p.id === currentPresetId) : null,
    [currentPresetId, presets]
  );

  // Filter presets by search query
  const filteredPresets = useMemo(() => {
    if (!searchQuery.trim()) return presets;
    const query = searchQuery.toLowerCase();
    return presets.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
    );
  }, [presets, searchQuery]);

  // Get favorite presets (from filtered results)
  const favoritePresets = useMemo(() => 
    filteredPresets.filter(p => p.isFavorite),
    [filteredPresets]
  );

  // Get recent presets (excluding favorites to avoid duplication)
  const recentPresets = useMemo(() => 
    [...filteredPresets]
      .filter(p => p.lastUsedAt && !p.isFavorite)
      .sort((a, b) => (b.lastUsedAt?.getTime() || 0) - (a.lastUsedAt?.getTime() || 0))
      .slice(0, 5),
    [filteredPresets]
  );

  // Get other presets (not favorite and not in recent)
  const otherPresets = useMemo(() => 
    filteredPresets.filter(p => !p.isFavorite && !recentPresets.some(r => r.id === p.id)),
    [filteredPresets, recentPresets]
  );

  // Check if we're in search mode
  const isSearching = searchQuery.trim().length > 0;

  // Handle toggling favorite
  const handleToggleFavorite = useCallback((e: React.MouseEvent, presetId: string) => {
    e.stopPropagation();
    toggleFavorite(presetId);
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      toast.success(preset.isFavorite ? t('removedFromFavorites') : t('addedToFavorites'));
    }
  }, [toggleFavorite, presets, t]);

  const handleSelectPreset = (preset: Preset) => {
    // Update preset store
    selectPreset(preset.id);
    trackPresetUsage(preset.id);

    // Update current session with preset settings
    if (currentSession) {
      updateSession(currentSession.id, {
        provider: preset.provider === 'auto' ? 'openai' : preset.provider,
        model: preset.model,
        mode: preset.mode,
        systemPrompt: preset.systemPrompt,
        builtinPrompts: preset.builtinPrompts,
        temperature: preset.temperature,
        maxTokens: preset.maxTokens,
        webSearchEnabled: preset.webSearchEnabled,
        thinkingEnabled: preset.thinkingEnabled,
        presetId: preset.id,
      });
    }

    onPresetChange?.(preset);
    setOpen(false);
    
    // Show toast notification
    toast.success(`Switched to ${preset.name}`);
  };

  const hasActivePreset = !!currentPreset;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 gap-1.5 px-2 text-xs font-normal',
            hasActivePreset
              ? 'bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20'
              : 'text-muted-foreground hover:text-foreground'
          )}
          disabled={disabled}
        >
          {currentPreset?.icon ? (
            <span className="text-sm">{currentPreset.icon}</span>
          ) : (
            <Layers className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline max-w-[60px] truncate">
            {currentPreset?.name || t('preset')}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
          {hasActivePreset && (
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t('switchPreset')}</p>
              <p className="text-xs text-muted-foreground">
                {t('quickSwitchDesc')}
              </p>
            </div>
            {currentPreset && (
              <Badge 
                variant="outline" 
                className="text-[10px] px-1.5"
                style={{ 
                  backgroundColor: `${currentPreset.color}15`,
                  borderColor: `${currentPreset.color}40`,
                  color: currentPreset.color 
                }}
              >
                {t('active')}
              </Badge>
            )}
          </div>
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full h-8 pl-7 pr-7 text-sm rounded-md border border-input bg-transparent placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        
        <ScrollArea className="max-h-72">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            {/* Favorite presets */}
            {favoritePresets.length > 0 && (
              <div className="p-2">
                <p className="px-2 mb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
                  {t('favorites')}
                </p>
                <SortableContext
                  items={favoritePresets.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {favoritePresets.map((preset) => (
                    <SortablePresetItem
                      key={preset.id}
                      preset={preset}
                      isActive={preset.id === currentPresetId}
                      onSelect={() => handleSelectPreset(preset)}
                      onToggleFavorite={(e) => handleToggleFavorite(e, preset.id)}
                    />
                  ))}
                </SortableContext>
              </div>
            )}

            {favoritePresets.length > 0 && (recentPresets.length > 0 || otherPresets.length > 0) && (
              <Separator />
            )}

            {/* Recent presets */}
            {recentPresets.length > 0 && (
              <div className="p-2">
                <p className="px-2 mb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {t('recent')}
                </p>
                {recentPresets.map((preset) => (
                  <PresetItem
                    key={preset.id}
                    preset={preset}
                    isActive={preset.id === currentPresetId}
                    onSelect={() => handleSelectPreset(preset)}
                    onToggleFavorite={(e) => handleToggleFavorite(e, preset.id)}
                  />
                ))}
              </div>
            )}

            {recentPresets.length > 0 && otherPresets.length > 0 && (
              <Separator />
            )}

            {/* Other presets */}
            <div className="p-2">
              <p className="px-2 mb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                {t('allPresets')}
                <span className="text-[9px] opacity-60">({t('dragToReorder')})</span>
              </p>
              <SortableContext
                items={otherPresets.map(p => p.id)}
                strategy={verticalListSortingStrategy}
              >
                {otherPresets.map((preset) => (
                  <SortablePresetItem
                    key={preset.id}
                    preset={preset}
                    isActive={preset.id === currentPresetId}
                    onSelect={() => handleSelectPreset(preset)}
                    onToggleFavorite={(e) => handleToggleFavorite(e, preset.id)}
                  />
                ))}
              </SortableContext>
              {presets.length === 0 && (
                <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                  {t('noPresets')}
                </p>
              )}
              {isSearching && filteredPresets.length === 0 && (
                <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                  {t('noResults')}
                </p>
              )}
            </div>
          </DndContext>
        </ScrollArea>

        <Separator />
        
        {/* Actions */}
        <div className="p-2 flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={() => {
              setOpen(false);
              onCreateNew?.();
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t('createNew')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={() => {
              setOpen(false);
              onManage?.();
            }}
          >
            <Settings2 className="h-3.5 w-3.5 mr-1" />
            {t('manage')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Individual preset item component
interface PresetItemProps {
  preset: Preset;
  isActive: boolean;
  onSelect: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

function PresetItem({ preset, isActive, onSelect, onToggleFavorite, isDragging, dragHandleProps }: PresetItemProps) {
  return (
    <div
      className={cn(
        'w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors group',
        isActive 
          ? 'bg-accent' 
          : 'hover:bg-accent/50',
        isDragging && 'opacity-50 bg-accent shadow-lg'
      )}
    >
      {/* Drag handle */}
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      <button
        onClick={onSelect}
        className="flex items-center gap-2 flex-1 min-w-0"
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded text-sm shrink-0"
          style={{ backgroundColor: `${preset.color}20` }}
        >
          {preset.icon || '💬'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium truncate">{preset.name}</span>
            {preset.isDefault && (
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />
            )}
          </div>
          {preset.description && (
            <p className="text-[11px] text-muted-foreground truncate">
              {preset.description}
            </p>
          )}
        </div>
      </button>
      <div className="flex items-center gap-1 shrink-0">
        {/* Favorite toggle button */}
        <button
          onClick={onToggleFavorite}
          className={cn(
            'p-1 rounded-md transition-colors',
            preset.isFavorite 
              ? 'text-rose-500 hover:bg-rose-500/10' 
              : 'text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-rose-500 hover:bg-rose-500/10'
          )}
          title={preset.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={cn('h-3.5 w-3.5', preset.isFavorite && 'fill-current')} />
        </button>
        {isActive && (
          <Check className="h-4 w-4 text-primary" />
        )}
      </div>
    </div>
  );
}

// Sortable wrapper for PresetItem
function SortablePresetItem(props: Omit<PresetItemProps, 'isDragging' | 'dragHandleProps'>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.preset.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <PresetItem
        {...props}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export default PresetQuickSwitcher;
