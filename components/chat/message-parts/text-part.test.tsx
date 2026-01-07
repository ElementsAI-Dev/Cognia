/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TextPart } from './text-part';
import type { TextPart as TextPartType } from '@/types/message';

// Mock MessageResponse component
jest.mock('@/components/ai-elements/message', () => ({
  MessageResponse: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="message-response" className={className}>{children}</div>
  ),
}));

// Mock MarkdownRenderer to avoid react-markdown ESM issues
jest.mock('@/components/chat/utils/markdown-renderer', () => ({
  MarkdownRenderer: ({ content, className }: { content: string; className?: string }) => (
    <div data-testid="message-response" className={className}>{content}</div>
  ),
}));

// Mock settings store
jest.mock('@/stores/settings', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      enableMathRendering: false,
      enableMermaidDiagrams: false,
      enableVegaLiteCharts: false,
      showLineNumbers: true,
    };
    return selector(state);
  },
}));

describe('TextPart', () => {
  it('renders without crashing', () => {
    const part: TextPartType = { type: 'text', content: 'Hello world' };
    render(<TextPart part={part} />);
    expect(screen.getByTestId('message-response')).toBeInTheDocument();
  });

  it('displays text content', () => {
    const part: TextPartType = { type: 'text', content: 'This is a test message' };
    render(<TextPart part={part} />);
    expect(screen.getByText('This is a test message')).toBeInTheDocument();
  });

  it('applies error styling when isError is true', () => {
    const part: TextPartType = { type: 'text', content: 'Error occurred' };
    render(<TextPart part={part} isError />);
    
    const response = screen.getByTestId('message-response');
    expect(response).toHaveClass('text-destructive');
  });

  it('does not apply error styling when isError is false', () => {
    const part: TextPartType = { type: 'text', content: 'Normal message' };
    render(<TextPart part={part} isError={false} />);
    
    const response = screen.getByTestId('message-response');
    expect(response).not.toHaveClass('text-destructive');
  });

  it('handles empty content', () => {
    const part: TextPartType = { type: 'text', content: '' };
    render(<TextPart part={part} />);
    expect(screen.getByTestId('message-response')).toBeInTheDocument();
  });

  it('handles long content', () => {
    const longContent = 'A'.repeat(1000);
    const part: TextPartType = { type: 'text', content: longContent };
    render(<TextPart part={part} />);
    expect(screen.getByText(longContent)).toBeInTheDocument();
  });

  it('handles content with special characters', () => {
    const part: TextPartType = { type: 'text', content: '<script>alert("xss")</script>' };
    render(<TextPart part={part} />);
    expect(screen.getByText('<script>alert("xss")</script>')).toBeInTheDocument();
  });

  it('handles multiline content', () => {
    const part: TextPartType = { type: 'text', content: 'Line 1\nLine 2\nLine 3' };
    render(<TextPart part={part} />);
    expect(screen.getByText(/Line 1/)).toBeInTheDocument();
  });
});
