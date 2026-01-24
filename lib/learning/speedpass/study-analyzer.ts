/**
 * Study Analyzer
 * 
 * Analyzes study sessions, generates reports, and provides
 * recommendations for improving learning outcomes.
 */

import type {
  SpeedStudySession,
  SpeedLearningTutorial,
  Quiz,
  WrongQuestionRecord,
  StudyReport,
  TextbookKnowledgePoint,
} from '@/types/learning/speedpass';

// ============================================================================
// Types
// ============================================================================

export interface SessionAnalysis {
  sessionId: string;
  duration: {
    totalMs: number;
    activeMs: number;
    pausedMs: number;
  };
  progress: {
    sectionsCompleted: number;
    sectionsTotal: number;
    percentage: number;
  };
  performance: {
    questionsAttempted: number;
    questionsCorrect: number;
    accuracy: number;
  };
  pace: {
    avgTimePerSection: number;
    isOnTrack: boolean;
    estimatedCompletion: Date | null;
  };
}

export interface LearningInsights {
  strengthAreas: Array<{
    knowledgePointId: string;
    title: string;
    accuracy: number;
    confidence: 'high' | 'medium' | 'low';
  }>;
  weakAreas: Array<{
    knowledgePointId: string;
    title: string;
    accuracy: number;
    recommendedActions: string[];
  }>;
  learningPatterns: {
    bestTimeOfDay?: string;
    averageSessionLength: number;
    consistency: number;
  };
  predictions: {
    examReadiness: number;
    predictedScore: {
      min: number;
      max: number;
    };
    confidence: number;
  };
}

export interface StudyRecommendation {
  type: 'review' | 'practice' | 'new_content' | 'break';
  priority: 'high' | 'medium' | 'low';
  description: string;
  actionItems: string[];
  estimatedTime: number;
}

// ============================================================================
// Session Analysis Functions
// ============================================================================

/**
 * Analyze a study session
 */
export function analyzeSession(
  session: SpeedStudySession,
  tutorial: SpeedLearningTutorial
): SessionAnalysis {
  const now = new Date();
  const startTime = new Date(session.startedAt).getTime();
  const endTime = session.endedAt ? new Date(session.endedAt).getTime() : now.getTime();
  
  const totalMs = endTime - startTime;
  const activeMs = totalMs - session.totalPausedMs;
  
  const sectionsTotal = tutorial.sections.length;
  const sectionsCompleted = session.sectionsCompleted.length;
  const percentage = sectionsTotal > 0 ? Math.round((sectionsCompleted / sectionsTotal) * 100) : 0;
  
  const accuracy = session.questionsAttempted > 0
    ? Math.round((session.questionsCorrect / session.questionsAttempted) * 100)
    : 0;
  
  const avgTimePerSection = sectionsCompleted > 0 ? activeMs / sectionsCompleted : 0;
  const remainingSections = sectionsTotal - sectionsCompleted;
  const estimatedRemainingMs = remainingSections * avgTimePerSection;
  
  const isOnTrack = avgTimePerSection > 0 && 
    avgTimePerSection <= (tutorial.totalEstimatedMinutes * 60000 / sectionsTotal) * 1.2;
  
  const estimatedCompletion = remainingSections > 0
    ? new Date(now.getTime() + estimatedRemainingMs)
    : null;
  
  return {
    sessionId: session.id,
    duration: {
      totalMs,
      activeMs,
      pausedMs: session.totalPausedMs,
    },
    progress: {
      sectionsCompleted,
      sectionsTotal,
      percentage,
    },
    performance: {
      questionsAttempted: session.questionsAttempted,
      questionsCorrect: session.questionsCorrect,
      accuracy,
    },
    pace: {
      avgTimePerSection,
      isOnTrack,
      estimatedCompletion,
    },
  };
}

/**
 * Calculate study efficiency score
 */
export function calculateEfficiencyScore(analysis: SessionAnalysis): number {
  let score = 50; // Base score
  
  // Progress bonus (up to 20 points)
  score += (analysis.progress.percentage / 100) * 20;
  
  // Accuracy bonus (up to 20 points)
  score += (analysis.performance.accuracy / 100) * 20;
  
  // Pace bonus (up to 10 points)
  if (analysis.pace.isOnTrack) {
    score += 10;
  } else if (analysis.pace.avgTimePerSection > 0) {
    score += 5;
  }
  
  return Math.min(100, Math.round(score));
}

// ============================================================================
// Knowledge Point Analysis Functions
// ============================================================================

/**
 * Analyze knowledge point mastery
 */
