/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatWidgetSuggestions } from './chat-widget-suggestions';

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

  it('renders all quick suggestions', () => {
    render(<ChatWidgetSuggestions {...defaultProps} />);
    
    expect(screen.getByText('解释一下')).toBeInTheDocument();
    expect(screen.getByText('写代码')).toBeInTheDocument();
    expect(screen.getByText('总结文章')).toBeInTheDocument();
    expect(screen.getByText('翻译')).toBeInTheDocument();
    expect(screen.getByText('优化文字')).toBeInTheDocument();
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

  it('calls onSelect with correct prompt when clicking "总结文章"', () => {
    render(<ChatWidgetSuggestions {...defaultProps} />);
    
    fireEvent.click(screen.getByText('总结文章'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith('请帮我总结以下内容的要点：');
  });

  it('calls onSelect with correct prompt when clicking "翻译"', () => {
    render(<ChatWidgetSuggestions {...defaultProps} />);
    
    fireEvent.click(screen.getByText('翻译'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith('请将以下内容翻译成中文/英文：');
  });

  it('calls onSelect with correct prompt when clicking "优化文字"', () => {
    render(<ChatWidgetSuggestions {...defaultProps} />);
    
    fireEvent.click(screen.getByText('优化文字'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith('请帮我优化以下文字，使其更加清晰流畅：');
  });

  it('applies custom className', () => {
    const { container } = render(
      <ChatWidgetSuggestions {...defaultProps} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders buttons with correct styling classes', () => {
    render(<ChatWidgetSuggestions {...defaultProps} />);
    
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);
    
    buttons.forEach(button => {
      expect(button).toHaveClass('rounded-full');
      expect(button).toHaveClass('text-xs');
    });
  });

  it('renders icons for each suggestion', () => {
    const { container } = render(<ChatWidgetSuggestions {...defaultProps} />);
    
    // Check that SVG icons are rendered
    const svgIcons = container.querySelectorAll('svg');
    expect(svgIcons.length).toBeGreaterThanOrEqual(5);
  });
});
