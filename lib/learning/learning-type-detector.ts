/**
 * Learning Type Detector
 * 
 * Intelligently detects whether user's learning intent is short-term (quick) 
 * or long-term (journey) based on topic analysis, keywords, and patterns.
 */

import type {
  LearningDurationType,
  LearningCategory,
  LearningPathDuration,
  LearningTypeDetectionResult,
} from '@/types/learning';

// ============================================================================
// Keyword Patterns for Detection
// ============================================================================

/**
 * Keywords that suggest long-term/journey learning
 */
const JOURNEY_KEYWORDS = {
  // Learning intent patterns
  intent: [
    '系统学习', '深入学习', '全面学习', '从零开始', '入门到精通',
    '系统性', '完整学习', '掌握', '精通', '专业',
    'learn', 'master', 'study', 'course', 'curriculum',
    'systematic', 'comprehensive', 'in-depth', 'from scratch',
    'beginner to advanced', 'roadmap', 'pathway',
  ],
  // Duration indicators
  duration: [
    '一个月', '几个月', '半年', '一年', '长期',
    'month', 'months', 'year', 'years', 'long-term', 'semester',
  ],
  // Subject types that typically require long-term learning
  subjects: [
    // Programming languages
    'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'rust', 'go',
    'kotlin', 'swift', 'ruby', 'php', 'scala', 'haskell',
    // Frameworks and libraries
    'react', 'vue', 'angular', 'next.js', 'nuxt', 'django', 'flask',
    'spring', 'node.js', 'express', 'fastapi', 'rails',
    // Technologies
    'machine learning', 'deep learning', 'ai', 'artificial intelligence',
    'data science', 'cloud computing', 'devops', 'kubernetes', 'docker',
    'blockchain', 'web development', 'mobile development',
    // Languages
    '英语', '日语', '法语', '德语', '西班牙语',
    'english', 'japanese', 'french', 'german', 'spanish',
    // Domains
    '计算机科学', '软件工程', '数据结构', '算法', '操作系统',
    'computer science', 'software engineering', 'data structures', 'algorithms',
  ],
};

/**
 * Keywords that suggest short-term/quick learning
 */
const QUICK_KEYWORDS = {
  // Question patterns
  questions: [
    '什么是', '怎么', '如何', '为什么', '什么时候', '在哪里',
    '请问', '求解', '帮我', '解释一下', '告诉我',
    'what is', 'how to', 'how do', 'why', 'when', 'where',
    'can you', 'could you', 'please explain', 'help me',
    'difference between', 'compare', 'vs',
  ],
  // Immediate need indicators
  immediate: [
    '现在', '马上', '立刻', '快速', '简单', '基本',
    '一个问题', '这个问题', '某个', '具体',
    'now', 'quickly', 'simple', 'basic', 'just',
    'a question', 'this', 'specific', 'particular',
  ],
  // Error/problem solving
  problems: [
    '报错', '错误', '问题', 'bug', 'error', 'issue', 'problem',
    'not working', 'doesn\'t work', 'failed', 'crash',
    '修复', '解决', 'fix', 'solve', 'debug',
  ],
};

/**
 * Category detection patterns
 */
const CATEGORY_PATTERNS: Record<LearningCategory, string[]> = {
  concept: [
    '概念', '原理', '理论', '是什么', '定义',
    'concept', 'principle', 'theory', 'what is', 'definition',
  ],
  'problem-solving': [
    '问题', '解决', '修复', '错误', '报错',
    'problem', 'solve', 'fix', 'error', 'issue', 'bug',
  ],
  skill: [
    '技能', '技术', '能力', '方法',
    'skill', 'technique', 'ability', 'method',
  ],
  language: [
    'python', 'javascript', 'typescript', 'java', 'c++', 'rust', 'go',
    '编程语言', 'programming language',
    '英语', '日语', '法语', 'english', 'japanese', 'french',
  ],
  framework: [
    'react', 'vue', 'angular', 'next.js', 'django', 'flask', 'spring',
    '框架', '库', 'framework', 'library',
  ],
  domain: [
    '领域', '专业', '行业',
    'domain', 'field', 'industry',
    'machine learning', 'data science', 'ai', 'blockchain',
  ],
  project: [
    '项目', '实战', '实践', '开发',
    'project', 'practice', 'build', 'develop', 'create',
  ],
  certification: [
    '认证', '考试', '资格', '证书',
    'certification', 'exam', 'certificate', 'test',
  ],
  other: [],
};

