import { render, screen, fireEvent } from '@testing-library/react';
import { ArenaHeatmap } from './arena-heatmap';
import type { ArenaHeadToHead, ArenaModelRating } from '@/types/arena';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const makeRating = (overrides: Partial<ArenaModelRating>): ArenaModelRating => ({
  modelId: 'openai:gpt-4o-mini',
  provider: 'openai',
  model: 'gpt-4o-mini',
  rating: 1800,
  ci95Lower: 1750,
  ci95Upper: 1850,
  wins: 10,
  losses: 5,
  totalBattles: 15,
  winRate: 0.667,
  stabilityScore: 0.7,
  categoryRatings: {},
  ties: 0,
  updatedAt: new Date(),
  ...overrides,
});

let mockModelRatings: ArenaModelRating[] = [];
let mockHeadToHead: ArenaHeadToHead[] = [];

jest.mock('@/stores/arena', () => ({
  useArenaStore: (
    selector: (state: {
      modelRatings: ArenaModelRating[];
      getHeadToHead: () => ArenaHeadToHead[];
    }) => unknown
  ) => {
    const state = {
      modelRatings: [...mockModelRatings],
      getHeadToHead: () => mockHeadToHead,
    };
    return selector(state);
  },
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('lucide-react', () => ({
  Grid3X3: () => <span data-testid="icon-grid" />,
  Info: () => <span data-testid="icon-info" />,
  ZoomIn: () => <span data-testid="icon-zoomin" />,
  ZoomOut: () => <span data-testid="icon-zoomout" />,
}));

describe('ArenaHeatmap', () => {
  beforeEach(() => {
    mockModelRatings = [];
    mockHeadToHead = [];
  });

  it('renders empty state when fewer than two models exist', () => {
    mockModelRatings = [
      makeRating({ modelId: 'openai:gpt-4o-mini', provider: 'openai', model: 'gpt-4o-mini' }),
    ];

    render(<ArenaHeatmap />);

    expect(screen.getByText('heatmap.noData')).toBeInTheDocument();
    expect(screen.getByText('heatmap.needMoreModels')).toBeInTheDocument();
  });

  it('renders matrix and computes win rates from head-to-head data', () => {
    mockModelRatings = [
      makeRating({
        modelId: 'openai:gpt-4o-mini',
        provider: 'openai',
        model: 'gpt-4o-mini',
        rating: 1800,
      }),
      makeRating({
        modelId: 'anthropic:claude-3-5-sonnet',
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
        rating: 1750,
      }),
    ];

    mockHeadToHead = [
      {
        modelA: 'openai:gpt-4o-mini',
        modelB: 'anthropic:claude-3-5-sonnet',
        winsA: 7,
        winsB: 3,
        ties: 0,
        winRateA: 0.7,
        total: 10,
      },
    ];

    render(<ArenaHeatmap />);

    expect(screen.getByText('heatmap.title')).toBeInTheDocument();

    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();

    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(2);

    expect(screen.getByText('modelsCount')).toBeInTheDocument();
    expect(screen.getByText('totalBattles')).toBeInTheDocument();
  });

  it('changes cell size via zoom buttons', () => {
    mockModelRatings = [
      makeRating({
        modelId: 'openai:gpt-4o-mini',
        provider: 'openai',
        model: 'gpt-4o-mini',
        rating: 1800,
      }),
      makeRating({
        modelId: 'anthropic:claude-3-5-sonnet',
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
        rating: 1750,
      }),
    ];

    render(<ArenaHeatmap />);

    const zoomOutButton = screen
      .getAllByRole('button')
      .find((b) => b.querySelector('[data-testid="icon-zoomout"]'));
    const zoomInButton = screen
      .getAllByRole('button')
      .find((b) => b.querySelector('[data-testid="icon-zoomin"]'));

    expect(zoomOutButton).toBeDefined();
    expect(zoomInButton).toBeDefined();

    if (zoomInButton) fireEvent.click(zoomInButton);
    if (zoomOutButton) fireEvent.click(zoomOutButton);

    expect(screen.getByText('heatmap.title')).toBeInTheDocument();
  });
});
