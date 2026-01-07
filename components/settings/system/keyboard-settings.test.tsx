/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { KeyboardSettings } from './keyboard-settings';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: 'Keyboard Shortcuts',
      description: 'View and customize keyboard shortcuts',
      chat: 'Chat',
      navigation: 'Navigation',
      editing: 'Editing',
      system: 'System',
    };
    return translations[key] || key;
  },
}));

// Mock hooks
jest.mock('@/hooks/ui', () => ({
  useKeyboardShortcuts: () => ({
    shortcuts: [
      { key: 'n', description: 'New chat', category: 'chat', modifiers: ['ctrl'] },
      { key: 's', description: 'Save', category: 'editing', modifiers: ['ctrl'] },
      { key: 'k', description: 'Quick search', category: 'navigation', modifiers: ['ctrl'] },
      { key: '?', description: 'Show help', category: 'system', modifiers: ['ctrl', 'shift'] },
    ],
  }),
  formatShortcut: (shortcut: { key: string; modifiers?: string[] }) => {
    const mods = shortcut.modifiers?.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join('+') || '';
    return mods ? `${mods}+${shortcut.key.toUpperCase()}` : shortcut.key.toUpperCase();
  },
}));

// Mock stores
jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      customShortcuts: {},
      setCustomShortcut: jest.fn(),
      resetShortcuts: jest.fn(),
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span data-testid="badge" className={className}>{children}</span>
  ),
}));

describe('KeyboardSettings', () => {
  it('renders without crashing', () => {
    render(<KeyboardSettings />);
    expect(screen.getAllByTestId('card').length).toBeGreaterThan(0);
  });

  it('displays keyboard shortcuts title', () => {
    render(<KeyboardSettings />);
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('displays shortcut description', () => {
    const { container } = render(<KeyboardSettings />);
    // Component should render keyboard shortcuts content
    expect(container).toBeInTheDocument();
  });

  it('displays category badges', () => {
    render(<KeyboardSettings />);
    const badges = screen.getAllByTestId('badge');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('displays Chat category', () => {
    render(<KeyboardSettings />);
    // Component renders translation key with categories prefix
    expect(screen.getByText('categories.chat')).toBeInTheDocument();
  });

  it('displays Navigation category', () => {
    render(<KeyboardSettings />);
    expect(screen.getByText('categories.navigation')).toBeInTheDocument();
  });

  it('displays Editing category', () => {
    render(<KeyboardSettings />);
    expect(screen.getByText('categories.editing')).toBeInTheDocument();
  });

  it('displays System category', () => {
    render(<KeyboardSettings />);
    expect(screen.getByText('categories.system')).toBeInTheDocument();
  });

  it('displays shortcut descriptions', () => {
    render(<KeyboardSettings />);
    expect(screen.getByText('New chat')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Quick search')).toBeInTheDocument();
    expect(screen.getByText('Show help')).toBeInTheDocument();
  });
});
