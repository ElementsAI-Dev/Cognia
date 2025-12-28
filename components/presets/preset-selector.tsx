'use client';

/**
 * PresetSelector - dropdown menu for selecting presets
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, Plus, Star, Clock, TrendingUp, Search, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Badge } from '@/components/ui/badge';
import { usePresetStore } from '@/stores';
import type { Preset } from '@/types/preset';

interface PresetSelectorProps {
  onSelect?: (preset: Preset) => void;
  onCreateNew?: () => void;
  onManage?: () => void;
  compact?: boolean;
}

export function PresetSelector({
  onSelect,
  onCreateNew,
  onManage,
  compact = false,
}: PresetSelectorProps) {
  const t = useTranslations('presetSelector');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const presets = usePresetStore((state) => state.presets);
  const selectedPresetId = usePresetStore((state) => state.selectedPresetId);
  const selectPreset = usePresetStore((state) => state.selectPreset);
  const trackPresetUsage = usePresetStore((state) => state.usePreset);

  // Compute derived values directly instead of using store methods
  const selectedPreset = selectedPresetId 
    ? presets.find(p => p.id === selectedPresetId) 
    : presets.find(p => p.isDefault);
  
  const filteredPresets = search 
    ? presets.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase())
      )
    : presets;
  
  const recentPresets = [...presets]
    .filter(p => p.lastUsedAt)
    .sort((a, b) => (b.lastUsedAt?.getTime() || 0) - (a.lastUsedAt?.getTime() || 0))
    .slice(0, 3);
  
  const popularPresets = [...presets]
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 3);

  const handleSelect = (preset: Preset) => {
    selectPreset(preset.id);
    trackPresetUsage(preset.id);
    onSelect?.(preset);
    setOpen(false);
    setSearch('');
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <Button variant="ghost" size="sm" className="h-8 gap-1.5">
            <span className="text-base">{selectedPreset?.icon || '💬'}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button variant="outline" className="w-full justify-between">
            <div className="flex items-center gap-2 truncate">
              <span>{selectedPreset?.icon || '💬'}</span>
              <span className="truncate">
                {selectedPreset?.name || t('selectPreset')}
              </span>
              {selectedPreset?.isDefault && (
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              )}
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72" align="start">
        <div className="p-2">
          <InputGroup className="h-8">
            <InputGroupAddon align="inline-start">
              <Search className="h-4 w-4" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
        </div>

        {search ? (
          // Search results
          <DropdownMenuGroup>
            {filteredPresets.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                {t('noPresetsFound')}
              </p>
            ) : (
              filteredPresets.map((preset) => (
                <PresetMenuItem
                  key={preset.id}
                  preset={preset}
                  isSelected={preset.id === selectedPresetId}
                  onSelect={() => handleSelect(preset)}
                />
              ))
            )}
          </DropdownMenuGroup>
        ) : (
          <>
            {/* Recent presets */}
            {recentPresets.length > 0 && (
              <>
                <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {t('recent')}
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  {recentPresets.map((preset) => (
                    <PresetMenuItem
                      key={preset.id}
                      preset={preset}
                      isSelected={preset.id === selectedPresetId}
                      onSelect={() => handleSelect(preset)}
                    />
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Popular presets */}
            {popularPresets.length > 0 && popularPresets.some((p) => p.usageCount > 0) && (
              <>
                <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  {t('popular')}
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  {popularPresets
                    .filter((p) => p.usageCount > 0)
                    .map((preset) => (
                      <PresetMenuItem
                        key={preset.id}
                        preset={preset}
                        isSelected={preset.id === selectedPresetId}
                        onSelect={() => handleSelect(preset)}
                      />
                    ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}

            {/* All presets */}
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {t('allPresets')}
            </DropdownMenuLabel>
            <DropdownMenuGroup className="max-h-48 overflow-y-auto">
              {presets.map((preset) => (
                <PresetMenuItem
                  key={preset.id}
                  preset={preset}
                  isSelected={preset.id === selectedPresetId}
                  onSelect={() => handleSelect(preset)}
                />
              ))}
            </DropdownMenuGroup>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => { setOpen(false); onCreateNew?.(); }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('createNew')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setOpen(false); onManage?.(); }}>
            <Settings2 className="mr-2 h-4 w-4" />
            {t('manage')}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Individual preset menu item
interface PresetMenuItemProps {
  preset: Preset;
  isSelected: boolean;
  onSelect: () => void;
}

function PresetMenuItem({ preset, isSelected, onSelect }: PresetMenuItemProps) {
  const t = useTranslations('presetSelector');
  return (
    <DropdownMenuItem
      onClick={onSelect}
      className={isSelected ? 'bg-accent' : ''}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span
          className="flex h-6 w-6 items-center justify-center rounded text-sm"
          style={{ backgroundColor: `${preset.color}20` }}
        >
          {preset.icon || '💬'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="truncate font-medium text-sm">{preset.name}</span>
            {preset.isDefault && (
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />
            )}
          </div>
          {preset.description && (
            <p className="text-xs text-muted-foreground truncate">
              {preset.description}
            </p>
          )}
        </div>
        <Badge variant="outline" className="text-xs shrink-0">
          {preset.provider === 'auto' ? t('auto') : preset.provider}
        </Badge>
      </div>
    </DropdownMenuItem>
  );
}

export default PresetSelector;
