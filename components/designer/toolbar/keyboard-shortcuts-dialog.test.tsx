/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KeyboardShortcutsDialog } from './keyboard-shortcuts-dialog';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, options?: { fallback?: string }) => options?.fallback || key,
}));

describe('KeyboardShortcutsDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render dialog when open', () => {
      render(<KeyboardShortcutsDialog open={true} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });

    it('should not render dialog when closed', () => {
      render(<KeyboardShortcutsDialog open={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render with trigger element', () => {
      render(
        <KeyboardShortcutsDialog
          trigger={<button>Open Shortcuts</button>}
        />
      );

      expect(screen.getByRole('button', { name: /open shortcuts/i })).toBeInTheDocument();
    });
  });

  describe('shortcut categories', () => {
    it('should render General category', () => {
      render(<KeyboardShortcutsDialog open={true} />);

      expect(screen.getByText('General')).toBeInTheDocument();
    });

    it('should render Navigation category', () => {
      render(<KeyboardShortcutsDialog open={true} />);

      expect(screen.getByText('Navigation')).toBeInTheDocument();
    });

    it('should render Elements category', () => {
      render(<KeyboardShortcutsDialog open={true} />);

      expect(screen.getByText('Elements')).toBeInTheDocument();
    });

    it('should render Viewport category', () => {
      render(<KeyboardShortcutsDialog open={true} />);

      expect(screen.getByText('Viewport')).toBeInTheDocument();
    });

    it('should render AI category', () => {
      render(<KeyboardShortcutsDialog open={true} />);

      expect(screen.getByText('AI')).toBeInTheDocument();
    });
  });

  describe('shortcut items', () => {
    it('should display general shortcuts', () => {
      render(<KeyboardShortcutsDialog open={true} />);

      expect(screen.getByText('Undo last action')).toBeInTheDocument();
      expect(screen.getByText('Redo action')).toBeInTheDocument();
      expect(screen.getByText('Save changes')).toBeInTheDocument();
    });

    it('should display element shortcuts', () => {
      render(<KeyboardShortcutsDialog open={true} />);

      expect(screen.getByText('Delete selected element')).toBeInTheDocument();
      expect(screen.getByText('Duplicate selected element')).toBeInTheDocument();
    });

    it('should display viewport shortcuts', () => {
      render(<KeyboardShortcutsDialog open={true} />);

      expect(screen.getByText('Zoom in')).toBeInTheDocument();
      expect(screen.getByText('Zoom out')).toBeInTheDocument();
    });

    it('should display AI shortcuts', () => {
      render(<KeyboardShortcutsDialog open={true} />);

      expect(screen.getByText('Open AI prompt bar')).toBeInTheDocument();
      expect(screen.getByText('Submit AI prompt')).toBeInTheDocument();
    });
  });

  describe('dialog interactions', () => {
    it('should call onOpenChange when dialog is closed', async () => {
      const mockOnOpenChange = jest.fn();
      const user = userEvent.setup();

      render(
        <KeyboardShortcutsDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      // Press Escape to close
      await user.keyboard('{Escape}');

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('should open dialog when trigger is clicked', async () => {
      const mockOnOpenChange = jest.fn();
      const user = userEvent.setup();

      render(
        <KeyboardShortcutsDialog
          onOpenChange={mockOnOpenChange}
          trigger={<button>Show Shortcuts</button>}
        />
      );

      await user.click(screen.getByRole('button', { name: /show shortcuts/i }));

      expect(mockOnOpenChange).toHaveBeenCalledWith(true);
    });
  });

  describe('footer', () => {
    it('should display footer with hint text', () => {
      render(<KeyboardShortcutsDialog open={true} />);

      // Footer should contain hint about showing the dialog
      expect(screen.getByText(/at any time to show this dialog/i)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper dialog role', () => {
      render(<KeyboardShortcutsDialog open={true} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have dialog title', () => {
      render(<KeyboardShortcutsDialog open={true} />);

      expect(screen.getByRole('heading', { name: /keyboard shortcuts/i })).toBeInTheDocument();
    });

    it('should have dialog description', () => {
      render(<KeyboardShortcutsDialog open={true} />);

      expect(
        screen.getByText(/use these keyboard shortcuts to work faster/i)
      ).toBeInTheDocument();
    });
  });
});
