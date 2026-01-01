import { render, screen, act } from '@testing-library/react';
import { WorkflowSelector } from './workflow-selector';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      selectWorkflow: 'Select Workflow',
      selectWorkflowDescription: 'Choose a workflow to run',
      runningWorkflow: 'Running Workflow',
      progress: 'Progress',
      resume: 'Resume',
      pause: 'Pause',
      cancel: 'Cancel',
      paused: 'Paused',
      running: 'Running',
      logs: 'Logs',
      basicSettings: 'Basic Settings',
      templates: 'Templates',
      advancedSettings: 'Advanced Settings',
      topic: 'Topic',
      topicPlaceholder: 'Enter topic...',
      description: 'Description',
      descriptionPlaceholder: 'Enter description...',
      slideCount: 'Slide Count',
      style: 'Style',
      targetAudience: 'Target Audience',
      targetAudiencePlaceholder: 'Enter target audience...',
      language: 'Language',
      theme: 'Theme',
      customInstructions: 'Custom Instructions',
      customInstructionsPlaceholder: 'Enter custom instructions...',
    };
    return translations[key] || key;
  },
}));

// Mock useWorkflow hook
const mockRun = jest.fn();
const mockRunPPT = jest.fn();
const mockPause = jest.fn();
const mockResume = jest.fn();
const mockCancel = jest.fn();
const mockReset = jest.fn();
const mockGetWorkflows = jest.fn().mockReturnValue([
  {
    id: 'ppt-generation',
    name: 'PPT Generation',
    description: 'Generate presentations',
    type: 'ppt-generation',
    steps: [{ id: '1', name: 'Step 1' }],
    estimatedDuration: 300,
  },
  {
    id: 'report-generation',
    name: 'Report Generation',
    description: 'Generate reports',
    type: 'report-generation',
    steps: [{ id: '1', name: 'Step 1' }, { id: '2', name: 'Step 2' }],
  },
]);

jest.mock('@/hooks/use-workflow', () => ({
  useWorkflow: () => ({
    isRunning: false,
    isPaused: false,
    progress: 0,
    error: null,
    logs: [],
    run: mockRun,
    runPPT: mockRunPPT,
    pause: mockPause,
    resume: mockResume,
    cancel: mockCancel,
    getWorkflows: mockGetWorkflows,
    reset: mockReset,
  }),
}));

// Mock workflow store
jest.mock('@/stores/workflow-store', () => ({
  useWorkflowStore: () => ({
    openWorkflowPanel: jest.fn(),
    setSelectedWorkflowType: jest.fn(),
  }),
}));

describe('WorkflowSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', async () => {
    await act(async () => {
      render(<WorkflowSelector open={true} />);
    });
    expect(screen.getByText('Select Workflow')).toBeInTheDocument();
  });

  it('displays workflow selection description', async () => {
    await act(async () => {
      render(<WorkflowSelector open={true} />);
    });
    expect(screen.getByText('Choose a workflow to run')).toBeInTheDocument();
  });

  it('displays available workflows', async () => {
    await act(async () => {
      render(<WorkflowSelector open={true} />);
    });
    expect(screen.getByText('PPT Generation')).toBeInTheDocument();
    expect(screen.getByText('Report Generation')).toBeInTheDocument();
  });

  it('accepts callback props', async () => {
    const mockOnOpenChange = jest.fn();
    const mockOnStart = jest.fn();
    const mockOnComplete = jest.fn();
    await act(async () => {
      render(
        <WorkflowSelector
          open={true}
          onOpenChange={mockOnOpenChange}
          onStart={mockOnStart}
          onComplete={mockOnComplete}
        />
      );
    });
  });

  it('does not render content when closed', async () => {
    await act(async () => {
      render(<WorkflowSelector open={false} />);
    });
    expect(screen.queryByText('Select Workflow')).not.toBeInTheDocument();
  });
});
