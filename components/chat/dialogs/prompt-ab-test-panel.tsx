'use client';

/**
 * PromptABTestPanel - Panel for managing A/B tests on prompt templates
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { usePromptOptimizer } from '@/hooks/ai/use-prompt-optimizer';
import { generateABTestVariant } from '@/lib/ai/generation/prompt-self-optimizer';
import { Loader } from '@/components/ai-elements/loader';
import type { PromptTemplate, PromptABTest } from '@/types/content/prompt-template';
import {
  FlaskConical,
  Play,
  Pause,
  CheckCircle2,
  Trophy,
  GitBranch,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface PromptABTestPanelProps {
  template: PromptTemplate;
  onTestComplete?: (winner: 'A' | 'B' | 'none', winningContent: string) => void;
}

export function PromptABTestPanel({
  template,
  onTestComplete,
}: PromptABTestPanelProps) {
  const t = useTranslations('promptABTest');
  
  const {
    activeABTest,
    startABTest,
    completeABTest,
    getConfig,
  } = usePromptOptimizer({ templateId: template.id });
  
  // State
  const [hypothesis, setHypothesis] = useState('');
  const [variantContent, setVariantContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Generate variant using AI
  const handleGenerateVariant = useCallback(async () => {
    if (!hypothesis.trim()) {
      setError(t('enterHypothesis'));
      return;
    }
    
    const config = getConfig();
    if (!config) {
      setError(t('noApiKey'));
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const result = await generateABTestVariant(template, config, hypothesis);
      if (result.success && result.variantContent) {
        setVariantContent(result.variantContent);
      } else {
        setError(result.error || t('generateFailed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('generateFailed'));
    } finally {
      setIsGenerating(false);
    }
  }, [hypothesis, template, getConfig, t]);
  
  // Start A/B test
  const handleStartTest = useCallback(() => {
    if (!variantContent.trim() || !hypothesis.trim()) {
      setError(t('fillAllFields'));
      return;
    }
    
    const test = startABTest(variantContent, hypothesis);
    if (test) {
      setHypothesis('');
      setVariantContent('');
      setError(null);
    }
  }, [variantContent, hypothesis, startABTest, t]);
  
  // Complete test
  const handleCompleteTest = useCallback(() => {
    const result = completeABTest();
    if (result) {
      const winner = result.winner || 'none';
      const winningContent = winner === 'A' 
        ? result.variantA.content 
        : winner === 'B'
        ? result.variantB.content
        : result.variantA.content;
      onTestComplete?.(winner, winningContent);
    }
  }, [completeABTest, onTestComplete]);
  
  // Render active test
  const renderActiveTest = (test: PromptABTest) => {
    const totalUses = test.variantA.uses + test.variantB.uses;
    const progressPercent = Math.min((totalUses / test.minSampleSize) * 100, 100);
    const canComplete = test.variantA.uses >= test.minSampleSize && test.variantB.uses >= test.minSampleSize;
    
    return (
      <div className="space-y-4">
        {/* Test Status */}
        <div className="flex items-center justify-between">
          <Badge 
            variant={test.status === 'running' ? 'default' : 'secondary'}
            className="gap-1"
          >
            {test.status === 'running' ? (
              <><Play className="h-3 w-3" /> {t('running')}</>
            ) : test.status === 'completed' ? (
              <><CheckCircle2 className="h-3 w-3" /> {t('completed')}</>
            ) : (
              <><Pause className="h-3 w-3" /> {t('paused')}</>
            )}
          </Badge>
          
          {test.status === 'running' && canComplete && (
            <Button size="sm" variant="outline" onClick={handleCompleteTest}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {t('completeTest')}
            </Button>
          )}
        </div>
        
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('progress')}</span>
            <span>{totalUses} / {test.minSampleSize * 2} {t('samples')}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
        
        {/* Variants Comparison */}
        <div className="grid grid-cols-2 gap-4">
          {/* Variant A */}
          <Card className={cn(
            test.winner === 'A' && 'border-green-500 bg-green-500/5'
          )}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                {t('variantA')} ({t('original')})
                {test.winner === 'A' && <Trophy className="h-4 w-4 text-yellow-500" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs text-muted-foreground line-clamp-3">
                {test.variantA.content.slice(0, 150)}...
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('uses')}:</span>
                  <span className="ml-1 font-medium">{test.variantA.uses}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('successRate')}:</span>
                  <span className="ml-1 font-medium">{(test.variantA.successRate * 100).toFixed(1)}%</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">{t('avgRating')}:</span>
                  <span className="ml-1 font-medium">{test.variantA.averageRating.toFixed(2)}/5</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Variant B */}
          <Card className={cn(
            test.winner === 'B' && 'border-green-500 bg-green-500/5'
          )}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                {t('variantB')} ({t('optimized')})
                {test.winner === 'B' && <Trophy className="h-4 w-4 text-yellow-500" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs text-muted-foreground line-clamp-3">
                {test.variantB.content.slice(0, 150)}...
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('uses')}:</span>
                  <span className="ml-1 font-medium">{test.variantB.uses}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('successRate')}:</span>
                  <span className="ml-1 font-medium">{(test.variantB.successRate * 100).toFixed(1)}%</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">{t('avgRating')}:</span>
                  <span className="ml-1 font-medium">{test.variantB.averageRating.toFixed(2)}/5</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Winner Announcement */}
        {test.status === 'completed' && test.winner && (
          <Card className="bg-gradient-to-r from-yellow-500/10 to-green-500/10 border-yellow-500/30">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Trophy className="h-8 w-8 text-yellow-500" />
                <div>
                  <h4 className="font-semibold">
                    {test.winner === 'none' 
                      ? t('noSignificantDifference')
                      : t('winnerAnnounced', { variant: test.winner })
                    }
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {test.winner !== 'none' && t('considerApplying')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };
  
  // Render new test form
  const renderNewTestForm = () => (
    <div className="space-y-4">
      {/* Hypothesis */}
      <div className="space-y-2">
        <Label htmlFor="hypothesis">{t('hypothesis')}</Label>
        <Input
          id="hypothesis"
          value={hypothesis}
          onChange={(e) => setHypothesis(e.target.value)}
          placeholder={t('hypothesisPlaceholder')}
        />
        <p className="text-xs text-muted-foreground">
          {t('hypothesisHint')}
        </p>
      </div>
      
      {/* Generate Button */}
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={handleGenerateVariant}
        disabled={isGenerating || !hypothesis.trim()}
      >
        {isGenerating ? (
          <>
            <Loader size={16} />
            {t('generating')}
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            {t('generateVariant')}
          </>
        )}
      </Button>
      
      {/* Variant Content */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="variant">{t('variantContent')}</Label>
          {variantContent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVariantContent('')}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              {t('clear')}
            </Button>
          )}
        </div>
        <Textarea
          id="variant"
          value={variantContent}
          onChange={(e) => setVariantContent(e.target.value)}
          placeholder={t('variantPlaceholder')}
          className="min-h-[120px]"
        />
      </div>
      
      {/* Original for Reference */}
      <div className="space-y-2">
        <Label className="text-muted-foreground">{t('originalReference')}</Label>
        <div className="rounded-lg border bg-muted/30 p-3 text-sm max-h-24 overflow-auto">
          {template.content}
        </div>
      </div>
      
      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      
      {/* Start Test Button */}
      <Button
        className="w-full gap-2"
        onClick={handleStartTest}
        disabled={!variantContent.trim() || !hypothesis.trim()}
      >
        <FlaskConical className="h-4 w-4" />
        {t('startTest')}
      </Button>
    </div>
  );
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[500px]">
          {activeABTest ? renderActiveTest(activeABTest) : renderNewTestForm()}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default PromptABTestPanel;
