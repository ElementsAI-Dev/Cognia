'use client';

/**
 * Skill Card Component
 * 
 * Compact card view for displaying skill information with quick actions
 */

import { memo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  MoreVertical,
  Power,
  PowerOff,
  Trash2,
  Edit,
  Copy,
  Download,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { cn } from '@/lib/utils';
import { CATEGORY_ICONS, CATEGORY_COLORS } from './skill-constants';
import type { Skill } from '@/types/system/skill';

export interface SkillCardProps {
  skill: Skill;
  variant?: 'default' | 'compact' | 'list';
  selected?: boolean;
  onSelect?: (skill: Skill) => void;
  onToggleEnabled?: (skill: Skill) => void;
  onToggleActive?: (skill: Skill) => void;
  onEdit?: (skill: Skill) => void;
  onDelete?: (skill: Skill) => void;
  onDuplicate?: (skill: Skill) => void;
  onExport?: (skill: Skill) => void;
  onView?: (skill: Skill) => void;
  showActions?: boolean;
  className?: string;
}

export const SkillCard = memo(function SkillCard({
  skill,
  variant = 'default',
  selected = false,
  onSelect,
  onToggleEnabled,
  onToggleActive,
  onEdit,
  onDelete,
  onDuplicate,
  onExport,
  onView,
  showActions = true,
  className,
}: SkillCardProps) {
  const t = useTranslations('skills');

  const handleCardClick = useCallback(() => {
    if (onSelect) {
      onSelect(skill);
    } else if (onView) {
      onView(skill);
    }
  }, [skill, onSelect, onView]);

  const handleToggleEnabled = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleEnabled?.(skill);
  }, [skill, onToggleEnabled]);

  const handleToggleActive = useCallback((_checked: boolean) => {
    onToggleActive?.(skill);
  }, [skill, onToggleActive]);

  const isEnabled = skill.status === 'enabled';
  const isActive = skill.isActive;
  const isBuiltin = skill.source === 'builtin';

  // Compact variant - minimal card for grids
  if (variant === 'compact') {
    return (
      <Card
        className={cn(
          'group cursor-pointer transition-all duration-200',
          'hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5',
          'active:scale-[0.98]',
          selected && 'ring-2 ring-primary border-primary',
          !isEnabled && 'opacity-60 hover:opacity-80',
          className
        )}
        onClick={handleCardClick}
      >
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <div className={cn(
              'p-1.5 rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-110',
              CATEGORY_COLORS[skill.category]
            )}>
              {CATEGORY_ICONS[skill.category]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="font-medium text-sm truncate">{skill.metadata.name}</h4>
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {skill.metadata.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // List variant - horizontal layout for list views
  if (variant === 'list') {
    return (
      <div
        className={cn(
          'group flex items-center gap-3 sm:gap-4 p-3 rounded-xl border cursor-pointer transition-all duration-200 overflow-hidden',
          'hover:bg-accent/50 hover:border-primary/30 hover:shadow-sm',
          'active:scale-[0.995]',
          selected && 'ring-2 ring-primary border-primary bg-accent/30',
          !isEnabled && 'opacity-60 hover:opacity-80',
          className
        )}
        onClick={handleCardClick}
      >
        <div className={cn(
          'p-2 rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-105',
          CATEGORY_COLORS[skill.category]
        )}>
          {CATEGORY_ICONS[skill.category]}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate">{skill.metadata.name}</h4>
            {isBuiltin && (
              <Badge variant="outline" className="text-xs shrink-0">
                {t('builtin')}
              </Badge>
            )}
            {isActive && (
              <Badge variant="default" className="bg-green-500 text-xs shrink-0">
                {t('active')}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {skill.metadata.description}
          </p>
        </div>

        {showActions && (
          <div className="flex items-center gap-2 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <Switch
                    checked={isActive}
                    onCheckedChange={handleToggleActive}
                    disabled={!isEnabled}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {isActive ? t('deactivateSkill') : t('activateSkill')}
              </TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView?.(skill)}>
                  <Eye className="h-4 w-4 mr-2" />
                  {t('viewDetails')}
                </DropdownMenuItem>
                {!isBuiltin && (
                  <DropdownMenuItem onClick={() => onEdit?.(skill)}>
                    <Edit className="h-4 w-4 mr-2" />
                    {t('edit')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onDuplicate?.(skill)}>
                  <Copy className="h-4 w-4 mr-2" />
                  {t('duplicate')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport?.(skill)}>
                  <Download className="h-4 w-4 mr-2" />
                  {t('export')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onToggleEnabled?.(skill)}>
                  {isEnabled ? (
                    <>
                      <PowerOff className="h-4 w-4 mr-2" />
                      {t('disable')}
                    </>
                  ) : (
                    <>
                      <Power className="h-4 w-4 mr-2" />
                      {t('enable')}
                    </>
                  )}
                </DropdownMenuItem>
                {!isBuiltin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDelete?.(skill)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('delete')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    );
  }

  // Default variant - full card with all details
  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all duration-200',
        'hover:shadow-lg hover:shadow-primary/5 hover:border-primary/50 hover:-translate-y-0.5',
        'active:scale-[0.99] active:shadow-md',
        selected && 'ring-2 ring-primary border-primary shadow-md',
        !isEnabled && 'opacity-60 hover:opacity-80',
        className
      )}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn(
              'p-2 rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-110',
              CATEGORY_COLORS[skill.category]
            )}>
              {CATEGORY_ICONS[skill.category]}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base truncate flex items-center gap-2">
                {skill.metadata.name}
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                )}
              </CardTitle>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {isBuiltin && (
                  <Badge variant="outline" className="text-xs">
                    {t('builtin')}
                  </Badge>
                )}
                {skill.version && (
                  <Badge variant="secondary" className="text-xs">
                    v{skill.version}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView?.(skill)}>
                  <Eye className="h-4 w-4 mr-2" />
                  {t('viewDetails')}
                </DropdownMenuItem>
                {!isBuiltin && (
                  <DropdownMenuItem onClick={() => onEdit?.(skill)}>
                    <Edit className="h-4 w-4 mr-2" />
                    {t('edit')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onDuplicate?.(skill)}>
                  <Copy className="h-4 w-4 mr-2" />
                  {t('duplicate')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport?.(skill)}>
                  <Download className="h-4 w-4 mr-2" />
                  {t('export')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onToggleEnabled?.(skill)}>
                  {isEnabled ? (
                    <>
                      <PowerOff className="h-4 w-4 mr-2" />
                      {t('disable')}
                    </>
                  ) : (
                    <>
                      <Power className="h-4 w-4 mr-2" />
                      {t('enable')}
                    </>
                  )}
                </DropdownMenuItem>
                {!isBuiltin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDelete?.(skill)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('delete')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        <CardDescription className="line-clamp-2 text-sm">
          {skill.metadata.description}
        </CardDescription>
        
        {skill.tags && skill.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {skill.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {skill.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{skill.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
        
        {showActions && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isEnabled ? "default" : "secondary"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleToggleEnabled}
                  >
                    {isEnabled ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {t('enabled')}
                      </>
                    ) : (
                      <>
                        <PowerOff className="h-3 w-3 mr-1" />
                        {t('disabled')}
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isEnabled ? t('clickToDisable') : t('clickToEnable')}
                </TooltipContent>
              </Tooltip>
            </div>
            
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground mr-1">
                {t('activeInChat')}
              </span>
              <Switch
                checked={isActive}
                onCheckedChange={handleToggleActive}
                disabled={!isEnabled}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default SkillCard;
