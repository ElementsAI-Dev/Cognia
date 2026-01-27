'use client';

/**
 * Skill AI Assistant Component
 * 
 * AI-powered features for skill generation, refinement, and suggestions
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Sparkles,
  Wand2,
  Lightbulb,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  ArrowRight,
  Zap,
  Minimize2,
  Maximize2,
  Bug,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  buildGenerationPrompt,
  buildRefinementPrompt,
  buildSuggestionsPrompt,
  parseGeneratedSkill,
  parseSuggestions,
  validateGeneratedContent,
} from '@/lib/skills/generator';
import type { SkillCategory, SkillRefinementType, GenerateSkillInput } from '@/types/system/skill';

const REFINEMENT_OPTIONS: Array<{ value: SkillRefinementType; labelKey: string; icon: React.ReactNode; descKey: string }> = [
  {
    value: 'optimize',
    labelKey: 'optimize',
    icon: <Zap className="h-4 w-4" />,
    descKey: 'optimizeDesc',
  },
  {
    value: 'simplify',
    labelKey: 'simplify',
    icon: <Minimize2 className="h-4 w-4" />,
    descKey: 'simplifyDesc',
  },
  {
    value: 'expand',
    labelKey: 'expand',
    icon: <Maximize2 className="h-4 w-4" />,
    descKey: 'expandDesc',
  },
  {
    value: 'fix-errors',
    labelKey: 'fixErrors',
    icon: <Bug className="h-4 w-4" />,
    descKey: 'fixErrorsDesc',
  },
];

const CATEGORY_OPTIONS: Array<{ value: SkillCategory; labelKey: string }> = [
  { value: 'creative-design', labelKey: 'categoryCreativeDesign' },
  { value: 'development', labelKey: 'categoryDevelopment' },
  { value: 'enterprise', labelKey: 'categoryEnterprise' },
  { value: 'productivity', labelKey: 'categoryProductivity' },
  { value: 'data-analysis', labelKey: 'categoryDataAnalysis' },
  { value: 'communication', labelKey: 'categoryCommunication' },
  { value: 'meta', labelKey: 'categoryMeta' },
  { value: 'custom', labelKey: 'categoryCustom' },
];

interface SkillAIAssistantProps {
  currentContent?: string;
  onApplyGenerated: (content: string) => void;
  onRequestAI?: (prompt: string) => Promise<string>;
}

export function SkillAIAssistant({
  currentContent = '',
  onApplyGenerated,
  onRequestAI,
}: SkillAIAssistantProps) {
  const t = useTranslations('skills');
  const [activeTab, setActiveTab] = useState<'generate' | 'refine' | 'suggest'>('generate');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Generation state
  const [description, setDescription] = useState('');
  const [examples, setExamples] = useState('');
  const [category, setCategory] = useState<SkillCategory>('custom');
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  
  // Refinement state
  const [refinementType, setRefinementType] = useState<SkillRefinementType>('optimize');
  const [customInstructions, setCustomInstructions] = useState('');
  const [refinedContent, setRefinedContent] = useState<string | null>(null);
  
  // Suggestions state
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleGenerate = useCallback(async () => {
    if (!description) {
      setError(t('pleaseProvideDescription'));
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedContent(null);

    try {
      const input: GenerateSkillInput = {
        description,
        examples: examples.split('\n').filter(e => e.trim()),
        category,
      };

      const prompt = buildGenerationPrompt(input);
      setGeneratedPrompt(prompt);

      if (onRequestAI) {
        // Use provided AI function
        const response = await onRequestAI(prompt);
        const result = parseGeneratedSkill(response);
        
        if (result.success && result.rawContent) {
          setGeneratedContent(result.rawContent);
        } else {
          setError(result.error || 'Failed to parse generated skill');
        }
      } else {
        // Show the prompt for manual use
        setGeneratedContent(null);
        setError(t('aiIntegrationNotAvailableCopy'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsLoading(false);
    }
  }, [description, examples, category, onRequestAI, t]);

  const handleRefine = useCallback(async () => {
    if (!currentContent) {
      setError(t('noContentToRefine'));
      return;
    }

    setIsLoading(true);
    setError(null);
    setRefinedContent(null);

    try {
      const prompt = buildRefinementPrompt(currentContent, refinementType, customInstructions || undefined);

      if (onRequestAI) {
        const response = await onRequestAI(prompt);
        const result = parseGeneratedSkill(response);
        
        if (result.success && result.rawContent) {
          setRefinedContent(result.rawContent);
        } else {
          setError(result.error || 'Failed to parse refined skill');
        }
      } else {
        setRefinedContent(prompt);
        setError(t('aiIntegrationNotAvailableRefinement'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refinement failed');
    } finally {
      setIsLoading(false);
    }
  }, [currentContent, refinementType, customInstructions, onRequestAI, t]);

  const handleGetSuggestions = useCallback(async () => {
    if (!currentContent) {
      setError(t('noContentToAnalyze'));
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuggestions([]);

    try {
      const prompt = buildSuggestionsPrompt(currentContent);

      if (onRequestAI) {
        const response = await onRequestAI(prompt);
        const parsed = parseSuggestions(response);
        setSuggestions(parsed);
      } else {
        setError(t('aiIntegrationNotAvailablePrompt'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get suggestions');
    } finally {
      setIsLoading(false);
    }
  }, [currentContent, onRequestAI, t]);

  const handleCopyPrompt = useCallback((prompt: string) => {
    navigator.clipboard.writeText(prompt);
  }, []);

  const validation = currentContent ? validateGeneratedContent(currentContent) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-medium">{t('aiAssistant')}</h3>
      </div>

      {/* Validation Status */}
      {validation && (
        <Card className={validation.valid ? 'border-green-500/30' : 'border-yellow-500/30'}>
          <CardHeader className="py-2 px-3">
            <div className="flex items-center gap-2">
              {validation.valid ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              <span className="text-sm font-medium">
                {validation.valid ? t('contentValid') : t('validationIssues')}
              </span>
            </div>
          </CardHeader>
          {(validation.errors.length > 0 || validation.warnings.length > 0) && (
            <CardContent className="py-2 px-3">
              {validation.errors.map((err, i) => (
                <p key={`err-${i}`} className="text-xs text-destructive">{err}</p>
              ))}
              {validation.warnings.map((warn, i) => (
                <p key={`warn-${i}`} className="text-xs text-yellow-600">{warn}</p>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">
            <Wand2 className="h-4 w-4 mr-1" />
            {t('generate')}
          </TabsTrigger>
          <TabsTrigger value="refine">
            <RefreshCw className="h-4 w-4 mr-1" />
            {t('refine')}
          </TabsTrigger>
          <TabsTrigger value="suggest">
            <Lightbulb className="h-4 w-4 mr-1" />
            {t('suggest')}
          </TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="ai-description">{t('whatShouldSkillDo')}</Label>
            <Textarea
              id="ai-description"
              placeholder={t('describeSkillPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-examples">{t('exampleUseCases')}</Label>
            <Textarea
              id="ai-examples"
              placeholder={t('examplesPlaceholder')}
              value={examples}
              onChange={(e) => setExamples(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('category')}</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as SkillCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleGenerate} disabled={isLoading || !description} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('generating')}
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                {t('generateSkill')}
              </>
            )}
          </Button>

          {generatedPrompt && !onRequestAI && (
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  {t('generationPrompt')}
                  <Button variant="ghost" size="sm" onClick={() => handleCopyPrompt(generatedPrompt)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('copyPromptHint')}
                </CardDescription>
              </CardHeader>
              <CardContent className="py-2 px-3">
                <pre className="text-xs bg-muted p-2 rounded max-h-40 overflow-auto whitespace-pre-wrap">
                  {generatedPrompt}
                </pre>
              </CardContent>
            </Card>
          )}

          {generatedContent && (
            <Card className="border-green-500/30">
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {t('generatedSkill')}
                  </span>
                  <Button size="sm" onClick={() => onApplyGenerated(generatedContent)}>
                    <ArrowRight className="h-4 w-4 mr-1" />
                    {t('apply')}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2 px-3">
                <pre className="text-xs bg-muted p-2 rounded max-h-60 overflow-auto whitespace-pre-wrap">
                  {generatedContent}
                </pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Refine Tab */}
        <TabsContent value="refine" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>{t('refinementType')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {REFINEMENT_OPTIONS.map((opt) => (
                <Tooltip key={opt.value}>
                  <TooltipTrigger asChild>
                    <Card
                      className={`cursor-pointer transition-all p-3 ${
                        refinementType === opt.value ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                      }`}
                      onClick={() => setRefinementType(opt.value)}
                    >
                      <div className="flex items-center gap-2">
                        {opt.icon}
                        <span className="text-sm font-medium">{t(opt.labelKey)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{t(opt.descKey)}</p>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {t(opt.descKey)}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-instructions">{t('additionalInstructions')}</Label>
            <Textarea
              id="custom-instructions"
              placeholder={t('customInstructionsPlaceholder')}
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              rows={2}
            />
          </div>

          <Button onClick={handleRefine} disabled={isLoading || !currentContent} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('refining')}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('refineSkill')}
              </>
            )}
          </Button>

          {refinedContent && (
            <Card className="border-green-500/30">
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {t('refinedSkill')}
                  </span>
                  <Button size="sm" onClick={() => onApplyGenerated(refinedContent)}>
                    <ArrowRight className="h-4 w-4 mr-1" />
                    {t('apply')}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2 px-3">
                <pre className="text-xs bg-muted p-2 rounded max-h-60 overflow-auto whitespace-pre-wrap">
                  {refinedContent}
                </pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Suggest Tab */}
        <TabsContent value="suggest" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm">{t('getImprovementSuggestions')}</CardTitle>
              <CardDescription className="text-xs">
                {t('aiAnalyzeSuggestions')}
              </CardDescription>
            </CardHeader>
          </Card>

          <Button onClick={handleGetSuggestions} disabled={isLoading || !currentContent} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('analyzing')}
              </>
            ) : (
              <>
                <Lightbulb className="h-4 w-4 mr-2" />
                {t('getSuggestions')}
              </>
            )}
          </Button>

          {suggestions.length > 0 && (
            <div className="space-y-2">
              {suggestions.map((suggestion, i) => (
                <Card key={i}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start gap-2">
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {i + 1}
                      </Badge>
                      <p className="text-sm">{suggestion}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default SkillAIAssistant;
