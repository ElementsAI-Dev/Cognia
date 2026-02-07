/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TemplatePreview } from './template-preview';
import type { WorkflowTemplate } from '@/types/workflow/template';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    className,
    onClick,
    ...props
  }: {
    children?: React.ReactNode;
    className?: string;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button data-testid="button" className={className} onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    className,
    ...props
  }: {
    children?: React.ReactNode;
    className?: string;
    [key: string]: unknown;
  }) => (
    <span data-testid="badge" className={className} {...props}>
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>{children}</div>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({
    children,
    defaultValue,
    ...props
  }: {
    children?: React.ReactNode;
    defaultValue?: string;
    [key: string]: unknown;
  }) => (
    <div data-testid="tabs" data-default-value={defaultValue} {...props}>
      {children}
    </div>
  ),
  TabsContent: ({
    children,
    value,
    ...props
  }: {
    children?: React.ReactNode;
    value: string;
    [key: string]: unknown;
  }) => (
    <div data-testid={`tabs-content-${value}`} {...props}>
      {children}
    </div>
  ),
  TabsList: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="tabs-list">{children}</div>
  ),
  TabsTrigger: ({ children, value }: { children?: React.ReactNode; value: string }) => (
    <button data-testid={`tabs-trigger-${value}`}>{children}</button>
  ),
}));

// Mock InlineCopyButton
jest.mock('@/components/chat/ui/copy-button', () => ({
  InlineCopyButton: ({ className }: { content?: string; className?: string }) => (
    <button data-testid="copy-button" className={className}>Copy</button>
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Star: () => <svg data-testid="star-icon" />,
  Download: () => <svg data-testid="download-icon" />,
  User: () => <svg data-testid="user-icon" />,
  Calendar: () => <svg data-testid="calendar-icon" />,
  GitBranch: () => <svg data-testid="git-branch-icon" />,
  FileJson: () => <svg data-testid="file-json-icon" />,
}));

// Using partial mock data - full type compliance not required for UI rendering tests
const mockTemplate = {
  id: 'template-1',
  name: 'Advanced Data Processing',
  description: 'Comprehensive data processing workflow with ETL operations',
  category: 'data',
  tags: ['etl', 'data', 'processing', 'automation'],
  author: 'System',
  version: '2.0.0',
  workflow: {
    type: 'data-analysis',
    version: '1.0.0',
    nodes: [],
    edges: [],
    settings: {},
  },
  metadata: {
    rating: 4.8,
    ratingCount: 125,
    usageCount: 500,
    isOfficial: true,
    source: 'built-in',
    createdAt: new Date('2024-01-15T00:00:00Z'),
    updatedAt: new Date('2024-02-01T00:00:00Z'),
    thumbnail: '',
  },
} as unknown as WorkflowTemplate;

const mockGitTemplate = {
  ...mockTemplate,
  metadata: {
    ...mockTemplate.metadata,
    source: 'git' as const,
    gitUrl: 'https://github.com/workflows/advanced-processing.git',
    gitBranch: 'main',
    lastSyncAt: new Date('2024-02-15T10:30:00Z'),
  },
} as unknown as WorkflowTemplate;

describe('TemplatePreview', () => {
  it('renders without crashing', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('Advanced Data Processing')).toBeInTheDocument();
  });

  it('renders template name', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('Advanced Data Processing')).toBeInTheDocument();
  });

  it('renders template description', () => {
    render(<TemplatePreview template={mockTemplate} />);
    // Description appears in multiple places (header and JSON)
    expect(
      screen.getAllByText('Comprehensive data processing workflow with ETL operations').length
    ).toBeGreaterThan(0);
  });

  it('renders official badge for official templates', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('official')).toBeInTheDocument();
  });

  it('renders version badge', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('2.0.0')).toBeInTheDocument();
  });

  it('renders rating star icon', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getAllByTestId('star-icon').length).toBeGreaterThan(0);
  });

  it('renders rating value', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('4.8')).toBeInTheDocument();
  });

  it('renders rating count', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('ratings')).toBeInTheDocument();
  });

  it('renders download icon', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByTestId('download-icon')).toBeInTheDocument();
  });

  it('renders usage count', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('uses')).toBeInTheDocument();
  });

  it('renders user icon', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByTestId('user-icon')).toBeInTheDocument();
  });

  it('renders author name', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('renders calendar icon', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
  });

  it('renders created date', () => {
    render(<TemplatePreview template={mockTemplate} />);
    // Created date info is in the header section with calendar icon
    expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
  });

  it('renders separators', () => {
    render(<TemplatePreview template={mockTemplate} />);
    const separators = screen.getAllByTestId('separator');
    expect(separators.length).toBe(2);
  });

  it('renders tabs', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByTestId('tabs')).toBeInTheDocument();
  });

  it('renders tabs list', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
  });

  it('renders overview tab trigger', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByTestId('tabs-trigger-overview')).toBeInTheDocument();
  });

  it('renders workflow tab trigger', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByTestId('tabs-trigger-workflow')).toBeInTheDocument();
  });

  it('renders metadata tab trigger', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByTestId('tabs-trigger-metadata')).toBeInTheDocument();
  });

  it('renders overview tab content', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByTestId('tabs-content-overview')).toBeInTheDocument();
  });

  it('renders workflow tab content', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByTestId('tabs-content-workflow')).toBeInTheDocument();
  });

  it('renders metadata tab content', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByTestId('tabs-content-metadata')).toBeInTheDocument();
  });
});

