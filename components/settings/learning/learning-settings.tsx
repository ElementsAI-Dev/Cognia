'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  GraduationCap,
  Check,
  Plus,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  Eye,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Settings2,
  MessageSquare,
  Brain,
  Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { useLearningStore } from '@/stores/learning';
import { getAvailableTemplates, resolveBasePrompt } from '@/lib/learning/prompt-templates';
import type {
  PromptTemplate,
  LearningModeConfig,
  LearningPhase,
  DifficultyLevel,
  LearningStyle,
  UnderstandingLevel,
} from '@/types/learning';

const PHASE_KEYS: LearningPhase[] = [
  'clarification',
  'deconstruction',
  'questioning',
  'feedback',
  'summary',
];

const DIFFICULTY_KEYS: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
const STYLE_KEYS: LearningStyle[] = ['visual', 'auditory', 'reading', 'kinesthetic'];
const SCENARIO_KEYS = ['problemSolving', 'conceptLearning', 'skillDevelopment', 'criticalAnalysis', 'creativeExploration'] as const;
const UNDERSTANDING_KEYS: UnderstandingLevel[] = ['none', 'partial', 'good', 'excellent'];
const ENCOURAGEMENT_KEYS = ['goodProgress', 'struggling', 'breakthrough', 'completion'] as const;
const CELEBRATION_KEYS = ['concept_mastered', 'question_solved', 'phase_complete', 'session_complete'] as const;

