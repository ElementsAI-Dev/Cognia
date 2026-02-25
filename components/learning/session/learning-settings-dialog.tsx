'use client';

import { memo, useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Settings,
  GraduationCap,
  Brain,
  Code2,
  MessageCircleQuestion,
  Check,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useLearningMode } from '@/hooks/ui';
import type { LearningModeConfig, PromptTemplate, TeachingApproach, PromptLanguage } from '@/types/learning';

interface LearningSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SettingsDraft {
  maxHintsPerQuestion: string;
  hintDelayMessages: string;
  enableEncouragement: boolean;
  enableAdaptiveDifficulty: boolean;
  enableSpacedRepetition: boolean;
  analysisDepth: 'basic' | 'standard' | 'deep';
  responseLanguage: 'match-ui' | 'en' | 'zh-CN';
  activeTemplateId: string;
  mentorPersonality: string;
  subjectContext: string;
  promptLanguage: PromptLanguage;
}

function createDraftFromConfig(config: LearningModeConfig): SettingsDraft {
  return {
    maxHintsPerQuestion: String(config.maxHintsPerQuestion),
    hintDelayMessages: String(config.hintDelayMessages),
    enableEncouragement: config.enableEncouragement,
    enableAdaptiveDifficulty: config.enableAdaptiveDifficulty,
    enableSpacedRepetition: config.enableSpacedRepetition,
    analysisDepth: config.analysisDepth,
    responseLanguage: config.responseLanguage,
    activeTemplateId: config.activeTemplateId,
    mentorPersonality: config.mentorPersonality ?? '',
    subjectContext: config.subjectContext ?? '',
    promptLanguage: config.promptLanguage,
  };
}

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  socratic: <GraduationCap className="h-5 w-5" />,
  'semi-socratic': <MessageCircleQuestion className="h-5 w-5" />,
  cognitive: <Brain className="h-5 w-5" />,
  codeaid: <Code2 className="h-5 w-5" />,
  custom: <Settings className="h-5 w-5" />,
};

function getTemplateIcon(approach: string): React.ReactNode {
  return TEMPLATE_ICONS[approach] ?? <Settings className="h-5 w-5" />;
}

interface SettingsContentProps {
  config: LearningModeConfig;
  templates: PromptTemplate[];
  activeTemplate: PromptTemplate | undefined;
  onSave: (draft: SettingsDraft) => void;
  onCancel: () => void;
  onAddTemplate: (template: Omit<PromptTemplate, 'id' | 'createdAt' | 'isBuiltIn'>) => void;
  onDeleteTemplate: (id: string) => void;
  getPromptPreview: () => string;
}

