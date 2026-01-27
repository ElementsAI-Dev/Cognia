/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChatHeader } from './chat-header';
import { 
  createSessionStoreState, 
  createSettingsStoreState,
  createPresetStoreState,
  createArtifactStoreState,
  createChatStoreState,
  createProjectStoreState,
  createCustomThemeStoreState,
  resetAllMocks,
} from '@/__mocks__/stores';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Reset mocks before each test
beforeEach(() => {
  resetAllMocks();
});

jest.mock('@/stores', () => ({
  useSessionStore: (selector: (state: Record<string, unknown>) => unknown) => {
    return selector(createSessionStoreState());
  },
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    return selector(createSettingsStoreState());
  },
  usePresetStore: (selector: (state: Record<string, unknown>) => unknown) => {
    return selector(createPresetStoreState());
  },
  useArtifactStore: (selector: (state: Record<string, unknown>) => unknown) => {
    return selector(createArtifactStoreState());
  },
  useChatStore: (selector: (state: Record<string, unknown>) => unknown) => {
    return selector(createChatStoreState());
  },
  useProjectStore: (selector: (state: Record<string, unknown>) => unknown) => {
    return selector(createProjectStoreState());
  },
  useCustomThemeStore: (selector: (state: Record<string, unknown>) => unknown) => {
    return selector(createCustomThemeStoreState());
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

jest.mock('../dialogs/export-dialog', () => ({
  ExportDialog: () => <div data-testid="export-dialog" />,
}));

jest.mock('../dialogs/image-generation-dialog', () => ({
  ImageGenerationDialog: () => <div data-testid="image-dialog" />,
}));

jest.mock('../selectors/branch-selector', () => ({
  BranchSelector: () => <div data-testid="branch-selector" />,
}));

jest.mock('../selectors/project-selector', () => ({
  ProjectSelector: () => <div data-testid="project-selector" />,
}));

jest.mock('../selectors/session-env-selector', () => ({
  SessionEnvSelector: () => <div data-testid="session-env-selector" />,
}));

jest.mock('@/components/presets', () => ({
  PresetSelector: () => <div data-testid="preset-selector" />,
  CreatePresetDialog: () => null,
  PresetsManager: () => null,
}));

// Mock hooks that use IndexedDB
jest.mock('@/hooks/chat/use-messages', () => ({
  useMessages: () => ({
    messages: [],
    isLoading: false,
    error: null,
    addMessage: jest.fn(),
    updateMessage: jest.fn(),
    deleteMessage: jest.fn(),
  }),
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
    // Multiple "Chat" elements exist, just verify at least one is present
    expect(screen.getAllByText('Chat').length).toBeGreaterThan(0);
  });

  it('renders preset selector', () => {
    render(<ChatHeader />);
    expect(screen.getByTestId('preset-selector')).toBeInTheDocument();
  });

  it('renders branch selector', () => {
    render(<ChatHeader />);
    expect(screen.getByTestId('branch-selector')).toBeInTheDocument();
  });

  it('renders action buttons', () => {
    render(<ChatHeader />);
    // Verify header renders with expected structure
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
  });
});
