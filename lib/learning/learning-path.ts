/**
 * Learning Path Management
 * 
 * Utilities for managing long-term learning paths with milestones,
 * progress tracking, and AI-powered recommendations.
 */

import { nanoid } from 'nanoid';
import type {
  LearningPath,
  LearningMilestone,
  LearningResource,
  LearningSchedule,
  LearningCategory,
  LearningPathDuration,
  CreateLearningPathInput,
} from '@/types/learning';
import { getSuggestedMilestones } from './learning-type-detector';

// ============================================================================
// Learning Path Creation
// ============================================================================

/**
 * Create a new learning path
 */
export function createLearningPath(
  sessionId: string,
  input: CreateLearningPathInput
): LearningPath {
  const now = new Date();
  const pathId = nanoid();
  
  // Generate milestones from input or use suggested ones
  const milestones: LearningMilestone[] = input.milestones?.map((m, index) => ({
    id: nanoid(),
    title: m.title,
    description: m.description,
    targetDate: m.targetDate,
    progress: 0,
    estimatedHours: m.estimatedHours,
    resources: m.resources?.map(r => ({ ...r, id: nanoid() })),
    prerequisites: index > 0 ? [input.milestones![index - 1].title] : undefined,
  })) || getSuggestedMilestones(input.category, input.title).map((title, index) => ({
    id: nanoid(),
    title,
    progress: 0,
    prerequisites: index > 0 ? undefined : undefined,
  }));
  
  return {
    id: pathId,
    sessionId,
    title: input.title,
    description: input.description,
    category: input.category,
    estimatedDuration: input.estimatedDuration,
    milestones,
    currentMilestoneId: milestones[0]?.id,
    overallProgress: 0,
    startedAt: now,
    lastActivityAt: now,
    targetCompletionDate: input.targetCompletionDate,
    schedule: input.schedule,
    totalTimeSpentMs: 0,
    sessionsCompleted: 0,
    streakDays: 0,
  };
}

/**
 * Create a default learning schedule
 */
export function createDefaultSchedule(): LearningSchedule {
  return {
    frequency: 'daily',
    daysPerWeek: 5,
    minutesPerSession: 30,
    remindersEnabled: true,
  };
}

// ============================================================================
// Progress Management
// ============================================================================

/**
 * Calculate overall path progress based on milestone completion
 */
export function calculatePathProgress(path: LearningPath): number {
  if (path.milestones.length === 0) return 0;
  
  const totalProgress = path.milestones.reduce((sum, m) => sum + m.progress, 0);
  return Math.round(totalProgress / path.milestones.length);
}

/**
 * Update milestone progress and recalculate path progress
 */
export function updateMilestoneProgress(
  path: LearningPath,
  milestoneId: string,
  progress: number
): LearningPath {
  const now = new Date();
  
  const updatedMilestones = path.milestones.map(m => {
    if (m.id !== milestoneId) return m;
    
    return {
      ...m,
      progress: Math.min(100, Math.max(0, progress)),
      completedAt: progress >= 100 ? now : undefined,
    };
  });
  
  const updatedPath: LearningPath = {
    ...path,
    milestones: updatedMilestones,
    lastActivityAt: now,
  };
  
  // Recalculate overall progress
  updatedPath.overallProgress = calculatePathProgress(updatedPath);
  
  // Check if path is complete
  if (updatedPath.overallProgress >= 100) {
    updatedPath.completedAt = now;
  }
  
  // Auto-advance to next milestone if current is complete
  if (progress >= 100) {
    const currentIndex = updatedMilestones.findIndex(m => m.id === milestoneId);
    if (currentIndex < updatedMilestones.length - 1) {
      updatedPath.currentMilestoneId = updatedMilestones[currentIndex + 1].id;
    }
  }
  
  return updatedPath;
}

/**
 * Mark a milestone as complete
 */
export function completeMilestone(
  path: LearningPath,
  milestoneId: string
): LearningPath {
  return updateMilestoneProgress(path, milestoneId, 100);
}

/**
 * Get the current milestone
 */
export function getCurrentMilestone(path: LearningPath): LearningMilestone | undefined {
  return path.milestones.find(m => m.id === path.currentMilestoneId);
}

/**
 * Get next milestones (incomplete ones after current)
 */
export function getNextMilestones(
  path: LearningPath,
  count: number = 3
): LearningMilestone[] {
  const currentIndex = path.milestones.findIndex(m => m.id === path.currentMilestoneId);
  return path.milestones
    .slice(currentIndex + 1)
    .filter(m => m.progress < 100)
    .slice(0, count);
}

/**
 * Get completed milestones
 */
