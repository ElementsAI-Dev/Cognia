/**
 * Prompt Self-Optimizer
 * AI-powered prompt optimization based on usage feedback and A/B testing
 * 
 * Features:
 * - Prompt analysis with quality scoring
 * - Iterative optimization with learning
 * - User feedback integration
 * - A/B testing for prompt variants
 * - Pattern recognition from historical data
 * - Comparison between original and optimized versions
 */

import { generateText } from 'ai';
import { getProviderModel, type ProviderName } from '../core/client';
import { loggers } from '@/lib/logger';
import type { 
  PromptTemplate, 
  PromptFeedback, 
  PromptABTest, 
  PromptTemplateStats,
  PromptOptimizationHistory,
  OptimizationRecommendation,
} from '@/types/content/prompt-template';
import { nanoid } from 'nanoid';

export interface SelfOptimizationConfig {
  provider: ProviderName;
  model: string;
  apiKey: string;
  baseURL?: string;
  minFeedbackCount?: number;
  targetSuccessRate?: number;
  maxIterations?: number;
  enableLearning?: boolean;
  learningContext?: OptimizationLearningContext;
}

export interface OptimizationLearningContext {
  successfulPatterns: string[];
  failedPatterns: string[];
  domainKnowledge: string[];
  userPreferences: Record<string, string>;
}

export interface OptimizationSuggestion {
  id: string;
  type: 'structure' | 'clarity' | 'specificity' | 'context' | 'formatting' | 'variables' | 'examples' | 'constraints';
  priority: 'high' | 'medium' | 'low';
  description: string;
  originalText?: string;
  suggestedText?: string;
  confidence: number;
  impact?: 'major' | 'minor';
  category?: string;
}

export interface OptimizationComparison {
  metric: string;
  original: number;
  optimized: number;
  improvement: number;
  improvementPercent: number;
}

export interface IterativeOptimizationStep {
  iteration: number;
  content: string;
  score: number;
  appliedSuggestions: string[];
  timestamp: Date;
}

export interface SelfOptimizationResult {
  success: boolean;
  originalContent: string;
  optimizedContent?: string;
  suggestions: OptimizationSuggestion[];
  analysis: {
    clarity: number;
    specificity: number;
    structureQuality: number;
    overallScore: number;
  };
  abTestRecommendation?: {
    shouldTest: boolean;
    variantContent?: string;
    hypothesis: string;
  };
  error?: string;
}

const ANALYSIS_SYSTEM_PROMPT = `You are an expert prompt engineer. Analyze the given prompt and provide detailed feedback on how to improve it.

Consider these aspects:
1. **Clarity**: Is the intent clear? Are instructions unambiguous?
2. **Specificity**: Are requirements specific enough? Are edge cases handled?
3. **Structure**: Is the prompt well-organized? Does it follow best practices?
4. **Context**: Does it provide sufficient context for the AI?
5. **Variables**: Are placeholders well-defined and documented?

Provide your analysis as a JSON object with the following structure:
{
  "scores": {
    "clarity": <0-100>,
    "specificity": <0-100>,
    "structureQuality": <0-100>,
    "overallScore": <0-100>
  },
  "suggestions": [
    {
      "type": "<structure|clarity|specificity|context|formatting|variables>",
      "priority": "<high|medium|low>",
      "description": "<detailed description of the improvement>",
      "originalText": "<optional: specific text to improve>",
      "suggestedText": "<optional: improved version>",
      "confidence": <0-1>
    }
  ],
  "abTestRecommendation": {
    "shouldTest": <true|false>,
    "hypothesis": "<what improvement we're testing>",
    "variantContent": "<optional: alternative prompt version to test>"
  }
}`;

const OPTIMIZATION_SYSTEM_PROMPT = `You are an expert prompt engineer. Optimize the given prompt based on the provided feedback and suggestions.

Goals:
1. Improve clarity and reduce ambiguity
2. Add appropriate structure (sections, bullet points)
3. Include clear examples where helpful
4. Handle edge cases
5. Maintain the original intent
6. Preserve all variable placeholders ({{variable_name}})

Output ONLY the optimized prompt without any explanation.`;

const FEEDBACK_ANALYSIS_PROMPT = `Analyze the following user feedback for a prompt template and suggest improvements.

Feedback entries:
{{feedback}}

Provide specific, actionable suggestions based on patterns in the feedback. Focus on:
1. Common complaints or issues
2. Success patterns
3. Areas where users consistently rate low
4. Missing context or instructions

Output as JSON:
{
  "patterns": ["<pattern 1>", "<pattern 2>"],
  "suggestions": [
    {
      "type": "<structure|clarity|specificity|context|formatting|variables>",
      "priority": "<high|medium|low>",
      "description": "<improvement description>",
      "confidence": <0-1>
    }
  ]
}`;

