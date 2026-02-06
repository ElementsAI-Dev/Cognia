/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChatWidgetShortcuts } from './chat-widget-shortcuts';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: '快捷键',
      sendMessage: '发送消息',
      newLine: '换行',
      hideAssistant: '隐藏助手',
      previousMessage: '上一条消息',
      nextMessage: '下一条消息',
      toggleAssistant: '唤起/隐藏助手',
      openPanel: '打开此面板',
    };
    return translations[key] || key;
  },
}));

// Mock Dialog to avoid portal issues in tests
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-wrapper">{children}</div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock Button component
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

describe('ChatWidgetShortcuts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders trigger button', () => {
    render(<ChatWidgetShortcuts />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('applies custom className to trigger button', () => {
    render(<ChatWidgetShortcuts className="custom-class" />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('renders dialog wrapper', () => {
    render(<ChatWidgetShortcuts />);
    expect(screen.getByTestId('dialog-wrapper')).toBeInTheDocument();
  });

  it('renders dialog content with shortcuts', () => {
    render(<ChatWidgetShortcuts />);
    expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
  });

  it('displays dialog title', () => {
    render(<ChatWidgetShortcuts />);
    expect(screen.getByTestId('dialog-title')).toBeInTheDocument();
  });

  it('displays all shortcut descriptions', () => {
    render(<ChatWidgetShortcuts />);

    expect(screen.getByText('发送消息')).toBeInTheDocument();
    expect(screen.getByText('换行')).toBeInTheDocument();
    expect(screen.getByText('隐藏助手')).toBeInTheDocument();
    expect(screen.getByText('上一条消息')).toBeInTheDocument();
    expect(screen.getByText('下一条消息')).toBeInTheDocument();
    expect(screen.getByText('唤起/隐藏助手')).toBeInTheDocument();
  });

  it('displays keyboard shortcut keys', () => {
    render(<ChatWidgetShortcuts />);

    // Check for key elements
    expect(screen.getAllByText('Enter').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Shift').length).toBeGreaterThan(0);
    expect(screen.getByText('Esc')).toBeInTheDocument();
    expect(screen.getByText('↑')).toBeInTheDocument();
    expect(screen.getByText('↓')).toBeInTheDocument();
    expect(screen.getByText('Ctrl')).toBeInTheDocument();
    expect(screen.getByText('Space')).toBeInTheDocument();
  });

  it('renders keyboard icon in trigger button', () => {
    const { container } = render(<ChatWidgetShortcuts />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('displays help text about ? key', () => {
    render(<ChatWidgetShortcuts />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});
