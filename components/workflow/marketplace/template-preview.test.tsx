/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TemplatePreview } from './template-preview';
import type { WorkflowTemplate } from '@/types/workflow/template';

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

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Star: () => <svg data-testid="star-icon" />,
  Download: () => <svg data-testid="download-icon" />,
  User: () => <svg data-testid="user-icon" />,
  Calendar: () => <svg data-testid="calendar-icon" />,
  GitBranch: () => <svg data-testid="git-branch-icon" />,
  FileJson: () => <svg data-testid="file-json-icon" />,
}));

const mockTemplate: WorkflowTemplate = {
  id: 'template-1',
  name: 'Advanced Data Processing',
  description: 'Comprehensive data processing workflow with ETL operations',
  category: 'data',
  tags: ['etl', 'data', 'processing', 'automation'],
  author: 'System',
  version: '2.0.0',
  workflow: {
    type: 'sequential',
    version: '1.0.0',
    nodes: [
      { id: 'node-1', type: 'trigger', position: { x: 0, y: 0 } },
      { id: 'node-2', type: 'action', position: { x: 100, y: 0 } },
      { id: 'node-3', type: 'output', position: { x: 200, y: 0 } },
    ],
    edges: [
      { id: 'edge-1', source: 'node-1', target: 'node-2' },
      { id: 'edge-2', source: 'node-2', target: 'node-3' },
    ],
    settings: {
      timeout: 30000,
      retries: 3,
      parallel: false,
    },
  },
  metadata: {
    rating: 4.8,
    ratingCount: 125,
    usageCount: 500,
    isOfficial: true,
    source: 'built-in',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
    thumbnail: '',
  },
};

const mockGitTemplate: WorkflowTemplate = {
  ...mockTemplate,
  metadata: {
    ...mockTemplate.metadata,
    source: 'git',
    gitUrl: 'https://github.com/workflows/advanced-processing.git',
    gitBranch: 'main',
    lastSyncAt: '2024-02-15T10:30:00Z',
  },
};

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
    expect(
      screen.getByText('Comprehensive data processing workflow with ETL operations')
    ).toBeInTheDocument();
  });

  it('renders official badge for official templates', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('Official')).toBeInTheDocument();
  });

  it('renders version badge', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('2.0.0')).toBeInTheDocument();
  });

  it('renders rating star icon', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByTestId('star-icon')).toBeInTheDocument();
  });

  it('renders rating value', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('4.8')).toBeInTheDocument();
  });

  it('renders rating count', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('125 ratings')).toBeInTheDocument();
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
    expect(screen.getByText(/created/)).toBeInTheDocument();
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
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(
      screen.getByText('Comprehensive data processing workflow with ETL operations')
    ).toBeInTheDocument();
  });

  it('renders tags section', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('renders all template tags', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('etl')).toBeInTheDocument();
    expect(screen.getByText('data')).toBeInTheDocument();
    expect(screen.getByText('processing')).toBeInTheDocument();
    expect(screen.getByText('automation')).toBeInTheDocument();
  });

  it('renders source section', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('Source')).toBeInTheDocument();
  });

  it('renders source badge', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('built-in')).toBeInTheDocument();
  });
});

describe('TemplatePreview - Workflow Tab', () => {
  it('renders workflow details section', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('Workflow Details')).toBeInTheDocument();
  });

  it('renders workflow type', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('Type:')).toBeInTheDocument();
    expect(screen.getByText('sequential')).toBeInTheDocument();
  });

  it('renders workflow version', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('Version:')).toBeInTheDocument();
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
  });

  it('renders nodes count', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('Nodes:')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders edges count', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('Edges:')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders workflow settings section', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('Workflow Settings')).toBeInTheDocument();
  });

  it('renders workflow settings JSON', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText(/timeout/)).toBeInTheDocument();
    expect(screen.getByText(/retries/)).toBeInTheDocument();
    expect(screen.getByText(/parallel/)).toBeInTheDocument();
  });
});

describe('TemplatePreview - Metadata Tab', () => {
  it('renders full metadata section', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('Full Metadata')).toBeInTheDocument();
  });

  it('renders metadata JSON', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText(/rating/)).toBeInTheDocument();
    expect(screen.getByText(/usageCount/)).toBeInTheDocument();
    expect(screen.getByText(/isOfficial/)).toBeInTheDocument();
  });

  it('renders template data section', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('Template Data')).toBeInTheDocument();
  });

  it('renders template data JSON', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText(/"id": "template-1"/)).toBeInTheDocument();
    expect(screen.getByText(/"name": "Advanced Data Processing"/)).toBeInTheDocument();
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
    expect(screen.getByText('Branch: main')).toBeInTheDocument();
  });

  it('renders last sync time', () => {
    render(<TemplatePreview template={mockGitTemplate} />);
    expect(screen.getByText(/Last sync:/)).toBeInTheDocument();
  });
});

