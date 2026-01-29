/**
 * SpeedPass Mode Router
 * 
 * Intelligent learning mode selection based on user input and context.
 * Analyzes time constraints, urgency, and learning goals to recommend
 * the most appropriate speed learning mode.
 */

import type { SpeedLearningMode } from '@/types/learning/speedpass';

/**
 * Result of mode detection
 */
export interface ModeDetectionResult {
  detected: boolean;
  recommendedMode: SpeedLearningMode;
  confidence: number;
  reason: string;
  reasonZh: string;
  detectedTime?: number; // minutes
  detectedUrgencyDays?: number; // days until exam
  alternatives: Array<{
    mode: SpeedLearningMode;
    confidence: number;
  }>;
}

/**
 * Context for mode routing decisions
 */
export interface ModeRoutingContext {
  availableTimeMinutes?: number;
  examDate?: Date;
  targetScore?: number;
  preferredMode?: SpeedLearningMode;
  hasTeacherKeyPoints?: boolean;
}

/**
 * Pattern configurations for each mode
 */
const MODE_PATTERNS: Record<SpeedLearningMode, {
  chinese: RegExp[];
  english: RegExp[];
  timeKeywords: RegExp[];
}> = {
  extreme: {
    chinese: [
      /(?:只有|仅有|就|还剩?)\s*(?:1|一|2|两|几十分钟|半小时|一小时|1小时|2小时)/i,
      /(?:马上|立刻|即将|明天|今天|待会|一会儿?).*?(?:考试|测验|期末|期中)/i,
      /(?:突击|临时|抱佛脚|速成|快速过关|及格就行|过就行)/i,
      /(?:来不及|没时间|时间紧|赶不上)/i,
      /(?:极速|最快|最短时间)/i,
      /(?:60分|及格|过关)/i,
    ],
    english: [
      /(?:only have|just have|got)\s*(?:1|one|2|two|an?)\s*(?:hour|hours?)/i,
      /(?:exam|test|final|midterm)\s*(?:is\s*)?(?:tomorrow|today|soon|in\s*\d+\s*hours?)/i,
      /(?:cram|cramming|last\s*minute|quick\s*pass|just\s*pass)/i,
      /(?:no\s*time|running\s*out\s*of\s*time|time\s*crunch)/i,
      /(?:fastest|quickest|shortest\s*time)/i,
      /(?:60\s*points?|just\s*pass|passing\s*grade)/i,
    ],
    timeKeywords: [
      /(?:1|一|2|两)\s*(?:小时|hour|h)/i,
      /(?:30|三十|60|六十)\s*(?:分钟|minutes?|min)/i,
    ],
  },
  speed: {
    chinese: [
      /(?:有|还有|大概|差不多)\s*(?:2|3|4|两三|三四|几)\s*(?:小时|个小时)/i,
      /(?:后天|大后天|这周|本周末?).*?(?:考试|测验)/i,
      /(?:速成|快速学习|快速掌握)/i,
      /(?:中等|七八十分|70|75|80).*?(?:分|目标)/i,
      /(?:重点|核心|关键).*?(?:内容|知识点)/i,
    ],
    english: [
      /(?:have|got)\s*(?:2|3|4|two|three|four|a\s*few)\s*(?:hours?)/i,
      /(?:exam|test)\s*(?:is\s*)?(?:in\s*\d+\s*days?|this\s*week)/i,
      /(?:speed\s*learning|quick\s*study|fast\s*track)/i,
      /(?:70|75|80)\s*(?:points?|percent|%)/i,
      /(?:key\s*points?|core\s*concepts?|main\s*topics?)/i,
    ],
    timeKeywords: [
      /(?:2|3|4|两|三|四)\s*(?:小时|hour|h)/i,
    ],
  },
  comprehensive: {
    chinese: [
      /(?:充足|足够|很多|大量|充裕).*?(?:时间)/i,
      /(?:高分|90|85|95).*?(?:分|目标)/i,
      /(?:全面|系统|深入|彻底|完整).*?(?:复习|学习|理解|掌握)/i,
      /(?:下周|下下周|还有一周|两周).*?(?:考试|测验)/i,
      /(?:不着急|时间充裕|慢慢来)/i,
      /(?:所有|全部|每个).*?(?:知识点|内容|章节)/i,
    ],
    english: [
      /(?:plenty|lots?\s*of|enough|sufficient)\s*(?:time)/i,
      /(?:high\s*score|90|85|95)\s*(?:points?|percent|%|or\s*above)/i,
      /(?:comprehensive|thorough|complete|in-?depth)\s*(?:review|study|understanding)/i,
      /(?:exam|test)\s*(?:is\s*)?(?:next\s*week|in\s*\d+\s*weeks?)/i,
      /(?:no\s*rush|take\s*(?:my|your)\s*time|slowly)/i,
      /(?:all|every|each)\s*(?:topic|concept|chapter|section)/i,
    ],
    timeKeywords: [
      /(?:6|7|8|9|10|11|12|六|七|八|九|十|十一|十二)\s*(?:小时|hour|h)/i,
      /(?:一天|几天|一周)\s*(?:以上|多)?/i,
    ],
  },
};

