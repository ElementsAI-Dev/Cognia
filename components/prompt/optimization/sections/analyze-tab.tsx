'use client';

import { useTranslations } from 'next-intl';
import {
  Zap,
  Brain,
  Lightbulb,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader } from '@/components/ai-elements/loader';
import { cn } from '@/lib/utils';

interface QuickAnalysis {
  clarity: number;
  specificity: number;
  structureQuality: number;
  overallScore: number;
}

interface AnalysisResult {
  analysis: QuickAnalysis;
}

interface Suggestion {
  id: string;
  description: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
}

interface AnalyzeTabProps {
  templateContent: string;
  quickAnalysisResult: QuickAnalysis;
  analysisResult: AnalysisResult | null;
  bestPracticeSuggestions: Suggestion[];
  useIterative: boolean;
  isAnalyzing: boolean;
  error: string | null;
  onUseIterativeChange: (value: boolean) => void;
  onAnalyze: () => void;
}

function renderScoreBadge(score: number, label: string) {
  const color = score >= 75 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600';
  const bgColor = score >= 75 ? 'bg-green-500/10' : score >= 50 ? 'bg-yellow-500/10' : 'bg-red-500/10';

  return (
    <div className={cn('flex items-center gap-2 rounded-lg px-3 py-2', bgColor)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('font-semibold', color)}>{score}</span>
    </div>
  );
}

export function AnalyzeTab({
  templateContent,
  quickAnalysisResult,
  analysisResult,
  bestPracticeSuggestions,
  useIterative,
  isAnalyzing,
  error,
  onUseIterativeChange,
  onAnalyze,
}: AnalyzeTabProps) {
  const t = useTranslations('promptSelfOptimizer');

  return (
    <>
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-4">
          {/* Original Prompt */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('originalPrompt')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-muted/50 p-3 text-sm max-h-32 overflow-auto">
                {templateContent || <span className="text-muted-foreground italic">{t('noContent')}</span>}
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
                  onCheckedChange={onUseIterativeChange}
                />
                <Label htmlFor="iterative" className="text-sm">
                  {t('useIterative')}
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </ScrollArea>

      <div className="mt-4 flex justify-end">
        <Button onClick={onAnalyze} disabled={isAnalyzing} className="gap-2">
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
    </>
  );
}
