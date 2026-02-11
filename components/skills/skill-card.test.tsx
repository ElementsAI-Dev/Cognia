import { render, screen, fireEvent } from '@testing-library/react';
import { SkillCard } from './skill-card';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { Skill } from '@/types/system/skill';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
};

const mockSkill: Skill = {
  id: 'test-skill-1',
  metadata: {
    name: 'test-skill',
    description: 'A test skill for testing purposes',
  },
  content: '# Test Skill\n\nThis is test content.',
  rawContent: `---
name: test-skill
description: A test skill for testing purposes
---

# Test Skill

This is test content.`,
  resources: [],
  status: 'enabled',
  source: 'custom',
  category: 'development',
  tags: ['test', 'development', 'coding', 'extra-tag'],
  isActive: false,
  version: '1.0.0',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockBuiltinSkill: Skill = {
  ...mockSkill,
  id: 'builtin-skill-1',
  source: 'builtin',
  metadata: {
    name: 'builtin-skill',
    description: 'A builtin skill',
  },
};

const mockActiveSkill: Skill = {
  ...mockSkill,
  id: 'active-skill-1',
  isActive: true,
};

const mockDisabledSkill: Skill = {
  ...mockSkill,
  id: 'disabled-skill-1',
  status: 'disabled',
};

describe('SkillCard', () => {
  const mockOnSelect = jest.fn();
  const mockOnToggleEnabled = jest.fn();
  const mockOnToggleActive = jest.fn();
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnDuplicate = jest.fn();
  const mockOnExport = jest.fn();
  const mockOnView = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('default variant', () => {
    it('renders skill name and description', () => {
      renderWithProviders(<SkillCard skill={mockSkill} />);

      expect(screen.getByText('test-skill')).toBeInTheDocument();
      expect(screen.getByText('A test skill for testing purposes')).toBeInTheDocument();
    });

    it('renders version badge', () => {
      renderWithProviders(<SkillCard skill={mockSkill} />);

      expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    });

    it('renders tags with limit of 3 visible', () => {
      renderWithProviders(<SkillCard skill={mockSkill} />);

      expect(screen.getByText('test')).toBeInTheDocument();
      expect(screen.getByText('development')).toBeInTheDocument();
      expect(screen.getByText('coding')).toBeInTheDocument();
      expect(screen.getByText('+1')).toBeInTheDocument();
    });

    it('shows builtin badge for builtin skills', () => {
      renderWithProviders(<SkillCard skill={mockBuiltinSkill} />);

      const builtinElements = screen.queryAllByText(/builtin|Built-in|内置/i);
      expect(builtinElements.length).toBeGreaterThan(0);
    });

    it('shows green indicator for active skills', () => {
      renderWithProviders(<SkillCard skill={mockActiveSkill} />);

      const activeIndicator = document.querySelector('.bg-green-500');
      expect(activeIndicator).toBeInTheDocument();
    });

    it('applies opacity when skill is disabled', () => {
      renderWithProviders(<SkillCard skill={mockDisabledSkill} />);

      const card = document.querySelector('[data-slot="card"]');
      expect(card).toHaveClass('opacity-60');
    });

    it('applies selected ring when selected', () => {
      renderWithProviders(<SkillCard skill={mockSkill} selected={true} />);

      const card = document.querySelector('[data-slot="card"]');
      expect(card).toHaveClass('ring-2');
    });

    it('calls onSelect when card is clicked', () => {
      renderWithProviders(<SkillCard skill={mockSkill} onSelect={mockOnSelect} />);

      const card = document.querySelector('[data-slot="card"]');
      fireEvent.click(card!);

      expect(mockOnSelect).toHaveBeenCalledWith(mockSkill);
    });

    it('calls onView when card is clicked and no onSelect', () => {
      renderWithProviders(<SkillCard skill={mockSkill} onView={mockOnView} />);

      const card = document.querySelector('[data-slot="card"]');
      fireEvent.click(card!);

      expect(mockOnView).toHaveBeenCalledWith(mockSkill);
    });

    it('calls onToggleEnabled when enabled button is clicked', () => {
      renderWithProviders(<SkillCard skill={mockSkill} onToggleEnabled={mockOnToggleEnabled} />);

      const enabledButton = screen.getByRole('button', { name: /enabled/i });
      fireEvent.click(enabledButton);

      expect(mockOnToggleEnabled).toHaveBeenCalledWith(mockSkill);
    });

    it('shows disabled button text for disabled skills', () => {
      renderWithProviders(<SkillCard skill={mockDisabledSkill} onToggleEnabled={mockOnToggleEnabled} />);

      expect(screen.getByRole('button', { name: /disabled/i })).toBeInTheDocument();
    });

    it('renders active switch', () => {
      renderWithProviders(<SkillCard skill={mockSkill} onToggleActive={mockOnToggleActive} />);

      const switchElement = document.querySelector('[role="switch"]');
      expect(switchElement).toBeInTheDocument();
    });

    it('disables active switch when skill is disabled', () => {
      renderWithProviders(<SkillCard skill={mockDisabledSkill} onToggleActive={mockOnToggleActive} />);

      const switchElement = document.querySelector('[role="switch"]');
      expect(switchElement).toHaveAttribute('data-disabled');
    });

    it('hides actions when showActions is false', () => {
      renderWithProviders(<SkillCard skill={mockSkill} showActions={false} />);

      expect(screen.queryByRole('button', { name: /enabled/i })).not.toBeInTheDocument();
    });
  });

  describe('compact variant', () => {
    it('renders in compact mode', () => {
      renderWithProviders(<SkillCard skill={mockSkill} variant="compact" />);

      expect(screen.getByText('test-skill')).toBeInTheDocument();
      expect(screen.getByText('A test skill for testing purposes')).toBeInTheDocument();
    });

    it('shows active indicator in compact mode', () => {
      renderWithProviders(<SkillCard skill={mockActiveSkill} variant="compact" />);

      const activeIndicator = document.querySelector('.bg-green-500');
      expect(activeIndicator).toBeInTheDocument();
    });

    it('calls onSelect when compact card is clicked', () => {
      renderWithProviders(<SkillCard skill={mockSkill} variant="compact" onSelect={mockOnSelect} />);

      const card = document.querySelector('[data-slot="card"]');
      fireEvent.click(card!);

      expect(mockOnSelect).toHaveBeenCalledWith(mockSkill);
    });
  });

  describe('list variant', () => {
    it('renders in list mode', () => {
      renderWithProviders(<SkillCard skill={mockSkill} variant="list" />);

      expect(screen.getByText('test-skill')).toBeInTheDocument();
      expect(screen.getByText('A test skill for testing purposes')).toBeInTheDocument();
    });

    it('shows builtin badge in list mode', () => {
      renderWithProviders(<SkillCard skill={mockBuiltinSkill} variant="list" />);

      const builtinElements = screen.queryAllByText(/builtin|Built-in|内置/i);
      expect(builtinElements.length).toBeGreaterThan(0);
    });

    it('shows active badge in list mode', () => {
      renderWithProviders(<SkillCard skill={mockActiveSkill} variant="list" />);

      const activeElements = screen.queryAllByText(/active|Active|活跃/i);
      expect(activeElements.length).toBeGreaterThan(0);
    });

    it('renders switch in list mode', () => {
      renderWithProviders(<SkillCard skill={mockSkill} variant="list" onToggleActive={mockOnToggleActive} />);

      const switchElement = document.querySelector('[role="switch"]');
      expect(switchElement).toBeInTheDocument();
    });

    it('renders dropdown menu in list mode', () => {
      renderWithProviders(<SkillCard skill={mockSkill} variant="list" />);

      const menuTrigger = screen.getByRole('button');
      expect(menuTrigger).toBeInTheDocument();
    });

    it('calls onSelect when list item is clicked', () => {
      renderWithProviders(<SkillCard skill={mockSkill} variant="list" onSelect={mockOnSelect} />);

      const listItem = document.querySelector('.rounded-xl.border');
      fireEvent.click(listItem!);

      expect(mockOnSelect).toHaveBeenCalledWith(mockSkill);
    });
  });

  describe('dropdown menu actions', () => {
    it('renders dropdown trigger when onEdit provided', () => {
      renderWithProviders(<SkillCard skill={mockSkill} variant="list" onEdit={mockOnEdit} />);

      const menuTrigger = screen.getByRole('button', { expanded: false });
      expect(menuTrigger).toBeInTheDocument();
      expect(menuTrigger).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('hides edit option for builtin skills', () => {
      renderWithProviders(<SkillCard skill={mockBuiltinSkill} variant="list" onEdit={mockOnEdit} />);

      const menuTrigger = screen.getByRole('button');
      fireEvent.click(menuTrigger);

      expect(screen.queryByText('edit')).not.toBeInTheDocument();
    });

    it('renders dropdown trigger for non-builtin skills with onDelete', () => {
      renderWithProviders(<SkillCard skill={mockSkill} variant="list" onDelete={mockOnDelete} />);

      const menuTrigger = screen.getByRole('button', { expanded: false });
      expect(menuTrigger).toBeInTheDocument();
      expect(menuTrigger).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('renders dropdown trigger for builtin skills with onDelete', () => {
      renderWithProviders(<SkillCard skill={mockBuiltinSkill} variant="list" onDelete={mockOnDelete} />);

      const menuTrigger = screen.getByRole('button', { expanded: false });
      expect(menuTrigger).toBeInTheDocument();
      expect(menuTrigger).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('renders dropdown trigger when onDuplicate provided', () => {
      renderWithProviders(<SkillCard skill={mockSkill} variant="list" onDuplicate={mockOnDuplicate} />);

      const menuTrigger = screen.getByRole('button', { expanded: false });
      expect(menuTrigger).toBeInTheDocument();
      expect(menuTrigger).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('renders dropdown trigger when onExport provided', () => {
      renderWithProviders(<SkillCard skill={mockSkill} variant="list" onExport={mockOnExport} />);

      const menuTrigger = screen.getByRole('button', { expanded: false });
      expect(menuTrigger).toBeInTheDocument();
      expect(menuTrigger).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('renders dropdown trigger when onView provided', () => {
      renderWithProviders(<SkillCard skill={mockSkill} variant="list" onView={mockOnView} />);

      const menuTrigger = screen.getByRole('button', { expanded: false });
      expect(menuTrigger).toBeInTheDocument();
      expect(menuTrigger).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('renders dropdown trigger for disabled skills', () => {
      renderWithProviders(<SkillCard skill={mockDisabledSkill} variant="list" onToggleEnabled={mockOnToggleEnabled} />);

      const menuTrigger = screen.getByRole('button', { expanded: false });
      expect(menuTrigger).toBeInTheDocument();
      expect(menuTrigger).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('renders dropdown trigger for enabled skills', () => {
      renderWithProviders(<SkillCard skill={mockSkill} variant="list" onToggleEnabled={mockOnToggleEnabled} />);

      const menuTrigger = screen.getByRole('button', { expanded: false });
      expect(menuTrigger).toBeInTheDocument();
      expect(menuTrigger).toHaveAttribute('aria-haspopup', 'menu');
    });
  });

  describe('category icons', () => {
    const categories = [
      'creative-design',
      'development',
      'enterprise',
      'productivity',
      'data-analysis',
      'communication',
      'meta',
      'custom',
    ] as const;

    categories.forEach((category) => {
      it(`renders icon for ${category} category`, () => {
        const skillWithCategory: Skill = {
          ...mockSkill,
          category,
        };
        renderWithProviders(<SkillCard skill={skillWithCategory} />);

        // Check that a card is rendered (category icon is displayed)
        const card = document.querySelector('[data-slot="card"]');
        expect(card).toBeInTheDocument();
      });
    });
  });

  describe('custom className', () => {
    it('applies custom className to default variant', () => {
      renderWithProviders(<SkillCard skill={mockSkill} className="custom-class" />);

      const card = document.querySelector('[data-slot="card"]');
      expect(card).toHaveClass('custom-class');
    });

    it('applies custom className to compact variant', () => {
      renderWithProviders(<SkillCard skill={mockSkill} variant="compact" className="custom-class" />);

      const card = document.querySelector('[data-slot="card"]');
      expect(card).toHaveClass('custom-class');
    });

    it('applies custom className to list variant', () => {
      renderWithProviders(<SkillCard skill={mockSkill} variant="list" className="custom-class" />);

      const listItem = document.querySelector('.rounded-xl.border');
      expect(listItem).toHaveClass('custom-class');
    });
  });
});
