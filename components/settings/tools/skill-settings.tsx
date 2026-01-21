'use client';

/**
 * Skill Settings Component
 *
 * Main component for managing Claude Skills configurations
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Sparkles, Search, X, Loader2, AlertCircle, BookOpen, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { EmptyState } from '@/components/layout/empty-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSkillStore } from '@/stores/skills';
import { parseSkillMd } from '@/lib/skills/parser';
import { SKILL_CATEGORY_KEYS } from '@/lib/settings/tools';
import { SkillDetail } from '@/components/skills/skill-detail';
import { SkillDiscovery } from '@/components/skills/skill-discovery';
import { SkillCard } from './skill-card';
import { CreateSkillDialog } from './create-skill-dialog';
import { ImportSkillDialog } from './import-skill-dialog';
import { SKILL_CATEGORY_ICONS } from './skill-icons';
import type { Skill, SkillCategory, CreateSkillInput } from '@/types/system/skill';

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

  const allSkills = Object.values(skills);

  const filteredSkills = allSkills.filter((skill) => {
    const matchesSearch =
      !searchQuery ||
      skill.metadata.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.metadata.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || skill.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

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

  const groupedSkills = filteredSkills.reduce(
    (acc, skill) => {
      if (!acc[skill.category]) {
        acc[skill.category] = [];
      }
      acc[skill.category].push(skill);
      return acc;
    },
    {} as Record<SkillCategory, Skill[]>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('description')}</CardDescription>
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
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="my-skills">{t('mySkills')}</TabsTrigger>
              <TabsTrigger value="discover">{t('discover')}</TabsTrigger>
            </TabsList>

            <TabsContent value="my-skills" className="space-y-4">
              <div className="flex items-center gap-4">
                <InputGroup className="flex-1">
                  <InputGroupAddon align="inline-start">
                    <Search className="h-4 w-4" />
                  </InputGroupAddon>
                  <InputGroupInput
                    placeholder={t('searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </InputGroup>
                <Select
                  value={categoryFilter}
                  onValueChange={(v) => setCategoryFilter(v as SkillCategory | 'all')}
                >
                  <SelectTrigger className="w-45">
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
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('createSkill')}
                </Button>
                <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  {t('import')}
                </Button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : filteredSkills.length === 0 ? (
                <EmptyState icon={BookOpen} title={t('noSkills')} description={t('noSkillsDesc')} />
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedSkills).map(([category, categorySkills]) => (
                    <div key={category}>
                      <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
                        {SKILL_CATEGORY_ICONS[category as SkillCategory]}
                        {t(`categories.${SKILL_CATEGORY_KEYS[category as SkillCategory]}`)}
                        <Badge variant="secondary" className="ml-2">
                          {categorySkills.length}
                        </Badge>
                      </h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        {categorySkills.map((skill) => (
                          <SkillCard
                            key={skill.id}
                            skill={skill}
                            onEdit={() => setSelectedSkillId(skill.id)}
                            onDelete={() => handleDeleteSkill(skill.id)}
                            onToggle={() => handleToggleSkill(skill)}
                            onActivate={() => handleActivateSkill(skill)}
                            t={t}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="discover">
              <SkillDiscovery />
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
  );
}

export default SkillSettings;
