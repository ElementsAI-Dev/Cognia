/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
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

// Mock Sheet to render inline (avoid Radix portal issues in jsdom)
jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet-content">{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

// Mock ScrollArea to render inline
jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock DropdownMenu to render inline
jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders sheet content with title', () => {
    render(<VersionHistoryPanel />);
    
    // Sheet content rendered inline due to mock; component calls t('title')
    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it('displays version list', () => {
    render(<VersionHistoryPanel />);
    
    expect(screen.getByText('Version 1')).toBeInTheDocument();
    expect(screen.getByText('Version 2')).toBeInTheDocument();
  });

  it('shows version descriptions', () => {
    render(<VersionHistoryPanel />);
    
    expect(screen.getByText('Initial version')).toBeInTheDocument();
    expect(screen.getByText('Added new nodes')).toBeInTheDocument();
  });
});

describe('SaveVersionDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    render(<SaveVersionDialog open={true} onOpenChange={() => {}} />);
    
    // 'saveVersion' appears in both DialogTitle and save Button
    expect(screen.getAllByText('saveVersion').length).toBeGreaterThanOrEqual(1);
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
