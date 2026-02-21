/**
 * Feature Router - Intelligent Feature Routing System
 * 
 * Detects user intent from natural language input and routes to appropriate feature pages.
 * Supports both rule-based and LLM-based routing strategies.
 */

import type {
  FeatureNavigationContext,
  FeatureRoute,
  FeatureRouteResult,
  FeatureRoutingSettings,
  LLMRouteResult,
} from '@/types/routing/feature-router';
import { FEATURE_ROUTES, getEnabledFeatureRoutes } from './feature-routes-config';
import { storeFeatureNavigationContext } from './feature-navigation-context';
import { loggers } from '@/lib/logger';

const log = loggers.ai;

/**
 * Calculate pattern match score for a feature
 */
function calculatePatternScore(
  message: string,
  patterns: { chinese: RegExp[]; english: RegExp[] },
  keywords: { chinese: string[]; english: string[] }
): { score: number; matched: string[] } {
  const lowerMessage = message.toLowerCase();
  const matched: string[] = [];
  let patternMatches = 0;
  let keywordMatches = 0;

  // Check pattern matches
  const allPatterns = [...patterns.chinese, ...patterns.english];
  for (const pattern of allPatterns) {
    const match = message.match(pattern);
    if (match) {
      patternMatches++;
      matched.push(match[0]);
    }
  }

  // Check keyword matches
  const allKeywords = [...keywords.chinese, ...keywords.english];
  for (const keyword of allKeywords) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      keywordMatches++;
      if (!matched.includes(keyword)) {
        matched.push(keyword);
      }
    }
  }

  // Calculate weighted score
  // Pattern matches are weighted more heavily (0.7) than keyword matches (0.3)
  const patternScore = allPatterns.length > 0 
    ? Math.min(patternMatches / Math.min(allPatterns.length, 2), 1) * 0.7 
    : 0;
  const keywordScore = allKeywords.length > 0 
    ? Math.min(keywordMatches / Math.min(allKeywords.length, 3), 1) * 0.3 
    : 0;

  const score = patternScore + keywordScore;

  return { score, matched };
}

/**
 * Detect feature intent using rule-based pattern matching
 */
export function detectFeatureIntentRuleBased(
  message: string,
  settings: Partial<FeatureRoutingSettings> = {}
): FeatureRouteResult {
  const disabledRoutes = settings.disabledRoutes || [];
  const confidenceThreshold = settings.confidenceThreshold ?? 0.5;
  
  // Get enabled feature routes (excluding chat which is fallback)
  const enabledRoutes = getEnabledFeatureRoutes(disabledRoutes);
  
  // Calculate scores for each feature
  const scores: Array<{
    feature: FeatureRoute;
    score: number;
    matched: string[];
  }> = [];

  for (const route of enabledRoutes) {
    const { score, matched } = calculatePatternScore(
      message,
      route.patterns,
      route.keywords
    );
    
    if (score > 0) {
      scores.push({ feature: route, score, matched });
    }
  }

  // Sort by score (descending) and priority (descending for ties)
  scores.sort((a, b) => {
    if (Math.abs(a.score - b.score) < 0.05) {
      return b.feature.priority - a.feature.priority;
    }
    return b.score - a.score;
  });

  // Get the best match
  const bestMatch = scores[0];
  
  if (!bestMatch || bestMatch.score < confidenceThreshold) {
    return {
      detected: false,
      feature: null,
      confidence: 0,
      matchedPatterns: [],
      reason: 'No feature intent detected',
      reasonZh: '未检测到功能意图',
      alternatives: [],
    };
  }

  // Get alternatives (other matches with reasonable scores)
  const alternatives = scores
    .slice(1, 4)
    .filter(s => s.score >= confidenceThreshold * 0.6)
    .map(s => ({
      feature: s.feature,
      confidence: s.score,
    }));

  return {
    detected: true,
    feature: bestMatch.feature,
    confidence: bestMatch.score,
    matchedPatterns: bestMatch.matched,
    reason: `Detected ${bestMatch.feature.name} intent based on: ${bestMatch.matched.slice(0, 3).join(', ')}`,
    reasonZh: `基于以下内容检测到${bestMatch.feature.nameZh}意图：${bestMatch.matched.slice(0, 3).join('、')}`,
    alternatives,
  };
}

/**
 * LLM Router Prompt for intent classification
 */
