'use client';

/**
 * Skill Suggestions Component
 * 
 * Shows matching skills based on user input with quick activation
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Sparkles,
  X,
  ChevronUp,
  ChevronDown,
  Zap,
  Code,
  Palette,
  Building2,
  BarChart3,
  MessageSquare,
  Cog,
  FileText,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useSkillStore } from '@/stores/agent';
import { findMatchingSkills } from '@/lib/skills/executor';
import type { Skill, SkillCategory } from '@/types/skill';

const CATEGORY_ICONS: Record<SkillCategory, React.ReactNode> = {
  'creative-design': <Palette className="h-3.5 w-3.5" />,
  'development': <Code className="h-3.5 w-3.5" />,
  'enterprise': <Building2 className="h-3.5 w-3.5" />,
  'productivity': <Zap className="h-3.5 w-3.5" />,
  'data-analysis': <BarChart3 className="h-3.5 w-3.5" />,
  'communication': <MessageSquare className="h-3.5 w-3.5" />,
  'meta': <Cog className="h-3.5 w-3.5" />,
  'custom': <FileText className="h-3.5 w-3.5" />,
};

interface SkillSuggestionsProps {
  query: string;
  onSkillActivate?: (skill: Skill) => void;
  onSkillDeactivate?: (skill: Skill) => void;
  className?: string;
  minQueryLength?: number;
  maxSuggestions?: number;
  showActiveSkills?: boolean;
}

export function SkillSuggestions({
  query,
  onSkillActivate,
  onSkillDeactivate,
  className,
  minQueryLength = 3,
  maxSuggestions = 3,
  showActiveSkills = true,
}: SkillSuggestionsProps) {
  const t = useTranslations('skills');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  const {
    skills,
    activateSkill,
    deactivateSkill,
    getActiveSkills,
  } = useSkillStore();

  const activeSkills = useMemo(() => getActiveSkills(), [getActiveSkills]);

  // Track query prefix to reset dismissed state
  const queryPrefix = query.slice(0, 10);
  const [lastQueryPrefix, setLastQueryPrefix] = useState(queryPrefix);
  
  // Reset dismissed when query prefix changes
  const effectiveDismissed = useMemo(() => {
    if (queryPrefix !== lastQueryPrefix) {
      return false;
    }
    return isDismissed;
  }, [queryPrefix, lastQueryPrefix, isDismissed]);

  // Update last query prefix when it changes
  if (queryPrefix !== lastQueryPrefix) {
    setLastQueryPrefix(queryPrefix);
    if (isDismissed) {
      setIsDismissed(false);
    }
  }

  // Find matching skills based on query
  const suggestedSkills = useMemo(() => {
    if (!query || query.length < minQueryLength || effectiveDismissed) {
      return [];
    }

    const enabledSkills = Object.values(skills).filter(s => s.status === 'enabled');
    const matches = findMatchingSkills(enabledSkills, query, maxSuggestions);
    
    // Filter out already active skills from suggestions
    return matches.filter(s => !s.isActive);
  }, [query, minQueryLength, effectiveDismissed, skills, maxSuggestions]);

  const handleActivate = useCallback((skill: Skill) => {
    activateSkill(skill.id);
    onSkillActivate?.(skill);
  }, [activateSkill, onSkillActivate]);

  const handleDeactivate = useCallback((skill: Skill) => {
    deactivateSkill(skill.id);
    onSkillDeactivate?.(skill);
  }, [deactivateSkill, onSkillDeactivate]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
  }, []);

  // Don't render if nothing to show
  if (suggestedSkills.length === 0 && activeSkills.length === 0) {
    return null;
  }

  // Only show active skills indicator if no suggestions
  if (suggestedSkills.length === 0 && activeSkills.length > 0 && showActiveSkills) {
    return (
      <div className={cn('flex items-center gap-2 px-2 py-1', className)}>
        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-xs text-muted-foreground">
          {t('activeSkillsCount', { count: activeSkills.length })}
        </span>
        <div className="flex items-center gap-1">
          {activeSkills.slice(0, 3).map((skill) => (
            <Tooltip key={skill.id}>
              <TooltipTrigger asChild>
                <Badge
                  variant="secondary"
                  className="text-xs cursor-pointer hover:bg-destructive/20"
                  onClick={() => handleDeactivate(skill)}
                >
                  {CATEGORY_ICONS[skill.category]}
                  <span className="ml-1">{skill.metadata.name}</span>
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              </TooltipTrigger>
              <TooltipContent>{t('clickToDeactivate')}</TooltipContent>
            </Tooltip>
          ))}
          {activeSkills.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{activeSkills.length - 3}
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'border rounded-lg bg-background/95 backdrop-blur shadow-lg',
      'animate-in fade-in-0 slide-in-from-bottom-2 duration-200',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs font-medium">{t('suggestedSkills')}</span>
          <Badge variant="secondary" className="text-xs h-5 px-1.5">
            {suggestedSkills.length}
          </Badge>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={handleDismiss}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Suggestions with smooth expand/collapse */}
      <div className={cn(
        'overflow-hidden transition-all duration-200 ease-out',
        isExpanded ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'
      )}>
        <div className="p-1.5 space-y-0.5">
          {suggestedSkills.map((skill) => (
            <div
              key={skill.id}
              className="flex items-center justify-between gap-2 p-1.5 rounded-md hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="shrink-0 text-muted-foreground">
                  {CATEGORY_ICONS[skill.category]}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-xs truncate">
                    {skill.metadata.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {skill.metadata.description}
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="h-6 text-xs shrink-0 px-2"
                onClick={() => handleActivate(skill)}
              >
                <Zap className="h-3 w-3 mr-1" />
                {t('activate')}
              </Button>
            </div>
          ))}

          {/* Active skills section */}
          {showActiveSkills && activeSkills.length > 0 && (
            <>
              <div className="pt-1.5 mt-1 border-t">
                <div className="flex items-center gap-2 px-1.5 pb-1">
                  <Check className="h-3 w-3 text-green-500" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {t('currentlyActive')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 px-1.5">
                  {activeSkills.map((skill) => (
                    <Badge
                      key={skill.id}
                      variant="default"
                      className="text-xs cursor-pointer hover:bg-destructive h-5"
                      onClick={() => handleDeactivate(skill)}
                    >
                      {skill.metadata.name}
                      <X className="h-2.5 w-2.5 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact skill indicator for chat header
 */
interface ActiveSkillsIndicatorProps {
  onClick?: () => void;
  className?: string;
}

export function ActiveSkillsIndicator({
  onClick,
  className,
}: ActiveSkillsIndicatorProps) {
  const t = useTranslations('skills');
  const { getActiveSkills } = useSkillStore();
  const activeSkills = useMemo(() => getActiveSkills(), [getActiveSkills]);

  if (activeSkills.length === 0) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('h-7 gap-1.5', className)}
          onClick={onClick}
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs">{activeSkills.length}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-sm">
          <div className="font-medium mb-1">{t('activeSkills')}</div>
          {activeSkills.map((skill) => (
            <div key={skill.id} className="text-xs text-muted-foreground">
              • {skill.metadata.name}
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export default SkillSuggestions;
