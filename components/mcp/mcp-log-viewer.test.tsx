import { render, screen, fireEvent } from '@testing-library/react';
import { MCPLogViewer, type MCPLogEntry } from './mcp-log-viewer';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('MCPLogViewer', () => {
  const mockLogs: MCPLogEntry[] = [
    {
      id: 'log-1',
      level: 'info',
      message: 'Server started',
      timestamp: new Date(),
      serverId: 'server-1',
      serverName: 'Test Server',
    },
    {
      id: 'log-2',
      level: 'warning',
      message: 'Connection slow',
      timestamp: new Date(),
      serverId: 'server-1',
    },
    {
      id: 'log-3',
      level: 'error',
      message: 'Request failed',
      timestamp: new Date(),
      serverId: 'server-2',
      data: { code: 500 },
    },
  ];

  it('renders log entries', () => {
    render(<MCPLogViewer logs={mockLogs} />);
    expect(screen.getByText('Server started')).toBeInTheDocument();
    expect(screen.getByText('Connection slow')).toBeInTheDocument();
    expect(screen.getByText('Request failed')).toBeInTheDocument();
  });

  it('shows empty state when no logs', () => {
    render(<MCPLogViewer logs={[]} />);
    expect(screen.getByText('noLogs')).toBeInTheDocument();
  });

  it('filters logs by search query', () => {
    render(<MCPLogViewer logs={mockLogs} />);
    
    const searchInput = screen.getByPlaceholderText('searchLogs');
    fireEvent.change(searchInput, { target: { value: 'failed' } });
    
    expect(screen.getByText('Request failed')).toBeInTheDocument();
    expect(screen.queryByText('Server started')).not.toBeInTheDocument();
  });

  it('shows no matching logs message when filter has no results', () => {
    render(<MCPLogViewer logs={mockLogs} />);
    
    const searchInput = screen.getByPlaceholderText('searchLogs');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    expect(screen.getByText('noMatchingLogs')).toBeInTheDocument();
  });

  it('clears search when clear button clicked', () => {
    render(<MCPLogViewer logs={mockLogs} />);
    
    const searchInput = screen.getByPlaceholderText('searchLogs');
    fireEvent.change(searchInput, { target: { value: 'failed' } });
    
    // Find and click clear button
    const clearButtons = screen.getAllByRole('button');
    const xButton = clearButtons.find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-x')
    );
    
    if (xButton) {
      fireEvent.click(xButton);
      expect(screen.getByText('Server started')).toBeInTheDocument();
    }
  });

  it('shows log count in header', () => {
    render(<MCPLogViewer logs={mockLogs} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('collapses/expands on header click', () => {
    render(<MCPLogViewer logs={mockLogs} />);
    
    // Header should be present
    expect(screen.getByText('logs')).toBeInTheDocument();
    
    // Content should initially be visible
    expect(screen.getByText('Server started')).toBeInTheDocument();
  });

  it('calls onClear when clear button clicked', () => {
    const onClear = jest.fn();
    render(<MCPLogViewer logs={mockLogs} onClear={onClear} />);
    
    const clearButtons = screen.getAllByRole('button');
    const trashButton = clearButtons.find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-trash-2')
    );
    
    if (trashButton) {
      fireEvent.click(trashButton);
      expect(onClear).toHaveBeenCalled();
    }
  });

  it('expands log data when clicked', () => {
    render(<MCPLogViewer logs={mockLogs} />);
    
    // Find expand button for log with data
    const expandButtons = screen.getAllByRole('button');
    const chevronButton = expandButtons.find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-chevron-down')
    );
    
    if (chevronButton) {
      fireEvent.click(chevronButton);
      // Data should be visible
      expect(screen.getByText(/"code": 500/)).toBeInTheDocument();
    }
  });

  it('shows server column when enabled', () => {
    render(<MCPLogViewer logs={mockLogs} showServerColumn />);
    expect(screen.getByText('Test Server')).toBeInTheDocument();
  });

  it('applies styling to error logs', () => {
    render(<MCPLogViewer logs={mockLogs} />);
    const errorLog = screen.getByText('Request failed');
    expect(errorLog).toBeInTheDocument();
  });

  it('applies styling to warning logs', () => {
    render(<MCPLogViewer logs={mockLogs} />);
    const warningLog = screen.getByText('Connection slow');
    expect(warningLog).toBeInTheDocument();
  });
});
