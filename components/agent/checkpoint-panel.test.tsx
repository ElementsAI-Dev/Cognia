/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CheckpointPanel } from './checkpoint-panel';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/lib/utils', () => ({
  cn: (...args: (string | boolean | undefined | null)[]) => args.filter(Boolean).join(' '),
}));

const mockCheckpoints = [
  {
    id: 'cp-1',
    sessionId: 'sess-1',
    stepIndex: 0,
    timestamp: Date.now() - 60000,
    label: 'Before edit',
    changes: { filesModified: ['src/app.tsx'], linesAdded: 10, linesRemoved: 3 },
    metadata: {},
  },
  {
    id: 'cp-2',
    sessionId: 'sess-1',
    stepIndex: 1,
    timestamp: Date.now(),
    label: 'After refactor',
    changes: { filesModified: ['src/utils.ts', 'src/app.tsx'], linesAdded: 25, linesRemoved: 15 },
    metadata: {},
  },
];

const mockStore = {
  checkpoints: { 'sess-1': mockCheckpoints },
  getCheckpoints: jest.fn(() => mockCheckpoints),
  restoreCheckpoint: jest.fn(),
  deleteCheckpoint: jest.fn(),
};

jest.mock('@/stores/agent-trace', () => ({
  useAgentTraceStore: (selector: (s: typeof mockStore) => unknown) => selector(mockStore),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} className={className}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('lucide-react', () => {
  const icon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} />;
  return {
    History: icon, Undo2: icon, Trash2: icon, ChevronDown: icon,
    ChevronRight: icon, FileCode: icon, Plus: icon, Minus: icon, RefreshCw: icon,
  };
});

describe('CheckpointPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders checkpoint panel with session id', () => {
    render(<CheckpointPanel sessionId="sess-1" />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('shows empty state when no checkpoints', () => {
    mockStore.getCheckpoints.mockReturnValue([]);
    render(<CheckpointPanel sessionId="no-checkpoints" />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<CheckpointPanel sessionId="sess-1" className="custom-panel" />);
    expect(screen.getByTestId('card')).toHaveClass('custom-panel');
  });
});
