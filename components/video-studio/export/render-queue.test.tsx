import { render, screen } from '@testing-library/react';
import { RenderQueue, type RenderJob } from './render-queue';

const mockJobs: RenderJob[] = [
  {
    id: 'job-1',
    name: 'Project 1',
    projectName: 'Test Project',
    status: 'queued',
    progress: 0,
    format: 'mp4',
    resolution: '1920x1080',
    duration: 60,
    createdAt: Date.now(),
  },
];

describe('RenderQueue', () => {
  const defaultProps = {
    jobs: mockJobs,
    activeJobId: null,
    onStartJob: jest.fn(),
    onPauseJob: jest.fn(),
    onResumeJob: jest.fn(),
    onCancelJob: jest.fn(),
    onRemoveJob: jest.fn(),
    onReorderJob: jest.fn(),
    onClearCompleted: jest.fn(),
    onOpenOutputFolder: jest.fn(),
  };

  it('renders render queue panel', () => {
    render(<RenderQueue {...defaultProps} />);
    expect(screen.getByText('Render Queue')).toBeInTheDocument();
  });

  it('displays job names', () => {
    render(<RenderQueue {...defaultProps} />);
    expect(screen.getByText('Project 1')).toBeInTheDocument();
  });

  it('shows empty state when no jobs', () => {
    render(<RenderQueue {...defaultProps} jobs={[]} />);
    expect(screen.getByText(/no.*job/i)).toBeInTheDocument();
  });
});
