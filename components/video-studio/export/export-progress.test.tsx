import { render, screen } from '@testing-library/react';
import { ExportProgress } from './export-progress';

describe('ExportProgress', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    stage: 'encoding' as const,
    progress: 50,
    elapsedTime: 120,
    estimatedTimeRemaining: 120,
    currentFrame: 500,
    totalFrames: 1000,
    onPause: jest.fn(),
    onResume: jest.fn(),
    onCancel: jest.fn(),
    isPaused: false,
  };

  it('renders progress dialog when open', () => {
    render(<ExportProgress {...defaultProps} />);
    expect(screen.getByText('Exporting Video')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ExportProgress {...defaultProps} open={false} />);
    expect(screen.queryByText('Exporting Video')).not.toBeInTheDocument();
  });

  it('displays progress bar', () => {
    render(<ExportProgress {...defaultProps} />);
    // Progress bar should be present
    const progressBar = document.querySelector('[role="progressbar"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('renders control buttons', () => {
    render(<ExportProgress {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
