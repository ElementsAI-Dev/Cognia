'use client';

/**
 * Skill Filter Sheet Component
 * 
 * Mobile-optimized filter interface using bottom sheet pattern
 * Provides category, status, source filters with visual feedback
 */

import { useTranslations } from 'next-intl';
import {
  Filter,
  RotateCcw,
  Check,
  Sparkles,
  Code,
  Palette,
  Building2,
  Zap,
  BarChart3,
  MessageSquare,
  Cog,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { SkillCategory, SkillStatus } from '@/types/system/skill';

const CATEGORY_OPTIONS: Array<{ value: SkillCategory | 'all'; labelKey: string; icon: React.ReactNode; color: string }> = [
  { value: 'all', labelKey: 'allCategories', icon: <Sparkles className="h-4 w-4" />, color: 'bg-primary/10 text-primary' },
  { value: 'creative-design', labelKey: 'categoryCreativeDesign', icon: <Palette className="h-4 w-4" />, color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400' },
  { value: 'development', labelKey: 'categoryDevelopment', icon: <Code className="h-4 w-4" />, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { value: 'enterprise', labelKey: 'categoryEnterprise', icon: <Building2 className="h-4 w-4" />, color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  { value: 'productivity', labelKey: 'categoryProductivity', icon: <Zap className="h-4 w-4" />, color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
  { value: 'data-analysis', labelKey: 'categoryDataAnalysis', icon: <BarChart3 className="h-4 w-4" />, color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  { value: 'communication', labelKey: 'categoryCommunication', icon: <MessageSquare className="h-4 w-4" />, color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  { value: 'meta', labelKey: 'categoryMeta', icon: <Cog className="h-4 w-4" />, color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' },
  { value: 'custom', labelKey: 'categoryCustom', icon: <FileText className="h-4 w-4" />, color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400' },
];

const STATUS_OPTIONS: Array<{ value: SkillStatus | 'all'; labelKey: string }> = [
  { value: 'all', labelKey: 'allStatus' },
  { value: 'enabled', labelKey: 'enabled' },
  { value: 'disabled', labelKey: 'disabled' },
  { value: 'error', labelKey: 'hasErrors' },
];

const SOURCE_OPTIONS: Array<{ value: 'all' | 'builtin' | 'custom' | 'imported'; labelKey: string }> = [
  { value: 'all', labelKey: 'allSources' },
  { value: 'builtin', labelKey: 'builtin' },
  { value: 'custom', labelKey: 'categoryCustom' },
  { value: 'imported', labelKey: 'imported' },
];

export interface SkillFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryFilter: SkillCategory | 'all';
  onCategoryChange: (category: SkillCategory | 'all') => void;
  statusFilter: SkillStatus | 'all';
  onStatusChange: (status: SkillStatus | 'all') => void;
  sourceFilter: 'all' | 'builtin' | 'custom' | 'imported';
  onSourceChange: (source: 'all' | 'builtin' | 'custom' | 'imported') => void;
  showActiveOnly: boolean;
  onShowActiveOnlyChange: (value: boolean) => void;
  categoryCounts: Record<string, number>;
  onClearFilters: () => void;
}

export function SkillFilterSheet({
  open,
  onOpenChange,
  categoryFilter,
  onCategoryChange,
  statusFilter,
  onStatusChange,
  sourceFilter,
  onSourceChange,
  showActiveOnly,
  onShowActiveOnlyChange,
  categoryCounts,
  onClearFilters,
}: SkillFilterSheetProps) {
  const t = useTranslations('skills');

  const hasActiveFilters = 
    categoryFilter !== 'all' || 
    statusFilter !== 'all' || 
    sourceFilter !== 'all' || 
    showActiveOnly;

  const activeFilterCount = [
    categoryFilter !== 'all',
    statusFilter !== 'all',
    sourceFilter !== 'all',
    showActiveOnly,
  ].filter(Boolean).length;

  const handleClearAndClose = () => {
    onClearFilters();
  };

  const handleApply = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl px-0">
        <SheetHeader className="px-4 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Filter className="h-5 w-5 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-left">{t('filterSkills')}</SheetTitle>
                {activeFilterCount > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('activeFiltersCount', { count: activeFilterCount })}
                  </p>
                )}
              </div>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={handleClearAndClose}
              >
                <RotateCcw className="h-4 w-4 mr-1.5" />
                {t('clearFilters')}
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(85vh-140px)]">
          <div className="p-4 space-y-6">
            {/* Category Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('category')}
                </Label>
                {categoryFilter !== 'all' && (
                  <Badge variant="secondary" className="text-[10px] h-5">
                    1
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {CATEGORY_OPTIONS.map((option) => {
                  const isSelected = categoryFilter === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => onCategoryChange(option.value)}
                      className={cn(
                        'flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left',
                        'hover:bg-muted/50 active:scale-[0.98]',
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-transparent bg-muted/30'
                      )}
                    >
                      <div className={cn('p-1.5 rounded-lg', option.color)}>
                        {option.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-medium truncate',
                          isSelected && 'text-primary'
                        )}>
                          {t(option.labelKey)}
                        </p>
                        {categoryCounts[option.value] !== undefined && (
                          <p className="text-xs text-muted-foreground">
                            {t('skillCountNumber', { count: categoryCounts[option.value] })}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Status Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('status')}
                </Label>
                {statusFilter !== 'all' && (
                  <Badge variant="secondary" className="text-[10px] h-5">
                    1
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((option) => {
                  const isSelected = statusFilter === option.value;
                  return (
                    <Button
                      key={option.value}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'h-9 transition-all',
                        isSelected && 'shadow-sm'
                      )}
                      onClick={() => onStatusChange(option.value)}
                    >
                      {t(option.labelKey)}
                      {isSelected && <Check className="h-3.5 w-3.5 ml-1.5" />}
                    </Button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Source Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('source')}
                </Label>
                {sourceFilter !== 'all' && (
                  <Badge variant="secondary" className="text-[10px] h-5">
                    1
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {SOURCE_OPTIONS.map((option) => {
                  const isSelected = sourceFilter === option.value;
                  return (
                    <Button
                      key={option.value}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'h-9 transition-all',
                        isSelected && 'shadow-sm'
                      )}
                      onClick={() => onSourceChange(option.value)}
                    >
                      {t(option.labelKey)}
                      {isSelected && <Check className="h-3.5 w-3.5 ml-1.5" />}
                    </Button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Active Only Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('activeOnly')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('showActiveSkillsOnly')}
                  </p>
                </div>
              </div>
              <Switch
                checked={showActiveOnly}
                onCheckedChange={onShowActiveOnlyChange}
              />
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="px-4 py-3 border-t bg-background">
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              {t('cancel')}
            </Button>
            <Button
              className="flex-1"
              onClick={handleApply}
            >
              {t('applyFilters')}
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2 bg-primary-foreground/20">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default SkillFilterSheet;
