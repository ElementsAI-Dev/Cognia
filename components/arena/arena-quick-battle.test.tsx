import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArenaQuickBattle } from './arena-quick-battle';
import type { ArenaModelRating } from '@/types/arena';

type ProviderName = 'openai' | 'anthropic' | 'google';

type ModelOption = {
  provider: ProviderName;
  model: string;
  displayName: string;
};

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockStartBattle = jest.fn().mockResolvedValue(undefined);

let mockAvailableModels: ModelOption[] = [];

jest.mock('@/hooks/arena', () => ({
  useArena: () => ({
    isExecuting: false,
    error: null,
    startBattle: mockStartBattle,
    getAvailableModels: () => mockAvailableModels,
  }),
}));

let mockModelRatings: ArenaModelRating[] = [];
let mockRecommended: { modelA: string; modelB: string; reason: string } | null = null;

jest.mock('@/stores/arena', () => ({
  useArenaStore: (selector: (state: { modelRatings: ArenaModelRating[]; getRecommendedMatchup: () => typeof mockRecommended }) => unknown) => {
    const state = {
      modelRatings: mockModelRatings,
      getRecommendedMatchup: () => mockRecommended,
    };
    return selector(state);
  },
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, id }: { checked?: boolean; onCheckedChange?: (v: boolean) => void; id?: string }) => (
    <input
      id={id}
      type="checkbox"
      aria-label={id || 'switch'}
      checked={Boolean(checked)}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

jest.mock('lucide-react', () => ({
  Zap: () => <span data-testid="icon-zap" />,
  Shuffle: () => <span data-testid="icon-shuffle" />,
  Settings2: () => <span data-testid="icon-settings" />,
  Loader2: () => <span data-testid="icon-loader" />,
}));

function makeRating(modelId: string, rating: number): ArenaModelRating {
  const [provider, model] = modelId.split(':') as [ProviderName, string];
  return {
    modelId,
    provider,
    model,
    rating,
    categoryRatings: {},
    totalBattles: 0,
    wins: 0,
    losses: 0,
    ties: 0,
    updatedAt: new Date(),
  };
}

describe('ArenaQuickBattle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAvailableModels = [];
    mockModelRatings = [];
    mockRecommended = null;
  });

  it('renders null when fewer than two models are available', () => {
    mockAvailableModels = [{ provider: 'openai', model: 'gpt-4o-mini', displayName: 'GPT-4o mini' }];

    const { container } = render(<ArenaQuickBattle prompt="hello" />);
    expect(container.firstChild).toBeNull();
  });

  it('uses recommended matchup when provided', async () => {
    mockAvailableModels = [
      { provider: 'openai', model: 'gpt-4o-mini', displayName: 'GPT-4o mini' },
      { provider: 'anthropic', model: 'claude-3-5-sonnet', displayName: 'Claude 3.5 Sonnet' },
    ];

    mockRecommended = {
      modelA: 'openai:gpt-4o-mini',
      modelB: 'anthropic:claude-3-5-sonnet',
      reason: 'test',
    };

    render(<ArenaQuickBattle prompt="Prompt" />);

    await userEvent.click(screen.getByRole('button', { name: 'quickBattle.title' }));

    expect(mockStartBattle).toHaveBeenCalledWith(
      'Prompt',
      [
        expect.objectContaining({ provider: 'openai', model: 'gpt-4o-mini' }),
        expect.objectContaining({ provider: 'anthropic', model: 'claude-3-5-sonnet' }),
      ],
      expect.objectContaining({
        blindMode: true,
        conversationMode: 'single',
        maxTurns: 5,
      })
    );
  });

  it('falls back to top rated models from different providers', async () => {
    mockAvailableModels = [
      { provider: 'openai', model: 'gpt-4o-mini', displayName: 'GPT-4o mini' },
      { provider: 'openai', model: 'gpt-4o', displayName: 'GPT-4o' },
      { provider: 'google', model: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro' },
    ];

    mockModelRatings = [
      makeRating('openai:gpt-4o', 1900),
      makeRating('google:gemini-1.5-pro', 1800),
      makeRating('openai:gpt-4o-mini', 1500),
    ];

    render(<ArenaQuickBattle prompt="Prompt" />);

    await userEvent.click(screen.getByRole('button', { name: 'quickBattle.title' }));

    expect(mockStartBattle).toHaveBeenCalledWith(
      'Prompt',
      [
        expect.objectContaining({ provider: 'openai', model: 'gpt-4o' }),
        expect.objectContaining({ provider: 'google', model: 'gemini-1.5-pro' }),
      ],
      expect.any(Object)
    );
  });

  it('supports compact mode button rendering', async () => {
    mockAvailableModels = [
      { provider: 'openai', model: 'gpt-4o-mini', displayName: 'GPT-4o mini' },
      { provider: 'anthropic', model: 'claude-3-5-sonnet', displayName: 'Claude 3.5 Sonnet' },
    ];

    render(<ArenaQuickBattle prompt="Prompt" compact />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);

    await userEvent.click(buttons[0]);
    expect(mockStartBattle).toHaveBeenCalled();
  });

  it('does not call startBattle when prompt is empty', async () => {
    mockAvailableModels = [
      { provider: 'openai', model: 'gpt-4o-mini', displayName: 'GPT-4o mini' },
      { provider: 'anthropic', model: 'claude-3-5-sonnet', displayName: 'Claude 3.5 Sonnet' },
    ];

    render(<ArenaQuickBattle prompt="   " />);

    const button = screen.getByRole('button', { name: 'quickBattle.title' });
    expect(button).toBeDisabled();

    await userEvent.click(button);
    expect(mockStartBattle).not.toHaveBeenCalled();
  });
});
