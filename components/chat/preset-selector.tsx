'use client';

/**
 * PresetSelector - Quick preset selection dropdown for chat
 */

import { useState, useEffect } from 'react';
import {
  ChevronDown,
  Plus,
  Settings,
  Star,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePresetStore } from '@/stores';
import type { Preset } from '@/types/preset';
import { cn } from '@/lib/utils';

interface PresetSelectorProps {
  selectedPresetId?: string | null;
  onSelectPreset: (preset: Preset) => void;
  onManagePresets: () => void;
  onCreatePreset: () => void;
  className?: string;
}

export function PresetSelector({
  selectedPresetId,
  onSelectPreset,
  onManagePresets,
  onCreatePreset,
  className,
}: PresetSelectorProps) {
  const presets = usePresetStore((state) => state.presets);
  const getRecentPresets = usePresetStore((state) => state.getRecentPresets);
  const getDefaultPreset = usePresetStore((state) => state.getDefaultPreset);
  const initializeDefaults = usePresetStore((state) => state.initializeDefaults);

  const [isOpen, setIsOpen] = useState(false);

  // Initialize default presets on mount - only run once
  useEffect(() => {
    initializeDefaults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedPreset = selectedPresetId
    ? presets.find((p) => p.id === selectedPresetId)
    : getDefaultPreset();

  const recentPresets = getRecentPresets(3);
  const defaultPresets = presets.filter((p) => p.isDefault || p.isBuiltin);
  const customPresets = presets.filter((p) => !p.isDefault && !p.isBuiltin);

  const handleSelectPreset = (preset: Preset) => {
    onSelectPreset(preset);
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 gap-2 px-3 font-normal',
            className
          )}
        >
          {selectedPreset ? (
            <>
              <span className="text-base">{selectedPreset.icon}</span>
              <span className="max-w-[120px] truncate">{selectedPreset.name}</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>Select Preset</span>
            </>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        {/* Recent presets */}
        {recentPresets.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Recent
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {recentPresets.map((preset) => (
                <PresetMenuItem
                  key={preset.id}
                  preset={preset}
                  isSelected={preset.id === selectedPresetId}
                  onClick={() => handleSelectPreset(preset)}
                />
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Default/Built-in presets */}
        {defaultPresets.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
              <Star className="h-3 w-3" />
              Built-in
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {defaultPresets.map((preset) => (
                <PresetMenuItem
                  key={preset.id}
                  preset={preset}
                  isSelected={preset.id === selectedPresetId}
                  onClick={() => handleSelectPreset(preset)}
                />
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Custom presets */}
        {customPresets.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Custom
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {customPresets.map((preset) => (
                <PresetMenuItem
                  key={preset.id}
                  preset={preset}
                  isSelected={preset.id === selectedPresetId}
                  onClick={() => handleSelectPreset(preset)}
                />
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Actions */}
        <DropdownMenuItem onClick={onCreatePreset}>
          <Plus className="mr-2 h-4 w-4" />
          Create Preset
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onManagePresets}>
          <Settings className="mr-2 h-4 w-4" />
          Manage Presets
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface PresetMenuItemProps {
  preset: Preset;
  isSelected: boolean;
  onClick: () => void;
}

function PresetMenuItem({ preset, isSelected, onClick }: PresetMenuItemProps) {
  return (
    <DropdownMenuItem
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 cursor-pointer',
        isSelected && 'bg-accent'
      )}
    >
      <span
        className="flex h-6 w-6 items-center justify-center rounded text-sm"
        style={{ backgroundColor: `${preset.color}20` }}
      >
        {preset.icon}
      </span>
      <div className="flex flex-1 flex-col">
        <span className="text-sm font-medium">{preset.name}</span>
        {preset.description && (
          <span className="text-xs text-muted-foreground line-clamp-1">
            {preset.description}
          </span>
        )}
      </div>
      {preset.isDefault && (
        <Badge variant="secondary" className="h-5 text-[10px]">
          Default
        </Badge>
      )}
    </DropdownMenuItem>
  );
}

export default PresetSelector;
