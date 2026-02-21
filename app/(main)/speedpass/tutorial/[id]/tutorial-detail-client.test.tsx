/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TutorialDetailClient from './tutorial-detail-client';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useParams: () => ({}),
  useSearchParams: () => ({ get: () => 'tutorial-1' }),
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/learning/speedpass', () => ({
  createExtremeModeEngine: jest.fn(() => ({
    startSession: jest.fn(),
    updateRemainingTime: jest.fn(() => 60_000),
    markCompleted: jest.fn(),
    generateOverview: jest.fn(() => ({
      completedItems: 0,
      totalItems: 1,
      onTrack: true,
      recommendation: 'ok',
    })),
  })),
  formatCountdown: jest.fn(() => '01:00'),
  getUrgencyLevel: jest.fn(() => 'normal'),
  calculateProgress: jest.fn(() => 0),
  estimateCompletionTime: jest.fn(() => 10),
  getNextSection: jest.fn(() => null),
  optimizeSectionOrder: jest.fn((sections) => sections),
}));

const mockStore = {
  tutorials: {
    'tutorial-1': {
      id: 'tutorial-1',
      title: 'Mock Tutorial',
      textbookId: 'tb1',
      mode: 'speed',
      sections: [
        {
          id: 's1',
          orderIndex: 0,
          importanceLevel: 'critical',
          textbookLocation: {
            textbookName: 'Book 1',
            chapter: '第1章',
            section: '第一节',
            pageRange: '1-2',
          },
          quickSummary: 'summary',
          keyPoints: ['kp1'],
          mustKnowFormulas: [],
          examples: [],
          recommendedExercises: [],
          commonMistakes: [],
          estimatedMinutes: 5,
        },
      ],
      completedSectionIds: [],
      progress: 0,
      createdAt: new Date(),
    },
  },
  textbooks: {
    tb1: {
      id: 'tb1',
      name: 'Book 1',
    },
  },
  currentSessionId: null,
  studySessions: {},
  textbookKnowledgePoints: { tb1: [] },
  textbookQuestions: { tb1: [] },
  startStudySession: jest.fn(() => ({ id: 'session-1' })),
  endStudySession: jest.fn(),
  updateTutorialProgress: jest.fn(),
  completeTutorial: jest.fn(),
};

jest.mock('@/stores/learning/speedpass-store', () => ({
  useSpeedPassStore: jest.fn(() => mockStore),
}));

describe('tutorial-detail-client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads tutorial by query id and starts study session', async () => {
    render(<TutorialDetailClient />);

    expect(screen.getByText('Mock Tutorial')).toBeInTheDocument();
    await waitFor(() => {
      expect(mockStore.startStudySession).toHaveBeenCalledWith('tutorial-1');
    });
  });

  it('marks section complete', async () => {
    const user = userEvent.setup();
    render(<TutorialDetailClient />);

    await user.click(screen.getByRole('button', { name: 'completeSection' }));
    expect(mockStore.updateTutorialProgress).toHaveBeenCalledWith('tutorial-1', 's1');
  });
});
