'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubAgentNode } from './sub-agent-node';
import type { SubAgent } from '@/types/agent/sub-agent';

const mockSubAgent = {
  id: 'sub-1',
  name: 'Test Sub-Agent',
  task: 'Do something',
  description: 'A test task',
  status: 'pending',
  progress: 0,
  logs: [],
} as unknown as SubAgent;

describe('SubAgentNode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders sub-agent name', () => {
    render(<SubAgentNode subAgent={mockSubAgent} />);
    expect(screen.getByText('Test Sub-Agent')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    render(<SubAgentNode subAgent={mockSubAgent} />);
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('shows execute button for pending status', () => {
    const onExecute = jest.fn();
    render(<SubAgentNode subAgent={mockSubAgent} onExecute={onExecute} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('calls onExecute when execute clicked', () => {
    const onExecute = jest.fn();
    render(<SubAgentNode subAgent={mockSubAgent} onExecute={onExecute} showActions />);
    const executeBtn = screen.getAllByRole('button')[0];
    fireEvent.click(executeBtn);
    expect(onExecute).toHaveBeenCalledWith(mockSubAgent);
  });

  it('shows progress for running status', () => {
    const runningAgent = {
      ...mockSubAgent,
      status: 'running',
      progress: 50,
    } as unknown as SubAgent;
    render(<SubAgentNode subAgent={runningAgent} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('expands to show task on toggle', () => {
    render(<SubAgentNode subAgent={mockSubAgent} />);
    const expandBtn = screen.getAllByRole('button').pop();
    if (expandBtn) fireEvent.click(expandBtn);
    expect(screen.getByText(/Do something/)).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<SubAgentNode subAgent={mockSubAgent} onClick={onClick} />);
    fireEvent.click(screen.getByText('Test Sub-Agent'));
    expect(onClick).toHaveBeenCalledWith(mockSubAgent);
  });

  it('shows connector when not last', () => {
    const { container } = render(
      <SubAgentNode subAgent={mockSubAgent} showConnector isLast={false} />
    );
    expect(container.querySelector('.bg-border')).toBeInTheDocument();
  });

  it('hides connector when last', () => {
    const { container } = render(
      <SubAgentNode subAgent={mockSubAgent} showConnector isLast={true} />
    );
    expect(container.querySelector('.absolute.left-4')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<SubAgentNode subAgent={mockSubAgent} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('SubAgentNode completed', () => {
  it('shows duration for completed agent', () => {
    const now = new Date();
    const completedAgent = {
      ...mockSubAgent,
      status: 'completed',
      startedAt: new Date(now.getTime() - 5000),
      completedAt: now,
    } as unknown as SubAgent;
    render(<SubAgentNode subAgent={completedAgent} />);
    expect(screen.getByText(/5\.0s/)).toBeInTheDocument();
  });
});
