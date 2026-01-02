/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { KeyboardShortcutsSettings } from './keyboard-shortcuts-settings';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock stores
const mockSetCustomShortcut = jest.fn();
const mockResetShortcuts = jest.fn();
let mockCustomShortcuts: Record<string, string> = {};
let mockLanguage = 'en';

jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      language: mockLanguage,
      customShortcuts: mockCustomShortcuts,
      setCustomShortcut: mockSetCustomShortcut,
      resetShortcuts: mockResetShortcuts,
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} data-testid="button">{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onKeyDown, placeholder, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      value={value}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      data-testid="shortcut-input"
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

describe('KeyboardShortcutsSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCustomShortcuts = {};
    mockLanguage = 'en';
  });

  it('renders without crashing', () => {
    render(<KeyboardShortcutsSettings />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('displays title', () => {
    render(<KeyboardShortcutsSettings />);
    expect(screen.getByText('keyboardShortcuts')).toBeInTheDocument();
  });

  it('displays description', () => {
    render(<KeyboardShortcutsSettings />);
    expect(screen.getByText('keyboardShortcutsDescription')).toBeInTheDocument();
  });

  it('shows reset button', () => {
    render(<KeyboardShortcutsSettings />);
    expect(screen.getByText('resetToDefaults')).toBeInTheDocument();
  });

  it('calls resetShortcuts when reset button clicked', () => {
    render(<KeyboardShortcutsSettings />);
    const resetButton = screen.getByText('resetToDefaults');
    fireEvent.click(resetButton);
    expect(mockResetShortcuts).toHaveBeenCalled();
  });

  it('displays shortcut categories', () => {
    render(<KeyboardShortcutsSettings />);
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Editing')).toBeInTheDocument();
  });

  it('displays default shortcuts', () => {
    render(<KeyboardShortcutsSettings />);
    expect(screen.getByText('New Chat')).toBeInTheDocument();
    expect(screen.getByText('Send Message')).toBeInTheDocument();
    expect(screen.getByText('Toggle Sidebar')).toBeInTheDocument();
  });

  it('displays shortcut keys', () => {
    render(<KeyboardShortcutsSettings />);
    expect(screen.getByText('Ctrl+N')).toBeInTheDocument();
    expect(screen.getByText('Enter')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+B')).toBeInTheDocument();
  });

  it('displays tip text in English', () => {
    render(<KeyboardShortcutsSettings />);
    expect(screen.getByText('Tip: Click edit, then press the new key combination')).toBeInTheDocument();
  });

  it('displays tip text in Chinese when language is zh-CN', () => {
    mockLanguage = 'zh-CN';
    render(<KeyboardShortcutsSettings />);
    expect(screen.getByText('提示：点击编辑按钮，然后按下新的快捷键组合')).toBeInTheDocument();
  });

  it('displays Chinese category labels when language is zh-CN', () => {
    mockLanguage = 'zh-CN';
    render(<KeyboardShortcutsSettings />);
    expect(screen.getByText('聊天')).toBeInTheDocument();
    expect(screen.getByText('导航')).toBeInTheDocument();
    expect(screen.getByText('编辑')).toBeInTheDocument();
  });
});

describe('KeyboardShortcutsSettings custom shortcuts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCustomShortcuts = { newChat: 'Ctrl+Shift+N' };
    mockLanguage = 'en';
  });

  it('displays customized shortcuts', () => {
    render(<KeyboardShortcutsSettings />);
    expect(screen.getByText('Ctrl+Shift+N')).toBeInTheDocument();
  });

  it('shows customized indicator for modified shortcuts', () => {
    render(<KeyboardShortcutsSettings />);
    expect(screen.getByText('(customized)')).toBeInTheDocument();
  });
});

describe('KeyboardShortcutsSettings editing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCustomShortcuts = {};
    mockLanguage = 'en';
  });

  it('shows all default shortcut items', () => {
    render(<KeyboardShortcutsSettings />);
    // All default shortcuts should be visible
    expect(screen.getByText('New Chat')).toBeInTheDocument();
    expect(screen.getByText('Regenerate Response')).toBeInTheDocument();
    expect(screen.getByText('Stop Generation')).toBeInTheDocument();
    expect(screen.getByText('Clear Chat')).toBeInTheDocument();
    expect(screen.getByText('Open Settings')).toBeInTheDocument();
    expect(screen.getByText('Focus Input')).toBeInTheDocument();
    expect(screen.getByText('Search Chats')).toBeInTheDocument();
    expect(screen.getByText('Copy Last Message')).toBeInTheDocument();
    expect(screen.getByText('Edit Last Message')).toBeInTheDocument();
  });
});
