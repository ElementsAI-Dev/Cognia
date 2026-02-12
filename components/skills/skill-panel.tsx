'use client';

/**
 * Skill Panel Component
 * 
 * Main interface for browsing, managing, and organizing skills
 * Features responsive layout with mobile filter sheet and adaptive grid
 */

import { useState, useMemo, useCallback, useDeferredValue } from 'react';
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
  ArrowLeft,
  MoreHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Check,
  Wand2,
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from '@/components/ui/input-group';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/layout/feedback/empty-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useSkillStore } from '@/stores/skills';
import { downloadSkillAsMarkdown } from '@/lib/skills/packager';
import { useSkillAI } from '@/hooks/skills/use-skill-ai';
import { SkillCard } from './skill-card';
import { SkillDetail } from './skill-detail';
import { SkillEditor } from './skill-editor';
import { SkillAnalytics } from './skill-analytics';
import { SkillGeneratorPanel } from './skill-generator';
import { SkillFilterSheet } from './skill-filter-sheet';
import { SkillImportDialog } from './skill-import-dialog';
import { SkillDeleteDialog } from './skill-delete-dialog';
import { SkillWizard } from './skill-wizard';
import type { Skill, SkillCategory, SkillStatus } from '@/types/system/skill';

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

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  }),
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

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
type PanelView = 'browse' | 'detail' | 'create' | 'edit' | 'analytics' | 'wizard';

interface SkillPanelProps {
  className?: string;
  defaultView?: PanelView;
  onSkillSelect?: (skill: Skill) => void;
}