/**
 * Analyze a prompt template and generate optimization suggestions
 */
export async function analyzePrompt(
  template: PromptTemplate,
  config: SelfOptimizationConfig
): Promise<SelfOptimizationResult> {
  try {
    const modelInstance = getProviderModel(config.provider, config.model, config.apiKey, config.baseURL);

    const result = await generateText({
      model: modelInstance,
      system: ANALYSIS_SYSTEM_PROMPT,
      prompt: `Analyze this prompt template:

Name: ${template.name}
Description: ${template.description || 'No description'}
Category: ${template.category || 'General'}
Variables: ${template.variables.map(v => `{{${v.name}}}${v.required ? ' (required)' : ''}`).join(', ') || 'None'}

Content:
${template.content}`,
      temperature: 0.3,
      maxOutputTokens: 2000,
    });

    const analysis = parseAnalysisResult(result.text);

    return {
      success: true,
      originalContent: template.content,
      suggestions: analysis.suggestions,
      analysis: analysis.scores,
      abTestRecommendation: analysis.abTestRecommendation,
    };
  } catch (error) {
    return {
      success: false,
      originalContent: template.content,
      suggestions: [],
      analysis: {
        clarity: 0,
        specificity: 0,
        structureQuality: 0,
        overallScore: 0,
      },
      error: error instanceof Error ? error.message : 'Failed to analyze prompt',
    };
  }
}

/**
 * Optimize a prompt based on analysis suggestions
 */
