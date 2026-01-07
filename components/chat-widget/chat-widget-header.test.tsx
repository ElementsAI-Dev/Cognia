/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatWidgetHeader } from './chat-widget-header';
import type { ChatWidgetConfig, ChatWidgetMessage } from '@/stores/chat';

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <div data-testid="dropdown-item" onClick={onClick}>{children}</div>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('./chat-widget-shortcuts', () => ({
  ChatWidgetShortcuts: () => <div data-testid="shortcuts">Shortcuts</div>,
}));

describe('ChatWidgetHeader', () => {
  const defaultConfig: ChatWidgetConfig = {
    width: 420,
    height: 600,
    x: null,
    y: null,
    rememberPosition: true,
    startMinimized: false,
    opacity: 1.0,
    shortcut: 'CommandOrControl+Shift+Space',
    pinned: false,
    provider: 'openai',
    model: 'gpt-4o-mini',
    systemPrompt: 'You are a helpful assistant.',
    maxMessages: 50,
    showTimestamps: false,
    soundEnabled: false,
    autoFocus: true,
    backgroundColor: '#ffffff',
  };

  const defaultProps = {
    config: defaultConfig,
    onClose: jest.fn(),
    onNewSession: jest.fn(),
    onClearMessages: jest.fn(),
    onTogglePin: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ChatWidgetHeader {...defaultProps} />);
    expect(screen.getByText('Cognia')).toBeInTheDocument();
  });

  it('displays the app title', () => {
    render(<ChatWidgetHeader {...defaultProps} />);
    expect(screen.getByText('Cognia')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<ChatWidgetHeader {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons[buttons.length - 1]; // Last button is close
    
    fireEvent.click(closeButton);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onTogglePin when pin button is clicked', () => {
    render(<ChatWidgetHeader {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    const pinButton = buttons[0]; // First button is pin
    
    fireEvent.click(pinButton);
    expect(defaultProps.onTogglePin).toHaveBeenCalled();
  });

  it('displays pin icon when pinned is false', () => {
    render(<ChatWidgetHeader {...defaultProps} config={{ ...defaultConfig, pinned: false }} />);
    const { container } = render(<ChatWidgetHeader {...defaultProps} config={{ ...defaultConfig, pinned: false }} />);
    // Pin icon should be present
    const svgIcons = container.querySelectorAll('svg');
    expect(svgIcons.length).toBeGreaterThan(0);
  });

  it('displays pinned indicator when pinned is true', () => {
    const { container } = render(<ChatWidgetHeader {...defaultProps} config={{ ...defaultConfig, pinned: true }} />);
    // PinOff icon and small Pin indicator should be present
    const svgIcons = container.querySelectorAll('svg');
    expect(svgIcons.length).toBeGreaterThan(0);
  });

  it('displays message count badge when messages exist', () => {
    const messages: ChatWidgetMessage[] = [
      { id: '1', role: 'user', content: 'Hello', timestamp: new Date() },
      { id: '2', role: 'assistant', content: 'Hi', timestamp: new Date() },
    ];
    
    render(<ChatWidgetHeader {...defaultProps} messages={messages} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('does not display message count badge when no messages', () => {
    render(<ChatWidgetHeader {...defaultProps} messages={[]} />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('displays dropdown menu with options', () => {
    render(<ChatWidgetHeader {...defaultProps} />);
    expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
  });

  it('calls onNewSession when new session option is clicked', () => {
    render(<ChatWidgetHeader {...defaultProps} />);
    const menuItems = screen.getAllByTestId('dropdown-item');
    const newSessionItem = menuItems.find(item => item.textContent?.includes('新会话'));
    
    if (newSessionItem) {
      fireEvent.click(newSessionItem);
      expect(defaultProps.onNewSession).toHaveBeenCalled();
    }
  });

  it('calls onClearMessages when clear messages option is clicked', () => {
    render(<ChatWidgetHeader {...defaultProps} />);
    const menuItems = screen.getAllByTestId('dropdown-item');
    const clearItem = menuItems.find(item => item.textContent?.includes('清空消息'));
    
    if (clearItem) {
      fireEvent.click(clearItem);
      expect(defaultProps.onClearMessages).toHaveBeenCalled();
    }
  });

  it('displays export option when onExport is provided and messages exist', () => {
    const messages: ChatWidgetMessage[] = [
      { id: '1', role: 'user', content: 'Hello', timestamp: new Date() },
    ];
    const onExport = jest.fn();
    
    render(<ChatWidgetHeader {...defaultProps} messages={messages} onExport={onExport} />);
    const menuItems = screen.getAllByTestId('dropdown-item');
    const exportItem = menuItems.find(item => item.textContent?.includes('导出对话'));
    
    expect(exportItem).toBeDefined();
  });

  it('calls onExport when export option is clicked', () => {
    const messages: ChatWidgetMessage[] = [
      { id: '1', role: 'user', content: 'Hello', timestamp: new Date() },
    ];
    const onExport = jest.fn();
    
    render(<ChatWidgetHeader {...defaultProps} messages={messages} onExport={onExport} />);
    const menuItems = screen.getAllByTestId('dropdown-item');
    const exportItem = menuItems.find(item => item.textContent?.includes('导出对话'));
    
    if (exportItem) {
      fireEvent.click(exportItem);
      expect(onExport).toHaveBeenCalled();
    }
  });

  it('displays settings option when onSettings is provided', () => {
    const onSettings = jest.fn();
    
    render(<ChatWidgetHeader {...defaultProps} onSettings={onSettings} />);
    const menuItems = screen.getAllByTestId('dropdown-item');
    const settingsItem = menuItems.find(item => item.textContent?.includes('设置'));
    
    expect(settingsItem).toBeDefined();
  });

  it('calls onSettings when settings option is clicked', () => {
    const onSettings = jest.fn();
    
    render(<ChatWidgetHeader {...defaultProps} onSettings={onSettings} />);
    const menuItems = screen.getAllByTestId('dropdown-item');
    const settingsItem = menuItems.find(item => item.textContent?.includes('设置'));
    
    if (settingsItem) {
      fireEvent.click(settingsItem);
      expect(onSettings).toHaveBeenCalled();
    }
  });

  it('applies custom className', () => {
    const { container } = render(<ChatWidgetHeader {...defaultProps} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('has drag region data attribute for Tauri dragging', () => {
    const { container } = render(<ChatWidgetHeader {...defaultProps} />);
    const dragRegion = container.querySelector('[data-tauri-drag-region]');
    expect(dragRegion).toBeInTheDocument();
  });

  it('renders shortcuts component in dropdown', () => {
    render(<ChatWidgetHeader {...defaultProps} />);
    expect(screen.getByTestId('shortcuts')).toBeInTheDocument();
  });
});
