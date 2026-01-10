/**
 * History-based Prompt Optimizer
 * 
 * Analyzes tool call history to provide intelligent prompt suggestions,
 * optimize prompts based on past successful usage, and recommend tools
 * based on context.
 */

import type {
  ToolCallRecord,
  ToolUsageStats,
  PromptOptimizationSuggestion,
  ToolRecommendation,
} from '@/types/tool-history';

/**
 * Configuration for the history optimizer
 */
export interface HistoryOptimizerConfig {
  /** Minimum calls required to consider a pattern */
  minCallsForPattern: number;
  /** Minimum success rate to suggest a prompt */
  minSuccessRate: number;
  /** Minimum text similarity for matching */
  minSimilarity: number;
  /** Maximum suggestions to return */
  maxSuggestions: number;
  /** Weight for recency in scoring (0-1) */
  recencyWeight: number;
  /** Weight for frequency in scoring (0-1) */
  frequencyWeight: number;
  /** Weight for success rate in scoring (0-1) */
  successWeight: number;
}

const DEFAULT_CONFIG: HistoryOptimizerConfig = {
  minCallsForPattern: 2,
  minSuccessRate: 0.6,
  minSimilarity: 0.25,
  maxSuggestions: 5,
  recencyWeight: 0.3,
  frequencyWeight: 0.3,
  successWeight: 0.4,
};

/**
 * Calculate text similarity using Jaccard index on words
 */
export function calculateTextSimilarity(a: string, b: string): number {
  const normalize = (text: string) =>
    text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);

  const wordsA = new Set(normalize(a));
  const wordsB = new Set(normalize(b));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / union.size;
}

/**
 * Calculate n-gram similarity for better matching
 */
export function calculateNgramSimilarity(a: string, b: string, n: number = 3): number {
  const getNgrams = (text: string): Set<string> => {
    const normalized = text.toLowerCase().replace(/\s+/g, ' ');
    const ngrams = new Set<string>();
    for (let i = 0; i <= normalized.length - n; i++) {
      ngrams.add(normalized.slice(i, i + n));
    }
    return ngrams;
  };

  const ngramsA = getNgrams(a);
  const ngramsB = getNgrams(b);

  if (ngramsA.size === 0 || ngramsB.size === 0) return 0;

  const intersection = new Set([...ngramsA].filter(x => ngramsB.has(x)));
  const union = new Set([...ngramsA, ...ngramsB]);

  return intersection.size / union.size;
}

/**
 * Combined similarity score
 */
export function calculateCombinedSimilarity(a: string, b: string): number {
  const jaccard = calculateTextSimilarity(a, b);
  const ngram = calculateNgramSimilarity(a, b);
  return (jaccard * 0.6) + (ngram * 0.4);
}

/**
 * Extract common patterns from prompts
 */
export function extractPromptPatterns(prompts: string[]): string[] {
  if (prompts.length < 2) return [];

  const patterns: string[] = [];
  const wordFrequency = new Map<string, number>();

  // Count word frequency across all prompts
  for (const prompt of prompts) {
    const words = prompt.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const seen = new Set<string>();
    for (const word of words) {
      if (!seen.has(word)) {
        seen.add(word);
        wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
      }
    }
  }

  // Find words that appear in most prompts
  const threshold = prompts.length * 0.6;
  const commonWords = [...wordFrequency.entries()]
    .filter(([, count]) => count >= threshold)
    .map(([word]) => word);

  if (commonWords.length > 0) {
    patterns.push(commonWords.join(' '));
  }

  return patterns;
}

/**
 * Get prompt suggestions for a specific tool based on history
 */
