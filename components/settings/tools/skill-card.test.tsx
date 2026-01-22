/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkillCard } from './skill-card';
import type { Skill } from '@/types/system/skill';

// Mock dependencies
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

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ChevronDown: () => <span data-testid="icon-chevron-down">▼</span>,
  ChevronRight: () => <span data-testid="icon-chevron-right">▶</span>,
  Edit2: () => <span data-testid="icon-edit">Edit</span>,
  Trash2: () => <span data-testid="icon-trash">Trash</span>,
  AlertCircle: () => <span data-testid="icon-alert">Alert</span>,
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="card-description">{children}</p>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3 data-testid="card-title">{children}</h3>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    variant,
    size,
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button onClick={onClick} data-variant={variant} data-size={size}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (v: boolean) => void;
  }) => (
    <button
      role="switch"
      aria-checked={String(checked)}
      onClick={() => onCheckedChange?.(!checked)}
      data-testid="switch"
    >
      Switch
    </button>
  ),
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div data-testid="collapsible" data-open={open} onClick={() => onOpenChange?.(!open)}>
      {children}
    </div>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="collapsible-content">{children}</div>
  ),
  CollapsibleTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="collapsible-trigger" data-as-child={asChild}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <div data-testid="alert" data-variant={variant} role="alert">
      {children}
    </div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <h4>{children}</h4>,
}));

// Mock translations
const mockT = (key: string) => {
  const translations: Record<string, string> = {
    builtin: 'Built-in',
    active: 'Active',
    category: 'Category',
    source: 'Source',
    version: 'Version',
    used: 'Used',
    times: 'times',
    validationErrors: 'Validation Errors',
    activate: 'Activate',
    deactivate: 'Deactivate',
    edit: 'Edit',
    delete: 'Delete',
    'categories.development': 'Development',
    'categories.custom': 'Custom',
    'categories.productivity': 'Productivity',
  };
  return translations[key] || key;
};

// Sample skill data
const createMockSkill = (overrides: Partial<Skill> = {}): Skill => ({
  id: 'skill-1',
  metadata: { name: 'test-skill', description: 'A test skill for testing' },
  content: '# Test Skill',
  rawContent: '---\nname: test-skill\n---',
  resources: [],
  status: 'enabled',
  source: 'custom',
  category: 'development',
  tags: ['test', 'development', 'coding'],
  version: '1.0.0',
  createdAt: new Date(),
  updatedAt: new Date(),
  usageCount: 5,
  isActive: false,
  ...overrides,
});

