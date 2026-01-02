'use client';

/**
 * ChatSummaryDialog - Dialog for generating and viewing chat summaries with diagrams
 * 
 * Features:
 * - Generate text summaries (AI or fallback)
 * - Generate Mermaid diagrams (multiple types)
 * - Select message range for summarization
 * - Export summaries in various formats
 * - Live preview of diagrams
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  FileText,
  GitBranch,
  Download,
  Copy,
  Check,
  Loader2,
  ChevronDown,
  Sparkles,
  BarChart3,
  Clock,
  Brain,
  List,
  RefreshCw,
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
import { useSummary, type UseSummaryOptions } from '@/hooks/chat';
import { MermaidBlock } from '../renderers/mermaid-block';
import type { UIMessage } from '@/types/message';
import type { DiagramType, SummaryFormat, SummaryStyle, SummaryTemplate } from '@/types/summary';
import { toast } from 'sonner';

interface ChatSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: UIMessage[];
  sessionTitle?: string;
  useAI?: boolean;
  aiConfig?: {
    provider: string;
    model: string;
    apiKey: string;
    baseURL?: string;
  };
}

const DIAGRAM_TYPES: Array<{ value: DiagramType; label: string; icon: React.ReactNode; description: string }> = [
  { value: 'flowchart', label: 'Flowchart', icon: <GitBranch className="h-4 w-4" />, description: 'Shows conversation flow' },
  { value: 'sequence', label: 'Sequence', icon: <List className="h-4 w-4" />, description: 'Message exchange timeline' },
  { value: 'timeline', label: 'Timeline', icon: <Clock className="h-4 w-4" />, description: 'Gantt-style timeline' },
  { value: 'mindmap', label: 'Mind Map', icon: <Brain className="h-4 w-4" />, description: 'Topics visualization' },
  { value: 'stateDiagram', label: 'State', icon: <BarChart3 className="h-4 w-4" />, description: 'State transitions' },
];

const SUMMARY_FORMATS: Array<{ value: SummaryFormat; label: string }> = [
  { value: 'brief', label: 'Brief' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'bullets', label: 'Bullet Points' },
  { value: 'structured', label: 'Structured' },
];

// Style options for enhanced summaries (used in options UI)
const _SUMMARY_STYLES: Array<{ value: SummaryStyle; label: string; description: string }> = [
  { value: 'professional', label: 'Professional', description: 'Formal, business-appropriate' },
  { value: 'concise', label: 'Concise', description: 'Brief and to-the-point' },
  { value: 'detailed', label: 'Detailed', description: 'Comprehensive coverage' },
  { value: 'academic', label: 'Academic', description: 'Scholarly analysis' },
  { value: 'casual', label: 'Casual', description: 'Informal and easy to read' },
];

// Template presets for different use cases (used in options UI)
const _SUMMARY_TEMPLATES: Array<{ value: SummaryTemplate; label: string; description: string }> = [
  { value: 'default', label: 'Default', description: 'Standard summary' },
  { value: 'meeting', label: 'Meeting Notes', description: 'With action items' },
  { value: 'technical', label: 'Technical', description: 'Code-focused summary' },
  { value: 'learning', label: 'Learning', description: 'Educational content' },
  { value: 'debugging', label: 'Debug Session', description: 'Problem-solving focused' },
];

export function ChatSummaryDialog({
  open,
  onOpenChange,
  messages,
  sessionTitle,
  useAI = false,
  aiConfig,
}: ChatSummaryDialogProps) {
  const t = useTranslations('chatSummary');
  const _tCommon = useTranslations('common');

  // Summary hook
  const {
    isGenerating,
    progress,
    chatSummary,
    diagram,
    error,
    generateChatSummary,
    generateChatDiagram,
    generateChatSummaryWithDiagram,
    exportSummary,
    reset,
  } = useSummary({
    useAI,
    aiConfig: aiConfig as UseSummaryOptions['aiConfig'],
  });

  // Local state
  const [activeTab, setActiveTab] = useState<'summary' | 'diagram'>('summary');
  const [diagramType, setDiagramType] = useState<DiagramType>('flowchart');
  const [summaryFormat, setSummaryFormat] = useState<SummaryFormat>('detailed');
  const [summaryStyle, _setSummaryStyle] = useState<SummaryStyle>('professional');
  const [summaryTemplate, _setSummaryTemplate] = useState<SummaryTemplate>('default');
  const [includeCode, setIncludeCode] = useState(true);
  const [includeToolCalls, setIncludeToolCalls] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [aiKeyPoints, _setAiKeyPoints] = useState(false);
  const [aiTopics, _setAiTopics] = useState(false);

  // Copy hook
  const { copy: copySummary, isCopying: isCopyingSummary } = useCopy({
    toastMessage: t('summaryCopied'),
  });
  const { copy: copyDiagram, isCopying: isCopyingDiagram } = useCopy({
    toastMessage: t('diagramCopied'),
  });

  // Stats
  const stats = useMemo(() => ({
    totalMessages: messages.length,
    userMessages: messages.filter(m => m.role === 'user').length,
    assistantMessages: messages.filter(m => m.role === 'assistant').length,
    hasToolCalls: messages.some(m => m.parts?.some(p => p.type === 'tool-invocation')),
    hasCode: messages.some(m => m.content.includes('```')),
  }), [messages]);

  // Generate summary
  const handleGenerateSummary = useCallback(async () => {
    try {
      await generateChatSummary(messages, {
        format: summaryFormat,
        style: summaryStyle,
        template: summaryTemplate,
        includeCode,
        includeToolCalls,
        aiKeyPoints,
        aiTopics,
      }, sessionTitle);
      toast.success(t('summaryGenerated'));
    } catch (_err) {
      toast.error(t('summaryFailed'));
    }
  }, [messages, summaryFormat, summaryStyle, summaryTemplate, includeCode, includeToolCalls, aiKeyPoints, aiTopics, sessionTitle, generateChatSummary, t]);

  // Generate diagram
  const handleGenerateDiagram = useCallback(() => {
    try {
      generateChatDiagram(messages, {
        type: diagramType,
        expandToolCalls: includeToolCalls,
      });
      toast.success(t('diagramGenerated'));
    } catch (_err) {
      toast.error(t('diagramFailed'));
    }
  }, [messages, diagramType, includeToolCalls, generateChatDiagram, t]);

  // Generate both
  const handleGenerateBoth = useCallback(async () => {
    try {
      await generateChatSummaryWithDiagram(
        messages,
        { format: summaryFormat, includeCode, includeToolCalls },
        { type: diagramType, expandToolCalls: includeToolCalls },
        sessionTitle
      );
      toast.success(t('generationComplete'));
    } catch (_err) {
      toast.error(t('generationFailed'));
    }
  }, [messages, summaryFormat, includeCode, includeToolCalls, diagramType, sessionTitle, generateChatSummaryWithDiagram, t]);

  // Export handlers
  const handleExport = useCallback((format: 'markdown' | 'html' | 'json') => {
    exportSummary({
      format,
      includeDiagram: !!diagram,
      filename: sessionTitle ? `${sessionTitle}-summary` : 'chat-summary',
    });
    toast.success(t('exported', { format: format.toUpperCase() }));
  }, [diagram, sessionTitle, exportSummary, t]);

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
            <FileText className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description', { count: messages.length })}
          </DialogDescription>
        </DialogHeader>

        {/* Stats */}
        <div className="flex flex-wrap gap-2 py-2">
          <Badge variant="outline">
            {stats.totalMessages} {t('messages')}
          </Badge>
          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950">
            👤 {stats.userMessages}
          </Badge>
          <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950">
            🤖 {stats.assistantMessages}
          </Badge>
          {stats.hasToolCalls && (
            <Badge variant="outline" className="bg-green-50 dark:bg-green-950">
              🔧 {t('hasTools')}
            </Badge>
          )}
          {stats.hasCode && (
            <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950">
              💻 {t('hasCode')}
            </Badge>
          )}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('summaryFormat')}</Label>
                <Select value={summaryFormat} onValueChange={(v) => setSummaryFormat(v as SummaryFormat)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUMMARY_FORMATS.map(fmt => (
                      <SelectItem key={fmt.value} value={fmt.value}>
                        {fmt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Switch id="include-code" checked={includeCode} onCheckedChange={setIncludeCode} />
                <Label htmlFor="include-code" className="text-sm">{t('includeCode')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="include-tools" checked={includeToolCalls} onCheckedChange={setIncludeToolCalls} />
                <Label htmlFor="include-tools" className="text-sm">{t('includeToolCalls')}</Label>
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
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'summary' | 'diagram')} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="summary" className="gap-2">
              <FileText className="h-4 w-4" />
              {t('summaryTab')}
            </TabsTrigger>
            <TabsTrigger value="diagram" className="gap-2">
              <GitBranch className="h-4 w-4" />
              {t('diagramTab')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="flex-1 min-h-0 mt-4">
            {chatSummary ? (
              <ScrollArea className="h-[300px] rounded-lg border p-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: formatSummaryAsHtml(chatSummary.summary) }} />
                </div>

                {/* Key Points */}
                {chatSummary.keyPoints.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium mb-2">{t('keyPoints')}</h4>
                    <ul className="space-y-1">
                      {chatSummary.keyPoints.slice(0, 5).map(kp => (
                        <li key={kp.id} className="text-sm flex items-start gap-2">
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {kp.category || 'point'}
                          </Badge>
                          <span className="text-muted-foreground">{kp.content}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Topics */}
                {chatSummary.topics.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium mb-2">{t('topics')}</h4>
                    <div className="flex flex-wrap gap-2">
                      {chatSummary.topics.map(topic => (
                        <Badge key={topic.name} variant="secondary">
                          {topic.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="mt-4 pt-4 border-t flex gap-4 text-xs text-muted-foreground">
                  <span>{t('messagesSummarized', { count: chatSummary.messageCount })}</span>
                  <span>{t('compressionRatio', { ratio: (chatSummary.compressionRatio * 100).toFixed(0) })}</span>
                </div>
              </ScrollArea>
            ) : (
              <div className="h-[300px] flex items-center justify-center border rounded-lg bg-muted/30">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
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

          <TabsContent value="diagram" className="flex-1 min-h-0 mt-4">
            {diagram && diagram.success ? (
              <div className="h-[300px] overflow-auto">
                <MermaidBlock content={diagram.mermaidCode} />
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center border rounded-lg bg-muted/30">
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
                          generateChatDiagram(messages, { type: type.value });
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
        </Tabs>

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <div className="flex gap-2">
            {/* Copy buttons */}
            {chatSummary && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => copySummary(chatSummary.summary)}
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
            {/* Export dropdown */}
            {(chatSummary || diagram) && (
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

            {/* Generate buttons */}
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

/**
 * Format summary text as HTML for rendering
 */
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

export default ChatSummaryDialog;
