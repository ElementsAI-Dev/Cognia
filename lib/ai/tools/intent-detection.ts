/**
 * Intent Detection Tool - Detect learning/academic intent in user messages
 * 
 * This tool analyzes user messages to detect if they have:
 * - Learning intent (tutorials, explanations, understanding concepts)
 * - Academic/Research intent (papers, research, citations)
 * 
 * When detected, it suggests switching to the appropriate mode.
 */

import type { ChatMode } from '@/types/core/session';

/**
 * Intent detection result
 */
export interface IntentDetectionResult {
  /** Whether any special intent was detected */
  hasIntent: boolean;
  /** The detected intent type */
  intentType: 'learning' | 'research' | 'agent' | null;
  /** Suggested mode to switch to */
  suggestedMode: ChatMode | null;
  /** Confidence score (0-1) */
  confidence: number;
  /** Reason for the detection */
  reason: string;
  /** Keywords that triggered the detection */
  matchedKeywords: string[];
}

/**
 * Learning intent patterns
 */
const LEARNING_PATTERNS = {
  chinese: [
    /(?:教我|学习|理解|解释|讲解|说明|介绍).*(?:什么是|如何|怎么|怎样|为什么)/i,
    /(?:帮我|请).*(?:理解|学习|弄懂|搞清楚)/i,
    /(?:我想|我要|我需要).*(?:学习|了解|掌握|入门)/i,
    /(?:能不能|可以|请).*(?:讲一下|解释一下|说说)/i,
    /(?:教程|入门|基础|原理|概念|知识点)/i,
    /(?:flashcard|闪卡|记忆卡|复习|背诵)/i,
    /(?:quiz|测验|测试|练习|习题)/i,
    /(?:这是什么|是什么意思|什么意思)/i,
  ],
  english: [
    /(?:teach me|learn|understand|explain|help me understand)/i,
    /(?:how does|what is|why does|can you explain)/i,
    /(?:tutorial|beginner|introduction|basics|fundamentals)/i,
    /(?:i want to learn|i need to understand|help me learn)/i,
    /(?:break down|walk me through|step by step)/i,
    /(?:flashcard|quiz|practice|study|memorize|review)/i,
    /(?:concept|principle|theory|mechanism)/i,
  ],
};

/**
 * Research/Academic intent patterns
 */
const RESEARCH_PATTERNS = {
  chinese: [
    /(?:论文|文献|研究|学术|期刊|发表)/i,
    /(?:arXiv|arxiv|引用|参考文献|文献综述)/i,
    /(?:找.*论文|搜索.*文献|查找.*研究)/i,
    /(?:最新研究|前沿研究|研究进展|研究成果)/i,
    /(?:作者|发表|期刊|会议|摘要)/i,
    /(?:科研|实验|数据分析|统计)/i,
    /(?:学术搜索|文献检索|论文检索)/i,
    /(?:综述|survey|review)/i,
  ],
  english: [
    /(?:paper|papers|research|academic|journal|publication)/i,
    /(?:arXiv|arxiv|citation|references|literature review)/i,
    /(?:find.*paper|search.*research|look for.*study)/i,
    /(?:latest research|recent studies|cutting-edge|state of the art)/i,
    /(?:author|published|journal|conference|abstract)/i,
    /(?:scientific|experiment|data analysis|statistical)/i,
    /(?:semantic scholar|google scholar|pubmed)/i,
    /(?:survey|review|meta-analysis)/i,
  ],
};

/**
 * Agent intent patterns (complex tasks requiring tools)
 */
const AGENT_PATTERNS = {
  chinese: [
    /(?:帮我|请).*(?:创建|生成|制作|做一个).*(?:PPT|演示文稿|幻灯片)/i,
    /(?:帮我|请).*(?:写|创建|生成).*(?:文件|文档|代码)/i,
    /(?:执行|运行|自动化|批量)/i,
    /(?:搜索网上|网页搜索|上网查)/i,
  ],
  english: [
    /(?:create|generate|make|build).*(?:ppt|presentation|slides)/i,
    /(?:write|create|generate).*(?:file|document|code)/i,
    /(?:execute|run|automate|batch)/i,
    /(?:search the web|web search|look online)/i,
  ],
};

/**
 * Calculate pattern match score
 */
