'use client';

/**
 * Auto Router - intelligent model selection based on task complexity
 * Routes queries to appropriate model tiers: fast, balanced, powerful, reasoning
 * 
 * Features:
 * - Task complexity classification (simple, moderate, complex, expert)
 * - Multi-tier model selection with reasoning tier
 * - Provider availability and capability checking
 * - Agent mode integration
 * - Context-aware routing
 * - Cost estimation and optimization
 * - Fallback mechanisms with priority
 * - Vision, tool, and reasoning capability detection
 * - Routing modes: rule-based, LLM-based, hybrid
 * - Caching and statistics
 */

import { useCallback, useMemo } from 'react';
import { useSettingsStore } from '@/stores';
import type { ProviderName } from '@/types/provider';
import { getModelConfig } from '@/types/provider';
import type { AgentModeType } from '@/types/agent/agent-mode';
import type { 
  TaskClassification, 
  ModelSelection, 
  RoutingMode, 
  RoutingContext,
  ModelTier,
  TaskCategory,
  TaskComplexity,
} from '@/types/provider/auto-router';

/**
 * Apply agent mode hints to task classification
 * Adjusts classification based on the active agent mode
 */
function applyAgentModeHints(
  classification: TaskClassification,
  agentMode: AgentModeType
): TaskClassification {
  const modeHints: Record<AgentModeType, Partial<TaskClassification>> = {
    'general': {},
    'web-design': { requiresCreativity: true, requiresCoding: true, category: 'coding' },
    'code-gen': { requiresCoding: true, category: 'coding' },
    'data-analysis': { requiresReasoning: true, category: 'analysis' },
    'writing': { requiresCreativity: true, category: 'creative' },
    'research': { requiresReasoning: true, category: 'research' },
    'ppt-generation': { requiresCreativity: true, category: 'creative' },
    'workflow': { requiresTools: true, requiresReasoning: true },
    'academic': { requiresReasoning: true, category: 'research' },
    'custom': {},
  };

  const hints = modeHints[agentMode] || {};
  return { ...classification, ...hints };
}

/**
 * Check if a model supports vision based on provider config
 */
function supportsVision(provider: ProviderName, model: string): boolean {
  const config = getModelConfig(provider, model);
  return config?.supportsVision ?? false;
}

import { supportsToolCalling, getProviderModel } from '../core/client';
import { generateText } from 'ai';
import { 
  getCachedRouting, 
  cacheRoutingDecision, 
  recordRoutingDecision,
  estimateCost,
} from './routing-cache';

// Re-export types for backward compatibility
export type { TaskClassification, ModelSelection, RoutingMode };

// Router model configuration
export interface RouterModelConfig {
  provider: ProviderName;
  model: string;
  priority?: number;
}

// Router health state
export interface RouterHealthState {
  provider: ProviderName;
  model: string;
  isHealthy: boolean;
  lastCheckTime: number;
  failureCount: number;
  avgLatency: number;
  successRate: number;
}