describe('SkillCard', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnToggle = jest.fn();
  const mockOnActivate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders card', () => {
    render(
      <SkillCard
        skill={createMockSkill()}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('displays skill name', () => {
    render(
      <SkillCard
        skill={createMockSkill()}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    expect(screen.getByText('test-skill')).toBeInTheDocument();
  });

  it('displays skill description', () => {
    render(
      <SkillCard
        skill={createMockSkill()}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    expect(screen.getByText('A test skill for testing')).toBeInTheDocument();
  });

  it('displays category icon', () => {
    render(
      <SkillCard
        skill={createMockSkill()}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    expect(screen.getByTestId('icon-dev')).toBeInTheDocument();
  });

  it('displays Built-in badge for builtin skills', () => {
    render(
      <SkillCard
        skill={createMockSkill({ source: 'builtin' })}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    expect(screen.getByText('Built-in')).toBeInTheDocument();
  });

  it('does not display Built-in badge for custom skills', () => {
    render(
      <SkillCard
        skill={createMockSkill({ source: 'custom' })}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    expect(screen.queryByText('Built-in')).not.toBeInTheDocument();
  });

  it('displays Active badge for active skills', () => {
    render(
      <SkillCard
        skill={createMockSkill({ isActive: true })}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('does not display Active badge for inactive skills', () => {
    render(
      <SkillCard
        skill={createMockSkill({ isActive: false })}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
  });

  it('displays switch toggle', () => {
    render(
      <SkillCard
        skill={createMockSkill()}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    expect(screen.getByTestId('switch')).toBeInTheDocument();
  });

  it('calls onToggle when switch is clicked', () => {
    render(
      <SkillCard
        skill={createMockSkill()}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    fireEvent.click(screen.getByTestId('switch'));
    expect(mockOnToggle).toHaveBeenCalled();
  });

  it('displays first 3 tags', () => {
    render(
      <SkillCard
        skill={createMockSkill({ tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'] })}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
    expect(screen.getByText('tag3')).toBeInTheDocument();
  });

  it('displays +N badge when more than 3 tags', () => {
    render(
      <SkillCard
        skill={createMockSkill({ tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'] })}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('displays collapsible trigger', () => {
    render(
      <SkillCard
        skill={createMockSkill()}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    expect(screen.getByTestId('collapsible-trigger')).toBeInTheDocument();
  });

  it('displays collapsible content', () => {
    render(
      <SkillCard
        skill={createMockSkill()}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    expect(screen.getByTestId('collapsible-content')).toBeInTheDocument();
  });

  it('displays category label in expanded view', () => {
    render(
      <SkillCard
        skill={createMockSkill()}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    expect(screen.getByText('Category:')).toBeInTheDocument();
  });

  it('displays source in expanded view', () => {
    render(
      <SkillCard
        skill={createMockSkill()}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    expect(screen.getByText('Source:')).toBeInTheDocument();
    expect(screen.getByText('custom')).toBeInTheDocument();
  });

  it('displays version when available', () => {
    render(
      <SkillCard
        skill={createMockSkill({ version: '2.0.0' })}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    expect(screen.getByText('Version:')).toBeInTheDocument();
    expect(screen.getByText('2.0.0')).toBeInTheDocument();
  });

  it('displays usage count when available', () => {
    render(
      <SkillCard
        skill={createMockSkill({ usageCount: 10 })}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    expect(screen.getByText('Used:')).toBeInTheDocument();
    expect(screen.getByText(/10/)).toBeInTheDocument();
    expect(screen.getByText('times')).toBeInTheDocument();
  });

  it('displays Edit button', () => {
    render(
      <SkillCard
        skill={createMockSkill()}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('calls onEdit when Edit button is clicked', () => {
    render(
      <SkillCard
        skill={createMockSkill()}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    fireEvent.click(screen.getByText('Edit'));
    expect(mockOnEdit).toHaveBeenCalled();
  });

  it('displays Delete button for custom skills', () => {
    render(
      <SkillCard
        skill={createMockSkill({ source: 'custom' })}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('does not display Delete button for builtin skills', () => {
    render(
      <SkillCard
        skill={createMockSkill({ source: 'builtin' })}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('calls onDelete when Delete button is clicked', () => {
    render(
      <SkillCard
        skill={createMockSkill({ source: 'custom' })}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    fireEvent.click(screen.getByText('Delete'));
    expect(mockOnDelete).toHaveBeenCalled();
  });

  it('displays Activate button for inactive skills', () => {
    render(
      <SkillCard
        skill={createMockSkill({ isActive: false })}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    expect(screen.getByText('Activate')).toBeInTheDocument();
  });

  it('displays Deactivate button for active skills', () => {
    render(
      <SkillCard
        skill={createMockSkill({ isActive: true })}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    expect(screen.getByText('Deactivate')).toBeInTheDocument();
  });

  it('calls onActivate when Activate button is clicked', () => {
    render(
      <SkillCard
        skill={createMockSkill({ isActive: false })}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    fireEvent.click(screen.getByText('Activate'));
    expect(mockOnActivate).toHaveBeenCalled();
  });

  it('displays validation errors when present', () => {
    render(
      <SkillCard
        skill={createMockSkill({
          validationErrors: [{ message: 'Missing required field' }, { message: 'Invalid syntax' }],
        })}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    expect(screen.getByText('Validation Errors')).toBeInTheDocument();
    expect(screen.getByText('Missing required field')).toBeInTheDocument();
    expect(screen.getByText('Invalid syntax')).toBeInTheDocument();
  });

  it('does not display validation errors section when no errors', () => {
    render(
      <SkillCard
        skill={createMockSkill({ validationErrors: [] })}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    expect(screen.queryByText('Validation Errors')).not.toBeInTheDocument();
  });

  it('applies opacity class when skill is disabled', () => {
    render(
      <SkillCard
        skill={createMockSkill({ status: 'disabled' })}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    const card = screen.getByTestId('card');
    expect(card.className).toContain('opacity-60');
  });

  it('does not apply opacity class when skill is enabled', () => {
    render(
      <SkillCard
        skill={createMockSkill({ status: 'enabled' })}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
        onActivate={mockOnActivate}
        t={mockT}
      />
    );
    const card = screen.getByTestId('card');
    expect(card.className).not.toContain('opacity-60');
  });
});