function calculatePatternScore(
  message: string,
  patterns: { chinese: RegExp[]; english: RegExp[] }
): { score: number; matched: string[] } {
  const matched: string[] = [];
  let totalMatches = 0;

  const allPatterns = [...patterns.chinese, ...patterns.english];
  
  for (const pattern of allPatterns) {
    const match = message.match(pattern);
    if (match) {
      totalMatches++;
      matched.push(match[0]);
    }
  }

  // Normalize score based on number of patterns
  const score = Math.min(totalMatches / 3, 1); // Cap at 1, 3 matches = full confidence
  
  return { score, matched };
}

/**
 * Detect user intent from message content
 */
export function detectUserIntent(message: string): IntentDetectionResult {
  const lowerMessage = message.toLowerCase();
  
  // Calculate scores for each intent type
  const learningResult = calculatePatternScore(lowerMessage, LEARNING_PATTERNS);
  const researchResult = calculatePatternScore(lowerMessage, RESEARCH_PATTERNS);
  const agentResult = calculatePatternScore(lowerMessage, AGENT_PATTERNS);

  // Determine the dominant intent
  const scores = [
    { type: 'learning' as const, score: learningResult.score, matched: learningResult.matched, mode: 'learning' as ChatMode },
    { type: 'research' as const, score: researchResult.score, matched: researchResult.matched, mode: 'research' as ChatMode },
    { type: 'agent' as const, score: agentResult.score, matched: agentResult.matched, mode: 'agent' as ChatMode },
  ];

  // Find the highest scoring intent
  const bestMatch = scores.reduce((a, b) => a.score > b.score ? a : b);

  // Threshold for detection
  const CONFIDENCE_THRESHOLD = 0.3;

  if (bestMatch.score >= CONFIDENCE_THRESHOLD) {
    let reason = '';
    switch (bestMatch.type) {
      case 'learning':
        reason = '检测到学习意图：您似乎想要学习或理解某个概念。学习模式提供交互式教学、闪卡、测验等功能。';
        break;
      case 'research':
        reason = '检测到学术研究意图：您似乎在寻找学术论文或进行研究。研究模式提供论文搜索、文献分析等功能。';
        break;
      case 'agent':
        reason = '检测到复杂任务意图：您似乎需要执行复杂任务。Agent模式可以使用工具自动完成任务。';
        break;
    }

    return {
      hasIntent: true,
      intentType: bestMatch.type,
      suggestedMode: bestMatch.mode,
      confidence: bestMatch.score,
      reason,
      matchedKeywords: bestMatch.matched,
    };
  }

  return {
    hasIntent: false,
    intentType: null,
    suggestedMode: null,
    confidence: 0,
    reason: '',
    matchedKeywords: [],
  };
}

/**
 * Get mode switch suggestion message
 */
export function getModeSwitchSuggestion(result: IntentDetectionResult, currentMode: ChatMode): string | null {
  if (!result.hasIntent || result.suggestedMode === currentMode) {
    return null;
  }

  const modeNames: Record<ChatMode, string> = {
    chat: '聊天模式',
    agent: 'Agent模式',
    research: '研究模式',
    learning: '学习模式',
  };

  const modeFeatures: Record<ChatMode, string> = {
    chat: '快速问答和对话',
    agent: '使用工具自动执行复杂任务',
    research: '学术论文搜索、文献分析、引用管理',
    learning: '交互式教学、闪卡复习、测验练习',
  };

  const suggestedModeName = modeNames[result.suggestedMode!];
  const suggestedModeFeatures = modeFeatures[result.suggestedMode!];

  return `💡 **建议切换到${suggestedModeName}**\n\n${result.reason}\n\n${suggestedModeName}功能：${suggestedModeFeatures}\n\n是否切换？`;
}

/**
 * Chat intent patterns - for detecting when user wants general conversation
 */
