import { render, screen } from '@testing-library/react';
import { HistoryPanel, type HistoryEntry } from './history-panel';

const mockEntries: HistoryEntry[] = [
  {
    id: 'entry-1',
    action: 'add',
    description: 'Added video clip',
    timestamp: Date.now() - 60000,
    canUndo: true,
  },
];

describe('HistoryPanel', () => {
  const defaultProps = {
    entries: mockEntries,
    currentIndex: 0,
    canUndo: true,
    canRedo: false,
    onUndo: jest.fn(),
    onRedo: jest.fn(),
    onJumpTo: jest.fn(),
    onClearHistory: jest.fn(),
  };

  it('renders history panel', () => {
    render(<HistoryPanel {...defaultProps} />);
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  it('displays history entries', () => {
    render(<HistoryPanel {...defaultProps} />);
    expect(screen.getByText('Added video clip')).toBeInTheDocument();
  });

  it('shows empty state when no entries', () => {
    render(<HistoryPanel {...defaultProps} entries={[]} />);
    expect(screen.getByText('No history yet')).toBeInTheDocument();
  });

  it('displays initial state marker', () => {
    render(<HistoryPanel {...defaultProps} />);
    expect(screen.getByText('Initial State')).toBeInTheDocument();
  });
});
