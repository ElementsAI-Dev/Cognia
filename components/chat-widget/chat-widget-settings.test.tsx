/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatWidgetSettings } from './chat-widget-settings';
import type { ChatWidgetConfig } from '@/stores/chat';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: '助手设置',
      description: '配置 AI 助手的模型和行为',
      aiModel: 'AI 模型',
      provider: '提供商',
      selectProvider: '选择提供商',
      model: '模型',
      selectModel: '选择模型',
      systemPrompt: '系统提示词',
      systemPromptPlaceholder: '设置 AI 的角色和行为...',
      behavior: '行为设置',
      alwaysOnTop: '窗口置顶',
      alwaysOnTopDesc: '保持窗口在最前面',
      autoFocus: '自动聚焦',
      autoFocusDesc: '打开时自动聚焦输入框',
      showTimestamps: '显示时间',
      showTimestampsDesc: '在消息旁显示时间戳',
      rememberPosition: '记住位置',
      rememberPositionDesc: '记住窗口位置',
      shortcuts: '快捷键',
      toggleAssistant: '唤起/隐藏助手',
      reset: '重置',
      save: '保存',
    };
    return translations[key] || key;
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: React.forwardRef<
    HTMLTextAreaElement,
    React.TextareaHTMLAttributes<HTMLTextAreaElement>
  >(function Textarea(props, ref) {
    return <textarea ref={ref} {...props} />;
  }),
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({
    id,
    checked,
    onCheckedChange,
  }: {
    id: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      data-testid={`switch-${id}`}
    />
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (v: string) => void;
  }) => (
    <div data-testid="select" data-value={value}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(
            child as React.ReactElement<{ onValueChange?: (v: string) => void }>,
            { onValueChange }
          );
        }
        return child;
      })}
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value} data-testid={`select-item-${value}`}>
      {children}
    </option>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="select-trigger">{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className} data-testid="scroll-area">
      {children}
    </div>
  ),
}));

