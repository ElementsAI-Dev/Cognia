/**
 * Learning Path Management Tests
 * 
 * Tests for learning path creation, progress tracking, and milestone management.
 */

import {
  createLearningPath,
  createDefaultSchedule,
  calculatePathProgress,
  updateMilestoneProgress,
  completeMilestone,
  getCurrentMilestone,
  getNextMilestones,
  getCompletedMilestones,
  addResourceToMilestone,
  markResourceCompleted,
  recordStudySession,
  getDurationInDays,
  calculateTargetDate,
  formatTimeSpent,
  formatProgress,
  getProgressColorClass,
  getCategoryDisplayName,
  getCategoryDisplayNameEn,
} from './learning-path';
import type { CreateLearningPathInput, LearningPath } from '@/types/learning';

describe('Learning Path Management', () => {
  const createTestInput = (): CreateLearningPathInput => ({
    title: 'Learn Python',
    description: 'A comprehensive Python learning path',
    category: 'language',
    estimatedDuration: 'months',
  });

  describe('createLearningPath', () => {
    it('should create a new learning path with default milestones', () => {
      const path = createLearningPath('session-1', createTestInput());
      
      expect(path.id).toBeDefined();
      expect(path.sessionId).toBe('session-1');
      expect(path.title).toBe('Learn Python');
      expect(path.category).toBe('language');
      expect(path.milestones.length).toBeGreaterThan(0);
      expect(path.overallProgress).toBe(0);
      expect(path.currentMilestoneId).toBe(path.milestones[0].id);
    });

    it('should create path with custom milestones', () => {
      const input: CreateLearningPathInput = {
        ...createTestInput(),
        milestones: [
          { title: 'Setup', description: 'Install Python' },
          { title: 'Basics', description: 'Learn syntax' },
        ],
      };
      
      const path = createLearningPath('session-1', input);
      
      expect(path.milestones.length).toBe(2);
      expect(path.milestones[0].title).toBe('Setup');
      expect(path.milestones[1].title).toBe('Basics');
    });

    it('should include schedule if provided', () => {
      const input: CreateLearningPathInput = {
        ...createTestInput(),
        schedule: {
          frequency: 'daily',
          minutesPerSession: 30,
          remindersEnabled: true,
        },
      };
      
      const path = createLearningPath('session-1', input);
      
      expect(path.schedule).toBeDefined();
      expect(path.schedule?.frequency).toBe('daily');
    });
  });

  describe('createDefaultSchedule', () => {
    it('should create a default schedule with sensible defaults', () => {
      const schedule = createDefaultSchedule();
      
      expect(schedule.frequency).toBe('daily');
      expect(schedule.daysPerWeek).toBe(5);
      expect(schedule.minutesPerSession).toBe(30);
      expect(schedule.remindersEnabled).toBe(true);
    });
  });

  describe('calculatePathProgress', () => {
    it('should return 0 for path with no milestones', () => {
      const path: LearningPath = {
        ...createLearningPath('session-1', createTestInput()),
        milestones: [],
      };
      
      expect(calculatePathProgress(path)).toBe(0);
    });

    it('should calculate progress based on milestone completion', () => {
      const path = createLearningPath('session-1', createTestInput());
      path.milestones[0].progress = 100;
      path.milestones[1].progress = 50;
      
      const progress = calculatePathProgress(path);
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThan(100);
    });

    it('should return 100 when all milestones are complete', () => {
      const path = createLearningPath('session-1', createTestInput());
      path.milestones.forEach(m => { m.progress = 100; });
      
      expect(calculatePathProgress(path)).toBe(100);
    });
  });

  describe('updateMilestoneProgress', () => {
    it('should update milestone progress', () => {
      const path = createLearningPath('session-1', createTestInput());
      const milestoneId = path.milestones[0].id;
      
      const updatedPath = updateMilestoneProgress(path, milestoneId, 50);
      
      expect(updatedPath.milestones[0].progress).toBe(50);
    });

    it('should cap progress at 100', () => {
      const path = createLearningPath('session-1', createTestInput());
      const milestoneId = path.milestones[0].id;
      
      const updatedPath = updateMilestoneProgress(path, milestoneId, 150);
      
      expect(updatedPath.milestones[0].progress).toBe(100);
    });

    it('should not allow negative progress', () => {
      const path = createLearningPath('session-1', createTestInput());
      const milestoneId = path.milestones[0].id;
      
      const updatedPath = updateMilestoneProgress(path, milestoneId, -10);
      
      expect(updatedPath.milestones[0].progress).toBe(0);
    });

    it('should auto-advance to next milestone when current is complete', () => {
      const path = createLearningPath('session-1', createTestInput());
      const firstMilestoneId = path.milestones[0].id;
      
      const updatedPath = updateMilestoneProgress(path, firstMilestoneId, 100);
      
      expect(updatedPath.currentMilestoneId).toBe(path.milestones[1].id);
    });

    it('should mark path as complete when all milestones done', () => {
      let path = createLearningPath('session-1', createTestInput());
      
      for (const milestone of path.milestones) {
        path = updateMilestoneProgress(path, milestone.id, 100);
      }
      
      expect(path.overallProgress).toBe(100);
      expect(path.completedAt).toBeDefined();
    });
  });

  describe('completeMilestone', () => {
    it('should mark milestone as 100% complete', () => {
      const path = createLearningPath('session-1', createTestInput());
      const milestoneId = path.milestones[0].id;
      
      const updatedPath = completeMilestone(path, milestoneId);
      
      expect(updatedPath.milestones[0].progress).toBe(100);
      expect(updatedPath.milestones[0].completedAt).toBeDefined();
    });
  });

  describe('getCurrentMilestone', () => {
    it('should return current milestone', () => {
      const path = createLearningPath('session-1', createTestInput());
      
      const current = getCurrentMilestone(path);
      
      expect(current).toBeDefined();
      expect(current?.id).toBe(path.currentMilestoneId);
    });

    it('should return undefined if no current milestone', () => {
      const path = createLearningPath('session-1', createTestInput());
      path.currentMilestoneId = undefined;
      
      expect(getCurrentMilestone(path)).toBeUndefined();
    });
  });

  describe('getNextMilestones', () => {
    it('should return upcoming milestones', () => {
      const path = createLearningPath('session-1', createTestInput());
      
      const next = getNextMilestones(path, 2);
      
      expect(next.length).toBeLessThanOrEqual(2);
    });

    it('should not include completed milestones', () => {
      const path = createLearningPath('session-1', createTestInput());
      path.milestones[1].progress = 100;
      
      const next = getNextMilestones(path, 5);
      
      expect(next.every(m => m.progress < 100)).toBe(true);
    });
  });

  describe('getCompletedMilestones', () => {
    it('should return completed milestones', () => {
      const path = createLearningPath('session-1', createTestInput());
      path.milestones[0].progress = 100;
      path.milestones[1].progress = 100;
      
      const completed = getCompletedMilestones(path);
      
      expect(completed.length).toBe(2);
    });

    it('should return empty array if none completed', () => {
      const path = createLearningPath('session-1', createTestInput());
      
      expect(getCompletedMilestones(path)).toHaveLength(0);
    });
  });

  describe('addResourceToMilestone', () => {
    it('should add resource to milestone', () => {
      const path = createLearningPath('session-1', createTestInput());
      const milestoneId = path.milestones[0].id;
      
      const updatedPath = addResourceToMilestone(path, milestoneId, {
        title: 'Python Tutorial',
        type: 'video',
        url: 'https://example.com/tutorial',
        completed: false,
      });
      
      expect(updatedPath.milestones[0].resources).toHaveLength(1);
      expect(updatedPath.milestones[0].resources?.[0].title).toBe('Python Tutorial');
    });
  });

  describe('markResourceCompleted', () => {
    it('should mark resource as completed', () => {
      let path = createLearningPath('session-1', createTestInput());
      const milestoneId = path.milestones[0].id;
      
      path = addResourceToMilestone(path, milestoneId, {
        title: 'Tutorial',
        type: 'article',
        completed: false,
      });
      
      const resourceId = path.milestones[0].resources?.[0].id || '';
      const updatedPath = markResourceCompleted(path, milestoneId, resourceId);
      
      expect(updatedPath.milestones[0].resources?.[0].completed).toBe(true);
    });
  });

  describe('recordStudySession', () => {
    it('should record study session duration', () => {
      const path = createLearningPath('session-1', createTestInput());
      const duration = 30 * 60 * 1000; // 30 minutes
      
      const updatedPath = recordStudySession(path, duration);
      
      expect(updatedPath.totalTimeSpentMs).toBe(duration);
      expect(updatedPath.sessionsCompleted).toBe(1);
    });

    it('should accumulate time across sessions', () => {
      let path = createLearningPath('session-1', createTestInput());
      const duration = 30 * 60 * 1000;
      
      path = recordStudySession(path, duration);
      path = recordStudySession(path, duration);
      
      expect(path.totalTimeSpentMs).toBe(duration * 2);
      expect(path.sessionsCompleted).toBe(2);
    });
  });

  describe('getDurationInDays', () => {
    it('should return correct range for days', () => {
      const range = getDurationInDays('days');
      expect(range.min).toBe(1);
      expect(range.max).toBe(7);
    });

    it('should return correct range for weeks', () => {
      const range = getDurationInDays('weeks');
      expect(range.min).toBe(7);
      expect(range.max).toBe(28);
    });

    it('should return correct range for months', () => {
      const range = getDurationInDays('months');
      expect(range.min).toBe(30);
      expect(range.max).toBe(180);
    });

    it('should return correct range for long-term', () => {
      const range = getDurationInDays('long-term');
      expect(range.min).toBe(180);
      expect(range.max).toBe(365);
    });
  });

  describe('calculateTargetDate', () => {
    it('should calculate target date based on duration', () => {
      const startDate = new Date('2024-01-01');
      const target = calculateTargetDate(startDate, 'weeks');
      
      expect(target.getTime()).toBeGreaterThan(startDate.getTime());
    });
  });

  describe('formatTimeSpent', () => {
    it('should format minutes correctly', () => {
      expect(formatTimeSpent(30 * 60 * 1000)).toBe('30m');
    });

    it('should format hours and minutes correctly', () => {
      expect(formatTimeSpent(90 * 60 * 1000)).toBe('1h 30m');
    });

    it('should format hours correctly', () => {
      expect(formatTimeSpent(2 * 60 * 60 * 1000)).toBe('2h 0m');
    });
  });

  describe('formatProgress', () => {
    it('should format progress as percentage', () => {
      expect(formatProgress(50)).toBe('50%');
      expect(formatProgress(100)).toBe('100%');
      expect(formatProgress(33.33)).toBe('33%');
    });
  });

  describe('getProgressColorClass', () => {
    it('should return green for 100%', () => {
      expect(getProgressColorClass(100)).toBe('text-green-500');
    });

    it('should return blue for 75%+', () => {
      expect(getProgressColorClass(80)).toBe('text-blue-500');
    });

    it('should return yellow for 50%+', () => {
      expect(getProgressColorClass(60)).toBe('text-yellow-500');
    });

    it('should return orange for 25%+', () => {
      expect(getProgressColorClass(30)).toBe('text-orange-500');
    });

    it('should return muted for less than 25%', () => {
      expect(getProgressColorClass(10)).toBe('text-muted-foreground');
    });
  });

  describe('getCategoryDisplayName', () => {
    it('should return Chinese display names', () => {
      expect(getCategoryDisplayName('language')).toBe('编程语言');
      expect(getCategoryDisplayName('framework')).toBe('框架学习');
      expect(getCategoryDisplayName('domain')).toBe('领域知识');
    });
  });

  describe('getCategoryDisplayNameEn', () => {
    it('should return English display names', () => {
      expect(getCategoryDisplayNameEn('language')).toBe('Programming Language');
      expect(getCategoryDisplayNameEn('framework')).toBe('Framework');
      expect(getCategoryDisplayNameEn('domain')).toBe('Domain Knowledge');
    });
  });
});
