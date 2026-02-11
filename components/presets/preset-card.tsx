'use client';

/**
 * PresetCard - displays a single preset with actions
 */

import { MoreHorizontal, Star, Copy, Trash2, Pencil, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { COLOR_TINT_CLASS } from '@/lib/presets';
import type { Preset } from '@/types/content/preset';

interface PresetCardProps {
  preset: Preset;
  isSelected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onSetDefault?: () => void;
}

export function PresetCard({
  preset,
  isSelected,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onSetDefault,
}: PresetCardProps) {
  const t = useTranslations('presets');
  const tChat = useTranslations('chat');

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'chat':
        return tChat('modeChat');
      case 'agent':
        return tChat('modeAgent');
      case 'research':
        return tChat('modeResearch');
      case 'learning':
        return tChat('modeLearning');
      default:
        return mode;
    }
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg text-xl',
                (preset.color && COLOR_TINT_CLASS[preset.color]) ?? 'bg-muted'
              )}
            >
              {preset.icon || '💬'}
            </span>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="truncate">{preset.name}</span>
                {preset.isDefault && (
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                )}
                {isSelected && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </CardTitle>
              {preset.description && (
                <CardDescription className="text-xs truncate">
                  {preset.description}
                </CardDescription>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>
                <Pencil className="mr-2 h-4 w-4" />
                {t('editPreset')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate?.(); }}>
                <Copy className="mr-2 h-4 w-4" />
                {t('duplicatePreset')}
              </DropdownMenuItem>
              {!preset.isDefault && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSetDefault?.(); }}>
                  <Star className="mr-2 h-4 w-4" />
                  {t('setDefault')}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('deletePreset')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-xs">
            {preset.provider === 'auto' ? tChat('autoMode') : preset.provider}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {getModeLabel(preset.mode)}
          </Badge>
          {preset.temperature !== undefined && (
            <Badge variant="secondary" className="text-xs">
              T: {preset.temperature}
            </Badge>
          )}
        </div>
        {preset.usageCount > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t('usedTimes', { count: preset.usageCount })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default PresetCard;