export function SkillPanel({
  className,
  defaultView = 'browse',
  onSkillSelect,
}: SkillPanelProps) {
  const t = useTranslations('skills');
  const requestAI = useSkillAI();
  
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
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [categoryFilter, setCategoryFilter] = useState<SkillCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<SkillStatus | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'builtin' | 'custom' | 'imported'>('all');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 24;

  // Dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<Skill | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showGeneratorDialog, setShowGeneratorDialog] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // Filtered skills
  const filteredSkills = useMemo(() => {
    let result = Object.values(skills);

    // Search (uses deferred value for performance)
    if (deferredSearchQuery.trim()) {
      const searchResult = searchSkills(deferredSearchQuery);
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
  }, [skills, deferredSearchQuery, categoryFilter, statusFilter, sourceFilter, showActiveOnly, searchSkills]);

  // Pagination derived values
  const totalPages = Math.max(1, Math.ceil(filteredSkills.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedSkills = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredSkills.slice(start, start + PAGE_SIZE);
  }, [filteredSkills, safeCurrentPage]);

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

  const handleCreateNew = useCallback(() => {
    setSelectedSkillId(null);
    setCurrentView('create');
  }, []);

  const handleCreateWithWizard = useCallback(() => {
    setCurrentView('wizard');
  }, []);

  const handleWizardComplete = useCallback((skillId: string) => {
    setSelectedSkillId(skillId);
    setCurrentView('detail');
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

  const activeFilterCount = [
    categoryFilter !== 'all',
    statusFilter !== 'all',
    sourceFilter !== 'all',
    showActiveOnly,
  ].filter(Boolean).length;

  // Stats for header
  const skillStats = useMemo(() => {
    const all = Object.values(skills);
    return {
      total: all.length,
      enabled: all.filter(s => s.status === 'enabled').length,
      active: all.filter(s => s.isActive).length,
    };
  }, [skills]);

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
            onRequestAI={requestAI}
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
            onRequestAI={requestAI}
          />
        </div>
      </TooltipProvider>
    );
  }

  // Render wizard view
  if (currentView === 'wizard') {
    return (
      <TooltipProvider>
        <div className={cn('flex flex-col h-full', className)}>
          <SkillWizard
            onComplete={handleWizardComplete}
            onCancel={handleBack}
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
        {/* Header - Responsive with sticky behavior */}
        <div className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b">
          <div className="flex items-center justify-between p-3 sm:p-4">
            {/* Left: Back + Title */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Link href="/">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-sm sm:text-base truncate">{t('skillsLibrary')}</h2>
                  <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{skillStats.total} {t('total') || 'total'}</span>
                    <Separator orientation="vertical" className="h-3" />
                    <span className="text-green-600 dark:text-green-400">{skillStats.active} {t('active')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Actions - Desktop */}
            <div className="hidden md:flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setCurrentView('analytics')}>
                    <BarChart3 className="h-4 w-4 mr-1.5" />
                    <span className="hidden lg:inline">{t('analytics')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="lg:hidden">{t('analytics')}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setShowGeneratorDialog(true)}>
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    <span className="hidden lg:inline">{t('generateSkill') || 'Generate'}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="lg:hidden">{t('generateSkill') || 'Generate'}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleCreateWithWizard}>
                    <Wand2 className="h-4 w-4 mr-1.5" />
                    <span className="hidden lg:inline">{t('wizard') || 'Wizard'}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="lg:hidden">{t('wizard') || 'Wizard'}</TooltipContent>
              </Tooltip>
              <Button size="sm" onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">{t('newSkill')}</span>
              </Button>
            </div>

            {/* Right: Actions - Mobile */}
            <div className="flex md:hidden items-center gap-1">
              <Button size="sm" onClick={handleCreateNew} className="h-8 px-2.5">
                <Plus className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setCurrentView('analytics')}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    {t('analytics')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowGeneratorDialog(true)}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {t('generateSkill') || 'Generate'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCreateWithWizard}>
                    <Wand2 className="h-4 w-4 mr-2" />
                    {t('wizard') || 'Wizard'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
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
        </div>

        {/* Toolbar - Responsive */}
        <div className="flex flex-col gap-2 sm:gap-3 p-3 sm:p-4 border-b bg-muted/30">
          {/* Search Row */}
          <div className="flex items-center gap-2">
            <InputGroup className="flex-1">
              <InputGroupAddon align="inline-start">
                <Search className="h-4 w-4" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder={t('searchSkills')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-sm"
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
            
            {/* Mobile Filter Button */}
            <Button
              variant="outline"
              size="icon"
              className="md:hidden h-9 w-9 shrink-0 relative"
              onClick={() => setShowFilterSheet(true)}
              aria-label={t('filters')}
            >
              <Filter className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            
            {/* View Toggle */}
            <div className="flex items-center border rounded-md shrink-0" role="radiogroup" aria-label={t('viewMode')}>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-9 w-9 rounded-r-none"
                onClick={() => setViewMode('grid')}
                aria-label={t('gridView')}
                aria-checked={viewMode === 'grid'}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-9 w-9 rounded-l-none"
                onClick={() => setViewMode('list')}
                aria-label={t('listView')}
                aria-checked={viewMode === 'list'}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Desktop Filters - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-2 flex-wrap">
            {/* Category Filter with colored icon */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <span className={cn('p-0.5 rounded mr-1.5', CATEGORY_OPTIONS.find(c => c.value === categoryFilter)?.color)}>
                    {CATEGORY_OPTIONS.find(c => c.value === categoryFilter)?.icon}
                  </span>
                  <span className="hidden lg:inline">
                    {t(CATEGORY_OPTIONS.find(c => c.value === categoryFilter)?.labelKey || 'allCategories')}
                  </span>
                  <ChevronDown className="ml-1.5 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                {CATEGORY_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setCategoryFilter(option.value)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span className={cn('p-1 rounded', option.color)}>
                        {option.icon}
                      </span>
                      <span>{t(option.labelKey)}</span>
                    </div>
                    {categoryCounts[option.value] !== undefined && (
                      <Badge variant="secondary" className="ml-2 text-xs tabular-nums">
                        {categoryCounts[option.value]}
                      </Badge>
                    )}
                    {categoryFilter === option.value && (
                      <Check className="h-4 w-4 ml-2 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Status Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                  <span className="hidden lg:inline">
                    {t(STATUS_OPTIONS.find(s => s.value === statusFilter)?.labelKey || 'allStatus')}
                  </span>
                  <ChevronDown className="ml-1.5 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {STATUS_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                    className="cursor-pointer"
                  >
                    {t(option.labelKey)}
                    {statusFilter === option.value && (
                      <Check className="h-4 w-4 ml-auto text-primary" />
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
                    className="cursor-pointer"
                  >
                    {t(option.labelKey)}
                    {sourceFilter === option.value && (
                      <Check className="h-4 w-4 ml-auto text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Active Only Toggle */}
            <Button
              variant={showActiveOnly ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'h-8 transition-all',
                showActiveOnly && 'shadow-sm'
              )}
              onClick={() => setShowActiveOnly(!showActiveOnly)}
            >
              <Zap className={cn('h-3.5 w-3.5 mr-1.5', showActiveOnly && 'text-yellow-300')} />
              {t('activeOnly')}
            </Button>

            {/* Clear Filters */}
            <AnimatePresence>
              {hasActiveFilters && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-muted-foreground hover:text-foreground"
                    onClick={clearFilters}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    {t('clearFilters')}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Import/Export - Desktop */}
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

          {/* Active Filters Summary - Mobile */}
          {hasActiveFilters && (
            <div className="flex md:hidden items-center gap-2 overflow-x-auto pb-1 -mb-1">
              {categoryFilter !== 'all' && (
                <Badge variant="secondary" className="shrink-0 gap-1">
                  {CATEGORY_OPTIONS.find(c => c.value === categoryFilter)?.icon}
                  <span className="text-xs">{t(CATEGORY_OPTIONS.find(c => c.value === categoryFilter)?.labelKey || '')}</span>
                  <button onClick={() => setCategoryFilter('all')} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge variant="secondary" className="shrink-0 gap-1">
                  <span className="text-xs">{t(STATUS_OPTIONS.find(s => s.value === statusFilter)?.labelKey || '')}</span>
                  <button onClick={() => setStatusFilter('all')} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {sourceFilter !== 'all' && (
                <Badge variant="secondary" className="shrink-0 gap-1">
                  <span className="text-xs">{t(SOURCE_OPTIONS.find(s => s.value === sourceFilter)?.labelKey || '')}</span>
                  <button onClick={() => setSourceFilter('all')} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {showActiveOnly && (
                <Badge variant="secondary" className="shrink-0 gap-1">
                  <Zap className="h-3 w-3" />
                  <span className="text-xs">{t('activeOnly')}</span>
                  <button onClick={() => setShowActiveOnly(false)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs shrink-0" onClick={clearFilters}>
                {t('clearFilters')}
              </Button>
            </div>
          )}
        </div>

        {/* Skills Grid/List with Animation */}
        <ScrollArea className="flex-1 min-h-0 overflow-hidden">
          <div className="p-3 sm:p-4 overflow-hidden">
            {filteredSkills.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16">
                <div className="p-4 rounded-full bg-muted/50 mb-4">
                  <Sparkles className="h-8 w-8 text-muted-foreground" />
                </div>
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
              </div>
            ) : viewMode === 'grid' ? (
              <motion.div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
                initial="hidden"
                animate="visible"
              >
                <AnimatePresence mode="popLayout">
                  {pagedSkills.map((skill, index) => (
                    <motion.div
                      key={skill.id}
                      custom={index}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      layout
                    >
                      <SkillCard
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
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div 
                className="space-y-2 overflow-hidden"
                initial="hidden"
                animate="visible"
              >
                <AnimatePresence mode="popLayout">
                  {pagedSkills.map((skill, index) => (
                    <motion.div
                      key={skill.id}
                      custom={index}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      layout
                    >
                      <SkillCard
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
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <span className="text-xs text-muted-foreground">
                  {t('showingRange', { start: (currentPage - 1) * PAGE_SIZE + 1, end: Math.min(currentPage * PAGE_SIZE, filteredSkills.length), total: filteredSkills.length })}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    aria-label={t('previousPage')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground px-2 tabular-nums">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    aria-label={t('nextPage')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Mobile Filter Sheet */}
        <SkillFilterSheet
          open={showFilterSheet}
          onOpenChange={setShowFilterSheet}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          sourceFilter={sourceFilter}
          onSourceChange={setSourceFilter}
          showActiveOnly={showActiveOnly}
          onShowActiveOnlyChange={setShowActiveOnly}
          categoryCounts={categoryCounts}
          onClearFilters={clearFilters}
        />

        {/* Delete Dialog */}
        <SkillDeleteDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          skill={skillToDelete}
          onConfirm={confirmDelete}
        />

        {/* Generator Dialog */}
        <Dialog open={showGeneratorDialog} onOpenChange={setShowGeneratorDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                {t('skillSeekers.title') || 'Generate Skill'}
              </DialogTitle>
              <DialogDescription>
                {t('skillSeekers.description') || 'Generate AI skills from documentation, GitHub repositories, or PDFs using Skill Seekers.'}
              </DialogDescription>
            </DialogHeader>
            <SkillGeneratorPanel
              onComplete={() => setShowGeneratorDialog(false)}
              onCancel={() => setShowGeneratorDialog(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <SkillImportDialog
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
        />
      </div>
    </TooltipProvider>
  );
}

export default SkillPanel;
