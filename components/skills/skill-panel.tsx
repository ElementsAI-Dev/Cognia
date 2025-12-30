'use client';

/**
 * Skill Panel Component
 * 
 * Main interface for browsing, managing, and organizing skills
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Sparkles,
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Upload,
  Download,
  SlidersHorizontal,
  X,
  Code,
  Palette,
  Building2,
  Zap,
  BarChart3,
  MessageSquare,
  Cog,
  FileText,
  ChevronDown,
  Check,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from '@/components/ui/input-group';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useSkillStore } from '@/stores/skill-store';
import { downloadSkillAsMarkdown } from '@/lib/skills/packager';
import { processSelectionWithAI } from '@/lib/ai/selection-ai';
import { SkillCard } from './skill-card';
import { SkillDetail } from './skill-detail';
import { SkillEditor } from './skill-editor';
import { SkillAnalytics } from './skill-analytics';
import type { Skill, SkillCategory, SkillStatus } from '@/types/skill';

const CATEGORY_OPTIONS: Array<{ value: SkillCategory | 'all'; labelKey: string; icon: React.ReactNode }> = [
  { value: 'all', labelKey: 'allCategories', icon: <Sparkles className="h-4 w-4" /> },
  { value: 'creative-design', labelKey: 'categoryCreativeDesign', icon: <Palette className="h-4 w-4" /> },
  { value: 'development', labelKey: 'categoryDevelopment', icon: <Code className="h-4 w-4" /> },
  { value: 'enterprise', labelKey: 'categoryEnterprise', icon: <Building2 className="h-4 w-4" /> },
  { value: 'productivity', labelKey: 'categoryProductivity', icon: <Zap className="h-4 w-4" /> },
  { value: 'data-analysis', labelKey: 'categoryDataAnalysis', icon: <BarChart3 className="h-4 w-4" /> },
  { value: 'communication', labelKey: 'categoryCommunication', icon: <MessageSquare className="h-4 w-4" /> },
  { value: 'meta', labelKey: 'categoryMeta', icon: <Cog className="h-4 w-4" /> },
  { value: 'custom', labelKey: 'categoryCustom', icon: <FileText className="h-4 w-4" /> },
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

type ViewMode = 'grid' | 'list';
type PanelView = 'browse' | 'detail' | 'create' | 'edit' | 'analytics';

interface SkillPanelProps {
  className?: string;
  defaultView?: PanelView;
  onSkillSelect?: (skill: Skill) => void;
  compact?: boolean;
}

export function SkillPanel({
  className,
  defaultView = 'browse',
  onSkillSelect,
  compact: _compact = false,
}: SkillPanelProps) {
  const t = useTranslations('skills');
  
  // Store
  const {
    skills,
    enableSkill,
    disableSkill,
    activateSkill,
    deactivateSkill,
    deleteSkill,
    createSkill,
    updateSkill,
    importSkill,
    exportSkill,
    searchSkills,
    getAllSkills,
  } = useSkillStore();

  // View state
  const [currentView, setCurrentView] = useState<PanelView>(defaultView);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<SkillCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<SkillStatus | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'builtin' | 'custom' | 'imported'>('all');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<Skill | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Filtered skills
  const filteredSkills = useMemo(() => {
    let result = Object.values(skills);

    // Search
    if (searchQuery.trim()) {
      const searchResult = searchSkills(searchQuery);
      const searchIds = new Set(searchResult.skills.map((s: Skill) => s.id));
      result = result.filter(s => searchIds.has(s.id));
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(s => s.category === categoryFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(s => s.status === statusFilter);
    }

    // Source filter
    if (sourceFilter !== 'all') {
      result = result.filter(s => s.source === sourceFilter);
    }

    // Active only
    if (showActiveOnly) {
      result = result.filter(s => s.isActive);
    }

    // Sort by name
    result.sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));

    return result;
  }, [skills, searchQuery, categoryFilter, statusFilter, sourceFilter, showActiveOnly, searchSkills]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: Object.keys(skills).length };
    for (const skill of Object.values(skills)) {
      counts[skill.category] = (counts[skill.category] || 0) + 1;
    }
    return counts;
  }, [skills]);

  // Handlers
  const handleToggleEnabled = useCallback((skill: Skill) => {
    if (skill.status === 'enabled') {
      disableSkill(skill.id);
    } else {
      enableSkill(skill.id);
    }
  }, [enableSkill, disableSkill]);

  const handleToggleActive = useCallback((skill: Skill) => {
    if (skill.isActive) {
      deactivateSkill(skill.id);
    } else {
      activateSkill(skill.id);
    }
  }, [activateSkill, deactivateSkill]);

  const handleViewSkill = useCallback((skill: Skill) => {
    setSelectedSkillId(skill.id);
    setCurrentView('detail');
    onSkillSelect?.(skill);
  }, [onSkillSelect]);

  const handleEditSkill = useCallback((skill: Skill) => {
    setSelectedSkillId(skill.id);
    setCurrentView('edit');
  }, []);

  const handleDeleteSkill = useCallback((skill: Skill) => {
    setSkillToDelete(skill);
    setShowDeleteDialog(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (skillToDelete) {
      deleteSkill(skillToDelete.id);
      setSkillToDelete(null);
      setShowDeleteDialog(false);
      if (selectedSkillId === skillToDelete.id) {
        setSelectedSkillId(null);
        setCurrentView('browse');
      }
    }
  }, [skillToDelete, deleteSkill, selectedSkillId]);

  const handleDuplicateSkill = useCallback((skill: Skill) => {
    createSkill({
      name: `${skill.metadata.name}-copy`,
      description: skill.metadata.description,
      content: skill.content,
      category: skill.category,
      tags: skill.tags,
      resources: skill.resources,
    });
  }, [createSkill]);

  const handleExportSkill = useCallback((skill: Skill) => {
    downloadSkillAsMarkdown(skill);
  }, []);

  const handleExportAll = useCallback(() => {
    const allSkills = getAllSkills();
    const exportData = allSkills.map(s => exportSkill(s.id)).filter(Boolean);
    const data = JSON.stringify(exportData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'skills-export.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [getAllSkills, exportSkill]);

  const handleImport = useCallback(async () => {
    if (!importData.trim()) return;
    
    setIsImporting(true);
    try {
      const parsed = JSON.parse(importData);
      const skillsToImport = Array.isArray(parsed) ? parsed : [parsed];
      for (const skillData of skillsToImport) {
        importSkill(skillData);
      }
      setShowImportDialog(false);
      setImportData('');
    } catch {
      // Handle parse error
    } finally {
      setIsImporting(false);
    }
  }, [importData, importSkill]);

  const handleCreateNew = useCallback(() => {
    setSelectedSkillId(null);
    setCurrentView('create');
  }, []);

  const handleSaveSkill = useCallback((rawContent: string) => {
    if (selectedSkillId) {
      updateSkill(selectedSkillId, { content: rawContent });
    } else {
      createSkill({
        name: 'new-skill',
        description: 'New skill',
        content: rawContent,
        category: 'custom',
        tags: [],
        resources: [],
      });
    }
    setCurrentView('browse');
    setSelectedSkillId(null);
  }, [selectedSkillId, updateSkill, createSkill]);

  const handleBack = useCallback(() => {
    setCurrentView('browse');
    setSelectedSkillId(null);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setSourceFilter('all');
    setShowActiveOnly(false);
  }, []);

  const hasActiveFilters = searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' || sourceFilter !== 'all' || showActiveOnly;

  const selectedSkill = selectedSkillId ? skills[selectedSkillId] : null;

  // Render detail view
  if (currentView === 'detail' && selectedSkillId) {
    return (
      <TooltipProvider>
        <div className={cn('flex flex-col h-full', className)}>
          <SkillDetail
            skillId={selectedSkillId}
            onClose={handleBack}
            onEdit={handleEditSkill}
          />
        </div>
      </TooltipProvider>
    );
  }

  // Render edit view
  if (currentView === 'edit' && selectedSkill) {
    return (
      <TooltipProvider>
        <div className={cn('flex flex-col h-full', className)}>
          <SkillEditor
            skill={selectedSkill}
            onSave={handleSaveSkill}
            onCancel={handleBack}
            readOnly={selectedSkill.source === 'builtin'}
            onRequestAI={async (prompt) => {
              const result = await processSelectionWithAI({ action: 'rewrite', text: prompt, customPrompt: prompt });
              if (result.success && result.result) return result.result;
              throw new Error(result.error || 'AI request failed');
            }}
          />
        </div>
      </TooltipProvider>
    );
  }

  // Render create view
  if (currentView === 'create') {
    return (
      <TooltipProvider>
        <div className={cn('flex flex-col h-full', className)}>
          <SkillEditor
            onSave={handleSaveSkill}
            onCancel={handleBack}
            onRequestAI={async (prompt) => {
              const result = await processSelectionWithAI({ action: 'rewrite', text: prompt, customPrompt: prompt });
              if (result.success && result.result) return result.result;
              throw new Error(result.error || 'AI request failed');
            }}
          />
        </div>
      </TooltipProvider>
    );
  }

  // Render analytics view
  if (currentView === 'analytics') {
    return (
      <TooltipProvider>
        <div className={cn('flex flex-col h-full', className)}>
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <h2 className="font-semibold">{t('skillAnalytics')}</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <X className="h-4 w-4 mr-1" />
              {t('close')}
            </Button>
          </div>
          <ScrollArea className="flex-1 min-h-0 overflow-hidden">
            <div className="p-4">
              <SkillAnalytics />
            </div>
          </ScrollArea>
        </div>
      </TooltipProvider>
    );
  }

  // Render browse view (default)
  return (
    <TooltipProvider>
      <div className={cn('flex flex-col h-full', className)}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">{t('skillsLibrary')}</h2>
            <Badge variant="secondary" className="ml-2">
              {Object.keys(skills).length}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentView('analytics')}>
              <BarChart3 className="h-4 w-4 mr-1" />
              {t('analytics')}
            </Button>
            <Button size="sm" onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-1" />
              {t('newSkill')}
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 p-4 border-b bg-muted/30">
          {/* Search and View Toggle */}
          <div className="flex items-center gap-2">
            <InputGroup className="flex-1">
              <InputGroupAddon align="inline-start">
                <Search className="h-4 w-4" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder={t('searchSkills')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
            
            <div className="flex items-center border rounded-md">
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
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  {CATEGORY_OPTIONS.find(c => c.value === categoryFilter)?.icon}
                  <span className="ml-1.5">
                    {t(CATEGORY_OPTIONS.find(c => c.value === categoryFilter)?.labelKey || 'allCategories')}
                  </span>
                  <ChevronDown className="ml-1.5 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setCategoryFilter(option.value)}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {option.icon}
                      <span>{t(option.labelKey)}</span>
                    </div>
                    {categoryCounts[option.value] !== undefined && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {categoryCounts[option.value]}
                      </Badge>
                    )}
                    {categoryFilter === option.value && (
                      <Check className="h-4 w-4 ml-2" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Status Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Filter className="h-3.5 w-3.5 mr-1.5" />
                  {t(STATUS_OPTIONS.find(s => s.value === statusFilter)?.labelKey || 'allStatus')}
                  <ChevronDown className="ml-1.5 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {STATUS_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                  >
                    {t(option.labelKey)}
                    {statusFilter === option.value && (
                      <Check className="h-4 w-4 ml-auto" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Source Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  {t(SOURCE_OPTIONS.find(s => s.value === sourceFilter)?.labelKey || 'allSources')}
                  <ChevronDown className="ml-1.5 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {SOURCE_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setSourceFilter(option.value)}
                  >
                    {t(option.labelKey)}
                    {sourceFilter === option.value && (
                      <Check className="h-4 w-4 ml-auto" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Active Only Toggle */}
            <Button
              variant={showActiveOnly ? 'default' : 'outline'}
              size="sm"
              className="h-8"
              onClick={() => setShowActiveOnly(!showActiveOnly)}
            >
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              {t('activeOnly')}
            </Button>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={clearFilters}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                {t('clearFilters')}
              </Button>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Import/Export */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
                  {t('more')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowImportDialog(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  {t('importSkills')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportAll}>
                  <Download className="h-4 w-4 mr-2" />
                  {t('exportAll')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Skills List */}
        <ScrollArea className="flex-1 min-h-0 overflow-hidden">
          <div className="p-4 overflow-hidden">
            {filteredSkills.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title={t('noSkillsFound')}
                description={hasActiveFilters ? t('noSkillsMatchFilters') : t('noSkillsYet')}
                actions={hasActiveFilters ? [{
                  label: t('clearFilters'),
                  onClick: clearFilters,
                  variant: 'outline',
                }] : [{
                  label: t('createFirstSkill'),
                  onClick: handleCreateNew,
                  icon: Plus,
                }]}
              />
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSkills.map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    variant="default"
                    onView={handleViewSkill}
                    onEdit={handleEditSkill}
                    onDelete={handleDeleteSkill}
                    onDuplicate={handleDuplicateSkill}
                    onExport={handleExportSkill}
                    onToggleEnabled={handleToggleEnabled}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2 overflow-hidden">
                {filteredSkills.map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    variant="list"
                    onView={handleViewSkill}
                    onEdit={handleEditSkill}
                    onDelete={handleDeleteSkill}
                    onDuplicate={handleDuplicateSkill}
                    onExport={handleExportSkill}
                    onToggleEnabled={handleToggleEnabled}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Delete Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('deleteSkill')}</DialogTitle>
              <DialogDescription>
                {t('deleteSkillConfirmation')}: &quot;{skillToDelete?.metadata.name}&quot;
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                {t('cancel')}
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                {t('delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('importSkills')}</DialogTitle>
              <DialogDescription>
                {t('importSkillsDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <textarea
                className="w-full h-64 p-3 border rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={t('pasteSkillsJson')}
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                {t('cancel')}
              </Button>
              <Button onClick={handleImport} disabled={!importData.trim() || isImporting}>
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('importing')}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {t('import')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

export default SkillPanel;
