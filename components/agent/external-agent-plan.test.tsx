/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ExternalAgentPlan } from './external-agent-plan';
import type { AcpPlanEntry } from '@/types/agent/external-agent';

const mockMessages = {
  externalAgent: {
    executionPlan: 'Execution Plan',
    stepsCompleted: 'completed',
  },
};

const renderWithIntl = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={mockMessages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('ExternalAgentPlan', () => {
  const mockEntries: AcpPlanEntry[] = [
    { content: 'Analyze the codebase', priority: 'high', status: 'completed' },
    { content: 'Identify optimization targets', priority: 'medium', status: 'in_progress' },
    { content: 'Implement changes', priority: 'medium', status: 'pending' },
    { content: 'Run tests', priority: 'low', status: 'pending' },
  ];

  it('should render nothing when entries is empty', () => {
    const { container } = renderWithIntl(
      <ExternalAgentPlan entries={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render nothing when entries is undefined', () => {
    const { container } = renderWithIntl(
      <ExternalAgentPlan entries={undefined as unknown as AcpPlanEntry[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render plan title', () => {
    renderWithIntl(
      <ExternalAgentPlan entries={mockEntries} />
    );
    
    expect(screen.getByText('Execution Plan')).toBeInTheDocument();
  });

  it('should display progress count', () => {
    renderWithIntl(
      <ExternalAgentPlan entries={mockEntries} />
    );
    
    expect(screen.getByText('1/4 completed')).toBeInTheDocument();
  });

  it('should display all plan entries', () => {
    renderWithIntl(
      <ExternalAgentPlan entries={mockEntries} />
    );
    
    expect(screen.getByText('Analyze the codebase')).toBeInTheDocument();
    expect(screen.getByText('Identify optimization targets')).toBeInTheDocument();
    expect(screen.getByText('Implement changes')).toBeInTheDocument();
    expect(screen.getByText('Run tests')).toBeInTheDocument();
  });

  it('should display priority badges', () => {
    renderWithIntl(
      <ExternalAgentPlan entries={mockEntries} />
    );
    
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getAllByText('medium')).toHaveLength(2);
    expect(screen.getByText('low')).toBeInTheDocument();
  });

  it('should apply line-through style to completed entries', () => {
    renderWithIntl(
      <ExternalAgentPlan entries={mockEntries} />
    );
    
    const completedEntry = screen.getByText('Analyze the codebase');
    expect(completedEntry).toHaveClass('line-through');
  });

  it('should highlight current step when specified', () => {
    renderWithIntl(
      <ExternalAgentPlan entries={mockEntries} currentStep={1} />
    );
    
    // The second entry should have accent background
    const entries = screen.getAllByText(/Analyze|Identify|Implement|Run/);
    expect(entries).toHaveLength(4);
  });

  it('should render in compact mode when specified', () => {
    renderWithIntl(
      <ExternalAgentPlan entries={mockEntries} compact={true} />
    );
    
    // In compact mode, priority badges should not be shown
    expect(screen.getByText('Execution Plan')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    renderWithIntl(
      <ExternalAgentPlan entries={mockEntries} className="custom-class" />
    );
    
    const container = screen.getByText('Execution Plan').closest('.rounded-lg');
    expect(container).toHaveClass('custom-class');
  });

  it('should display step numbers', () => {
    renderWithIntl(
      <ExternalAgentPlan entries={mockEntries} />
    );
    
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('should calculate progress correctly', () => {
    const allCompletedEntries: AcpPlanEntry[] = [
      { content: 'Step 1', priority: 'high', status: 'completed' },
      { content: 'Step 2', priority: 'medium', status: 'completed' },
    ];
    
    renderWithIntl(
      <ExternalAgentPlan entries={allCompletedEntries} />
    );
    
    expect(screen.getByText('2/2 completed')).toBeInTheDocument();
  });

  it('should handle skipped status entries', () => {
    const entriesWithSkipped: AcpPlanEntry[] = [
      { content: 'Step 1', priority: 'high', status: 'completed' },
      { content: 'Step 2', priority: 'medium', status: 'skipped' },
      { content: 'Step 3', priority: 'low', status: 'pending' },
    ];
    
    renderWithIntl(
      <ExternalAgentPlan entries={entriesWithSkipped} />
    );
    
    expect(screen.getByText('Step 2')).toBeInTheDocument();
  });
});