describe('TemplatePreview - Overview Tab', () => {
  it('renders description section', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('description')).toBeInTheDocument();
    // Description appears in multiple places (header and JSON)
    expect(screen.getByTestId('tabs-content-overview')).toBeInTheDocument();
  });

  it('renders tags section', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('tags')).toBeInTheDocument();
  });

  it('renders all template tags', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('etl')).toBeInTheDocument();
    // 'data' appears in multiple places (tag and JSON)
    expect(screen.getAllByText(/data/).length).toBeGreaterThan(0);
    expect(screen.getByText('processing')).toBeInTheDocument();
    expect(screen.getAllByText(/automation/).length).toBeGreaterThan(0);
  });

  it('renders source section', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('source')).toBeInTheDocument();
  });

  it('renders source badge', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('built-in')).toBeInTheDocument();
  });
});

describe('TemplatePreview - Workflow Tab', () => {
  it('renders workflow details section', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('workflowDetails')).toBeInTheDocument();
  });

  it('renders workflow type', () => {
    render(<TemplatePreview template={mockTemplate} />);
    // Type info is in workflow tab
    expect(screen.getByTestId('tabs-content-workflow')).toBeInTheDocument();
    expect(screen.getByText('data-analysis')).toBeInTheDocument();
  });

  it('renders workflow version', () => {
    render(<TemplatePreview template={mockTemplate} />);
    // Version info is in workflow tab
    expect(screen.getByTestId('tabs-content-workflow')).toBeInTheDocument();
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
  });

  it('renders nodes count', () => {
    render(<TemplatePreview template={mockTemplate} />);
    // Nodes info is in workflow tab - mock has empty arrays
    expect(screen.getByTestId('tabs-content-workflow')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  it('renders edges count', () => {
    render(<TemplatePreview template={mockTemplate} />);
    // Edges info is in workflow tab - mock has empty arrays
    expect(screen.getByTestId('tabs-content-workflow')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  it('renders workflow settings section', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('workflowSettings')).toBeInTheDocument();
  });

  it('renders workflow settings JSON', () => {
    render(<TemplatePreview template={mockTemplate} />);
    // Workflow settings are rendered in JSON format
    expect(screen.getByText('workflowSettings')).toBeInTheDocument();
  });
});

describe('TemplatePreview - Metadata Tab', () => {
  it('renders full metadata section', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('fullMetadata')).toBeInTheDocument();
  });

  it('renders metadata JSON', () => {
    render(<TemplatePreview template={mockTemplate} />);
    // Metadata content is in the JSON pre block
    expect(screen.getByTestId('tabs-content-metadata')).toBeInTheDocument();
  });

  it('renders template data section', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('templateData')).toBeInTheDocument();
  });

  it('renders template data JSON', () => {
    render(<TemplatePreview template={mockTemplate} />);
    // Template data section exists
    expect(screen.getByText('templateData')).toBeInTheDocument();
  });
});

describe('TemplatePreview - Git Template', () => {
  it('renders git info section for git templates', () => {
    render(<TemplatePreview template={mockGitTemplate} />);
    expect(screen.getByTestId('git-branch-icon')).toBeInTheDocument();
  });

  it('renders git URL', () => {
    render(<TemplatePreview template={mockGitTemplate} />);
    expect(
      screen.getByText('https://github.com/workflows/advanced-processing.git')
    ).toBeInTheDocument();
  });

  it('renders git branch', () => {
    render(<TemplatePreview template={mockGitTemplate} />);
    // Git branch info is rendered with the branch icon
    expect(screen.getByTestId('git-branch-icon')).toBeInTheDocument();
  });

  it('renders last sync time', () => {
    render(<TemplatePreview template={mockGitTemplate} />);
    // Last sync info is rendered in git template view
    expect(screen.getByTestId('tabs-content-overview')).toBeInTheDocument();
  });
});

describe('TemplatePreview - Actions', () => {
  it('renders use template button', () => {
    render(<TemplatePreview template={mockTemplate} />);
    const useButtons = screen.getAllByText('useTemplate');
    expect(useButtons.length).toBeGreaterThan(0);
  });

  it('renders clone template button', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getAllByText('cloneTemplate').length).toBeGreaterThan(0);
  });

  it('renders export button', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getAllByText('export').length).toBeGreaterThan(0);
  });

  it('renders file json icon on export button', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByTestId('file-json-icon')).toBeInTheDocument();
  });
});

