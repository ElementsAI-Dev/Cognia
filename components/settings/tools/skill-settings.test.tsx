/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkillSettings } from './skill-settings';

// Mock dependencies
jest.mock('@/lib/utils', () => ({
  cn: (...args: (string | boolean | undefined | null)[]) =>
    args.filter(Boolean).join(' '),
}));

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

// Mock SkillDiscovery and SkillMarketplace
jest.mock('@/components/skills/skill-discovery', () => ({
  SkillDiscovery: () => <div data-testid="skill-discovery">Discovery</div>,
}));

jest.mock('@/components/skills/skill-marketplace', () => ({
  SkillMarketplace: () => <div data-testid="skill-marketplace">Marketplace</div>,
}));

// Mock skill-icons
jest.mock('./skill-icons', () => ({
  SKILL_CATEGORY_ICONS: {
    'creative-design': <span data-testid="icon-creative">🎨</span>,
    development: <span data-testid="icon-dev">💻</span>,
    enterprise: <span data-testid="icon-enterprise">🏢</span>,
    productivity: <span data-testid="icon-productivity">⚡</span>,
    'data-analysis': <span data-testid="icon-data">📊</span>,
    communication: <span data-testid="icon-comm">💬</span>,
    meta: <span data-testid="icon-meta">⚙️</span>,
    custom: <span data-testid="icon-custom">📄</span>,
  },
}));

jest.mock('@/lib/settings/tools', () => ({
  SKILL_CATEGORY_KEYS: {
    'creative-design': 'creativeDesign',
    development: 'development',
    enterprise: 'enterprise',
    productivity: 'productivity',
    'data-analysis': 'dataAnalysis',
    communication: 'communication',
    meta: 'meta',
    custom: 'custom',
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Plus: () => <span data-testid="icon-plus">+</span>,
  Sparkles: () => <span data-testid="icon-sparkles">✨</span>,
  Search: () => <span data-testid="icon-search">🔍</span>,
  X: () => <span data-testid="icon-x">✕</span>,
  AlertCircle: () => <span data-testid="icon-alert">⚠️</span>,
  BookOpen: () => <span data-testid="icon-book">📖</span>,
  Upload: () => <span data-testid="icon-upload">📤</span>,
  Grid3X3: () => <span data-testid="icon-grid">⊞</span>,
  List: () => <span data-testid="icon-list">☰</span>,
  Zap: () => <span data-testid="icon-zap">⚡</span>,
  Edit2: () => <span data-testid="icon-edit">Edit</span>,
  Trash2: () => <span data-testid="icon-trash">Trash</span>,
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
  Button: ({ children, onClick, disabled, variant, size, className }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} data-size={size} className={className}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <span data-testid="badge" data-variant={variant} className={className}>{children}</span>
  ),
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (v: boolean) => void }) => (
    <button role="switch" aria-checked={checked ? 'true' : 'false'} onClick={() => onCheckedChange?.(!checked)} data-testid="switch">
      Switch
    </button>
  ),
}));

jest.mock('@/components/ui/input-group', () => ({
  InputGroup: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="input-group" className={className}>{children}</div>
  ),
  InputGroupAddon: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  InputGroupInput: ({ value, onChange, placeholder, className }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input value={value} onChange={onChange} placeholder={placeholder} className={className} data-testid="input" />
  ),
  InputGroupButton: ({ children, onClick, size }: { children: React.ReactNode; onClick?: () => void; size?: string }) => (
    <button onClick={onClick} data-size={size}>{children}</button>
  ),
}));

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => <div data-testid="skeleton" className={className} />,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: ({ orientation, className }: { orientation?: string; className?: string }) => (
    <hr data-testid="separator" data-orientation={orientation} className={className} />
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

jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
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

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="alert-dialog" data-open={open}>{children}</div>
  ),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
}));

jest.mock('@/components/layout/feedback/empty-state', () => ({
  EmptyState: ({ title, description }: { icon?: React.ComponentType; title: string; description: string }) => (
    <div data-testid="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  ),
}));

describe('SkillSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('displays skill cards with names', () => {
    render(<SkillSettings />);
    expect(screen.getByText('test-skill')).toBeInTheDocument();
    expect(screen.getByText('builtin-skill')).toBeInTheDocument();
  });

  it('displays skill descriptions in cards', () => {
    render(<SkillSettings />);
    expect(screen.getByText('A test skill for development')).toBeInTheDocument();
    expect(screen.getByText('A built-in skill')).toBeInTheDocument();
  });

  it('displays Built-in badge for builtin skills', () => {
    render(<SkillSettings />);
    expect(screen.getAllByText('Built-in').length).toBeGreaterThan(0);
  });

  it('displays category labels in group headers', () => {
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
    expect(switches.length).toBeGreaterThanOrEqual(2);
  });

  it('displays Activate/Deactivate buttons', () => {
    render(<SkillSettings />);
    expect(screen.getAllByText('Activate').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Deactivate').length).toBeGreaterThan(0);
  });

  it('displays view toggle buttons (grid/list)', () => {
    render(<SkillSettings />);
    expect(screen.getByTestId('icon-grid')).toBeInTheDocument();
    expect(screen.getByTestId('icon-list')).toBeInTheDocument();
  });

  it('displays stats summary', () => {
    render(<SkillSettings />);
    // 2 skills total, 2 enabled, 1 active - stats show in header
    expect(screen.getAllByText(/2/).length).toBeGreaterThan(0);
  });

  it('displays separators in category headers', () => {
    render(<SkillSettings />);
    const separators = screen.getAllByTestId('separator');
    expect(separators.length).toBeGreaterThan(0);
  });

  it('displays tabs for my-skills, discover, marketplace', () => {
    render(<SkillSettings />);
    expect(screen.getByText('My Skills')).toBeInTheDocument();
    expect(screen.getAllByText('Discover').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Marketplace').length).toBeGreaterThan(0);
  });

  it('renders SkillDiscovery in discover tab', () => {
    render(<SkillSettings />);
    expect(screen.getByTestId('skill-discovery')).toBeInTheDocument();
  });

  it('renders SkillMarketplace in marketplace tab', () => {
    render(<SkillSettings />);
    expect(screen.getByTestId('skill-marketplace')).toBeInTheDocument();
  });

  it('displays usage count for skills with usage', () => {
    render(<SkillSettings />);
    expect(screen.getByText('5x')).toBeInTheDocument();
    expect(screen.getByText('10x')).toBeInTheDocument();
  });

  it('displays edit icon buttons', () => {
    render(<SkillSettings />);
    expect(screen.getAllByTestId('icon-edit').length).toBeGreaterThan(0);
  });

  it('displays delete icon for custom skills only', () => {
    render(<SkillSettings />);
    // Only skill-1 is custom, skill-2 is builtin
    expect(screen.getAllByTestId('icon-trash').length).toBe(1);
  });

  it('displays Create New Skill dialog', () => {
    render(<SkillSettings />);
    expect(screen.getByText('Create New Skill')).toBeInTheDocument();
  });

  it('displays Import Skill dialog', () => {
    render(<SkillSettings />);
    expect(screen.getByText('Import Skill')).toBeInTheDocument();
  });

  it('displays Cancel button in dialogs', () => {
    render(<SkillSettings />);
    expect(screen.getAllByText('Cancel').length).toBeGreaterThan(0);
  });

  it('displays delete confirmation dialog', () => {
    render(<SkillSettings />);
    expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
  });
});