export function getCompletedMilestones(path: LearningPath): LearningMilestone[] {
  return path.milestones.filter(m => m.progress >= 100);
}

// ============================================================================
// Resource Management
// ============================================================================

/**
 * Add a resource to a milestone
 */
export function addResourceToMilestone(
  path: LearningPath,
  milestoneId: string,
  resource: Omit<LearningResource, 'id'>
): LearningPath {
  const newResource: LearningResource = {
    ...resource,
    id: nanoid(),
  };
  
  return {
    ...path,
    milestones: path.milestones.map(m => {
      if (m.id !== milestoneId) return m;
      return {
        ...m,
        resources: [...(m.resources || []), newResource],
      };
    }),
    lastActivityAt: new Date(),
  };
}

/**
 * Mark a resource as completed
 */
export function markResourceCompleted(
  path: LearningPath,
  milestoneId: string,
  resourceId: string
): LearningPath {
  return {
    ...path,
    milestones: path.milestones.map(m => {
      if (m.id !== milestoneId) return m;
      return {
        ...m,
        resources: m.resources?.map(r =>
          r.id === resourceId ? { ...r, completed: true } : r
        ),
      };
    }),
    lastActivityAt: new Date(),
  };
}

// ============================================================================
// Time Tracking
// ============================================================================

/**
 * Record a study session
 */
export function recordStudySession(
  path: LearningPath,
  durationMs: number
): LearningPath {
  const now = new Date();
  const lastDate = path.lastActivityAt ? new Date(path.lastActivityAt) : null;
  
  // Check for streak continuation
  let newStreak = path.streakDays;
  if (lastDate) {
    const daysDiff = Math.floor(
      (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff === 1) {
      newStreak += 1;
    } else if (daysDiff > 1) {
      newStreak = 1; // Streak broken, start new
    }
    // daysDiff === 0 means same day, keep streak
  } else {
    newStreak = 1;
  }
  
  return {
    ...path,
    totalTimeSpentMs: path.totalTimeSpentMs + durationMs,
    sessionsCompleted: path.sessionsCompleted + 1,
    streakDays: newStreak,
    lastActivityAt: now,
  };
}

/**
 * Get estimated time remaining for path completion
 */
export function getEstimatedTimeRemaining(path: LearningPath): number {
  const remainingMilestones = path.milestones.filter(m => m.progress < 100);
  const totalEstimatedHours = remainingMilestones.reduce(
    (sum, m) => sum + (m.estimatedHours || 0),
    0
  );
  return totalEstimatedHours * 60 * 60 * 1000; // Convert to ms
}

// ============================================================================
// Duration Estimation
// ============================================================================

/**
 * Estimate duration in days based on path duration type
 */
export function getDurationInDays(duration: LearningPathDuration): { min: number; max: number } {
  switch (duration) {
    case 'days':
      return { min: 1, max: 7 };
    case 'weeks':
      return { min: 7, max: 28 };
    case 'months':
      return { min: 30, max: 180 };
    case 'long-term':
      return { min: 180, max: 365 };
    default:
      return { min: 7, max: 28 };
  }
}

/**
 * Calculate target completion date based on duration
 */
export function calculateTargetDate(
  startDate: Date,
  duration: LearningPathDuration
): Date {
  const { max } = getDurationInDays(duration);
  const target = new Date(startDate);
  target.setDate(target.getDate() + max);
  return target;
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format time spent for display
 */
export function formatTimeSpent(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format progress percentage
 */
export function formatProgress(progress: number): string {
  return `${Math.round(progress)}%`;
}

/**
 * Get progress color class based on percentage
 */
export function getProgressColorClass(progress: number): string {
  if (progress >= 100) return 'text-green-500';
  if (progress >= 75) return 'text-blue-500';
  if (progress >= 50) return 'text-yellow-500';
  if (progress >= 25) return 'text-orange-500';
  return 'text-muted-foreground';
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: LearningCategory): string {
  const names: Record<LearningCategory, string> = {
    concept: '概念理解',
    'problem-solving': '问题解决',
    skill: '技能学习',
    language: '编程语言',
    framework: '框架学习',
    domain: '领域知识',
    project: '项目实战',
    certification: '认证考试',
    other: '其他',
  };
  return names[category] || category;
}

/**
 * Get category display name (English)
 */
export function getCategoryDisplayNameEn(category: LearningCategory): string {
  const names: Record<LearningCategory, string> = {
    concept: 'Concept',
    'problem-solving': 'Problem Solving',
    skill: 'Skill',
    language: 'Programming Language',
    framework: 'Framework',
    domain: 'Domain Knowledge',
    project: 'Project',
    certification: 'Certification',
    other: 'Other',
  };
  return names[category] || category;
}