const SettingsContent = memo(function SettingsContent({
  config,
  templates,
  activeTemplate,
  onSave,
  onCancel,
  onAddTemplate,
  onDeleteTemplate,
  getPromptPreview,
}: SettingsContentProps) {
  const t = useTranslations('learningMode.settings');
  const [draft, setDraft] = useState<SettingsDraft>(() => createDraftFromConfig(config));
  const [activeTab, setActiveTab] = useState('general');
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [newTemplateApproach, setNewTemplateApproach] = useState<TeachingApproach>('custom');
  const [newTemplatePrompt, setNewTemplatePrompt] = useState('');

  const promptPreview = useMemo(() => getPromptPreview(), [getPromptPreview]);

  const handleSave = () => {
    onSave(draft);
  };

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim() || !newTemplatePrompt.trim()) return;
    onAddTemplate({
      name: newTemplateName.trim(),
      description: newTemplateDesc.trim(),
      approach: newTemplateApproach,
      basePrompt: newTemplatePrompt.trim(),
      language: draft.promptLanguage,
    });
    setShowCreateTemplate(false);
    setNewTemplateName('');
    setNewTemplateDesc('');
    setNewTemplateApproach('custom');
    setNewTemplatePrompt('');
  };

  return (
    <DialogContent className="sm:max-w-2xl max-h-[85vh]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          {t('title')}
        </DialogTitle>
        <DialogDescription>{t('description')}</DialogDescription>
      </DialogHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general" className="text-xs">
            {t('tabs.general')}
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs">
            {t('tabs.templates')}
          </TabsTrigger>
          <TabsTrigger value="advanced" className="text-xs">
            {t('tabs.advanced')}
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="max-h-[50vh] mt-4">
          {/* General Tab */}
          <TabsContent value="general" className="space-y-4 pr-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxHints">{t('general.maxHints')}</Label>
                <Input
                  id="maxHints"
                  type="number"
                  min={1}
                  max={10}
                  value={draft.maxHintsPerQuestion}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, maxHintsPerQuestion: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hintDelay">{t('general.hintDelay')}</Label>
                <Input
                  id="hintDelay"
                  type="number"
                  min={0}
                  max={10}
                  value={draft.hintDelayMessages}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, hintDelayMessages: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{t('general.encouragement')}</p>
                  <p className="text-xs text-muted-foreground">{t('general.encouragementDesc')}</p>
                </div>
                <Switch
                  checked={draft.enableEncouragement}
                  onCheckedChange={(checked) =>
                    setDraft((prev) => ({ ...prev, enableEncouragement: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{t('general.adaptiveDifficulty')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('general.adaptiveDifficultyDesc')}
                  </p>
                </div>
                <Switch
                  checked={draft.enableAdaptiveDifficulty}
                  onCheckedChange={(checked) =>
                    setDraft((prev) => ({ ...prev, enableAdaptiveDifficulty: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{t('general.spacedRepetition')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('general.spacedRepetitionDesc')}
                  </p>
                </div>
                <Switch
                  checked={draft.enableSpacedRepetition}
                  onCheckedChange={(checked) =>
                    setDraft((prev) => ({ ...prev, enableSpacedRepetition: checked }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('general.analysisDepth')}</Label>
                <Select
                  value={draft.analysisDepth}
                  onValueChange={(v) =>
                    setDraft((prev) => ({
                      ...prev,
                      analysisDepth: v as 'basic' | 'standard' | 'deep',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">{t('analysisDepthOptions.basic')}</SelectItem>
                    <SelectItem value="standard">{t('analysisDepthOptions.standard')}</SelectItem>
                    <SelectItem value="deep">{t('analysisDepthOptions.deep')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('general.responseLanguage')}</Label>
                <Select
                  value={draft.responseLanguage}
                  onValueChange={(v) =>
                    setDraft((prev) => ({
                      ...prev,
                      responseLanguage: v as 'match-ui' | 'en' | 'zh-CN',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="match-ui">
                      {t('responseLanguageOptions.match-ui')}
                    </SelectItem>
                    <SelectItem value="en">{t('responseLanguageOptions.en')}</SelectItem>
                    <SelectItem value="zh-CN">{t('responseLanguageOptions.zh-CN')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4 pr-3">
            <div className="grid grid-cols-2 gap-3">
              {templates.map((tpl) => (
                <Card
                  key={tpl.id}
                  className={cn(
                    'cursor-pointer transition-colors relative',
                    draft.activeTemplateId === tpl.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  )}
                  onClick={() => setDraft((prev) => ({ ...prev, activeTemplateId: tpl.id }))}
                >
                  {draft.activeTemplateId === tpl.id && (
                    <Badge className="absolute top-2 right-2 text-[10px] px-1.5 py-0">
                      <Check className="h-3 w-3 mr-0.5" />
                      {t('templates.active')}
                    </Badge>
                  )}
                  {!tpl.isBuiltIn && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute bottom-2 right-2 h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTemplate(tpl.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                  <CardHeader className="pb-2 pt-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="text-primary">{getTemplateIcon(tpl.approach)}</span>
                      <CardTitle className="text-sm">{tpl.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <CardDescription className="text-xs line-clamp-2">
                      {tpl.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowCreateTemplate(!showCreateTemplate)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t('templates.createCustom')}
            </Button>

            {showCreateTemplate && (
              <Card className="p-4 space-y-3">
                <div className="space-y-2">
                  <Label>{t('templates.customName')}</Label>
                  <Input
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="My Custom Template"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('templates.customDescription')}</Label>
                  <Input
                    value={newTemplateDesc}
                    onChange={(e) => setNewTemplateDesc(e.target.value)}
                    placeholder="A brief description..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('templates.customApproach')}</Label>
                  <Select
                    value={newTemplateApproach}
                    onValueChange={(v) => setNewTemplateApproach(v as TeachingApproach)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="socratic">Socratic</SelectItem>
                      <SelectItem value="semi-socratic">Semi-Socratic</SelectItem>
                      <SelectItem value="cognitive">Cognitive</SelectItem>
                      <SelectItem value="codeaid">CodeAid</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('templates.customBasePrompt')}</Label>
                  <Textarea
                    value={newTemplatePrompt}
                    onChange={(e) => setNewTemplatePrompt(e.target.value)}
                    className="min-h-[120px] font-mono text-xs"
                    placeholder="# Role and Core Instructions..."
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateTemplate(false)}
                  >
                    {t('templates.cancel')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreateTemplate}
                    disabled={!newTemplateName.trim() || !newTemplatePrompt.trim()}
                  >
                    {t('templates.save')}
                  </Button>
                </div>
              </Card>
            )}

            {activeTemplate && (
              <div className="space-y-2">
                <Label>{t('templates.preview')}</Label>
                <Textarea
                  readOnly
                  value={promptPreview.slice(0, 800) + (promptPreview.length > 800 ? '...' : '')}
                  className="min-h-[120px] font-mono text-xs bg-muted/50"
                />
              </div>
            )}
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4 pr-3">
            <div className="space-y-2">
              <Label>{t('advanced.mentorPersonality')}</Label>
              <Textarea
                value={draft.mentorPersonality}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, mentorPersonality: e.target.value }))
                }
                placeholder={t('advanced.mentorPersonalityPlaceholder')}
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('advanced.subjectContext')}</Label>
              <Input
                value={draft.subjectContext}
                onChange={(e) => setDraft((prev) => ({ ...prev, subjectContext: e.target.value }))}
                placeholder={t('advanced.subjectContextPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('advanced.promptLanguage')}</Label>
              <Select
                value={draft.promptLanguage}
                onValueChange={(v) =>
                  setDraft((prev) => ({ ...prev, promptLanguage: v as PromptLanguage }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{t('languageOptions.auto')}</SelectItem>
                  <SelectItem value="en">{t('languageOptions.en')}</SelectItem>
                  <SelectItem value="zh-CN">{t('languageOptions.zh-CN')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          {t('templates.cancel')}
        </Button>
        <Button onClick={handleSave}>
          {t('templates.save')}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
});

export const LearningSettingsDialog = memo(function LearningSettingsDialog({
  open,
  onOpenChange,
}: LearningSettingsDialogProps) {
  const t = useTranslations('learningMode.settings');
  const {
    config,
    promptTemplates,
    activeTemplate,
    updateConfig,
    addPromptTemplate,
    deletePromptTemplate,
    getPromptPreview,
  } = useLearningMode();

  const handleSave = useCallback(
    (draft: SettingsDraft) => {
      const parsedMaxHints = Number.parseInt(draft.maxHintsPerQuestion, 10);
      const parsedHintDelay = Number.parseInt(draft.hintDelayMessages, 10);

      updateConfig({
        maxHintsPerQuestion: Number.isFinite(parsedMaxHints)
          ? Math.min(10, Math.max(1, parsedMaxHints))
          : 3,
        hintDelayMessages: Number.isFinite(parsedHintDelay)
          ? Math.min(10, Math.max(0, parsedHintDelay))
          : 2,
        enableEncouragement: draft.enableEncouragement,
        enableAdaptiveDifficulty: draft.enableAdaptiveDifficulty,
        enableSpacedRepetition: draft.enableSpacedRepetition,
        analysisDepth: draft.analysisDepth,
        responseLanguage: draft.responseLanguage,
        activeTemplateId: draft.activeTemplateId,
        mentorPersonality: draft.mentorPersonality || undefined,
        subjectContext: draft.subjectContext || undefined,
        promptLanguage: draft.promptLanguage,
      });
      toast.success(t('saved'));
      onOpenChange(false);
    },
    [updateConfig, onOpenChange, t]
  );

  const handleAddTemplate = useCallback(
    (template: Omit<PromptTemplate, 'id' | 'createdAt' | 'isBuiltIn'>) => {
      addPromptTemplate(template);
    },
    [addPromptTemplate]
  );

  const handleDeleteTemplate = useCallback(
    (id: string) => {
      deletePromptTemplate(id);
    },
    [deletePromptTemplate]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <SettingsContent
          key="learning-settings"
          config={config}
          templates={promptTemplates}
          activeTemplate={activeTemplate}
          onSave={handleSave}
          onCancel={() => onOpenChange(false)}
          onAddTemplate={handleAddTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          getPromptPreview={getPromptPreview}
        />
      ) : null}
    </Dialog>
  );
});

export default LearningSettingsDialog;
