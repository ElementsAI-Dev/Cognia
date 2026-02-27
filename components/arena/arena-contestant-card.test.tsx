import type React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArenaContestantCard } from './arena-contestant-card';
import type { ArenaContestant } from '@/types/arena';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLSpanElement>) => <span {...props}>{children}</span>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CardHeader: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CardContent: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CardFooter: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/chat/utils', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => (
    <div data-testid="markdown-content">{content}</div>
  ),
}));

jest.mock('lucide-react', () => ({
  Trophy: () => <span data-testid="icon-trophy" />,
  Clock: () => <span data-testid="icon-clock" />,
  Hash: () => <span data-testid="icon-hash" />,
  Coins: () => <span data-testid="icon-coins" />,
  Copy: () => <span data-testid="icon-copy" />,
  Check: () => <span data-testid="icon-check" />,
  Loader2: () => <span data-testid="icon-loader" />,
  Ban: () => <span data-testid="icon-ban" />,
}));

type CardProps = React.ComponentProps<typeof ArenaContestantCard>;

const createContestant = (
  overrides: Partial<ArenaContestant> = {}
): ArenaContestant => ({
  id: 'contestant-a',
  provider: 'openai',
  model: 'gpt-4o',
  displayName: 'GPT-4o',
  response: 'Generated response',
  status: 'completed',
  ...overrides,
});

const createProps = (overrides: Partial<CardProps> = {}): CardProps => ({
  contestant: createContestant(),
  index: 0,
  isWinner: false,
  blindMode: false,
  isRevealed: false,
  onCopy: jest.fn(),
  onCancel: undefined,
  isCopying: false,
  variant: 'dialog',
  ...overrides,
});

describe('ArenaContestantCard', () => {
  it('renders completed contestant with markdown response', () => {
    render(<ArenaContestantCard {...createProps()} />);

    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByTestId('markdown-content')).toHaveTextContent('Generated response');
  });

  it('hides display name in blind mode before reveal', () => {
    render(
      <ArenaContestantCard
        {...createProps({ blindMode: true, isRevealed: false, index: 1 })}
      />
    );

    expect(screen.getByText('model B')).toBeInTheDocument();
    expect(screen.queryByText('GPT-4o')).not.toBeInTheDocument();
  });

  it('shows display name when blind mode is revealed', () => {
    render(
      <ArenaContestantCard
        {...createProps({ blindMode: true, isRevealed: true })}
      />
    );

    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
  });

  it('shows streaming state and calls cancel handler', async () => {
    const onCancel = jest.fn();
    render(
      <ArenaContestantCard
        {...createProps({
          contestant: createContestant({ status: 'streaming' }),
          onCancel,
        })}
      />
    );

    expect(screen.getByText('streaming')).toBeInTheDocument();
    const cancelButton = screen.getByTestId('icon-ban').closest('button');
    expect(cancelButton).toBeInTheDocument();
    await userEvent.click(cancelButton!);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not render cancel action without streaming status', () => {
    render(
      <ArenaContestantCard
        {...createProps({
          contestant: createContestant({ status: 'completed' }),
          onCancel: jest.fn(),
        })}
      />
    );

    expect(screen.queryByTestId('icon-ban')).not.toBeInTheDocument();
  });

  it('calls copy handler when copy button is clicked', async () => {
    const onCopy = jest.fn();
    render(<ArenaContestantCard {...createProps({ onCopy })} />);

    const copyButton = screen.getByTestId('icon-copy').closest('button');
    expect(copyButton).toBeEnabled();
    await userEvent.click(copyButton!);
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it('disables copy button when response is empty', () => {
    render(
      <ArenaContestantCard
        {...createProps({
          contestant: createContestant({ response: '' }),
        })}
      />
    );

    const copyButton = screen.getByTestId('icon-copy').closest('button');
    expect(copyButton).toBeDisabled();
  });

  it('shows copied state icon when isCopying is true', () => {
    render(
      <ArenaContestantCard
        {...createProps({
          contestant: createContestant({ status: 'pending' }),
          isCopying: true,
        })}
      />
    );

    expect(screen.getByTestId('icon-check')).toBeInTheDocument();
    expect(screen.queryByTestId('icon-copy')).not.toBeInTheDocument();
  });

  it('renders error content when contestant fails', () => {
    render(
      <ArenaContestantCard
        {...createProps({
          contestant: createContestant({
            status: 'error',
            response: '',
            error: 'Request failed',
          }),
        })}
      />
    );

    expect(screen.getByText('error')).toBeInTheDocument();
    expect(screen.getByText('Request failed')).toBeInTheDocument();
    expect(screen.queryByTestId('markdown-content')).not.toBeInTheDocument();
  });

  it('renders fallback pending status for cancelled contestant', () => {
    render(
      <ArenaContestantCard
        {...createProps({
          contestant: createContestant({ status: 'cancelled' }),
        })}
      />
    );

    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('shows waiting state without response in dialog variant', () => {
    render(
      <ArenaContestantCard
        {...createProps({
          contestant: createContestant({ status: 'pending', response: '' }),
          variant: 'dialog',
        })}
      />
    );

    expect(screen.getByText('waiting')).toBeInTheDocument();
  });

  it('shows waiting loader in inline variant', () => {
    render(
      <ArenaContestantCard
        {...createProps({
          contestant: createContestant({ status: 'pending', response: '' }),
          variant: 'inline',
        })}
      />
    );

    expect(screen.getByText('waiting')).toBeInTheDocument();
    expect(screen.getByTestId('icon-loader')).toBeInTheDocument();
  });

  it('renders winner badges and performance metrics', () => {
    render(
      <ArenaContestantCard
        {...createProps({
          contestant: createContestant({
            latencyMs: 2450,
            tokenCount: { input: 100, output: 156, total: 256 },
            estimatedCost: 0.01234,
          }),
          isWinner: true,
        })}
      />
    );

    expect(screen.getByText('winner')).toBeInTheDocument();
    expect(screen.getByText('selected')).toBeInTheDocument();
    expect(screen.getByText('2.5s')).toBeInTheDocument();
    expect(screen.getByText('256')).toBeInTheDocument();
    expect(screen.getByText('$0.0123')).toBeInTheDocument();
  });

  it('omits metrics when values are not provided', () => {
    render(
      <ArenaContestantCard
        {...createProps({
          contestant: createContestant({
            latencyMs: undefined,
            tokenCount: undefined,
            estimatedCost: undefined,
          }),
        })}
      />
    );

    expect(screen.queryByText(/\d+\.\ds/)).not.toBeInTheDocument();
    expect(screen.queryByText('$0.0000')).not.toBeInTheDocument();
  });
});
