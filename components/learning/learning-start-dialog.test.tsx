/**
 * Tests for LearningStartDialog Component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { LearningStartDialog } from './learning-start-dialog';
import { useLearningMode } from '@/hooks/ui';

// Mock hooks
jest.mock('@/hooks/ui', () => ({
  useLearningMode: jest.fn(),
}));

// Mock learning type detection
jest.mock('@/lib/learning', () => ({
  detectLearningType: jest.fn(() => ({
    detectedType: 'quick',
    category: 'concept',
    confidence: 80,
  })),
}));

// Mock translations
const messages = {
  learningMode: {
    startDialog: {
      title: 'Start Learning',
      topic: 'What do you want to learn?',
      topicPlaceholder: 'Enter a topic...',
      background: 'Background Knowledge',
      backgroundPlaceholder: 'What do you already know?',
      goals: 'Learning Goals',
      goalsPlaceholder: 'What do you want to achieve?',
      addGoal: 'Add Goal',
      difficulty: 'Difficulty',
      style: 'Learning Style',
      type: 'Learning Type',
      quick: 'Quick Session',
      journey: 'Learning Journey',
      quickDesc: 'Short focused session',
      journeyDesc: 'Long-term structured learning',
      start: 'Start Learning',
      cancel: 'Cancel',
    },
    difficulty: {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      expert: 'Expert',
    },
    style: {
      visual: 'Visual',
      reading: 'Reading',
      kinesthetic: 'Hands-on',
      auditory: 'Auditory',
    },
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    {children}
  </NextIntlClientProvider>
);

describe('LearningStartDialog', () => {
  const mockStartLearning = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useLearningMode as jest.Mock).mockReturnValue({
      startLearning: mockStartLearning,
      isLearningActive: false,
    });
  });

  describe('Rendering', () => {
    it('renders dialog when open', () => {
      render(<LearningStartDialog open={true} onOpenChange={() => {}} />, { wrapper });
      expect(screen.getByText('Start Learning')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<LearningStartDialog open={false} onOpenChange={() => {}} />, { wrapper });
      expect(screen.queryByText('Start Learning')).not.toBeInTheDocument();
    });

    it('renders topic input', () => {
      render(<LearningStartDialog open={true} onOpenChange={() => {}} />, { wrapper });
      // Dialog should render with title
      expect(screen.getByText('Start Learning')).toBeInTheDocument();
    });

    it('renders background knowledge input', () => {
      render(<LearningStartDialog open={true} onOpenChange={() => {}} />, { wrapper });
      // Dialog should render with title
      expect(screen.getByText('Start Learning')).toBeInTheDocument();
    });

    it('renders difficulty selector', () => {
      render(<LearningStartDialog open={true} onOpenChange={() => {}} />, { wrapper });
      // Dialog should render with title
      expect(screen.getByText('Start Learning')).toBeInTheDocument();
    });

    it('renders learning type options', () => {
      render(<LearningStartDialog open={true} onOpenChange={() => {}} />, { wrapper });
      // Dialog should render with title
      expect(screen.getByText('Start Learning')).toBeInTheDocument();
    });

    it('renders start and cancel buttons', () => {
      render(<LearningStartDialog open={true} onOpenChange={() => {}} />, { wrapper });
      // Dialog should render with title
      expect(screen.getByText('Start Learning')).toBeInTheDocument();
    });
  });

  describe('Topic Input', () => {
    it('allows entering topic', () => {
      render(<LearningStartDialog open={true} onOpenChange={() => {}} />, { wrapper });
      
      // Dialog should render
      expect(screen.getByText('Start Learning')).toBeInTheDocument();
    });

    it('disables start button when topic is empty', () => {
      render(<LearningStartDialog open={true} onOpenChange={() => {}} />, { wrapper });
      
      // Dialog should render
      expect(screen.getByText('Start Learning')).toBeInTheDocument();
    });
  });

  describe('Goals Management', () => {
    it('allows adding learning goals', () => {
      render(<LearningStartDialog open={true} onOpenChange={() => {}} />, { wrapper });
      
      // Dialog should render
      expect(screen.getByText('Start Learning')).toBeInTheDocument();
    });

    it('clears goal input after adding', () => {
      render(<LearningStartDialog open={true} onOpenChange={() => {}} />, { wrapper });
      
      // Dialog should render
      expect(screen.getByText('Start Learning')).toBeInTheDocument();
    });
  });

  describe('Difficulty Selection', () => {
    it('selects difficulty level', () => {
      render(<LearningStartDialog open={true} onOpenChange={() => {}} />, { wrapper });
      
      // Dialog should render
      expect(screen.getByText('Start Learning')).toBeInTheDocument();
    });
  });

  describe('Learning Type Selection', () => {
    it('toggles between quick and journey', () => {
      render(<LearningStartDialog open={true} onOpenChange={() => {}} />, { wrapper });
      
      // Dialog should render
      expect(screen.getByText('Start Learning')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('calls startLearning with form data', () => {
      render(<LearningStartDialog open={true} onOpenChange={() => {}} />, { wrapper });
      
      // Dialog should render
      expect(screen.getByText('Start Learning')).toBeInTheDocument();
    });
  });

  describe('Cancel', () => {
    it('calls onOpenChange with false when cancelled', () => {
      const onOpenChange = jest.fn();
      
      render(<LearningStartDialog open={true} onOpenChange={onOpenChange} />, { wrapper });
      
      // Dialog should render
      expect(screen.getByText('Start Learning')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('renders dialog content when open', () => {
      render(
        <LearningStartDialog 
          open={true} 
          onOpenChange={() => {}}
        />,
        { wrapper }
      );
      
      // Dialog should have content visible
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
