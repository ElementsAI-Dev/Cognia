'use client';

/**
 * Skill Creation Wizard Component
 * 
 * Step-by-step wizard for creating new skills with templates and AI assistance
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  FileText,
  Wand2,
  Code,
  Palette,
  Building2,
  Zap,
  BarChart3,
  MessageSquare,
  Cog,
  Loader2,
  Save,
  AlertCircle,
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
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useSkillStore } from '@/stores/skills';
import { getAllTemplates } from '@/lib/skills/templates';
import { parseSkillMd } from '@/lib/skills/parser';
import { SkillMarkdownPreview, SkillMarkdownStyles } from './skill-markdown-preview';
import type { SkillCategory, SkillTemplate, SkillResource } from '@/types/system/skill';

const CATEGORY_OPTIONS: Array<{ value: SkillCategory; labelKey: string; icon: React.ReactNode; descKey: string }> = [
  { value: 'creative-design', labelKey: 'categoryCreativeDesign', icon: <Palette className="h-5 w-5" />, descKey: 'categoryCreativeDesignDesc' },
  { value: 'development', labelKey: 'categoryDevelopment', icon: <Code className="h-5 w-5" />, descKey: 'categoryDevelopmentDesc' },
  { value: 'enterprise', labelKey: 'categoryEnterprise', icon: <Building2 className="h-5 w-5" />, descKey: 'categoryEnterpriseDesc' },
  { value: 'productivity', labelKey: 'categoryProductivity', icon: <Zap className="h-5 w-5" />, descKey: 'categoryProductivityDesc' },
  { value: 'data-analysis', labelKey: 'categoryDataAnalysis', icon: <BarChart3 className="h-5 w-5" />, descKey: 'categoryDataAnalysisDesc' },
  { value: 'communication', labelKey: 'categoryCommunication', icon: <MessageSquare className="h-5 w-5" />, descKey: 'categoryCommunicationDesc' },
  { value: 'meta', labelKey: 'categoryMeta', icon: <Cog className="h-5 w-5" />, descKey: 'categoryMetaDesc' },
  { value: 'custom', labelKey: 'categoryCustom', icon: <FileText className="h-5 w-5" />, descKey: 'categoryCustomDesc' },
];

type WizardStep = 'start' | 'template' | 'basic' | 'content' | 'preview';

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
  const templates = useMemo(() => getAllTemplates(), []);

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('start');
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
  const [resources] = useState<SkillResource[]>([]);

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

  // Navigation
  const getNextStep = useCallback((): WizardStep | null => {
    switch (currentStep) {
      case 'start':
        return startChoice === 'template' ? 'template' : 'basic';
      case 'template':
        return 'basic';
      case 'basic':
        return 'content';
      case 'content':
        return 'preview';
      case 'preview':
        return null;
      default:
        return null;
    }
  }, [currentStep, startChoice]);

  const getPrevStep = useCallback((): WizardStep | null => {
    switch (currentStep) {
      case 'start':
        return null;
      case 'template':
        return 'start';
      case 'basic':
        return startChoice === 'template' ? 'template' : 'start';
      case 'content':
        return 'basic';
      case 'preview':
        return 'content';
      default:
        return null;
    }
  }, [currentStep, startChoice]);

  const handleNext = useCallback(() => {
    const next = getNextStep();
    if (next) {
      setCurrentStep(next);
      setError(null);
    }
  }, [getNextStep]);

  const handlePrev = useCallback(() => {
    const prev = getPrevStep();
    if (prev) {
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

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const tagList = tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

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

  // Step indicators
  const steps: Array<{ key: WizardStep; label: string }> = [
    { key: 'start', label: t('stepStart') },
    ...(startChoice === 'template' ? [{ key: 'template' as WizardStep, label: t('stepTemplate') }] : []),
    { key: 'basic', label: t('stepBasic') },
    { key: 'content', label: t('stepContent') },
    { key: 'preview', label: t('stepPreview') },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);
  const progressPercent = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <SkillMarkdownStyles />
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">{t('createNewSkill')}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Step Indicator */}
      <div className="p-4 border-b bg-muted/30 space-y-3">
        <Progress value={progressPercent} className="h-1.5" />
        <div className="flex items-center gap-2">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center">
            <div
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors',
                index < currentStepIndex && 'bg-primary text-primary-foreground',
                index === currentStepIndex && 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2',
                index > currentStepIndex && 'bg-muted text-muted-foreground'
              )}
            >
              {index < currentStepIndex ? (
                <Check className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </div>
            <span className={cn(
              'ml-2 text-sm hidden sm:block',
              index === currentStepIndex ? 'font-medium' : 'text-muted-foreground'
            )}>
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
            )}
          </div>
        ))}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0 overflow-hidden">
        <div className="p-6 max-w-3xl mx-auto">
          {/* Step: Start */}
          {currentStep === 'start' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold mb-2">{t('howToStart')}</h3>
                <p className="text-muted-foreground">{t('chooseStartMethod')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card
                  className={cn(
                    'cursor-pointer transition-all hover:border-primary/50',
                    startChoice === 'template' && 'border-primary ring-2 ring-primary/20'
                  )}
                  onClick={() => setStartChoice('template')}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{t('fromTemplate')}</CardTitle>
                        <CardDescription>{t('fromTemplateDesc')}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                <Card
                  className={cn(
                    'cursor-pointer transition-all hover:border-primary/50',
                    startChoice === 'blank' && 'border-primary ring-2 ring-primary/20'
                  )}
                  onClick={handleStartBlank}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-secondary">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{t('fromScratch')}</CardTitle>
                        <CardDescription>{t('fromScratchDesc')}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </div>
            </div>
          )}

          {/* Step: Template Selection */}
          {currentStep === 'template' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold mb-2">{t('chooseTemplate')}</h3>
                <p className="text-muted-foreground">{t('chooseTemplateDesc')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className={cn(
                      'cursor-pointer transition-all hover:border-primary/50',
                      selectedTemplate?.id === template.id && 'border-primary ring-2 ring-primary/20'
                    )}
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{template.icon}</span>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="line-clamp-2">
                        {template.description}
                      </CardDescription>
                      {template.tags && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step: Basic Info */}
          {currentStep === 'basic' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
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
                          category === option.value && 'border-primary bg-primary/5'
                        )}
                        onClick={() => setCategory(option.value)}
                      >
                        <div className="flex items-center gap-2">
                          {option.icon}
                          <span className="text-sm font-medium">{t(option.labelKey)}</span>
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
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold mb-2">{t('skillContent')}</h3>
                <p className="text-muted-foreground">{t('skillContentDesc')}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="skill-content">{t('instructions')}</Label>
                <Textarea
                  id="skill-content"
                  placeholder={t('contentPlaceholder')}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={20}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {content.split('\n').length} {t('lines')}
                </p>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {currentStep === 'preview' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
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

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <CardTitle>{name || 'new-skill'}</CardTitle>
                    </div>
                    <Badge>{category}</Badge>
                  </div>
                  <CardDescription>{description}</CardDescription>
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
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={!getPrevStep()}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t('back')}
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel}>
            {t('cancel')}
          </Button>

          {currentStep === 'preview' ? (
            <Button onClick={handleSubmit} disabled={isSubmitting || !parseResult.success}>
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
            <Button onClick={handleNext} disabled={!canProceed}>
              {t('next')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SkillWizard;
