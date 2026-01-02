'use client';

/**
 * AgentSummaryDialog - Dialog for generating and viewing agent execution summaries with diagrams
 * 
 * Features:
 * - Generate agent execution summaries
 * - Generate Mermaid diagrams for agent flow visualization
 * - View sub-agent details
 * - Export summaries
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Bot,
  GitBranch,
  Download,
  Copy,
  Check,
  Loader2,
  ChevronDown,
  Sparkles,
  Clock,
  Zap,
  CheckCircle,
  XCircle,
  RefreshCw,
  List,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useCopy } from '@/hooks/ui';
import { useSummary } from '@/hooks/chat';
import { MermaidBlock } from '@/components/chat/renderers/mermaid-block';
import type { BackgroundAgent } from '@/types/background-agent';
import type { DiagramType } from '@/types/summary';
import { toast } from 'sonner';

interface AgentSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: BackgroundAgent;
}

const DIAGRAM_TYPES: Array<{ value: DiagramType; label: string; icon: React.ReactNode; description: string }> = [
  { value: 'flowchart', label: 'Flowchart', icon: <GitBranch className="h-4 w-4" />, description: 'Agent execution flow' },
  { value: 'sequence', label: 'Sequence', icon: <List className="h-4 w-4" />, description: 'Step sequence' },
  { value: 'timeline', label: 'Timeline', icon: <Clock className="h-4 w-4" />, description: 'Execution timeline' },
  { value: 'stateDiagram', label: 'State', icon: <BarChart3 className="h-4 w-4" />, description: 'State transitions' },
];

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-destructive" />;
    case 'running':
      return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

export function AgentSummaryDialog({
  open,
  onOpenChange,
  agent,
}: AgentSummaryDialogProps) {
  const t = useTranslations('agentSummary');

  // Summary hook
  const {
    isGenerating,
    progress,
    agentSummary,
    diagram,
    error,
    generateAgentSummary,
    generateAgentDiagram,
    generateAgentSummaryWithDiagram,
    exportSummary,
    reset,
  } = useSummary();

  // Local state
  const [activeTab, setActiveTab] = useState<'summary' | 'diagram' | 'steps'>('summary');
  const [diagramType, setDiagramType] = useState<DiagramType>('flowchart');
  const [includeSubAgents, setIncludeSubAgents] = useState(true);
  const [includeToolCalls, setIncludeToolCalls] = useState(true);
  const [includeTiming, setIncludeTiming] = useState(true);
  const [showOptions, setShowOptions] = useState(false);

  // Copy hook
  const { copy: copySummary, isCopying: isCopyingSummary } = useCopy({
    toastMessage: t('summaryCopied'),
  });
  const { copy: copyDiagram, isCopying: isCopyingDiagram } = useCopy({
    toastMessage: t('diagramCopied'),
  });

  // Stats
  const stats = useMemo(() => {
    const completedSteps = agent.steps.filter(s => s.status === 'completed').length;
    const failedSteps = agent.steps.filter(s => s.status === 'failed').length;
    const completedSubAgents = agent.subAgents.filter(sa => sa.status === 'completed').length;
    
    const toolsUsed = new Set<string>();
    agent.steps.forEach(step => {
      step.toolCalls?.forEach(tc => toolsUsed.add(tc.name));
    });

    const totalDuration = agent.completedAt && agent.startedAt
      ? agent.completedAt.getTime() - agent.startedAt.getTime()
      : agent.steps.reduce((sum, s) => sum + (s.duration || 0), 0);

    return {
      totalSteps: agent.steps.length,
      completedSteps,
      failedSteps,
      totalSubAgents: agent.subAgents.length,
      completedSubAgents,
      toolsUsed: Array.from(toolsUsed),
      totalDuration,
    };
  }, [agent]);

  // Generate summary
  const handleGenerateSummary = useCallback(async () => {
    try {
      await generateAgentSummary(agent, {
        includeSubAgents,
        includeToolCalls,
        includeTiming,
        format: 'detailed',
      });
      toast.success(t('summaryGenerated'));
    } catch (_err) {
      toast.error(t('summaryFailed'));
    }
  }, [agent, includeSubAgents, includeToolCalls, includeTiming, generateAgentSummary, t]);

  // Generate diagram
  const handleGenerateDiagram = useCallback(() => {
    try {
      generateAgentDiagram(agent, {
        type: diagramType,
        expandToolCalls: includeToolCalls,
        showTimestamps: includeTiming,
      });
      toast.success(t('diagramGenerated'));
    } catch (_err) {
      toast.error(t('diagramFailed'));
    }
  }, [agent, diagramType, includeToolCalls, includeTiming, generateAgentDiagram, t]);

  // Generate both
  const handleGenerateBoth = useCallback(async () => {
    try {
      await generateAgentSummaryWithDiagram(
        agent,
        { includeSubAgents, includeToolCalls, includeTiming, format: 'detailed' },
        { type: diagramType, expandToolCalls: includeToolCalls, showTimestamps: includeTiming }
      );
      toast.success(t('generationComplete'));
    } catch (_err) {
      toast.error(t('generationFailed'));
    }
  }, [agent, includeSubAgents, includeToolCalls, includeTiming, diagramType, generateAgentSummaryWithDiagram, t]);

  // Export handlers
  const handleExport = useCallback((format: 'markdown' | 'html' | 'json') => {
    exportSummary({
      format,
      includeDiagram: !!diagram,
      filename: `${agent.name}-summary`,
    });
    toast.success(t('exported', { format: format.toUpperCase() }));
  }, [agent.name, diagram, exportSummary, t]);

  // Reset when dialog closes
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      reset();
    }
    onOpenChange(open);
  }, [onOpenChange, reset]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            {t('title')}: {agent.name}
          </DialogTitle>
          <DialogDescription>
            {agent.task.slice(0, 100)}{agent.task.length > 100 ? '...' : ''}
          </DialogDescription>
        </DialogHeader>

        {/* Stats */}
        <div className="flex flex-wrap gap-2 py-2">
          <Badge variant={agent.status === 'completed' ? 'default' : agent.status === 'failed' ? 'destructive' : 'secondary'}>
            {getStatusIcon(agent.status)}
            <span className="ml-1">{agent.status}</span>
          </Badge>
          <Badge variant="outline">
            <Zap className="h-3 w-3 mr-1" />
            {stats.completedSteps}/{stats.totalSteps} {t('steps')}
          </Badge>
          {stats.totalSubAgents > 0 && (
            <Badge variant="outline">
              <Bot className="h-3 w-3 mr-1" />
              {stats.completedSubAgents}/{stats.totalSubAgents} {t('subAgents')}
            </Badge>
          )}
          {stats.toolsUsed.length > 0 && (
            <Badge variant="outline" className="bg-green-50 dark:bg-green-950">
              🔧 {stats.toolsUsed.length} {t('tools')}
            </Badge>
          )}
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            {formatDuration(stats.totalDuration)}
          </Badge>
        </div>

        {/* Options */}
        <Collapsible open={showOptions} onOpenChange={setShowOptions}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span>{t('options')}</span>
              <ChevronDown className={cn('h-4 w-4 transition-transform', showOptions && 'rotate-180')} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            <div className="space-y-2">
              <Label>{t('diagramType')}</Label>
              <Select value={diagramType} onValueChange={(v) => setDiagramType(v as DiagramType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIAGRAM_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        {type.icon}
                        <span>{type.label}</span>
                        <span className="text-xs text-muted-foreground">- {type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Switch id="include-subagents" checked={includeSubAgents} onCheckedChange={setIncludeSubAgents} />
                <Label htmlFor="include-subagents" className="text-sm">{t('includeSubAgents')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="include-tools" checked={includeToolCalls} onCheckedChange={setIncludeToolCalls} />
                <Label htmlFor="include-tools" className="text-sm">{t('includeToolCalls')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="include-timing" checked={includeTiming} onCheckedChange={setIncludeTiming} />
                <Label htmlFor="include-timing" className="text-sm">{t('includeTiming')}</Label>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Progress */}
        {isGenerating && progress && (
          <div className="space-y-2 py-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{progress.message}</span>
              <span>{progress.progress}%</span>
            </div>
            <Progress value={progress.progress} className="h-2" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'summary' | 'diagram' | 'steps')} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary" className="gap-2">
              <Bot className="h-4 w-4" />
              {t('summaryTab')}
            </TabsTrigger>
            <TabsTrigger value="diagram" className="gap-2">
              <GitBranch className="h-4 w-4" />
              {t('diagramTab')}
            </TabsTrigger>
            <TabsTrigger value="steps" className="gap-2">
              <Zap className="h-4 w-4" />
              {t('stepsTab')}
            </TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="flex-1 min-h-0 mt-4">
            {agentSummary ? (
              <ScrollArea className="h-[280px] rounded-lg border p-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: formatSummaryAsHtml(agentSummary.summary) }} />
                </div>

                {/* Sub-agent summaries */}
                {agentSummary.subAgentSummaries && agentSummary.subAgentSummaries.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium mb-2">{t('subAgentResults')}</h4>
                    <div className="space-y-2">
                      {agentSummary.subAgentSummaries.map((sa, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                          {getStatusIcon(sa.status)}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{sa.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{sa.task}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tools used */}
                {agentSummary.toolsUsed.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium mb-2">{t('toolsUsed')}</h4>
                    <div className="flex flex-wrap gap-2">
                      {agentSummary.toolsUsed.map(tool => (
                        <Badge key={tool} variant="outline">
                          🔧 {tool}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </ScrollArea>
            ) : (
              <div className="h-[280px] flex items-center justify-center border rounded-lg bg-muted/30">
                <div className="text-center">
                  <Bot className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">{t('noSummaryYet')}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={handleGenerateSummary}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    {t('generateSummary')}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Diagram Tab */}
          <TabsContent value="diagram" className="flex-1 min-h-0 mt-4">
            {diagram && diagram.success ? (
              <div className="h-[280px] overflow-auto">
                <MermaidBlock content={diagram.mermaidCode} />
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center border rounded-lg bg-muted/30">
                <div className="text-center">
                  <GitBranch className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">{t('noDiagramYet')}</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-3">
                    {DIAGRAM_TYPES.slice(0, 3).map(type => (
                      <Button
                        key={type.value}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDiagramType(type.value);
                          generateAgentDiagram(agent, { type: type.value });
                        }}
                        disabled={isGenerating}
                      >
                        {type.icon}
                        <span className="ml-1">{type.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Steps Tab */}
          <TabsContent value="steps" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-[280px] rounded-lg border">
              <div className="p-2 space-y-2">
                {agent.steps.map((step) => (
                  <div
                    key={step.id}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border',
                      step.status === 'completed' && 'bg-green-50/50 dark:bg-green-950/20',
                      step.status === 'failed' && 'bg-red-50/50 dark:bg-red-950/20',
                      step.status === 'running' && 'bg-blue-50/50 dark:bg-blue-950/20'
                    )}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background border">
                      {getStatusIcon(step.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">{step.title}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px]">
                            {step.type}
                          </Badge>
                          {step.duration && (
                            <span>{formatDuration(step.duration)}</span>
                          )}
                        </div>
                      </div>
                      {step.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {step.description}
                        </p>
                      )}
                      {step.toolCalls && step.toolCalls.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {step.toolCalls.map(tc => (
                            <Badge key={tc.id} variant="secondary" className="text-[10px]">
                              🔧 {tc.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {step.error && (
                        <p className="text-xs text-destructive mt-1">{step.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <div className="flex gap-2">
            {agentSummary && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => copySummary(agentSummary.summary)}
                disabled={isCopyingSummary}
              >
                {isCopyingSummary ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="ml-1">{t('copySummary')}</span>
              </Button>
            )}
            {diagram && diagram.success && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyDiagram(diagram.mermaidCode)}
                disabled={isCopyingDiagram}
              >
                {isCopyingDiagram ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="ml-1">{t('copyDiagram')}</span>
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {(agentSummary || diagram) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    {t('export')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('markdown')}>
                    Markdown (.md)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('html')}>
                    HTML (.html)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('json')}>
                    JSON (.json)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={activeTab === 'summary' ? handleGenerateSummary : handleGenerateDiagram}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              {t('regenerate')}
            </Button>

            <Button onClick={handleGenerateBoth} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {t('generateBoth')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatSummaryAsHtml(text: string): string {
  return text
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-medium mt-3 mb-1">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p class="my-2">')
    .replace(/\n- /g, '</p><li class="ml-4">')
    .replace(/^- /gm, '<li class="ml-4">')
    .replace(/<\/li><li/g, '</li><li');
}

export default AgentSummaryDialog;