export async function optimizePromptFromAnalysis(
  template: PromptTemplate,
  suggestions: OptimizationSuggestion[],
  config: SelfOptimizationConfig
): Promise<SelfOptimizationResult> {
  try {
    const modelInstance = getProviderModel(config.provider, config.model, config.apiKey, config.baseURL);

    const suggestionText = suggestions
      .filter(s => s.priority === 'high' || s.priority === 'medium')
      .map(s => `- [${s.priority.toUpperCase()}] ${s.description}${s.suggestedText ? `\n  Suggestion: ${s.suggestedText}` : ''}`)
      .join('\n');

    const result = await generateText({
      model: modelInstance,
      system: OPTIMIZATION_SYSTEM_PROMPT,
      prompt: `Original prompt:
${template.content}

Improvement suggestions:
${suggestionText}

Optimized prompt:`,
      temperature: 0.5,
      maxOutputTokens: 3000,
    });

    const optimizedContent = result.text.trim();

    return {
      success: true,
      originalContent: template.content,
      optimizedContent,
      suggestions,
      analysis: {
        clarity: 0,
        specificity: 0,
        structureQuality: 0,
        overallScore: 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      originalContent: template.content,
      suggestions,
      analysis: {
        clarity: 0,
        specificity: 0,
        structureQuality: 0,
        overallScore: 0,
      },
      error: error instanceof Error ? error.message : 'Failed to optimize prompt',
    };
  }
}

/**
 * Analyze user feedback and generate improvements
 */
export async function analyzeUserFeedback(
  template: PromptTemplate,
  feedback: PromptFeedback[],
  config: SelfOptimizationConfig
): Promise<OptimizationSuggestion[]> {
  if (feedback.length < (config.minFeedbackCount || 5)) {
    return [];
  }

  try {
    const modelInstance = getProviderModel(config.provider, config.model, config.apiKey, config.baseURL);

    const feedbackText = feedback
      .slice(-20)
      .map(f => `Rating: ${f.rating}/5, Effectiveness: ${f.effectiveness}, Comment: ${f.comment || 'No comment'}`)
      .join('\n');

    const prompt = FEEDBACK_ANALYSIS_PROMPT.replace('{{feedback}}', feedbackText);

    const result = await generateText({
      model: modelInstance,
      system: 'You are a prompt optimization analyst. Analyze feedback patterns and suggest improvements.',
      prompt,
      temperature: 0.3,
      maxOutputTokens: 1500,
    });

    const parsed = parseJSONResponse(result.text) as { suggestions?: OptimizationSuggestion[] } | null;
    return parsed?.suggestions || [];
  } catch (error) {
    loggers.ai.error('Failed to analyze feedback', error as Error);
    return [];
  }
}

/**
 * Create an A/B test for a prompt
 */
export function createABTest(
  templateId: string,
  originalContent: string,
  variantContent: string,
  _hypothesis: string
): PromptABTest {
  return {
    id: nanoid(),
    templateId,
    variantA: {
      content: originalContent,
      uses: 0,
      successRate: 0,
      averageRating: 0,
    },
    variantB: {
      content: variantContent,
      uses: 0,
      successRate: 0,
      averageRating: 0,
    },
    status: 'running',
    startedAt: new Date(),
    minSampleSize: 50,
  };
}

/**
 * Update A/B test with new result
 */
export function updateABTestResult(
  test: PromptABTest,
  variant: 'A' | 'B',
  success: boolean,
  rating?: number
): PromptABTest {
  const variantData = variant === 'A' ? test.variantA : test.variantB;
  const newUses = variantData.uses + 1;
  const successCount = Math.round(variantData.successRate * variantData.uses) + (success ? 1 : 0);
  const ratingSum = variantData.averageRating * variantData.uses + (rating || 0);

  const updatedVariant = {
    ...variantData,
    uses: newUses,
    successRate: successCount / newUses,
    averageRating: rating ? ratingSum / newUses : variantData.averageRating,
  };

  return {
    ...test,
    [variant === 'A' ? 'variantA' : 'variantB']: updatedVariant,
  };
}

/**
 * Evaluate A/B test and determine winner
 */
export function evaluateABTest(test: PromptABTest): PromptABTest {
  const { variantA, variantB, minSampleSize } = test;

  if (variantA.uses < minSampleSize || variantB.uses < minSampleSize) {
    return test;
  }

  const scoreA = variantA.successRate * 0.6 + (variantA.averageRating / 5) * 0.4;
  const scoreB = variantB.successRate * 0.6 + (variantB.averageRating / 5) * 0.4;

  const significanceThreshold = 0.05;
  const difference = Math.abs(scoreA - scoreB);

  let winner: 'A' | 'B' | 'none' = 'none';
  if (difference > significanceThreshold) {
    winner = scoreA > scoreB ? 'A' : 'B';
  }

  return {
    ...test,
    status: 'completed',
    winner,
    completedAt: new Date(),
  };
}

/**
 * Get the content variant to use for A/B testing
 */
export function getABTestVariant(test: PromptABTest): 'A' | 'B' {
  if (test.status !== 'running') {
    return test.winner === 'B' ? 'B' : 'A';
  }

  const totalUses = test.variantA.uses + test.variantB.uses;
  if (totalUses === 0) {
    return Math.random() < 0.5 ? 'A' : 'B';
  }

  const aRatio = test.variantA.uses / totalUses;
  return aRatio <= 0.5 ? 'A' : 'B';
}

/**
 * Calculate aggregate stats from feedback
 */
export function calculatePromptStats(feedback: PromptFeedback[]): PromptTemplateStats {
  if (feedback.length === 0) {
    return {
      totalUses: 0,
      successfulUses: 0,
      averageRating: 0,
      ratingCount: 0,
      optimizationCount: 0,
    };
  }

  const totalUses = feedback.length;
  const successfulUses = feedback.filter(f => 
    f.effectiveness === 'excellent' || f.effectiveness === 'good'
  ).length;
  
  const ratingSum = feedback.reduce((sum, f) => sum + f.rating, 0);
  const avgResponseTime = feedback
    .filter(f => f.context?.responseTime)
    .reduce((sum, f, _, arr) => sum + (f.context?.responseTime || 0) / arr.length, 0);

  return {
    totalUses,
    successfulUses,
    averageRating: ratingSum / totalUses,
    ratingCount: totalUses,
    averageResponseTime: avgResponseTime > 0 ? avgResponseTime : undefined,
    optimizationCount: 0,
  };
}

/**
 * Auto-optimize a prompt based on feedback threshold
 */
export async function autoOptimize(
  template: PromptTemplate,
  feedback: PromptFeedback[],
  config: SelfOptimizationConfig
): Promise<SelfOptimizationResult | null> {
  const stats = calculatePromptStats(feedback);
  const targetSuccessRate = config.targetSuccessRate || 0.8;

  if (stats.totalUses < (config.minFeedbackCount || 10)) {
    return null;
  }

  const successRate = stats.successfulUses / stats.totalUses;
  if (successRate >= targetSuccessRate) {
    return null;
  }

  const analysisResult = await analyzePrompt(template, config);
  if (!analysisResult.success) {
    return analysisResult;
  }

  const feedbackSuggestions = await analyzeUserFeedback(template, feedback, config);
  const allSuggestions = [...analysisResult.suggestions, ...feedbackSuggestions];

  if (allSuggestions.length === 0) {
    return analysisResult;
  }

  return optimizePromptFromAnalysis(template, allSuggestions, config);
}

interface ParsedAnalysis {
  scores?: {
    clarity?: number;
    specificity?: number;
    structureQuality?: number;
    overallScore?: number;
  };
  suggestions?: Array<Partial<OptimizationSuggestion>>;
  abTestRecommendation?: {
    shouldTest: boolean;
    hypothesis: string;
    variantContent?: string;
  };
}

function parseAnalysisResult(text: string): {
  scores: SelfOptimizationResult['analysis'];
  suggestions: OptimizationSuggestion[];
  abTestRecommendation?: SelfOptimizationResult['abTestRecommendation'];
} {
  const parsed = parseJSONResponse(text) as ParsedAnalysis | null;
  
  const defaultScores = { clarity: 50, specificity: 50, structureQuality: 50, overallScore: 50 };
  
  if (!parsed) {
    return {
      scores: defaultScores,
      suggestions: [],
    };
  }

  const scores = {
    clarity: parsed.scores?.clarity ?? 50,
    specificity: parsed.scores?.specificity ?? 50,
    structureQuality: parsed.scores?.structureQuality ?? 50,
    overallScore: parsed.scores?.overallScore ?? 50,
  };

  const suggestions: OptimizationSuggestion[] = (parsed.suggestions || []).map((s) => ({
    id: nanoid(),
    type: s.type || 'clarity',
    priority: s.priority || 'medium',
    description: s.description || '',
    originalText: s.originalText,
    suggestedText: s.suggestedText,
    confidence: s.confidence || 0.5,
    impact: s.priority === 'high' ? 'major' : 'minor',
    category: s.type,
  }));

  return {
    scores,
    suggestions,
    abTestRecommendation: parsed.abTestRecommendation,
  };
}

function parseJSONResponse(text: string): Record<string, unknown> | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Compare original and optimized prompts
 */
export function compareOptimization(
  original: SelfOptimizationResult['analysis'],
  optimized: SelfOptimizationResult['analysis']
): OptimizationComparison[] {
  const metrics = ['clarity', 'specificity', 'structureQuality', 'overallScore'] as const;
  
  return metrics.map((metric) => {
    const originalValue = original[metric];
    const optimizedValue = optimized[metric];
    const improvement = optimizedValue - originalValue;
    const improvementPercent = originalValue > 0 
      ? Math.round((improvement / originalValue) * 100) 
      : 0;
    
    return {
      metric,
      original: originalValue,
      optimized: optimizedValue,
      improvement,
      improvementPercent,
    };
  });
}

/**
 * Iterative optimization with multiple passes
 */
export async function iterativeOptimize(
  template: PromptTemplate,
  config: SelfOptimizationConfig,
  onProgress?: (step: IterativeOptimizationStep) => void
): Promise<{
  success: boolean;
  steps: IterativeOptimizationStep[];
  finalContent: string;
  totalImprovement: number;
  error?: string;
}> {
  const maxIterations = config.maxIterations || 3;
  const steps: IterativeOptimizationStep[] = [];
  let currentContent = template.content;
  let currentTemplate = { ...template };
  let previousScore = 0;
  
  try {
    for (let i = 0; i < maxIterations; i++) {
      // Analyze current state
      const analysis = await analyzePrompt(currentTemplate, config);
      
      if (!analysis.success) {
        return {
          success: false,
          steps,
          finalContent: currentContent,
          totalImprovement: 0,
          error: analysis.error,
        };
      }
      
      const currentScore = analysis.analysis.overallScore;
      
      // Check if improvement is significant enough to continue
      if (i > 0 && currentScore - previousScore < 5) {
        break;
      }
      
      // Filter high-impact suggestions
      const highImpactSuggestions = analysis.suggestions.filter(
        s => s.priority === 'high' || (s.priority === 'medium' && s.confidence > 0.7)
      );
      
      if (highImpactSuggestions.length === 0) {
        break;
      }
      
      // Optimize
      const optimizeResult = await optimizePromptFromAnalysis(
        currentTemplate,
        highImpactSuggestions,
        config
      );
      
      if (!optimizeResult.success || !optimizeResult.optimizedContent) {
        break;
      }
      
      // Record step
      const step: IterativeOptimizationStep = {
        iteration: i + 1,
        content: optimizeResult.optimizedContent,
        score: currentScore,
        appliedSuggestions: highImpactSuggestions.map(s => s.description),
        timestamp: new Date(),
      };
      
      steps.push(step);
      onProgress?.(step);
      
      // Update for next iteration
      previousScore = currentScore;
      currentContent = optimizeResult.optimizedContent;
      currentTemplate = { ...currentTemplate, content: currentContent };
    }
    
    // Calculate total improvement
    const initialScore = steps[0]?.score || 0;
    const finalScore = steps[steps.length - 1]?.score || initialScore;
    const totalImprovement = finalScore - initialScore;
    
    return {
      success: true,
      steps,
      finalContent: currentContent,
      totalImprovement,
    };
  } catch (error) {
    return {
      success: false,
      steps,
      finalContent: currentContent,
      totalImprovement: 0,
      error: error instanceof Error ? error.message : 'Iterative optimization failed',
    };
  }
}

const LEARNING_OPTIMIZATION_PROMPT = `You are an expert prompt engineer. Optimize the given prompt based on the provided learning context.

Learning Context:
- Successful patterns that have worked well: {{successfulPatterns}}
- Patterns to avoid: {{failedPatterns}}
- Domain knowledge: {{domainKnowledge}}
- User preferences: {{userPreferences}}

Apply these learnings while:
1. Preserving the original intent
2. Improving clarity and specificity
3. Following the successful patterns
4. Avoiding the failed patterns

Output ONLY the optimized prompt without any explanation.`;

/**
 * Optimize using learning context from historical data
 */
export async function optimizeWithLearning(
  template: PromptTemplate,
  config: SelfOptimizationConfig
): Promise<SelfOptimizationResult> {
  if (!config.enableLearning || !config.learningContext) {
    return optimizePromptFromAnalysis(template, [], config);
  }
  
  const { learningContext } = config;
  
  try {
    const modelInstance = getProviderModel(
      config.provider,
      config.model,
      config.apiKey,
      config.baseURL
    );
    
    const prompt = LEARNING_OPTIMIZATION_PROMPT
      .replace('{{successfulPatterns}}', learningContext.successfulPatterns.join(', ') || 'None')
      .replace('{{failedPatterns}}', learningContext.failedPatterns.join(', ') || 'None')
      .replace('{{domainKnowledge}}', learningContext.domainKnowledge.join(', ') || 'None')
      .replace('{{userPreferences}}', JSON.stringify(learningContext.userPreferences) || '{}');
    
    const result = await generateText({
      model: modelInstance,
      system: prompt,
      prompt: `Original prompt:\n${template.content}\n\nOptimized prompt:`,
      temperature: 0.5,
      maxOutputTokens: 3000,
    });
    
    const optimizedContent = result.text.trim();
    
    // Re-analyze optimized content
    const optimizedTemplate = { ...template, content: optimizedContent };
    const analysis = await analyzePrompt(optimizedTemplate, config);
    
    return {
      success: true,
      originalContent: template.content,
      optimizedContent,
      suggestions: analysis.suggestions,
      analysis: analysis.analysis,
      abTestRecommendation: analysis.abTestRecommendation,
    };
  } catch (error) {
    return {
      success: false,
      originalContent: template.content,
      suggestions: [],
      analysis: {
        clarity: 0,
        specificity: 0,
        structureQuality: 0,
        overallScore: 0,
      },
      error: error instanceof Error ? error.message : 'Learning-based optimization failed',
    };
  }
}

/**
 * Extract learning patterns from feedback history
 */
export function extractLearningPatterns(
  feedback: PromptFeedback[],
  templateContent: string
): OptimizationLearningContext {
  const successfulPatterns: string[] = [];
  const failedPatterns: string[] = [];
  const domainKnowledge: string[] = [];
  const userPreferences: Record<string, string> = {};
  
  // Analyze feedback patterns
  const excellentFeedback = feedback.filter(f => f.effectiveness === 'excellent');
  const poorFeedback = feedback.filter(f => f.effectiveness === 'poor');
  
  // Extract patterns from comments
  excellentFeedback.forEach(f => {
    if (f.comment) {
      successfulPatterns.push(f.comment);
    }
  });
  
  poorFeedback.forEach(f => {
    if (f.comment) {
      failedPatterns.push(f.comment);
    }
  });
  
  // Analyze template structure for domain hints (case-insensitive)
  const lowerContent = templateContent.toLowerCase();
  if (lowerContent.includes('code') || lowerContent.includes('function')) {
    domainKnowledge.push('Technical/coding context');
  }
  if (lowerContent.includes('write') || lowerContent.includes('create')) {
    domainKnowledge.push('Creative writing context');
  }
  if (lowerContent.includes('analyze') || lowerContent.includes('explain')) {
    domainKnowledge.push('Analytical context');
  }
  
  // Calculate preferences from feedback ratings
  const avgRating = feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;
  if (avgRating >= 4) {
    userPreferences.quality = 'high';
  } else if (avgRating >= 3) {
    userPreferences.quality = 'medium';
  } else {
    userPreferences.quality = 'needs-improvement';
  }
  
  return {
    successfulPatterns: successfulPatterns.slice(0, 5),
    failedPatterns: failedPatterns.slice(0, 5),
    domainKnowledge,
    userPreferences,
  };
}

/**
 * Generate variant for A/B testing
 */
export async function generateABTestVariant(
  template: PromptTemplate,
  config: SelfOptimizationConfig,
  hypothesis: string
): Promise<{
  success: boolean;
  variantContent?: string;
  changes: string[];
  error?: string;
}> {
  try {
    const modelInstance = getProviderModel(
      config.provider,
      config.model,
      config.apiKey,
      config.baseURL
    );
    
    const result = await generateText({
      model: modelInstance,
      system: `You are an expert prompt engineer. Create a variant of the given prompt to test the following hypothesis:
"${hypothesis}"

Make targeted changes that specifically test this hypothesis while keeping the core functionality intact.
Output ONLY the modified prompt without any explanation.`,
      prompt: template.content,
      temperature: 0.7,
      maxOutputTokens: 3000,
    });
    
    const variantContent = result.text.trim();
    
    // Identify changes made
    const changes: string[] = [];
    if (variantContent.length !== template.content.length) {
      changes.push(`Length changed: ${template.content.length} → ${variantContent.length} chars`);
    }
    if (hypothesis.toLowerCase().includes('structure')) {
      changes.push('Modified prompt structure');
    }
    if (hypothesis.toLowerCase().includes('example')) {
      changes.push('Added or modified examples');
    }
    if (hypothesis.toLowerCase().includes('clarity')) {
      changes.push('Improved clarity');
    }
    
    return {
      success: true,
      variantContent,
      changes,
    };
  } catch (error) {
    return {
      success: false,
      changes: [],
      error: error instanceof Error ? error.message : 'Failed to generate variant',
    };
  }
}

/**
 * Suggest improvements based on best practices
 */
export function suggestBestPractices(content: string): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];
  
  // Check for role definition
  if (!content.toLowerCase().includes('you are') && !content.toLowerCase().includes('as a')) {
    suggestions.push({
      id: nanoid(),
      type: 'context',
      priority: 'high',
      description: 'Add a clear role definition (e.g., "You are an expert...")',
      confidence: 0.9,
      impact: 'major',
      category: 'best-practice',
    });
  }
  
  // Check for output format specification
  if (!content.toLowerCase().includes('format') && !content.toLowerCase().includes('output')) {
    suggestions.push({
      id: nanoid(),
      type: 'formatting',
      priority: 'medium',
      description: 'Specify the expected output format',
      confidence: 0.8,
      impact: 'minor',
      category: 'best-practice',
    });
  }
  
  // Check for examples
  if (!content.toLowerCase().includes('example') && !content.toLowerCase().includes('for instance')) {
    suggestions.push({
      id: nanoid(),
      type: 'examples',
      priority: 'medium',
      description: 'Consider adding examples to clarify expectations',
      confidence: 0.7,
      impact: 'minor',
      category: 'best-practice',
    });
  }
  
  // Check for constraints
  if (!content.toLowerCase().includes('do not') && !content.toLowerCase().includes("don't") && !content.toLowerCase().includes('avoid')) {
    suggestions.push({
      id: nanoid(),
      type: 'constraints',
      priority: 'low',
      description: 'Consider adding constraints or things to avoid',
      confidence: 0.6,
      impact: 'minor',
      category: 'best-practice',
    });
  }
  
  // Check prompt length
  if (content.length < 100) {
    suggestions.push({
      id: nanoid(),
      type: 'specificity',
      priority: 'high',
      description: 'Prompt is quite short. Consider adding more context and details',
      confidence: 0.85,
      impact: 'major',
      category: 'best-practice',
    });
  }
  
  // Check for variable placeholders without descriptions
  const variableMatches = content.match(/\{\{([^}]+)\}\}/g);
  if (variableMatches && variableMatches.length > 0) {
    suggestions.push({
      id: nanoid(),
      type: 'variables',
      priority: 'low',
      description: `Found ${variableMatches.length} variable(s). Ensure each has clear documentation`,
      confidence: 0.7,
      impact: 'minor',
      category: 'best-practice',
    });
  }
  
  return suggestions;
}

