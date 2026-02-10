'use client';

/**
 * Skill Settings Component
 *
 * Main component for managing Claude Skills configurations.
 * Features compact toolbar, responsive grid, view toggle, skeleton loading,
 * and improved category group headers.
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Plus,
  Sparkles,
  Search,
  X,
  AlertCircle,
  BookOpen,
  Upload,
  Grid3X3,
  List,
  Zap,
  // Separator icon not used - using Separator component instead
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from '@/components/ui/input-group';
import { EmptyState } from '@/components/layout/feedback/empty-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  TooltipProvider,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSkillStore } from '@/stores/skills';
import { parseSkillMd } from '@/lib/skills/parser';
import { SKILL_CATEGORY_KEYS } from '@/lib/settings/tools';
import { SkillDetail } from '@/components/skills/skill-detail';
import { SkillDiscovery } from '@/components/skills/skill-discovery';
import { SkillMarketplace } from '@/components/skills/skill-marketplace';
import { SkillCard } from './skill-card';
import { CreateSkillDialog } from './create-skill-dialog';
import { ImportSkillDialog } from './import-skill-dialog';
import { SKILL_CATEGORY_ICONS } from './skill-icons';
import type { Skill, SkillCategory, CreateSkillInput } from '@/types/system/skill';

const CATEGORY_COLORS: Record<SkillCategory, string> = {
  'creative-design': 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800',
  development: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  enterprise: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  productivity: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  'data-analysis': 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
  communication: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  meta: 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800',
  custom: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800',
};

type ViewMode = 'grid' | 'list';

function SkillCardSkeleton({ variant = 'grid' }: { variant?: ViewMode }) {
  if (variant === 'list') {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl border">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-6 w-10 rounded-full" />
      </div>
    );
  }
  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-full" />
        </div>
        <Skeleton className="h-5 w-9 rounded-full" />
      </div>
      <div className="flex gap-1.5">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-4 w-12 rounded-full" />
      </div>
      <Skeleton className="h-px w-full" />
      <div className="flex justify-between">
        <Skeleton className="h-7 w-20 rounded-md" />
        <div className="flex gap-1">
          <Skeleton className="h-7 w-7 rounded-md" />
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function SkillSettings() {
  const t = useTranslations('skillSettings');
  const tCommon = useTranslations('common');

  const {
    skills,
    isLoading,
    error,
    createSkill,
    deleteSkill,
    enableSkill,
    disableSkill,
    activateSkill,
    deactivateSkill,
    clearError,
    importSkill,
  } = useSkillStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<SkillCategory | 'all'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const allSkills = Object.values(skills);

  const filteredSkills = useMemo(() =>
    allSkills.filter((skill) => {
      const matchesSearch =
        !searchQuery ||
        skill.metadata.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        skill.metadata.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        skill.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = categoryFilter === 'all' || skill.category === categoryFilter;

      return matchesSearch && matchesCategory;
    }),
    [allSkills, searchQuery, categoryFilter]
  );

  const skillStats = useMemo(() => ({
    total: allSkills.length,
    enabled: allSkills.filter((s) => s.status === 'enabled').length,
    active: allSkills.filter((s) => s.isActive).length,
  }), [allSkills]);

  const handleCreateSkill = useCallback(
    (input: CreateSkillInput) => {
      createSkill(input);
    },
    [createSkill]
  );

  const handleImportSkill = useCallback(
    (content: string) => {
      const result = parseSkillMd(content);
      if (result.success && result.metadata && result.content) {
        importSkill({
          metadata: result.metadata,
          content: result.content,
          rawContent: result.rawContent,
          resources: [],
          status: 'enabled',
          source: 'imported',
          category: 'custom',
          tags: [],
        });
      }
    },
    [importSkill]
  );

  const handleToggleSkill = useCallback(
    (skill: Skill) => {
      if (skill.status === 'enabled') {
        disableSkill(skill.id);
      } else {
        enableSkill(skill.id);
      }
    },
    [enableSkill, disableSkill]
  );

  const handleActivateSkill = useCallback(
    (skill: Skill) => {
      if (skill.isActive) {
        deactivateSkill(skill.id);
      } else {
        activateSkill(skill.id);
      }
    },
    [activateSkill, deactivateSkill]
  );

  const [deleteConfirmSkillId, setDeleteConfirmSkillId] = useState<string | null>(null);

  const handleDeleteSkill = useCallback((skillId: string) => {
    setDeleteConfirmSkillId(skillId);
  }, []);

  const confirmDeleteSkill = useCallback(() => {
    if (deleteConfirmSkillId) {
      deleteSkill(deleteConfirmSkillId);
    }
    setDeleteConfirmSkillId(null);
  }, [deleteConfirmSkillId, deleteSkill, setDeleteConfirmSkillId]);

  const groupedSkills = useMemo(() =>
    filteredSkills.reduce(
      (acc, skill) => {
        if (!acc[skill.category]) {
          acc[skill.category] = [];
        }
        acc[skill.category].push(skill);
        return acc;
      },
      {} as Record<SkillCategory, Skill[]>
    ),
    [filteredSkills]
  );

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  {t('title')}
                </CardTitle>
                <CardDescription className="mt-1.5">{t('description')}</CardDescription>
              </div>
              {/* Stats summary */}
              {allSkills.length > 0 && (
                <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="tabular-nums">{skillStats.total} {t('total') || 'total'}</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="tabular-nums">{skillStats.enabled} {t('enabled') || 'enabled'}</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <Zap className="h-3.5 w-3.5" />
                    <span className="tabular-nums">{skillStats.active}</span>
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{tCommon('error')}</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  {error}
                  <Button variant="ghost" size="sm" onClick={clearError}>
                    <X className="h-4 w-4" />
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="my-skills" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="my-skills">{t('mySkills')}</TabsTrigger>
                <TabsTrigger value="discover">{t('discover')}</TabsTrigger>
                <TabsTrigger value="marketplace">{t('marketplace')}</TabsTrigger>
              </TabsList>

              <TabsContent value="my-skills" className="space-y-4">
                {/* Compact toolbar - single row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <InputGroup className="flex-1 min-w-[180px]">
                    <InputGroupAddon align="inline-start">
                      <Search className="h-4 w-4" />
                    </InputGroupAddon>
                    <InputGroupInput
                      placeholder={t('searchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="text-sm"
                    />
                    {searchQuery && (
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton size="icon-xs" onClick={() => setSearchQuery('')}>
                          <X className="h-3 w-3" />
                        </InputGroupButton>
                      </InputGroupAddon>
                    )}
                  </InputGroup>
                  <Select
                    value={categoryFilter}
                    onValueChange={(v) => setCategoryFilter(v as SkillCategory | 'all')}
                  >
                    <SelectTrigger className="w-[140px] sm:w-[160px] h-9 text-sm">
                      <SelectValue placeholder={t('allCategories')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allCategories')}</SelectItem>
                      {Object.entries(SKILL_CATEGORY_KEYS).map(([key, labelKey]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            {SKILL_CATEGORY_ICONS[key as SkillCategory]}
                            {t(`categories.${labelKey}`)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* View toggle */}
                  <div className="flex items-center border rounded-md shrink-0">
                    <Button
                      variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-9 w-9 rounded-r-none"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-9 w-9 rounded-l-none"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Actions */}
                  <Button size="sm" className="h-9" onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    <span className="hidden sm:inline">{t('createSkill')}</span>
                    <span className="sm:hidden">{t('create') || 'New'}</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-9" onClick={() => setShowImportDialog(true)}>
                    <Upload className="h-4 w-4 mr-1.5" />
                    <span className="hidden sm:inline">{t('import')}</span>
                  </Button>
                </div>

                {/* Skeleton loading */}
                {isLoading ? (
                  <div className={cn(
                    viewMode === 'grid'
                      ? 'grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                      : 'space-y-2',
                  )}>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <SkillCardSkeleton key={i} variant={viewMode} />
                    ))}
                  </div>
                ) : filteredSkills.length === 0 ? (
                  <EmptyState icon={BookOpen} title={t('noSkills')} description={t('noSkillsDesc')} />
                ) : (
                  <div className="space-y-5">
                    {Object.entries(groupedSkills).map(([category, categorySkills]) => (
                      <div key={category}>
                        {/* Category group header */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border',
                            CATEGORY_COLORS[category as SkillCategory],
                          )}>
                            {SKILL_CATEGORY_ICONS[category as SkillCategory]}
                            {t(`categories.${SKILL_CATEGORY_KEYS[category as SkillCategory]}`)}
                          </div>
                          <Badge variant="secondary" className="text-xs tabular-nums">
                            {categorySkills.length}
                          </Badge>
                          <Separator className="flex-1" />
                        </div>

                        {/* Skills grid/list */}
                        {viewMode === 'grid' ? (
                          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {categorySkills.map((skill) => (
                              <SkillCard
                                key={skill.id}
                                skill={skill}
                                variant="grid"
                                onEdit={() => setSelectedSkillId(skill.id)}
                                onDelete={() => handleDeleteSkill(skill.id)}
                                onToggle={() => handleToggleSkill(skill)}
                                onActivate={() => handleActivateSkill(skill)}
                                t={t}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {categorySkills.map((skill) => (
                              <SkillCard
                                key={skill.id}
                                skill={skill}
                                variant="list"
                                onEdit={() => setSelectedSkillId(skill.id)}
                                onDelete={() => handleDeleteSkill(skill.id)}
                                onToggle={() => handleToggleSkill(skill)}
                                onActivate={() => handleActivateSkill(skill)}
                                t={t}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="discover">
                <SkillDiscovery />
              </TabsContent>

              <TabsContent value="marketplace">
                <SkillMarketplace />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <CreateSkillDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onCreateSkill={handleCreateSkill}
          t={t}
        />

        <ImportSkillDialog
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
          onImport={handleImportSkill}
          t={t}
        />

        {/* Skill Detail Dialog */}
        <Dialog open={!!selectedSkillId} onOpenChange={(open) => !open && setSelectedSkillId(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
            {selectedSkillId && (
              <SkillDetail skillId={selectedSkillId} onClose={() => setSelectedSkillId(null)} />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!deleteConfirmSkillId}
          onOpenChange={(open) => !open && setDeleteConfirmSkillId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('deleteSkill')}</AlertDialogTitle>
              <AlertDialogDescription>{t('deleteSkillConfirmation')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteSkill}>{tCommon('delete')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}

export default SkillSettings;
