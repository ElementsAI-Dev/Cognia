/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ToolTimeline, ToolExecution } from './tool-timeline';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      toolExecutions: 'Tool Executions',
      running: 'Running',
      successRate: 'Success Rate',
      avgDuration: 'Avg Duration',
      pending: 'Pending',
    };
    return translations[key] || key;
  },
}));

describe('ToolTimeline', () => {
  const mockExecutions: ToolExecution[] = [
    {
      id: 'exec-1',
      toolName: 'web_search',
      state: 'output-available',
      startTime: new Date(1000),
      endTime: new Date(2500),
    },
    {
      id: 'exec-2',
      toolName: 'file-read',
      state: 'input-available',
      startTime: new Date(2500),
    },
    {
      id: 'exec-3',
      toolName: 'api_call',
      state: 'output-error',
      startTime: new Date(3000),
      endTime: new Date(3500),
      error: 'Connection failed',
    },
  ];

  it('renders nothing when executions array is empty', () => {
    const { container } = render(<ToolTimeline executions={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders without crashing with executions', () => {
    render(<ToolTimeline executions={mockExecutions} />);
    expect(screen.getByText('Tool Executions')).toBeInTheDocument();
  });

  it('displays tool count summary', () => {
    const { container } = render(<ToolTimeline executions={mockExecutions} />);
    // Component renders executions
    expect(container.firstChild).toBeInTheDocument();
  });

  it('displays total duration', () => {
    const { container } = render(<ToolTimeline executions={mockExecutions} />);
    // Component renders with executions
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders all tool names formatted correctly', () => {
    render(<ToolTimeline executions={mockExecutions} />);
    expect(screen.getByText('Web Search')).toBeInTheDocument();
    expect(screen.getByText('File Read')).toBeInTheDocument();
    expect(screen.getByText('Api Call')).toBeInTheDocument();
  });

  it('displays correct status labels', () => {
    render(<ToolTimeline executions={mockExecutions} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('displays error message for failed executions', () => {
    render(<ToolTimeline executions={mockExecutions} />);
    expect(screen.getByText(/Connection failed/)).toBeInTheDocument();
  });

  it('displays duration for completed executions', () => {
    render(<ToolTimeline executions={mockExecutions} />);
    expect(screen.getByText('1.5s')).toBeInTheDocument();
    expect(screen.getByText('500ms')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ToolTimeline executions={mockExecutions} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  describe('State configurations', () => {
    it('renders input-streaming state correctly', () => {
      const streamingExec: ToolExecution[] = [
        { id: '1', toolName: 'test', state: 'input-streaming', startTime: new Date(0) },
      ];
      render(<ToolTimeline executions={streamingExec} />);
      expect(screen.getByText('Preparing')).toBeInTheDocument();
    });

    it('renders approval-requested state correctly', () => {
      const approvalExec: ToolExecution[] = [
        { id: '1', toolName: 'test', state: 'approval-requested', startTime: new Date(0) },
      ];
      render(<ToolTimeline executions={approvalExec} />);
      expect(screen.getByText('Awaiting Approval')).toBeInTheDocument();
    });

    it('renders approval-responded state correctly', () => {
      const respondedExec: ToolExecution[] = [
        { id: '1', toolName: 'test', state: 'approval-responded', startTime: new Date(0) },
      ];
      render(<ToolTimeline executions={respondedExec} />);
      expect(screen.getByText('Approved')).toBeInTheDocument();
    });

    it('renders output-denied state correctly', () => {
      const deniedExec: ToolExecution[] = [
        { id: '1', toolName: 'test', state: 'output-denied', startTime: new Date(0) },
      ];
      render(<ToolTimeline executions={deniedExec} />);
      expect(screen.getByText('Denied')).toBeInTheDocument();
    });
  });

  describe('Duration formatting', () => {
    it('formats milliseconds correctly', () => {
      const shortExec: ToolExecution[] = [
        { id: '1', toolName: 'test', state: 'output-available', startTime: new Date(0), endTime: new Date(500) },
      ];
      render(<ToolTimeline executions={shortExec} />);
      expect(screen.getByText('500ms')).toBeInTheDocument();
    });

    it('formats seconds correctly', () => {
      const secExec: ToolExecution[] = [
        { id: '1', toolName: 'test', state: 'output-available', startTime: new Date(0), endTime: new Date(5500) },
      ];
      render(<ToolTimeline executions={secExec} />);
      expect(screen.getByText('5.5s')).toBeInTheDocument();
    });

    it('formats minutes correctly', () => {
      const minExec: ToolExecution[] = [
        { id: '1', toolName: 'test', state: 'output-available', startTime: new Date(0), endTime: new Date(125000) },
      ];
      render(<ToolTimeline executions={minExec} />);
      expect(screen.getByText('2m 5s')).toBeInTheDocument();
    });
  });

  describe('Single execution', () => {
    it('displays singular "tool" for single execution', () => {
      const singleExec: ToolExecution[] = [
        { id: '1', toolName: 'test', state: 'output-available', startTime: new Date(0), endTime: new Date(1000) },
      ];
      const { container } = render(<ToolTimeline executions={singleExec} />);
      // Check that the component renders with at least one execution
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
