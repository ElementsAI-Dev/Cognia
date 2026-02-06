'use client';

/**
 * PromptOptimizationHub - Unified entry point for all prompt optimization features
 * Combines analysis, optimization, feedback, A/B testing, and analytics in a tabbed interface
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader } from '@/components/ai-elements/loader';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { usePromptOptimizer } from '@/hooks/ai/use-prompt-optimizer';
import { useMcpStore } from '@/stores/mcp/mcp-store';
import {
  optimizePromptViaMcp,
  findAceToolServer,
  isAceToolReady,
} from '@/lib/ai/prompts/mcp-prompt-optimizer';
import { PromptSelfOptimizerDialog } from './prompt-self-optimizer-dialog';
import { PromptFeedbackDialog } from './prompt-feedback-dialog';
import { PromptABTestPanel } from './prompt-ab-test-panel';
import { PromptAnalyticsPanel } from './prompt-analytics-panel';
import type { PromptTemplate } from '@/types/content/prompt-template';
import {
  Sparkles,
  Wand2,
  MessageSquare,
  FlaskConical,
  BarChart3,
  Settings2,
  ChevronRight,
  Globe,
  CircleDot,
} from 'lucide-react';

interface PromptOptimizationHubProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: PromptTemplate;
  onTemplateUpdate?: (content: string, suggestions?: string[]) => void;
}

type TabValue = 'optimize' | 'feedback' | 'abtest' | 'analytics';

interface QuickAction {
  id: TabValue;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
}

export function PromptOptimizationHub({
  open,
  onOpenChange,
  template,
  onTemplateUpdate,
}: PromptOptimizationHubProps) {
  const t = useTranslations('promptOptimizationHub');
  
  const [activeTab, setActiveTab] = useState<TabValue>('optimize');
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isMcpOptimizing, setIsMcpOptimizing] = useState(false);
  const [mcpError, setMcpError] = useState<string | null>(null);
  
  // MCP store
  const mcpServers = useMcpStore((state) => state.servers);
  const mcpCallTool = useMcpStore((state) => state.callTool);
  const aceServer = useMemo(() => findAceToolServer(mcpServers), [mcpServers]);
  const aceToolReady = useMemo(() => aceServer ? isAceToolReady(aceServer) : false, [aceServer]);

  const {
    feedback,
    activeABTest,
    submitFeedback,
  } = usePromptOptimizer({ templateId: template.id });
  
  const handleApplyOptimization = useCallback((content: string, suggestions: string[]) => {
    onTemplateUpdate?.(content, suggestions);
  }, [onTemplateUpdate]);

  // MCP optimization for template content
  const handleMcpOptimizeTemplate = useCallback(async () => {
    if (!template.content?.trim()) return;
    setIsMcpOptimizing(true);
    setMcpError(null);
    try {
      const mcpResult = await optimizePromptViaMcp(
        { prompt: template.content, conversationHistory: '' },
        mcpCallTool,
        mcpServers
      );
      if (mcpResult.success && mcpResult.optimizedPrompt) {
        onTemplateUpdate?.(mcpResult.optimizedPrompt.optimized, mcpResult.optimizedPrompt.improvements);
        toast.success(t('mcpOptimizeSuccess'));
      } else {
        setMcpError(mcpResult.error || 'MCP optimization failed');
      }
    } catch (err) {
      setMcpError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsMcpOptimizing(false);
    }
  }, [template.content, mcpCallTool, mcpServers, onTemplateUpdate, t]);
  
  const handleFeedbackSubmit = useCallback((feedbackData: Parameters<typeof submitFeedback>[0]) => {
    submitFeedback(feedbackData);
  }, [submitFeedback]);
  
  const handleABTestComplete = useCallback((winner: 'A' | 'B' | 'none', content: string) => {
    if (winner !== 'none') {
      onTemplateUpdate?.(content);
    }
  }, [onTemplateUpdate]);
  
  const quickActions: QuickAction[] = [
    {
      id: 'optimize',
      icon: <Wand2 className="h-5 w-5" />,
      title: t('actions.optimize.title'),
      description: t('actions.optimize.description'),
    },
    {
      id: 'feedback',
      icon: <MessageSquare className="h-5 w-5" />,
      title: t('actions.feedback.title'),
      description: t('actions.feedback.description'),
      badge: feedback.length > 0 ? `${feedback.length}` : undefined,
    },
    {
      id: 'abtest',
      icon: <FlaskConical className="h-5 w-5" />,
      title: t('actions.abtest.title'),
      description: t('actions.abtest.description'),
      badge: activeABTest ? t('running') : undefined,
    },
    {
      id: 'analytics',
      icon: <BarChart3 className="h-5 w-5" />,
      title: t('actions.analytics.title'),
      description: t('actions.analytics.description'),
    },
  ];
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t('title')}
            </DialogTitle>
            <DialogDescription>
              {t('description', { name: template.name })}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="optimize" className="gap-2">
                <Wand2 className="h-4 w-4" />
                <span className="hidden sm:inline">{t('tabs.optimize')}</span>
              </TabsTrigger>
              <TabsTrigger value="feedback" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">{t('tabs.feedback')}</span>
                {feedback.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {feedback.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="abtest" className="gap-2">
                <FlaskConical className="h-4 w-4" />
                <span className="hidden sm:inline">{t('tabs.abtest')}</span>
                {activeABTest && (
                  <Badge variant="default" className="ml-1 h-5 px-1.5 animate-pulse">
                    •
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">{t('tabs.analytics')}</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Quick Actions Overview */}
            <TabsContent value="optimize" className="flex-1 min-h-0 mt-4">
              <ScrollArea className="h-[450px]">
                <div className="space-y-4 pr-4">
                  {/* Quick Actions Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {quickActions.map((action) => (
                      <button
                        key={action.id}
                        onClick={() => {
                          if (action.id === 'optimize') {
                            setShowOptimizer(true);
                          } else if (action.id === 'feedback') {
                            setShowFeedback(true);
                          } else {
                            setActiveTab(action.id);
                          }
                        }}
                        className={cn(
                          'flex items-start gap-3 rounded-lg border p-4 text-left transition-all hover:bg-accent hover:border-primary/50',
                          action.id === activeTab && 'border-primary bg-primary/5'
                        )}
                      >
                        <div className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg',
                          action.id === 'optimize' && 'bg-purple-500/10 text-purple-600',
                          action.id === 'feedback' && 'bg-blue-500/10 text-blue-600',
                          action.id === 'abtest' && 'bg-green-500/10 text-green-600',
                          action.id === 'analytics' && 'bg-orange-500/10 text-orange-600'
                        )}>
                          {action.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{action.title}</h4>
                            {action.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {action.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {action.description}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground mt-2" />
                      </button>
                    ))}
                  </div>
                  
                  {/* MCP Quick Optimize */}
                  {aceServer && (
                    <div className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <h4 className="font-medium">{t('mcpQuickOptimize')}</h4>
                          <CircleDot
                            className={cn(
                              'h-3 w-3',
                              aceToolReady ? 'text-green-500' : 'text-amber-500'
                            )}
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={handleMcpOptimizeTemplate}
                          disabled={isMcpOptimizing || !aceToolReady || !template.content?.trim()}
                          className="gap-2"
                        >
                          {isMcpOptimizing ? (
                            <Loader size={14} />
                          ) : (
                            <Wand2 className="h-3.5 w-3.5" />
                          )}
                          {t('mcpOptimize')}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">{t('mcpQuickOptimizeDesc')}</p>
                      {mcpError && (
                        <Alert variant="destructive" className="py-2">
                          <AlertDescription className="text-xs">{mcpError}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {/* Template Info */}
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium flex items-center gap-2">
                        <Settings2 className="h-4 w-4" />
                        {t('templateInfo')}
                      </h4>
                      <Badge variant="outline">{template.category || 'custom'}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><strong>{t('name')}:</strong> {template.name}</p>
                      {template.description && (
                        <p><strong>{t('descriptionLabel')}:</strong> {template.description}</p>
                      )}
                      <p><strong>{t('usageCount')}:</strong> {template.usageCount}</p>
                      {template.variables.length > 0 && (
                        <p><strong>{t('variables')}:</strong> {template.variables.map(v => `{{${v.name}}}`).join(', ')}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Current Content Preview */}
                  <div className="rounded-lg border p-4 space-y-2">
                    <h4 className="font-medium">{t('currentContent')}</h4>
                    <div className="rounded bg-muted/50 p-3 text-sm max-h-40 overflow-auto whitespace-pre-wrap">
                      {template.content || <span className="text-muted-foreground italic">{t('noContent')}</span>}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
            
            {/* Feedback Tab */}
            <TabsContent value="feedback" className="flex-1 min-h-0 mt-4">
              <ScrollArea className="h-[450px]">
                <div className="space-y-4 pr-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{t('feedbackHistory')}</h3>
                    <Button onClick={() => setShowFeedback(true)} size="sm">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {t('submitFeedback')}
                    </Button>
                  </div>
                  
                  {feedback.length === 0 ? (
                    <Empty className="py-12">
                      <EmptyMedia variant="icon">
                        <MessageSquare className="h-6 w-6" />
                      </EmptyMedia>
                      <EmptyTitle>{t('noFeedback')}</EmptyTitle>
                      <EmptyDescription>{t('startCollecting')}</EmptyDescription>
                    </Empty>
                  ) : (
                    <div className="space-y-2">
                      {feedback.slice().reverse().map((fb) => (
                        <div key={fb.id} className="rounded-lg border p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant={fb.effectiveness === 'excellent' ? 'default' : 'secondary'}>
                                {fb.rating}/5
                              </Badge>
                              <Badge variant="outline">{fb.effectiveness}</Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(fb.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {fb.comment && (
                            <p className="text-sm text-muted-foreground">{fb.comment}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            {/* A/B Test Tab */}
            <TabsContent value="abtest" className="flex-1 min-h-0 mt-4">
              <ScrollArea className="h-[450px]">
                <div className="pr-4">
                  <PromptABTestPanel
                    template={template}
                    onTestComplete={handleABTestComplete}
                  />
                </div>
              </ScrollArea>
            </TabsContent>
            
            {/* Analytics Tab */}
            <TabsContent value="analytics" className="flex-1 min-h-0 mt-4">
              <ScrollArea className="h-[450px]">
                <div className="pr-4">
                  <PromptAnalyticsPanel template={template} />
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {/* Optimizer Dialog */}
      {showOptimizer && (
        <PromptSelfOptimizerDialog
          open={showOptimizer}
          onOpenChange={setShowOptimizer}
          template={template}
          onApply={handleApplyOptimization}
        />
      )}
      
      {/* Feedback Dialog */}
      {showFeedback && (
        <PromptFeedbackDialog
          open={showFeedback}
          onOpenChange={setShowFeedback}
          templateId={template.id}
          templateName={template.name}
          onSubmit={handleFeedbackSubmit}
        />
      )}
    </>
  );
}

export default PromptOptimizationHub;