/**
 * Quick analysis without AI (rule-based)
 */
export function quickAnalyze(content: string): SelfOptimizationResult['analysis'] {
  let clarity = 50;
  let specificity = 50;
  let structureQuality = 50;
  
  // Clarity checks
  if (content.includes('clearly') || content.includes('specifically')) clarity += 10;
  if (content.length > 200) clarity += 10;
  if (content.split('.').length > 3) clarity += 5;
  
  // Specificity checks
  if (content.includes('example')) specificity += 15;
  if (content.match(/\d+/)) specificity += 5;
  if (content.includes('format')) specificity += 10;
  if (content.includes('step')) specificity += 10;
  
  // Structure checks
  if (content.includes('\n\n')) structureQuality += 10;
  if (content.match(/^#+\s/m)) structureQuality += 15;
  if (content.includes('1.') || content.includes('- ')) structureQuality += 10;
  if (content.toLowerCase().includes('you are')) structureQuality += 10;
  
  // Cap scores at 100
  clarity = Math.min(100, clarity);
  specificity = Math.min(100, specificity);
  structureQuality = Math.min(100, structureQuality);
  
  const overallScore = Math.round((clarity + specificity + structureQuality) / 3);
  
  return {
    clarity,
    specificity,
    structureQuality,
    overallScore,
  };
}

/**
 * Generate optimization recommendations for templates based on usage and feedback
 */
export function generateOptimizationRecommendations(
  templates: PromptTemplate[],
  feedbackMap: Record<string, PromptFeedback[]>
): OptimizationRecommendation[] {
  const recommendations: OptimizationRecommendation[] = [];
  
  for (const template of templates) {
    const feedback = feedbackMap[template.id] || [];
    const stats = calculatePromptStats(feedback);
    
    // Calculate success rate
    const successRate = stats.totalUses > 0 
      ? stats.successfulUses / stats.totalUses 
      : 1;
    
    // Calculate days since last optimization
    const daysSinceOptimized = template.stats?.lastOptimizedAt
      ? Math.floor((Date.now() - new Date(template.stats.lastOptimizedAt).getTime()) / (1000 * 60 * 60 * 24))
      : undefined;
    
    // Determine if optimization is recommended
    const suggestedActions: string[] = [];
    let priority: 'high' | 'medium' | 'low' = 'low';
    let reason = '';
    
    // High priority: low success rate with significant usage
    if (stats.totalUses >= 10 && successRate < 0.6) {
      priority = 'high';
      reason = 'Low success rate with significant usage';
      suggestedActions.push('Run AI analysis to identify issues');
      suggestedActions.push('Consider A/B testing with improved variant');
    }
    // High priority: low rating with usage
    else if (stats.totalUses >= 5 && stats.averageRating < 3) {
      priority = 'high';
      reason = 'Low average rating from users';
      suggestedActions.push('Review user feedback comments');
      suggestedActions.push('Apply clarity and structure improvements');
    }
    // Medium priority: moderate success but not optimized recently
    else if (stats.totalUses >= 20 && daysSinceOptimized && daysSinceOptimized > 30) {
      priority = 'medium';
      reason = 'High usage template not optimized recently';
      suggestedActions.push('Run periodic optimization check');
    }
    // Medium priority: moderate rating
    else if (stats.totalUses >= 10 && stats.averageRating >= 3 && stats.averageRating < 4) {
      priority = 'medium';
      reason = 'Room for improvement based on feedback';
      suggestedActions.push('Apply best practice suggestions');
    }
    // Low priority: good performance but could be better
    else if (stats.totalUses >= 5 && successRate >= 0.6 && successRate < 0.8) {
      priority = 'low';
      reason = 'Good performance with potential for improvement';
      suggestedActions.push('Consider iterative optimization');
    }
    else {
      continue; // Skip templates that don't need optimization
    }
    
    recommendations.push({
      templateId: template.id,
      templateName: template.name,
      priority,
      reason,
      metrics: {
        usageCount: stats.totalUses,
        averageRating: stats.averageRating,
        successRate,
        daysSinceOptimized,
      },
      suggestedActions,
    });
  }
  
  // Sort by priority (high first) then by usage count
  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return b.metrics.usageCount - a.metrics.usageCount;
  });
}

