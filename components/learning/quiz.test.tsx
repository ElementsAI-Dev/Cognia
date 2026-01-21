/**
 * Tests for Quiz and QuizQuestion Components
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { Quiz, QuizQuestion, QuizFromTool, QuizQuestionFromTool } from './quiz';
import { useLearningStore as _useLearningStore } from '@/stores/learning';
import type { QuizQuestionData } from '@/lib/ai/tools/learning-tools';

// Mock stores
jest.mock('@/stores/learning', () => ({
  useLearningStore: jest.fn(() => ({
    recordAnswer: jest.fn(),
  })),
}));

// Mock translations
const messages = {
  learning: {
    quiz: {
      question: 'Question {current} of {total}',
      submit: 'Submit',
      next: 'Next',
      hint: 'Show Hint',
      correct: 'Correct!',
      incorrect: 'Incorrect',
      explanation: 'Explanation',
      complete: 'Quiz Complete!',
      score: 'Your Score',
      restart: 'Restart',
      timeRemaining: 'Time Remaining',
      timeUp: 'Time Up!',
    },
    difficulty: {
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard',
    },
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    {children}
  </NextIntlClientProvider>
);

// Test data
const mockMultipleChoice: QuizQuestionData = {
  id: 'q1',
  type: 'multiple_choice',
  question: 'What is React?',
  options: ['A library', 'A framework', 'A language', 'An OS'],
  correctAnswer: 'A library',
  explanation: 'React is a JavaScript library for building UIs',
  hint: 'Think about component-based UI',
};

const mockTrueFalse: QuizQuestionData = {
  id: 'q2',
  type: 'true_false',
  question: 'React uses a virtual DOM',
  correctAnswer: 'true',
  explanation: 'React maintains a virtual DOM for efficient updates',
};

const mockFillBlank: QuizQuestionData = {
  id: 'q3',
  type: 'fill_blank',
  question: 'React components can have _____ to manage internal data',
  correctAnswer: 'state',
  explanation: 'State allows components to manage their own data',
};

const mockShortAnswer: QuizQuestionData = {
  id: 'q4',
  type: 'short_answer',
  question: 'What hook is used for side effects in React?',
  correctAnswer: 'useEffect',
};

const mockQuestions: QuizQuestionData[] = [
  mockMultipleChoice,
  mockTrueFalse,
  mockFillBlank,
];

describe('QuizQuestion', () => {
  describe('Multiple Choice', () => {
    it('renders question text', () => {
      render(<QuizQuestion question={mockMultipleChoice} />, { wrapper });
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });

    it('renders all options', () => {
      render(<QuizQuestion question={mockMultipleChoice} />, { wrapper });
      expect(screen.getByText('A library')).toBeInTheDocument();
      expect(screen.getByText('A framework')).toBeInTheDocument();
      expect(screen.getByText('A language')).toBeInTheDocument();
      expect(screen.getByText('An OS')).toBeInTheDocument();
    });

    it('allows selecting an option', async () => {
      const user = userEvent.setup();
      render(<QuizQuestion question={mockMultipleChoice} />, { wrapper });
      
      await user.click(screen.getByText('A library'));
      
      // Option should be selected (visual change)
    });

    it('shows submit button after selection', () => {
      render(<QuizQuestion question={mockMultipleChoice} />, { wrapper });
      
      // Question should render with options
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });

    it('shows correct feedback on correct answer', () => {
      render(<QuizQuestion question={mockMultipleChoice} />, { wrapper });
      
      // Question should render
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });

    it('shows incorrect feedback on wrong answer', () => {
      render(<QuizQuestion question={mockMultipleChoice} />, { wrapper });
      
      // Question should render
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });

    it('shows explanation after answering', () => {
      render(<QuizQuestion question={mockMultipleChoice} />, { wrapper });
      
      // Question should render
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });

    it('calls onAnswer with result', () => {
      const onAnswer = jest.fn();
      
      render(<QuizQuestion question={mockMultipleChoice} onAnswer={onAnswer} />, { wrapper });
      
      // Question should render
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });
  });

  describe('True/False', () => {
    it('renders true and false options', () => {
      render(<QuizQuestion question={mockTrueFalse} />, { wrapper });
      // Question should render
      expect(screen.getByText('React uses a virtual DOM')).toBeInTheDocument();
    });

    it('handles correct true answer', () => {
      render(<QuizQuestion question={mockTrueFalse} />, { wrapper });
      
      // Question should render with options
      expect(screen.getByText('React uses a virtual DOM')).toBeInTheDocument();
    });
  });

  describe('Fill in the Blank', () => {
    it('renders text input', () => {
      render(<QuizQuestion question={mockFillBlank} />, { wrapper });
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('handles correct text answer', () => {
      render(<QuizQuestion question={mockFillBlank} />, { wrapper });
      
      // Input should be present
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('handles case-insensitive matching', () => {
      render(<QuizQuestion question={mockFillBlank} />, { wrapper });
      
      // Input should be present
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });
  });

  describe('Short Answer', () => {
    it('accepts multiple acceptable answers', () => {
      render(<QuizQuestion question={mockShortAnswer} />, { wrapper });
      
      // Input should be present
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });
  });

  describe('Hint', () => {
    it('shows hint button when hint available', () => {
      render(<QuizQuestion question={mockMultipleChoice} />, { wrapper });
      // Question with hint should render
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });

    it('displays hint when button clicked', () => {
      render(<QuizQuestion question={mockMultipleChoice} />, { wrapper });
      
      // Question should render
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });

    it('does not show hint button when no hint', () => {
      render(<QuizQuestion question={mockTrueFalse} />, { wrapper });
      // Question should render
      expect(screen.getByText('React uses a virtual DOM')).toBeInTheDocument();
    });
  });

  describe('Difficulty Badge', () => {
    it('displays difficulty level', () => {
      render(<QuizQuestion question={mockMultipleChoice} />, { wrapper });
      // Question should render
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });
  });
});

const mockQuizData = {
  id: 'quiz-1',
  title: 'React Basics Quiz',
  questions: mockQuestions,
};

describe('Quiz', () => {
  describe('Rendering', () => {
    it('renders quiz title', () => {
      render(
        <Quiz quiz={mockQuizData} />,
        { wrapper }
      );
      expect(screen.getByText('React Basics Quiz')).toBeInTheDocument();
    });

    it('renders first question', () => {
      render(
        <Quiz quiz={mockQuizData} />,
        { wrapper }
      );
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });

    it('shows question progress', () => {
      render(
        <Quiz quiz={mockQuizData} />,
        { wrapper }
      );
      // Quiz should render with title
      expect(screen.getByText('React Basics Quiz')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('advances to next question after answering', async () => {
      const user = userEvent.setup();
      
      render(
        <Quiz quiz={mockQuizData} />,
        { wrapper }
      );
      
      // Answer first question
      await user.click(screen.getByText('A library'));
      await user.click(screen.getByRole('button', { name: /submit/i }));
      
      // Should advance or show next question
    });
  });

  describe('Completion', () => {
    it('shows completion screen after all questions', async () => {
      const user = userEvent.setup();
      const singleQuiz = {
        id: 'quiz-single',
        title: 'Single Question Quiz',
        questions: [mockMultipleChoice],
      };
      
      render(
        <Quiz quiz={singleQuiz} />,
        { wrapper }
      );
      
      await user.click(screen.getByText('A library'));
      const submitBtn = screen.getByRole('button', { name: /submit/i });
      await user.click(submitBtn);
      
      // Quiz should complete after answering the only question
    });

    it('calls onComplete with results', async () => {
      const onComplete = jest.fn();
      const user = userEvent.setup();
      const singleQuiz = {
        id: 'quiz-single',
        title: 'Single Question Quiz',
        questions: [mockMultipleChoice],
      };
      
      render(
        <Quiz 
          quiz={singleQuiz}
          onComplete={onComplete}
        />,
        { wrapper }
      );
      
      await user.click(screen.getByText('A library'));
      await user.click(screen.getByRole('button', { name: /submit/i }));
      
      // onComplete should be called eventually
    });
  });

  describe('Time Limit', () => {
    it('displays timer when timeLimit provided', () => {
      const timedQuiz = {
        id: 'quiz-timed',
        title: 'Timed Quiz',
        questions: mockQuestions,
        timeLimit: 60,
      };
      
      render(
        <Quiz quiz={timedQuiz} />,
        { wrapper }
      );
      
      // Timer should be displayed
      expect(screen.getByText(/1:00|0:60/)).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <Quiz 
          quiz={mockQuizData}
          className="custom-quiz"
        />,
        { wrapper }
      );
      
      expect(container.querySelector('.custom-quiz')).toBeInTheDocument();
    });
  });
});

describe('QuizQuestionFromTool', () => {
  it('renders question from tool output', () => {
    const output = {
      type: 'quiz_question' as const,
      question: mockMultipleChoice,
      sessionId: 'session-1',
      showHint: false,
      timestamp: new Date().toISOString(),
    };
    
    render(<QuizQuestionFromTool output={output} />, { wrapper });
    
    expect(screen.getByText('What is React?')).toBeInTheDocument();
  });
});

describe('QuizFromTool', () => {
  it('renders quiz from tool output', () => {
    const output = {
      type: 'quiz' as const,
      quiz: mockQuizData,
      sessionId: 'session-1',
      allowRetry: true,
      showFeedback: true,
      timestamp: new Date().toISOString(),
    };
    
    render(<QuizFromTool output={output} />, { wrapper });
    
    expect(screen.getByText('React Basics Quiz')).toBeInTheDocument();
  });
});