/**
 * Parse Chinese number string to numeric value
 * Handles: 一-十, 十一-十九, 二十, 两
 */
function parseChineseNumber(str: string): number | undefined {
  const basicNumbers: Record<string, number> = {
    '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  };
  
  // Handle compound numbers like 十一, 十二, 二十, 二十五
  if (str.includes('十')) {
    const parts = str.split('十');
    const tens = parts[0] ? (basicNumbers[parts[0]] ?? 1) : 1;
    const ones = parts[1] ? (basicNumbers[parts[1]] ?? 0) : 0;
    return tens * 10 + ones;
  }
  
  return basicNumbers[str];
}

/**
 * Extract time duration from user input (in minutes)
 * Supports: hours, minutes, half-hour, relative time expressions
 */
function extractTimeFromInput(input: string): number | undefined {
  // Match "半小时" = 30 minutes
  if (/半小时|半个小时|half\s*(?:an?\s*)?hour/i.test(input)) {
    return 30;
  }
  
  // Match "半天" = ~4 hours (240 minutes)
  if (/半天/i.test(input)) {
    return 240;
  }
  
  // Match "一下午/一上午" = ~3-4 hours
  if (/[一]?(?:下午|上午|晚上)/i.test(input) && /整个|一整?/i.test(input)) {
    return 180;
  }
  
  // Match numeric hours (e.g., "3小时", "2.5 hours")
  const numericHourMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:小时|个小时|hour|h(?:rs?)?)/i);
  if (numericHourMatch && numericHourMatch[1]) {
    return parseFloat(numericHourMatch[1]) * 60;
  }
  
  // Match Chinese hours (e.g., "两小时", "十二小时")
  const chineseHourMatch = input.match(/([一二两三四五六七八九十]+)\s*(?:小时|个小时)/i);
  if (chineseHourMatch && chineseHourMatch[1]) {
    const hours = parseChineseNumber(chineseHourMatch[1]);
    if (hours !== undefined) {
      return hours * 60;
    }
  }
  
  // Match numeric minutes (e.g., "30分钟", "45 minutes")
  const minuteMatch = input.match(/(\d+)\s*(?:分钟|分|minutes?|min)/i);
  if (minuteMatch && minuteMatch[1]) {
    return parseInt(minuteMatch[1], 10);
  }
  
  // Match Chinese minutes (e.g., "三十分钟")
  const chineseMinMatch = input.match(/([一二两三四五六七八九十]+)\s*(?:分钟|分)/i);
  if (chineseMinMatch && chineseMinMatch[1]) {
    const minutes = parseChineseNumber(chineseMinMatch[1]);
    if (minutes !== undefined) {
      return minutes;
    }
  }
  
  return undefined;
}

/**
 * Detect exam urgency from input (returns days until exam, or undefined)
 */
function detectExamUrgency(input: string): number | undefined {
  // Today/now
  if (/今天|待会|一会|马上|立刻|现在|today|now|right\s*now/i.test(input)) {
    return 0;
  }
  
  // Tomorrow
  if (/明天|tomorrow/i.test(input)) {
    return 1;
  }
  
  // Day after tomorrow
  if (/后天|day\s*after\s*tomorrow/i.test(input)) {
    return 2;
  }
  
  // This week
  if (/这周|本周|this\s*week/i.test(input)) {
    return 3;
  }
  
  // Next week
  if (/下周|next\s*week/i.test(input)) {
    return 7;
  }
  
  // N days
  const daysMatch = input.match(/(\d+)\s*(?:天|days?)/i);
  if (daysMatch && daysMatch[1]) {
    return parseInt(daysMatch[1], 10);
  }
  
  return undefined;
}