/**
 * Batch optimize multiple templates
 */
export async function batchOptimizeTemplates(
  templates: PromptTemplate[],
  config: SelfOptimizationConfig,
  options?: {
    maxConcurrent?: number;
    skipIfScoreAbove?: number;
    onProgress?: (completed: number, total: number, result: SelfOptimizationResult) => void;
  }
): Promise<Map<string, SelfOptimizationResult>> {
  const results = new Map<string, SelfOptimizationResult>();
  const { maxConcurrent = 3, skipIfScoreAbove = 85, onProgress } = options || {};
  
  // Filter templates that need optimization
  const toOptimize = templates.filter(template => {
    const quickScore = quickAnalyze(template.content);
    return quickScore.overallScore < skipIfScoreAbove;
  });
  
  // Process in batches
  for (let i = 0; i < toOptimize.length; i += maxConcurrent) {
    const batch = toOptimize.slice(i, i + maxConcurrent);
    
    const batchResults = await Promise.all(
      batch.map(async (template) => {
        try {
          const result = await analyzePrompt(template, config);
          
          if (result.success && result.suggestions.length > 0) {
            const optimized = await optimizePromptFromAnalysis(template, result.suggestions, config);
            return { templateId: template.id, result: optimized };
          }
          
          return { templateId: template.id, result };
        } catch (error) {
          return {
            templateId: template.id,
            result: {
              success: false,
              originalContent: template.content,
              suggestions: [],
              analysis: { clarity: 0, specificity: 0, structureQuality: 0, overallScore: 0 },
              error: error instanceof Error ? error.message : 'Batch optimization failed',
            } as SelfOptimizationResult,
          };
        }
      })
    );
    
    // Store results and notify progress
    for (const { templateId, result } of batchResults) {
      results.set(templateId, result);
      onProgress?.(results.size, toOptimize.length, result);
    }
  }
  
  return results;
}