// ============================================================================
// Detection Functions
// ============================================================================

/**
 * Calculate keyword match score for a text
 */
function calculateKeywordScore(
  text: string,
  keywords: string[]
): { score: number; matched: string[] } {
  const lowerText = text.toLowerCase();
  const matched: string[] = [];
  
  for (const keyword of keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matched.push(keyword);
    }
  }
  
  return {
    score: matched.length,
    matched,
  };
}

/**
 * Detect learning category from topic
 */
function detectCategory(topic: string): LearningCategory {
  const lowerTopic = topic.toLowerCase();
  let bestCategory: LearningCategory = 'other';
  let bestScore = 0;
  
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    const { score } = calculateKeywordScore(lowerTopic, patterns);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category as LearningCategory;
    }
  }
  
  return bestCategory;
}

/**
 * Estimate learning duration based on category and complexity
 */
function estimateDuration(
  category: LearningCategory,
  topic: string
): LearningPathDuration {
  // Check for explicit duration indicators
  const lowerTopic = topic.toLowerCase();
  
  if (lowerTopic.includes('入门') || lowerTopic.includes('基础') || 
      lowerTopic.includes('beginner') || lowerTopic.includes('basic')) {
    return 'weeks';
  }
  
  if (lowerTopic.includes('精通') || lowerTopic.includes('高级') ||
      lowerTopic.includes('master') || lowerTopic.includes('advanced')) {
    return 'months';
  }
  
  // Default duration by category
  switch (category) {
    case 'concept':
    case 'problem-solving':
      return 'days';
    case 'skill':
    case 'framework':
      return 'weeks';
    case 'language':
    case 'domain':
    case 'project':
      return 'months';
    case 'certification':
      return 'months';
    default:
      return 'weeks';
  }
}

/**
 * Main detection function - analyzes topic to determine learning type
 */
export function detectLearningType(
  topic: string,
  context?: {
    backgroundKnowledge?: string;
    goals?: string[];
    hasExistingPath?: boolean;
  }
): LearningTypeDetectionResult {
  const fullText = [
    topic,
    context?.backgroundKnowledge || '',
    ...(context?.goals || []),
  ].join(' ');
  
  // Calculate scores for both types
  const journeyIntentScore = calculateKeywordScore(fullText, JOURNEY_KEYWORDS.intent);
  const journeyDurationScore = calculateKeywordScore(fullText, JOURNEY_KEYWORDS.duration);
  const journeySubjectScore = calculateKeywordScore(fullText, JOURNEY_KEYWORDS.subjects);
  
  const quickQuestionScore = calculateKeywordScore(fullText, QUICK_KEYWORDS.questions);
  const quickImmediateScore = calculateKeywordScore(fullText, QUICK_KEYWORDS.immediate);
  const quickProblemScore = calculateKeywordScore(fullText, QUICK_KEYWORDS.problems);
  
  // Calculate weighted scores
  const journeyScore = 
    journeyIntentScore.score * 3 + 
    journeyDurationScore.score * 2 + 
    journeySubjectScore.score * 1;
    
  const quickScore = 
    quickQuestionScore.score * 2 + 
    quickImmediateScore.score * 2 + 
    quickProblemScore.score * 3;
  
  // Collect all matched keywords
  const allMatchedKeywords = [
    ...journeyIntentScore.matched,
    ...journeyDurationScore.matched,
    ...journeySubjectScore.matched,
    ...quickQuestionScore.matched,
    ...quickImmediateScore.matched,
    ...quickProblemScore.matched,
  ];
  
  // Determine type and confidence
  let detectedType: LearningDurationType;
  let confidence: number;
  let reasoning: string;
  
  const totalScore = journeyScore + quickScore;
  
  if (totalScore === 0) {
    // No clear indicators, default to quick for simple topics
    detectedType = topic.length > 50 ? 'journey' : 'quick';
    confidence = 40;
    reasoning = 'No clear learning type indicators found. Defaulting based on topic length.';
  } else if (journeyScore > quickScore) {
    detectedType = 'journey';
    confidence = Math.min(90, 50 + (journeyScore - quickScore) * 10);
    reasoning = `Detected long-term learning intent based on: ${journeyIntentScore.matched.join(', ') || 'subject complexity'}`;
  } else if (quickScore > journeyScore) {
    detectedType = 'quick';
    confidence = Math.min(90, 50 + (quickScore - journeyScore) * 10);
    reasoning = `Detected short-term learning intent based on: ${quickQuestionScore.matched.join(', ') || 'immediate need patterns'}`;
  } else {
    // Equal scores - use topic length as tiebreaker
    detectedType = topic.length > 30 ? 'journey' : 'quick';
    confidence = 50;
    reasoning = 'Mixed signals detected. Using topic complexity as tiebreaker.';
  }
  
  // If user has an existing learning path for this topic, lean towards journey
  if (context?.hasExistingPath) {
    detectedType = 'journey';
    confidence = Math.max(confidence, 70);
    reasoning += ' User has existing learning path for related topic.';
  }
  
  // Detect category
  const category = detectCategory(topic);
  
  // Estimate duration for journey type
  const suggestedDuration = detectedType === 'journey' 
    ? estimateDuration(category, topic) 
    : undefined;
  
  return {
    detectedType,
    confidence,
    category,
    suggestedDuration,
    reasoning,
    keywords: [...new Set(allMatchedKeywords)],
  };
}