export function LearningSettings() {
  const t = useTranslations('learningMode');
  const config = useLearningStore((s) => s.config);
  const promptTemplates = useLearningStore((s) => s.promptTemplates);
  const updateConfig = useLearningStore((s) => s.updateConfig);
  const resetConfig = useLearningStore((s) => s.resetConfig);
  const addPromptTemplate = useLearningStore((s) => s.addPromptTemplate);
  const updatePromptTemplate = useLearningStore((s) => s.updatePromptTemplate);
  const deletePromptTemplate = useLearningStore((s) => s.deletePromptTemplate);
  const exportPromptTemplates = useLearningStore((s) => s.exportPromptTemplates);
  const importPromptTemplates = useLearningStore((s) => s.importPromptTemplates);

  const [activeTab, setActiveTab] = useState('templates');
  const [showPreview, setShowPreview] = useState(false);
  const [showNewTemplateDialog, setShowNewTemplateDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const importRef = useRef<HTMLInputElement>(null);

  const allTemplates = useMemo(
    () => getAvailableTemplates(config.promptLanguage, promptTemplates),
    [config.promptLanguage, promptTemplates]
  );

  const previewPrompt = useMemo(
    () => resolveBasePrompt(config, promptTemplates),
    [config, promptTemplates]
  );

  const handleSelectTemplate = useCallback(
    (templateId: string) => {
      updateConfig({ activeTemplateId: templateId });
      toast.success(t('settings.templateSelected'));
    },
    [updateConfig, t]
  );

  const handleCreateTemplate = useCallback(() => {
    if (!newTemplateName.trim()) return;
    const tpl = addPromptTemplate({
      name: newTemplateName.trim(),
      description: '',
      approach: 'custom',
      basePrompt: '',
      language: config.promptLanguage === 'auto' ? 'en' : config.promptLanguage,
    });
    setNewTemplateName('');
    setShowNewTemplateDialog(false);
    setEditingTemplateId(tpl.id);
    toast.success(t('settings.templateCreated'));
  }, [newTemplateName, addPromptTemplate, config.promptLanguage, t]);

  const handleDeleteTemplate = useCallback(
    (id: string) => {
      deletePromptTemplate(id);
      if (editingTemplateId === id) setEditingTemplateId(null);
      toast.success(t('settings.templateDeleted'));
    },
    [deletePromptTemplate, editingTemplateId, t]
  );

  const handleExport = useCallback(() => {
    const json = exportPromptTemplates();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cognia-learning-templates-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('settings.exported'));
  }, [exportPromptTemplates, t]);

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = importPromptTemplates(ev.target?.result as string);
        if (result.errors.length > 0) {
          toast.error(result.errors.join('; '));
        }
        if (result.imported > 0) {
          toast.success(t('settings.imported', { count: result.imported }));
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [importPromptTemplates, t]
  );

  const handleResetConfig = useCallback(() => {
    resetConfig();
    toast.success(t('settings.resetDone'));
  }, [resetConfig, t]);

  const togglePhase = useCallback((phase: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) next.delete(phase);
      else next.add(phase);
      return next;
    });
  }, []);

  const editingTemplate = editingTemplateId ? promptTemplates[editingTemplateId] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <GraduationCap className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-semibold">{t('settings.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('settings.description')}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            {t('settings.tabs.templates')}
          </TabsTrigger>
          <TabsTrigger value="behavior" className="gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            {t('settings.tabs.behavior')}
          </TabsTrigger>
        </TabsList>

        {/* ===================== Tab 1: Templates ===================== */}
        <TabsContent value="templates" className="space-y-4 mt-4">
          {/* Actions bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" onClick={() => setShowNewTemplateDialog(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t('settings.newTemplate')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowPreview(!showPreview)}>
              <Eye className="h-3.5 w-3.5 mr-1" />
              {t('settings.preview')}
            </Button>
            <div className="flex-1" />
            <Button size="sm" variant="outline" onClick={handleExport}>
              <Download className="h-3.5 w-3.5 mr-1" />
              {t('settings.export')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => importRef.current?.click()}>
              <Upload className="h-3.5 w-3.5 mr-1" />
              {t('settings.import')}
            </Button>
            <input
              ref={importRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </div>

          {/* Preview panel */}
          {showPreview && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('settings.promptPreview')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <pre className="text-xs whitespace-pre-wrap text-muted-foreground font-mono">
                    {previewPrompt}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Template grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            {allTemplates.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                isActive={config.activeTemplateId === tpl.id}
                isEditing={editingTemplateId === tpl.id}
                onSelect={handleSelectTemplate}
                onEdit={setEditingTemplateId}
                onDelete={handleDeleteTemplate}
                t={t}
              />
            ))}
          </div>

          {/* Editing panel */}
          {editingTemplate && (
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {t('settings.editingTemplate', { name: editingTemplate.name })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('settings.templateName')}</Label>
                  <Input
                    value={editingTemplate.name}
                    onChange={(e) =>
                      updatePromptTemplate(editingTemplate.id, { name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.templateDescription')}</Label>
                  <Input
                    value={editingTemplate.description}
                    onChange={(e) =>
                      updatePromptTemplate(editingTemplate.id, {
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.basePrompt')}</Label>
                  <Textarea
                    value={editingTemplate.basePrompt}
                    onChange={(e) =>
                      updatePromptTemplate(editingTemplate.id, {
                        basePrompt: e.target.value,
                      })
                    }
                    className="min-h-[200px] font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    {editingTemplate.basePrompt.length} / 10,000
                  </p>
                </div>

                {/* Phase overrides */}
                <OverrideSection
                  title={t('settings.phaseOverrides')}
                  keys={PHASE_KEYS}
                  labelFn={(key: string) => t(`phase.${key}`)}
                  overrides={editingTemplate.phaseOverrides}
                  placeholder={t('settings.phaseOverridePlaceholder')}
                  expandedKeys={expandedPhases}
                  onToggle={togglePhase}
                  onChange={(key: string, value: string) => {
                    updatePromptTemplate(editingTemplate.id, {
                      phaseOverrides: { ...editingTemplate.phaseOverrides, [key]: value || undefined },
                    });
                  }}
                  t={t}
                />

                {/* Difficulty overrides */}
                <OverrideSection
                  title={t('settings.difficultyOverrides')}
                  keys={DIFFICULTY_KEYS}
                  labelFn={(key: string) => t(`difficulty.${key}`)}
                  overrides={editingTemplate.difficultyOverrides}
                  placeholder={t('settings.difficultyOverridePlaceholder')}
                  expandedKeys={expandedPhases}
                  onToggle={togglePhase}
                  onChange={(key: string, value: string) => {
                    updatePromptTemplate(editingTemplate.id, {
                      difficultyOverrides: { ...editingTemplate.difficultyOverrides, [key]: value || undefined },
                    });
                  }}
                  t={t}
                />

                {/* Style overrides */}
                <OverrideSection
                  title={t('settings.styleOverrides')}
                  keys={STYLE_KEYS}
                  labelFn={(key: string) => t(`style.${key}`)}
                  overrides={editingTemplate.styleOverrides}
                  placeholder={t('settings.styleOverridePlaceholder')}
                  expandedKeys={expandedPhases}
                  onToggle={togglePhase}
                  onChange={(key: string, value: string) => {
                    updatePromptTemplate(editingTemplate.id, {
                      styleOverrides: { ...editingTemplate.styleOverrides, [key]: value || undefined },
                    });
                  }}
                  t={t}
                />

                {/* Scenario overrides */}
                <OverrideSection
                  title={t('settings.scenarioOverrides')}
                  keys={SCENARIO_KEYS as unknown as string[]}
                  labelFn={(key: string) => key}
                  overrides={editingTemplate.scenarioOverrides}
                  placeholder={t('settings.scenarioOverridePlaceholder')}
                  expandedKeys={expandedPhases}
                  onToggle={togglePhase}
                  onChange={(key: string, value: string) => {
                    updatePromptTemplate(editingTemplate.id, {
                      scenarioOverrides: { ...editingTemplate.scenarioOverrides, [key]: value || undefined },
                    });
                  }}
                  t={t}
                />

                {/* Understanding overrides */}
                <OverrideSection
                  title={t('settings.understandingOverrides')}
                  keys={UNDERSTANDING_KEYS}
                  labelFn={(key: string) => key}
                  overrides={editingTemplate.understandingOverrides}
                  placeholder={t('settings.understandingOverridePlaceholder')}
                  expandedKeys={expandedPhases}
                  onToggle={togglePhase}
                  onChange={(key: string, value: string) => {
                    updatePromptTemplate(editingTemplate.id, {
                      understandingOverrides: { ...editingTemplate.understandingOverrides, [key]: value || undefined },
                    });
                  }}
                  t={t}
                />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingTemplateId(null)}
                >
                  {t('settings.doneEditing')}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===================== Tab 2: Behavior ===================== */}
        <TabsContent value="behavior" className="space-y-6 mt-4">
          {/* Global config */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="h-4 w-4" />
                {t('settings.globalConfig')}
              </CardTitle>
              <CardDescription>{t('settings.globalConfigDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('settings.mentorPersonality')}</Label>
                <Textarea
                  value={config.mentorPersonality || ''}
                  onChange={(e) => updateConfig({ mentorPersonality: e.target.value || undefined })}
                  placeholder={t('settings.mentorPersonalityPlaceholder')}
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('settings.subjectContext')}</Label>
                <Input
                  value={config.subjectContext || ''}
                  onChange={(e) => updateConfig({ subjectContext: e.target.value || undefined })}
                  placeholder={t('settings.subjectContextPlaceholder')}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('settings.promptLanguage')}</Label>
                  <Select
                    value={config.promptLanguage}
                    onValueChange={(v) =>
                      updateConfig({ promptLanguage: v as LearningModeConfig['promptLanguage'] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="zh-CN">中文</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.responseLanguage')}</Label>
                  <Select
                    value={config.responseLanguage}
                    onValueChange={(v) =>
                      updateConfig({
                        responseLanguage: v as LearningModeConfig['responseLanguage'],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="match-ui">Match UI</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="zh-CN">中文</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hints & Feedback */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('settings.hintsAndFeedback')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingRow label={t('settings.maxHints')} description={t('settings.maxHintsDesc')}>
                <div className="flex items-center gap-3 w-48">
                  <Slider
                    value={[config.maxHintsPerQuestion]}
                    onValueChange={([v]) => updateConfig({ maxHintsPerQuestion: v })}
                    min={1}
                    max={10}
                    step={1}
                  />
                  <span className="text-sm font-medium w-6 text-right">
                    {config.maxHintsPerQuestion}
                  </span>
                </div>
              </SettingRow>
              <SettingRow
                label={t('settings.hintDelay')}
                description={t('settings.hintDelayDesc')}
              >
                <div className="flex items-center gap-3 w-48">
                  <Slider
                    value={[config.hintDelayMessages]}
                    onValueChange={([v]) => updateConfig({ hintDelayMessages: v })}
                    min={0}
                    max={5}
                    step={1}
                  />
                  <span className="text-sm font-medium w-6 text-right">
                    {config.hintDelayMessages}
                  </span>
                </div>
              </SettingRow>
              <SettingSwitch
                label={t('settings.progressiveHints')}
                checked={config.enableProgressiveHints}
                onCheckedChange={(v) => updateConfig({ enableProgressiveHints: v })}
              />
              <SettingSwitch
                label={t('settings.encouragement')}
                checked={config.enableEncouragement}
                onCheckedChange={(v) => updateConfig({ enableEncouragement: v })}
              />
              <SettingSwitch
                label={t('settings.autoSummary')}
                checked={config.autoGenerateSummary}
                onCheckedChange={(v) => updateConfig({ autoGenerateSummary: v })}
              />
              <SettingSwitch
                label={t('settings.keyTakeaways')}
                checked={config.includeKeyTakeaways}
                onCheckedChange={(v) => updateConfig({ includeKeyTakeaways: v })}
              />
            </CardContent>
          </Card>

          {/* Adaptive Learning */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('settings.adaptiveLearning')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingSwitch
                label={t('settings.adaptiveDifficulty')}
                checked={config.enableAdaptiveDifficulty}
                onCheckedChange={(v) => updateConfig({ enableAdaptiveDifficulty: v })}
              />
              {config.enableAdaptiveDifficulty && (
                <SettingRow
                  label={t('settings.adjustThreshold')}
                  description={t('settings.adjustThresholdDesc')}
                >
                  <div className="flex items-center gap-3 w-48">
                    <Slider
                      value={[config.difficultyAdjustThreshold]}
                      onValueChange={([v]) => updateConfig({ difficultyAdjustThreshold: v })}
                      min={1}
                      max={10}
                      step={1}
                    />
                    <span className="text-sm font-medium w-6 text-right">
                      {config.difficultyAdjustThreshold}
                    </span>
                  </div>
                </SettingRow>
              )}
            </CardContent>
          </Card>

          {/* Spaced Repetition & AI */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('settings.spacedRepAndAi')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingSwitch
                label={t('settings.spacedRepetition')}
                checked={config.enableSpacedRepetition}
                onCheckedChange={(v) => updateConfig({ enableSpacedRepetition: v })}
              />
              {config.enableSpacedRepetition && (
                <SettingRow
                  label={t('settings.reviewInterval')}
                  description={t('settings.reviewIntervalDesc')}
                >
                  <div className="flex items-center gap-3 w-48">
                    <Slider
                      value={[config.defaultReviewIntervalDays]}
                      onValueChange={([v]) => updateConfig({ defaultReviewIntervalDays: v })}
                      min={1}
                      max={30}
                      step={1}
                    />
                    <span className="text-sm font-medium w-8 text-right">
                      {config.defaultReviewIntervalDays}d
                    </span>
                  </div>
                </SettingRow>
              )}
              <SettingSwitch
                label={t('settings.aiAnalysis')}
                checked={config.enableAIAnalysis}
                onCheckedChange={(v) => updateConfig({ enableAIAnalysis: v })}
              />
              {config.enableAIAnalysis && (
                <SettingRow label={t('settings.analysisDepth')}>
                  <Select
                    value={config.analysisDepth}
                    onValueChange={(v) =>
                      updateConfig({
                        analysisDepth: v as LearningModeConfig['analysisDepth'],
                      })
                    }
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="deep">Deep</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
              )}
            </CardContent>
          </Card>

          {/* Custom Messages */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {t('settings.customMessages')}
              </CardTitle>
              <CardDescription>{t('settings.customMessagesDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {ENCOURAGEMENT_KEYS.map((key) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs capitalize">{key}</Label>
                  <Textarea
                    value={(config.customEncouragementMessages?.[key] ?? []).join('\n')}
                    onChange={(e) => {
                      const lines = e.target.value.split('\n').filter((l) => l.trim());
                      updateConfig({
                        customEncouragementMessages: {
                          ...config.customEncouragementMessages,
                          [key]: lines.length > 0 ? lines : undefined,
                        },
                      });
                    }}
                    placeholder={t('settings.messagesPlaceholder')}
                    className="min-h-[60px] text-xs"
                  />
                </div>
              ))}
              <div className="border-t pt-3 mt-3" />
              <Label className="text-sm font-medium">{t('settings.celebrationMessages')}</Label>
              {CELEBRATION_KEYS.map((key) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs capitalize">{key.replace(/_/g, ' ')}</Label>
                  <Textarea
                    value={(config.customCelebrationMessages?.[key] ?? []).join('\n')}
                    onChange={(e) => {
                      const lines = e.target.value.split('\n').filter((l) => l.trim());
                      updateConfig({
                        customCelebrationMessages: {
                          ...config.customCelebrationMessages,
                          [key]: lines.length > 0 ? lines : undefined,
                        },
                      });
                    }}
                    placeholder={t('settings.messagesPlaceholder')}
                    className="min-h-[60px] text-xs"
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">{t('settings.messagesHint')}</p>
            </CardContent>
          </Card>

          {/* Reset */}
          <div className="flex justify-end pt-2">
            <Button variant="destructive" size="sm" onClick={handleResetConfig}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              {t('settings.resetAll')}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* New template dialog */}
      <Dialog open={showNewTemplateDialog} onOpenChange={setShowNewTemplateDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('settings.newTemplateTitle')}</DialogTitle>
            <DialogDescription>{t('settings.newTemplateDesc')}</DialogDescription>
          </DialogHeader>
          <Input
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            placeholder={t('settings.templateNamePlaceholder')}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateTemplate()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTemplateDialog(false)}>
              {t('startDialog.cancel')}
            </Button>
            <Button onClick={handleCreateTemplate} disabled={!newTemplateName.trim()}>
              {t('settings.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateCard({
  template,
  isActive,
  isEditing,
  onSelect,
  onEdit,
  onDelete,
  t,
}: {
  template: PromptTemplate;
  isActive: boolean;
  isEditing: boolean;
  onSelect: (id: string) => void;
  onEdit: (id: string | null) => void;
  onDelete: (id: string) => void;
  t: ReturnType<typeof useTranslations<'learningMode'>>;
}) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-colors',
        isActive && 'border-primary bg-primary/5',
        isEditing && 'ring-2 ring-primary/30'
      )}
      onClick={() => onSelect(template.id)}
    >
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{template.name}</span>
              {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
              {template.isBuiltIn && (
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {t('settings.builtIn')}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {template.description}
            </p>
          </div>
          {!template.isBuiltIn && (
            <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onEdit(isEditing ? null : template.id)}
              >
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={() => onDelete(template.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function SettingSwitch({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function OverrideSection({
  title,
  keys,
  labelFn,
  overrides,
  placeholder,
  expandedKeys,
  onToggle,
  onChange,
  t,
}: {
  title: string;
  keys: readonly string[] | string[];
  labelFn: (key: string) => string;
  overrides?: Partial<Record<string, string>>;
  placeholder: string;
  expandedKeys: Set<string>;
  onToggle: (key: string) => void;
  onChange: (key: string, value: string) => void;
  t: ReturnType<typeof useTranslations<'learningMode'>>;
}) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        <Lightbulb className="h-3.5 w-3.5" />
        {title}
      </Label>
      {keys.map((key) => (
        <Collapsible
          key={key}
          open={expandedKeys.has(key)}
          onOpenChange={() => onToggle(key)}
        >
          <CollapsibleTrigger className="flex items-center gap-2 w-full py-1 text-sm">
            {expandedKeys.has(key) ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            {labelFn(key)}
            {overrides?.[key] && (
              <Badge variant="secondary" className="text-[10px]">
                {t('settings.customized')}
              </Badge>
            )}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Textarea
              value={overrides?.[key] || ''}
              onChange={(e) => onChange(key, e.target.value)}
              placeholder={placeholder}
              className="min-h-[100px] font-mono text-xs mt-1"
            />
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}

export default LearningSettings;
