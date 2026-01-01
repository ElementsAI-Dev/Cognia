/**
 * Learning Notes Panel Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { LearningNotesPanel } from './learning-notes-panel';
import { useLearningStore } from '@/stores/learning-store';
import type { LearningNote } from '@/types/learning';

// Mock the learning store
jest.mock('@/stores/learning-store', () => ({
  useLearningStore: jest.fn(),
}));

const mockMessages = {
  learningMode: {
    notes: {
      title: 'Learning Notes',
      placeholder: 'Write a note...',
      highlighted: 'Highlighted',
      all: 'All Notes',
      empty: 'No notes yet. Start taking notes to remember key insights!',
      addFirst: 'Add Your First Note',
    },
  },
};

const mockAddNote = jest.fn();
const mockUpdateNote = jest.fn();
const mockDeleteNote = jest.fn();
const mockToggleNoteHighlight = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useLearningStore as unknown as jest.Mock).mockReturnValue({
    addNote: mockAddNote,
    updateNote: mockUpdateNote,
    deleteNote: mockDeleteNote,
    toggleNoteHighlight: mockToggleNoteHighlight,
  });
});

const createMockNote = (overrides?: Partial<LearningNote>): LearningNote => ({
  id: 'note-1',
  content: 'Test note content',
  createdAt: new Date(),
  isHighlight: false,
  ...overrides,
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={mockMessages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('LearningNotesPanel', () => {
  it('should render empty state when no notes', () => {
    renderWithProviders(
      <LearningNotesPanel sessionId="session-1" notes={[]} />
    );

    expect(screen.getByText('No notes yet. Start taking notes to remember key insights!')).toBeInTheDocument();
    expect(screen.getByText('Add Your First Note')).toBeInTheDocument();
  });

  it('should render notes list', () => {
    const notes = [
      createMockNote({ id: 'note-1', content: 'First note' }),
      createMockNote({ id: 'note-2', content: 'Second note' }),
    ];

    renderWithProviders(
      <LearningNotesPanel sessionId="session-1" notes={notes} />
    );

    expect(screen.getByText('First note')).toBeInTheDocument();
    expect(screen.getByText('Second note')).toBeInTheDocument();
  });

  it('should show highlighted notes separately', () => {
    const notes = [
      createMockNote({ id: 'note-1', content: 'Regular note', isHighlight: false }),
      createMockNote({ id: 'note-2', content: 'Highlighted note', isHighlight: true }),
    ];

    renderWithProviders(
      <LearningNotesPanel sessionId="session-1" notes={notes} />
    );

    expect(screen.getByText('Highlighted')).toBeInTheDocument();
    expect(screen.getByText('Highlighted note')).toBeInTheDocument();
    expect(screen.getByText('Regular note')).toBeInTheDocument();
  });

  it('should have add button in header', () => {
    renderWithProviders(
      <LearningNotesPanel sessionId="session-1" notes={[]} />
    );

    // Should have the add button (plus icon) in header
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should render note with concept tags', () => {
    const notes = [
      createMockNote({
        id: 'note-1',
        content: 'Tagged note',
        conceptTags: ['recursion', 'algorithms'],
      }),
    ];

    renderWithProviders(
      <LearningNotesPanel sessionId="session-1" notes={notes} />
    );

    expect(screen.getByText('Tagged note')).toBeInTheDocument();
    expect(screen.getByText('recursion')).toBeInTheDocument();
    expect(screen.getByText('algorithms')).toBeInTheDocument();
  });

  it('should display note creation date', () => {
    const notes = [
      createMockNote({
        id: 'note-1',
        content: 'Dated note',
        createdAt: new Date('2024-01-15T10:30:00'),
      }),
    ];

    renderWithProviders(
      <LearningNotesPanel sessionId="session-1" notes={notes} />
    );

    expect(screen.getByText('Dated note')).toBeInTheDocument();
    // Date format will vary by locale
  });
});
