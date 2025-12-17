/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChatHeader } from './chat-header';

// Mock stores
const mockUpdateSession = jest.fn();
const mockSelectPreset = jest.fn();

jest.mock('@/stores', () => ({
  useSessionStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      sessions: [
        { id: 'session-1', provider: 'openai', model: 'gpt-4o', mode: 'chat' },
      ],
      activeSessionId: 'session-1',
      updateSession: mockUpdateSession,
    };
    return selector(state);
  },
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      providerSettings: { openai: { enabled: true, apiKey: 'test' } },
    };
    return selector(state);
  },
  usePresetStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      selectPreset: mockSelectPreset,
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/sidebar', () => ({
  SidebarTrigger: () => <button data-testid="sidebar-trigger">Sidebar</button>,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    open ? <div>{children}</div> : null
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

jest.mock('@/types/provider', () => ({
  PROVIDERS: {
    openai: { name: 'OpenAI', defaultModel: 'gpt-4o', models: [] },
  },
  getModelConfig: () => ({ name: 'GPT-4o' }),
}));

jest.mock('./export-dialog', () => ({
  ExportDialog: () => <div data-testid="export-dialog" />,
}));

jest.mock('./image-generation-dialog', () => ({
  ImageGenerationDialog: () => <div data-testid="image-dialog" />,
}));

jest.mock('./branch-selector', () => ({
  BranchSelector: () => <div data-testid="branch-selector" />,
}));

jest.mock('@/components/presets', () => ({
  PresetSelector: () => <div data-testid="preset-selector" />,
  CreatePresetDialog: () => null,
  PresetsManager: () => null,
}));

describe('ChatHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ChatHeader />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('renders sidebar trigger', () => {
    render(<ChatHeader />);
    expect(screen.getByTestId('sidebar-trigger')).toBeInTheDocument();
  });

  it('displays current mode', () => {
    render(<ChatHeader />);
    expect(screen.getByText('Chat')).toBeInTheDocument();
  });

  it('renders preset selector', () => {
    render(<ChatHeader />);
    expect(screen.getByTestId('preset-selector')).toBeInTheDocument();
  });

  it('renders branch selector', () => {
    render(<ChatHeader />);
    expect(screen.getByTestId('branch-selector')).toBeInTheDocument();
  });

  it('renders image generation dialog', () => {
    render(<ChatHeader />);
    expect(screen.getByTestId('image-dialog')).toBeInTheDocument();
  });

  it('renders export dialog', () => {
    render(<ChatHeader />);
    expect(screen.getByTestId('export-dialog')).toBeInTheDocument();
  });

  it('displays model name', () => {
    render(<ChatHeader />);
    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
  });
});
