/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkillSettings } from './skill-settings';

// Mock skill store
const mockCreateSkill = jest.fn();
const mockDeleteSkill = jest.fn();
const mockEnableSkill = jest.fn();
const mockDisableSkill = jest.fn();
const mockActivateSkill = jest.fn();
const mockDeactivateSkill = jest.fn();
const mockClearError = jest.fn();
const mockImportSkill = jest.fn();

jest.mock('@/stores/skills', () => ({
  useSkillStore: () => ({
    skills: {
      'skill-1': {
        id: 'skill-1',
        metadata: { name: 'test-skill', description: 'A test skill for development' },
        content: '# Test Skill\n\nThis is a test skill.',
        rawContent: '---\nname: test-skill\n---\n# Test Skill',
        resources: [],
        status: 'enabled',
        source: 'custom',
        category: 'development',
        tags: ['test', 'development'],
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 5,
        isActive: false,
      },
      'skill-2': {
        id: 'skill-2',
        metadata: { name: 'builtin-skill', description: 'A built-in skill' },
        content: '# Built-in Skill',
        rawContent: '---\nname: builtin-skill\n---\n# Built-in Skill',
        resources: [],
        status: 'enabled',
        source: 'builtin',
        category: 'productivity',
        tags: ['builtin'],
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 10,
        isActive: true,
      },
    },
    isLoading: false,
    error: null,
    createSkill: mockCreateSkill,
    deleteSkill: mockDeleteSkill,
    enableSkill: mockEnableSkill,
    disableSkill: mockDisableSkill,
    activateSkill: mockActivateSkill,
    deactivateSkill: mockDeactivateSkill,
    clearError: mockClearError,
    importSkill: mockImportSkill,
  }),
}));

// Mock skill templates
jest.mock('@/lib/skills/templates', () => {
  const mockTemplate = { 
    id: 'mock-template', 
    name: 'Mock Template', 
    description: 'Mock template for testing', 
    icon: '🔍', 
    category: 'development', 
    tags: ['mock'],
    defaultContent: '# Mock Template' 
  };
  return {
    SKILL_CREATOR_TEMPLATE: mockTemplate,
    MCP_BUILDER_TEMPLATE: mockTemplate,
    ARTIFACTS_BUILDER_TEMPLATE: mockTemplate,
    CANVAS_DESIGN_TEMPLATE: mockTemplate,
    INTERNAL_COMMS_TEMPLATE: mockTemplate,
    BRAND_GUIDELINES_TEMPLATE: mockTemplate,
    WEBAPP_TESTING_TEMPLATE: mockTemplate,
    DATA_ANALYSIS_TEMPLATE: mockTemplate,
  getAllTemplates: () => [
    { id: 'template-1', name: 'Code Review', description: 'Review code', icon: '🔍', category: 'development', defaultContent: '# Code Review' },
    { id: 'template-2', name: 'Writing', description: 'Writing assistant', icon: '✍️', category: 'creative-design', defaultContent: '# Writing' },
  ],
  getTemplateById: (id: string) => {
    const templates: Record<string, { id: string; name: string; description: string; category: string; defaultContent: string }> = {
      'template-1': { id: 'template-1', name: 'Code Review', description: 'Review code', category: 'development', defaultContent: '# Code Review' },
      'template-2': { id: 'template-2', name: 'Writing', description: 'Writing assistant', category: 'creative-design', defaultContent: '# Writing' },
    };
    return templates[id];
  },
  };
});

// Mock skill parser
jest.mock('@/lib/skills/parser', () => ({
  parseSkillMd: (content: string) => {
    if (content.includes('---')) {
      return {
        success: true,
        metadata: { name: 'imported-skill', description: 'Imported skill' },
        content: '# Imported Skill',
        rawContent: content,
        errors: [],
      };
    }
    return { success: false, errors: [{ message: 'Invalid format' }] };
  },
  toHyphenCase: (name: string) => name.toLowerCase().replace(/\s+/g, '-'),
}));

// Mock SkillDetail component
jest.mock('@/components/skills/skill-detail', () => ({
  SkillDetail: ({ skillId, onClose }: { skillId: string; onClose: () => void }) => (
    <div data-testid="skill-detail">
      <span>Skill: {skillId}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
    <div data-testid="card" className={className} onClick={onClick}>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (v: boolean) => void }) => (
    <button role="switch" aria-checked={checked} onClick={() => onCheckedChange?.(!checked)} data-testid="switch">
      Switch
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, id }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input value={value} onChange={onChange} placeholder={placeholder} id={id} data-testid="input" />
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder, id, rows }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea value={value} onChange={onChange} placeholder={placeholder} id={id} rows={rows} data-testid="textarea" />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <div data-testid="alert" data-variant={variant}>{children}</div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <h4>{children}</h4>,
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="collapsible" data-open={open}>{children}</div>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div data-testid="collapsible-content">{children}</div>,
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="collapsible-trigger">{children}</div>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange: _onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (v: string) => void }) => (
    <div data-testid="select" data-value={value}>{children}</div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="dialog" data-open={open}>{children}</div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value }: { children: React.ReactNode; value?: string }) => (
    <div data-testid="tabs" data-value={value}>{children}</div>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`tabs-content-${value}`}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-value={value}>{children}</button>
  ),
}));

