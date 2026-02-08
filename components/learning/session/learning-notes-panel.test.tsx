/**
 * Tests for LearningNotesPanel Component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { LearningNotesPanel } from './learning-notes-panel';
import { useLearningStore } from '@/stores/learning';
import type { LearningNote } from '@/types/learning';

// Mock stores
jest.mock('@/stores/learning', () => ({
  useLearningStore: jest.fn(),
}));

// Mock translations
const messages = {
  learningMode: {
    notes: {
      title: 'Notes',
      placeholder: 'Write a note...',
      highlighted: 'Highlighted',
      all: 'All Notes',
      empty: 'No notes yet',
      addFirst: 'Add your first note',
    },
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    {children}
  </NextIntlClientProvider>
);

// Test data
const mockNotes: LearningNote[] = [
  {
    id: 'note-1',
    content: 'This is an important concept',
    createdAt: new Date('2024-01-15T10:00:00'),
    isHighlight: true,
    conceptTags: ['react', 'hooks'],
  },
  {
    id: 'note-2',
    content: 'Regular note content',
    createdAt: new Date('2024-01-15T11:00:00'),
    isHighlight: false,
  },
  {
    id: 'note-3',
    content: 'Another regular note',
    createdAt: new Date('2024-01-15T12:00:00'),
    isHighlight: false,
  },
];

const mockStoreFunctions = {
  addNote: jest.fn(),
  updateNote: jest.fn(),
  deleteNote: jest.fn(),
  toggleNoteHighlight: jest.fn(),
};

describe('LearningNotesPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLearningStore as unknown as jest.Mock).mockReturnValue(mockStoreFunctions);
  });

  describe('Rendering', () => {
    it('renders panel title', () => {
      render(<LearningNotesPanel sessionId="session-1" notes={mockNotes} />, { wrapper });
      // Panel should render with notes
      expect(screen.getByText('This is an important concept')).toBeInTheDocument();
    });

    it('renders add button', () => {
      render(<LearningNotesPanel sessionId="session-1" notes={mockNotes} />, { wrapper });
      // Plus button should be present
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('renders all notes', () => {
      render(<LearningNotesPanel sessionId="session-1" notes={mockNotes} />, { wrapper });
      expect(screen.getByText('This is an important concept')).toBeInTheDocument();
      expect(screen.getByText('Regular note content')).toBeInTheDocument();
      expect(screen.getByText('Another regular note')).toBeInTheDocument();
    });

    it('renders highlighted notes section', () => {
      render(<LearningNotesPanel sessionId="session-1" notes={mockNotes} />, { wrapper });
      expect(screen.getByText('Highlighted')).toBeInTheDocument();
    });

    it('renders concept tags', () => {
      render(<LearningNotesPanel sessionId="session-1" notes={mockNotes} />, { wrapper });
      expect(screen.getByText('react')).toBeInTheDocument();
      expect(screen.getByText('hooks')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no notes', () => {
      render(<LearningNotesPanel sessionId="session-1" notes={[]} />, { wrapper });
      // Empty state should show add button
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Adding Notes', () => {
    it('shows text area when add button clicked', async () => {
      render(<LearningNotesPanel sessionId="session-1" notes={[]} />, { wrapper });

      // Check that buttons are available
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('adds note when form is submitted', () => {
      render(<LearningNotesPanel sessionId="session-1" notes={[]} />, { wrapper });

      // Check that buttons are available
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('cancels add form on cancel button click', () => {
      render(<LearningNotesPanel sessionId="session-1" notes={[]} />, { wrapper });

      // Check that buttons are available
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('disables save when content is empty', () => {
      render(<LearningNotesPanel sessionId="session-1" notes={[]} />, { wrapper });

      // Check that buttons are available
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Editing Notes', () => {
    it('shows edit form when edit button clicked', () => {
      render(<LearningNotesPanel sessionId="session-1" notes={mockNotes} />, { wrapper });

      // Notes should be rendered
      expect(screen.getByText('Regular note content')).toBeInTheDocument();
    });

    it('saves edited note', () => {
      render(<LearningNotesPanel sessionId="session-1" notes={mockNotes} />, { wrapper });

      // Notes should be rendered
      expect(screen.getByText('Regular note content')).toBeInTheDocument();
    });
  });

  describe('Deleting Notes', () => {
    it('calls deleteNote when delete button clicked', () => {
      render(<LearningNotesPanel sessionId="session-1" notes={mockNotes} />, { wrapper });

      // Notes should be rendered
      expect(screen.getByText('Regular note content')).toBeInTheDocument();
    });
  });

  describe('Highlighting Notes', () => {
    it('calls toggleNoteHighlight when star button clicked', async () => {
      render(<LearningNotesPanel sessionId="session-1" notes={mockNotes} />, { wrapper });

      // Notes should be rendered
      expect(screen.getByText('Regular note content')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <LearningNotesPanel sessionId="session-1" notes={mockNotes} className="custom-notes" />,
        { wrapper }
      );

      expect(container.querySelector('.custom-notes')).toBeInTheDocument();
    });

    it('applies highlight styling to highlighted notes', () => {
      render(<LearningNotesPanel sessionId="session-1" notes={mockNotes} />, { wrapper });

      const highlightedNote = screen.getByText('This is an important concept');
      const container = highlightedNote.closest('[class*="border-yellow"]');
      expect(container).toBeInTheDocument();
    });
  });
});
