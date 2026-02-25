'use client';

/**
 * Skill Creation Wizard Component
 *
 * Step-by-step wizard for creating new skills with templates and AI assistance.
 * Features: sidebar step navigation (desktop), framer-motion transitions,
 * resource management, AI assistant integration, template search/filter,
 * enhanced preview, and keyboard navigation.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  FileText,
  Wand2,
  Loader2,
  Save,
  AlertCircle,
  Search,
  Package,
  PenLine,
  Eye,
  FolderOpen,
  Info,
  Coins,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useSkillStore } from '@/stores/skills';
import { getAllTemplates, searchTemplates, getTemplateCategoriesWithCounts } from '@/lib/skills/templates';
import { parseSkillMd } from '@/lib/skills/parser';
import { useSkillAI } from '@/hooks/skills/use-skill-ai';
import { SkillMarkdownPreview, SkillMarkdownStyles } from './skill-markdown-preview';
import { SkillResourceManager } from './skill-resource-manager';
import { SkillAIAssistant } from './skill-ai-assistant';
import { CATEGORY_OPTIONS, CATEGORY_COLORS } from './skill-constants';
import type { SkillCategory, SkillTemplate, SkillResource } from '@/types/system/skill';

type WizardStep = 'start' | 'template' | 'basic' | 'content' | 'resources' | 'preview';

const STEP_ICONS: Record<WizardStep, React.ReactNode> = {
  start: <Wand2 className="h-4 w-4" />,
  template: <FileText className="h-4 w-4" />,
  basic: <PenLine className="h-4 w-4" />,
  content: <FileText className="h-4 w-4" />,
  resources: <FolderOpen className="h-4 w-4" />,
  preview: <Eye className="h-4 w-4" />,
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 80 : -80,
    opacity: 0,
  }),
};

const slideTransition = {
  x: { type: 'spring' as const, stiffness: 400, damping: 35 },
  opacity: { duration: 0.2 },
};

interface SkillWizardProps {
  onComplete: (skillId: string) => void;
  onCancel: () => void;
  className?: string;
}

export function SkillWizard({
  onComplete,
  onCancel,
  className,
}: SkillWizardProps) {
  const t = useTranslations('skills');
  const { createSkill } = useSkillStore();
  const requestAI = useSkillAI();
  const allTemplates = useMemo(() => getAllTemplates(), []);
  const templateCategories = useMemo(() => getTemplateCategoriesWithCounts(), []);

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('start');
  const [direction, setDirection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Skill data
  const [startChoice, setStartChoice] = useState<'template' | 'blank' | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<SkillTemplate | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SkillCategory>('custom');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [resources, setResources] = useState<SkillResource[]>([]);

  // Template search/filter
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<SkillCategory | 'all'>('all');

  // AI assistant
  const [showAIPanel, setShowAIPanel] = useState(false);

  // Ref for keyboard handler
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredTemplates = useMemo(() => {
    let result = templateSearch ? searchTemplates(templateSearch) : allTemplates;
    if (templateCategoryFilter !== 'all') {
      result = result.filter(tmpl => tmpl.category === templateCategoryFilter);
    }
    return result;
  }, [allTemplates, templateSearch, templateCategoryFilter]);

  // Validation
  const nameError = useMemo(() => {
    if (!name) return null;
    if (name.length < 3) return t('nameTooShort');
    if (name.length > 64) return t('nameTooLong');
    if (!/^[a-z0-9-]+$/.test(name)) return t('nameInvalidChars');
    return null;
  }, [name, t]);

  const descriptionError = useMemo(() => {
    if (!description) return null;
    if (description.length > 1024) return t('descriptionTooLong');
    if (/<|>/.test(description)) return t('descriptionInvalidChars');
    return null;
  }, [description, t]);

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 'start':
        return startChoice !== null;
      case 'template':
        return selectedTemplate !== null;
      case 'basic':
        return name.length >= 3 && description.length > 0 && !nameError && !descriptionError;
      case 'content':
        return content.length > 0;
      case 'resources':
        return true;
      case 'preview':
        return true;
      default:
        return false;
    }
  }, [currentStep, startChoice, selectedTemplate, name, description, nameError, descriptionError, content]);

  // Generate raw content
  const rawContent = useMemo(() => {
    return `---
name: ${name || 'new-skill'}
description: ${description || 'A new skill'}
---

${content}`;
  }, [name, description, content]);

  // Parse for preview
  const parseResult = useMemo(() => parseSkillMd(rawContent), [rawContent]);

  // Approximate token count (~4 chars per token)
  const tokenEstimate = useMemo(() => Math.ceil(content.length / 4), [content]);

  // Step definitions
  const steps: Array<{ key: WizardStep; label: string }> = useMemo(() => [
    { key: 'start', label: t('stepStart') },
    ...(startChoice === 'template' ? [{ key: 'template' as WizardStep, label: t('stepTemplate') }] : []),
    { key: 'basic', label: t('stepBasic') },
    { key: 'content', label: t('stepContent') },
    { key: 'resources', label: t('stepResources') },
    { key: 'preview', label: t('stepPreview') },
  ], [startChoice, t]);

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);

  // Navigation
  const getNextStep = useCallback((): WizardStep | null => {
    const idx = steps.findIndex(s => s.key === currentStep);
    return idx < steps.length - 1 ? steps[idx + 1].key : null;
  }, [currentStep, steps]);

  const getPrevStep = useCallback((): WizardStep | null => {
    const idx = steps.findIndex(s => s.key === currentStep);
    return idx > 0 ? steps[idx - 1].key : null;
  }, [currentStep, steps]);

  const navigateTo = useCallback((targetStep: WizardStep) => {
    const targetIdx = steps.findIndex(s => s.key === targetStep);
    const currentIdx = steps.findIndex(s => s.key === currentStep);
    if (targetIdx <= currentIdx) {
      setDirection(targetIdx < currentIdx ? -1 : 1);
      setCurrentStep(targetStep);
      setError(null);
    }
  }, [currentStep, steps]);

  const handleNext = useCallback(() => {
    const next = getNextStep();
    if (next) {
      setDirection(1);
      setCurrentStep(next);
      setError(null);
    }
  }, [getNextStep]);

  const handlePrev = useCallback(() => {
    const prev = getPrevStep();
    if (prev) {
      setDirection(-1);
      setCurrentStep(prev);
      setError(null);
    }
  }, [getPrevStep]);

  const handleSelectTemplate = useCallback((template: SkillTemplate) => {
    setSelectedTemplate(template);
    setName(template.id);
    setDescription(template.description);
    setCategory(template.category);
    setTags(template.tags?.join(', ') || '');
    setContent(template.defaultContent);
  }, []);

  const handleStartBlank = useCallback(() => {
    setStartChoice('blank');
    setSelectedTemplate(null);
    setContent(`# ${name || 'My Skill'}

## When to Use

Use this skill when:
- [Condition 1]
- [Condition 2]

## Instructions

### Step 1: [First Step]

[Instructions]

### Step 2: [Second Step]

[Instructions]

## Examples

### Example 1

**Input:** [Example input]

**Output:** [Example output]

## Keywords

[keyword1], [keyword2]`);
  }, [name]);

  // Resource handlers
  const handleAddResource = useCallback((resource: Omit<SkillResource, 'size' | 'mimeType'>) => {
    setResources(prev => [...prev, { ...resource, size: resource.content?.length || 0 }]);
  }, []);

  const handleRemoveResource = useCallback((path: string) => {
    setResources(prev => prev.filter(r => r.path !== path));
  }, []);

  // AI assistant handler
  const handleApplyAIContent = useCallback((generatedContent: string) => {
    setContent(generatedContent);
  }, []);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const tagList = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const skill = createSkill({
        name,
        description,
        content,
        category,
        tags: tagList,
        resources,
      });

      onComplete(skill.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  }, [name, description, content, category, tags, resources, createSkill, onComplete, t]);

  const handleCancelWithConfirm = useCallback(() => {
    if (name || description || content) {
      if (window.confirm(t('confirmCancel'))) {
        onCancel();
      }
    } else {
      onCancel();
    }
  }, [name, description, content, onCancel, t]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTextInput = target.tagName === 'TEXTAREA' || target.tagName === 'INPUT';

      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancelWithConfirm();
      }
      if (e.key === 'Enter' && !isTextInput && canProceed) {
        e.preventDefault();
        if (currentStep === 'preview') {
          handleSubmit();
        } else {
          handleNext();
        }
      }
    };

    const el = containerRef.current;
    el?.addEventListener('keydown', handler);
    return () => el?.removeEventListener('keydown', handler);
  }, [canProceed, currentStep, handleNext, handleSubmit, handleCancelWithConfirm]);

  // Tag list for preview
  const tagList = useMemo(() =>
    tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
  [tags]);

  return (
    <div ref={containerRef} tabIndex={-1} className={cn('flex flex-col h-full', className)}>
      <SkillMarkdownStyles />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Wand2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-sm sm:text-base">{t('createNewSkill')}</h2>
            <p className="text-xs text-muted-foreground hidden sm:block">{t('wizardSubtitle')}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCancelWithConfirm}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Main layout: sidebar (desktop) + content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Sidebar step nav — desktop only */}
        <nav className="hidden md:flex flex-col w-56 shrink-0 border-r bg-muted/20 p-4 gap-1" aria-label="Wizard steps">
          {steps.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isClickable = isCompleted;

            return (
              <button
                key={step.key}
                type="button"
                disabled={!isClickable && !isCurrent}
                onClick={() => isClickable && navigateTo(step.key)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left w-full',
                  isCurrent && 'bg-primary/10 text-primary font-medium',
                  isCompleted && 'text-muted-foreground hover:bg-muted cursor-pointer',
                  !isCompleted && !isCurrent && 'text-muted-foreground/50 cursor-default',
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <div className={cn(
                  'flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium shrink-0 transition-colors',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-1',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground',
                )}>
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : STEP_ICONS[step.key]}
                </div>
                <span className="truncate">{step.label}</span>
              </button>
            );
          })}

          <Separator className="my-3" />

          <div className="px-3 text-xs text-muted-foreground space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Info className="h-3 w-3" />
              <span>{t('stepContent')}: {content.split('\n').length} {t('lines')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Package className="h-3 w-3" />
              <span>{resources.length > 0 ? t('resourceCount', { count: resources.length }) : t('noResourcesBundled')}</span>
            </div>
            {content.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Coins className="h-3 w-3" />
                <span>{t('tokensApprox', { count: tokenEstimate })}</span>
              </div>
            )}
          </div>
        </nav>

        {/* Mobile step indicator */}
        <div className="md:hidden flex items-center gap-1.5 p-3 border-b bg-muted/30 overflow-x-auto shrink-0">
          {steps.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            return (
              <div key={step.key} className="flex items-center shrink-0">
                <div className={cn(
                  'flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-colors',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground',
                )}>
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </div>
                {isCurrent && (
                  <span className="ml-1.5 text-xs font-medium">{step.label}</span>
                )}
                {index < steps.length - 1 && (
                  <ChevronRight className="h-3.5 w-3.5 mx-1 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>

        {/* Content area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <ScrollArea className="flex-1 min-h-0 overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={slideTransition}
                className="p-4 sm:p-6 max-w-3xl mx-auto w-full"
              >
                {/* Step: Start */}
                {currentStep === 'start' && (
                  <div className="space-y-8">
                    <div className="text-center">
                      <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-4">
                        <Sparkles className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{t('howToStart')}</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">{t('chooseStartMethod')}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                      <Card
                        className={cn(
                          'cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm',
                          startChoice === 'template' && 'border-primary ring-2 ring-primary/20 shadow-sm'
                        )}
                        onClick={() => setStartChoice('template')}
                      >
                        <CardHeader className="text-center pb-3">
                          <div className="mx-auto p-3 rounded-xl bg-primary/10 w-fit mb-2">
                            <FileText className="h-7 w-7 text-primary" />
                          </div>
                          <CardTitle className="text-base">{t('fromTemplate')}</CardTitle>
                          <CardDescription className="text-xs">{t('fromTemplateDesc')}</CardDescription>
                        </CardHeader>
                      </Card>

                      <Card
                        className={cn(
                          'cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm',
                          startChoice === 'blank' && 'border-primary ring-2 ring-primary/20 shadow-sm'
                        )}
                        onClick={handleStartBlank}
                      >
                        <CardHeader className="text-center pb-3">
                          <div className="mx-auto p-3 rounded-xl bg-secondary w-fit mb-2">
                            <Sparkles className="h-7 w-7" />
                          </div>
                          <CardTitle className="text-base">{t('fromScratch')}</CardTitle>
                          <CardDescription className="text-xs">{t('fromScratchDesc')}</CardDescription>
                        </CardHeader>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Step: Template Selection */}
                {currentStep === 'template' && (
                  <div className="space-y-5">
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-semibold mb-2">{t('chooseTemplate')}</h3>
                      <p className="text-muted-foreground">{t('chooseTemplateDesc')}</p>
                    </div>

                    {/* Search + category filter */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t('searchTemplates')}
                          value={templateSearch}
                          onChange={(e) => setTemplateSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                        <Button
                          variant={templateCategoryFilter === 'all' ? 'secondary' : 'ghost'}
                          size="sm"
                          className="shrink-0 h-9"
                          onClick={() => setTemplateCategoryFilter('all')}
                        >
                          {t('allTemplateCategories')} ({allTemplates.length})
                        </Button>
                        {templateCategories.map(({ category: cat, count }) => (
                          <Button
                            key={cat}
                            variant={templateCategoryFilter === cat ? 'secondary' : 'ghost'}
                            size="sm"
                            className="shrink-0 h-9"
                            onClick={() => setTemplateCategoryFilter(cat)}
                          >
                            {t(CATEGORY_OPTIONS.find(c => c.value === cat)?.labelKey || cat)} ({count})
                          </Button>
                        ))}
                      </div>
                    </div>

                    {filteredTemplates.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">{t('noTemplatesMatch')}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {filteredTemplates.map((template) => (
                          <Card
                            key={template.id}
                            className={cn(
                              'cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm',
                              selectedTemplate?.id === template.id && 'border-primary ring-2 ring-primary/20 shadow-sm'
                            )}
                            onClick={() => handleSelectTemplate(template)}
                          >
                            <CardHeader className="pb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{template.icon}</span>
                                <div className="min-w-0 flex-1">
                                  <CardTitle className="text-sm">{template.name}</CardTitle>
                                  <Badge variant="outline" className={cn('text-[10px] mt-0.5', CATEGORY_COLORS[template.category])}>
                                    {t(CATEGORY_OPTIONS.find(c => c.value === template.category)?.labelKey || template.category)}
                                  </Badge>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <CardDescription className="line-clamp-2 text-xs">
                                {template.description}
                              </CardDescription>
                              {template.tags && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {template.tags.slice(0, 3).map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-[10px]">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Step: Basic Info */}
                {currentStep === 'basic' && (
                  <div className="space-y-6">
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-semibold mb-2">{t('basicInfo')}</h3>
                      <p className="text-muted-foreground">{t('basicInfoDesc')}</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="skill-name">{t('skillName')} *</Label>
                        <Input
                          id="skill-name"
                          placeholder={t('skillNamePlaceholder')}
                          value={name}
                          onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                          className={cn(nameError && 'border-destructive')}
                        />
                        {nameError && (
                          <p className="text-sm text-destructive">{nameError}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{t('skillNameHint')}</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="skill-description">{t('skillDescription')} *</Label>
                        <Textarea
                          id="skill-description"
                          placeholder={t('skillDescriptionPlaceholder')}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={3}
                          className={cn(descriptionError && 'border-destructive')}
                        />
                        {descriptionError && (
                          <p className="text-sm text-destructive">{descriptionError}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {description.length}/1024
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>{t('category')}</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {CATEGORY_OPTIONS.map((option) => (
                            <Card
                              key={option.value}
                              className={cn(
                                'cursor-pointer transition-all p-3 hover:border-primary/50',
                                category === option.value && `border-primary ${CATEGORY_COLORS[option.value]}`,
                                category !== option.value && 'hover:shadow-sm'
                              )}
                              onClick={() => setCategory(option.value)}
                            >
                              <div className="flex items-center gap-2">
                                {option.icon}
                                <div className="min-w-0">
                                  <span className="text-sm font-medium block truncate">{t(option.labelKey)}</span>
                                  <span className="text-[10px] text-muted-foreground block truncate">{t(option.descKey)}</span>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="skill-tags">{t('tags')}</Label>
                        <Input
                          id="skill-tags"
                          placeholder={t('tagsPlaceholder')}
                          value={tags}
                          onChange={(e) => setTags(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">{t('tagsHint')}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step: Content */}
                {currentStep === 'content' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{t('contentStepTitle')}</h3>
                        <p className="text-sm text-muted-foreground">{t('contentStepDescFull')}</p>
                      </div>
                      <Button
                        variant={showAIPanel ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => setShowAIPanel(!showAIPanel)}
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        {showAIPanel ? t('hideAIAssistant') : t('showAIAssistant')}
                      </Button>
                    </div>

                    <div className={cn('flex gap-4', showAIPanel ? 'flex-col lg:flex-row' : '')}>
                      {/* Editor */}
                      <div className={cn('space-y-2', showAIPanel ? 'lg:flex-1' : 'flex-1')}>
                        <Label htmlFor="skill-content">{t('instructions')}</Label>
                        <Textarea
                          id="skill-content"
                          placeholder={t('contentPlaceholder')}
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          rows={showAIPanel ? 16 : 20}
                          className="font-mono text-sm resize-y"
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{content.split('\n').length} {t('lines')}</span>
                          <span>{t('tokensApprox', { count: tokenEstimate })}</span>
                        </div>
                      </div>

                      {/* AI Assistant Panel */}
                      {showAIPanel && (
                        <div className="lg:w-80 shrink-0 border rounded-lg p-4 bg-muted/20 overflow-y-auto max-h-[500px]">
                          <SkillAIAssistant
                            currentContent={content}
                            onApplyGenerated={handleApplyAIContent}
                            onRequestAI={requestAI}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step: Resources */}
                {currentStep === 'resources' && (
                  <div className="space-y-6">
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-semibold mb-2">{t('resourcesStepTitle')}</h3>
                      <p className="text-muted-foreground">{t('resourcesStepDesc')}</p>
                    </div>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {t('resourcesOptional')}
                      </AlertDescription>
                    </Alert>

                    <SkillResourceManager
                      resources={resources}
                      onAddResource={handleAddResource}
                      onRemoveResource={handleRemoveResource}
                    />
                  </div>
                )}

                {/* Step: Preview */}
                {currentStep === 'preview' && (
                  <div className="space-y-6">
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-semibold mb-2">{t('previewSkill')}</h3>
                      <p className="text-muted-foreground">{t('previewSkillDesc')}</p>
                    </div>

                    {!parseResult.success && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {parseResult.errors.map((e, i) => (
                            <div key={i}>{e.field}: {e.message}</div>
                          ))}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Metadata summary card */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <Sparkles className="h-5 w-5 text-primary shrink-0" />
                            <CardTitle className="truncate">{name || 'new-skill'}</CardTitle>
                          </div>
                          <Badge className={cn(CATEGORY_COLORS[category])}>{t(CATEGORY_OPTIONS.find(c => c.value === category)?.labelKey || category)}</Badge>
                        </div>
                        <CardDescription className="mt-1">{description}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        {/* Metadata grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-xs text-muted-foreground block">{t('tokenEstimate')}</span>
                            <span className="font-medium flex items-center gap-1">
                              <Coins className="h-3.5 w-3.5" />
                              {t('tokensApprox', { count: tokenEstimate })}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground block">{t('lines')}</span>
                            <span className="font-medium">{content.split('\n').length}</span>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground block">{t('stepResources')}</span>
                            <span className="font-medium flex items-center gap-1">
                              <Package className="h-3.5 w-3.5" />
                              {resources.length}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground block">{t('source')}</span>
                            <span className="font-medium">{selectedTemplate ? t('template') : t('categoryCustom')}</span>
                          </div>
                        </div>

                        {/* Tags */}
                        {tagList.length > 0 && (
                          <div>
                            <span className="text-xs text-muted-foreground block mb-1.5">{t('tagsPreview')}</span>
                            <div className="flex flex-wrap gap-1">
                              {tagList.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Quick edit buttons */}
                        <div className="flex gap-2 pt-2 border-t">
                          <Button variant="ghost" size="sm" onClick={() => navigateTo('basic')}>
                            <PenLine className="h-3.5 w-3.5 mr-1" />
                            {t('editBasicInfo')}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => navigateTo('content')}>
                            <FileText className="h-3.5 w-3.5 mr-1" />
                            {t('editContent')}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Content preview */}
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">{t('skillContentLabel')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <SkillMarkdownPreview content={content} />
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </motion.div>
            </AnimatePresence>
          </ScrollArea>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-background">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={!getPrevStep()}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t('back')}
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancelWithConfirm}>
                {t('cancel')}
              </Button>

              {currentStep === 'preview' ? (
                <Button size="sm" onClick={handleSubmit} disabled={isSubmitting || !parseResult.success}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('creating')}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {t('createSkill')}
                    </>
                  )}
                </Button>
              ) : (
                <Button size="sm" onClick={handleNext} disabled={!canProceed}>
                  {currentStep === 'resources' ? t('next') : t('next')}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SkillWizard;