/**
 * Create optimization history entry
 */
export function createOptimizationHistoryEntry(
  templateId: string,
  originalContent: string,
  optimizedContent: string,
  suggestions: string[],
  style?: string,
  appliedBy: 'user' | 'auto' = 'user'
): PromptOptimizationHistory {
  const beforeScores = quickAnalyze(originalContent);
  const afterScores = quickAnalyze(optimizedContent);
  
  return {
    id: nanoid(),
    templateId,
    originalContent,
    optimizedContent,
    style,
    suggestions,
    scores: {
      before: {
        clarity: beforeScores.clarity,
        specificity: beforeScores.specificity,
        structure: beforeScores.structureQuality,
        overall: beforeScores.overallScore,
      },
      after: {
        clarity: afterScores.clarity,
        specificity: afterScores.specificity,
        structure: afterScores.structureQuality,
        overall: afterScores.overallScore,
      },
    },
    appliedAt: new Date(),
    appliedBy,
  };
}

/**
 * Calculate optimization improvement from history
 */
export function calculateOptimizationImprovement(
  history: PromptOptimizationHistory[]
): {
  totalOptimizations: number;
  averageImprovement: number;
  bestImprovement: number;
  successRate: number;
} {
  if (history.length === 0) {
    return {
      totalOptimizations: 0,
      averageImprovement: 0,
      bestImprovement: 0,
      successRate: 0,
    };
  }
  
  const improvements = history.map(h => h.scores.after.overall - h.scores.before.overall);
  const positiveCount = improvements.filter(i => i > 0).length;
  
  return {
    totalOptimizations: history.length,
    averageImprovement: improvements.reduce((a, b) => a + b, 0) / history.length,
    bestImprovement: Math.max(...improvements),
    successRate: positiveCount / history.length,
  };
}

