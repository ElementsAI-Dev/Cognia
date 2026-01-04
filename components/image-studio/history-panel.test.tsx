/**
 * Tests for HistoryPanel component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryPanel } from './history-panel';
import type { HistoryEntry } from './history-panel';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('HistoryPanel', () => {
  const mockEntries: HistoryEntry[] = [
    {
      id: 'entry-1',
      type: 'generate',
      description: 'Generated initial image',
      timestamp: Date.now() - 60000,
    },
    {
      id: 'entry-2',
      type: 'crop',
      description: 'Cropped to 16:9',
      timestamp: Date.now() - 30000,
    },
    {
      id: 'entry-3',
      type: 'adjust',
      description: 'Adjusted brightness',
      timestamp: Date.now(),
    },
  ];

  const defaultProps = {
    entries: mockEntries,
    currentIndex: 2,
    onNavigate: jest.fn(),
    onUndo: jest.fn(),
    onRedo: jest.fn(),
    onClear: jest.fn(),
    canUndo: true,
    canRedo: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should export HistoryPanel component', () => {
      expect(HistoryPanel).toBeDefined();
      expect(typeof HistoryPanel).toBe('function');
    });

    it('should have correct display name or name', () => {
      expect(HistoryPanel.name).toBe('HistoryPanel');
    });

    it('should render the component with title', () => {
      render(<HistoryPanel {...defaultProps} />);
      expect(screen.getByText('History')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(<HistoryPanel {...defaultProps} className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should display step count', () => {
      render(<HistoryPanel {...defaultProps} />);
      expect(screen.getByText('(3 steps)')).toBeInTheDocument();
    });

    it('should display singular step count for 1 entry', () => {
      render(<HistoryPanel {...defaultProps} entries={[mockEntries[0]]} currentIndex={0} />);
      expect(screen.getByText('(1 step)')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no entries', () => {
      render(<HistoryPanel {...defaultProps} entries={[]} currentIndex={-1} canUndo={false} />);
      expect(screen.getByText('No history yet')).toBeInTheDocument();
      expect(screen.getByText('Your edits will appear here')).toBeInTheDocument();
    });
  });

  describe('History Entries', () => {
    it('should render all history entries', () => {
      render(<HistoryPanel {...defaultProps} />);
      expect(screen.getByText('Generated')).toBeInTheDocument();
      expect(screen.getByText('Cropped')).toBeInTheDocument();
      expect(screen.getByText('Adjusted')).toBeInTheDocument();
    });

    it('should show Current badge on current entry', () => {
      render(<HistoryPanel {...defaultProps} />);
      expect(screen.getByText('Current')).toBeInTheDocument();
    });

    it('should display entry descriptions', () => {
      render(<HistoryPanel {...defaultProps} />);
      expect(screen.getByText('Generated initial image')).toBeInTheDocument();
      expect(screen.getByText('Cropped to 16:9')).toBeInTheDocument();
      expect(screen.getByText('Adjusted brightness')).toBeInTheDocument();
    });

    it('should navigate to entry on click', async () => {
      const user = userEvent.setup();
      render(<HistoryPanel {...defaultProps} />);
      
      await user.click(screen.getByText('Generated initial image'));
      expect(defaultProps.onNavigate).toHaveBeenCalledWith(0);
    });

    it('should display relative timestamps', () => {
      render(<HistoryPanel {...defaultProps} />);
      const timestamps = screen.getAllByText('Just now');
      expect(timestamps.length).toBeGreaterThan(0);
    });
  });

  describe('Footer', () => {
    it('should display current step info', () => {
      render(<HistoryPanel {...defaultProps} />);
      expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
    });

    it('should show steps ahead when not at latest', () => {
      render(<HistoryPanel {...defaultProps} currentIndex={0} />);
      expect(screen.getByText('(2 steps ahead)')).toBeInTheDocument();
    });

    it('should show singular step ahead', () => {
      render(<HistoryPanel {...defaultProps} currentIndex={1} />);
      expect(screen.getByText('(1 step ahead)')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria attributes', () => {
      render(<HistoryPanel {...defaultProps} />);
      expect(screen.getByRole('region', { name: 'History Panel' })).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('should accept all required props', () => {
      const { container } = render(<HistoryPanel {...defaultProps} />);
      expect(container).toBeInTheDocument();
    });

    it('should handle entries with thumbnails', () => {
      const entriesWithThumbnails: HistoryEntry[] = [
        {
          id: 'entry-1',
          type: 'generate',
          description: 'Generated image',
          timestamp: Date.now(),
          thumbnail: 'data:image/png;base64,mockthumb',
        },
      ];
      render(<HistoryPanel {...defaultProps} entries={entriesWithThumbnails} currentIndex={0} />);
      const img = document.querySelector('img');
      expect(img).toBeInTheDocument();
    });
  });
});