export function getPromptSuggestions(
  toolId: string,
  currentInput: string,
  history: ToolCallRecord[],
  stats?: ToolUsageStats,
  config: Partial<HistoryOptimizerConfig> = {}
): PromptOptimizationSuggestion[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const suggestions: PromptOptimizationSuggestion[] = [];

  // Filter history for this tool
  const toolHistory = history.filter(r => r.toolId === toolId);
  if (toolHistory.length === 0) return [];

  // Get successful calls
  const successfulCalls = toolHistory.filter(r => r.result === 'success');

  // Suggestion type 1: Frequent successful prompts from stats
  if (stats?.frequentPrompts) {
    for (const fp of stats.frequentPrompts) {
      if (fp.count >= cfg.minCallsForPattern && fp.successRate >= cfg.minSuccessRate) {
        suggestions.push({
          toolId,
          suggestedPrompt: fp.prompt,
          confidence: Math.min(0.9, fp.successRate * (1 + Math.log10(fp.count) / 5)),
          basedOnCalls: fp.count,
          successRate: fp.successRate,
          reason: 'frequent',
        });
      }
    }
  }

  // Suggestion type 2: Similar prompts to current input
  if (currentInput && currentInput.length > 10) {
    const similarCalls = successfulCalls
      .map(record => ({
        record,
        similarity: calculateCombinedSimilarity(currentInput, record.prompt),
      }))
      .filter(({ similarity }) => similarity >= cfg.minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    for (const { record, similarity } of similarCalls) {
      suggestions.push({
        toolId,
        suggestedPrompt: record.prompt,
        confidence: similarity,
        basedOnCalls: 1,
        successRate: 1,
        reason: 'similar',
      });
    }
  }

  // Suggestion type 3: Most recent successful prompts
  const recentSuccessful = successfulCalls.slice(0, 3);
  for (const record of recentSuccessful) {
    const existing = suggestions.find(s => 
      calculateCombinedSimilarity(s.suggestedPrompt, record.prompt) > 0.8
    );
    if (!existing) {
      suggestions.push({
        toolId,
        suggestedPrompt: record.prompt,
        confidence: 0.5,
        basedOnCalls: 1,
        successRate: 1,
        reason: 'recent',
      });
    }
  }

  // Deduplicate and sort
  const seen = new Set<string>();
  return suggestions
    .filter(s => {
      const key = s.suggestedPrompt.slice(0, 100).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, cfg.maxSuggestions);
}

/**
 * Find similar successful calls to a given prompt
 */
export function findSimilarSuccessfulCalls(
  currentPrompt: string,
  history: ToolCallRecord[],
  minSimilarity: number = 0.25,
  limit: number = 5
): Array<{ record: ToolCallRecord; similarity: number }> {
  const successfulCalls = history.filter(r => r.result === 'success');

  return successfulCalls
    .map(record => ({
      record,
      similarity: calculateCombinedSimilarity(currentPrompt, record.prompt),
    }))
    .filter(({ similarity }) => similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Generate an optimized prompt based on successful examples
 */
export function generateOptimizedPrompt(
  toolId: string,
  userIntent: string,
  successfulExamples: ToolCallRecord[]
): string {
  if (successfulExamples.length === 0) return userIntent;

  // Find the most relevant example
  const bestMatch = successfulExamples
    .map(ex => ({
      example: ex,
      similarity: calculateCombinedSimilarity(userIntent, ex.prompt),
    }))
    .sort((a, b) => b.similarity - a.similarity)[0];

  if (!bestMatch || bestMatch.similarity < 0.2) {
    // No good match, return original intent
    return userIntent;
  }

  // If similarity is high, suggest using the successful prompt
  if (bestMatch.similarity > 0.7) {
    return bestMatch.example.prompt;
  }

  // Otherwise, return the user's intent (could enhance with LLM in future)
  return userIntent;
}

/**
 * Get tool recommendations based on current input
 */
export function getToolRecommendations(
  currentInput: string,
  history: ToolCallRecord[],
  stats: Record<string, ToolUsageStats>,
  config: Partial<HistoryOptimizerConfig> = {}
): ToolRecommendation[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  if (!currentInput || currentInput.length < 5) {
    // Return most frequent tools
    return Object.values(stats)
      .sort((a, b) => b.totalCalls - a.totalCalls)
      .slice(0, 5)
      .map(s => ({
        toolId: s.toolId,
        toolType: s.toolType,
        toolName: s.toolName,
        serverId: s.serverId,
        serverName: s.serverName,
        score: 0.5,
        reason: 'frequent' as const,
      }));
  }

  const recommendations: ToolRecommendation[] = [];
  const toolScores = new Map<string, { 
    score: number; 
    samplePrompt?: string;
    reasons: Set<string>;
  }>();

  // Score based on prompt similarity
  for (const record of history.slice(0, 200)) {
    const similarity = calculateCombinedSimilarity(currentInput, record.prompt);
    if (similarity >= cfg.minSimilarity) {
      const existing = toolScores.get(record.toolId);
      const successBonus = record.result === 'success' ? 0.1 : 0;
      const newScore = similarity + successBonus;
      
      if (!existing || existing.score < newScore) {
        toolScores.set(record.toolId, {
          score: newScore,
          samplePrompt: record.prompt,
          reasons: new Set(['similar_prompt']),
        });
      }
    }
  }

  // Boost recently used tools
  const now = Date.now();
  for (const [toolId, toolStats] of Object.entries(stats)) {
    if (toolStats.lastUsedAt) {
      const ageHours = (now - toolStats.lastUsedAt.getTime()) / 3600000;
      if (ageHours < 24) {
        const existing = toolScores.get(toolId);
        const recencyBonus = 0.2 * Math.exp(-ageHours / 12);
        if (existing) {
          existing.score += recencyBonus;
          existing.reasons.add('recent');
        } else {
          toolScores.set(toolId, {
            score: recencyBonus,
            reasons: new Set(['recent']),
          });
        }
      }
    }
  }

  // Build recommendations
  for (const [toolId, data] of toolScores.entries()) {
    const toolStats = stats[toolId];
    if (toolStats) {
      const primaryReason = data.reasons.has('similar_prompt') 
        ? 'similar_prompt' 
        : data.reasons.has('recent') 
          ? 'recent' 
          : 'frequent';

      recommendations.push({
        toolId,
        toolType: toolStats.toolType,
        toolName: toolStats.toolName,
        serverId: toolStats.serverId,
        serverName: toolStats.serverName,
        score: Math.min(data.score, 1),
        reason: primaryReason,
        samplePrompt: data.samplePrompt,
      });
    }
  }

  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, cfg.maxSuggestions);
}

/**
 * Analyze tool usage patterns
 */
export interface UsagePatternAnalysis {
  /** Most common time of day for tool usage */
  peakUsageHour?: number;
  /** Tools frequently used together */
  coUsedTools: Array<{ toolId: string; frequency: number }>;
  /** Average success rate trend */
  successRateTrend: 'improving' | 'declining' | 'stable';
  /** Common prompt patterns */
  commonPatterns: string[];
}

export function analyzeUsagePatterns(
  toolId: string,
  history: ToolCallRecord[]
): UsagePatternAnalysis {
  const toolHistory = history.filter(r => r.toolId === toolId);
  
  // Analyze peak usage hour
  const hourCounts = new Array(24).fill(0);
  for (const record of toolHistory) {
    const hour = new Date(record.calledAt).getHours();
    hourCounts[hour]++;
  }
  const peakUsageHour = hourCounts.indexOf(Math.max(...hourCounts));

  // Analyze co-used tools (used within 5 minutes of each other)
  const coUsageMap = new Map<string, number>();
  for (let i = 0; i < toolHistory.length; i++) {
    const current = toolHistory[i];
    for (let j = i - 5; j <= i + 5 && j < history.length; j++) {
      if (j < 0 || j === i) continue;
      const other = history[j];
      if (other.toolId === toolId) continue;
      
      const timeDiff = Math.abs(
        new Date(current.calledAt).getTime() - new Date(other.calledAt).getTime()
      );
      if (timeDiff < 300000) { // 5 minutes
        coUsageMap.set(other.toolId, (coUsageMap.get(other.toolId) || 0) + 1);
      }
    }
  }

  const coUsedTools = [...coUsageMap.entries()]
    .map(([toolId, frequency]) => ({ toolId, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5);

  // Analyze success rate trend
  let successRateTrend: 'improving' | 'declining' | 'stable' = 'stable';
  if (toolHistory.length >= 10) {
    const recentHalf = toolHistory.slice(0, Math.floor(toolHistory.length / 2));
    const olderHalf = toolHistory.slice(Math.floor(toolHistory.length / 2));
    
    const recentRate = recentHalf.filter(r => r.result === 'success').length / recentHalf.length;
    const olderRate = olderHalf.filter(r => r.result === 'success').length / olderHalf.length;
    
    if (recentRate - olderRate > 0.1) successRateTrend = 'improving';
    else if (olderRate - recentRate > 0.1) successRateTrend = 'declining';
  }

  // Extract common patterns from successful prompts
  const successfulPrompts = toolHistory
    .filter(r => r.result === 'success')
    .map(r => r.prompt);
  const commonPatterns = extractPromptPatterns(successfulPrompts);

  return {
    peakUsageHour: toolHistory.length > 0 ? peakUsageHour : undefined,
    coUsedTools,
    successRateTrend,
    commonPatterns,
  };
}

/**
 * Score a prompt for a given tool based on historical patterns
 */
export function scorePromptQuality(
  prompt: string,
  toolId: string,
  history: ToolCallRecord[],
  _stats?: ToolUsageStats
): { score: number; factors: Record<string, number>; suggestions: string[] } {
  const factors: Record<string, number> = {};
  const suggestions: string[] = [];

  const toolHistory = history.filter(r => r.toolId === toolId);
  const successfulPrompts = toolHistory.filter(r => r.result === 'success').map(r => r.prompt);
  const failedPrompts = toolHistory.filter(r => r.result === 'error').map(r => r.prompt);

  // Factor 1: Length appropriateness
  const avgSuccessLength = successfulPrompts.length > 0
    ? successfulPrompts.reduce((sum, p) => sum + p.length, 0) / successfulPrompts.length
    : 100;
  
  const lengthRatio = prompt.length / avgSuccessLength;
  factors.lengthScore = lengthRatio > 0.5 && lengthRatio < 2 ? 0.8 : 0.4;
  
  if (prompt.length < avgSuccessLength * 0.3) {
    suggestions.push('Consider adding more detail to your prompt');
  }

  // Factor 2: Similarity to successful prompts
  if (successfulPrompts.length > 0) {
    const similarities = successfulPrompts.map(sp => calculateCombinedSimilarity(prompt, sp));
    factors.similarityToSuccess = Math.max(...similarities);
    
    if (factors.similarityToSuccess < 0.2) {
      suggestions.push('This prompt differs significantly from previously successful ones');
    }
  } else {
    factors.similarityToSuccess = 0.5; // Neutral if no history
  }

  // Factor 3: Dissimilarity from failed prompts
  if (failedPrompts.length > 0) {
    const failSimilarities = failedPrompts.map(fp => calculateCombinedSimilarity(prompt, fp));
    const maxFailSimilarity = Math.max(...failSimilarities);
    factors.dissimilarityFromFailed = 1 - maxFailSimilarity;
    
    if (maxFailSimilarity > 0.7) {
      suggestions.push('This prompt is similar to one that previously failed');
    }
  } else {
    factors.dissimilarityFromFailed = 0.8;
  }

  // Factor 4: Contains common successful patterns
  const patterns = extractPromptPatterns(successfulPrompts);
  if (patterns.length > 0) {
    const patternWords = patterns[0].split(' ');
    const promptLower = prompt.toLowerCase();
    const matchedPatterns = patternWords.filter(w => promptLower.includes(w)).length;
    factors.patternMatch = patternWords.length > 0 ? matchedPatterns / patternWords.length : 0.5;
  } else {
    factors.patternMatch = 0.5;
  }

  // Calculate overall score
  const score = (
    factors.lengthScore * 0.15 +
    factors.similarityToSuccess * 0.35 +
    factors.dissimilarityFromFailed * 0.25 +
    factors.patternMatch * 0.25
  );

  return { score: Math.min(Math.max(score, 0), 1), factors, suggestions };
}