const LLM_FEATURE_ROUTER_PROMPT = `You are an intelligent intent classifier that determines which feature page best matches a user's request.

Available features:
- video-studio: Video creation, editing, screen recording, AI video generation
- image-studio: Image generation, editing, AI art, photo manipulation
- designer: Web page design, UI components, frontend development
- ppt: Presentation/slides creation, PowerPoint generation
- academic: Academic paper search, research, citations, literature review
- workflows: Workflow automation, process design, task automation
- skills: AI skills management
- projects: Project management
- settings: Application settings
- git: Git repository management
- observability: Agent execution monitoring
- chat: General conversation (default, use when no specific feature matches)

Analyze the user's message and respond with ONLY a JSON object (no markdown, no explanation):
{
  "featureId": "video-studio" | "image-studio" | "designer" | "ppt" | "academic" | "workflows" | "skills" | "projects" | "settings" | "git" | "observability" | "chat",
  "confidence": 0.0 to 1.0,
  "reasoning": "Brief explanation of why this feature was chosen",
  "isAmbiguous": true | false
}

Rules:
1. Choose "chat" if the request is general conversation or doesn't clearly match any feature
2. High confidence (>0.8) means the intent is very clear
3. Set isAmbiguous to true if multiple features could apply
4. Consider both Chinese and English input`;

/**
 * Detect feature intent using LLM-based classification
 */
export async function detectFeatureIntentWithLLM(
  message: string,
  apiKey: string,
  options?: {
    provider?: 'openai' | 'anthropic' | 'google';
    model?: string;
    baseURL?: string;
  }
): Promise<LLMRouteResult> {
  const provider = options?.provider || 'openai';
  const model = options?.model || 'gpt-4o-mini';
  
  try {
    let response: Response;
    
    if (provider === 'openai') {
      const baseURL = options?.baseURL || 'https://api.openai.com/v1';
      response = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: LLM_FEATURE_ROUTER_PROMPT },
            { role: 'user', content: message },
          ],
          temperature: 0.1,
          max_tokens: 200,
        }),
      });
    } else if (provider === 'anthropic') {
      const baseURL = options?.baseURL || 'https://api.anthropic.com/v1';
      response = await fetch(`${baseURL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model || 'claude-3-haiku-20240307',
          max_tokens: 200,
          system: LLM_FEATURE_ROUTER_PROMPT,
          messages: [{ role: 'user', content: message }],
        }),
      });
    } else if (provider === 'google') {
      const baseURL = options?.baseURL || 'https://generativelanguage.googleapis.com/v1beta';
      response = await fetch(
        `${baseURL}/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ 
              parts: [{ text: `${LLM_FEATURE_ROUTER_PROMPT}\n\nUser message: ${message}` }] 
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
          }),
        }
      );
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    if (!response.ok) {
      throw new Error(`LLM request failed: ${response.statusText}`);
    }

    const data = await response.json();
    let content: string;
    
    if (provider === 'openai') {
      content = data.choices?.[0]?.message?.content || '';
    } else if (provider === 'anthropic') {
      content = data.content?.[0]?.text || '';
    } else {
      content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in LLM response');
    }

    const result = JSON.parse(jsonMatch[0]) as LLMRouteResult;
    return result;
  } catch (error) {
    log.warn('LLM feature routing failed', { error });
    // Fallback to default
    return {
      featureId: 'chat',
      confidence: 0,
      reasoning: 'LLM routing failed, falling back to chat',
      isAmbiguous: true,
    };
  }
}

/**
 * Hybrid routing: Rule-based first, LLM for ambiguous cases
 */
export async function detectFeatureIntentHybrid(
  message: string,
  settings: Partial<FeatureRoutingSettings> = {},
  llmConfig?: {
    apiKey: string;
    provider?: 'openai' | 'anthropic' | 'google';
    model?: string;
    baseURL?: string;
  }
): Promise<FeatureRouteResult> {
  // First try rule-based
  const ruleResult = detectFeatureIntentRuleBased(message, settings);
  
  // If high confidence or no LLM config, return rule-based result
  if (ruleResult.confidence >= 0.7 || !llmConfig?.apiKey) {
    return ruleResult;
  }
  
  // If ambiguous (has alternatives or low confidence), try LLM
  if (ruleResult.detected && (ruleResult.alternatives.length > 0 || ruleResult.confidence < 0.5)) {
    try {
      const llmResult = await detectFeatureIntentWithLLM(
        message,
        llmConfig.apiKey,
        llmConfig
      );
      
      // If LLM has higher confidence, use its result
      if (llmResult.confidence > ruleResult.confidence && llmResult.featureId !== 'chat') {
        const feature = FEATURE_ROUTES.find(r => r.id === llmResult.featureId);
        if (feature) {
          return {
            detected: true,
            feature,
            confidence: llmResult.confidence,
            matchedPatterns: [],
            reason: llmResult.reasoning,
            reasonZh: llmResult.reasoning,
            alternatives: ruleResult.alternatives,
          };
        }
      }
    } catch (error) {
      log.warn('Hybrid routing LLM fallback failed', { error });
    }
  }
  
  return ruleResult;
}

