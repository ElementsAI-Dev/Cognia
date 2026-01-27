import { render, screen, act } from '@testing-library/react';
import { ImportExportDialog } from './import-export-dialog';

// Mock next-intl with interpolation support
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string | ((p: Record<string, unknown>) => string)> = {
      title: 'title',
      description: 'description',
      export: 'export',
      import: 'import',
      noProjects: 'No projects',
      selectProjects: 'selectProjects',
      selectAll: 'selectAll',
      deselectAll: 'deselectAll',
      exportJson: 'exportJson',
      exportZip: 'exportZip',
      dropHint: 'dropHint',
      supportedFormats: 'supportedFormats',
      importing: 'importing',
      filesCount: (p: Record<string, unknown>) => `${p.count} files`,
    };
    const val = translations[key];
    if (typeof val === 'function' && params) {
      return val(params);
    }
    return typeof val === 'string' ? val : key;
  },
}));

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock project store
const mockProjects = [
  {
    id: '1',
    name: 'Project 1',
    description: 'Description 1',
    knowledgeBase: [],
    defaultMode: 'chat',
  },
  {
    id: '2',
    name: 'Project 2',
    description: 'Description 2',
    knowledgeBase: [{ id: 'f1' }],
    defaultMode: 'agent',
  },
];

const mockCreateProject = jest.fn();
const mockImportProjects = jest.fn();

jest.mock('@/stores', () => ({
  useProjectStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      projects: mockProjects,
      createProject: mockCreateProject,
      importProjects: mockImportProjects,
    };
    return selector(state);
  },
}));

// Mock import-export utilities
jest.mock('@/lib/project/import-export', () => ({
  exportProjectToJSON: jest.fn().mockReturnValue('{}'),
  exportProjectsToZip: jest.fn().mockResolvedValue({ success: true, blob: new Blob(), filename: 'test.zip' }),
  importProjectFromJSON: jest.fn().mockReturnValue({ success: true, project: { name: 'Test' } }),
  importProjectsFromZip: jest.fn().mockResolvedValue({ success: true, projects: [], errors: [] }),
  downloadFile: jest.fn(),
}));

describe('ImportExportDialog', () => {
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', async () => {
    await act(async () => {
      render(<ImportExportDialog open={true} onOpenChange={mockOnOpenChange} />);
    });
    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it('displays dialog description', async () => {
    await act(async () => {
      render(<ImportExportDialog open={true} onOpenChange={mockOnOpenChange} />);
    });
    expect(screen.getByText('description')).toBeInTheDocument();
  });

  it('has Export and Import tabs', async () => {
    await act(async () => {
      render(<ImportExportDialog open={true} onOpenChange={mockOnOpenChange} />);
    });
    expect(screen.getByText('export')).toBeInTheDocument();
    expect(screen.getByText('import')).toBeInTheDocument();
  });

  it('shows projects list in export tab', async () => {
    await act(async () => {
      render(<ImportExportDialog open={true} onOpenChange={mockOnOpenChange} />);
    });
    expect(screen.getByText('Project 1')).toBeInTheDocument();
    expect(screen.getByText('Project 2')).toBeInTheDocument();
  });

  it('has Select All button', async () => {
    await act(async () => {
      render(<ImportExportDialog open={true} onOpenChange={mockOnOpenChange} />);
    });
    expect(screen.getByText('selectAll')).toBeInTheDocument();
  });

  it('has export buttons', async () => {
    await act(async () => {
      render(<ImportExportDialog open={true} onOpenChange={mockOnOpenChange} />);
    });
    expect(screen.getByText('exportJson')).toBeInTheDocument();
    expect(screen.getByText('exportZip')).toBeInTheDocument();
  });

  it('switches to import tab', async () => {
    await act(async () => {
      render(<ImportExportDialog open={true} onOpenChange={mockOnOpenChange} initialTab="import" />);
    });
    
    // When starting in import tab, the drop zone should be visible
    expect(screen.getByText('dropHint')).toBeInTheDocument();
  });

  it('shows file type hint in import tab', async () => {
    await act(async () => {
      render(<ImportExportDialog open={true} onOpenChange={mockOnOpenChange} initialTab="import" />);
    });
    expect(screen.getByText('supportedFormats')).toBeInTheDocument();
  });

  it('does not render when closed', async () => {
    await act(async () => {
      render(<ImportExportDialog open={false} onOpenChange={mockOnOpenChange} />);
    });
    expect(screen.queryByText('title')).not.toBeInTheDocument();
  });
});

describe('ImportExportDialog - Export Tab', () => {
  const mockOnOpenChange = jest.fn();

  it('shows project selection for export', async () => {
    await act(async () => {
      render(<ImportExportDialog open={true} onOpenChange={mockOnOpenChange} />);
    });
    expect(screen.getByText('selectProjects')).toBeInTheDocument();
  });

  it('displays project file counts', async () => {
    await act(async () => {
      render(<ImportExportDialog open={true} onOpenChange={mockOnOpenChange} />);
    });
    expect(screen.getByText('0 files')).toBeInTheDocument();
    expect(screen.getByText('1 files')).toBeInTheDocument();
  });
});
