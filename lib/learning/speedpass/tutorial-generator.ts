/**
 * Tutorial Generator
 * 
 * Generates speed learning tutorials based on teacher key points
 * and textbook content. Supports multiple learning modes.
 */

import type {
  SpeedLearningMode,
  SpeedLearningTutorial,
  TutorialSection,
  TextbookKnowledgePoint,
  TextbookQuestion,
  TextbookChapter,
  Textbook,
  MatchedKnowledgePoint,
} from '@/types/learning/speedpass';

// ============================================================================
// Types
// ============================================================================

export interface TutorialGenerationInput {
  textbook: Textbook;
  chapters: TextbookChapter[];
  knowledgePoints: TextbookKnowledgePoint[];
  questions: TextbookQuestion[];
  mode: SpeedLearningMode;
  teacherKeyPoints?: MatchedKnowledgePoint[];
  availableTimeMinutes?: number;
  userId: string;
  courseId: string;
}

export interface TutorialGenerationResult {
  tutorial: SpeedLearningTutorial;
  stats: {
    sectionsCount: number;
    knowledgePointsCovered: number;
    examplesIncluded: number;
    exercisesIncluded: number;
    estimatedMinutes: number;
  };
}

// ============================================================================
// Mode Configurations
// ============================================================================

const MODE_CONFIGS: Record<SpeedLearningMode, {
  maxSections: number;
  maxExamplesPerSection: number;
  maxExercisesPerSection: number;
  includeExercises: boolean;
  minutesPerSection: number;
  importanceFilter: ('critical' | 'high' | 'medium' | 'low')[];
}> = {
  extreme: {
    maxSections: 10,
    maxExamplesPerSection: 2,
    maxExercisesPerSection: 0,
    includeExercises: false,
    minutesPerSection: 8,
    importanceFilter: ['critical'],
  },
  speed: {
    maxSections: 20,
    maxExamplesPerSection: 3,
    maxExercisesPerSection: 2,
    includeExercises: true,
    minutesPerSection: 10,
    importanceFilter: ['critical', 'high'],
  },
  comprehensive: {
    maxSections: 50,
    maxExamplesPerSection: 5,
    maxExercisesPerSection: 5,
    includeExercises: true,
    minutesPerSection: 15,
    importanceFilter: ['critical', 'high', 'medium'],
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate quick summary for a knowledge point
 */
export function generateQuickSummary(kp: TextbookKnowledgePoint): string {
  if (kp.summary) return kp.summary;
  
  // Extract first meaningful paragraph
  const paragraphs = kp.content.split('\n\n').filter((p) => p.trim());
  const firstPara = paragraphs[0] || kp.content;
  
  // Remove formulas for summary
  const withoutFormulas = firstPara
    .replace(/\$\$[^$]+\$\$/g, '[公式]')
    .replace(/\$[^$]+\$/g, '[公式]');
  
  if (withoutFormulas.length <= 200) return withoutFormulas.trim();
  
  // Truncate at sentence boundary
  const sentences = withoutFormulas.match(/[^。！？.!?]+[。！？.!?]/g) || [];
  let summary = '';
  
  for (const sentence of sentences) {
    if ((summary + sentence).length <= 200) {
      summary += sentence;
    } else {
      break;
    }
  }
  
  return summary.trim() || withoutFormulas.slice(0, 197) + '...';
}

/**
 * Extract key points from content
 */
export function extractKeyPoints(content: string): string[] {
  const keyPoints: string[] = [];
  
  // Look for numbered points
  const numberedMatches = content.matchAll(/(?:^|\n)\s*(\d+)[\.、）]\s*([^\n]+)/g);
  for (const match of numberedMatches) {
    keyPoints.push(match[2].trim());
  }
  
  // Look for bullet points
  const bulletMatches = content.matchAll(/(?:^|\n)\s*[•·●○]\s*([^\n]+)/g);
  for (const match of bulletMatches) {
    keyPoints.push(match[1].trim());
  }
  
  // If no structured points found, extract first few sentences
  if (keyPoints.length === 0) {
    const sentences = content.match(/[^。！？.!?]+[。！？.!?]/g) || [];
    keyPoints.push(...sentences.slice(0, 3).map((s) => s.trim()));
  }
  
  return keyPoints.slice(0, 5);
}

/**
 * Calculate difficulty label
 */
export function getDifficultyLabel(difficulty: number): 'easy' | 'medium' | 'hard' {
  if (difficulty < 0.33) return 'easy';
  if (difficulty < 0.66) return 'medium';
  return 'hard';
}

/**
 * Generate memory tips for a knowledge point
 */
export function generateMemoryTips(kp: TextbookKnowledgePoint): string[] {
  const tips: string[] = [];
  
  // Add formula-based tips
  if (kp.formulas && kp.formulas.length > 0) {
    tips.push('牢记核心公式，理解每个符号的含义');
  }
  
  // Add type-based tips
  switch (kp.type) {
    case 'definition':
      tips.push('理解定义中的每个关键词');
      tips.push('尝试用自己的话复述定义');
      break;
    case 'theorem':
      tips.push('记住定理的条件和结论');
      tips.push('理解定理的证明思路');
      break;
    case 'formula':
      tips.push('多练习公式的应用');
      tips.push('注意公式的适用条件');
      break;
    case 'method':
      tips.push('按步骤练习解题方法');
      tips.push('注意每一步的关键操作');
      break;
    default:
      tips.push('多做相关练习题巩固理解');
  }
  
  return tips.slice(0, 3);
}

/**
 * Identify common mistakes for a knowledge point
 */
export function identifyCommonMistakes(kp: TextbookKnowledgePoint): string[] {
  const mistakes: string[] = [];
  
  // Type-specific common mistakes
  switch (kp.type) {
    case 'definition':
      mistakes.push('混淆相近概念的定义');
      mistakes.push('忽略定义中的限定条件');
      break;
    case 'theorem':
      mistakes.push('忘记验证定理的使用条件');
      mistakes.push('错误使用定理的逆命题');
      break;
    case 'formula':
      mistakes.push('公式记忆不准确');
      mistakes.push('忽略公式的适用范围');
      mistakes.push('计算过程中符号错误');
      break;
    case 'method':
      mistakes.push('步骤顺序错误');
      mistakes.push('遗漏关键步骤');
      break;
    default:
      mistakes.push('理解不够深入');
  }
  
  return mistakes.slice(0, 3);
}

// ============================================================================
// Main Generation Functions
// ============================================================================

/**
 * Generate a speed learning tutorial
 */
export function generateTutorial(input: TutorialGenerationInput): TutorialGenerationResult {
  const {
    textbook,
    chapters,
    knowledgePoints,
    questions,
    mode,
    teacherKeyPoints,
    userId,
    courseId,
  } = input;
  
  const config = MODE_CONFIGS[mode];
  
  // Filter knowledge points by importance
  let filteredKPs = knowledgePoints.filter((kp) =>
    config.importanceFilter.includes(kp.importance)
  );
  
  // If teacher key points provided, prioritize those
  if (teacherKeyPoints && teacherKeyPoints.length > 0) {
    const teacherKPIds = new Set(teacherKeyPoints.map((tkp) => tkp.matchedKnowledgePoint.id));
    
    // Sort: teacher-marked first, then by importance
    filteredKPs.sort((a, b) => {
      const aIsTeacher = teacherKPIds.has(a.id);
      const bIsTeacher = teacherKPIds.has(b.id);
      
      if (aIsTeacher !== bIsTeacher) return aIsTeacher ? -1 : 1;
      
      const importanceOrder = ['critical', 'high', 'medium', 'low'];
      return importanceOrder.indexOf(a.importance) - importanceOrder.indexOf(b.importance);
    });
  }
  
  // Limit to max sections
  filteredKPs = filteredKPs.slice(0, config.maxSections);
  
  // Generate sections
  const sections: TutorialSection[] = filteredKPs.map((kp, index) => {
    const chapter = chapters.find((c) => c.id === kp.chapterId);
    
    // Find related examples
    const relatedExamples = questions
      .filter((q) => q.sourceType === 'example' && kp.relatedExampleIds?.includes(q.id))
      .slice(0, config.maxExamplesPerSection);
    
    // Find related exercises
    const relatedExercises = config.includeExercises
      ? questions
          .filter((q) => q.sourceType === 'exercise' && kp.relatedExerciseIds?.includes(q.id))
          .slice(0, config.maxExercisesPerSection)
      : [];
    
    // Determine importance level based on teacher marking
    const isTeacherMarked = teacherKeyPoints?.some(
      (tkp) => tkp.matchedKnowledgePoint.id === kp.id
    );
    
    return {
      id: `section_${index + 1}`,
      knowledgePointId: kp.id,
      orderIndex: index,
      importanceLevel: isTeacherMarked ? 'critical' : kp.importance === 'critical' ? 'critical' : 'important',
      textbookLocation: {
        textbookName: textbook.name,
        chapter: chapter?.chapterNumber || '',
        section: chapter?.title || '',
        pageRange: `P${kp.pageNumber}`,
      },
      originalContent: kp.content,
      quickSummary: generateQuickSummary(kp),
      keyPoints: extractKeyPoints(kp.content),
      mustKnowFormulas: (kp.formulas || []).map((f) => ({
        formula: f,
        explanation: '',
        pageNumber: kp.pageNumber,
      })),
      examples: relatedExamples.map((ex) => ({
        questionId: ex.id,
        title: ex.questionNumber,
        difficulty: getDifficultyLabel(ex.difficulty),
        pageNumber: ex.pageNumber,
      })),
      recommendedExercises: relatedExercises.map((ex) => ({
        questionId: ex.id,
        number: ex.questionNumber,
        difficulty: getDifficultyLabel(ex.difficulty),
      })),
      commonMistakes: identifyCommonMistakes(kp),
      memoryTips: generateMemoryTips(kp),
      estimatedMinutes: config.minutesPerSection,
    } as TutorialSection;
  });
  
  // Calculate stats
  const totalExamples = sections.reduce((sum, s) => sum + s.examples.length, 0);
  const totalExercises = sections.reduce((sum, s) => sum + s.recommendedExercises.length, 0);
  const estimatedMinutes = sections.reduce((sum, s) => sum + s.estimatedMinutes, 0);
  
  // Create tutorial
  const tutorial: SpeedLearningTutorial = {
    id: `tutorial_${Date.now()}`,
    userId,
    courseId,
    textbookId: textbook.id,
    mode,
    createdAt: new Date(),
    teacherKeyPointIds: teacherKeyPoints?.map((tkp) => tkp.matchedKnowledgePoint.id) || [],
    title: generateTutorialTitle(textbook.name, mode),
    overview: generateTutorialOverview(mode, sections.length, estimatedMinutes),
    sections,
    totalEstimatedMinutes: estimatedMinutes,
    completedSectionIds: [],
    progress: 0,
  };
  
  return {
    tutorial,
    stats: {
      sectionsCount: sections.length,
      knowledgePointsCovered: sections.length,
      examplesIncluded: totalExamples,
      exercisesIncluded: totalExercises,
      estimatedMinutes,
    },
  };
}

/**
 * Generate tutorial title
 */
function generateTutorialTitle(textbookName: string, mode: SpeedLearningMode): string {
  const modeNames: Record<SpeedLearningMode, string> = {
    extreme: '极速',
    speed: '速成',
    comprehensive: '全面',
  };
  
  return `${textbookName} - ${modeNames[mode]}复习教程`;
}

/**
 * Generate tutorial overview
 */
function generateTutorialOverview(
  mode: SpeedLearningMode,
  sectionsCount: number,
  estimatedMinutes: number
): string {
  const modeDescriptions: Record<SpeedLearningMode, string> = {
    extreme: '极速模式：聚焦核心考点，快速过关',
    speed: '速成模式：重点+关联知识点，稳扎稳打',
    comprehensive: '全面模式：系统复习，冲击高分',
  };
  
  const hours = Math.floor(estimatedMinutes / 60);
  const mins = estimatedMinutes % 60;
  const timeStr = hours > 0 ? `${hours}小时${mins > 0 ? mins + '分钟' : ''}` : `${mins}分钟`;
  
  return `${modeDescriptions[mode]}\n\n本教程包含 ${sectionsCount} 个知识点，预计学习时间：${timeStr}`;
}

/**
 * Calculate optimal section order for learning
 */
export function optimizeSectionOrder(sections: TutorialSection[]): TutorialSection[] {
  // Sort by: importance (critical first), then by original order (prerequisite-aware)
  return [...sections].sort((a, b) => {
    const importanceOrder = ['critical', 'important', 'supplementary'];
    const aImportance = importanceOrder.indexOf(a.importanceLevel);
    const bImportance = importanceOrder.indexOf(b.importanceLevel);
    
    if (aImportance !== bImportance) return aImportance - bImportance;
    return a.orderIndex - b.orderIndex;
  });
}

/**
 * Estimate completion time based on user's pace
 */
export function estimateCompletionTime(
  tutorial: SpeedLearningTutorial,
  userPaceMultiplier: number = 1.0
): number {
  const remainingSections = tutorial.sections.filter(
    (s) => !tutorial.completedSectionIds.includes(s.id)
  );
  
  const baseMinutes = remainingSections.reduce((sum, s) => sum + s.estimatedMinutes, 0);
  return Math.round(baseMinutes * userPaceMultiplier);
}

/**
 * Get next recommended section
 */
export function getNextSection(tutorial: SpeedLearningTutorial): TutorialSection | undefined {
  if (tutorial.currentSectionId) {
    return tutorial.sections.find((s) => s.id === tutorial.currentSectionId);
  }
  
  // Find first incomplete section
  return tutorial.sections.find((s) => !tutorial.completedSectionIds.includes(s.id));
}

/**
 * Calculate tutorial progress percentage
 */
export function calculateProgress(tutorial: SpeedLearningTutorial): number {
  if (tutorial.sections.length === 0) return 0;
  return Math.round((tutorial.completedSectionIds.length / tutorial.sections.length) * 100);
}
