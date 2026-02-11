/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BlameSummary } from './blame-summary';
import type { FileBlameStats } from '@/lib/agent-trace/blame-provider';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/lib/utils', () => ({
  cn: (...args: (string | boolean | undefined | null)[]) => args.filter(Boolean).join(' '),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => <div data-testid="progress" data-value={value} />,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('lucide-react', () => ({
  Bot: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} data-testid="icon-bot" />,
  User: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} data-testid="icon-user" />,
  HelpCircle: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} data-testid="icon-help" />,
  Blend: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} data-testid="icon-blend" />,
}));

const baseStats: FileBlameStats = {
  filePath: 'src/app.tsx',
  totalLines: 100,
  aiLines: 60,
  humanLines: 30,
  mixedLines: 5,
  unknownLines: 5,
  aiPercentage: 60,
  humanPercentage: 30,
  models: { 'openai/gpt-4': 40, 'anthropic/claude-3': 20 },
  lastAnalyzed: new Date(),
};

describe('BlameSummary', () => {
  it('renders compact mode with AI and human percentages', () => {
    render(<BlameSummary stats={baseStats} compact />);
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('renders full mode with Code Attribution header', () => {
    render(<BlameSummary stats={baseStats} />);
    expect(screen.getByText('Code Attribution')).toBeInTheDocument();
    expect(screen.getByText('100 lines')).toBeInTheDocument();
  });

  it('shows model breakdown', () => {
    render(<BlameSummary stats={baseStats} />);
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
    expect(screen.getByText('claude-3')).toBeInTheDocument();
    expect(screen.getByText('40 lines')).toBeInTheDocument();
    expect(screen.getByText('20 lines')).toBeInTheDocument();
  });

  it('renders null when no lines', () => {
    const emptyStats: FileBlameStats = {
      ...baseStats,
      totalLines: 0,
      aiLines: 0,
      humanLines: 0,
      mixedLines: 0,
      unknownLines: 0,
      aiPercentage: 0,
      humanPercentage: 0,
      models: {},
    };
    render(<BlameSummary stats={emptyStats} />);
    expect(screen.getByText('Code Attribution')).toBeInTheDocument();
    expect(screen.getByText('0 lines')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<BlameSummary stats={baseStats} className="custom-class" />);
    expect(screen.getByTestId('card')).toHaveClass('custom-class');
  });
});
