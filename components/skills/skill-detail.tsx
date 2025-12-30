'use client';

/**
 * Skill Detail Component
 * 
 * Full-page view for a single skill with all details, resources, and actions
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Sparkles,
  Trash2,
  Download,
  Play,
  Clock,
  Tag,
  FileText,
  Code,
  Palette,
  Building2,
  Zap,
  BarChart3,
  MessageSquare,
  Cog,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { CopyButton } from '@/components/ui/copy-button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SkillMarkdownPreview, SkillMarkdownStyles } from './skill-markdown-preview';
import { SkillResourceManager } from './skill-resource-manager';
import { SkillEditor } from './skill-editor';
import { useSkillStore } from '@/stores/skill-store';
import { estimateSkillTokens } from '@/lib/skills/executor';
import { downloadSkillAsMarkdown, downloadSkillAsPackage } from '@/lib/skills/packager';
import { processSelectionWithAI } from '@/lib/ai/selection-ai';
import type { Skill, SkillCategory } from '@/types/skill';

const CATEGORY_ICONS: Record<SkillCategory, React.ReactNode> = {
  'creative-design': <Palette className="h-4 w-4" />,
  'development': <Code className="h-4 w-4" />,
  'enterprise': <Building2 className="h-4 w-4" />,
  'productivity': <Zap className="h-4 w-4" />,
  'data-analysis': <BarChart3 className="h-4 w-4" />,
  'communication': <MessageSquare className="h-4 w-4" />,
  'meta': <Cog className="h-4 w-4" />,
  'custom': <FileText className="h-4 w-4" />,
};

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

interface SkillDetailProps {
  skillId: string;
  onClose?: () => void;
  onEdit?: (skill: Skill) => void; // Reserved for future use
}

export function SkillDetail({ skillId, onClose, onEdit: _onEdit }: SkillDetailProps) {
  const t = useTranslations('skills');
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'resources' | 'edit'>('overview');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const {
    skills,
    enableSkill,
    disableSkill,
    activateSkill,
    deactivateSkill,
    deleteSkill,
    updateSkill,
    getSkillUsageStats,
  } = useSkillStore();

  const skill = skills[skillId];
  const usageStats = getSkillUsageStats(skillId);

  const tokenEstimate = useMemo(() => {
    if (!skill) return 0;
    return estimateSkillTokens(skill);
  }, [skill]);

  const handleToggleStatus = useCallback(() => {
    if (!skill) return;
    if (skill.status === 'enabled') {
      disableSkill(skill.id);
    } else {
      enableSkill(skill.id);
    }
  }, [skill, enableSkill, disableSkill]);

  const handleToggleActive = useCallback(() => {
    if (!skill) return;
    if (skill.isActive) {
      deactivateSkill(skill.id);
    } else {
      activateSkill(skill.id);
    }
  }, [skill, activateSkill, deactivateSkill]);

  const handleDelete = useCallback(() => {
    if (!skill) return;
    deleteSkill(skill.id);
    setShowDeleteDialog(false);
    onClose?.();
  }, [skill, deleteSkill, onClose]);

  const handleDownload = useCallback((format: 'md' | 'json') => {
    if (!skill) return;
    if (format === 'md') {
      downloadSkillAsMarkdown(skill);
    } else {
      downloadSkillAsPackage(skill);
    }
  }, [skill]);

  const handleSaveEdit = useCallback((rawContent: string) => {
    if (!skill) return;
    updateSkill(skill.id, { content: rawContent });
    setActiveTab('overview');
  }, [skill, updateSkill]);

  const handleTestSkill = useCallback(() => {
    if (!skill) return;
    // Simulate a test by showing the system prompt that would be generated
    const testOutput = `=== Skill Test: ${skill.metadata.name} ===

System Prompt Preview:
---
## Active Skill: ${skill.metadata.name}
**Description:** ${skill.metadata.description}

## Skill Instructions
${skill.content.slice(0, 500)}${skill.content.length > 500 ? '...' : ''}

---
Token Estimate: ~${tokenEstimate} tokens
Resources: ${skill.resources.length} file(s)
Status: ${skill.status}
`;
    setTestResult(testOutput);
    setShowTestDialog(true);
  }, [skill, tokenEstimate]);

  if (!skill) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{t('skillNotFound')}</p>
        {onClose && (
          <Button variant="outline" onClick={onClose} className="mt-4">
            {t('goBack')}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <SkillMarkdownStyles />
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            {CATEGORY_ICONS[skill.category]}
            <h1 className="text-xl font-semibold">{skill.metadata.name}</h1>
          </div>
          <Badge variant={skill.status === 'enabled' ? 'default' : 'secondary'}>
            {skill.status === 'enabled' ? t('enabled') : t('disabled')}
          </Badge>
          {skill.isActive && (
            <Badge variant="default" className="bg-green-500">
              {t('active')}
            </Badge>
          )}
          {skill.source === 'builtin' && (
            <Badge variant="outline">{t('builtin')}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleTestSkill}>
            <Play className="h-4 w-4 mr-1" />
            {t('test')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDownload('md')}>
            <Download className="h-4 w-4 mr-1" />
            {t('export')}
          </Button>
          {skill.source !== 'builtin' && (
            <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="h-4 w-4 mr-1" />
              {t('delete')}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="h-full">
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="overview">{t('previewTab')}</TabsTrigger>
            <TabsTrigger value="content">{t('content')}</TabsTrigger>
            <TabsTrigger value="resources">{t('resourcesTab')}</TabsTrigger>
            <TabsTrigger value="edit">{t('editTab')}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="p-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  {t('aboutThisSkill')}
                </CardTitle>
                <CardDescription>{skill.metadata.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('category')}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {CATEGORY_ICONS[skill.category]}
                      <span>{t(CATEGORY_LABEL_KEYS[skill.category])}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('source')}</p>
                    <p className="mt-1 capitalize">{skill.source}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('version')}</p>
                    <p className="mt-1">{skill.version || '1.0.0'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('tokenEstimate')}</p>
                    <p className="mt-1">~{tokenEstimate} {t('tokens')}</p>
                  </div>
                </div>

                {skill.tags.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">{t('tags')}</p>
                    <div className="flex flex-wrap gap-2">
                      {skill.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{t('enabled')}</span>
                    <Switch
                      checked={skill.status === 'enabled'}
                      onCheckedChange={handleToggleStatus}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{t('activeInChat')}</span>
                    <Switch
                      checked={skill.isActive}
                      onCheckedChange={handleToggleActive}
                      disabled={skill.status !== 'enabled'}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Usage Stats */}
            {usageStats && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    {t('usageStatistics')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-2xl font-bold">{usageStats.totalExecutions}</p>
                      <p className="text-sm text-muted-foreground">{t('totalExecutionsLabel')}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {usageStats.totalExecutions > 0
                          ? Math.round((usageStats.successfulExecutions / usageStats.totalExecutions) * 100)
                          : 0}%
                      </p>
                      <p className="text-sm text-muted-foreground">{t('successRateLabel')}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {Math.round(usageStats.averageExecutionTime)}ms
                      </p>
                      <p className="text-sm text-muted-foreground">{t('avgDurationLabel')}</p>
                    </div>
                  </div>
                  {usageStats.lastExecutionAt && (
                    <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {t('lastUsed')}: {new Date(usageStats.lastExecutionAt).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Validation Errors */}
            {skill.validationErrors && skill.validationErrors.length > 0 && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    {t('validationIssuesTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {skill.validationErrors.map((error, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        {error.severity === 'error' ? (
                          <X className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                        )}
                        <span>
                          <strong>{error.field}:</strong> {error.message}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="p-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('skillContentLabel')}</CardTitle>
                <CopyButton
                  content={skill.rawContent}
                  className="h-8"
                  variant="outline"
                />
              </CardHeader>
              <CardContent>
                <SkillMarkdownPreview content={skill.content} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="p-4">
            <SkillResourceManager
              resources={skill.resources}
              onAddResource={() => {}}
              onRemoveResource={() => {}}
              readOnly={true}
            />
          </TabsContent>

          {/* Edit Tab */}
          <TabsContent value="edit" className="flex-1 min-h-0 overflow-hidden">
            <SkillEditor
              skill={skill}
              onSave={handleSaveEdit}
              onCancel={() => setActiveTab('overview')}
              readOnly={skill.source === 'builtin'}
              hideHeader
              onRequestAI={async (prompt) => {
                const result = await processSelectionWithAI({ action: 'rewrite', text: prompt, customPrompt: prompt });
                if (result.success && result.result) return result.result;
                throw new Error(result.error || 'AI request failed');
              }}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteSkill')}</DialogTitle>
            <DialogDescription>
              {t('deleteConfirm', { name: skill.metadata.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              {t('skillTestResult')}
            </DialogTitle>
            <DialogDescription>
              {t('previewInjection')}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted rounded-lg p-4 max-h-[400px] overflow-auto">
            <pre className="text-sm whitespace-pre-wrap font-mono">{testResult}</pre>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowTestDialog(false)}>{t('close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SkillDetail;
