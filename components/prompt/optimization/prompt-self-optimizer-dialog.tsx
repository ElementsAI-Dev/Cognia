'use client';

/**
 * PromptSelfOptimizerDialog - Advanced prompt optimization dialog with AI analysis,
 * iterative optimization, suggestions management, and comparison view
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader } from '@/components/ai-elements/loader';
import { cn } from '@/lib/utils';
import { usePromptOptimizer } from '@/hooks/ai/use-prompt-optimizer';
import {
  suggestBestPractices,
  quickAnalyze,
  compareOptimization,
  type OptimizationComparison,
} from '@/lib/ai/prompts/prompt-self-optimizer';
import type { PromptTemplate } from '@/types/content/prompt-template';
import {
  Sparkles,
  Wand2,
  Check,
  Copy,
  ArrowRight,
  RefreshCw,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Brain,
  BarChart3,
  GitCompare,
  ListChecks,
  Eye,
  EyeOff,
} from 'lucide-react';

interface PromptSelfOptimizerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: PromptTemplate;
  onApply: (optimizedContent: string, suggestions: string[]) => void;
}

const PRIORITY_COLORS = {
  high: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  structure: <ListChecks className="h-3.5 w-3.5" />,
  clarity: <Eye className="h-3.5 w-3.5" />,
  specificity: <Zap className="h-3.5 w-3.5" />,
  context: <Brain className="h-3.5 w-3.5" />,
  formatting: <BarChart3 className="h-3.5 w-3.5" />,
  variables: <GitCompare className="h-3.5 w-3.5" />,
  examples: <Lightbulb className="h-3.5 w-3.5" />,
  constraints: <AlertTriangle className="h-3.5 w-3.5" />,
};

export function PromptSelfOptimizerDialog({
  open,
  onOpenChange,
  template,
  onApply,
}: PromptSelfOptimizerDialogProps) {
  const t = useTranslations('promptSelfOptimizer');
  const tCommon = useTranslations('common');
  
  // Hook integration
  const {
    isAnalyzing,
    isOptimizing,
    analysisResult,
    suggestions,
    error,
    analyze,
    optimize,
    reset,
    getConfig,
  } = usePromptOptimizer({ templateId: template.id });
  
  // Local state
  const [activeTab, setActiveTab] = useState<'analyze' | 'suggestions' | 'compare'>('analyze');
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [optimizedContent, setOptimizedContent] = useState<string>('');
  const [showDiff, setShowDiff] = useState(true);
  const [copied, setCopied] = useState(false);
  const [useIterative, setUseIterative] = useState(false);
  
  // Quick analysis (rule-based, instant)
  const quickAnalysisResult = useMemo(() => 
    quickAnalyze(template.content),
    [template.content]
  );
  
  // Best practice suggestions (rule-based, instant)
  const bestPracticeSuggestions = useMemo(() => 
    suggestBestPractices(template.content),
    [template.content]
  );
  
  // Combined suggestions
  const allSuggestions = useMemo(() => {
    const aiSuggestions = suggestions || [];
    const combined = [...aiSuggestions];
    
    // Add best practice suggestions that aren't already covered
    bestPracticeSuggestions.forEach(bp => {
      if (!combined.some(s => s.type === bp.type && s.category === 'best-practice')) {
        combined.push(bp);
      }
    });
    
    return combined.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [suggestions, bestPracticeSuggestions]);
  
  // Comparison data
  const comparison = useMemo((): OptimizationComparison[] | null => {
    if (!analysisResult?.analysis || !optimizedContent) return null;
    
    const optimizedAnalysis = quickAnalyze(optimizedContent);
    return compareOptimization(quickAnalysisResult, optimizedAnalysis);
  }, [analysisResult, optimizedContent, quickAnalysisResult]);
  
  // Handlers
  const handleAnalyze = useCallback(async () => {
    const config = getConfig();
    if (!config) {
      return;
    }
    
    const result = await analyze(template);
    if (result?.success) {
      // Auto-select high priority suggestions after analysis
      const highPriority = result.suggestions
        .filter(s => s.priority === 'high')
        .map(s => s.id);
      setSelectedSuggestions(new Set(highPriority));
      setActiveTab('suggestions');
    }
  }, [analyze, template, getConfig]);
  
  const handleOptimize = useCallback(async () => {
    const selected = allSuggestions.filter(s => selectedSuggestions.has(s.id));
    if (selected.length === 0) return;
    
    const result = await optimize(selected);
    if (result?.success && result.optimizedContent) {
      setOptimizedContent(result.optimizedContent);
      setActiveTab('compare');
    }
  }, [optimize, allSuggestions, selectedSuggestions]);
  
  const handleToggleSuggestion = useCallback((id: string) => {
    setSelectedSuggestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);
  
  const handleSelectAll = useCallback(() => {
    setSelectedSuggestions(new Set(allSuggestions.map(s => s.id)));
  }, [allSuggestions]);
  
  const handleDeselectAll = useCallback(() => {
    setSelectedSuggestions(new Set());
  }, []);
  
  const handleApply = useCallback(() => {
    if (optimizedContent) {
      const appliedSuggestions = allSuggestions
        .filter(s => selectedSuggestions.has(s.id))
        .map(s => s.description);
      onApply(optimizedContent, appliedSuggestions);
      onOpenChange(false);
    }
  }, [optimizedContent, allSuggestions, selectedSuggestions, onApply, onOpenChange]);
  
  const handleCopy = useCallback(async () => {
    if (optimizedContent) {
      await navigator.clipboard.writeText(optimizedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [optimizedContent]);
  
  const handleReset = useCallback(() => {
    reset();
    setOptimizedContent('');
    setSelectedSuggestions(new Set());
    setActiveTab('analyze');
  }, [reset]);
  
  // Render score badge
  const renderScoreBadge = (score: number, label: string) => {
    const color = score >= 75 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600';
    const bgColor = score >= 75 ? 'bg-green-500/10' : score >= 50 ? 'bg-yellow-500/10' : 'bg-red-500/10';
    
    return (
      <div className={cn('flex items-center gap-2 rounded-lg px-3 py-2', bgColor)}>
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={cn('font-semibold', color)}>{score}</span>
      </div>
    );
  };
  
  // Render comparison metric
  const renderComparisonMetric = (comp: OptimizationComparison) => {
    const isPositive = comp.improvement > 0;
    const isNegative = comp.improvement < 0;
    const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
    const color = isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-muted-foreground';
    
    return (
      <div key={comp.metric} className="flex items-center justify-between py-2">
        <span className="text-sm capitalize">{comp.metric.replace(/([A-Z])/g, ' $1').trim()}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{comp.original}</span>
          <Icon className={cn('h-4 w-4', color)} />
          <span className={cn('text-sm font-medium', color)}>{comp.optimized}</span>
          {comp.improvementPercent !== 0 && (
            <Badge variant="outline" className={cn('text-xs', color)}>
              {comp.improvementPercent > 0 ? '+' : ''}{comp.improvementPercent}%
            </Badge>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analyze" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('analyze')}
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="gap-2" disabled={allSuggestions.length === 0 && !analysisResult}>
              <Lightbulb className="h-4 w-4" />
              {t('suggestions')}
              {allSuggestions.length > 0 && (
                <Badge variant="secondary" className="ml-1">{allSuggestions.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="compare" className="gap-2" disabled={!optimizedContent}>
              <GitCompare className="h-4 w-4" />
              {t('compare')}
            </TabsTrigger>
          </TabsList>
          
          {/* Analyze Tab */}
          <TabsContent value="analyze" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {/* Original Prompt */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t('originalPrompt')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border bg-muted/50 p-3 text-sm max-h-32 overflow-auto">
                      {template.content || <span className="text-muted-foreground italic">{t('noContent')}</span>}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Quick Analysis Scores */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      {t('quickAnalysis')}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {t('quickAnalysisDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-2">
                      {renderScoreBadge(quickAnalysisResult.clarity, t('clarity'))}
                      {renderScoreBadge(quickAnalysisResult.specificity, t('specificity'))}
                      {renderScoreBadge(quickAnalysisResult.structureQuality, t('structure'))}
                      {renderScoreBadge(quickAnalysisResult.overallScore, t('overall'))}
                    </div>
                  </CardContent>
                </Card>
                
                {/* AI Analysis */}
                {analysisResult && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        {t('aiAnalysis')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-2">
                        {renderScoreBadge(analysisResult.analysis.clarity, t('clarity'))}
                        {renderScoreBadge(analysisResult.analysis.specificity, t('specificity'))}
                        {renderScoreBadge(analysisResult.analysis.structureQuality, t('structure'))}
                        {renderScoreBadge(analysisResult.analysis.overallScore, t('overall'))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Best Practice Hints */}
                {bestPracticeSuggestions.length > 0 && !analysisResult && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        {t('bestPractices')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {bestPracticeSuggestions.slice(0, 3).map((suggestion) => (
                          <div 
                            key={suggestion.id}
                            className="flex items-start gap-2 text-sm text-muted-foreground"
                          >
                            <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                            <span>{suggestion.description}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Options */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t('options')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="iterative"
                        checked={useIterative}
                        onCheckedChange={setUseIterative}
                      />
                      <Label htmlFor="iterative" className="text-sm">
                        {t('useIterative')}
                      </Label>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Error Display */}
                {error && (
                  <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <div className="mt-4 flex justify-end">
              <Button onClick={handleAnalyze} disabled={isAnalyzing} className="gap-2">
                {isAnalyzing ? (
                  <>
                    <Loader size={16} />
                    {t('analyzing')}
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4" />
                    {t('runAnalysis')}
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
          
          {/* Suggestions Tab */}
          <TabsContent value="suggestions" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {/* Selection Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleSelectAll}>
                      {t('selectAll')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                      {t('deselectAll')}
                    </Button>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {selectedSuggestions.size} / {allSuggestions.length} {t('selected')}
                  </span>
                </div>
                
                <Separator />
                
                {/* Suggestions List */}
                <div className="space-y-2">
                  {allSuggestions.map((suggestion) => (
                    <Card 
                      key={suggestion.id}
                      className={cn(
                        'cursor-pointer transition-all hover:border-primary/50',
                        selectedSuggestions.has(suggestion.id) && 'border-primary bg-primary/5'
                      )}
                      onClick={() => handleToggleSuggestion(suggestion.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedSuggestions.has(suggestion.id)}
                            onCheckedChange={() => handleToggleSuggestion(suggestion.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={cn('text-xs', PRIORITY_COLORS[suggestion.priority])}>
                                {suggestion.priority}
                              </Badge>
                              <Badge variant="secondary" className="text-xs gap-1">
                                {TYPE_ICONS[suggestion.type]}
                                {suggestion.type}
                              </Badge>
                              {suggestion.confidence && (
                                <span className="text-xs text-muted-foreground">
                                  {Math.round(suggestion.confidence * 100)}% confidence
                                </span>
                              )}
                            </div>
                            <p className="text-sm">{suggestion.description}</p>
                            {suggestion.suggestedText && (
                              <div className="mt-2 rounded bg-muted/50 p-2 text-xs font-mono">
                                {suggestion.suggestedText}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {allSuggestions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>{t('noSuggestions')}</p>
                      <p className="text-sm">{t('runAnalysisFirst')}</p>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
            
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActiveTab('analyze')}>
                {tCommon('back')}
              </Button>
              <Button 
                onClick={handleOptimize} 
                disabled={isOptimizing || selectedSuggestions.size === 0}
                className="gap-2"
              >
                {isOptimizing ? (
                  <>
                    <Loader size={16} />
                    {t('optimizing')}
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    {t('optimize')}
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
          
          {/* Compare Tab */}
          <TabsContent value="compare" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {/* Comparison Metrics */}
                {comparison && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        {t('improvements')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="divide-y">
                        {comparison.map(renderComparisonMetric)}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Toggle View */}
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{t('optimizedPrompt')}</Label>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowDiff(!showDiff)}
                      className="gap-1"
                    >
                      {showDiff ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showDiff ? t('hideOriginal') : t('showOriginal')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleCopy}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                {/* Content Comparison */}
                <div className={cn('grid gap-4', showDiff && 'grid-cols-2')}>
                  {showDiff && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">{t('original')}</Label>
                      <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap max-h-64 overflow-auto">
                        {template.content}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    {showDiff && <Label className="text-xs text-muted-foreground">{t('optimized')}</Label>}
                    <Textarea
                      value={optimizedContent}
                      onChange={(e) => setOptimizedContent(e.target.value)}
                      className="min-h-64 font-mono text-sm"
                    />
                  </div>
                </div>
                
                {/* Applied Suggestions */}
                {selectedSuggestions.size > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{t('appliedSuggestions')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1">
                        {allSuggestions
                          .filter(s => selectedSuggestions.has(s.id))
                          .map(s => (
                            <Badge key={s.id} variant="secondary" className="text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {s.type}
                            </Badge>
                          ))
                        }
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
            
            <div className="mt-4 flex justify-between">
              <Button variant="outline" onClick={handleReset}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('startOver')}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setActiveTab('suggestions')}>
                  {tCommon('back')}
                </Button>
                <Button onClick={handleApply} disabled={!optimizedContent} className="gap-2">
                  <ArrowRight className="h-4 w-4" />
                  {t('apply')}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="border-t pt-4 mt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PromptSelfOptimizerDialog;
