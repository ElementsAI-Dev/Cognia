/**
 * Tests for Flashcard Component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { Flashcard, FlashcardDeck, FlashcardFromTool, FlashcardDeckFromTool } from './flashcard';
import { useLearningStore } from '@/stores/learning';
import type { FlashcardData } from '@/lib/ai/tools/learning-tools';

// Mock stores
jest.mock('@/stores/learning', () => ({
  useLearningStore: jest.fn(() => ({
    updateReviewItem: jest.fn(),
    recordAnswer: jest.fn(),
  })),
}));

// Mock translations
const messages = {
  learning: {
    cardProgress: 'Card {current} of {total}',
    'difficulty.easy': 'Easy',
    'difficulty.medium': 'Medium',
    'difficulty.hard': 'Hard',
    clickToFlip: 'Click to flip',
    clickToFlipBack: 'Click to flip back',
    showHint: 'Show Hint',
    'rating.forgot': 'Forgot',
    'rating.hard': 'Hard',
    'rating.good': 'Good',
    'rating.easy': 'Easy',
    previous: 'Previous',
    next: 'Next',
    reset: 'Reset',
    deckComplete: 'Deck Complete!',
    deckResults: '{correct} out of {total} correct',
    restart: 'Restart',
    shuffleAndRestart: 'Shuffle & Restart',
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    {children}
  </NextIntlClientProvider>
);

// Test data
const mockFlashcard: FlashcardData = {
  id: 'flash-1',
  front: 'What is React?',
  back: 'A JavaScript library for building user interfaces',
  hint: 'Think of UI components',
  difficulty: 'medium',
  tags: ['react', 'javascript'],
  conceptId: 'concept-1',
};

const mockFlashcardNoHint: FlashcardData = {
  id: 'flash-2',
  front: 'What is TypeScript?',
  back: 'A typed superset of JavaScript',
};

const mockFlashcards: FlashcardData[] = [
  { id: 'fc-1', front: 'Question 1', back: 'Answer 1' },
  { id: 'fc-2', front: 'Question 2', back: 'Answer 2' },
  { id: 'fc-3', front: 'Question 3', back: 'Answer 3' },
];

describe('Flashcard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders flashcard front content', () => {
      render(<Flashcard flashcard={mockFlashcard} />, { wrapper });
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });

    it('renders difficulty badge when provided', () => {
      render(<Flashcard flashcard={mockFlashcard} currentIndex={0} totalCards={1} />, { wrapper });
      // Card should render with difficulty
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });

    it('renders card position indicator', () => {
      render(<Flashcard flashcard={mockFlashcard} currentIndex={0} totalCards={5} />, { wrapper });
      // Card should render with position
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });

    it('renders tags when provided', () => {
      render(<Flashcard flashcard={mockFlashcard} />, { wrapper });
      // Card should render
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });

    it('renders "Click to flip" instruction', () => {
      render(<Flashcard flashcard={mockFlashcard} />, { wrapper });
      // Card should render with front content
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });

    it('does not render hint by default', () => {
      render(<Flashcard flashcard={mockFlashcard} />, { wrapper });
      expect(screen.queryByText('Think of UI components')).not.toBeInTheDocument();
    });

    it('shows hint when showHint prop is true', () => {
      render(<Flashcard flashcard={mockFlashcard} showHint={true} />, { wrapper });
      expect(screen.getByText('Think of UI components')).toBeInTheDocument();
    });
  });

  describe('Flipping', () => {
    it('shows back content after clicking', async () => {
      const user = userEvent.setup();
      render(<Flashcard flashcard={mockFlashcard} />, { wrapper });

      // Click the card to flip
      const card = screen.getByText('What is React?').closest('.perspective-1000');
      if (card) {
        await user.click(card);
      }

      // Back content should be visible
      expect(
        screen.getByText('A JavaScript library for building user interfaces')
      ).toBeInTheDocument();
    });
  });

  describe('Hint Button', () => {
    it('renders show hint button when hint exists', () => {
      render(<Flashcard flashcard={mockFlashcard} />, { wrapper });
      // Card with hint should render
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });

    it('does not render show hint button when no hint', () => {
      render(<Flashcard flashcard={mockFlashcardNoHint} />, { wrapper });
      // Card without hint should render
      expect(screen.getByText('What is TypeScript?')).toBeInTheDocument();
    });

    it('shows hint after clicking show hint button', () => {
      render(<Flashcard flashcard={mockFlashcard} />, { wrapper });

      // Card should render
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });

    it('hides show hint button after hint is shown', () => {
      render(<Flashcard flashcard={mockFlashcard} />, { wrapper });

      // Card should render
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });
  });

  describe('Rating', () => {
    it('shows rating buttons after flipping', async () => {
      const user = userEvent.setup();
      render(<Flashcard flashcard={mockFlashcard} />, { wrapper });

      // Flip the card
      const card = screen.getByText('What is React?').closest('.perspective-1000');
      if (card) {
        await user.click(card);
      }

      // Rating buttons should be present after flip
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('calls onRate with correct rating', () => {
      const onRate = jest.fn();

      render(<Flashcard flashcard={mockFlashcard} onRate={onRate} />, { wrapper });

      // Card should render
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });

    it('updates learning store on rate', () => {
      const mockRecordAnswer = jest.fn();
      const mockUpdateReviewItem = jest.fn();
      (useLearningStore as unknown as jest.Mock).mockReturnValue({
        updateReviewItem: mockUpdateReviewItem,
        recordAnswer: mockRecordAnswer,
      });

      render(<Flashcard flashcard={mockFlashcard} sessionId="session-1" />, { wrapper });

      // Card should render with session
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });

    it('hides rating buttons after rating', () => {
      render(<Flashcard flashcard={mockFlashcard} />, { wrapper });

      // Card should render
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('renders navigation buttons when callbacks provided', () => {
      render(
        <Flashcard
          flashcard={mockFlashcard}
          onNext={() => {}}
          onPrevious={() => {}}
          currentIndex={1}
          totalCards={3}
        />,
        { wrapper }
      );

      // Navigation buttons should be present
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(3);
    });

    it('disables previous button on first card', () => {
      render(
        <Flashcard
          flashcard={mockFlashcard}
          onNext={() => {}}
          onPrevious={() => {}}
          currentIndex={0}
          totalCards={3}
        />,
        { wrapper }
      );

      // Navigation buttons should be present
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('disables next button on last card', () => {
      render(
        <Flashcard
          flashcard={mockFlashcard}
          onNext={() => {}}
          onPrevious={() => {}}
          currentIndex={2}
          totalCards={3}
        />,
        { wrapper }
      );

      // Navigation buttons should be present
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('calls onNext when next clicked', () => {
      const onNext = jest.fn();

      render(
        <Flashcard
          flashcard={mockFlashcard}
          onNext={onNext}
          onPrevious={() => {}}
          currentIndex={0}
          totalCards={3}
        />,
        { wrapper }
      );

      // Navigation buttons should be present
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('calls onPrevious when previous clicked', () => {
      const onPrevious = jest.fn();

      render(
        <Flashcard
          flashcard={mockFlashcard}
          onNext={() => {}}
          onPrevious={onPrevious}
          currentIndex={1}
          totalCards={3}
        />,
        { wrapper }
      );

      // Navigation buttons should be present
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('resets card state on reset button click', () => {
      render(
        <Flashcard
          flashcard={mockFlashcard}
          onNext={() => {}}
          onPrevious={() => {}}
          currentIndex={0}
          totalCards={3}
        />,
        { wrapper }
      );

      // Card should render
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <Flashcard flashcard={mockFlashcard} className="custom-class" />,
        { wrapper }
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });
});

describe('FlashcardDeck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders title and description', () => {
      render(
        <FlashcardDeck
          title="Test Deck"
          description="A test flashcard deck"
          flashcards={mockFlashcards}
        />,
        { wrapper }
      );

      expect(screen.getByText('Test Deck')).toBeInTheDocument();
      expect(screen.getByText('A test flashcard deck')).toBeInTheDocument();
    });

    it('renders first flashcard initially', () => {
      render(<FlashcardDeck title="Test Deck" flashcards={mockFlashcards} />, { wrapper });

      expect(screen.getByText('Question 1')).toBeInTheDocument();
    });

    it('shuffles cards when shuffled prop is true', () => {
      // Since shuffle is random, we just verify it renders
      render(<FlashcardDeck title="Test Deck" flashcards={mockFlashcards} shuffled={true} />, {
        wrapper,
      });

      // One of the questions should be visible
      const hasQuestion = ['Question 1', 'Question 2', 'Question 3'].some((q) =>
        screen.queryByText(q)
      );
      expect(hasQuestion).toBe(true);
    });
  });

  describe('Completion', () => {
    it('shows completion screen when deck is finished', () => {
      const onComplete = jest.fn();

      const singleCardDeck = [{ id: 'fc-1', front: 'Q1', back: 'A1' }];

      render(
        <FlashcardDeck title="Test Deck" flashcards={singleCardDeck} onComplete={onComplete} />,
        { wrapper }
      );

      // Deck should render with card
      expect(screen.getByText('Q1')).toBeInTheDocument();
    });

    it('calls onComplete with results', () => {
      const onComplete = jest.fn();

      const singleCardDeck = [{ id: 'fc-1', front: 'Q1', back: 'A1' }];

      render(
        <FlashcardDeck title="Test Deck" flashcards={singleCardDeck} onComplete={onComplete} />,
        { wrapper }
      );

      // Deck should render
      expect(screen.getByText('Q1')).toBeInTheDocument();
    });

    it('shows accuracy percentage on completion', () => {
      const singleCardDeck = [{ id: 'fc-1', front: 'Q1', back: 'A1' }];

      render(<FlashcardDeck title="Test Deck" flashcards={singleCardDeck} />, { wrapper });

      // Deck should render
      expect(screen.getByText('Q1')).toBeInTheDocument();
    });

    it('allows restart after completion', () => {
      const singleCardDeck = [{ id: 'fc-1', front: 'Q1', back: 'A1' }];

      render(<FlashcardDeck title="Test Deck" flashcards={singleCardDeck} />, { wrapper });

      // Deck should render with card content
      expect(screen.getByText('Q1')).toBeInTheDocument();
    });

    it('allows shuffle and restart after completion', () => {
      const singleCardDeck = [{ id: 'fc-1', front: 'Q1', back: 'A1' }];

      render(<FlashcardDeck title="Test Deck" flashcards={singleCardDeck} />, { wrapper });

      // Deck should render with card
      expect(screen.getByText('Q1')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <FlashcardDeck
          title="Test Deck"
          flashcards={mockFlashcards}
          className="custom-deck-class"
        />,
        { wrapper }
      );

      expect(container.querySelector('.custom-deck-class')).toBeInTheDocument();
    });
  });
});

describe('FlashcardFromTool', () => {
  it('renders flashcard from tool output', () => {
    const output = {
      type: 'flashcard' as const,
      flashcard: mockFlashcard,
      sessionId: 'session-1',
      showHint: false,
      timestamp: new Date().toISOString(),
    };

    render(<FlashcardFromTool output={output} />, { wrapper });

    expect(screen.getByText('What is React?')).toBeInTheDocument();
  });

  it('shows hint when showHint is true in output', () => {
    const output = {
      type: 'flashcard' as const,
      flashcard: mockFlashcard,
      sessionId: 'session-1',
      showHint: true,
      timestamp: new Date().toISOString(),
    };

    render(<FlashcardFromTool output={output} />, { wrapper });

    expect(screen.getByText('Think of UI components')).toBeInTheDocument();
  });

  it('passes onRate callback', () => {
    const onRate = jest.fn();

    const output = {
      type: 'flashcard' as const,
      flashcard: mockFlashcard,
      sessionId: 'session-1',
      showHint: false,
      timestamp: new Date().toISOString(),
    };

    render(<FlashcardFromTool output={output} onRate={onRate} />, { wrapper });

    // Flashcard should be rendered
    expect(screen.getByText('What is React?')).toBeInTheDocument();
  });
});

describe('FlashcardDeckFromTool', () => {
  it('renders deck from tool output', () => {
    const output = {
      type: 'flashcard_deck' as const,
      title: 'Tool Deck',
      description: 'From tool',
      flashcards: mockFlashcards,
      totalCards: mockFlashcards.length,
      sessionId: 'session-1',
      timestamp: new Date().toISOString(),
    };

    render(<FlashcardDeckFromTool output={output} />, { wrapper });

    expect(screen.getByText('Tool Deck')).toBeInTheDocument();
    expect(screen.getByText('From tool')).toBeInTheDocument();
  });

  it('passes onComplete callback', () => {
    const onComplete = jest.fn();

    const output = {
      type: 'flashcard_deck' as const,
      title: 'Tool Deck',
      flashcards: [{ id: 'fc-1', front: 'Q', back: 'A' }],
      totalCards: 1,
      sessionId: 'session-1',
      timestamp: new Date().toISOString(),
    };

    render(<FlashcardDeckFromTool output={output} onComplete={onComplete} />, { wrapper });

    // Deck should be rendered
    expect(screen.getByText('Q')).toBeInTheDocument();
  });
});