const CHAT_PATTERNS = {
  chinese: [
    /^(?:你好|嗨|hi|hello|hey)$/i,
    /(?:聊聊|闲聊|随便说说|聊天)/i,
    /(?:今天|天气|心情|怎么样)/i,
    /(?:谢谢|再见|拜拜)/i,
  ],
  english: [
    /^(?:hi|hello|hey|sup)$/i,
    /(?:let's chat|just talk|casual)/i,
    /(?:thanks|bye|goodbye)/i,
    /(?:how are you|what's up)/i,
  ],
};

/**
 * Detect if user wants to switch back to general chat mode
 */
export function detectChatIntent(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  const allPatterns = [...CHAT_PATTERNS.chinese, ...CHAT_PATTERNS.english];
  
  for (const pattern of allPatterns) {
    if (pattern.test(lowerMessage)) {
      return true;
    }
  }
  return false;
}

/**
 * Detect intent mismatch - when user's message doesn't match current mode
 */
export function detectModeMismatch(
  message: string,
  currentMode: ChatMode
): { hasMismatch: boolean; suggestedMode: ChatMode | null; reason: string } {
  const result = detectUserIntent(message);
  
  // Check if message intent doesn't match current mode
  if (result.hasIntent && result.suggestedMode && result.suggestedMode !== currentMode) {
    // Strong mismatch - user is in specialized mode but wants something else
    if (result.confidence >= 0.5) {
      return {
        hasMismatch: true,
        suggestedMode: result.suggestedMode,
        reason: getMismatchReason(currentMode, result.suggestedMode),
      };
    }
  }

  // Check if user in specialized mode wants to go back to chat
  if (currentMode !== 'chat' && detectChatIntent(message)) {
    return {
      hasMismatch: true,
      suggestedMode: 'chat',
      reason: '您的消息看起来是一般性对话，可以切换回聊天模式获得更流畅的体验。',
    };
  }

  return { hasMismatch: false, suggestedMode: null, reason: '' };
}

/**
 * Get reason for mode mismatch
 */
function getMismatchReason(currentMode: ChatMode, suggestedMode: ChatMode): string {
  const modeNames: Record<ChatMode, string> = {
    chat: '聊天模式',
    agent: 'Agent模式',
    research: '研究模式',
    learning: '学习模式',
  };

  const current = modeNames[currentMode];
  const suggested = modeNames[suggestedMode];

  return `您当前在${current}，但您的请求更适合在${suggested}中处理。`;
}

/**
 * Check if mode switch should be suggested based on message history
 */
export function shouldSuggestModeSwitch(
  message: string,
  currentMode: ChatMode,
  recentSuggestions: number = 0
): IntentDetectionResult & { shouldSuggest: boolean } {
  const result = detectUserIntent(message);
  
  // Don't suggest if:
  // 1. No intent detected
  // 2. Already in the suggested mode
  // 3. Recently suggested (avoid spamming)
  // 4. Low confidence
  const shouldSuggest = 
    result.hasIntent && 
    result.suggestedMode !== currentMode &&
    result.confidence >= 0.4 &&
    recentSuggestions < 2; // Max 2 suggestions per session

  return {
    ...result,
    shouldSuggest,
  };
}

/**
 * Enhanced mode suggestion for all modes
 * Provides bidirectional suggestions (to specialized modes and back to chat)
 */
export function getEnhancedModeSuggestion(
  message: string,
  currentMode: ChatMode,
  recentSuggestions: number = 0
): {
  shouldSuggest: boolean;
  suggestedMode: ChatMode | null;
  reason: string;
  confidence: number;
  direction: 'specialize' | 'generalize' | null;
} {
  // First check for intent to go to specialized mode
  const intentResult = shouldSuggestModeSwitch(message, currentMode, recentSuggestions);
  
  if (intentResult.shouldSuggest && intentResult.suggestedMode) {
    return {
      shouldSuggest: true,
      suggestedMode: intentResult.suggestedMode,
      reason: intentResult.reason,
      confidence: intentResult.confidence,
      direction: 'specialize',
    };
  }

  // Then check for intent to return to chat (from specialized mode)
  if (currentMode !== 'chat' && recentSuggestions < 3) {
    const mismatch = detectModeMismatch(message, currentMode);
    
    if (mismatch.hasMismatch && mismatch.suggestedMode) {
      return {
        shouldSuggest: true,
        suggestedMode: mismatch.suggestedMode,
        reason: mismatch.reason,
        confidence: 0.5,
        direction: mismatch.suggestedMode === 'chat' ? 'generalize' : 'specialize',
      };
    }
  }

  return {
    shouldSuggest: false,
    suggestedMode: null,
    reason: '',
    confidence: 0,
    direction: null,
  };
}

export default detectUserIntent;
