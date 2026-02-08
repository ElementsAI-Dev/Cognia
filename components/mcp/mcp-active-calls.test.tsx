import { render, screen, fireEvent } from '@testing-library/react';
import { MCPActiveCalls } from './mcp-active-calls';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockCancelRequest = jest.fn();
const mockClearCompletedToolCalls = jest.fn();

const createMockCalls = () => {
  const map = new Map();
  map.set('call-1', {
    id: 'call-1',
    serverId: 'server-1',
    toolName: 'read_file',
    args: { path: '/test.txt' },
    status: 'running',
    startedAt: new Date(Date.now() - 5000),
    progress: 0.5,
  });
  map.set('call-2', {
    id: 'call-2',
    serverId: 'server-1',
    toolName: 'write_file',
    args: { path: '/out.txt' },
    status: 'completed',
    startedAt: new Date(Date.now() - 10000),
    completedAt: new Date(Date.now() - 8000),
    duration: 2000,
    result: { success: true },
  });
  map.set('call-3', {
    id: 'call-3',
    serverId: 'server-2',
    toolName: 'search',
    args: { query: 'test' },
    status: 'error',
    startedAt: new Date(Date.now() - 3000),
    completedAt: new Date(Date.now() - 1000),
    error: 'Tool not found',
  });
  return map;
};

jest.mock('@/stores', () => ({
  useMcpStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      activeToolCalls: createMockCalls(),
      cancelRequest: mockCancelRequest,
      clearCompletedToolCalls: mockClearCompletedToolCalls,
    }),
}));

describe('MCPActiveCalls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders active tool calls', () => {
    render(<MCPActiveCalls />);
    expect(screen.getByText('read_file')).toBeInTheDocument();
    expect(screen.getByText('write_file')).toBeInTheDocument();
    expect(screen.getByText('search')).toBeInTheDocument();
  });

  it('shows status badges', () => {
    render(<MCPActiveCalls />);
    expect(screen.getByText('running')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('error')).toBeInTheDocument();
  });

  it('shows error message for failed calls', () => {
    render(<MCPActiveCalls />);
    expect(screen.getByText('Tool not found')).toBeInTheDocument();
  });

  it('shows clear completed button when completed calls exist', () => {
    render(<MCPActiveCalls />);
    const clearButton = screen.getByText('clearCompleted');
    expect(clearButton).toBeInTheDocument();
    fireEvent.click(clearButton);
    expect(mockClearCompletedToolCalls).toHaveBeenCalled();
  });

  it('shows cancel button for running calls', () => {
    render(<MCPActiveCalls />);
    const cancelButtons = screen.getAllByRole('button');
    expect(cancelButtons.length).toBeGreaterThan(0);
  });

  it('renders with custom className', () => {
    const { container } = render(<MCPActiveCalls className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
