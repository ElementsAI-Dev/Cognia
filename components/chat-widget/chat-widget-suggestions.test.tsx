/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatWidgetSuggestions } from './chat-widget-suggestions';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      explain: '解释一下',
      explainPrompt: '请用简单的语言解释一下这个概念：',
      writeCode: '写代码',
      writeCodePrompt: '帮我写一段代码来实现：',
      translate: '翻译',
      translatePrompt: '请将以下内容翻译成中文/英文：',
      howTo: '怎么做',
      howToPrompt: '请告诉我如何：',
      summarize: '总结文章',
      summarizePrompt: '请帮我总结以下内容的要点：',
      optimize: '优化文字',
      optimizePrompt: '请帮我优化以下文字，使其更加清晰流畅：',
      brainstorm: '头脑风暴',
      brainstormPrompt: '帮我头脑风暴一下关于这个话题的想法：',
      checkErrors: '检查错误',
      checkErrorsPrompt: '请帮我检查以下内容是否有错误：',
      more: '更多',
      collapse: '收起',
    };
    return translations[key] || key;
  },
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: React.ComponentProps<'span'>) => (
      <span {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ChatWidgetSuggestions', () => {
  const defaultProps = {
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ChatWidgetSuggestions {...defaultProps} />);
    expect(screen.getByText('解释一下')).toBeInTheDocument();
  });

  it('renders common suggestions by default', () => {
    render(<ChatWidgetSuggestions {...defaultProps} />);

    // Common suggestions should be visible
    expect(screen.getByText('解释一下')).toBeInTheDocument();
    expect(screen.getByText('写代码')).toBeInTheDocument();
    expect(screen.getByText('翻译')).toBeInTheDocument();
    expect(screen.getByText('怎么做')).toBeInTheDocument();

    // Advanced suggestions should be hidden initially
    expect(screen.queryByText('总结文章')).not.toBeInTheDocument();
    expect(screen.queryByText('优化文字')).not.toBeInTheDocument();
    expect(screen.queryByText('头脑风暴')).not.toBeInTheDocument();
    expect(screen.queryByText('检查错误')).not.toBeInTheDocument();
  });

  it('shows expand button', () => {
    render(<ChatWidgetSuggestions {...defaultProps} />);
    expect(screen.getByText('更多')).toBeInTheDocument();
  });

  it('expands to show all suggestions when clicking expand button', () => {
    render(<ChatWidgetSuggestions {...defaultProps} />);

    // Click expand button
    fireEvent.click(screen.getByText('更多'));

    // Advanced suggestions should now be visible
    expect(screen.getByText('总结文章')).toBeInTheDocument();
    expect(screen.getByText('优化文字')).toBeInTheDocument();
    expect(screen.getByText('头脑风暴')).toBeInTheDocument();
    expect(screen.getByText('检查错误')).toBeInTheDocument();

    // Expand button should change to collapse
    expect(screen.getByText('收起')).toBeInTheDocument();
    expect(screen.queryByText('更多')).not.toBeInTheDocument();
  });

  it('collapses back to common suggestions', () => {
    render(<ChatWidgetSuggestions {...defaultProps} />);

    // Expand
    fireEvent.click(screen.getByText('更多'));
    expect(screen.getByText('总结文章')).toBeInTheDocument();

    // Collapse
    fireEvent.click(screen.getByText('收起'));

    // Advanced suggestions should be hidden again
    expect(screen.queryByText('总结文章')).not.toBeInTheDocument();
    expect(screen.getByText('更多')).toBeInTheDocument();
  });

  it('calls onSelect with correct prompt when clicking "解释一下"', () => {
    render(<ChatWidgetSuggestions {...defaultProps} />);

    fireEvent.click(screen.getByText('解释一下'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith('请用简单的语言解释一下这个概念：');
  });

  it('calls onSelect with correct prompt when clicking "写代码"', () => {
    render(<ChatWidgetSuggestions {...defaultProps} />);

    fireEvent.click(screen.getByText('写代码'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith('帮我写一段代码来实现：');
  });

  it('calls onSelect with correct prompt when clicking "怎么做"', () => {
    render(<ChatWidgetSuggestions {...defaultProps} />);

    fireEvent.click(screen.getByText('怎么做'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith('请告诉我如何：');
  });

  it('calls onSelect with correct prompt for advanced suggestions after expanding', () => {
    render(<ChatWidgetSuggestions {...defaultProps} />);

    // Expand first
    fireEvent.click(screen.getByText('更多'));

    fireEvent.click(screen.getByText('总结文章'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith('请帮我总结以下内容的要点：');
  });

  it('calls onSelect with correct prompt when clicking "翻译"', () => {
    render(<ChatWidgetSuggestions {...defaultProps} />);

    fireEvent.click(screen.getByText('翻译'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith('请将以下内容翻译成中文/英文：');
  });

  it('calls onSelect with correct prompt when clicking "优化文字" after expanding', () => {
    render(<ChatWidgetSuggestions {...defaultProps} />);

    // Expand first
    fireEvent.click(screen.getByText('更多'));

    fireEvent.click(screen.getByText('优化文字'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith('请帮我优化以下文字，使其更加清晰流畅：');
  });

  it('calls onSelect with correct prompt when clicking "头脑风暴" after expanding', () => {
    render(<ChatWidgetSuggestions {...defaultProps} />);

    // Expand first
    fireEvent.click(screen.getByText('更多'));

    fireEvent.click(screen.getByText('头脑风暴'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith('帮我头脑风暴一下关于这个话题的想法：');
  });

  it('calls onSelect with correct prompt when clicking "检查错误" after expanding', () => {
    render(<ChatWidgetSuggestions {...defaultProps} />);

    // Expand first
    fireEvent.click(screen.getByText('更多'));

    fireEvent.click(screen.getByText('检查错误'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith('请帮我检查以下内容是否有错误：');
  });

  it('applies custom className', () => {
    const { container } = render(
      <ChatWidgetSuggestions {...defaultProps} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders buttons with correct styling classes', () => {
    render(<ChatWidgetSuggestions {...defaultProps} />);

    // Get all suggestion buttons (excluding expand button)
    const allButtons = screen.getAllByRole('button');
    const suggestionButtons = allButtons.filter(
      (btn) => btn.textContent !== '更多' && btn.textContent !== '收起'
    );

    // Should have 4 common suggestions visible initially
    expect(suggestionButtons).toHaveLength(4);

    suggestionButtons.forEach((button) => {
      expect(button).toHaveClass('rounded-full');
      expect(button).toHaveClass('text-xs');
    });
  });

  it('renders icons for each suggestion', () => {
    const { container } = render(<ChatWidgetSuggestions {...defaultProps} />);

    // Check that SVG icons are rendered (4 common + expand icon)
    const svgIcons = container.querySelectorAll('svg');
    expect(svgIcons.length).toBeGreaterThanOrEqual(5);
  });

  it('renders all 8 suggestions when expanded', () => {
    render(<ChatWidgetSuggestions {...defaultProps} />);

    // Expand
    fireEvent.click(screen.getByText('更多'));

    // Get all suggestion buttons
    const allButtons = screen.getAllByRole('button');
    const suggestionButtons = allButtons.filter((btn) => btn.textContent !== '收起');

    // Should have all 8 suggestions visible
    expect(suggestionButtons).toHaveLength(8);
  });
});
