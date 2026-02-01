/**
 * Extreme Mode Engine
 *
 * Specialized engine for extreme (临考突击) learning mode.
 * Optimizes for minimal time investment with maximum exam-passing potential.
 *
 * Features:
 * - Only show critical knowledge points
 * - Auto-skip mastered content
 * - Smart time allocation
 * - Formula flash cards
 * - High-frequency question focus
 */

import type {
  TutorialSection,
  TextbookKnowledgePoint,
  TextbookQuestion,
  SpeedLearningMode,
} from '@/types/learning/speedpass';

// ============================================================================
// Types
// ============================================================================

export interface ExtremeModeConfig {
  totalTimeMinutes: number;
  targetScore: number; // 60-100
  prioritizeMustKnowFormulas: boolean;
  skipMasteredContent: boolean;
  focusHighFrequency: boolean;
}

export interface ExtremeModeSession {
  config: ExtremeModeConfig;
  startTime: Date;
  remainingTimeMs: number;
  currentPhase: 'formulas' | 'concepts' | 'practice' | 'review';
  completedItems: Set<string>;
  skippedItems: Set<string>;
  masteredItems: Set<string>;
}

export interface ExtremeModeItem {
  id: string;
  type: 'formula' | 'concept' | 'question';
  title: string;
  content: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedMinutes: number;
  isCompleted: boolean;
  isMastered: boolean;
}

export interface ExtremeModePhase {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  items: ExtremeModeItem[];
  estimatedMinutes: number;
  completedCount: number;
}

export interface ExtremeModeOverview {
  phases: ExtremeModePhase[];
  totalItems: number;
  completedItems: number;
  estimatedTotalMinutes: number;
  remainingMinutes: number;
  onTrack: boolean;
  recommendation: string;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_EXTREME_CONFIG: ExtremeModeConfig = {
  totalTimeMinutes: 90,
  targetScore: 60,
  prioritizeMustKnowFormulas: true,
  skipMasteredContent: true,
  focusHighFrequency: true,
};

// ============================================================================
// Engine Class
// ============================================================================

export class ExtremeModeEngine {
  private config: ExtremeModeConfig;
  private session: ExtremeModeSession | null = null;

  constructor(config: Partial<ExtremeModeConfig> = {}) {
    this.config = { ...DEFAULT_EXTREME_CONFIG, ...config };
  }

  /**
   * Start a new extreme mode session
   */
  startSession(): ExtremeModeSession {
    this.session = {
      config: this.config,
      startTime: new Date(),
      remainingTimeMs: this.config.totalTimeMinutes * 60 * 1000,
      currentPhase: 'formulas',
      completedItems: new Set(),
      skippedItems: new Set(),
      masteredItems: new Set(),
    };
    return this.session;
  }

  /**
   * Get current session
   */
  getSession(): ExtremeModeSession | null {
    return this.session;
  }

  /**
   * Update remaining time
   */
  updateRemainingTime(): number {
    if (!this.session) return 0;
    const elapsed = Date.now() - this.session.startTime.getTime();
    this.session.remainingTimeMs = Math.max(
      0,
      this.config.totalTimeMinutes * 60 * 1000 - elapsed
    );
    return this.session.remainingTimeMs;
  }

  /**
   * Filter sections for extreme mode - only critical and high priority
   */
  filterSectionsForExtremeMode(sections: TutorialSection[]): TutorialSection[] {
    return sections.filter(
      (section) =>
        section.importanceLevel === 'critical' ||
        section.importanceLevel === 'important'
    );
  }