/**
 * Check if a topic matches known long-term learning subjects
 */
export function isLongTermSubject(topic: string): boolean {
  const lowerTopic = topic.toLowerCase();
  return JOURNEY_KEYWORDS.subjects.some(subject => 
    lowerTopic.includes(subject.toLowerCase())
  );
}

/**
 * Get suggested milestones for a learning path based on category
 */
export function getSuggestedMilestones(
  category: LearningCategory,
  _topic: string
): string[] {
  const baseMilestones: Record<LearningCategory, string[]> = {
    language: [
      '基础语法和环境搭建',
      '核心概念和数据结构',
      '函数和模块化编程',
      '面向对象编程',
      '高级特性和最佳实践',
      '实战项目',
    ],
    framework: [
      '框架概述和环境配置',
      '核心概念和基本用法',
      '组件和模块系统',
      '状态管理和数据流',
      '路由和导航',
      '性能优化和部署',
    ],
    domain: [
      '领域概述和基本概念',
      '核心理论和方法论',
      '工具和技术栈',
      '实践案例分析',
      '进阶主题',
      '综合项目',
    ],
    skill: [
      '技能概述和基础',
      '核心技术点',
      '实践练习',
      '进阶应用',
    ],
    project: [
      '项目规划和需求分析',
      '技术选型和架构设计',
      '核心功能开发',
      '测试和优化',
      '部署和维护',
    ],
    certification: [
      '考试大纲和备考计划',
      '知识点复习',
      '真题练习',
      '模拟考试',
      '查漏补缺',
    ],
    concept: [
      '概念定义和背景',
      '核心原理',
      '应用场景',
    ],
    'problem-solving': [
      '问题分析',
      '解决方案探索',
      '实施和验证',
    ],
    other: [
      '学习目标确定',
      '基础知识',
      '进阶内容',
      '实践应用',
    ],
  };
  
  return baseMilestones[category] || baseMilestones.other;
}

/**
 * Format duration for display
 */
export function formatLearningDuration(duration: LearningPathDuration): string {
  const durationMap: Record<LearningPathDuration, string> = {
    days: '1-7 天',
    weeks: '1-4 周',
    months: '1-6 个月',
    'long-term': '6+ 个月',
  };
  return durationMap[duration];
}

/**
 * Format duration for display (English)
 */
export function formatLearningDurationEn(duration: LearningPathDuration): string {
  const durationMap: Record<LearningPathDuration, string> = {
    days: '1-7 days',
    weeks: '1-4 weeks',
    months: '1-6 months',
    'long-term': '6+ months',
  };
  return durationMap[duration];
}
