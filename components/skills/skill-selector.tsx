'use client';

/**
 * Skill Selector Component
 * 
 * Component for selecting and activating skills in agent context
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Check,
  Search,
  Sparkles,
  ChevronDown,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useSkillStore } from '@/stores/skill-store';
import type { Skill, SkillCategory } from '@/types/skill';

const CATEGORY_LABEL_KEYS: Record<SkillCategory, string> = {
  'creative-design': 'categoryCreativeDesign',
  'development': 'categoryDevelopment',
  'enterprise': 'categoryEnterprise',
  'productivity': 'categoryProductivity',
  'data-analysis': 'categoryDataAnalysis',
  'communication': 'categoryCommunication',
  'meta': 'categoryMeta',
  'custom': 'categoryCustom',
};

interface SkillSelectorProps {
  onSkillsChange?: (skills: Skill[]) => void;
  maxSkills?: number;
  compact?: boolean;
}

export function SkillSelector({
  onSkillsChange,
  maxSkills = 5,
  compact = false,
}: SkillSelectorProps) {
  const t = useTranslations('skills');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const {
    skills,
    activeSkillIds,
    activateSkill,
    deactivateSkill,
    getActiveSkills,
  } = useSkillStore();

  const allSkills = useMemo(() => 
    Object.values(skills).filter(s => s.status === 'enabled'),
    [skills]
  );

  const activeSkills = getActiveSkills();

  const filteredSkills = useMemo(() => {
    if (!search) return allSkills;
    const lowerSearch = search.toLowerCase();
    return allSkills.filter(skill =>
      skill.metadata.name.toLowerCase().includes(lowerSearch) ||
      skill.metadata.description.toLowerCase().includes(lowerSearch) ||
      skill.tags.some(tag => tag.toLowerCase().includes(lowerSearch))
    );
  }, [allSkills, search]);

  const groupedSkills = useMemo(() => {
    const groups: Record<SkillCategory, Skill[]> = {
      'creative-design': [],
      'development': [],
      'enterprise': [],
      'productivity': [],
      'data-analysis': [],
      'communication': [],
      'meta': [],
      'custom': [],
    };

    for (const skill of filteredSkills) {
      groups[skill.category].push(skill);
    }

    return groups;
  }, [filteredSkills]);

  const handleToggleSkill = (skill: Skill) => {
    const isActive = activeSkillIds.includes(skill.id);
    
    if (isActive) {
      deactivateSkill(skill.id);
    } else {
      if (activeSkillIds.length >= maxSkills) {
        return; // Max reached
      }
      activateSkill(skill.id);
    }

    // Notify parent
    const newActiveSkills = isActive
      ? activeSkills.filter(s => s.id !== skill.id)
      : [...activeSkills, skill];
    onSkillsChange?.(newActiveSkills);
  };

  const handleClearAll = () => {
    for (const id of activeSkillIds) {
      deactivateSkill(id);
    }
    onSkillsChange?.([]);
  };

  if (compact) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 justify-start"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {activeSkills.length > 0 ? (
              <>
                {activeSkills.length} {activeSkills.length !== 1 ? t('skillPlural') : t('skill')}
              </>
            ) : (
              t('selectSkills')
            )}
            <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder={t('searchSkills')}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>{t('noSkillsFoundCommand')}</CommandEmpty>
              {Object.entries(groupedSkills).map(([category, categorySkills]) => {
                if (categorySkills.length === 0) return null;
                return (
                  <CommandGroup key={category} heading={t(CATEGORY_LABEL_KEYS[category as SkillCategory])}>
                    {categorySkills.map((skill) => {
                      const isActive = activeSkillIds.includes(skill.id);
                      const disabled = !isActive && activeSkillIds.length >= maxSkills;
                      return (
                        <CommandItem
                          key={skill.id}
                          value={skill.metadata.name}
                          onSelect={() => handleToggleSkill(skill)}
                          disabled={disabled}
                          className={cn(disabled && 'opacity-50')}
                        >
                          <div className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50 [&_svg]:invisible"
                          )}>
                            <Check className="h-4 w-4" />
                          </div>
                          <div className="flex-1 truncate">
                            <span className="font-medium">{skill.metadata.name}</span>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <span className="font-medium">{t('activeSkillsLabel')}</span>
          <Badge variant="secondary">
            {activeSkills.length}/{maxSkills}
          </Badge>
        </div>
        {activeSkills.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearAll}>
            {t('clearAll')}
          </Button>
        )}
      </div>

      {/* Active Skills */}
      {activeSkills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeSkills.map((skill) => (
            <Badge
              key={skill.id}
              variant="default"
              className="pr-1 flex items-center gap-1"
            >
              {skill.metadata.name}
              <button
                className="ml-1 rounded-full hover:bg-primary-foreground/20 p-0.5"
                onClick={() => handleToggleSkill(skill)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search */}
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <Search className="h-4 w-4" />
        </InputGroupAddon>
        <InputGroupInput
          placeholder={t('searchSkills')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </InputGroup>

      {/* Available Skills */}
      <div className="space-y-4 max-h-[300px] overflow-y-auto">
        {Object.entries(groupedSkills).map(([category, categorySkills]) => {
          if (categorySkills.length === 0) return null;
          return (
            <div key={category}>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                {t(CATEGORY_LABEL_KEYS[category as SkillCategory])}
              </h4>
              <div className="space-y-1">
                {categorySkills.map((skill) => {
                  const isActive = activeSkillIds.includes(skill.id);
                  const disabled = !isActive && activeSkillIds.length >= maxSkills;
                  return (
                    <button
                      key={skill.id}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors",
                        isActive 
                          ? "bg-primary/10 border border-primary/30" 
                          : "hover:bg-muted",
                        disabled && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() => !disabled && handleToggleSkill(skill)}
                      disabled={disabled}
                    >
                      <div className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-sm border",
                        isActive
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      )}>
                        {isActive && <Check className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {skill.metadata.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {skill.metadata.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SkillSelector;
