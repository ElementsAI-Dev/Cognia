import { render, fireEvent, act } from '@testing-library/react';
import { CommandPalette } from './command-palette';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      placeholder: 'Type a command or search...',
      noResults: 'No results found.',
      quickActions: 'Quick Actions',
      newChat: 'New Chat',
      openDesigner: 'Open Designer',
      viewProjects: 'View Projects',
      settings: 'Settings',
      toggleSidebar: 'Toggle Sidebar',
      switchMode: 'Switch Mode',
      chatMode: 'Chat Mode',
      agentMode: 'Agent Mode',
      researchMode: 'Research Mode',
      panels: 'Panels',
      toggleCanvas: 'Toggle Canvas',
      toggleArtifacts: 'Toggle Artifacts',
      recentConversations: 'Recent Conversations',
      active: 'Active',
      theme: 'Theme',
      lightTheme: 'Light',
      darkTheme: 'Dark',
      systemTheme: 'System',
      tools: 'Tools',
      exportConversation: 'Export Conversation',
      importData: 'Import Data',
      apiKeys: 'API Keys',
      mcpServers: 'MCP Servers',
      currentChat: 'Current Chat',
      copyChat: 'Copy Chat',
      clearChat: 'Clear Chat',
      chatCleared: 'Chat cleared',
      chatCopied: 'Chat copied',
      help: 'Help',
      keyboardShortcuts: 'Keyboard Shortcuts',
    };
    return translations[key] || key;
  },
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock stores
const mockCreateSession = jest.fn();
const mockSetActiveSession = jest.fn();
const mockUpdateSession = jest.fn();
const mockSetTheme = jest.fn();
const mockOpenModal = jest.fn();
const mockToggleSidebar = jest.fn();
const mockOpenPanel = jest.fn();
const mockClosePanel = jest.fn();
const mockClearMessages = jest.fn();

const mockSessions = [
  { id: '1', title: 'Test Session 1', updatedAt: new Date() },
  { id: '2', title: 'Test Session 2', updatedAt: new Date(Date.now() - 1000) },
];

jest.mock('@/stores', () => ({
  useSessionStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      sessions: mockSessions,
      activeSessionId: '1',
      createSession: mockCreateSession,
      setActiveSession: mockSetActiveSession,
      updateSession: mockUpdateSession,
    };
    return selector(state);
  },
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      theme: 'system',
      setTheme: mockSetTheme,
    };
    return selector(state);
  },
  useUIStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      openModal: mockOpenModal,
      toggleSidebar: mockToggleSidebar,
    };
    return selector(state);
  },
  useArtifactStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      openPanel: mockOpenPanel,
      closePanel: mockClosePanel,
      panelOpen: false,
    };
    return selector(state);
  },
  useChatStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      messages: [{ role: 'user', content: 'Hello' }],
      clearMessages: mockClearMessages,
    };
    return selector(state);
  },
}));

// Mock sonner toast
jest.mock('@/components/ui/sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('CommandPalette', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', async () => {
    await act(async () => {
      render(<CommandPalette />);
    });
  });

  it('adds keyboard event listener on mount', async () => {
    const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
    await act(async () => {
      render(<CommandPalette />);
    });
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    addEventListenerSpy.mockRestore();
  });

  it('removes keyboard event listener on unmount', async () => {
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
    let unmount: () => void;
    await act(async () => {
      const result = render(<CommandPalette />);
      unmount = result.unmount;
    });
    await act(async () => {
      unmount();
    });
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });

  it('does not respond to plain k key press', async () => {
    const mockOnOpenChange = jest.fn();
    await act(async () => {
      render(<CommandPalette onOpenChange={mockOnOpenChange} />);
    });
    await act(async () => {
      fireEvent.keyDown(document, { key: 'k' });
    });
    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });

  it('does not respond to other keys with meta', async () => {
    const mockOnOpenChange = jest.fn();
    await act(async () => {
      render(<CommandPalette onOpenChange={mockOnOpenChange} />);
    });
    await act(async () => {
      fireEvent.keyDown(document, { key: 'j', metaKey: true });
    });
    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });

  it('accepts onOpenChange prop', async () => {
    const mockOnOpenChange = jest.fn();
    await act(async () => {
      render(<CommandPalette onOpenChange={mockOnOpenChange} />);
    });
    // Component should accept the prop without error
  });
});
