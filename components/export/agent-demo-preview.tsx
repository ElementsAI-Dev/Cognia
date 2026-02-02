'use client';

/**
 * AgentDemoPreview - Preview and export agent workflow demonstrations
 * 
 * Features:
 * - Interactive preview of agent execution
 * - Export to animated HTML
 * - Export to Markdown
 * - Playback controls
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Play,
  Download,
  FileText,
  Code2,
  Loader2,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { BackgroundAgent, BackgroundAgentStep } from '@/types/agent/background-agent';
import {
  exportAgentDemo,
  exportAgentAsMarkdown,
  type AgentDemoOptions,
} from '@/lib/export/agent/agent-demo-export';
import { downloadFile } from '@/lib/export';

interface AgentDemoPreviewProps {
  agent: BackgroundAgent;
  trigger?: React.ReactNode;
}

type ExportFormat = 'html' | 'markdown';

const STEP_ICONS: Record<BackgroundAgentStep['type'], React.ReactNode> = {
  thinking: <span className="text-lg">🤔</span>,
  tool_call: <span className="text-lg">🔧</span>,
  sub_agent: <span className="text-lg">🤖</span>,
  response: <span className="text-lg">💬</span>,
};

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  completed: { 
    icon: <CheckCircle className="h-4 w-4" />, 
    color: 'text-green-500', 
    bgColor: 'bg-green-500/10' 
  },
  running: { 
    icon: <Loader2 className="h-4 w-4 animate-spin" />, 
    color: 'text-amber-500', 
    bgColor: 'bg-amber-500/10' 
  },
  failed: { 
    icon: <XCircle className="h-4 w-4" />, 
    color: 'text-red-500', 
    bgColor: 'bg-red-500/10' 
  },
  pending: { 
    icon: <Clock className="h-4 w-4" />, 
    color: 'text-muted-foreground', 
    bgColor: 'bg-muted' 
  },
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export function AgentDemoPreview({ agent, trigger }: AgentDemoPreviewProps) {
  const t = useTranslations('export');
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('html');
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  
  // Demo options
  const [autoPlay, setAutoPlay] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);
  const [showToolDetails, setShowToolDetails] = useState(true);
  const [showThinkingProcess, setShowThinkingProcess] = useState(true);
  const [playbackSpeed] = useState(1);

  // Toggle step expansion
  const toggleStep = useCallback((stepNumber: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepNumber)) {
        next.delete(stepNumber);
      } else {
        next.add(stepNumber);
      }
      return next;
    });
  }, []);

  // Handle export
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    
    try {
      const options: Partial<AgentDemoOptions> = {
        autoPlay,
        showTimeline,
        showToolDetails,
        showThinkingProcess,
        playbackSpeed,
        theme: 'system',
        showControls: true,
      };

      let content: string;
      let filename: string;
      let mimeType: string;

      if (exportFormat === 'html') {
        content = exportAgentDemo(agent, options);
        filename = `agent-demo-${agent.name.slice(0, 30)}-${new Date().toISOString().slice(0, 10)}.html`;
        mimeType = 'text/html';
      } else {
        content = exportAgentAsMarkdown(agent, { includeDetails: showToolDetails });
        filename = `agent-workflow-${agent.name.slice(0, 30)}-${new Date().toISOString().slice(0, 10)}.md`;
        mimeType = 'text/markdown';
      }

      downloadFile(content, filename, mimeType);
      toast.success(exportFormat === 'html' ? t('demoExported') : t('markdownExported'));
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(t('exportFailed'));
    } finally {
      setIsExporting(false);
    }
  }, [agent, exportFormat, autoPlay, showTimeline, showToolDetails, showThinkingProcess, playbackSpeed, t]);

  // Calculate statistics
  const stats = {
    totalSteps: agent.steps.length,
    completedSteps: agent.steps.filter(s => s.status === 'completed').length,
    failedSteps: agent.steps.filter(s => s.status === 'failed').length,
    totalDuration: agent.steps.reduce((sum, s) => sum + (s.duration || 0), 0),
    toolCalls: agent.steps.filter(s => s.type === 'tool_call').length,
  };

  const progress = stats.totalSteps > 0 
    ? (stats.completedSteps / stats.totalSteps) * 100 
    : 0;

  const statusConfig = STATUS_CONFIG[agent.status] || STATUS_CONFIG.pending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Play className="h-4 w-4 mr-2" />
            {t('agentDemoExport')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            {t('agentWorkflowDemo')}
          </DialogTitle>
          <DialogDescription>
            {t('agentWorkflowDemoDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Agent Info */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-muted/50">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">🤖</span>
                <h3 className="font-semibold truncate">{agent.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{agent.task}</p>
            </div>
            <Badge className={cn('shrink-0', statusConfig.bgColor, statusConfig.color)}>
              {statusConfig.icon}
              <span className="ml-1">{agent.status}</span>
            </Badge>
          </div>

          {/* Progress & Stats */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('executionProgress')}</span>
              <span className="font-medium">{stats.completedSteps}/{stats.totalSteps} {t('steps')}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>⏱ {formatDuration(stats.totalDuration)}</span>
              <span>🔧 {stats.toolCalls} {t('toolCalls')}</span>
              {stats.failedSteps > 0 && (
                <span className="text-red-500">❌ {stats.failedSteps} {t('failed')}</span>
              )}
            </div>
          </div>

          {/* Steps Preview */}
          <div className="flex-1 min-h-0">
            <Label className="mb-2 block">{t('stepsPreview')}</Label>
            <ScrollArea className="h-[200px] rounded-lg border">
              <div className="p-2 space-y-1">
                {agent.steps.map((step) => {
                  const stepStatus = STATUS_CONFIG[step.status] || STATUS_CONFIG.pending;
                  const isExpanded = expandedSteps.has(step.stepNumber);
                  
                  return (
                    <Collapsible
                      key={step.id}
                      open={isExpanded}
                      onOpenChange={() => toggleStep(step.stepNumber)}
                    >
                      <CollapsibleTrigger asChild>
                        <div
                          className={cn(
                            'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors',
                            'hover:bg-muted/50',
                            isExpanded && 'bg-muted/50'
                          )}
                        >
                          <div className={cn('p-1 rounded', stepStatus.bgColor)}>
                            {STEP_ICONS[step.type]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{step.title}</span>
                              {step.duration && (
                                <span className="text-xs text-muted-foreground">
                                  {formatDuration(step.duration)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={cn('flex items-center gap-1 text-xs', stepStatus.color)}>
                            {stepStatus.icon}
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-10 p-2 text-sm text-muted-foreground border-l-2 border-muted">
                          {step.description && <p className="mb-2">{step.description}</p>}
                          {step.toolCalls && step.toolCalls.length > 0 && (
                            <div className="space-y-1">
                              {step.toolCalls.map((tc, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <span>🔧</span>
                                  <code className="text-xs bg-muted px-1 py-0.5 rounded">{tc.name}</code>
                                  <span className={cn(
                                    'text-xs',
                                    tc.status === 'completed' ? 'text-green-500' : 'text-red-500'
                                  )}>
                                    {tc.status === 'completed' ? '✓' : '✗'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Export Options */}
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>{t('exportFormatDemo')}</Label>
              <RadioGroup
                value={exportFormat}
                onValueChange={(v) => setExportFormat(v as ExportFormat)}
                className="flex gap-4"
              >
                <div className="flex items-center">
                  <RadioGroupItem value="html" id="format-html" className="peer sr-only" />
                  <Label
                    htmlFor="format-html"
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors',
                      'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10',
                      'hover:bg-muted'
                    )}
                  >
                    <Code2 className="h-4 w-4" />
                    <div>
                      <div className="font-medium">{t('interactiveHtml')}</div>
                      <div className="text-xs text-muted-foreground">{t('interactiveHtmlDesc')}</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center">
                  <RadioGroupItem value="markdown" id="format-md" className="peer sr-only" />
                  <Label
                    htmlFor="format-md"
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors',
                      'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10',
                      'hover:bg-muted'
                    )}
                  >
                    <FileText className="h-4 w-4" />
                    <div>
                      <div className="font-medium">{t('markdownDemo')}</div>
                      <div className="text-xs text-muted-foreground">{t('markdownDemoDesc')}</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {exportFormat === 'html' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label htmlFor="auto-play" className="text-sm font-normal">
                    {t('autoPlayDemo')}
                  </Label>
                  <Switch
                    id="auto-play"
                    checked={autoPlay}
                    onCheckedChange={setAutoPlay}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label htmlFor="show-timeline" className="text-sm font-normal">
                    {t('showTimelineDemo')}
                  </Label>
                  <Switch
                    id="show-timeline"
                    checked={showTimeline}
                    onCheckedChange={setShowTimeline}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label htmlFor="show-tools" className="text-sm font-normal">
                    {t('showToolDetailsDemo')}
                  </Label>
                  <Switch
                    id="show-tools"
                    checked={showToolDetails}
                    onCheckedChange={setShowToolDetails}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label htmlFor="show-thinking" className="text-sm font-normal">
                    {t('showThinkingDemo')}
                  </Label>
                  <Switch
                    id="show-thinking"
                    checked={showThinkingProcess}
                    onCheckedChange={setShowThinkingProcess}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Export Button */}
          <Button
            onClick={handleExport}
            className="w-full"
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isExporting ? t('exportingDemo') : t('exportDemo')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AgentDemoPreview;
