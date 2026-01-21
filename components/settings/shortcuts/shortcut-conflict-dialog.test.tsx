/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShortcutConflictDialog } from './shortcut-conflict-dialog';
import type { ShortcutConflict } from '@/types/shortcut';

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => 
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => 
    <p data-testid="dialog-description">{children}</p>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => 
    <h2 data-testid="dialog-title">{children}</h2>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-footer">{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, className }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button onClick={onClick} data-testid={`button-${variant || 'default'}`} data-variant={variant} data-size={size} className={className}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

jest.mock('lucide-react', () => ({
  AlertCircle: () => <span data-testid="icon-alert-circle" />,
  Check: () => <span data-testid="icon-check" />,
  X: () => <span data-testid="icon-x" />,
}));

jest.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

describe('ShortcutConflictDialog', () => {
  const mockConflict: ShortcutConflict = {
    shortcut: 'Ctrl+N',
    existingOwner: 'system',
    existingAction: 'New Window',
    newOwner: 'app',
    newAction: 'New Chat',
    timestamp: Date.now(),
  };

  const mockOnResolve = jest.fn();
  const mockOnOpenChange = jest.fn();
  const mockOnResolveAll = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('returns null when conflicts array is empty', () => {
      const { container } = render(
        <ShortcutConflictDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          conflicts={[]}
          onResolve={mockOnResolve}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders dialog when open is true and has conflicts', () => {
      render(
        <ShortcutConflictDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          conflicts={[mockConflict]}
          onResolve={mockOnResolve}
        />
      );
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });

    it('does not render dialog when open is false', () => {
      render(
        <ShortcutConflictDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          conflicts={[mockConflict]}
          onResolve={mockOnResolve}
        />
      );
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    it('displays dialog title with alert icon', () => {
      render(
        <ShortcutConflictDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          conflicts={[mockConflict]}
          onResolve={mockOnResolve}
        />
      );
      expect(screen.getByTestId('dialog-title')).toBeInTheDocument();
      expect(screen.getByTestId('icon-alert-circle')).toBeInTheDocument();
      expect(screen.getByText('Shortcut Conflicts Detected')).toBeInTheDocument();
    });

    it('displays singular description for one conflict', () => {
      render(
        <ShortcutConflictDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          conflicts={[mockConflict]}
          onResolve={mockOnResolve}
        />
      );
      expect(screen.getByText('The following shortcut conflict needs to be resolved:')).toBeInTheDocument();
    });

    it('displays plural description for multiple conflicts', () => {
      const conflicts = [
        mockConflict,
        { ...mockConflict, shortcut: 'Ctrl+S', timestamp: Date.now() + 1 },
      ];
      render(
        <ShortcutConflictDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          conflicts={conflicts}
          onResolve={mockOnResolve}
        />
      );
      expect(screen.getByText('2 shortcut conflicts need to be resolved:')).toBeInTheDocument();
    });
  });

  describe('Conflict Display', () => {
    it('displays shortcut in badge', () => {
      render(
        <ShortcutConflictDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          conflicts={[mockConflict]}
          onResolve={mockOnResolve}
        />
      );
      expect(screen.getByText('Ctrl+N')).toBeInTheDocument();
    });

    it('displays existing shortcut info', () => {
      render(
        <ShortcutConflictDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          conflicts={[mockConflict]}
          onResolve={mockOnResolve}
        />
      );
      expect(screen.getByText('Existing:')).toBeInTheDocument();
      expect(screen.getByText('New Window')).toBeInTheDocument();
      expect(screen.getByText('(system)')).toBeInTheDocument();
    });

    it('displays new shortcut info', () => {
      render(
        <ShortcutConflictDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          conflicts={[mockConflict]}
          onResolve={mockOnResolve}
        />
      );
      expect(screen.getByText('New:')).toBeInTheDocument();
      expect(screen.getByText('New Chat')).toBeInTheDocument();
      expect(screen.getByText('(app)')).toBeInTheDocument();
    });

    it('displays conflict number for each conflict', () => {
      render(
        <ShortcutConflictDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          conflicts={[mockConflict]}
          onResolve={mockOnResolve}
        />
      );
      expect(screen.getByText('Conflict #1')).toBeInTheDocument();
    });

    it('displays multiple conflicts with correct numbering', () => {
      const conflicts = [
        mockConflict,
        { ...mockConflict, shortcut: 'Ctrl+S', timestamp: Date.now() + 1 },
      ];
      render(
        <ShortcutConflictDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          conflicts={conflicts}
          onResolve={mockOnResolve}
        />
      );
      expect(screen.getByText('Conflict #1')).toBeInTheDocument();
      expect(screen.getByText('Conflict #2')).toBeInTheDocument();
    });
  });

  describe('Resolution Buttons', () => {
    it('displays Keep Existing button', () => {
      render(
        <ShortcutConflictDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          conflicts={[mockConflict]}
          onResolve={mockOnResolve}
        />
      );
      expect(screen.getByText('Keep Existing')).toBeInTheDocument();
    });

    it('displays Use New button', () => {
      render(
        <ShortcutConflictDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          conflicts={[mockConflict]}
          onResolve={mockOnResolve}
        />
      );
      expect(screen.getByText('Use New')).toBeInTheDocument();
    });

    it('calls onResolve with keep-existing when Keep Existing clicked', () => {
      render(
        <ShortcutConflictDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          conflicts={[mockConflict]}
          onResolve={mockOnResolve}
        />
      );
      fireEvent.click(screen.getByText('Keep Existing'));
      expect(mockOnResolve).toHaveBeenCalledWith(mockConflict, 'keep-existing');
    });

    it('calls onResolve with use-new when Use New clicked', () => {
      render(
        <ShortcutConflictDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          conflicts={[mockConflict]}
          onResolve={mockOnResolve}
        />
      );
      fireEvent.click(screen.getByText('Use New'));
      expect(mockOnResolve).toHaveBeenCalledWith(mockConflict, 'use-new');
    });

    it('calls onResolve with cancel when X button clicked', () => {
      render(
        <ShortcutConflictDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          conflicts={[mockConflict]}
          onResolve={mockOnResolve}
        />
      );
      const ghostButtons = screen.getAllByTestId('button-ghost');
      // Find the X button (the one in conflict card, not the Cancel in footer)
      const cancelButton = ghostButtons[0];
      fireEvent.click(cancelButton);
      expect(mockOnResolve).toHaveBeenCalledWith(mockConflict, 'cancel');
    });
  });

  describe('Batch Resolution (Multiple Conflicts)', () => {
    const multipleConflicts = [
      mockConflict,
      { ...mockConflict, shortcut: 'Ctrl+S', timestamp: Date.now() + 1 },
    ];

    it('displays footer with batch resolution options for multiple conflicts', () => {
      render(
        <ShortcutConflictDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          conflicts={multipleConflicts}
          onResolve={mockOnResolve}
        />
      );
      expect(screen.getByTestId('dialog-footer')).toBeInTheDocument();
      expect(screen.getByText('Keep All Existing')).toBeInTheDocument();
      expect(screen.getByText('Use All New')).toBeInTheDocument();
    });

    it('does not display footer for single conflict', () => {
      render(
        <ShortcutConflictDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          conflicts={[mockConflict]}
          onResolve={mockOnResolve}
        />
      );
      expect(screen.queryByTestId('dialog-footer')).not.toBeInTheDocument();
    });

    it('calls onResolveAll when Keep All Existing clicked', () => {
      render(
        <ShortcutConflictDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          conflicts={multipleConflicts}
          onResolve={mockOnResolve}
          onResolveAll={mockOnResolveAll}
        />
      );
      fireEvent.click(screen.getByText('Keep All Existing'));
      expect(mockOnResolveAll).toHaveBeenCalledWith('keep-existing');
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('calls onResolveAll when Use All New clicked', () => {
      render(
        <ShortcutConflictDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          conflicts={multipleConflicts}
          onResolve={mockOnResolve}
          onResolveAll={mockOnResolveAll}
        />
      );
      fireEvent.click(screen.getByText('Use All New'));
      expect(mockOnResolveAll).toHaveBeenCalledWith('use-new');
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('resolves each conflict individually when onResolveAll not provided', () => {
      render(
        <ShortcutConflictDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          conflicts={multipleConflicts}
          onResolve={mockOnResolve}
        />
      );
      fireEvent.click(screen.getByText('Keep All Existing'));
      expect(mockOnResolve).toHaveBeenCalledTimes(2);
      expect(mockOnResolve).toHaveBeenCalledWith(multipleConflicts[0], 'keep-existing');
      expect(mockOnResolve).toHaveBeenCalledWith(multipleConflicts[1], 'keep-existing');
    });

    it('closes dialog when Cancel button clicked', () => {
      render(
        <ShortcutConflictDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          conflicts={multipleConflicts}
          onResolve={mockOnResolve}
        />
      );
      // Get the Cancel button in footer (ghost variant)
      const ghostButtons = screen.getAllByTestId('button-ghost');
      const cancelButton = ghostButtons.find(btn => btn.textContent === 'Cancel');
      expect(cancelButton).toBeTruthy();
      fireEvent.click(cancelButton!);
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Edge Cases', () => {
    it('handles conflict with special characters in shortcut', () => {
      const specialConflict: ShortcutConflict = {
        ...mockConflict,
        shortcut: 'Ctrl+Shift+[',
      };
      render(
        <ShortcutConflictDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          conflicts={[specialConflict]}
          onResolve={mockOnResolve}
        />
      );
      expect(screen.getByText('Ctrl+Shift+[')).toBeInTheDocument();
    });

    it('handles conflict with long action names', () => {
      const longConflict: ShortcutConflict = {
        ...mockConflict,
        existingAction: 'This is a very long action name that should still be displayed correctly',
        newAction: 'Another very long action name for testing purposes',
      };
      render(
        <ShortcutConflictDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          conflicts={[longConflict]}
          onResolve={mockOnResolve}
        />
      );
      expect(screen.getByText(longConflict.existingAction)).toBeInTheDocument();
      expect(screen.getByText(longConflict.newAction)).toBeInTheDocument();
    });

    it('handles conflict with empty owner names', () => {
      const emptyOwnerConflict: ShortcutConflict = {
        ...mockConflict,
        existingOwner: '',
        newOwner: '',
      };
      render(
        <ShortcutConflictDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          conflicts={[emptyOwnerConflict]}
          onResolve={mockOnResolve}
        />
      );
      // Both empty owners will render as "()" - check that at least 2 exist
      const emptyOwnerElements = screen.getAllByText('()');
      expect(emptyOwnerElements.length).toBe(2);
    });
  });
});
