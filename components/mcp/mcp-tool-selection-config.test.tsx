import { render, screen, fireEvent } from '@testing-library/react';
import { MCPToolSelectionConfig } from './mcp-tool-selection-config';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockSetToolSelectionConfig = jest.fn();

const mockConfig = {
  maxTools: 20,
  strategy: 'auto' as const,
  enableRelevanceScoring: true,
  useHistoryBoost: true,
  minRelevanceScore: 0.1,
  priorityServerIds: [] as string[],
};

const mockServers = [
  {
    id: 'server-1',
    name: 'Server A',
    status: { type: 'connected' as const },
    tools: [],
    resources: [],
    prompts: [],
    config: { name: 'Server A', command: 'test', args: [], env: {}, connectionType: 'stdio' as const, enabled: true, autoStart: false },
    reconnectAttempts: 0,
  },
  {
    id: 'server-2',
    name: 'Server B',
    status: { type: 'connected' as const },
    tools: [],
    resources: [],
    prompts: [],
    config: { name: 'Server B', command: 'test', args: [], env: {}, connectionType: 'stdio' as const, enabled: true, autoStart: false },
    reconnectAttempts: 0,
  },
];

jest.mock('@/stores', () => ({
  useMcpStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      toolSelectionConfig: mockConfig,
      setToolSelectionConfig: mockSetToolSelectionConfig,
      servers: mockServers,
    }),
}));

jest.mock('@/types/mcp', () => ({
  DEFAULT_TOOL_SELECTION_CONFIG: {
    maxTools: 20,
    strategy: 'auto',
    enableRelevanceScoring: true,
    useHistoryBoost: true,
    minRelevanceScore: 0.1,
  },
}));

describe('MCPToolSelectionConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders strategy options', () => {
    render(<MCPToolSelectionConfig />);
    expect(screen.getByText('strategyAuto')).toBeInTheDocument();
    expect(screen.getByText('strategyManual')).toBeInTheDocument();
    expect(screen.getByText('strategyHybrid')).toBeInTheDocument();
  });

  it('shows max tools value', () => {
    render(<MCPToolSelectionConfig />);
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('renders priority servers', () => {
    render(<MCPToolSelectionConfig />);
    expect(screen.getByText('Server A')).toBeInTheDocument();
    expect(screen.getByText('Server B')).toBeInTheDocument();
  });

  it('calls setToolSelectionConfig when strategy clicked', () => {
    render(<MCPToolSelectionConfig />);
    fireEvent.click(screen.getByText('strategyManual'));
    expect(mockSetToolSelectionConfig).toHaveBeenCalledWith({ strategy: 'manual' });
  });

  it('resets to defaults when reset button clicked', () => {
    render(<MCPToolSelectionConfig />);
    fireEvent.click(screen.getByText('resetDefaults'));
    expect(mockSetToolSelectionConfig).toHaveBeenCalled();
  });

  it('toggles priority server', () => {
    render(<MCPToolSelectionConfig />);
    fireEvent.click(screen.getByText('Server A'));
    expect(mockSetToolSelectionConfig).toHaveBeenCalledWith({
      priorityServerIds: ['server-1'],
    });
  });

  it('renders with custom className', () => {
    const { container } = render(<MCPToolSelectionConfig className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
