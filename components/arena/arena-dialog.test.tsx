import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArenaDialog } from './arena-dialog';

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

const availableModels: ModelOption[] = [
  { provider: 'openai', model: 'gpt-4o-mini', displayName: 'GPT-4o mini' },
  { provider: 'anthropic', model: 'claude-3-5-sonnet', displayName: 'Claude 3.5 Sonnet' },
  { provider: 'google', model: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro' },
];

jest.mock('@/hooks/arena', () => ({
  useArena: () => ({
    isExecuting: false,
    error: null,
    startBattle: mockStartBattle,
    getAvailableModels: () => availableModels,
  }),
}));

jest.mock('@/stores/arena', () => ({
  useArenaStore: (selector: (state: { settings: Record<string, unknown> }) => unknown) => {
    const state = {
      settings: {},
    };
    return selector(state);
  },
}));

jest.mock('@/types/arena', () => ({
  ARENA_MODEL_PRESETS: [
    {
      id: 'top-tier',
      name: 'Top Tier',
      description: 'Top models',
      models: [
        { provider: 'openai', model: 'gpt-4o-mini' },
        { provider: 'anthropic', model: 'claude-3-5-sonnet' },
      ],
    },
  ],
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: () => void }) => (
    <input
      type="checkbox"
      aria-label="checkbox"
      checked={Boolean(checked)}
      onChange={() => onCheckedChange?.()}
    />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
  }) => <textarea value={value} onChange={onChange} placeholder={placeholder} />,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({
    checked,
    onCheckedChange,
    id,
  }: {
    checked?: boolean;
    onCheckedChange?: (v: boolean) => void;
    id?: string;
  }) => (
    <input
      id={id}
      type="checkbox"
      aria-label={id || 'switch'}
      checked={Boolean(checked)}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: ({
    value,
    onValueChange,
  }: {
    value: number[];
    onValueChange?: (v: number[]) => void;
  }) => (
    <input
      type="range"
      aria-label="slider"
      value={value?.[0] ?? 0}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
    />
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  SelectValue: () => <span />,
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('lucide-react', () => ({
  Swords: () => <span data-testid="icon-swords" />,
  Play: () => <span data-testid="icon-play" />,
  Loader2: () => <span data-testid="icon-loader" />,
  Sparkles: () => <span data-testid="icon-sparkles" />,
  Zap: () => <span data-testid="icon-zap" />,
  Brain: () => <span data-testid="icon-brain" />,
  DollarSign: () => <span data-testid="icon-dollar" />,
  Eye: () => <span data-testid="icon-eye" />,
  EyeOff: () => <span data-testid="icon-eyeoff" />,
  ChevronDown: () => <span data-testid="icon-down" />,
  ChevronUp: () => <span data-testid="icon-up" />,
  Settings2: () => <span data-testid="icon-settings" />,
}));

describe('ArenaDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    render(<ArenaDialog open onOpenChange={jest.fn()} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('title')).toBeInTheDocument();
    expect(screen.getByText('description')).toBeInTheDocument();
  });

  it('start button is disabled until prompt and two models are selected', async () => {
    render(<ArenaDialog open onOpenChange={jest.fn()} />);

    const startButton = screen.getByRole('button', { name: /startBattle/i });
    expect(startButton).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText('promptPlaceholder'), ' Hello ');
    expect(startButton).toBeDisabled();

    fireEvent.click(screen.getByText('GPT-4o mini'));
    expect(startButton).toBeDisabled();

    fireEvent.click(screen.getByText('Claude 3.5 Sonnet'));
    expect(startButton).toBeEnabled();
  });

  it('calls startBattle with trimmed prompt and closes dialog', async () => {
    const onOpenChange = jest.fn();

    render(
      <ArenaDialog open onOpenChange={onOpenChange} sessionId="session-1" systemPrompt="sys" />
    );

    await userEvent.type(screen.getByPlaceholderText('promptPlaceholder'), '  test prompt  ');

    fireEvent.click(screen.getByText('GPT-4o mini'));
    fireEvent.click(screen.getByText('Claude 3.5 Sonnet'));

    await userEvent.click(screen.getByRole('button', { name: /startBattle/i }));

    expect(mockStartBattle).toHaveBeenCalledWith(
      'test prompt',
      expect.arrayContaining([
        expect.objectContaining({ provider: 'openai', model: 'gpt-4o-mini' }),
        expect.objectContaining({ provider: 'anthropic', model: 'claude-3-5-sonnet' }),
      ]),
      expect.objectContaining({
        sessionId: 'session-1',
        systemPrompt: 'sys',
        blindMode: false,
        conversationMode: 'single',
      })
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('applies preset and enables start', async () => {
    render(<ArenaDialog open onOpenChange={jest.fn()} />);

    await userEvent.type(screen.getByPlaceholderText('promptPlaceholder'), 'prompt');

    fireEvent.click(screen.getByText('Top Tier'));

    const startButton = screen.getByRole('button', { name: /startBattle/i });
    expect(startButton).toBeEnabled();

    await userEvent.click(startButton);

    expect(mockStartBattle).toHaveBeenCalled();
  });
});
