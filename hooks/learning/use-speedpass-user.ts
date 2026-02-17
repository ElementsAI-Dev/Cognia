/**
 * SpeedPass User Hook
 *
 * Manages user profile and preferences for SpeedPass learning mode.
 * Currently uses local storage; can be extended for cloud sync.
 */

import { useCallback, useMemo } from 'react';
import { useSpeedPassStore } from '@/stores/learning/speedpass-store';
import { DEFAULT_SPEEDPASS_USER_ID } from '@/types/learning/speedpass';

// ============================================================================
// Types
// ============================================================================

export interface SpeedPassUserProfile {
  id: string;
  displayName: string;
  preferredMode: 'extreme' | 'speed' | 'comprehensive';
  studyGoal: 'passing' | 'good' | 'excellent';
  dailyStudyTarget: number; // minutes
  reminderEnabled: boolean;
  reminderTime?: string; // HH:mm format
}

export interface SpeedPassUserStats {
  totalStudyDays: number;
  currentStreak: number;
  longestStreak: number;
  totalQuizzes: number;
  averageAccuracy: number;
  totalStudyTimeMs: number;
  textbooksCount: number;
  tutorialsCompleted: number;
}

export interface SpeedPassUserProgress {
  level: number;
  experience: number;
  nextLevelExperience: number;
  badges: string[];
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  unlockedAt?: Date;
  progress?: number;
  target?: number;
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_USER_PROFILE: SpeedPassUserProfile = {
  id: DEFAULT_SPEEDPASS_USER_ID,
  displayName: '学习者',
  preferredMode: 'speed',
  studyGoal: 'good',
  dailyStudyTarget: 60,
  reminderEnabled: false,
};

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_session',
    name: 'First Steps',
    nameZh: '迈出第一步',
    description: '完成第一次学习',
  },
  {
    id: 'streak_3',
    name: '3-Day Streak',
    nameZh: '连续学习3天',
    description: '连续3天进行学习',
  },
  {
    id: 'streak_7',
    name: 'Weekly Warrior',
    nameZh: '周学习达人',
    description: '连续7天进行学习',
  },
  {
    id: 'quiz_master',
    name: 'Quiz Master',
    nameZh: '答题高手',
    description: '完成10次测验',
  },
  {
    id: 'accuracy_90',
    name: 'Precision Expert',
    nameZh: '精准专家',
    description: '平均正确率达到90%',
  },
  {
    id: 'textbook_scholar',
    name: 'Textbook Scholar',
    nameZh: '教材学者',
    description: '上传3本教材',
  },
  {
    id: 'extreme_survivor',
    name: 'Extreme Survivor',
    nameZh: '极速模式存活者',
    description: '完成3次极速模式学习',
  },
  {
    id: 'study_10h',
    name: 'Dedicated Learner',
    nameZh: '勤奋学习者',
    description: '累计学习10小时',
  },
];

// ============================================================================
// Hook
// ============================================================================

