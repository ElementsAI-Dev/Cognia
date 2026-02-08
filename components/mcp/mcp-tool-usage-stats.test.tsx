import { render, screen, fireEvent } from '@testing-library/react';
import { MCPToolUsageStats } from './mcp-tool-usage-stats';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockResetToolUsageHistory = jest.fn();

const createMockHistory = () => {
  const map = new Map();
  map.set('mcp_server1_read_file', {
    toolName: 'mcp_server1_read_file',
    usageCount: 15,
    successCount: 13,
    failureCount: 2,
    lastUsedAt: Date.now() - 60000,
    avgExecutionTime: 250,
  });
  map.set('mcp_server1_write_file', {
    toolName: 'mcp_server1_write_file',
    usageCount: 5,
    successCount: 5,
    failureCount: 0,
    lastUsedAt: Date.now() - 3600000,
    avgExecutionTime: 800,
  });
  return map;
};

jest.mock('@/stores', () => ({
  useMcpStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      toolUsageHistory: createMockHistory(),
      resetToolUsageHistory: mockResetToolUsageHistory,
    }),
}));

describe('MCPToolUsageStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders tool usage records', () => {
    render(<MCPToolUsageStats />);
    expect(screen.getByText('read_file')).toBeInTheDocument();
    expect(screen.getByText('write_file')).toBeInTheDocument();
  });

  it('displays usage counts', () => {
    render(<MCPToolUsageStats />);
    // "15 times" and "5 times" badges
    expect(screen.getByText(/15/)).toBeInTheDocument();
    const fiveElements = screen.getAllByText(/5/);
    expect(fiveElements.length).toBeGreaterThan(0);
  });

  it('displays success rates', () => {
    render(<MCPToolUsageStats />);
    expect(screen.getByText('87%')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('calls resetToolUsageHistory when reset button clicked', () => {
    render(<MCPToolUsageStats />);
    const resetButton = screen.getByText('resetHistory');
    fireEvent.click(resetButton);
    expect(mockResetToolUsageHistory).toHaveBeenCalled();
  });

  it('respects maxItems prop', () => {
    render(<MCPToolUsageStats maxItems={1} />);
    expect(screen.getByText('read_file')).toBeInTheDocument();
    expect(screen.queryByText('write_file')).not.toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const { container } = render(<MCPToolUsageStats className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