describe('TemplatePreview - Actions', () => {
  it('renders use template button', () => {
    render(<TemplatePreview template={mockTemplate} />);
    const useButtons = screen.getAllByText('Use Template');
    expect(useButtons.length).toBeGreaterThan(0);
  });

  it('renders clone template button', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('Clone Template')).toBeInTheDocument();
  });

  it('renders export button', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('renders file json icon on export button', () => {
    render(<TemplatePreview template={mockTemplate} />);
    expect(screen.getByTestId('file-json-icon')).toBeInTheDocument();
  });
});

describe('TemplatePreview integration tests', () => {
  it('displays complete template information', () => {
    render(<TemplatePreview template={mockTemplate} />);

    // Header
    expect(screen.getByText('Advanced Data Processing')).toBeInTheDocument();
    expect(
      screen.getByText('Comprehensive data processing workflow with ETL operations')
    ).toBeInTheDocument();

    // Metadata
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('125 ratings')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('uses')).toBeInTheDocument();

    // Tabs
    expect(screen.getByTestId('tabs-trigger-overview')).toBeInTheDocument();
    expect(screen.getByTestId('tabs-trigger-workflow')).toBeInTheDocument();
    expect(screen.getByTestId('tabs-trigger-metadata')).toBeInTheDocument();

    // Actions
    const useButtons = screen.getAllByText('Use Template');
    expect(useButtons.length).toBeGreaterThan(0);
  });

  it('handles git template with all git information', () => {
    render(<TemplatePreview template={mockGitTemplate} />);

    expect(
      screen.getByText('https://github.com/workflows/advanced-processing.git')
    ).toBeInTheDocument();
    expect(screen.getByText('Branch: main')).toBeInTheDocument();
    expect(screen.getByText(/Last sync:/)).toBeInTheDocument();
  });

  it('handles template with complex workflow settings', () => {
    render(<TemplatePreview template={mockTemplate} />);

    expect(screen.getByText(/"timeout": 30000/)).toBeInTheDocument();
    expect(screen.getByText(/"retries": 3/)).toBeInTheDocument();
    expect(screen.getByText(/"parallel": false/)).toBeInTheDocument();
  });

  it('handles template with many tags', () => {
    render(<TemplatePreview template={mockTemplate} />);

    expect(screen.getByText('etl')).toBeInTheDocument();
    expect(screen.getByText('data')).toBeInTheDocument();
    expect(screen.getByText('processing')).toBeInTheDocument();
    expect(screen.getByText('automation')).toBeInTheDocument();
  });

  it('renders template metadata in correct format', () => {
    render(<TemplatePreview template={mockTemplate} />);

    // Check for formatted metadata
    expect(screen.getByText(/"rating": 4.8/)).toBeInTheDocument();
    expect(screen.getByText(/"ratingCount": 125/)).toBeInTheDocument();
    expect(screen.getByText(/"usageCount": 500/)).toBeInTheDocument();
    expect(screen.getByText(/"isOfficial": true/)).toBeInTheDocument();
  });

  it('displays workflow nodes and edges count', () => {
    render(<TemplatePreview template={mockTemplate} />);

    expect(screen.getByText('Nodes:')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Edges:')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows all action buttons', () => {
    render(<TemplatePreview template={mockTemplate} />);

    const useButtons = screen.getAllByText('Use Template');
    expect(useButtons.length).toBeGreaterThan(0);
    expect(screen.getByText('Clone Template')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });
});

describe('TemplatePreview - Edge Cases', () => {
  it('handles template with no tags', () => {
    const templateWithoutTags: WorkflowTemplate = {
      ...mockTemplate,
      tags: [],
    };

    render(<TemplatePreview template={templateWithoutTags} />);
    expect(screen.getByText('Tags')).toBeInTheDocument();
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
    expect(screen.getByText('Nodes:')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
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
    expect(screen.getByText('Edges:')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('handles template with empty settings', () => {
    const templateWithEmptySettings: WorkflowTemplate = {
      ...mockTemplate,
      workflow: {
        ...mockTemplate.workflow,
        settings: {},
      },
    };

    render(<TemplatePreview template={templateWithEmptySettings} />);
    expect(screen.getByText('Workflow Settings')).toBeInTheDocument();
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
    expect(screen.queryByText('Official')).not.toBeInTheDocument();
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
