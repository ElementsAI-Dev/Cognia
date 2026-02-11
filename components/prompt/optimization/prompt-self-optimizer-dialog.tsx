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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePromptOptimizer } from '@/hooks/ai/use-prompt-optimizer';
import {
  suggestBestPractices,
  quickAnalyze,
  compareOptimization,
  type OptimizationComparison,
} from '@/lib/ai/prompts/prompt-self-optimizer';
import type { PromptTemplate } from '@/types/content/prompt-template';
import { AnalyzeTab, SuggestionsTab, CompareTab } from './sections';
import {
  Sparkles,
  BarChart3,
  Lightbulb,
  GitCompare,
} from 'lucide-react';

interface PromptSelfOptimizerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: PromptTemplate;
  onApply: (optimizedContent: string, suggestions: string[]) => void;
}

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
            <AnalyzeTab
              templateContent={template.content}
              quickAnalysisResult={quickAnalysisResult}
              analysisResult={analysisResult}
              bestPracticeSuggestions={bestPracticeSuggestions}
              useIterative={useIterative}
              isAnalyzing={isAnalyzing}
              error={error}
              onUseIterativeChange={setUseIterative}
              onAnalyze={handleAnalyze}
            />
          </TabsContent>
          
          {/* Suggestions Tab */}
          <TabsContent value="suggestions" className="flex-1 min-h-0 mt-4">
            <SuggestionsTab
              allSuggestions={allSuggestions}
              selectedSuggestions={selectedSuggestions}
              isOptimizing={isOptimizing}
              onToggleSuggestion={handleToggleSuggestion}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onOptimize={handleOptimize}
              onBack={() => setActiveTab('analyze')}
            />
          </TabsContent>
          
          {/* Compare Tab */}
          <TabsContent value="compare" className="flex-1 min-h-0 mt-4">
            <CompareTab
              templateContent={template.content}
              optimizedContent={optimizedContent}
              comparison={comparison}
              selectedSuggestions={selectedSuggestions}
              allSuggestions={allSuggestions}
              showDiff={showDiff}
              copied={copied}
              onOptimizedContentChange={setOptimizedContent}
              onShowDiffToggle={() => setShowDiff(!showDiff)}
              onCopy={handleCopy}
              onReset={handleReset}
              onBack={() => setActiveTab('suggestions')}
              onApply={handleApply}
            />
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