export function analyzeKnowledgePointMastery(
  knowledgePoints: TextbookKnowledgePoint[],
  quizzes: Quiz[],
  wrongQuestions: WrongQuestionRecord[]
): Map<string, { mastery: number; attempts: number; lastAttempt?: Date }> {
  const masteryMap = new Map<string, { mastery: number; attempts: number; lastAttempt?: Date }>();
  
  // Initialize with all knowledge points
  for (const kp of knowledgePoints) {
    masteryMap.set(kp.id, { mastery: 0, attempts: 0 });
  }
  
  // Analyze quiz performance
  for (const quiz of quizzes) {
    for (const question of quiz.questions) {
      if (question.userAnswer === undefined) continue;
      
      for (const kpId of question.sourceQuestion.knowledgePointIds) {
        const current = masteryMap.get(kpId) || { mastery: 0, attempts: 0 };
        
        const newAttempts = current.attempts + 1;
        const correctWeight = question.isCorrect ? 1 : 0;
        
        // Weighted average with recency bias
        const newMastery = (current.mastery * current.attempts * 0.8 + correctWeight * 100) / 
                          (current.attempts * 0.8 + 1);
        
        masteryMap.set(kpId, {
          mastery: Math.round(newMastery),
          attempts: newAttempts,
          lastAttempt: question.attemptedAt || new Date(),
        });
      }
    }
  }
  
  // Factor in wrong questions (reduce mastery for unmastered wrong questions)
  for (const wq of wrongQuestions) {
    if (wq.status === 'mastered') continue;
    
    // Find related knowledge points from the question
    // Note: This requires the full question data, which we may not have here
    // For now, we'll skip this enhancement
  }
  
  return masteryMap;
}

/**
 * Identify weak knowledge points that need attention
 */
export function identifyWeakPoints(
  masteryMap: Map<string, { mastery: number; attempts: number }>,
  knowledgePoints: TextbookKnowledgePoint[],
  threshold: number = 60
): TextbookKnowledgePoint[] {
  const weakPoints: TextbookKnowledgePoint[] = [];
  
  for (const kp of knowledgePoints) {
    const data = masteryMap.get(kp.id);
    
    // Include if: low mastery AND at least one attempt, OR critical importance with no attempts
    if (data) {
      if ((data.mastery < threshold && data.attempts > 0) ||
          (data.attempts === 0 && kp.importance === 'critical')) {
        weakPoints.push(kp);
      }
    }
  }
  
  // Sort by importance then mastery
  return weakPoints.sort((a, b) => {
    const importanceOrder = ['critical', 'high', 'medium', 'low'];
    const aImportance = importanceOrder.indexOf(a.importance);
    const bImportance = importanceOrder.indexOf(b.importance);
    
    if (aImportance !== bImportance) return aImportance - bImportance;
    
    const aData = masteryMap.get(a.id);
    const bData = masteryMap.get(b.id);
    return (aData?.mastery || 0) - (bData?.mastery || 0);
  });
}

// ============================================================================
// Learning Insights Functions
// ============================================================================

/**
 * Generate learning insights from study data
 */
export function generateLearningInsights(
  sessions: SpeedStudySession[],
  quizzes: Quiz[],
  wrongQuestions: WrongQuestionRecord[],
  knowledgePoints: TextbookKnowledgePoint[]
): LearningInsights {
  const masteryMap = analyzeKnowledgePointMastery(knowledgePoints, quizzes, wrongQuestions);
  
  // Identify strengths
  const strengthAreas: LearningInsights['strengthAreas'] = [];
  const weakAreas: LearningInsights['weakAreas'] = [];
  
  for (const kp of knowledgePoints) {
    const data = masteryMap.get(kp.id);
    if (!data || data.attempts === 0) continue;
    
    if (data.mastery >= 80) {
      strengthAreas.push({
        knowledgePointId: kp.id,
        title: kp.title,
        accuracy: data.mastery,
        confidence: data.attempts >= 5 ? 'high' : data.attempts >= 3 ? 'medium' : 'low',
      });
    } else if (data.mastery < 60) {
      weakAreas.push({
        knowledgePointId: kp.id,
        title: kp.title,
        accuracy: data.mastery,
        recommendedActions: generateRecommendedActions(kp, data.mastery),
      });
    }
  }
  
  // Analyze learning patterns
  const sessionTimes = sessions.map((s) => new Date(s.startedAt).getHours());
  const avgSessionLength = sessions.length > 0
    ? sessions.reduce((sum, s) => sum + s.timeSpentMs, 0) / sessions.length
    : 0;
  
  // Calculate consistency (sessions in last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recentSessions = sessions.filter((s) => new Date(s.startedAt) >= weekAgo);
  const consistency = Math.min(100, (recentSessions.length / 7) * 100);
  
  // Determine best time of day
  let bestTimeOfDay: string | undefined;
  if (sessionTimes.length >= 3) {
    const hourCounts: Record<number, number> = {};
    for (const hour of sessionTimes) {
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
    const maxHour = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)[0];
    if (maxHour) {
      const hour = parseInt(maxHour[0]);
      if (hour < 12) bestTimeOfDay = '上午';
      else if (hour < 18) bestTimeOfDay = '下午';
      else bestTimeOfDay = '晚上';
    }
  }
  
  // Calculate exam readiness
  const totalKPs = knowledgePoints.length;
  const masteredKPs = [...masteryMap.values()].filter((d) => d.mastery >= 70).length;
  const examReadiness = totalKPs > 0 ? Math.round((masteredKPs / totalKPs) * 100) : 0;
  
  // Predict score based on mastery
  const avgMastery = [...masteryMap.values()].reduce((sum, d) => sum + d.mastery, 0) / 
                    Math.max(1, masteryMap.size);
  const predictedMin = Math.max(0, Math.round(avgMastery * 0.8));
  const predictedMax = Math.min(100, Math.round(avgMastery * 1.1));
  
  return {
    strengthAreas: strengthAreas.slice(0, 5),
    weakAreas: weakAreas.slice(0, 5),
    learningPatterns: {
      bestTimeOfDay,
      averageSessionLength: Math.round(avgSessionLength / 60000), // minutes
      consistency: Math.round(consistency),
    },
    predictions: {
      examReadiness,
      predictedScore: {
        min: predictedMin,
        max: predictedMax,
      },
      confidence: sessions.length >= 5 ? 0.8 : sessions.length >= 2 ? 0.5 : 0.3,
    },
  };
}