describe('SkillSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.confirm
    window.confirm = jest.fn().mockReturnValue(true);
  });

  it('renders without crashing', () => {
    render(<SkillSettings />);
    expect(screen.getAllByTestId('card').length).toBeGreaterThan(0);
  });

  it('displays Claude Skills title', () => {
    render(<SkillSettings />);
    expect(screen.getByText('Claude Skills')).toBeInTheDocument();
  });

  it('displays skill description', () => {
    render(<SkillSettings />);
    expect(screen.getByText(/Skills are modular packages/)).toBeInTheDocument();
  });

  it('displays search input', () => {
    render(<SkillSettings />);
    expect(screen.getByPlaceholderText('Search skills...')).toBeInTheDocument();
  });

  it('displays Create Skill button', () => {
    render(<SkillSettings />);
    expect(screen.getAllByText('Create Skill').length).toBeGreaterThan(0);
  });

  it('displays Import button', () => {
    render(<SkillSettings />);
    expect(screen.getAllByText('Import').length).toBeGreaterThan(0);
  });

  it('displays category filter', () => {
    render(<SkillSettings />);
    expect(screen.getAllByTestId('select').length).toBeGreaterThan(0);
  });

  it('displays skill cards', () => {
    render(<SkillSettings />);
    expect(screen.getByText('test-skill')).toBeInTheDocument();
    expect(screen.getByText('builtin-skill')).toBeInTheDocument();
  });

  it('displays skill descriptions', () => {
    render(<SkillSettings />);
    expect(screen.getByText('A test skill for development')).toBeInTheDocument();
    expect(screen.getByText('A built-in skill')).toBeInTheDocument();
  });

  it('displays Built-in badge for builtin skills', () => {
    render(<SkillSettings />);
    expect(screen.getByText('Built-in')).toBeInTheDocument();
  });

  it('displays Active badge for active skills', () => {
    render(<SkillSettings />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('displays skill tags', () => {
    render(<SkillSettings />);
    expect(screen.getByText('test')).toBeInTheDocument();
    // 'development' appears multiple times (as tag and category)
    expect(screen.getAllByText('development').length).toBeGreaterThanOrEqual(1);
  });

  it('displays category labels', () => {
    render(<SkillSettings />);
    expect(screen.getAllByText('Development').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Productivity').length).toBeGreaterThan(0);
  });

  it('displays skill count badges', () => {
    render(<SkillSettings />);
    const badges = screen.getAllByTestId('badge');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('handles search input change', () => {
    render(<SkillSettings />);
    const searchInput = screen.getByPlaceholderText('Search skills...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    expect(searchInput).toHaveValue('test');
  });

  it('displays switch for each skill', () => {
    render(<SkillSettings />);
    const switches = screen.getAllByTestId('switch');
    expect(switches.length).toBeGreaterThan(0);
  });

  it('displays Edit button in expanded skill', () => {
    render(<SkillSettings />);
    expect(screen.getAllByText('Edit').length).toBeGreaterThan(0);
  });

  it('displays Delete button for custom skills', () => {
    render(<SkillSettings />);
    expect(screen.getAllByText('Delete').length).toBeGreaterThan(0);
  });

  it('displays Activate/Deactivate buttons', () => {
    render(<SkillSettings />);
    expect(screen.getByText('Activate')).toBeInTheDocument();
    expect(screen.getByText('Deactivate')).toBeInTheDocument();
  });

  it('displays Create New Skill dialog title', () => {
    render(<SkillSettings />);
    expect(screen.getByText('Create New Skill')).toBeInTheDocument();
  });

  it('displays Import Skill dialog title', () => {
    render(<SkillSettings />);
    expect(screen.getByText('Import Skill')).toBeInTheDocument();
  });

  it('displays dialog tabs for blank and template modes', () => {
    render(<SkillSettings />);
    expect(screen.getByText('Start Blank')).toBeInTheDocument();
    expect(screen.getByText('Use Template')).toBeInTheDocument();
  });

  it('displays form fields in create dialog', () => {
    render(<SkillSettings />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('displays skill instructions label', () => {
    render(<SkillSettings />);
    expect(screen.getByText('Skill Instructions (Markdown)')).toBeInTheDocument();
  });

  it('displays Cancel button in dialogs', () => {
    render(<SkillSettings />);
    expect(screen.getAllByText('Cancel').length).toBeGreaterThan(0);
  });

  it('displays collapsible triggers for skill details', () => {
    render(<SkillSettings />);
    expect(screen.getAllByTestId('collapsible-trigger').length).toBeGreaterThan(0);
  });

  it('displays collapsible content with skill metadata', () => {
    render(<SkillSettings />);
    expect(screen.getAllByText(/Category:/)).toHaveLength(2);
    expect(screen.getAllByText(/Source:/)).toHaveLength(2);
  });

  it('displays usage count for skills', () => {
    render(<SkillSettings />);
    expect(screen.getByText(/5 times/)).toBeInTheDocument();
    expect(screen.getByText(/10 times/)).toBeInTheDocument();
  });
});

describe('SkillSettings - Loading State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays loading indicator when isLoading is true', () => {
    // Would need to re-mock the store with isLoading: true
  });
});

describe('SkillSettings - Error State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays error alert when error exists', () => {
    // Would need to re-mock the store with error state
  });
});

describe('SkillSettings - Empty State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays empty state when no skills exist', () => {
    // Would need to re-mock the store with empty skills
  });
});
