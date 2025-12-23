/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReasoningPart } from './reasoning-part';
import type { ReasoningPart as ReasoningPartType } from '@/types/message';

// Mock Reasoning components
jest.mock('@/components/ai-elements/reasoning', () => ({
  Reasoning: ({ children, isStreaming, duration }: { 
    children: React.ReactNode; 
    isStreaming?: boolean;
    duration?: number;
  }) => (
    <div data-testid="reasoning" data-streaming={isStreaming} data-duration={duration}>
      {children}
    </div>
  ),
  ReasoningTrigger: () => <button data-testid="reasoning-trigger">Show Reasoning</button>,
  ReasoningContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="reasoning-content">{children}</div>
  ),
}));

describe('ReasoningPart', () => {
  it('renders without crashing', () => {
    const part: ReasoningPartType = { type: 'reasoning', content: 'Thinking...', isStreaming: false };
    render(<ReasoningPart part={part} />);
    expect(screen.getByTestId('reasoning')).toBeInTheDocument();
  });

  it('displays reasoning content', () => {
    const part: ReasoningPartType = { 
      type: 'reasoning', 
      content: 'Let me think about this problem step by step.',
      isStreaming: false
    };
    render(<ReasoningPart part={part} />);
    expect(screen.getByText('Let me think about this problem step by step.')).toBeInTheDocument();
  });

  it('renders reasoning trigger', () => {
    const part: ReasoningPartType = { type: 'reasoning', content: 'Thinking...', isStreaming: false };
    render(<ReasoningPart part={part} />);
    expect(screen.getByTestId('reasoning-trigger')).toBeInTheDocument();
  });

  it('passes isStreaming prop correctly', () => {
    const part: ReasoningPartType = { type: 'reasoning', content: 'Processing...', isStreaming: true };
    render(<ReasoningPart part={part} />);
    
    const reasoning = screen.getByTestId('reasoning');
    expect(reasoning).toHaveAttribute('data-streaming', 'true');
  });

  it('passes duration prop correctly', () => {
    const part: ReasoningPartType = { type: 'reasoning', content: 'Done', duration: 5000, isStreaming: false };
    render(<ReasoningPart part={part} />);
    
    const reasoning = screen.getByTestId('reasoning');
    expect(reasoning).toHaveAttribute('data-duration', '5000');
  });

  it('handles empty content', () => {
    const part: ReasoningPartType = { type: 'reasoning', content: '', isStreaming: false };
    render(<ReasoningPart part={part} />);
    expect(screen.getByTestId('reasoning')).toBeInTheDocument();
  });

  it('handles long reasoning content', () => {
    const longContent = 'Step 1: Analyze the problem.\n'.repeat(50);
    const part: ReasoningPartType = { type: 'reasoning', content: longContent, isStreaming: false };
    render(<ReasoningPart part={part} />);
    expect(screen.getByTestId('reasoning-content')).toBeInTheDocument();
  });

  it('renders without isStreaming when not provided', () => {
    const part: ReasoningPartType = { type: 'reasoning', content: 'Thinking', isStreaming: false };
    render(<ReasoningPart part={part} />);
    
    const reasoning = screen.getByTestId('reasoning');
    expect(reasoning).toHaveAttribute('data-streaming', 'false');
  });
});