  /**
   * Filter knowledge points for extreme mode
   */
  filterKnowledgePoints(
    knowledgePoints: TextbookKnowledgePoint[]
  ): TextbookKnowledgePoint[] {
    return knowledgePoints
      .filter((kp) => kp.importance === 'critical' || kp.importance === 'high')
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.importance] - priorityOrder[b.importance];
      });
  }

  /**
   * Filter questions for extreme mode - focus on high-frequency exam questions
   */
  filterQuestions(questions: TextbookQuestion[]): TextbookQuestion[] {
    return questions
      .filter((q) => q.sourceType === 'exam' || q.sourceType === 'example')
      .sort((a, b) => {
        // Prioritize exam questions over examples
        if (a.sourceType === 'exam' && b.sourceType !== 'exam') return -1;
        if (a.sourceType !== 'exam' && b.sourceType === 'exam') return 1;
        // Then sort by difficulty (easier first for quick wins)
        return a.difficulty - b.difficulty;
      })
      .slice(0, 10); // Limit to top 10 questions
  }

  /**
   * Generate extreme mode overview
   */
  generateOverview(
    sections: TutorialSection[],
    knowledgePoints: TextbookKnowledgePoint[],
    questions: TextbookQuestion[]
  ): ExtremeModeOverview {
    const filteredSections = this.filterSectionsForExtremeMode(sections);
    const filteredKPs = this.filterKnowledgePoints(knowledgePoints);
    const filteredQuestions = this.filterQuestions(questions);

    // Build phases
    const phases: ExtremeModePhase[] = [];

    // Phase 1: Formulas (if enabled)
    if (this.config.prioritizeMustKnowFormulas) {
      const formulas: ExtremeModeItem[] = filteredSections
        .flatMap((s) => s.mustKnowFormulas || [])
        .map((f, idx) => ({
          id: `formula_${idx}`,
          type: 'formula' as const,
          title: '公式速记',
          content: f.formula,
          priority: 'critical' as const,
          estimatedMinutes: 2,
          isCompleted: this.session?.completedItems.has(`formula_${idx}`) || false,
          isMastered: this.session?.masteredItems.has(`formula_${idx}`) || false,
        }));

      if (formulas.length > 0) {
        phases.push({
          id: 'formulas',
          name: 'Formula Flash Cards',
          nameZh: '公式速记',
          description: '核心公式快速记忆',
          items: formulas,
          estimatedMinutes: formulas.length * 2,
          completedCount: formulas.filter((f) => f.isCompleted).length,
        });
      }
    }

    // Phase 2: Core Concepts
    const concepts: ExtremeModeItem[] = filteredKPs.slice(0, 15).map((kp) => ({
      id: kp.id,
      type: 'concept' as const,
      title: kp.title,
      content: kp.summary || kp.content.substring(0, 200),
      priority: kp.importance as 'critical' | 'high' | 'medium' | 'low',
      estimatedMinutes: kp.importance === 'critical' ? 5 : 3,
      isCompleted: this.session?.completedItems.has(kp.id) || false,
      isMastered: this.session?.masteredItems.has(kp.id) || false,
    }));

    if (concepts.length > 0) {
      phases.push({
        id: 'concepts',
        name: 'Core Concepts',
        nameZh: '核心考点',
        description: '必考知识点速览',
        items: concepts,
        estimatedMinutes: concepts.reduce((sum, c) => sum + c.estimatedMinutes, 0),
        completedCount: concepts.filter((c) => c.isCompleted).length,
      });
    }

    // Phase 3: Quick Practice
    const practice: ExtremeModeItem[] = filteredQuestions.map((q) => ({
      id: q.id,
      type: 'question' as const,
      title: '练习题',
      content: q.content,
      priority: q.sourceType === 'exam' ? 'critical' as const : 'high' as const,
      estimatedMinutes: 3,
      isCompleted: this.session?.completedItems.has(q.id) || false,
      isMastered: this.session?.masteredItems.has(q.id) || false,
    }));

    if (practice.length > 0) {
      phases.push({
        id: 'practice',
        name: 'Quick Practice',
        nameZh: '快速刷题',
        description: '高频真题训练',
        items: practice,
        estimatedMinutes: practice.length * 3,
        completedCount: practice.filter((p) => p.isCompleted).length,
      });
    }

    // Calculate totals
    const totalItems = phases.reduce((sum, p) => sum + p.items.length, 0);
    const completedItems = phases.reduce((sum, p) => sum + p.completedCount, 0);
    const estimatedTotalMinutes = phases.reduce((sum, p) => sum + p.estimatedMinutes, 0);
    const remainingMinutes = this.session
      ? Math.round(this.session.remainingTimeMs / 60000)
      : this.config.totalTimeMinutes;

    const onTrack = estimatedTotalMinutes <= remainingMinutes;
    const recommendation = this.generateRecommendation(
      onTrack,
      remainingMinutes,
      completedItems,
      totalItems
    );

    return {
      phases,
      totalItems,
      completedItems,
      estimatedTotalMinutes,
      remainingMinutes,
      onTrack,
      recommendation,
    };
  }

  /**
   * Generate recommendation based on progress
   */
  private generateRecommendation(
    onTrack: boolean,
    remainingMinutes: number,
    completedItems: number,
    totalItems: number
  ): string {
    const progress = totalItems > 0 ? completedItems / totalItems : 0;

    if (remainingMinutes <= 0) {
      return '时间已到！建议快速浏览剩余公式，然后直接去考试。';
    }

    if (remainingMinutes <= 15) {
      return '仅剩15分钟！专注复习已完成内容，不要学新内容了。';
    }

    if (!onTrack) {
      return '时间紧迫！建议跳过非核心内容，专注必考公式和概念。';
    }

    if (progress < 0.3) {
      return '进度良好，继续保持节奏，优先完成公式速记。';
    }

    if (progress < 0.7) {
      return '已完成大部分内容，开始做真题练习巩固。';
    }

    return '即将完成！建议快速回顾重点内容，准备考试。';
  }

  /**
   * Mark item as completed
   */
  markCompleted(itemId: string): void {
    if (this.session) {
      this.session.completedItems.add(itemId);
    }
  }

  /**
   * Mark item as mastered (skip in future)
   */
  markMastered(itemId: string): void {
    if (this.session) {
      this.session.masteredItems.add(itemId);
      this.session.completedItems.add(itemId);
    }
  }

  /**
   * Skip item
   */
  skipItem(itemId: string): void {
    if (this.session) {
      this.session.skippedItems.add(itemId);
    }
  }

  /**
   * Advance to next phase
   */
  advancePhase(): void {
    if (!this.session) return;

    const phaseOrder: ExtremeModeSession['currentPhase'][] = [
      'formulas',
      'concepts',
      'practice',
      'review',
    ];
    const currentIndex = phaseOrder.indexOf(this.session.currentPhase);
    if (currentIndex < phaseOrder.length - 1) {
      this.session.currentPhase = phaseOrder[currentIndex + 1];
    }
  }

  /**
   * Get time allocation recommendation
   */
  getTimeAllocation(): {
    formulas: number;
    concepts: number;
    practice: number;
    review: number;
  } {
    const total = this.config.totalTimeMinutes;
    
    // For passing score (60-70), focus more on formulas and key concepts
    if (this.config.targetScore <= 70) {
      return {
        formulas: Math.round(total * 0.25),
        concepts: Math.round(total * 0.35),
        practice: Math.round(total * 0.25),
        review: Math.round(total * 0.15),
      };
    }

    // For higher scores, more practice
    return {
      formulas: Math.round(total * 0.2),
      concepts: Math.round(total * 0.3),
      practice: Math.round(total * 0.35),
      review: Math.round(total * 0.15),
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createExtremeModeEngine(
  config?: Partial<ExtremeModeConfig>
): ExtremeModeEngine {
  return new ExtremeModeEngine(config);
}

// ============================================================================
// Utility Functions
// ============================================================================

export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function getUrgencyLevel(remainingMinutes: number): 'critical' | 'warning' | 'normal' {
  if (remainingMinutes <= 15) return 'critical';
  if (remainingMinutes <= 30) return 'warning';
  return 'normal';
}

export function getModeRecommendation(
  availableMinutes: number,
  targetScore: number
): SpeedLearningMode {
  // For very limited time, always extreme
  if (availableMinutes <= 90) return 'extreme';
  
  // For moderate time, depends on target score
  if (availableMinutes <= 180) {
    return targetScore >= 80 ? 'speed' : 'extreme';
  }
  
  // For sufficient time
  if (availableMinutes <= 360) {
    return targetScore >= 85 ? 'comprehensive' : 'speed';
  }
  
  return 'comprehensive';
}

export default ExtremeModeEngine;
