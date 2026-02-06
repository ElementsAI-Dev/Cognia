import { render, screen, act } from '@testing-library/react';
import { MCPProgressIndicator } from './mcp-progress-indicator';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('MCPProgressIndicator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders pending state', () => {
    render(<MCPProgressIndicator state="pending" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders running state', () => {
    render(<MCPProgressIndicator state="running" />);
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('renders completed state', () => {
    render(<MCPProgressIndicator state="completed" />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders failed state', () => {
    render(<MCPProgressIndicator state="failed" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('shows progress percentage when provided', () => {
    render(<MCPProgressIndicator state="running" progress={50} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows progress message when provided', () => {
    render(<MCPProgressIndicator state="running" message="Processing data..." />);
    expect(screen.getByText('Processing data...')).toBeInTheDocument();
  });

  it('calculates elapsed time when running', () => {
    const startedAt = new Date(Date.now() - 5000);
    render(<MCPProgressIndicator state="running" startedAt={startedAt} showElapsedTime />);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Should show some elapsed time
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('shows final duration when completed', () => {
    const startedAt = new Date(Date.now() - 3500);
    const endedAt = new Date();

    render(
      <MCPProgressIndicator
        state="completed"
        startedAt={startedAt}
        endedAt={endedAt}
        showElapsedTime
      />
    );

    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders compact mode', () => {
    render(<MCPProgressIndicator state="running" compact />);
    // In compact mode, should not show the label text
    expect(screen.queryByText('Running')).not.toBeInTheDocument();
  });
});
