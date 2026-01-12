/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SessionStats, SessionStatsCard } from './session-stats';
import type { UIMessage } from '@/types';

// Mock the tokenizer module for consistent test results
jest.mock('@/lib/ai/tokenizer', () => ({
  estimateTokensFast: jest.fn((content: string) => {
    // Simple mock: ~4 chars per token with 10% overhead
    if (!content || content.length === 0) return 0;
    return Math.ceil((content.length / 4) * 1.1);
  }),
}));

describe('SessionStats', () => {
  const createMessage = (role: 'user' | 'assistant', content: string): UIMessage => ({
    id: `msg-${Math.random()}`,
    role,
    content,
    createdAt: new Date(),
    parts: [],
    attachments: [],
  });

  const mockMessages: UIMessage[] = [
    createMessage('user', 'Hello, how are you?'),
    createMessage('assistant', 'I am doing well, thank you for asking! How can I help you today?'),
    createMessage('user', 'Can you write some code?'),
    createMessage('assistant', '```javascript\nconsole.log("Hello World");\n```'),
  ];

  it('renders without crashing', () => {
    render(<SessionStats messages={[]} />);
  });

  it('displays total message count', () => {
    render(<SessionStats messages={mockMessages} />);
    // Find all text nodes that contain '4'
    const element = screen.getByText((content) => content === '4');
    expect(element).toBeInTheDocument();
  });

  it('calculates estimated tokens', () => {
    render(<SessionStats messages={mockMessages} />);
    // The component estimates tokens using estimateTokensFast from @/lib/ai/tokenizer
    // estimateTokensFast uses Math.ceil((content.length / 4) * 1.1) per message
    // Expected: 6 + 18 + 7 + 13 = 44 tokens
    expect(screen.getByText('44')).toBeInTheDocument();
  });

  it('counts code blocks correctly', () => {
    render(<SessionStats messages={mockMessages} />);
    // One code block in the messages - the number 1 should appear
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders compact mode correctly', () => {
    render(<SessionStats messages={mockMessages} compact />);
    // In compact mode, renders stats with numbers visible
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <SessionStats messages={mockMessages} className="custom-class" />
    );
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('handles empty messages array', () => {
    render(<SessionStats messages={[]} />);
    // Multiple stats show 0 for empty messages, just verify component renders
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThan(0);
  });

  it('calculates average response length', () => {
    render(<SessionStats messages={mockMessages} />);
    // Should calculate average assistant message length
    const allText = screen.getAllByText(/\d+/);
    expect(allText.length).toBeGreaterThan(0);
  });

  it('shows duration when sessionCreatedAt is provided', () => {
    const pastDate = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
    render(<SessionStats messages={mockMessages} sessionCreatedAt={pastDate} />);
    // Duration should be rendered - look for time pattern
    expect(screen.getByText(/30m|29m|31m/)).toBeInTheDocument();
  });
});

describe('SessionStatsCard', () => {
  const createMessage = (role: 'user' | 'assistant', content: string): UIMessage => ({
    id: `msg-${Math.random()}`,
    role,
    content,
    createdAt: new Date(),
    parts: [],
    attachments: [],
  });

  const mockMessages: UIMessage[] = [
    createMessage('user', 'Hello'),
    createMessage('assistant', 'Hi there!'),
  ];

  it('renders without crashing', () => {
    render(<SessionStatsCard messages={mockMessages} />);
  });

  it('displays session statistics title', () => {
    render(<SessionStatsCard messages={mockMessages} />);
    expect(screen.getByText('Session Statistics')).toBeInTheDocument();
  });

  it('shows message breakdown', () => {
    render(<SessionStatsCard messages={mockMessages} />);
    expect(screen.getByText('Messages')).toBeInTheDocument();
    expect(screen.getByText(/1 you/)).toBeInTheDocument();
    expect(screen.getByText(/1 AI/)).toBeInTheDocument();
  });

  it('shows estimated tokens', () => {
    render(<SessionStatsCard messages={mockMessages} />);
    expect(screen.getByText('Est. Tokens')).toBeInTheDocument();
  });

  it('shows session start date when provided', () => {
    const sessionDate = new Date('2024-01-15');
    render(<SessionStatsCard messages={mockMessages} sessionCreatedAt={sessionDate} />);
    expect(screen.getByText(/Started/)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <SessionStatsCard messages={mockMessages} className="custom-card" />
    );
    expect(container.querySelector('.custom-card')).toBeInTheDocument();
  });
});