export function useSpeedPassUser() {
  const speedpassStore = useSpeedPassStore();

  // Get user profile from speedpass store or use default
  const profile = useMemo((): SpeedPassUserProfile => {
    const stored = speedpassStore.userProfile as SpeedPassUserProfile | undefined;
    return stored || DEFAULT_USER_PROFILE;
  }, [speedpassStore.userProfile]);

  // Calculate user stats from store data
  const stats = useMemo((): SpeedPassUserStats => {
    const globalStats = speedpassStore.globalStats;
    const sessions = Object.values(speedpassStore.studySessions);
    const textbooks = Object.values(speedpassStore.textbooks);
    const tutorials = Object.values(speedpassStore.tutorials);

    // Calculate streak
    const now = new Date();
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const studyDates = new Set<string>();

    for (const session of sessions) {
      const dateStr = new Date(session.startedAt).toISOString().split('T')[0];
      studyDates.add(dateStr);
    }

    for (let i = 0; i < 365; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      if (studyDates.has(dateStr)) {
        tempStreak++;
        if (i === 0 || currentStreak > 0) {
          currentStreak = tempStreak;
        }
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        if (i === 0) currentStreak = 0;
        tempStreak = 0;
      }
    }

    return {
      totalStudyDays: studyDates.size,
      currentStreak,
      longestStreak,
      totalQuizzes: globalStats.quizzesCompleted,
      averageAccuracy: globalStats.averageAccuracy,
      totalStudyTimeMs: globalStats.totalStudyTimeMs,
      textbooksCount: textbooks.length,
      tutorialsCompleted: tutorials.filter((t) => t.completedAt).length,
    };
  }, [speedpassStore]);

  // Calculate progress and achievements
  const progress = useMemo((): SpeedPassUserProgress => {
    const experience = Math.floor(stats.totalStudyTimeMs / 60000); // 1 XP per minute
    const level = Math.floor(Math.sqrt(experience / 100)) + 1;
    const nextLevelExperience = Math.pow(level, 2) * 100;

    // Check achievements
    const unlockedAchievements: Achievement[] = ACHIEVEMENTS.map((achievement) => {
      let unlocked = false;
      let progress = 0;
      let target = 1;

      switch (achievement.id) {
        case 'first_session':
          unlocked = stats.totalStudyDays >= 1;
          progress = Math.min(stats.totalStudyDays, 1);
          break;
        case 'streak_3':
          unlocked = stats.longestStreak >= 3;
          progress = Math.min(stats.currentStreak, 3);
          target = 3;
          break;
        case 'streak_7':
          unlocked = stats.longestStreak >= 7;
          progress = Math.min(stats.currentStreak, 7);
          target = 7;
          break;
        case 'quiz_master':
          unlocked = stats.totalQuizzes >= 10;
          progress = Math.min(stats.totalQuizzes, 10);
          target = 10;
          break;
        case 'accuracy_90':
          unlocked = stats.averageAccuracy >= 90;
          progress = Math.min(stats.averageAccuracy, 100);
          target = 90;
          break;
        case 'textbook_scholar':
          unlocked = stats.textbooksCount >= 3;
          progress = Math.min(stats.textbooksCount, 3);
          target = 3;
          break;
        case 'extreme_survivor':
          // Would need to track extreme mode sessions separately
          progress = 0;
          target = 3;
          break;
        case 'study_10h':
          unlocked = stats.totalStudyTimeMs >= 10 * 3600000;
          progress = Math.min(Math.floor(stats.totalStudyTimeMs / 3600000), 10);
          target = 10;
          break;
      }

      return {
        ...achievement,
        unlockedAt: unlocked ? new Date() : undefined,
        progress,
        target,
      };
    });

    const badges = unlockedAchievements
      .filter((a) => a.unlockedAt)
      .map((a) => a.id);

    return {
      level,
      experience,
      nextLevelExperience,
      badges,
      achievements: unlockedAchievements,
    };
  }, [stats]);

  // Update profile
  const updateProfile = useCallback(
    (updates: Partial<SpeedPassUserProfile>) => {
      const newProfile = { ...profile, ...updates };
      speedpassStore.setUserProfile(newProfile);
    },
    [profile, speedpassStore]
  );

  // Check if daily goal is met
  const isDailyGoalMet = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = Object.values(speedpassStore.studySessions).filter((s) => {
      const sessionDate = new Date(s.startedAt).toISOString().split('T')[0];
      return sessionDate === today;
    });

    const todayStudyTimeMs = todaySessions.reduce(
      (sum, s) => sum + (s.timeSpentMs || 0),
      0
    );
    const todayStudyMinutes = todayStudyTimeMs / 60000;

    return todayStudyMinutes >= profile.dailyStudyTarget;
  }, [speedpassStore.studySessions, profile.dailyStudyTarget]);

  // Get today's progress
  const todayProgress = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = Object.values(speedpassStore.studySessions).filter((s) => {
      const sessionDate = new Date(s.startedAt).toISOString().split('T')[0];
      return sessionDate === today;
    });

    const todayStudyTimeMs = todaySessions.reduce(
      (sum, s) => sum + (s.timeSpentMs || 0),
      0
    );
    const todayStudyMinutes = todayStudyTimeMs / 60000;
    const targetMinutes = profile.dailyStudyTarget;

    return {
      studyMinutes: Math.round(todayStudyMinutes),
      targetMinutes,
      percentage: Math.min(Math.round((todayStudyMinutes / targetMinutes) * 100), 100),
    };
  }, [speedpassStore.studySessions, profile.dailyStudyTarget]);

  return {
    profile,
    stats,
    progress,
    updateProfile,
    isDailyGoalMet,
    todayProgress,
    isAuthenticated: false, // Always false for local mode
    isLocalMode: true,
  };
}

export default useSpeedPassUser;
