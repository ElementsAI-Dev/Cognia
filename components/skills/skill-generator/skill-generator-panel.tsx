'use client';

/**
 * Skill Generator Panel
 *
 * Main interface for generating AI skills using Skill Seekers.
 * Supports website scraping, GitHub repository analysis, and PDF extraction.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Globe,
  Github,
  FileText,
  Sparkles,
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Zap,
  Package,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useSkillSeekersStore, selectActiveJob, selectPresetsByCategory } from '@/stores/skill-seekers';
import type { EnhanceProvider } from '@/lib/native/skill-seekers';

type GeneratorStep = 'source' | 'config' | 'progress' | 'complete';
type SourceTab = 'website' | 'github' | 'pdf' | 'preset';

interface SkillGeneratorPanelProps {
  className?: string;
  onComplete?: (skillPath: string) => void;
  onCancel?: () => void;
}

export function SkillGeneratorPanel({ className, onComplete, onCancel }: SkillGeneratorPanelProps) {
  const t = useTranslations('skills');

  const {
    isInstalled,
    isInstalling,
    isLoading,
    error,
    install,
    checkInstallation,
    quickGenerateWebsite,
    quickGenerateGitHub,
    quickGeneratePreset,
    cancelJob,
    clearError,
  } = useSkillSeekersStore();

  const activeJob = useSkillSeekersStore(selectActiveJob);
  const presetsByCategory = useSkillSeekersStore(selectPresetsByCategory);

  const [step, setStep] = useState<GeneratorStep>('source');
  const [sourceTab, setSourceTab] = useState<SourceTab>('website');

  const [websiteUrl, setWebsiteUrl] = useState('');
  const [skillName, setSkillName] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [autoEnhance, setAutoEnhance] = useState(false);
  const [autoInstall, setAutoInstall] = useState(true);
  const [enhanceProvider, setEnhanceProvider] = useState<EnhanceProvider>('anthropic');

  useEffect(() => {
    checkInstallation();
  }, [checkInstallation]);

  const currentStep = activeJob
    ? activeJob.status === 'running' || activeJob.status === 'queued'
      ? 'progress'
      : activeJob.status === 'completed'
        ? 'complete'
        : step
    : step;

  const handleInstall = useCallback(async () => {
    try {
      await install(['gemini', 'openai']);
    } catch {
      // Error handled by store
    }
  }, [install]);

  const handleGenerate = useCallback(async () => {
    clearError();
    try {
      switch (sourceTab) {
        case 'website':
          if (!websiteUrl || !skillName) return;
          await quickGenerateWebsite(websiteUrl, skillName, autoEnhance, autoInstall);
          break;
        case 'github':
          if (!githubRepo) return;
          await quickGenerateGitHub(githubRepo, autoEnhance, autoInstall);
          break;
        case 'preset':
          if (!selectedPreset) return;
          await quickGeneratePreset(selectedPreset, autoEnhance, autoInstall);
          break;
        default:
          break;
      }
      setStep('progress');
    } catch {
      // Error handled by store
    }
  }, [
    sourceTab,
    websiteUrl,
    skillName,
    githubRepo,
    selectedPreset,
    autoEnhance,
    autoInstall,
    quickGenerateWebsite,
    quickGenerateGitHub,
    quickGeneratePreset,
    clearError,
  ]);

  const handleCancel = useCallback(async () => {
    if (activeJob) {
      await cancelJob(activeJob.id);
    }
    onCancel?.();
  }, [activeJob, cancelJob, onCancel]);

  const handleComplete = useCallback(() => {
    if (activeJob?.skillPath) {
      onComplete?.(activeJob.skillPath);
    }
    setStep('source');
    setWebsiteUrl('');
    setSkillName('');
    setGithubRepo('');
    setSelectedPreset(null);
  }, [activeJob, onComplete]);

  const canGenerate = useCallback(() => {
    switch (sourceTab) {
      case 'website':
        return websiteUrl.trim() !== '' && skillName.trim() !== '';
      case 'github':
        return githubRepo.trim() !== '' && githubRepo.includes('/');
      case 'preset':
        return selectedPreset !== null;
      case 'pdf':
        return false;
      default:
        return false;
    }
  }, [sourceTab, websiteUrl, skillName, githubRepo, selectedPreset]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isInstalled) {
    return (
      <Card className={cn('', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {t('skillSeekers.title') || 'Skill Seekers'}
          </CardTitle>
          <CardDescription>
            {t('skillSeekers.installDescription') || 'Install Skill Seekers to generate AI skills from documentation, GitHub repositories, and PDFs.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleInstall} disabled={isInstalling} className="w-full">
            {isInstalling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('skillSeekers.installing') || 'Installing...'}
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                {t('skillSeekers.install') || 'Install Skill Seekers'}
              </>
            )}
          </Button>
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('error') || 'Error'}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('error') || 'Error'}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {currentStep === 'source' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              {t('skillSeekers.generateSkill') || 'Generate Skill'}
            </CardTitle>
            <CardDescription>
              {t('skillSeekers.generateDescription') || 'Choose a source to generate a new AI skill.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={sourceTab} onValueChange={(v) => setSourceTab(v as SourceTab)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="website" className="flex items-center gap-1.5">
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('skillSeekers.website') || 'Website'}</span>
                </TabsTrigger>
                <TabsTrigger value="github" className="flex items-center gap-1.5">
                  <Github className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('skillSeekers.github') || 'GitHub'}</span>
                </TabsTrigger>
                <TabsTrigger value="preset" className="flex items-center gap-1.5">
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('skillSeekers.preset') || 'Preset'}</span>
                </TabsTrigger>
                <TabsTrigger value="pdf" disabled className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('skillSeekers.pdf') || 'PDF'}</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="website" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="skill-name">{t('skillSeekers.skillName') || 'Skill Name'}</Label>
                  <Input
                    id="skill-name"
                    placeholder="e.g., React Documentation"
                    value={skillName}
                    onChange={(e) => setSkillName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website-url">{t('skillSeekers.websiteUrl') || 'Documentation URL'}</Label>
                  <Input
                    id="website-url"
                    placeholder="https://docs.example.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="github" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="github-repo">{t('skillSeekers.githubRepo') || 'Repository'}</Label>
                  <Input
                    id="github-repo"
                    placeholder="owner/repository"
                    value={githubRepo}
                    onChange={(e) => setGithubRepo(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('skillSeekers.githubHint') || 'Enter the repository in owner/repo format (e.g., facebook/react)'}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="preset" className="pt-4">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {Object.entries(presetsByCategory).map(([category, categoryPresets]) => (
                      <div key={category} className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground capitalize">
                          {category.replace(/-/g, ' ')}
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {categoryPresets.map((preset) => (
                            <button
                              key={preset.name}
                              onClick={() => setSelectedPreset(preset.name)}
                              className={cn(
                                'flex items-center gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-accent',
                                selectedPreset === preset.name && 'border-primary bg-primary/5'
                              )}
                            >
                              <span className="text-xl">{preset.icon || '📦'}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{preset.displayName}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {preset.estimatedPages ? `~${preset.estimatedPages} pages` : preset.description}
                                </p>
                              </div>
                              {selectedPreset === preset.name && (
                                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="pdf" className="pt-4">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {t('skillSeekers.pdfComingSoon') || 'PDF extraction coming soon'}
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6 space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-enhance">{t('skillSeekers.autoEnhance') || 'Auto-enhance with AI'}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('skillSeekers.autoEnhanceHint') || 'Improve skill quality using AI after scraping'}
                  </p>
                </div>
                <Switch id="auto-enhance" checked={autoEnhance} onCheckedChange={setAutoEnhance} />
              </div>

              {autoEnhance && (
                <div className="space-y-2">
                  <Label>{t('skillSeekers.enhanceProvider') || 'AI Provider'}</Label>
                  <Select value={enhanceProvider} onValueChange={(v) => setEnhanceProvider(v as EnhanceProvider)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                      <SelectItem value="google">Google (Gemini)</SelectItem>
                      <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-install">{t('skillSeekers.autoInstall') || 'Auto-install to library'}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('skillSeekers.autoInstallHint') || 'Automatically add skill to your library when complete'}
                  </p>
                </div>
                <Switch id="auto-install" checked={autoInstall} onCheckedChange={setAutoInstall} />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={onCancel}>
                {t('cancel') || 'Cancel'}
              </Button>
              <Button onClick={handleGenerate} disabled={!canGenerate()}>
                <Zap className="mr-2 h-4 w-4" />
                {t('skillSeekers.generate') || 'Generate Skill'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'progress' && activeJob && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t('skillSeekers.generating') || 'Generating Skill'}
            </CardTitle>
            <CardDescription>{activeJob.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="capitalize">{activeJob.progress.phase.replace(/_/g, ' ')}</span>
                <span>{activeJob.progress.percent}%</span>
              </div>
              <Progress value={activeJob.progress.percent} />
            </div>

            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">{activeJob.progress.message || 'Processing...'}</p>
              {activeJob.progress.pages_scraped > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {activeJob.progress.pages_scraped}
                  {activeJob.progress.pages_total ? ` / ${activeJob.progress.pages_total}` : ''} pages scraped
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="destructive" size="sm" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" />
                {t('skillSeekers.cancelGeneration') || 'Cancel'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'complete' && activeJob && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              {t('skillSeekers.complete') || 'Skill Generated'}
            </CardTitle>
            <CardDescription>{activeJob.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
                  <Sparkles className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{activeJob.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{activeJob.skillPath}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">
                      <Clock className="mr-1 h-3 w-3" />
                      {new Date(activeJob.completedAt || '').toLocaleTimeString()}
                    </Badge>
                    {activeJob.progress.pages_scraped > 0 && (
                      <Badge variant="outline">{activeJob.progress.pages_scraped} pages</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('source')}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('skillSeekers.generateAnother') || 'Generate Another'}
              </Button>
              <Button onClick={handleComplete}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {t('done') || 'Done'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SkillGeneratorPanel;
