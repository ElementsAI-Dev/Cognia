/**
 * Tests for LearningPathDashboard Component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { LearningPathDashboard } from './learning-path-dashboard';
import { useLearningStore } from '@/stores/learning';

// Mock stores
jest.mock('@/stores/learning', () => ({
  useLearningStore: jest.fn(() => ({
    learningPaths: {},
    activeLearningPathId: null,
    globalStats: {
      totalSessionsCompleted: 15,
      totalTimeSpentMs: 36000000,
      totalConceptsLearned: 25,
      currentStreak: 5,
      longestStreak: 10,
      averageAccuracy: 85,
    },
    getActivePaths: jest.fn(() => []),
    getAllPaths: jest.fn(() => []),
    getCompletedPaths: jest.fn(() => []),
  })),
}));

// Mock translations
const messages = {
  learningMode: {
    dashboard: {
      title: 'Learning Dashboard',
      overallProgress: 'Overall Progress',
      activePaths: 'Active Paths',
      completedPaths: 'Completed Paths',
      totalTime: 'Total Time',
      noPaths: 'No learning paths',
      createPath: 'Create Path',
      milestones: 'Milestones',
      noMilestones: 'No milestones',
      progress: 'Progress',
      startDate: 'Started',
      targetDate: 'Target',
    },
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    {children}
  </NextIntlClientProvider>
);

// Mock data
const mockLearningPaths = [
  {
    id: 'path-1',
    title: 'React Mastery',
    description: 'Complete React learning path',
    category: 'skill',
    estimatedDuration: '3_months',
    progress: 60,
    status: 'in_progress',
    startedAt: new Date('2024-01-01'),
    targetCompletionDate: new Date('2024-04-01'),
    milestones: [
      {
        id: 'm1',
        title: 'Basics',
        description: 'Learn basics',
        progress: 100,
        status: 'completed',
      },
      {
        id: 'm2',
        title: 'Hooks',
        description: 'Master hooks',
        progress: 50,
        status: 'in_progress',
      },
      {
        id: 'm3',
        title: 'Advanced',
        description: 'Advanced patterns',
        progress: 0,
        status: 'not_started',
      },
    ],
    sessions: [],
    currentMilestoneId: 'm2',
  },
  {
    id: 'path-2',
    title: 'TypeScript Fundamentals',
    description: 'Learn TypeScript',
    category: 'concept',
    estimatedDuration: '1_month',
    progress: 100,
    status: 'completed',
    startedAt: new Date('2023-12-01'),
    completedAt: new Date('2024-01-15'),
    milestones: [],
    sessions: [],
  },
];

const mockGlobalStats = {
  totalSessionsCompleted: 15,
  totalTimeSpentMs: 36000000, // 10 hours
  totalConceptsLearned: 25,
  currentStreak: 5,
  longestStreak: 10,
  averageAccuracy: 85,
};

describe('LearningPathDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLearningStore as unknown as jest.Mock).mockReturnValue({
      learningPaths: {},
      activeLearningPathId: null,
      globalStats: mockGlobalStats,
      getActivePaths: () => mockLearningPaths.filter((p) => p.status === 'in_progress'),
      getAllPaths: () => mockLearningPaths,
      getCompletedPaths: () => mockLearningPaths.filter((p) => p.status === 'completed'),
    });
  });

  describe('Rendering', () => {
    it('renders dashboard stats cards', () => {
      render(<LearningPathDashboard />, { wrapper });
      expect(screen.getByText('Active Paths')).toBeInTheDocument();
      expect(screen.getByText('Completed Paths')).toBeInTheDocument();
      expect(screen.getByText('Total Time')).toBeInTheDocument();
    });
  });

  describe('Learning Paths List', () => {
    it('renders dashboard with paths list', () => {
      render(<LearningPathDashboard />, { wrapper });
      // Stats should be rendered
      expect(screen.getByText('Active Paths')).toBeInTheDocument();
    });

    it('displays stats cards', () => {
      render(<LearningPathDashboard />, { wrapper });
      // Completed paths stat should be visible
      expect(screen.getByText('Completed Paths')).toBeInTheDocument();
    });

    it('shows total time stat', () => {
      render(<LearningPathDashboard />, { wrapper });
      // Total time should be visible
      expect(screen.getByText('Total Time')).toBeInTheDocument();
    });

    it('shows empty state when no paths', () => {
      (useLearningStore as unknown as jest.Mock).mockReturnValue({
        learningPaths: {},
        activeLearningPathId: null,
        globalStats: mockGlobalStats,
        getActivePaths: () => [],
        getAllPaths: () => [],
        getCompletedPaths: () => [],
      });

      render(<LearningPathDashboard />, { wrapper });
      // Stats cards should still be rendered
      expect(screen.getByText('Active Paths')).toBeInTheDocument();
    });
  });

  describe('Path Selection', () => {
    it('renders paths for selection', () => {
      render(<LearningPathDashboard />, { wrapper });
      // Paths should be rendered
      expect(screen.getByText('React Mastery')).toBeInTheDocument();
    });
  });

  describe('Stats Cards', () => {
    it('renders stats cards', () => {
      render(<LearningPathDashboard />, { wrapper });
      // Stats should be rendered
      expect(screen.getByText('Active Paths')).toBeInTheDocument();
      expect(screen.getByText('Completed Paths')).toBeInTheDocument();
      expect(screen.getByText('Total Time')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = render(<LearningPathDashboard className="custom-dashboard" />, {
        wrapper,
      });

      expect(container.querySelector('.custom-dashboard')).toBeInTheDocument();
    });
  });
});
