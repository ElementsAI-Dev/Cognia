/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SessionReplay } from './session-replay';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/lib/utils', () => ({
  cn: (...args: (string | boolean | undefined | null)[]) => args.filter(Boolean).join(' '),
}));

jest.mock('@/lib/agent-trace/cost-estimator', () => ({
  formatCost: (cost: number) => `$${cost.toFixed(4)}`,
}));

jest.mock('@/lib/db', () => ({}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...rest}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange }: { value: number[]; onValueChange: (v: number[]) => void }) => (
    <input
      type="range"
      data-testid="slider"
      value={value[0]}
      onChange={(e) => onValueChange([Number(e.target.value)])}
    />
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('lucide-react', () => {
  const icon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} />;
  return {
    Play: icon, Pause: icon, SkipBack: icon, SkipForward: icon,
    Rewind: icon, FastForward: icon, Clock: icon, Zap: icon,
    Coins: icon, Wrench: icon, MessageSquare: icon, Brain: icon,
    AlertCircle: icon, CheckCircle2: icon,
  };
});

describe('SessionReplay', () => {
  const mockTraces = [
    {
      id: '1',
      sessionId: 'sess-1',
      timestamp: new Date(Date.now() - 5000),
      record: JSON.stringify({
        eventType: 'step_start',
        stepId: 'step-1',
        metadata: {},
      }),
      createdAt: new Date(),
    },
    {
      id: '2',
      sessionId: 'sess-1',
      timestamp: new Date(),
      record: JSON.stringify({
        eventType: 'step_finish',
        stepId: 'step-1',
        metadata: { success: true, duration: 2500 },
      }),
      createdAt: new Date(),
    },
  ];

  it('renders with empty traces', () => {
    render(<SessionReplay traces={[]} />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('renders with traces', () => {
    render(<SessionReplay traces={mockTraces} />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<SessionReplay traces={[]} className="custom" />);
    expect(screen.getByTestId('card')).toHaveClass('custom');
  });
});