/**
 * Generate recommended actions for a weak knowledge point
 */
function generateRecommendedActions(kp: TextbookKnowledgePoint, mastery: number): string[] {
  const actions: string[] = [];
  
  if (mastery < 30) {
    actions.push('重新学习该知识点的基本概念');
    actions.push('观看相关视频或阅读教材原文');
  } else if (mastery < 50) {
    actions.push('复习该知识点的关键公式和定理');
    actions.push('做2-3道基础例题巩固理解');
  } else {
    actions.push('多做练习题提高熟练度');
    actions.push('注意总结做错的题目');
  }
  
  if (kp.formulas && kp.formulas.length > 0) {
    actions.push('牢记并理解相关公式');
  }
  
  return actions.slice(0, 3);
}

// ============================================================================
// Study Report Functions
// ============================================================================

/**
 * Generate comprehensive study report
 */
export function generateStudyReport(
  sessions: SpeedStudySession[],
  tutorials: SpeedLearningTutorial[],
  quizzes: Quiz[],
  wrongQuestions: WrongQuestionRecord[],
  knowledgePoints: TextbookKnowledgePoint[],
  userId: string,
  periodDays: number = 7
): StudyReport {
  const now = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - periodDays);
  
  // Filter to period
  const periodSessions = sessions.filter((s) => new Date(s.startedAt) >= periodStart);
  const _periodQuizzes = quizzes.filter((q) => q.startedAt && new Date(q.startedAt) >= periodStart);
  
  // Calculate totals
  const totalTimeSpentMs = periodSessions.reduce((sum, s) => sum + s.timeSpentMs, 0);
  const totalQuestionsAttempted = periodSessions.reduce((sum, s) => sum + s.questionsAttempted, 0);
  const totalQuestionsCorrect = periodSessions.reduce((sum, s) => sum + s.questionsCorrect, 0);
  
  // Get knowledge points covered
  const coveredKPIds = new Set<string>();
  for (const tutorial of tutorials) {
    for (const section of tutorial.sections) {
      if (tutorial.completedSectionIds.includes(section.id)) {
        coveredKPIds.add(section.knowledgePointId);
      }
    }
  }
  
  // Generate insights
  const insights = generateLearningInsights(sessions, quizzes, wrongQuestions, knowledgePoints);
  
  // Build report
  const report: StudyReport = {
    id: `report_${Date.now()}`,
    userId,
    generatedAt: now,
    studyPeriod: {
      start: periodStart,
      end: now,
    },
    totalTimeSpentMinutes: Math.round(totalTimeSpentMs / 60000),
    knowledgePointsCovered: coveredKPIds.size,
    questionsPracticed: totalQuestionsAttempted,
    accuracy: totalQuestionsAttempted > 0
      ? Math.round((totalQuestionsCorrect / totalQuestionsAttempted) * 100)
      : 0,
    strengthAreas: insights.strengthAreas.map((s) => ({
      knowledgePointId: s.knowledgePointId,
      title: s.title,
      accuracy: s.accuracy,
    })),
    weakAreas: insights.weakAreas.map((w) => ({
      knowledgePointId: w.knowledgePointId,
      title: w.title,
      accuracy: w.accuracy,
      recommendedExercises: [], // Would need question data to populate
    })),
    predictedScore: insights.predictions.examReadiness > 0
      ? {
          min: insights.predictions.predictedScore.min,
          max: insights.predictions.predictedScore.max,
          confidence: insights.predictions.confidence,
        }
      : undefined,
    nextSteps: generateNextSteps(insights, wrongQuestions),
    recommendedExercises: [],
    recommendedReviewPoints: insights.weakAreas.map((w) => w.knowledgePointId),
  };
  
  return report;
}

