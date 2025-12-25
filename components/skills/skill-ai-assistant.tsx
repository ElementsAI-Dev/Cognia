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
import type { SkillCategory, SkillRefinementType, GenerateSkillInput } from '@/types/skill';

const REFINEMENT_OPTIONS: Array<{ value: SkillRefinementType; label: string; icon: React.ReactNode; description: string }> = [
  {
    value: 'optimize',
    label: 'Optimize',
    icon: <Zap className="h-4 w-4" />,
    description: 'Remove redundancy, improve efficiency',
  },
  {
    value: 'simplify',
    label: 'Simplify',
    icon: <Minimize2 className="h-4 w-4" />,
    description: 'Break down complex instructions',
  },
  {
    value: 'expand',
    label: 'Expand',
    icon: <Maximize2 className="h-4 w-4" />,
    description: 'Add examples and edge cases',
  },
  {
    value: 'fix-errors',
    label: 'Fix Errors',
    icon: <Bug className="h-4 w-4" />,
    description: 'Fix formatting and validation issues',
  },
];

const CATEGORY_OPTIONS: Array<{ value: SkillCategory; label: string }> = [
  { value: 'creative-design', label: 'Creative & Design' },
  { value: 'development', label: 'Development' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'data-analysis', label: 'Data Analysis' },
  { value: 'communication', label: 'Communication' },
  { value: 'meta', label: 'Meta Skills' },
  { value: 'custom', label: 'Custom' },
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
      setError('Please provide a description of what the skill should do');
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
        setError('AI integration not available. Copy the prompt below to use with your AI assistant.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsLoading(false);
    }
  }, [description, examples, category, onRequestAI]);

  const handleRefine = useCallback(async () => {
    if (!currentContent) {
      setError('No skill content to refine. Please add content first.');
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
        setError('AI integration not available. The refinement prompt is shown below.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refinement failed');
    } finally {
      setIsLoading(false);
    }
  }, [currentContent, refinementType, customInstructions, onRequestAI]);

  const handleGetSuggestions = useCallback(async () => {
    if (!currentContent) {
      setError('No skill content to analyze. Please add content first.');
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
        setError('AI integration not available. Use the prompt below with your AI assistant.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get suggestions');
    } finally {
      setIsLoading(false);
    }
  }, [currentContent, onRequestAI]);

  const handleCopyPrompt = useCallback((prompt: string) => {
    navigator.clipboard.writeText(prompt);
  }, []);

  const validation = currentContent ? validateGeneratedContent(currentContent) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-medium">AI Assistant</h3>
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
                {validation.valid ? 'Content Valid' : 'Validation Issues'}
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
            Generate
          </TabsTrigger>
          <TabsTrigger value="refine">
            <RefreshCw className="h-4 w-4 mr-1" />
            Refine
          </TabsTrigger>
          <TabsTrigger value="suggest">
            <Lightbulb className="h-4 w-4 mr-1" />
            Suggest
          </TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="ai-description">What should this skill do?</Label>
            <Textarea
              id="ai-description"
              placeholder={t('describeSkillPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-examples">Example use cases (one per line)</Label>
            <Textarea
              id="ai-examples"
              placeholder={t('examplesPlaceholder')}
              value={examples}
              onChange={(e) => setExamples(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as SkillCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleGenerate} disabled={isLoading || !description} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Generate Skill
              </>
            )}
          </Button>

          {generatedPrompt && !onRequestAI && (
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  Generation Prompt
                  <Button variant="ghost" size="sm" onClick={() => handleCopyPrompt(generatedPrompt)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </CardTitle>
                <CardDescription className="text-xs">
                  Copy this prompt to use with your AI assistant
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
                    Generated Skill
                  </span>
                  <Button size="sm" onClick={() => onApplyGenerated(generatedContent)}>
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Apply
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
            <Label>Refinement Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {REFINEMENT_OPTIONS.map((opt) => (
                <Card
                  key={opt.value}
                  className={`cursor-pointer transition-all p-3 ${
                    refinementType === opt.value ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                  }`}
                  onClick={() => setRefinementType(opt.value)}
                >
                  <div className="flex items-center gap-2">
                    {opt.icon}
                    <span className="text-sm font-medium">{opt.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-instructions">Additional Instructions (optional)</Label>
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
                Refining...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refine Skill
              </>
            )}
          </Button>

          {refinedContent && (
            <Card className="border-green-500/30">
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Refined Skill
                  </span>
                  <Button size="sm" onClick={() => onApplyGenerated(refinedContent)}>
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Apply
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
              <CardTitle className="text-sm">Get Improvement Suggestions</CardTitle>
              <CardDescription className="text-xs">
                AI will analyze your skill and suggest improvements
              </CardDescription>
            </CardHeader>
          </Card>

          <Button onClick={handleGetSuggestions} disabled={isLoading || !currentContent} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Lightbulb className="h-4 w-4 mr-2" />
                Get Suggestions
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