/**
 * Calculate confidence score for a mode based on pattern matches
 * Uses weighted scoring with diminishing returns for multiple matches
 */
function calculateModeConfidence(
  input: string,
  mode: SpeedLearningMode
): { confidence: number; matches: string[]; urgencyDays?: number } {
  const patterns = MODE_PATTERNS[mode];
  const matches: string[] = [];
  let score = 0;
  let matchCount = 0;
  
  // Check Chinese patterns (weight: 0.3 first match, diminishing after)
  for (const pattern of patterns.chinese) {
    const match = input.match(pattern);
    if (match) {
      matchCount++;
      // Diminishing returns: 0.3, 0.2, 0.15, 0.1...
      score += 0.3 / Math.sqrt(matchCount);
      matches.push(match[0]);
    }
  }
  
  // Check English patterns
  for (const pattern of patterns.english) {
    const match = input.match(pattern);
    if (match) {
      matchCount++;
      score += 0.3 / Math.sqrt(matchCount);
      matches.push(match[0]);
    }
  }
  
  // Check time keywords (slightly lower weight)
  for (const pattern of patterns.timeKeywords) {
    const match = input.match(pattern);
    if (match) {
      score += 0.15;
      matches.push(match[0]);
    }
  }
  
  // Detect exam urgency and boost extreme mode confidence
  const urgencyDays = detectExamUrgency(input);
  if (urgencyDays !== undefined) {
    if (mode === 'extreme' && urgencyDays <= 1) {
      score += 0.4; // Strong boost for extreme mode when exam is imminent
    } else if (mode === 'speed' && urgencyDays <= 3) {
      score += 0.2; // Moderate boost for speed mode
    } else if (mode === 'comprehensive' && urgencyDays >= 7) {
      score += 0.2; // Boost comprehensive for longer prep time
    }
  }
  
  // Cap confidence at 1.0
  return {
    confidence: Math.min(score, 1.0),
    matches,
    urgencyDays,
  };
}

/**
 * Get recommended mode based on time constraint
 */
function getModeFromTime(minutes: number): SpeedLearningMode {
  if (minutes <= 120) {
    return 'extreme';
  } else if (minutes <= 240) {
    return 'speed';
  } else {
    return 'comprehensive';
  }
}

/**
 * Detect speed learning mode from user input
 */
