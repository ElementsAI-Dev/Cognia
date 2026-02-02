/**
 * Plugin Creation Wizard
 * Guides users through creating a new plugin from templates
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Code2,
  FileCode2,
  Puzzle,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Copy,
  Download,
  FolderOpen,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  PLUGIN_TEMPLATES,
  scaffoldPlugin,
  type PluginTemplate,
  type PluginScaffoldOptions,
} from '@/lib/plugin';
import type { PluginType, PluginCapability } from '@/types/plugin';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface PluginCreateWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (files: Map<string, string>, options: PluginScaffoldOptions) => void;
}

type WizardStep = 'template' | 'details' | 'capabilities' | 'preview';

interface WizardState {
  selectedTemplate: PluginTemplate | null;
  pluginType: PluginType;
  name: string;
  id: string;
  description: string;
  authorName: string;
  authorEmail: string;
  capabilities: PluginCapability[];
}

// =============================================================================
// Constants
// =============================================================================

const STEP_KEYS: { id: WizardStep; titleKey: string; descKey: string }[] = [
  { id: 'template', titleKey: 'steps.template', descKey: 'steps.templateDesc' },
  { id: 'details', titleKey: 'steps.details', descKey: 'steps.detailsDesc' },
  { id: 'capabilities', titleKey: 'steps.capabilities', descKey: 'steps.capabilitiesDesc' },
  { id: 'preview', titleKey: 'steps.preview', descKey: 'steps.previewDesc' },
];

const TYPE_INFO: Record<PluginType, { icon: React.ElementType; labelKey: string; descKey: string }> = {
  frontend: {
    icon: Code2,
    labelKey: 'types.frontend',
    descKey: 'types.frontendDesc',
  },
  python: {
    icon: FileCode2,
    labelKey: 'types.python',
    descKey: 'types.pythonDesc',
  },
  hybrid: {
    icon: Sparkles,
    labelKey: 'types.hybrid',
    descKey: 'types.hybridDesc',
  },
};

const CAPABILITY_INFO: Record<PluginCapability, { labelKey: string; descKey: string }> = {
  tools: { labelKey: 'capabilities.tools', descKey: 'capabilities.toolsDesc' },
  components: { labelKey: 'capabilities.components', descKey: 'capabilities.componentsDesc' },
  modes: { labelKey: 'capabilities.modes', descKey: 'capabilities.modesDesc' },
  skills: { labelKey: 'capabilities.skills', descKey: 'capabilities.skillsDesc' },
  themes: { labelKey: 'capabilities.themes', descKey: 'capabilities.themesDesc' },
  commands: { labelKey: 'capabilities.commands', descKey: 'capabilities.commandsDesc' },
  hooks: { labelKey: 'capabilities.hooks', descKey: 'capabilities.hooksDesc' },
  processors: { labelKey: 'capabilities.processors', descKey: 'capabilities.processorsDesc' },
  providers: { labelKey: 'capabilities.providers', descKey: 'capabilities.providersDesc' },
  exporters: { labelKey: 'capabilities.exporters', descKey: 'capabilities.exportersDesc' },
  importers: { labelKey: 'capabilities.importers', descKey: 'capabilities.importersDesc' },
  a2ui: { labelKey: 'capabilities.a2ui', descKey: 'capabilities.a2uiDesc' },
  python: { labelKey: 'capabilities.pythonCap', descKey: 'capabilities.pythonCapDesc' },
  scheduler: { labelKey: 'capabilities.scheduler', descKey: 'capabilities.schedulerDesc' },
};

// =============================================================================
// Helper Functions
// =============================================================================

function generateId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function getDifficultyColor(difficulty: PluginTemplate['difficulty']): string {
  switch (difficulty) {
    case 'beginner':
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'intermediate':
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case 'advanced':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
  }
}

// =============================================================================
// Sub-Components
// =============================================================================

function TemplateCard({
  template,
  selected,
  onClick,
}: {
  template: PluginTemplate;
  selected: boolean;
  onClick: () => void;
}) {
  const TypeIcon = TYPE_INFO[template.type].icon;

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:border-primary/50',
        selected && 'border-primary ring-2 ring-primary/20'
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <TypeIcon className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{template.name}</CardTitle>
          </div>
          <Badge variant="outline" className={getDifficultyColor(template.difficulty)}>
            {template.difficulty}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm">{template.description}</CardDescription>
        <div className="flex flex-wrap gap-1 mt-3">
          {template.capabilities.slice(0, 3).map(cap => (
            <Badge key={cap} variant="secondary" className="text-xs">
              {cap}
            </Badge>
          ))}
          {template.capabilities.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{template.capabilities.length - 3}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FilePreview({ files }: { files: Map<string, string> }) {
  const [selectedFile, setSelectedFile] = useState<string>(
    Array.from(files.keys())[0] || ''
  );
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    const content = files.get(selectedFile);
    if (content) {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="grid grid-cols-4 gap-4 h-[400px]">
      <div className="col-span-1 border rounded-lg">
        <div className="p-2 border-b text-xs font-medium text-muted-foreground">
          Files
        </div>
        <ScrollArea className="h-[360px]">
          <div className="p-2 space-y-1">
            {Array.from(files.keys()).map(path => (
              <button
                key={path}
                onClick={() => setSelectedFile(path)}
                className={cn(
                  'w-full text-left px-2 py-1.5 rounded text-sm font-mono truncate',
                  selectedFile === path
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
              >
                {path}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
      <div className="col-span-3 border rounded-lg">
        <div className="p-2 border-b flex items-center justify-between">
          <span className="text-xs font-mono text-muted-foreground">
            {selectedFile}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={copyToClipboard}
            className="h-7 px-2"
          >
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
        <ScrollArea className="h-[360px]">
          <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
            {files.get(selectedFile) || ''}
          </pre>
        </ScrollArea>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function PluginCreateWizard({
  open,
  onOpenChange,
  onComplete,
}: PluginCreateWizardProps) {
  const t = useTranslations('pluginCreateWizard');
  const [currentStep, setCurrentStep] = useState<WizardStep>('template');
  const [state, setState] = useState<WizardState>({
    selectedTemplate: null,
    pluginType: 'frontend',
    name: '',
    id: '',
    description: '',
    authorName: '',
    authorEmail: '',
    capabilities: ['tools'],
  });

  const currentStepIndex = STEP_KEYS.findIndex(s => s.id === currentStep);

  const generatedFiles = useMemo(() => {
    if (!state.name || !state.id) return new Map<string, string>();

    const options: PluginScaffoldOptions = {
      name: state.name,
      id: state.id,
      description: state.description,
      author: {
        name: state.authorName,
        email: state.authorEmail || undefined,
      },
      type: state.selectedTemplate?.type || state.pluginType,
      capabilities: state.selectedTemplate?.capabilities || state.capabilities,
      template: state.selectedTemplate?.id,
    };

    return scaffoldPlugin(options);
  }, [state]);

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 'template':
        return true; // Can skip template selection
      case 'details':
        return state.name.length > 0 && state.id.length > 0 && state.authorName.length > 0;
      case 'capabilities':
        return state.capabilities.length > 0;
      case 'preview':
        return generatedFiles.size > 0;
      default:
        return false;
    }
  }, [currentStep, state, generatedFiles]);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEP_KEYS.length) {
      setCurrentStep(STEP_KEYS[nextIndex].id);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEP_KEYS[prevIndex].id);
    }
  };

  const handleComplete = () => {
    if (generatedFiles.size > 0) {
      const options: PluginScaffoldOptions = {
        name: state.name,
        id: state.id,
        description: state.description,
        author: {
          name: state.authorName,
          email: state.authorEmail || undefined,
        },
        type: state.selectedTemplate?.type || state.pluginType,
        capabilities: state.selectedTemplate?.capabilities || state.capabilities,
        template: state.selectedTemplate?.id,
      };
      onComplete?.(generatedFiles, options);
      onOpenChange(false);
    }
  };

  const handleNameChange = (name: string) => {
    setState(s => ({
      ...s,
      name,
      id: s.id === generateId(s.name) ? generateId(name) : s.id,
    }));
  };

  const toggleCapability = (cap: PluginCapability) => {
    setState(s => ({
      ...s,
      capabilities: s.capabilities.includes(cap)
        ? s.capabilities.filter(c => c !== cap)
        : [...s.capabilities, cap],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Puzzle className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t(STEP_KEYS[currentStepIndex].descKey)}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between px-4 py-2 border-b">
          {STEP_KEYS.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
                  i < currentStepIndex
                    ? 'bg-primary text-primary-foreground'
                    : i === currentStepIndex
                    ? 'bg-primary/20 text-primary border-2 border-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {i < currentStepIndex ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  'ml-2 text-sm hidden sm:inline',
                  i === currentStepIndex ? 'font-medium' : 'text-muted-foreground'
                )}
              >
                {t(step.titleKey)}
              </span>
              {i < STEP_KEYS.length - 1 && (
                <ChevronRight className="h-4 w-4 mx-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <ScrollArea className="flex-1 px-1">
          <div className="py-4">
            {/* Template Selection */}
            {currentStep === 'template' && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {PLUGIN_TEMPLATES.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      selected={state.selectedTemplate?.id === template.id}
                      onClick={() =>
                        setState(s => ({
                          ...s,
                          selectedTemplate:
                            s.selectedTemplate?.id === template.id ? null : template,
                          pluginType: template.type,
                          capabilities: template.capabilities,
                        }))
                      }
                    />
                  ))}
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  {t('template.skipToScratch')}
                </div>
              </div>
            )}

            {/* Plugin Details */}
            {currentStep === 'details' && (
              <div className="space-y-6 max-w-lg mx-auto">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('details.pluginName')} *</Label>
                  <Input
                    id="name"
                    value={state.name}
                    onChange={e => handleNameChange(e.target.value)}
                    placeholder={t('details.pluginNamePlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="id">{t('details.pluginId')} *</Label>
                  <Input
                    id="id"
                    value={state.id}
                    onChange={e => setState(s => ({ ...s, id: e.target.value }))}
                    placeholder={t('details.pluginIdPlaceholder')}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('details.pluginIdHint')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t('details.description')}</Label>
                  <Textarea
                    id="description"
                    value={state.description}
                    onChange={e => setState(s => ({ ...s, description: e.target.value }))}
                    placeholder={t('details.descriptionPlaceholder')}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="authorName">{t('details.authorName')} *</Label>
                    <Input
                      id="authorName"
                      value={state.authorName}
                      onChange={e => setState(s => ({ ...s, authorName: e.target.value }))}
                      placeholder={t('details.authorNamePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="authorEmail">{t('details.authorEmail')}</Label>
                    <Input
                      id="authorEmail"
                      type="email"
                      value={state.authorEmail}
                      onChange={e => setState(s => ({ ...s, authorEmail: e.target.value }))}
                      placeholder={t('details.authorEmailPlaceholder')}
                    />
                  </div>
                </div>

                {!state.selectedTemplate && (
                  <div className="space-y-2">
                    <Label>{t('details.pluginType')}</Label>
                    <RadioGroup
                      value={state.pluginType}
                      onValueChange={v => setState(s => ({ ...s, pluginType: v as PluginType }))}
                    >
                      {Object.entries(TYPE_INFO).map(([type, info]) => {
                        const Icon = info.icon;
                        return (
                          <div key={type} className="flex items-center space-x-3">
                            <RadioGroupItem value={type} id={type} />
                            <Label
                              htmlFor={type}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Icon className="h-4 w-4" />
                              <span className="font-medium">{t(info.labelKey)}</span>
                              <span className="text-muted-foreground">
                                - {t(info.descKey)}
                              </span>
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  </div>
                )}
              </div>
            )}

            {/* Capabilities */}
            {currentStep === 'capabilities' && !state.selectedTemplate && (
              <div className="space-y-4 max-w-lg mx-auto">
                <p className="text-sm text-muted-foreground">
                  {t('capabilities.selectPrompt')}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.entries(CAPABILITY_INFO) as [PluginCapability, typeof CAPABILITY_INFO[PluginCapability]][]).map(
                    ([cap, info]) => (
                      <div
                        key={cap}
                        className={cn(
                          'flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors',
                          state.capabilities.includes(cap)
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        )}
                        onClick={() => toggleCapability(cap)}
                      >
                        <Checkbox
                          checked={state.capabilities.includes(cap)}
                          onCheckedChange={() => toggleCapability(cap)}
                        />
                        <div>
                          <p className="font-medium text-sm">{t(info.labelKey)}</p>
                          <p className="text-xs text-muted-foreground">{t(info.descKey)}</p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {currentStep === 'capabilities' && state.selectedTemplate && (
              <div className="text-center py-8">
                <Sparkles className="h-12 w-12 mx-auto text-primary mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {t('capabilities.usingTemplate', { name: state.selectedTemplate.name })}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {t('capabilities.preConfigured')}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {state.selectedTemplate.capabilities.map(cap => (
                    <Badge key={cap} variant="secondary">
                      {t(CAPABILITY_INFO[cap]?.labelKey) || cap}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            {currentStep === 'preview' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{state.name}</h3>
                    <p className="text-sm text-muted-foreground">{state.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      {t(TYPE_INFO[state.selectedTemplate?.type || state.pluginType].labelKey)}
                    </Badge>
                    <Badge variant="secondary">{t('preview.filesCount', { count: generatedFiles.size })}</Badge>
                  </div>
                </div>
                <FilePreview files={generatedFiles} />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            {t('navigation.back')}
          </Button>

          <div className="flex gap-2">
            {currentStep === 'preview' ? (
              <>
                <Button variant="outline" onClick={() => {}}>
                  <Download className="h-4 w-4 mr-2" />
                  {t('navigation.downloadZip')}
                </Button>
                <Button onClick={handleComplete}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  {t('navigation.createInPlugins')}
                </Button>
              </>
            ) : (
              <Button onClick={handleNext} disabled={!canProceed}>
                {t('navigation.next')}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PluginCreateWizard;
