/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VersionHistoryPanel, SaveVersionDialog } from './version-history-panel';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 hours ago'),
}));

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the store
const mockSaveVersion = jest.fn();
const mockGetVersions = jest.fn();
const mockRestoreVersion = jest.fn();
const mockDeleteVersion = jest.fn();
const mockExportToFile = jest.fn();
const mockImportFromFile = jest.fn();

const mockVersions = [
  {
    id: 'v1',
    name: 'Version 1',
    description: 'Initial version',
    createdAt: new Date('2024-01-01'),
    snapshot: {},
  },
  {
    id: 'v2',
    name: 'Version 2',
    description: 'Added new nodes',
    createdAt: new Date('2024-01-02'),
    snapshot: {},
  },
];

jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: jest.fn(() => ({
    currentWorkflow: { id: 'test-workflow', name: 'Test Workflow' },
    currentVersionNumber: 2,
    saveVersion: mockSaveVersion,
    getVersions: mockGetVersions.mockReturnValue(mockVersions),
    restoreVersion: mockRestoreVersion,
    deleteVersion: mockDeleteVersion,
    exportToFile: mockExportToFile,
    importFromFile: mockImportFromFile,
  })),
}));

describe('VersionHistoryPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders trigger button', () => {
    render(<VersionHistoryPanel />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('opens sheet when button clicked', async () => {
    render(<VersionHistoryPanel />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('versionHistory')).toBeInTheDocument();
    });
  });

  it('displays version list', async () => {
    render(<VersionHistoryPanel />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Version 1')).toBeInTheDocument();
      expect(screen.getByText('Version 2')).toBeInTheDocument();
    });
  });

  it('shows version descriptions', async () => {
    render(<VersionHistoryPanel />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Initial version')).toBeInTheDocument();
      expect(screen.getByText('Added new nodes')).toBeInTheDocument();
    });
  });
});

describe('SaveVersionDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    render(<SaveVersionDialog open={true} onOpenChange={() => {}} />);
    
    expect(screen.getByText('saveVersion')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<SaveVersionDialog open={false} onOpenChange={() => {}} />);
    
    expect(screen.queryByText('saveVersion')).not.toBeInTheDocument();
  });

  it('has input fields for name and description', () => {
    render(<SaveVersionDialog open={true} onOpenChange={() => {}} />);
    
    expect(screen.getByLabelText('versionName')).toBeInTheDocument();
    expect(screen.getByLabelText('descriptionOptional')).toBeInTheDocument();
  });

  it('calls onOpenChange when closed', () => {
    const mockOnOpenChange = jest.fn();
    render(<SaveVersionDialog open={true} onOpenChange={mockOnOpenChange} />);
    
    const cancelButton = screen.getByText('cancel');
    fireEvent.click(cancelButton);
    
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