/**
 * Get templates that would benefit most from optimization
 */
export function getTopOptimizationCandidates(
  templates: PromptTemplate[],
  limit: number = 5
): Array<{ template: PromptTemplate; score: number; reasons: string[] }> {
  const candidates = templates.map(template => {
    const analysis = quickAnalyze(template.content);
    const reasons: string[] = [];
    let score = 0;
    
    // Score based on current quality (lower = more opportunity)
    if (analysis.overallScore < 50) {
      score += 40;
      reasons.push('Low overall quality score');
    } else if (analysis.overallScore < 70) {
      score += 20;
      reasons.push('Moderate quality score with room for improvement');
    }
    
    // Score based on usage (higher usage = more impact)
    if (template.usageCount >= 20) {
      score += 30;
      reasons.push('High usage template');
    } else if (template.usageCount >= 10) {
      score += 15;
      reasons.push('Moderate usage');
    }
    
    // Score based on specific weaknesses
    if (analysis.clarity < 60) {
      score += 15;
      reasons.push('Clarity needs improvement');
    }
    if (analysis.specificity < 60) {
      score += 15;
      reasons.push('Could be more specific');
    }
    if (analysis.structureQuality < 60) {
      score += 15;
      reasons.push('Structure could be improved');
    }
    
    // Bonus for never optimized
    if (!template.isOptimized) {
      score += 10;
      reasons.push('Never been optimized');
    }
    
    return { template, score, reasons };
  });
  
  return candidates
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

const promptSelfOptimizer = {
  analyzePrompt,
  optimizePromptFromAnalysis,
  analyzeUserFeedback,
  createABTest,
  updateABTestResult,
  evaluateABTest,
  getABTestVariant,
  calculatePromptStats,
  autoOptimize,
  compareOptimization,
  iterativeOptimize,
  optimizeWithLearning,
  extractLearningPatterns,
  generateABTestVariant,
  suggestBestPractices,
  quickAnalyze,
  // New functions
  generateOptimizationRecommendations,
  batchOptimizeTemplates,
  createOptimizationHistoryEntry,
  calculateOptimizationImprovement,
  getTopOptimizationCandidates,
};

export default promptSelfOptimizer;
