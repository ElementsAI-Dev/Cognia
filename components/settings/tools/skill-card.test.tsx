/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkillCard } from './skill-card';
import type { Skill } from '@/types/system/skill';

// Mock dependencies
jest.mock('@/lib/utils', () => ({
  cn: (...args: (string | boolean | undefined | null)[]) =>
    args.filter(Boolean).join(' '),
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
  Edit2: () => <span data-testid="icon-edit">Edit</span>,
  Trash2: () => <span data-testid="icon-trash">Trash</span>,
  AlertCircle: () => <span data-testid="icon-alert">Alert</span>,
  Zap: () => <span data-testid="icon-zap">Zap</span>,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    variant,
    size,
    className,
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button onClick={onClick} data-variant={variant} data-size={size} className={className}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <span data-testid="badge" data-variant={variant} className={className}>
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
      aria-checked={checked ? 'true' : 'false'}
      onClick={() => onCheckedChange?.(!checked)}
      data-testid="switch"
    >
      Switch
    </button>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span data-testid="tooltip-content">{children}</span>,
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <span data-testid="tooltip-trigger" data-as-child={asChild}>{children}</span>
  ),
}));

// Mock translations - cast to any to avoid complex Translator type
const mockT = ((key: string) => {
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
 
}) as any;

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

  const defaultProps = {
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
    onToggle: mockOnToggle,
    onActivate: mockOnActivate,
    t: mockT,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Grid variant (default)', () => {
    it('renders skill name', () => {
      render(<SkillCard skill={createMockSkill()} {...defaultProps} />);
      expect(screen.getByText('test-skill')).toBeInTheDocument();
    });

    it('renders skill description', () => {
      render(<SkillCard skill={createMockSkill()} {...defaultProps} />);
      expect(screen.getByText('A test skill for testing')).toBeInTheDocument();
    });

    it('renders category icon', () => {
      render(<SkillCard skill={createMockSkill()} {...defaultProps} />);
      expect(screen.getByTestId('icon-dev')).toBeInTheDocument();
    });

    it('renders switch toggle', () => {
      render(<SkillCard skill={createMockSkill()} {...defaultProps} />);
      expect(screen.getByTestId('switch')).toBeInTheDocument();
    });

    it('renders switch as checked for enabled skills', () => {
      render(<SkillCard skill={createMockSkill({ status: 'enabled' })} {...defaultProps} />);
      expect(screen.getByTestId('switch')).toHaveAttribute('aria-checked', 'true');
    });

    it('renders switch as unchecked for disabled skills', () => {
      render(<SkillCard skill={createMockSkill({ status: 'disabled' })} {...defaultProps} />);
      expect(screen.getByTestId('switch')).toHaveAttribute('aria-checked', 'false');
    });

    it('calls onToggle when switch is clicked', () => {
      render(<SkillCard skill={createMockSkill()} {...defaultProps} />);
      fireEvent.click(screen.getByTestId('switch'));
      expect(mockOnToggle).toHaveBeenCalled();
    });

    it('renders Built-in badge for builtin skills', () => {
      render(<SkillCard skill={createMockSkill({ source: 'builtin' })} {...defaultProps} />);
      expect(screen.getByText('Built-in')).toBeInTheDocument();
    });

    it('does not render Built-in badge for custom skills', () => {
      render(<SkillCard skill={createMockSkill({ source: 'custom' })} {...defaultProps} />);
      expect(screen.queryByText('Built-in')).not.toBeInTheDocument();
    });

    it('renders category badge', () => {
      render(<SkillCard skill={createMockSkill()} {...defaultProps} />);
      expect(screen.getByText('Development')).toBeInTheDocument();
    });

    it('renders first 2 tags', () => {
      render(<SkillCard skill={createMockSkill({ tags: ['tag1', 'tag2', 'tag3', 'tag4'] })} {...defaultProps} />);
      expect(screen.getByText('tag1')).toBeInTheDocument();
      expect(screen.getByText('tag2')).toBeInTheDocument();
    });

    it('renders +N badge when more than 2 tags', () => {
      render(<SkillCard skill={createMockSkill({ tags: ['tag1', 'tag2', 'tag3', 'tag4'] })} {...defaultProps} />);
      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('renders error badge when validation errors present', () => {
      render(
        <SkillCard
          skill={createMockSkill({
            validationErrors: [
              { field: 'name', message: 'Missing', severity: 'error' },
              { field: 'content', message: 'Invalid', severity: 'warning' },
            ],
          })}
          {...defaultProps}
        />
      );
      // Error count badge
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('does not render error badge when no validation errors', () => {
      render(<SkillCard skill={createMockSkill({ validationErrors: [] })} {...defaultProps} />);
      const badges = screen.getAllByTestId('badge');
      const errorBadge = badges.find(b => b.getAttribute('data-variant') === 'destructive');
      expect(errorBadge).toBeUndefined();
    });

    it('renders Activate button for inactive skills', () => {
      render(<SkillCard skill={createMockSkill({ isActive: false })} {...defaultProps} />);
      expect(screen.getAllByText('Activate').length).toBeGreaterThan(0);
    });

    it('renders Deactivate button for active skills', () => {
      render(<SkillCard skill={createMockSkill({ isActive: true })} {...defaultProps} />);
      expect(screen.getAllByText('Deactivate').length).toBeGreaterThan(0);
    });

    it('calls onActivate when activate button is clicked', () => {
      render(<SkillCard skill={createMockSkill({ isActive: false })} {...defaultProps} />);
      fireEvent.click(screen.getAllByText('Activate')[0]);
      expect(mockOnActivate).toHaveBeenCalled();
    });

    it('renders edit icon button', () => {
      render(<SkillCard skill={createMockSkill()} {...defaultProps} />);
      expect(screen.getByTestId('icon-edit')).toBeInTheDocument();
    });

    it('renders delete icon button for custom skills', () => {
      render(<SkillCard skill={createMockSkill({ source: 'custom' })} {...defaultProps} />);
      expect(screen.getByTestId('icon-trash')).toBeInTheDocument();
    });

    it('does not render delete button for builtin skills', () => {
      render(<SkillCard skill={createMockSkill({ source: 'builtin' })} {...defaultProps} />);
      expect(screen.queryByTestId('icon-trash')).not.toBeInTheDocument();
    });

    it('renders usage count indicator', () => {
      render(<SkillCard skill={createMockSkill({ usageCount: 10 })} {...defaultProps} />);
      expect(screen.getByText('10x')).toBeInTheDocument();
    });

    it('does not render usage count when zero', () => {
      render(<SkillCard skill={createMockSkill({ usageCount: 0 })} {...defaultProps} />);
      expect(screen.queryByText('0x')).not.toBeInTheDocument();
    });

    it('calls onEdit when card is clicked', () => {
      const { container } = render(<SkillCard skill={createMockSkill()} {...defaultProps} />);
      // Click on the card root div (first child)
      const cardRoot = container.firstChild as HTMLElement;
      fireEvent.click(cardRoot);
      expect(mockOnEdit).toHaveBeenCalled();
    });

    it('renders green dot indicator for active skills', () => {
      const { container } = render(<SkillCard skill={createMockSkill({ isActive: true })} {...defaultProps} />);
      const greenDot = container.querySelector('.bg-green-500');
      expect(greenDot).toBeInTheDocument();
    });

    it('does not render green dot for inactive skills', () => {
      const { container } = render(<SkillCard skill={createMockSkill({ isActive: false })} {...defaultProps} />);
      const greenDot = container.querySelector('.bg-green-500.rounded-full');
      expect(greenDot).not.toBeInTheDocument();
    });
  });

  describe('List variant', () => {
    it('renders skill name in list mode', () => {
      render(<SkillCard skill={createMockSkill()} variant="list" {...defaultProps} />);
      expect(screen.getByText('test-skill')).toBeInTheDocument();
    });

    it('renders description in list mode', () => {
      render(<SkillCard skill={createMockSkill()} variant="list" {...defaultProps} />);
      expect(screen.getByText('A test skill for testing')).toBeInTheDocument();
    });

    it('renders category icon in list mode', () => {
      render(<SkillCard skill={createMockSkill()} variant="list" {...defaultProps} />);
      expect(screen.getByTestId('icon-dev')).toBeInTheDocument();
    });

    it('renders switch in list mode', () => {
      render(<SkillCard skill={createMockSkill()} variant="list" {...defaultProps} />);
      expect(screen.getByTestId('switch')).toBeInTheDocument();
    });

    it('renders activate/deactivate button in list mode', () => {
      render(<SkillCard skill={createMockSkill({ isActive: false })} variant="list" {...defaultProps} />);
      expect(screen.getByTestId('icon-zap')).toBeInTheDocument();
    });

    it('renders Built-in badge in list mode', () => {
      render(<SkillCard skill={createMockSkill({ source: 'builtin' })} variant="list" {...defaultProps} />);
      expect(screen.getByText('Built-in')).toBeInTheDocument();
    });

    it('renders error indicator in list mode', () => {
      render(
        <SkillCard
          skill={createMockSkill({
            validationErrors: [{ field: 'name', message: 'err', severity: 'error' }],
          })}
          variant="list"
          {...defaultProps}
        />
      );
      expect(screen.getByTestId('icon-alert')).toBeInTheDocument();
    });

    it('calls onEdit when list item is clicked', () => {
      const { container } = render(<SkillCard skill={createMockSkill()} variant="list" {...defaultProps} />);
      const listRoot = container.firstChild as HTMLElement;
      fireEvent.click(listRoot);
      expect(mockOnEdit).toHaveBeenCalled();
    });

    it('calls onToggle when switch clicked in list mode', () => {
      render(<SkillCard skill={createMockSkill()} variant="list" {...defaultProps} />);
      fireEvent.click(screen.getByTestId('switch'));
      expect(mockOnToggle).toHaveBeenCalled();
    });
  });
});