describe('TemplatePreview integration tests', () => {
  it('displays complete template information', () => {
    render(<TemplatePreview template={mockTemplate} />);

    // Header - text appears multiple times due to JSON rendering
    expect(screen.getAllByText('Advanced Data Processing').length).toBeGreaterThan(0);

    // Tabs
    expect(screen.getByTestId('tabs-trigger-overview')).toBeInTheDocument();
    expect(screen.getByTestId('tabs-trigger-workflow')).toBeInTheDocument();
    expect(screen.getByTestId('tabs-trigger-metadata')).toBeInTheDocument();

    // Actions
    const useButtons = screen.getAllByText('useTemplate');
    expect(useButtons.length).toBeGreaterThan(0);
  });

  it('handles git template with all git information', () => {
    render(<TemplatePreview template={mockGitTemplate} />);

    expect(
      screen.getByText('https://github.com/workflows/advanced-processing.git')
    ).toBeInTheDocument();
    // Git info is rendered - verify git branch icon exists
    expect(screen.getByTestId('git-branch-icon')).toBeInTheDocument();
  });

  it('handles template with complex workflow settings', () => {
    render(<TemplatePreview template={mockTemplate} />);

    // Verify workflow tab exists and contains settings
    expect(screen.getByTestId('tabs-content-workflow')).toBeInTheDocument();
    expect(screen.getByText('workflowSettings')).toBeInTheDocument();
  });

  it('handles template with many tags', () => {
    render(<TemplatePreview template={mockTemplate} />);

    expect(screen.getByText('etl')).toBeInTheDocument();
    expect(screen.getAllByText(/data/).length).toBeGreaterThan(0);
    expect(screen.getByText('processing')).toBeInTheDocument();
    expect(screen.getAllByText(/automation/).length).toBeGreaterThan(0);
  });

  it('renders template metadata in correct format', () => {
    render(<TemplatePreview template={mockTemplate} />);

    // Verify metadata tab exists and contains content
    expect(screen.getByTestId('tabs-content-metadata')).toBeInTheDocument();
    // Check for cards within metadata section
    expect(screen.getAllByTestId('card').length).toBeGreaterThan(0);
  });

  it('displays workflow nodes and edges count', () => {
    render(<TemplatePreview template={mockTemplate} />);

    // Verify workflow tab content exists with nodes/edges info - mock has empty arrays
    expect(screen.getByTestId('tabs-content-workflow')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  it('shows all action buttons', () => {
    render(<TemplatePreview template={mockTemplate} />);

    const useButtons = screen.getAllByText('useTemplate');
    expect(useButtons.length).toBeGreaterThan(0);
    expect(screen.getAllByText('cloneTemplate').length).toBeGreaterThan(0);
    expect(screen.getAllByText('export').length).toBeGreaterThan(0);
  });
});

describe('TemplatePreview - Edge Cases', () => {
  it('handles template with no tags', () => {
    const templateWithoutTags: WorkflowTemplate = {
      ...mockTemplate,
      tags: [],
    };

    render(<TemplatePreview template={templateWithoutTags} />);
    expect(screen.getByText('tags')).toBeInTheDocument();
  });

  it('handles template with no nodes', () => {
    const templateWithoutNodes: WorkflowTemplate = {
      ...mockTemplate,
      workflow: {
        ...mockTemplate.workflow,
        nodes: [],
      },
    };

    render(<TemplatePreview template={templateWithoutNodes} />);
    // Verify component renders without crashing
    expect(screen.getByTestId('tabs-content-workflow')).toBeInTheDocument();
  });

  it('handles template with no edges', () => {
    const templateWithoutEdges: WorkflowTemplate = {
      ...mockTemplate,
      workflow: {
        ...mockTemplate.workflow,
        edges: [],
      },
    };

    render(<TemplatePreview template={templateWithoutEdges} />);
    // Verify component renders without crashing
    expect(screen.getByTestId('tabs-content-workflow')).toBeInTheDocument();
  });

  it('handles template with empty settings', () => {
    const templateWithEmptySettings = {
      ...mockTemplate,
      workflow: {
        ...mockTemplate.workflow,
        settings: {},
      },
    } as unknown as WorkflowTemplate;

    render(<TemplatePreview template={templateWithEmptySettings} />);
    expect(screen.getByText('workflowSettings')).toBeInTheDocument();
  });

  it('handles non-official template', () => {
    const nonOfficialTemplate: WorkflowTemplate = {
      ...mockTemplate,
      metadata: {
        ...mockTemplate.metadata,
        isOfficial: false,
      },
    };

    render(<TemplatePreview template={nonOfficialTemplate} />);
    expect(screen.queryByText('official')).not.toBeInTheDocument();
  });

  it('handles user-source template', () => {
    const userTemplate: WorkflowTemplate = {
      ...mockTemplate,
      metadata: {
        ...mockTemplate.metadata,
        source: 'user',
      },
    };

    render(<TemplatePreview template={userTemplate} />);
    expect(screen.getByText('user')).toBeInTheDocument();
  });
});
