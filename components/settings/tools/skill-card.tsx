'use client';

/**
 * SkillCard Component
 *
 * Modern card design with inline actions, hover effects, and compact layout.
 * Supports both grid and list view variants.
 */

import { Edit2, Trash2, AlertCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SKILL_CATEGORY_KEYS } from '@/lib/settings/tools';
import { SKILL_CATEGORY_ICONS } from './skill-icons';
import type { Skill, SkillCategory } from '@/types/system/skill';
import type { useTranslations } from 'next-intl';

const CATEGORY_COLORS: Record<SkillCategory, string> = {
  'creative-design': 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  development: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  enterprise: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  productivity: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  'data-analysis': 'bg-green-500/10 text-green-600 dark:text-green-400',
  communication: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  meta: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  custom: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
};

export interface SkillCardProps {
  skill: Skill;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onActivate: () => void;
  t: ReturnType<typeof useTranslations>;
  variant?: 'grid' | 'list';
}

export function SkillCard({ skill, onEdit, onDelete, onToggle, onActivate, t, variant = 'grid' }: SkillCardProps) {
  const isEnabled = skill.status === 'enabled';
  const isActive = skill.isActive;
  const hasErrors = skill.validationErrors && skill.validationErrors.length > 0;

  if (variant === 'list') {
    return (
      <div
        className={cn(
          'group flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200',
          'hover:bg-accent/50 hover:border-primary/30 hover:shadow-sm',
          !isEnabled && 'opacity-60 hover:opacity-80',
          hasErrors && 'border-destructive/30',
        )}
        onClick={onEdit}
      >
        <div className={cn('p-2 rounded-lg shrink-0', CATEGORY_COLORS[skill.category])}>
          {SKILL_CATEGORY_ICONS[skill.category]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-sm truncate">{skill.metadata.name}</span>
            {isActive && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
            {skill.source === 'builtin' && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">{t('builtin')}</Badge>
            )}
            {hasErrors && <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{skill.metadata.description}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isActive ? 'default' : 'ghost'}
                size="icon"
                className={cn('h-7 w-7', isActive && 'bg-green-600 hover:bg-green-700')}
                onClick={onActivate}
              >
                <Zap className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isActive ? t('deactivate') : t('activate')}</TooltipContent>
          </Tooltip>
          <Switch checked={isEnabled} onCheckedChange={onToggle} />
        </div>
      </div>
    );
  }

  // Grid variant (default)
  return (
    <div
      className={cn(
        'group relative rounded-xl border bg-card p-4 cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5',
        !isEnabled && 'opacity-60 hover:opacity-80',
        hasErrors && 'border-destructive/30',
      )}
      onClick={onEdit}
    >
      {/* Header: Icon + Title + Switch */}
      <div className="flex items-start gap-3">
        <div className={cn(
          'p-2 rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-110',
          CATEGORY_COLORS[skill.category],
        )}>
          {SKILL_CATEGORY_ICONS[skill.category]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="font-medium text-sm truncate">{skill.metadata.name}</h4>
            {isActive && (
              <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" title={t('active')} />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {skill.metadata.description}
          </p>
        </div>
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <Switch checked={isEnabled} onCheckedChange={onToggle} />
        </div>
      </div>

      {/* Tags + Meta */}
      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
        {skill.source === 'builtin' && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{t('builtin')}</Badge>
        )}
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {t(`categories.${SKILL_CATEGORY_KEYS[skill.category]}`)}
        </Badge>
        {skill.tags.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
            {tag}
          </Badge>
        ))}
        {skill.tags.length > 2 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            +{skill.tags.length - 2}
          </Badge>
        )}
        {hasErrors && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-0.5">
            <AlertCircle className="h-3 w-3" />
            {skill.validationErrors!.length}
          </Badge>
        )}
      </div>

      {/* Footer: Actions */}
      <div className="mt-3 pt-3 border-t flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className={cn('h-7 px-2.5 text-xs', isActive && 'bg-green-600 hover:bg-green-700')}
                onClick={onActivate}
              >
                <Zap className="h-3 w-3 mr-1" />
                {isActive ? t('deactivate') : t('activate')}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isActive ? t('deactivate') : t('activate')}</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('edit')}</TooltipContent>
          </Tooltip>
          {skill.source !== 'builtin' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('delete')}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Usage count indicator */}
      {skill.usageCount !== undefined && skill.usageCount > 0 && (
        <div className="absolute top-2 right-12 text-[10px] text-muted-foreground tabular-nums">
          {skill.usageCount}x
        </div>
      )}
    </div>
  );
}
