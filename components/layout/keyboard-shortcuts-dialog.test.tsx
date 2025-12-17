/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { KeyboardShortcutsDialog } from './keyboard-shortcuts-dialog';

// Mock hooks
jest.mock('@/hooks/use-keyboard-shortcuts', () => ({
  useKeyboardShortcuts: () => ({
    shortcuts: [
      { key: 'n', ctrl: true, description: 'New chat', category: 'chat' },
      { key: 's', ctrl: true, description: 'Save', category: 'editing' },
      { key: '/', ctrl: true, description: 'Search', category: 'navigation' },
    ],
  }),
  formatShortcut: ({ key, ctrl }: { key: string; ctrl?: boolean }) => 
    `${ctrl ? 'Ctrl+' : ''}${key.toUpperCase()}`,
}));

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="dialog" data-open={open}>{children}</div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  DialogTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-trigger">{children}</div>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
}));

describe('KeyboardShortcutsDialog', () => {
  it('renders without crashing', () => {
    render(<KeyboardShortcutsDialog />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('renders default trigger button', () => {
    render(<KeyboardShortcutsDialog />);
    expect(screen.getByText('Shortcuts')).toBeInTheDocument();
  });

  it('renders custom trigger when provided', () => {
    render(
      <KeyboardShortcutsDialog 
        trigger={<button>Custom Trigger</button>}
      />
    );
    expect(screen.getByText('Custom Trigger')).toBeInTheDocument();
  });

  it('displays dialog title', () => {
    render(<KeyboardShortcutsDialog />);
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('displays dialog description', () => {
    render(<KeyboardShortcutsDialog />);
    expect(screen.getByText(/Use these shortcuts/)).toBeInTheDocument();
  });

  it('displays shortcuts grouped by category', () => {
    render(<KeyboardShortcutsDialog />);
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Editing')).toBeInTheDocument();
    expect(screen.getByText('Navigation')).toBeInTheDocument();
  });

  it('displays shortcut descriptions', () => {
    render(<KeyboardShortcutsDialog />);
    expect(screen.getByText('New chat')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('displays formatted shortcut keys', () => {
    render(<KeyboardShortcutsDialog />);
    expect(screen.getByText('Ctrl+N')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+S')).toBeInTheDocument();
  });

  it('displays tip about command palette', () => {
    render(<KeyboardShortcutsDialog />);
    expect(screen.getByText(/Tip:/)).toBeInTheDocument();
    expect(screen.getByText(/command palette/)).toBeInTheDocument();
  });
});