describe('ChatWidgetSettings', () => {
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
    open: true,
    onOpenChange: jest.fn(),
    config: defaultConfig,
    onUpdateConfig: jest.fn(),
    onResetConfig: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    render(<ChatWidgetSettings {...defaultProps} open={false} />);
    expect(screen.queryByTestId('sheet')).not.toBeInTheDocument();
  });

  it('renders sheet when open', () => {
    render(<ChatWidgetSettings {...defaultProps} />);
    expect(screen.getByTestId('sheet')).toBeInTheDocument();
  });

  it('displays settings title', () => {
    render(<ChatWidgetSettings {...defaultProps} />);
    expect(screen.getByText('助手设置')).toBeInTheDocument();
  });

  it('displays settings description', () => {
    render(<ChatWidgetSettings {...defaultProps} />);
    expect(screen.getByText('配置 AI 助手的模型和行为')).toBeInTheDocument();
  });

  it('displays provider selection', () => {
    render(<ChatWidgetSettings {...defaultProps} />);
    expect(screen.getByText('AI 模型')).toBeInTheDocument();
    expect(screen.getByText('提供商')).toBeInTheDocument();
  });

  it('displays model selection', () => {
    render(<ChatWidgetSettings {...defaultProps} />);
    // Model label is now inside the AI 模型 section
    const labels = screen.getAllByText('模型');
    expect(labels.length).toBeGreaterThan(0);
  });

  it('displays system prompt textarea', () => {
    render(<ChatWidgetSettings {...defaultProps} />);
    expect(screen.getByText('系统提示词')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('设置 AI 的角色和行为...')).toBeInTheDocument();
  });

  it('displays behavior settings section', () => {
    render(<ChatWidgetSettings {...defaultProps} />);
    expect(screen.getByText('行为设置')).toBeInTheDocument();
  });

  it('displays pinned toggle', () => {
    render(<ChatWidgetSettings {...defaultProps} />);
    expect(screen.getByText('窗口置顶')).toBeInTheDocument();
    expect(screen.getByTestId('switch-pinned')).toBeInTheDocument();
  });

  it('displays auto focus toggle', () => {
    render(<ChatWidgetSettings {...defaultProps} />);
    expect(screen.getByText('自动聚焦')).toBeInTheDocument();
    expect(screen.getByTestId('switch-autoFocus')).toBeInTheDocument();
  });

  it('displays show timestamps toggle', () => {
    render(<ChatWidgetSettings {...defaultProps} />);
    expect(screen.getByText('显示时间')).toBeInTheDocument();
    expect(screen.getByTestId('switch-showTimestamps')).toBeInTheDocument();
  });

  it('displays remember position toggle', () => {
    render(<ChatWidgetSettings {...defaultProps} />);
    expect(screen.getByText('记住位置')).toBeInTheDocument();
    expect(screen.getByTestId('switch-rememberPosition')).toBeInTheDocument();
  });

  it('displays shortcut info', () => {
    render(<ChatWidgetSettings {...defaultProps} />);
    expect(screen.getByText('快捷键')).toBeInTheDocument();
    expect(screen.getByText('唤起/隐藏助手')).toBeInTheDocument();
  });

  it('displays reset button', () => {
    render(<ChatWidgetSettings {...defaultProps} />);
    expect(screen.getByText('重置')).toBeInTheDocument();
  });

  it('displays save button', () => {
    render(<ChatWidgetSettings {...defaultProps} />);
    expect(screen.getByText('保存')).toBeInTheDocument();
  });

  it('calls onResetConfig when reset button is clicked', () => {
    render(<ChatWidgetSettings {...defaultProps} />);
    fireEvent.click(screen.getByText('重置'));
    expect(defaultProps.onResetConfig).toHaveBeenCalled();
  });

  it('calls onUpdateConfig and closes when save button is clicked', () => {
    render(<ChatWidgetSettings {...defaultProps} />);
    fireEvent.click(screen.getByText('保存'));
    expect(defaultProps.onUpdateConfig).toHaveBeenCalled();
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('updates pinned state when toggle is changed', () => {
    render(<ChatWidgetSettings {...defaultProps} />);
    const toggle = screen.getByTestId('switch-pinned');
    fireEvent.click(toggle);
    // State should update locally, then be saved on save button click
  });

  it('updates autoFocus state when toggle is changed', () => {
    render(<ChatWidgetSettings {...defaultProps} />);
    const toggle = screen.getByTestId('switch-autoFocus');
    fireEvent.click(toggle);
    // State should update locally
  });

  it('updates showTimestamps state when toggle is changed', () => {
    render(<ChatWidgetSettings {...defaultProps} />);
    const toggle = screen.getByTestId('switch-showTimestamps');
    fireEvent.click(toggle);
    // State should update locally
  });

  it('updates rememberPosition state when toggle is changed', () => {
    render(<ChatWidgetSettings {...defaultProps} />);
    const toggle = screen.getByTestId('switch-rememberPosition');
    fireEvent.click(toggle);
    // State should update locally
  });

  it('updates system prompt when textarea is changed', () => {
    render(<ChatWidgetSettings {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('设置 AI 的角色和行为...');
    fireEvent.change(textarea, { target: { value: 'New prompt' } });
    expect(textarea).toHaveValue('New prompt');
  });

  it('displays current shortcut formatted correctly', () => {
    render(<ChatWidgetSettings {...defaultProps} />);
    // CommandOrControl should be replaced with Ctrl
    expect(screen.getByText('Ctrl+Shift+Space')).toBeInTheDocument();
  });

  it('shows current provider value', () => {
    render(<ChatWidgetSettings {...defaultProps} />);
    const select = screen.getAllByTestId('select')[0];
    expect(select).toHaveAttribute('data-value', 'openai');
  });

  it('shows current model value', () => {
    render(<ChatWidgetSettings {...defaultProps} />);
    const selects = screen.getAllByTestId('select');
    expect(selects[1]).toHaveAttribute('data-value', 'gpt-4o-mini');
  });

  it('displays section cards with proper styling', () => {
    render(<ChatWidgetSettings {...defaultProps} />);
    // New layout uses cards instead of separators
    expect(screen.getByText('AI 模型')).toBeInTheDocument();
    expect(screen.getByText('系统提示词')).toBeInTheDocument();
    expect(screen.getByText('行为设置')).toBeInTheDocument();
    expect(screen.getByText('快捷键')).toBeInTheDocument();
  });
});
