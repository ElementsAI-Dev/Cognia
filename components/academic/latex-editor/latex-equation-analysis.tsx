'use client';

/**
 * LaTeX Equation Analysis Panel - Analyze, verify, and simplify equations
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
  Calculator,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';
import {
  analyzeEquation,
  verifyEquation,
  expandEquation,
  simplifyEquation,
  type EquationAnalysis,
  type EquationVerificationResult,
  type SimplificationResult,
  type ExpansionResult,
  type EquationIssue,
} from '@/lib/latex';
import { cn } from '@/lib/utils';

export interface LatexEquationAnalysisProps {
  equation?: string;
  onInsert?: (latex: string) => void;
  className?: string;
}

export function LatexEquationAnalysis({
  equation: initialEquation = '',
  onInsert,
  className,
}: LatexEquationAnalysisProps) {
  const t = useTranslations('latex');
  const [equation, setEquation] = useState(initialEquation);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<EquationAnalysis | null>(null);
  const [verification, setVerification] = useState<EquationVerificationResult | null>(null);
  const [simplification, setSimplification] = useState<SimplificationResult | null>(null);
  const [expansion, setExpansion] = useState<ExpansionResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!equation.trim()) return;

    setIsAnalyzing(true);
    try {
      const [analysisResult, verificationResult] = await Promise.all([
        Promise.resolve(analyzeEquation(equation)),
        Promise.resolve(verifyEquation(equation)),
      ]);

      setAnalysis(analysisResult);
      setVerification(verificationResult);
      setSimplification(null);
      setExpansion(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, [equation]);

  const handleSimplify = useCallback(async () => {
    if (!equation.trim()) return;

    setIsAnalyzing(true);
    try {
      const result = await Promise.resolve(simplifyEquation(equation));
      setSimplification(result);
    } finally {
      setIsAnalyzing(false);
    }
  }, [equation]);

  const handleExpand = useCallback(async () => {
    if (!equation.trim()) return;

    setIsAnalyzing(true);
    try {
      const result = await Promise.resolve(expandEquation(equation));
      setExpansion(result);
    } finally {
      setIsAnalyzing(false);
    }
  }, [equation]);

  const handleCopy = useCallback(async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const handleInsert = useCallback(
    (latex: string) => {
      onInsert?.(latex);
    },
    [onInsert]
  );

  const getSeverityIcon = (severity: EquationIssue['severity']) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Input */}
      <div className="space-y-2">
        <Label htmlFor="equation">
          {t('ai.equationAnalysis.input', { defaultValue: 'LaTeX Equation' })}
        </Label>
        <Textarea
          id="equation"
          value={equation}
          onChange={(e) => setEquation(e.target.value)}
          placeholder={t('ai.equationAnalysis.placeholder', {
            defaultValue: 'Enter LaTeX equation, e.g., \\frac{a}{b} + \\frac{c}{d}',
          })}
          className="font-mono text-sm min-h-[80px]"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={handleAnalyze}
          disabled={!equation.trim() || isAnalyzing}
          className="gap-2"
        >
          {isAnalyzing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Calculator className="h-4 w-4" />
          )}
          {t('ai.equationAnalysis.analyze', { defaultValue: 'Analyze' })}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSimplify}
          disabled={!equation.trim() || isAnalyzing}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          {t('ai.equationAnalysis.simplify', { defaultValue: 'Simplify' })}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExpand}
          disabled={!equation.trim() || isAnalyzing}
          className="gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          {t('ai.equationAnalysis.expand', { defaultValue: 'Expand' })}
        </Button>
      </div>

      <Separator />

      {/* Results */}
      <ScrollArea className="h-[300px]">
        <Accordion type="multiple" defaultValue={['analysis', 'verification']} className="w-full">
          {/* Analysis Results */}
          {analysis && (
            <AccordionItem value="analysis">
              <AccordionTrigger className="text-sm">
                {t('ai.equationAnalysis.analysisResults', { defaultValue: 'Analysis Results' })}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {t('ai.equationAnalysis.type', { defaultValue: 'Type' })}:
                    </span>
                    <Badge variant="secondary" className="capitalize">
                      {analysis.type}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {t('ai.equationAnalysis.complexity', { defaultValue: 'Complexity' })}:
                    </span>
                    <Badge
                      variant={
                        analysis.complexity < 3
                          ? 'default'
                          : analysis.complexity < 6
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {analysis.complexity.toFixed(1)}
                    </Badge>
                  </div>

                  {analysis.variables.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">
                        {t('ai.equationAnalysis.variables', { defaultValue: 'Variables' })}:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysis.variables.map((v, i) => (
                          <Badge key={i} variant="outline" className="font-mono">
                            {v}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.functions.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">
                        {t('ai.equationAnalysis.functions', { defaultValue: 'Functions' })}:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysis.functions.map((f, i) => (
                          <Badge key={i} variant="outline" className="font-mono">
                            {f}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Verification Results */}
          {verification && (
            <AccordionItem value="verification">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  {verification.isValid ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  {t('ai.equationAnalysis.verification', { defaultValue: 'Verification' })}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {t('ai.equationAnalysis.confidence', { defaultValue: 'Confidence' })}:
                    </span>
                    <Badge variant={verification.confidence > 0.7 ? 'default' : 'secondary'}>
                      {(verification.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>

                  {verification.issues.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-muted-foreground">
                        {t('ai.equationAnalysis.issues', { defaultValue: 'Issues' })}:
                      </span>
                      {verification.issues.map((issue, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 p-2 rounded-lg bg-muted/50"
                        >
                          {getSeverityIcon(issue.severity)}
                          <div className="flex-1">
                            <div className="font-medium">{issue.message}</div>
                            {issue.suggestion && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {t('ai.equationAnalysis.suggestion', { defaultValue: 'Suggestion' })}:{' '}
                                <code className="bg-muted px-1 rounded">{issue.suggestion}</code>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {verification.suggestions.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-muted-foreground">
                        {t('ai.equationAnalysis.suggestions', { defaultValue: 'Suggestions' })}:
                      </span>
                      {verification.suggestions.map((suggestion, i) => (
                        <div key={i} className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-xs">
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Simplification Results */}
          {simplification && (
            <AccordionItem value="simplification">
              <AccordionTrigger className="text-sm">
                {t('ai.equationAnalysis.simplificationResult', { defaultValue: 'Simplified Form' })}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted font-mono text-sm flex items-center justify-between">
                    <span>{simplification.simplified}</span>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleCopy(simplification.simplified, 'simplified')}
                      >
                        {copied === 'simplified' ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                      {onInsert && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleInsert(simplification.simplified)}
                        >
                          {t('insert', { defaultValue: 'Insert' })}
                        </Button>
                      )}
                    </div>
                  </div>

                  {simplification.steps.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">
                        {t('ai.equationAnalysis.steps', { defaultValue: 'Steps' })}:
                      </span>
                      {simplification.steps.map((step, i) => (
                        <div key={i} className="flex gap-2 text-xs">
                          <Badge variant="outline" className="shrink-0">
                            {step.step}
                          </Badge>
                          <span className="text-muted-foreground">{step.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Expansion Results */}
          {expansion && (
            <AccordionItem value="expansion">
              <AccordionTrigger className="text-sm">
                {t('ai.equationAnalysis.expandedForm', { defaultValue: 'Expanded Form' })}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted font-mono text-sm flex items-center justify-between">
                    <span>{expansion.expanded}</span>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleCopy(expansion.expanded, 'expanded')}
                      >
                        {copied === 'expanded' ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                      {onInsert && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleInsert(expansion.expanded)}
                        >
                          {t('insert', { defaultValue: 'Insert' })}
                        </Button>
                      )}
                    </div>
                  </div>

                  {expansion.steps.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">
                        {t('ai.equationAnalysis.steps', { defaultValue: 'Steps' })}:
                      </span>
                      {expansion.steps.map((step, i) => (
                        <div key={i} className="flex gap-2 text-xs">
                          <Badge variant="outline" className="shrink-0">
                            {step.step}
                          </Badge>
                          <span className="text-muted-foreground">{step.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

        {/* Empty State */}
        {!analysis && !verification && !simplification && !expansion && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>
              {t('ai.equationAnalysis.emptyState', {
                defaultValue: 'Enter an equation and click Analyze to get started',
              })}
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export default LatexEquationAnalysis;