/**
 * Generate next steps recommendations
 */
function generateNextSteps(
  insights: LearningInsights,
  wrongQuestions: WrongQuestionRecord[]
): string[] {
  const steps: string[] = [];
  
  // Check weak areas
  if (insights.weakAreas.length > 0) {
    steps.push(`重点复习 ${insights.weakAreas.length} 个薄弱知识点`);
  }
  
  // Check wrong questions
  const unreviewedWrong = wrongQuestions.filter((w) => w.status !== 'mastered').length;
  if (unreviewedWrong > 0) {
    steps.push(`复习错题本中的 ${unreviewedWrong} 道题目`);
  }
  
  // Consistency recommendation
  if (insights.learningPatterns.consistency < 50) {
    steps.push('保持每天学习，提高学习连续性');
  }
  
  // Exam readiness
  if (insights.predictions.examReadiness < 60) {
    steps.push('继续学习新知识点，提高覆盖率');
  } else if (insights.predictions.examReadiness < 80) {
    steps.push('加强练习，巩固已学内容');
  } else {
    steps.push('进行模拟测试，检验学习效果');
  }
  
  return steps.slice(0, 4);
}

// ============================================================================
// Recommendation Functions
// ============================================================================

/**
 * Generate study recommendations
 */
export function generateRecommendations(
  insights: LearningInsights,
  wrongQuestions: WrongQuestionRecord[],
  lastSessionTime?: Date
): StudyRecommendation[] {
  const recommendations: StudyRecommendation[] = [];
  
  // Check if break is needed
  if (lastSessionTime) {
    const hoursSinceLastSession = (Date.now() - lastSessionTime.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastSession < 1) {
      recommendations.push({
        type: 'break',
        priority: 'medium',
        description: '适当休息有助于知识巩固',
        actionItems: ['休息10-15分钟', '做做眼保健操', '喝杯水补充水分'],
        estimatedTime: 15,
      });
    }
  }
  
  // Wrong questions review
  const dueForReview = wrongQuestions.filter(
    (w) => w.status !== 'mastered' && (!w.nextReviewAt || new Date(w.nextReviewAt) <= new Date())
  );
  if (dueForReview.length > 0) {
    recommendations.push({
      type: 'review',
      priority: 'high',
      description: `${dueForReview.length} 道错题需要复习`,
      actionItems: ['打开错题本', '逐题复习并重做', '标记仍然不会的题目'],
      estimatedTime: Math.min(30, dueForReview.length * 5),
    });
  }
  
  // Weak areas practice
  if (insights.weakAreas.length > 0) {
    recommendations.push({
      type: 'practice',
      priority: 'high',
      description: `加强 ${insights.weakAreas[0].title} 等薄弱知识点`,
      actionItems: insights.weakAreas[0].recommendedActions,
      estimatedTime: 20,
    });
  }
  
  // New content recommendation
  if (insights.predictions.examReadiness < 80) {
    recommendations.push({
      type: 'new_content',
      priority: 'medium',
      description: '继续学习新的知识点',
      actionItems: ['进入下一个学习章节', '完成相关练习题'],
      estimatedTime: 30,
    });
  }
  
  return recommendations.sort((a, b) => {
    const priorityOrder = ['high', 'medium', 'low'];
    return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
  });
}

/**
 * Format study time for display
 */
export function formatStudyTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}分钟`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) {
    return `${hours}小时`;
  }
  
  return `${hours}小时${mins}分钟`;
}

/**
 * Calculate streak days
 */
export function calculateStreak(sessions: SpeedStudySession[]): number {
  if (sessions.length === 0) return 0;
  
  // Sort by date descending
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
  
  // Get unique dates (YYYY-MM-DD format)
  const uniqueDates = [...new Set(
    sortedSessions.map((s) => new Date(s.startedAt).toISOString().split('T')[0])
  )];
  
  // Check if most recent is today or yesterday
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
    return 0; // Streak broken
  }
  
  // Count consecutive days
  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const current = new Date(uniqueDates[i - 1]);
    const prev = new Date(uniqueDates[i]);
    const diffDays = (current.getTime() - prev.getTime()) / 86400000;
    
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}