// Default small models for LLM-based routing (ordered by priority)
const DEFAULT_ROUTER_MODELS: RouterModelConfig[] = [
  { provider: 'groq', model: 'llama-3.1-8b-instant', priority: 1 },
  { provider: 'google', model: 'gemini-2.0-flash-exp', priority: 2 },
  { provider: 'openai', model: 'gpt-4o-mini', priority: 3 },
  { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', priority: 4 },
  { provider: 'deepseek', model: 'deepseek-chat', priority: 5 },
];

// ============================================================================
// ROUTER HEALTH MANAGER
// ============================================================================

class RouterHealthManager {
  private healthStates: Map<string, RouterHealthState> = new Map();
  private readonly healthCheckInterval = 60000; // 1 minute
  private readonly maxFailures = 3;
  private readonly recoveryTime = 300000; // 5 minutes

  private getKey(provider: ProviderName, model: string): string {
    return `${provider}:${model}`;
  }

  getHealth(provider: ProviderName, model: string): RouterHealthState {
    const key = this.getKey(provider, model);
    let state = this.healthStates.get(key);
    
    if (!state) {
      state = {
        provider,
        model,
        isHealthy: true,
        lastCheckTime: 0,
        failureCount: 0,
        avgLatency: 0,
        successRate: 1,
      };
      this.healthStates.set(key, state);
    }
    
    // Auto-recover after recovery time
    if (!state.isHealthy && Date.now() - state.lastCheckTime > this.recoveryTime) {
      state.isHealthy = true;
      state.failureCount = 0;
    }
    
    return state;
  }

  recordSuccess(provider: ProviderName, model: string, latencyMs: number): void {
    const key = this.getKey(provider, model);
    const state = this.getHealth(provider, model);
    
    state.lastCheckTime = Date.now();
    state.failureCount = Math.max(0, state.failureCount - 1);
    state.isHealthy = true;
    
    // Update average latency (exponential moving average)
    if (state.avgLatency === 0) {
      state.avgLatency = latencyMs;
    } else {
      state.avgLatency = state.avgLatency * 0.8 + latencyMs * 0.2;
    }
    
    // Update success rate
    const totalAttempts = Math.max(1, state.successRate > 0 ? 10 : 1);
    state.successRate = (state.successRate * (totalAttempts - 1) + 1) / totalAttempts;
    
    this.healthStates.set(key, state);
  }

  recordFailure(provider: ProviderName, model: string): void {
    const key = this.getKey(provider, model);
    const state = this.getHealth(provider, model);
    
    state.lastCheckTime = Date.now();
    state.failureCount++;
    
    if (state.failureCount >= this.maxFailures) {
      state.isHealthy = false;
    }
    
    // Update success rate
    const totalAttempts = Math.max(1, state.successRate > 0 ? 10 : 1);
    state.successRate = (state.successRate * (totalAttempts - 1)) / totalAttempts;
    
    this.healthStates.set(key, state);
  }

  isHealthy(provider: ProviderName, model: string): boolean {
    return this.getHealth(provider, model).isHealthy;
  }

  getBestRouter(
    availableRouters: RouterModelConfig[],
    enabledProviders: ProviderName[]
  ): RouterModelConfig | null {
    // Filter by enabled providers and health
    const healthyRouters = availableRouters.filter(r => 
      enabledProviders.includes(r.provider) && this.isHealthy(r.provider, r.model)
    );
    
    if (healthyRouters.length === 0) {
      // Fallback: try any enabled router even if unhealthy
      const enabledRouters = availableRouters.filter(r => 
        enabledProviders.includes(r.provider)
      );
      return enabledRouters[0] || null;
    }
    
    // Sort by: priority (lower first), then latency (lower first), then success rate (higher first)
    healthyRouters.sort((a, b) => {
      const stateA = this.getHealth(a.provider, a.model);
      const stateB = this.getHealth(b.provider, b.model);
      
      // Priority first
      const priorityDiff = (a.priority || 99) - (b.priority || 99);
      if (priorityDiff !== 0) return priorityDiff;
      
      // Success rate (higher is better)
      const successDiff = stateB.successRate - stateA.successRate;
      if (Math.abs(successDiff) > 0.1) return successDiff;
      
      // Latency (lower is better)
      return stateA.avgLatency - stateB.avgLatency;
    });
    
    return healthyRouters[0];
  }

  reset(): void {
    this.healthStates.clear();
  }
}

// Global router health manager
const routerHealthManager = new RouterHealthManager();

export { routerHealthManager };

// LLM routing prompt
const LLM_ROUTER_PROMPT = `You are a task router that classifies user queries to select the best AI model tier.

Analyze the query and respond with ONLY a JSON object (no markdown, no explanation):
{
  "complexity": "simple" | "moderate" | "complex",
  "category": "general" | "coding" | "analysis" | "creative" | "research" | "conversation",
  "requiresReasoning": boolean,
  "requiresTools": boolean,
  "requiresVision": boolean,
  "requiresCreativity": boolean,
  "requiresCoding": boolean,
  "recommendedTier": "fast" | "balanced" | "powerful"
}

Tier guidelines:
- fast: Simple questions, translations, summaries, greetings, factual queries
- balanced: Most tasks, general coding, explanations, moderate complexity
- powerful: Complex reasoning, multi-step problems, advanced coding, analysis, research

Query to classify:`;

// ============================================================================
// ENHANCED PATTERN DETECTION SYSTEM
// ============================================================================

// Expert-level patterns (require most capable models)
const EXPERT_PATTERNS = [
  /prove.*theorem|mathematical.*proof|formal.*verification/i,
  /architect.*distributed|design.*scalable.*system/i,
  /security.*audit|penetration.*test|vulnerability.*analysis/i,
  /machine.*learning.*model|train.*neural.*network|deep.*learning/i,
  /compiler.*design|language.*implementation|parser.*generator/i,
  /concurrent.*programming|lock-free|memory.*model/i,
  /cryptograph|encryption.*algorithm|secure.*protocol/i,
  // Chinese expert patterns
  /设计.*分布式|架构.*微服务|高可用.*系统/i,
  /机器学习|深度学习|神经网络.*训练/i,
  /数学证明|形式化验证|定理.*证明/i,
];

// Patterns to detect task complexity
const COMPLEX_PATTERNS = [
  /write.*code|implement|create.*function|build.*app/i,
  /analyze.*data|research|investigate/i,
  /explain.*in.*detail|comprehensive|thorough/i,
  /multi-step|step.*by.*step/i,
  /compare.*and.*contrast|pros.*and.*cons/i,
  /debug|fix.*bug|troubleshoot/i,
  /architect|design.*system/i,
  /refactor|optimize|improve.*performance/i,
  /algorithm|data.*structure|complexity.*analysis/i,
  /integrate|migration|upgrade.*system/i,
  /test.*coverage|unit.*test|integration.*test/i,
  // Chinese complex patterns
  /编写.*代码|实现.*功能|开发.*应用/i,
  /分析.*数据|研究|调查/i,
  /详细.*解释|全面|深入/i,
  /调试|修复.*bug|排查.*问题/i,
  /重构|优化|提升.*性能/i,
];

const REASONING_PATTERNS = [
  /why|how.*does|explain.*reasoning/i,
  /prove|derive|calculate/i,
  /logic|mathematical|theorem/i,
  /solve.*problem|figure.*out/i,
  /think.*through|reason.*about/i,
  /step.*by.*step.*reasoning/i,
  /chain.*of.*thought/i,
  /deduce|infer|conclude.*from/i,
  /analyze.*implications|evaluate.*trade-?offs/i,
  /what.*if|hypothetical|scenario.*analysis/i,
  /root.*cause|diagnose|troubleshoot.*why/i,
  /optimize.*for|balance.*between|prioritize/i,
  // Chinese reasoning patterns
  /为什么|如何.*工作|解释.*原因/i,
  /证明|推导|计算/i,
  /逻辑|数学|定理/i,
  /解决.*问题|分析.*原因/i,
  /逐步.*推理|思考.*过程/i,
];

const CODE_PATTERNS = [
  /write.*code|implement|create.*function/i,
  /debug|fix.*bug|error.*in.*code/i,
  /refactor|optimize.*code/i,
  /\bapi\b|endpoint|backend/i,
  /\bsql\b|database|query/i,
  /\bhtml\b|\bcss\b|\bjavascript\b|\btypescript\b/i,
  /\breact\b|\bvue\b|\bangular\b|\bnext\.?js\b/i,
  /\bpython\b|\bjava\b|\brust\b|\bgo\b|\bc\+\+\b/i,
  /git.*commit|pull.*request|merge.*branch/i,
  /docker|kubernetes|ci\/cd|deploy/i,
  /unit.*test|integration.*test|e2e.*test/i,
  /\borm\b|\bgraphql\b|\brest\b|\bgrpc\b/i,
  // Chinese code patterns
  /编写.*代码|实现.*函数|创建.*方法/i,
  /调试|修复.*错误|代码.*bug/i,
  /重构|优化.*代码/i,
  /接口|后端|数据库.*查询/i,
];

const SIMPLE_PATTERNS = [
  /what.*is|define|meaning.*of/i,
  /translate|convert/i,
  /summarize|tldr|brief/i,
  /yes.*or.*no|true.*or.*false/i,
  /list|enumerate/i,
  /^hi|^hello|^hey/i,
  /^thanks|^thank.*you|^ok|^okay/i,
  /how.*spell|correct.*spelling/i,
  /what.*time|what.*date|when.*is/i,
  /who.*is|where.*is|which.*is/i,
  // Chinese simple patterns
  /什么是|定义|意思/i,
  /翻译|转换/i,
  /总结|简述|概括/i,
  /是否|对不对/i,
  /列出|枚举/i,
  /^你好|^嗨|^早上好|^晚上好/i,
];

// Creative patterns
const CREATIVE_PATTERNS = [
  /write.*story|creative.*writing|poem|fiction/i,
  /brainstorm|ideas.*for|suggest/i,
  /imagine|creative|innovative/i,
  /design.*logo|create.*brand|visual.*identity/i,
  /write.*essay|compose|draft.*article/i,
  /marketing.*copy|slogan|tagline/i,
  /name.*suggestions|naming|brand.*name/i,
  /role-?play|pretend|act.*as/i,
  // Chinese creative patterns
  /写.*故事|创意.*写作|诗歌|小说/i,
  /头脑风暴|创意|建议/i,
  /想象|创新|设计/i,
  /撰写.*文章|起草|编写/i,
];

// Research patterns
const RESEARCH_PATTERNS = [
  /research|investigate|find.*information/i,
  /search.*for|look.*up|what.*latest/i,
  /sources|references|citations/i,
  /academic.*paper|scientific.*study|peer.*review/i,
  /literature.*review|state.*of.*art|survey/i,
  /fact.*check|verify.*claim|evidence/i,
  /current.*trends|market.*analysis|industry.*report/i,
  // Chinese research patterns
  /研究|调查|查找.*信息/i,
  /搜索|查询|最新/i,
  /来源|参考|引用/i,
  /学术.*论文|科学.*研究/i,
];

// Math patterns (for specialized routing)
const MATH_PATTERNS = [
  /calculate|compute|solve.*equation/i,
  /\bmath\b|mathematical|arithmetic/i,
  /integral|derivative|differential/i,
  /matrix|vector|linear.*algebra/i,
  /probability|statistics|distribution/i,
  /geometry|trigonometry|calculus/i,
  // Chinese math patterns
  /计算|求解|方程/i,
  /数学|算术|运算/i,
  /积分|微分|导数/i,
  /矩阵|向量|线性代数/i,
  /概率|统计|分布/i,
];

// Translation patterns
const TRANSLATION_PATTERNS = [
  /translate.*to|translate.*from|翻译/i,
  /in.*english|in.*chinese|in.*japanese|in.*korean/i,
  /用.*英文|用.*中文|用.*日文/i,
  /convert.*language|localize/i,
];

// Summarization patterns
const SUMMARIZATION_PATTERNS = [
  /summarize|summary|tldr|tl;dr/i,
  /brief.*overview|key.*points|main.*ideas/i,
  /condense|shorten|abstract/i,
  // Chinese
  /总结|概述|要点/i,
  /简述|摘要|精简/i,
];

/**
 * Rule-based task classification (fast, no API call)
 */
function classifyTaskRuleBased(input: string): TaskClassification {
  const isComplex = COMPLEX_PATTERNS.some((p) => p.test(input));
  const isSimple = SIMPLE_PATTERNS.some((p) => p.test(input)) && !isComplex;
  const requiresReasoning = REASONING_PATTERNS.some((p) => p.test(input));
  const requiresCoding = CODE_PATTERNS.some((p) => p.test(input));
  const requiresCreativity = CREATIVE_PATTERNS.some((p) => p.test(input));
  const isResearch = RESEARCH_PATTERNS.some((p) => p.test(input));
  const isExpertLevel = EXPERT_PATTERNS.some((p) => p.test(input));
  const isMathTask = MATH_PATTERNS.some((p) => p.test(input));
  const isTranslation = TRANSLATION_PATTERNS.some((p) => p.test(input));
  const isSummarization = SUMMARIZATION_PATTERNS.some((p) => p.test(input));

  // Estimate complexity based on input length and patterns
  const wordCount = input.split(/\s+/).length;
  const estimatedInputTokens = Math.ceil(wordCount * 1.3);
  const estimatedOutputTokens = Math.ceil(estimatedInputTokens * 2); // Rough estimate

  // More nuanced complexity detection
  let complexity: TaskComplexity = 'moderate';
  
  // Expert-level tasks always require complex handling
  if (isExpertLevel) {
    complexity = 'complex';
  } else if (isSimple && wordCount < 20 && !requiresCoding && !isMathTask) {
    complexity = 'simple';
  } else if (isComplex || wordCount > 100 || requiresReasoning || requiresCoding || isMathTask) {
    complexity = 'complex';
  }
  
  // Translation and summarization are typically simpler if not combined with other complex tasks
  if ((isTranslation || isSummarization) && !isComplex && !requiresCoding && !isExpertLevel) {
    complexity = 'moderate';
  }

  // Check for tool requirements
  const requiresTools = /use.*tool|search|browse|execute|fetch|call.*api/i.test(input);
  
  // Check for vision requirements
  const requiresVision = /image|picture|photo|screenshot|diagram|visual|look.*at/i.test(input);
  
  // Check for long context requirements
  const requiresLongContext = wordCount > 500 || /entire|full|complete|all.*of/i.test(input);

  // Determine category with enhanced pattern detection
  let category: TaskCategory = 'general';
  if (requiresCoding) category = 'coding';
  else if (isMathTask || requiresReasoning) category = 'analysis';
  else if (requiresCreativity) category = 'creative';
  else if (isResearch) category = 'research';
  else if (isTranslation) category = 'general'; // Translation stays general but noted
  else if (isSummarization) category = 'analysis'; // Summarization is analytical
  else if (isSimple && wordCount < 30) category = 'conversation';

  // Calculate confidence based on pattern matches
  const patternMatches = [
    isComplex, isSimple, requiresReasoning, requiresCoding, 
    requiresCreativity, isResearch, requiresTools, requiresVision,
    isExpertLevel, isMathTask, isTranslation, isSummarization
  ].filter(Boolean).length;
  const confidence = Math.min(0.95, 0.5 + patternMatches * 0.1);

  return {
    complexity,
    category,
    requiresReasoning,
    requiresTools,
    requiresVision,
    requiresCreativity,
    requiresCoding,
    requiresLongContext,
    estimatedInputTokens,
    estimatedOutputTokens,
    confidence,
  };
}

/**
 * LLM-based task classification (accurate, uses API call)
 * Now integrated with RouterHealthManager for adaptive router selection
 */
export async function classifyTaskWithLLM(
  input: string,
  routerModel: RouterModelConfig,
  apiKey: string,
  baseURL?: string
): Promise<{ classification: TaskClassification; recommendedTier: 'fast' | 'balanced' | 'powerful' | 'reasoning' }> {
  const startTime = Date.now();
  
  try {
    const model = getProviderModel(routerModel.provider, routerModel.model, apiKey, baseURL);
    
    const { text } = await generateText({
      model,
      prompt: `${LLM_ROUTER_PROMPT}\n\n"${input.slice(0, 500)}"`, // Limit input length
      temperature: 0,
    });

    // Record success with latency
    const latencyMs = Date.now() - startTime;
    routerHealthManager.recordSuccess(routerModel.provider, routerModel.model, latencyMs);

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    const wordCount = input.split(/\s+/).length;
    
    const estimatedInputTokens = Math.ceil(wordCount * 1.3);
    
    // Determine if reasoning tier is needed
    let recommendedTier = result.recommendedTier || 'balanced';
    if (result.requiresReasoning && result.complexity === 'complex') {
      recommendedTier = 'reasoning';
    }
    
    return {
      classification: {
        complexity: result.complexity || 'moderate',
        category: result.category || 'general',
        requiresReasoning: result.requiresReasoning || false,
        requiresTools: result.requiresTools || false,
        requiresVision: result.requiresVision || false,
        requiresCreativity: result.requiresCreativity || false,
        requiresCoding: result.requiresCoding || false,
        requiresLongContext: wordCount > 500,
        estimatedInputTokens,
        estimatedOutputTokens: estimatedInputTokens * 2,
        confidence: 0.85, // LLM classification is more confident
      },
      recommendedTier,
    };
  } catch (error) {
    // Record failure
    routerHealthManager.recordFailure(routerModel.provider, routerModel.model);
    
    console.warn('LLM routing failed, falling back to rule-based:', error);
    // Fallback to rule-based
    const classification = classifyTaskRuleBased(input);
    const tier = classification.complexity === 'simple' ? 'fast' :
                 classification.complexity === 'complex' ? 'powerful' : 'balanced';
    return { classification, recommendedTier: tier };
  }
}

/**
 * Hybrid task classification - combines rule-based and LLM-based routing
 * Uses rule-based for high-confidence classifications, LLM for uncertain cases
 */
export async function classifyTaskHybrid(
  input: string,
  routerModel: RouterModelConfig | null,
  apiKey: string,
  baseURL?: string,
  confidenceThreshold: number = 0.75
): Promise<{ classification: TaskClassification; recommendedTier: ModelTier; routingMethod: 'rule' | 'llm' | 'hybrid' }> {
  // First, try rule-based classification
  const ruleClassification = classifyTaskRuleBased(input);
  
  // If confidence is high enough, use rule-based result
  if (ruleClassification.confidence >= confidenceThreshold || !routerModel || !apiKey) {
    const tier: ModelTier = ruleClassification.complexity === 'simple' ? 'fast' :
                           ruleClassification.complexity === 'complex' ? 
                             (ruleClassification.requiresReasoning ? 'reasoning' : 'powerful') : 
                           'balanced';
    return {
      classification: ruleClassification,
      recommendedTier: tier,
      routingMethod: 'rule',
    };
  }
  
  // For uncertain cases, use LLM-based classification
  try {
    const llmResult = await classifyTaskWithLLM(input, routerModel, apiKey, baseURL);
    
    // Merge classifications - LLM takes precedence but keep rule-based requirements
    const mergedClassification: TaskClassification = {
      ...llmResult.classification,
      requiresTools: ruleClassification.requiresTools || llmResult.classification.requiresTools,
      requiresVision: ruleClassification.requiresVision || llmResult.classification.requiresVision,
      requiresCoding: ruleClassification.requiresCoding || llmResult.classification.requiresCoding,
      confidence: Math.max(ruleClassification.confidence, llmResult.classification.confidence),
    };
    
    return {
      classification: mergedClassification,
      recommendedTier: llmResult.recommendedTier as ModelTier,
      routingMethod: 'hybrid',
    };
  } catch {
    // Fallback to rule-based on any error
    const tier: ModelTier = ruleClassification.complexity === 'simple' ? 'fast' :
                           ruleClassification.complexity === 'complex' ? 'powerful' : 'balanced';
    return {
      classification: ruleClassification,
      recommendedTier: tier,
      routingMethod: 'rule',
    };
  }
}

/**
 * Get available router models from enabled providers
 */
export function getAvailableRouterModels(enabledProviders: ProviderName[]): RouterModelConfig[] {
  return DEFAULT_ROUTER_MODELS.filter(m => enabledProviders.includes(m.provider));
}

// Legacy function for backward compatibility
function classifyTask(input: string): TaskClassification {
  return classifyTaskRuleBased(input);
}

// Model tiers for auto-routing
// Each tier is ordered by preference (first available will be selected)
const MODEL_TIERS = {
  fast: [
    { provider: 'groq' as ProviderName, model: 'llama-3.3-70b-versatile' },
    { provider: 'google' as ProviderName, model: 'gemini-2.0-flash-exp' },
    { provider: 'openai' as ProviderName, model: 'gpt-4o-mini' },
    { provider: 'anthropic' as ProviderName, model: 'claude-3-5-haiku-20241022' },
    { provider: 'deepseek' as ProviderName, model: 'deepseek-chat' },
    { provider: 'mistral' as ProviderName, model: 'mistral-small-latest' },
  ],
  balanced: [
    { provider: 'google' as ProviderName, model: 'gemini-1.5-pro' },
    { provider: 'openai' as ProviderName, model: 'gpt-4o' },
    { provider: 'anthropic' as ProviderName, model: 'claude-sonnet-4-20250514' },
    { provider: 'mistral' as ProviderName, model: 'mistral-large-latest' },
  ],
  powerful: [
    { provider: 'anthropic' as ProviderName, model: 'claude-opus-4-20250514' },
    { provider: 'openai' as ProviderName, model: 'gpt-4o' },
    { provider: 'google' as ProviderName, model: 'gemini-1.5-pro' },
  ],
  // Reasoning tier - specialized for deep reasoning tasks (math, logic, analysis)
  reasoning: [
    { provider: 'openai' as ProviderName, model: 'o1' },
    { provider: 'openai' as ProviderName, model: 'o1-mini' },
    { provider: 'deepseek' as ProviderName, model: 'deepseek-reasoner' },
    { provider: 'anthropic' as ProviderName, model: 'claude-opus-4-20250514' },
    { provider: 'google' as ProviderName, model: 'gemini-2.0-flash-thinking-exp' },
  ],
};

export function useAutoRouter() {
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const autoRouterSettings = useSettingsStore((state) => state.autoRouterSettings);

  // Memoize enabled providers list
  const enabledProviders = useMemo(() => {
    const enabled: ProviderName[] = [];
    for (const [name, settings] of Object.entries(providerSettings)) {
      if (settings?.enabled && (settings.apiKey || name === 'ollama')) {
        enabled.push(name as ProviderName);
      }
    }
    return enabled;
  }, [providerSettings]);

  const getEnabledModels = useCallback(
    (tier: keyof typeof MODEL_TIERS) => {
      return MODEL_TIERS[tier].filter((m) => enabledProviders.includes(m.provider));
    },
    [enabledProviders]
  );

  // Filter models based on requirements
  const filterByRequirements = useCallback(
    (
      models: Array<{ provider: ProviderName; model: string }>,
      classification: TaskClassification
    ) => {
      return models.filter((m) => {
        // If tools are required, filter out models that don't support them
        if (classification.requiresTools && !supportsToolCalling(m.model)) {
          return false;
        }
        // If vision is required, filter out models that don't support it
        if (classification.requiresVision && !supportsVision(m.provider, m.model)) {
          return false;
        }
        return true;
      });
    },
    []
  );

  const selectModel = useCallback(
    (input: string, options?: { preferredProvider?: ProviderName }): ModelSelection => {
      const startTime = Date.now();
      const classification = classifyTask(input);

      // Determine initial tier based on classification
      let tier: ModelTier = 'balanced';
      if (classification.complexity === 'simple' && !classification.requiresReasoning) {
        tier = 'fast';
      } else if (classification.complexity === 'complex' || classification.requiresReasoning) {
        tier = 'powerful';
      }

      // Get available models for the tier
      let availableModels = getEnabledModels(tier as keyof typeof MODEL_TIERS);
      
      // Filter by requirements
      availableModels = filterByRequirements(availableModels, classification);

      // Fallback to lower tiers if no models available
      if (availableModels.length === 0) {
        const fallbackOrder: ModelTier[] = 
          tier === 'powerful' ? ['balanced', 'fast'] :
          tier === 'fast' ? ['balanced', 'powerful'] :
          ['fast', 'powerful'];

        for (const fallbackTier of fallbackOrder) {
          let fallbackModels = getEnabledModels(fallbackTier as keyof typeof MODEL_TIERS);
          fallbackModels = filterByRequirements(fallbackModels, classification);
          if (fallbackModels.length > 0) {
            availableModels = fallbackModels;
            tier = fallbackTier;
            break;
          }
        }
      }

      // Default fallback if no providers are configured
      if (availableModels.length === 0) {
        return {
          provider: 'openai',
          model: 'gpt-4o-mini',
          tier: 'fast',
          reason: 'Fallback: No configured providers available. Please add API keys in Settings.',
          routingMode: 'rule-based',
          routingLatency: Date.now() - startTime,
          classification,
        };
      }

      // If preferred provider is specified and available, use it
      if (options?.preferredProvider) {
        const preferred = availableModels.find((m) => m.provider === options.preferredProvider);
        if (preferred) {
          return {
            provider: preferred.provider,
            model: preferred.model,
            tier,
            reason: `Auto: preferred provider (${classification.complexity} task)`,
            routingMode: 'rule-based',
            routingLatency: Date.now() - startTime,
            classification,
          };
        }
      }

      // Select first available model from tier
      const selected = availableModels[0];

      const tierDescriptions: Record<ModelTier, string> = {
        fast: 'quick response',
        balanced: 'balanced quality/speed',
        powerful: 'complex reasoning',
        reasoning: 'deep reasoning',
      };

      // Build detailed reason
      const details: string[] = [];
      if (classification.requiresReasoning) details.push('reasoning');
      if (classification.requiresTools) details.push('tools');
      if (classification.requiresVision) details.push('vision');
      
      const detailStr = details.length > 0 ? ` [${details.join(', ')}]` : '';

      return {
        provider: selected.provider,
        model: selected.model,
        tier,
        reason: `Auto: ${tierDescriptions[tier]} (${classification.complexity} task)${detailStr}`,
        routingMode: 'rule-based',
        routingLatency: Date.now() - startTime,
        classification,
      };
    },
    [getEnabledModels, filterByRequirements]
  );

  // Get all available models across tiers
  const getAvailableModels = useCallback(() => {
    return {
      fast: getEnabledModels('fast'),
      balanced: getEnabledModels('balanced'),
      powerful: getEnabledModels('powerful'),
    };
  }, [getEnabledModels]);

  // Async model selection using LLM-based routing with caching
  const selectModelAsync = useCallback(
    async (
      input: string, 
      options?: { 
        preferredProvider?: ProviderName;
        routingMode?: RoutingMode;
        routerModel?: RouterModelConfig;
        context?: RoutingContext;
        useCache?: boolean;
      }
    ): Promise<ModelSelection> => {
      const startTime = Date.now();
      const mode = options?.routingMode || 'rule-based';
      const useCache = options?.useCache ?? autoRouterSettings.enableCache;
      
      // Check cache first
      if (useCache) {
        const cached = getCachedRouting(
          input,
          options?.context?.hasImages,
          options?.context?.agentTools && options.context.agentTools.length > 0,
          options?.context?.agentMode
        );
        if (cached) {
          recordRoutingDecision(cached, true);
          return {
            ...cached,
            routingLatency: Date.now() - startTime,
          };
        }
      }
      
      let classification: TaskClassification;
      let recommendedTier: ModelTier = 'balanced';
      
      if (mode === 'llm-based') {
        // Get router model (use provided or find first available)
        const routerModels = options?.routerModel 
          ? [options.routerModel] 
          : getAvailableRouterModels(enabledProviders);
        
        if (routerModels.length === 0) {
          // Fallback to rule-based if no router models available
          classification = classifyTaskRuleBased(input);
          recommendedTier = classification.complexity === 'simple' ? 'fast' :
                           classification.complexity === 'complex' ? 'powerful' : 'balanced';
        } else {
          const routerModel = routerModels[0];
          const settings = providerSettings[routerModel.provider];
          const apiKey = settings?.apiKey || '';
          const baseURL = settings?.baseURL;
          
          const result = await classifyTaskWithLLM(input, routerModel, apiKey, baseURL);
          classification = result.classification;
          recommendedTier = result.recommendedTier;
        }
      } else {
        classification = classifyTaskRuleBased(input);
        recommendedTier = classification.complexity === 'simple' ? 'fast' :
                         classification.complexity === 'complex' ? 'powerful' : 'balanced';
      }
      
      // Apply context-based adjustments
      if (options?.context) {
        // Agent mode adjustments
        if (options.context.agentMode) {
          classification = applyAgentModeHints(classification, options.context.agentMode);
        }
        // Image attachments require vision
        if (options.context.hasImages) {
          classification = { ...classification, requiresVision: true };
        }
        // User tier preference
        if (options.context.userPreferredTier) {
          recommendedTier = options.context.userPreferredTier;
        }
      }
      
      // Get available models for the recommended tier
      let availableModels = getEnabledModels(recommendedTier as keyof typeof MODEL_TIERS);
      availableModels = filterByRequirements(availableModels, classification);
      
      // Fallback to other tiers if needed
      if (availableModels.length === 0) {
        const fallbackOrder: ModelTier[] = 
          recommendedTier === 'powerful' ? ['balanced', 'fast'] :
          recommendedTier === 'fast' ? ['balanced', 'powerful'] :
          ['fast', 'powerful'];

        for (const fallbackTier of fallbackOrder) {
          let fallbackModels = getEnabledModels(fallbackTier as keyof typeof MODEL_TIERS);
          fallbackModels = filterByRequirements(fallbackModels, classification);
          if (fallbackModels.length > 0) {
            availableModels = fallbackModels;
            recommendedTier = fallbackTier;
            break;
          }
        }
      }
      
      // Default fallback
      if (availableModels.length === 0) {
        return {
          provider: 'openai',
          model: 'gpt-4o-mini',
          tier: 'fast',
          reason: 'Fallback: No configured providers available.',
          routingMode: mode,
          routingLatency: Date.now() - startTime,
          classification,
        };
      }
      
      // Prefer specified provider if available
      if (options?.preferredProvider) {
        const preferred = availableModels.find((m) => m.provider === options.preferredProvider);
        if (preferred) {
          return {
            provider: preferred.provider,
            model: preferred.model,
            tier: recommendedTier,
            reason: `Auto (${mode}): preferred provider (${classification.category})`,
            routingMode: mode,
            routingLatency: Date.now() - startTime,
            classification,
          };
        }
      }
      
      const selected = availableModels[0];
      const tierDescriptions: Record<ModelTier, string> = {
        fast: 'quick response',
        balanced: 'balanced quality/speed',
        powerful: 'complex reasoning',
        reasoning: 'deep reasoning',
      };
      
      const details: string[] = [classification.category];
      if (classification.requiresReasoning) details.push('reasoning');
      if (classification.requiresCoding) details.push('coding');
      if (classification.requiresCreativity) details.push('creative');
      
      // Calculate estimated cost
      const cost = estimateCost(
        classification.estimatedInputTokens,
        classification.estimatedOutputTokens,
        selected.provider,
        selected.model
      );
      
      const result: ModelSelection = {
        provider: selected.provider,
        model: selected.model,
        tier: recommendedTier,
        reason: `Auto (${mode}): ${tierDescriptions[recommendedTier]} [${details.join(', ')}]`,
        routingMode: mode,
        routingLatency: Date.now() - startTime,
        classification,
        estimatedCost: cost || undefined,
      };
      
      // Cache the result and record statistics
      if (useCache) {
        cacheRoutingDecision(
          input,
          result,
          options?.context?.hasImages,
          options?.context?.agentTools && options.context.agentTools.length > 0,
          options?.context?.agentMode
        );
      }
      recordRoutingDecision(result, false);
      
      return result;
    },
    [enabledProviders, providerSettings, getEnabledModels, filterByRequirements, autoRouterSettings.enableCache]
  );

  // Get available router models
  const availableRouterModels = useMemo(() => {
    return getAvailableRouterModels(enabledProviders);
  }, [enabledProviders]);

  return { 
    selectModel, 
    selectModelAsync,
    classifyTask,
    classifyTaskRuleBased,
    getAvailableModels,
    availableRouterModels,
    enabledProviders,
  };
}

export { classifyTask, classifyTaskRuleBased };

/**
 * Get recommended model for a specific use case
 */
export function getRecommendedModel(
  useCase: 'chat' | 'code' | 'analysis' | 'creative' | 'fast',
  enabledProviders: ProviderName[]
): { provider: ProviderName; model: string } | null {
  const recommendations: Record<string, Array<{ provider: ProviderName; model: string }>> = {
    chat: [
      { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
      { provider: 'openai', model: 'gpt-4o' },
      { provider: 'google', model: 'gemini-1.5-pro' },
    ],
    code: [
      { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
      { provider: 'deepseek', model: 'deepseek-chat' },
      { provider: 'openai', model: 'gpt-4o' },
    ],
    analysis: [
      { provider: 'anthropic', model: 'claude-opus-4-20250514' },
      { provider: 'openai', model: 'o1' },
      { provider: 'deepseek', model: 'deepseek-reasoner' },
    ],
    creative: [
      { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
      { provider: 'openai', model: 'gpt-4o' },
      { provider: 'google', model: 'gemini-1.5-pro' },
    ],
    fast: [
      { provider: 'groq', model: 'llama-3.3-70b-versatile' },
      { provider: 'google', model: 'gemini-2.0-flash-exp' },
      { provider: 'openai', model: 'gpt-4o-mini' },
    ],
  };

  const options = recommendations[useCase] || recommendations.chat;
  
  for (const option of options) {
    if (enabledProviders.includes(option.provider)) {
      return option;
    }
  }

  return null;
}

/**
 * Estimate cost for a model and token count
 */
export function estimateModelCost(
  provider: ProviderName,
  model: string,
  inputTokens: number,
  outputTokens: number
): { inputCost: number; outputCost: number; totalCost: number } | null {
  // Approximate pricing per 1M tokens (as of late 2024)
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 2.5, output: 10 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'o1': { input: 15, output: 60 },
    'claude-sonnet-4': { input: 3, output: 15 },
    'claude-opus-4': { input: 15, output: 75 },
    'gemini-1.5-pro': { input: 1.25, output: 5 },
    'gemini-2.0-flash': { input: 0.075, output: 0.3 },
    'deepseek-chat': { input: 0.14, output: 0.28 },
  };

  // Find matching pricing
  const key = Object.keys(pricing).find((k) => model.toLowerCase().includes(k.toLowerCase()));
  if (!key) return null;

  const { input, output } = pricing[key];
  const inputCost = (inputTokens / 1_000_000) * input;
  const outputCost = (outputTokens / 1_000_000) * output;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}
