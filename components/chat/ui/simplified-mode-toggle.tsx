'use client';

/**
 * SimplifiedModeToggle - Quick toggle for simplified interface mode
 * Provides a clean way to switch between full and simplified modes
 * Similar to focus mode in modern productivity apps
 */

import { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles, Minimize2, Focus, Leaf, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores';
import type { SimplifiedModePreset } from '@/stores/settings/settings-store';

interface SimplifiedModeToggleProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon';
}

const presetIcons: Record<SimplifiedModePreset, React.ReactNode> = {
  off: <Sparkles className="h-4 w-4" />,
  minimal: <Minimize2 className="h-4 w-4" />,
  focused: <Focus className="h-4 w-4" />,
  zen: <Leaf className="h-4 w-4" />,
};

const presetColors: Record<SimplifiedModePreset, string> = {
  off: 'text-muted-foreground',
  minimal: 'text-blue-500',
  focused: 'text-amber-500',
  zen: 'text-emerald-500',
};

export function SimplifiedModeToggle({
  className,
  showLabel = false,
  variant = 'ghost',
  size = 'sm',
}: SimplifiedModeToggleProps) {
  const t = useTranslations('simplifiedMode');

  const simplifiedModeSettings = useSettingsStore((state) => state.simplifiedModeSettings);
  const setSimplifiedModePreset = useSettingsStore((state) => state.setSimplifiedModePreset);

  const currentPreset = simplifiedModeSettings.preset;
  const isEnabled = simplifiedModeSettings.enabled;

  const presetLabels = useMemo(
    () => ({
      off: t('presets.off'),
      minimal: t('presets.minimal'),
      focused: t('presets.focused'),
      zen: t('presets.zen'),
    }),
    [t]
  );

  const presetDescriptions = useMemo(
    () => ({
      off: t('descriptions.off'),
      minimal: t('descriptions.minimal'),
      focused: t('descriptions.focused'),
      zen: t('descriptions.zen'),
    }),
    [t]
  );

  const handlePresetChange = useCallback(
    (preset: SimplifiedModePreset) => {
      setSimplifiedModePreset(preset);
    },
    [setSimplifiedModePreset]
  );

  const handleQuickToggle = useCallback(() => {
    if (isEnabled) {
      setSimplifiedModePreset('off');
    } else {
      setSimplifiedModePreset('focused');
    }
  }, [isEnabled, setSimplifiedModePreset]);

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant={variant}
              size={size}
              className={cn(
                'gap-1.5 transition-colors',
                isEnabled && presetColors[currentPreset],
                className
              )}
            >
              {presetIcons[currentPreset]}
              {showLabel && (
                <span className="text-xs font-medium">{presetLabels[currentPreset]}</span>
              )}
              {isEnabled && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-4 px-1 text-[10px] font-normal"
                >
                  {t('active')}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={4}>
          <p className="font-medium">{t('title')}</p>
          <p className="text-xs text-muted-foreground">{t('tooltip')}</p>
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          {t('title')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {(Object.keys(presetLabels) as SimplifiedModePreset[]).map((preset) => (
          <DropdownMenuItem
            key={preset}
            onClick={() => handlePresetChange(preset)}
            className={cn(
              'flex flex-col items-start gap-0.5 py-2',
              currentPreset === preset && 'bg-accent'
            )}
          >
            <div className="flex items-center gap-2 w-full">
              <span className={cn(presetColors[preset])}>{presetIcons[preset]}</span>
              <span className="font-medium">{presetLabels[preset]}</span>
              {currentPreset === preset && (
                <Badge variant="outline" className="ml-auto h-5 text-[10px]">
                  {t('current')}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground pl-6">
              {presetDescriptions[preset]}
            </p>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleQuickToggle}
          className="text-xs text-muted-foreground"
        >
          {t('shortcutHint', { shortcut: 'Ctrl+Shift+S' })}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Compact toggle button for simplified mode
 * Can be used in the chat header for quick access
 */
export function SimplifiedModeQuickToggle({ className }: { className?: string }) {
  const simplifiedModeSettings = useSettingsStore((state) => state.simplifiedModeSettings);
  const toggleSimplifiedMode = useSettingsStore((state) => state.toggleSimplifiedMode);
  const t = useTranslations('simplifiedMode');

  const isEnabled = simplifiedModeSettings.enabled;
  const currentPreset = simplifiedModeSettings.preset;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSimplifiedMode}
          className={cn(
            'h-8 w-8 transition-colors',
            isEnabled && presetColors[currentPreset],
            className
          )}
        >
          {isEnabled ? <Leaf className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4}>
        <p>{isEnabled ? t('disable') : t('enable')}</p>
        <p className="text-xs text-muted-foreground">Ctrl+Shift+S</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default SimplifiedModeToggle;
