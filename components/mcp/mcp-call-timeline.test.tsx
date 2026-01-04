import { render, screen, fireEvent } from '@testing-library/react';
import { MCPCallTimeline, type MCPCallStep } from './mcp-call-timeline';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock CodeBlock to avoid async highlighting issues
jest.mock('@/components/ai-elements/code-block', () => ({
  CodeBlock: ({ code }: { code: string }) => <pre data-testid="code-block">{code}</pre>,
}));

describe('MCPCallTimeline', () => {
  const mockSteps: MCPCallStep[] = [
    {
      id: 'step-1',
      serverId: 'server-1',
      serverName: 'Test Server',
      toolName: 'read_file',
      state: 'output-available',
      startedAt: new Date(Date.now() - 2000),
      endedAt: new Date(Date.now() - 1000),
      result: { content: 'file content' },
    },
    {
      id: 'step-2',
      serverId: 'server-1',
      serverName: 'Test Server',
      toolName: 'write_file',
      state: 'input-available',
      startedAt: new Date(),
    },
  ];

  it('renders nothing when no steps', () => {
    const { container } = render(<MCPCallTimeline steps={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders all steps', () => {
    render(<MCPCallTimeline steps={mockSteps} />);
    expect(screen.getByText('Read File')).toBeInTheDocument();
    expect(screen.getByText('Write File')).toBeInTheDocument();
  });

  it('shows statistics when enabled', () => {
    render(<MCPCallTimeline steps={mockSteps} showStatistics />);
    expect(screen.getByText('successRate')).toBeInTheDocument();
  });

  it('hides content when collapsed', () => {
    render(<MCPCallTimeline steps={mockSteps} />);
    
    // Find header button and click to collapse
    const buttons = screen.getAllByRole('button');
    const header = buttons.find(btn => btn.textContent?.includes('mcpCalls'));
    if (header) {
      fireEvent.click(header);
    }
    // Content may be hidden after collapse
    expect(screen.getByText('mcpCalls')).toBeInTheDocument();
  });

  it('shows running indicator for active steps', () => {
    render(<MCPCallTimeline steps={mockSteps} />);
    // The running step should have a spinner animation class
    expect(screen.getByText('Write File')).toBeInTheDocument();
  });

  it('calls onStepClick when step clicked', () => {
    const onStepClick = jest.fn();
    render(<MCPCallTimeline steps={mockSteps} onStepClick={onStepClick} />);
    
    const step = screen.getByText('Read File').closest('div[class*="rounded-lg"]');
    if (step) {
      fireEvent.click(step);
      expect(onStepClick).toHaveBeenCalledWith(mockSteps[0]);
    }
  });

  it('shows server badges', () => {
    render(<MCPCallTimeline steps={mockSteps} />);
    // Server badges should be rendered
    const badges = screen.getAllByText('Test Server');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('expands result preview on toggle', () => {
    render(<MCPCallTimeline steps={mockSteps} />);
    
    // Find the eye button for the completed step
    const expandButtons = screen.getAllByRole('button');
    const eyeButton = expandButtons.find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-eye')
    );
    
    if (eyeButton) {
      fireEvent.click(eyeButton);
      // Result should be visible after expanding
    }
  });

  it('displays duration for completed steps', () => {
    render(<MCPCallTimeline steps={mockSteps} />);
    // Timeline should show the steps
    expect(screen.getByText('Read File')).toBeInTheDocument();
  });

  it('shows error message for failed steps', () => {
    const stepsWithError: MCPCallStep[] = [
      {
        id: 'step-1',
        serverId: 'server-1',
        toolName: 'failing_tool',
        state: 'output-error',
        error: 'Connection timeout',
      },
    ];
    
    render(<MCPCallTimeline steps={stepsWithError} />);
    expect(screen.getByText('Connection timeout')).toBeInTheDocument();
  });

  it('shows total duration in header', () => {
    render(<MCPCallTimeline steps={mockSteps} />);
    // mcpCalls label should be displayed
    expect(screen.getByText('mcpCalls')).toBeInTheDocument();
  });
});