/**
 * Main feature intent detection function
 */
export async function detectFeatureIntent(
  message: string,
  settings: FeatureRoutingSettings,
  llmConfig?: {
    apiKey: string;
    provider?: 'openai' | 'anthropic' | 'google';
    model?: string;
    baseURL?: string;
  }
): Promise<FeatureRouteResult> {
  if (!settings.enabled) {
    return {
      detected: false,
      feature: null,
      confidence: 0,
      matchedPatterns: [],
      reason: 'Feature routing is disabled',
      reasonZh: '功能路由已禁用',
      alternatives: [],
    };
  }

  switch (settings.routingMode) {
    case 'llm-based':
      if (llmConfig?.apiKey) {
        const llmResult = await detectFeatureIntentWithLLM(
          message,
          llmConfig.apiKey,
          llmConfig
        );
        if (llmResult.featureId !== 'chat' && llmResult.confidence >= settings.confidenceThreshold) {
          const feature = FEATURE_ROUTES.find(r => r.id === llmResult.featureId);
          if (feature) {
            return {
              detected: true,
              feature,
              confidence: llmResult.confidence,
              matchedPatterns: [],
              reason: llmResult.reasoning,
              reasonZh: llmResult.reasoning,
              alternatives: [],
            };
          }
        }
      }
      // Fallback to rule-based if LLM fails or returns chat
      return detectFeatureIntentRuleBased(message, settings);
      
    case 'hybrid':
      return detectFeatureIntentHybrid(message, settings, llmConfig);
      
    case 'rule-based':
    default:
      return detectFeatureIntentRuleBased(message, settings);
  }
}

/**
 * Quick check if message might trigger feature routing
 * Used for performance optimization - skip full detection if clearly a chat message
 */
export function mightTriggerFeatureRouting(message: string): boolean {
  // Quick check for common feature-related keywords
  const quickPatterns = [
    // Creation
    /创作|制作|生成|设计|画|做|create|make|generate|design|draw|build/i,
    // Features
    /视频|图片|图像|ppt|演示|论文|工作流|网页|备考|复习|速过|速学|教材|刷题|错题|video|image|picture|presentation|paper|workflow|webpage|exam|review|textbook|quiz|practice/i,
    // Actions
    /打开|进入|去|跳转|open|go to|navigate|switch to/i,
  ];
  
  return quickPatterns.some(pattern => pattern.test(message));
}

/**
 * Build navigation URL with optional context
 */
export function buildFeatureNavigationUrl(
  feature: FeatureRoute,
  context?: ({ message?: string } & Partial<FeatureNavigationContext> & Record<string, unknown>)
): string {
  const url = new URL(feature.path, 'http://localhost');
  
  // Add default params
  if (feature.defaultParams) {
    for (const [key, value] of Object.entries(feature.defaultParams)) {
      url.searchParams.set(key, value);
    }
  }
  
  // If feature supports carrying context, store it
  if (feature.carryContext && context?.message) {
    const normalizedSpeedPassContext = (() => {
      const nested = context.speedpassContext ?? {};
      const merged = {
        textbookId:
          nested.textbookId ??
          (typeof context.textbookId === 'string' ? context.textbookId : undefined),
        availableTimeMinutes:
          nested.availableTimeMinutes ??
          (typeof context.availableTimeMinutes === 'number' ? context.availableTimeMinutes : undefined),
        targetScore:
          nested.targetScore ??
          (typeof context.targetScore === 'number' ? context.targetScore : undefined),
        examDate:
          nested.examDate ??
          (typeof context.examDate === 'string' ? context.examDate : undefined),
        recommendedMode:
          nested.recommendedMode ??
          (context.recommendedMode === 'extreme' ||
          context.recommendedMode === 'speed' ||
          context.recommendedMode === 'comprehensive'
            ? context.recommendedMode
            : undefined),
      };
      const hasValues = Object.values(merged).some((value) => value !== undefined);
      return hasValues ? merged : undefined;
    })();

    const contextKey = storeFeatureNavigationContext({
      message: context.message,
      from: '/',
      timestamp: Date.now(),
      ...context,
      ...(normalizedSpeedPassContext
        ? {
            speedpassContext: normalizedSpeedPassContext,
            textbookId: normalizedSpeedPassContext.textbookId,
            availableTimeMinutes: normalizedSpeedPassContext.availableTimeMinutes,
            targetScore: normalizedSpeedPassContext.targetScore,
            examDate: normalizedSpeedPassContext.examDate,
            recommendedMode: normalizedSpeedPassContext.recommendedMode,
          }
        : {}),
    });
    if (contextKey) {
      url.searchParams.set('ctx', contextKey);
    }
  }
  
  return url.pathname + url.search;
}