export function detectSpeedLearningMode(
  input: string,
  context?: ModeRoutingContext
): ModeDetectionResult {
  const normalizedInput = input.toLowerCase().trim();
  
  // Check for explicit time in input
  const detectedTime = extractTimeFromInput(normalizedInput);
  
  // Calculate confidence for each mode
  const modeScores: Array<{
    mode: SpeedLearningMode;
    confidence: number;
    matches: string[];
    urgencyDays?: number;
  }> = [];
  
  for (const mode of ['extreme', 'speed', 'comprehensive'] as SpeedLearningMode[]) {
    const { confidence, matches, urgencyDays } = calculateModeConfidence(normalizedInput, mode);
    modeScores.push({ mode, confidence, matches, urgencyDays });
  }
  
  // Get urgency from the first mode score (same for all)
  const detectedUrgencyDays = modeScores[0]?.urgencyDays;
  
  // Sort by confidence
  modeScores.sort((a, b) => b.confidence - a.confidence);
  
  // Determine recommended mode
  let recommendedMode: SpeedLearningMode = 'speed'; // default
  let confidence = 0;
  let reason = 'Default balanced mode recommended';
  let reasonZh = '推荐默认的速成模式';
  
  // If time is explicitly mentioned, use it
  if (detectedTime) {
    recommendedMode = getModeFromTime(detectedTime);
    confidence = 0.8;
    
    if (recommendedMode === 'extreme') {
      reason = `Detected ${Math.round(detectedTime / 60 * 10) / 10}h available - recommending extreme mode for quick review`;
      reasonZh = `检测到可用时间约${Math.round(detectedTime / 60 * 10) / 10}小时 - 推荐极速模式快速复习`;
    } else if (recommendedMode === 'speed') {
      reason = `Detected ${Math.round(detectedTime / 60 * 10) / 10}h available - recommending speed mode for balanced coverage`;
      reasonZh = `检测到可用时间约${Math.round(detectedTime / 60 * 10) / 10}小时 - 推荐速成模式平衡学习`;
    } else {
      reason = `Detected ${Math.round(detectedTime / 60 * 10) / 10}h available - recommending comprehensive mode for thorough review`;
      reasonZh = `检测到可用时间约${Math.round(detectedTime / 60 * 10) / 10}小时 - 推荐全面模式深入学习`;
    }
  }
  // Use context if provided
  else if (context?.availableTimeMinutes) {
    recommendedMode = getModeFromTime(context.availableTimeMinutes);
    confidence = 0.9;
    reason = `Based on available time (${context.availableTimeMinutes} minutes)`;
    reasonZh = `基于可用时间（${context.availableTimeMinutes}分钟）`;
  }
  // Use pattern matching
  else if (modeScores[0].confidence > 0.2) {
    recommendedMode = modeScores[0].mode;
    confidence = modeScores[0].confidence;
    
    const matchedPatterns = modeScores[0].matches.join(', ');
    if (recommendedMode === 'extreme') {
      reason = `Urgency detected: "${matchedPatterns}" - recommending extreme mode`;
      reasonZh = `检测到紧急情况: "${matchedPatterns}" - 推荐极速模式`;
    } else if (recommendedMode === 'speed') {
      reason = `Moderate time pressure detected: "${matchedPatterns}" - recommending speed mode`;
      reasonZh = `检测到中等时间压力: "${matchedPatterns}" - 推荐速成模式`;
    } else {
      reason = `Sufficient time detected: "${matchedPatterns}" - recommending comprehensive mode`;
      reasonZh = `检测到充足时间: "${matchedPatterns}" - 推荐全面模式`;
    }
  }
  // Use preferred mode from context
  else if (context?.preferredMode) {
    recommendedMode = context.preferredMode;
    confidence = 0.7;
    reason = 'Using user preferred mode';
    reasonZh = '使用用户偏好模式';
  }
  
  // Build alternatives list
  const alternatives = modeScores
    .filter(m => m.mode !== recommendedMode && m.confidence > 0)
    .map(m => ({ mode: m.mode, confidence: m.confidence }));
  
  return {
    detected: confidence > 0.2,
    recommendedMode,
    confidence,
    reason,
    reasonZh,
    detectedTime,
    detectedUrgencyDays,
    alternatives,
  };
}

/**
 * Check if input mentions speed learning / exam preparation
 */
export function isSpeedLearningIntent(input: string): boolean {
  const patterns = [
    // Chinese patterns
    /(?:复习|学习|备考|准备).*?(?:考试|期末|期中|测验)/i,
    /(?:速过|速学|快速学习|极速学习|速成)/i,
    /(?:教材|课本|教科书).*?(?:学习|复习|备考)/i,
    /(?:考前|临时|突击).*?(?:复习|准备|学习)/i,
    /(?:重点|知识点|考点).*?(?:整理|提取|学习)/i,
    /(?:刷题|练习|做题|测验)/i,
    // English patterns
    /(?:review|study|prepare for).*?(?:exam|test|midterm|final)/i,
    /(?:speed learning|fast learning|quick study|cramming)/i,
    /(?:textbook|coursebook).*?(?:learning|studying|review)/i,
    /(?:last minute|quick|crash course).*?(?:review|preparation|study)/i,
  ];
  
  return patterns.some(pattern => pattern.test(input));
}

/**
 * Get mode display info
 */
export function getModeDisplayInfo(mode: SpeedLearningMode): {
  name: string;
  nameZh: string;
  duration: string;
  description: string;
  descriptionZh: string;
  color: string;
} {
  const info: Record<SpeedLearningMode, ReturnType<typeof getModeDisplayInfo>> = {
    extreme: {
      name: 'Extreme Mode',
      nameZh: '极速模式',
      duration: '1-2h',
      description: 'Quick review of critical points for passing',
      descriptionZh: '快速掌握核心考点，冲刺及格',
      color: 'red',
    },
    speed: {
      name: 'Speed Mode',
      nameZh: '速成模式',
      duration: '2-4h',
      description: 'Balanced coverage of key concepts',
      descriptionZh: '系统学习重点内容，目标中等成绩',
      color: 'orange',
    },
    comprehensive: {
      name: 'Comprehensive Mode',
      nameZh: '全面模式',
      duration: '6-12h',
      description: 'Thorough review of all content for high scores',
      descriptionZh: '深入学习全部内容，冲刺高分',
      color: 'blue',
    },
  };
  
  return info[mode];
}
