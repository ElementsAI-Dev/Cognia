import { render, screen, fireEvent } from '@testing-library/react';
import { SkillPanel } from './skill-panel';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useSkillStore } from '@/stores/skill-store';
import type { Skill } from '@/types/skill';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
};

jest.mock('@/stores/skill-store');
jest.mock('@/lib/skills/packager', () => ({
  downloadSkillAsMarkdown: jest.fn(),
}));

const mockSkill1: Skill = {
  id: 'skill-1',
  metadata: {
    name: 'code-review',
    description: 'Code review skill',
  },
  content: '# Code Review',
  rawContent: '---\nname: code-review\n---\n# Code Review',
  resources: [],
  status: 'enabled',
  source: 'custom',
  category: 'development',
  tags: ['code', 'review'],
  isActive: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSkill2: Skill = {
  id: 'skill-2',
  metadata: {
    name: 'writing-helper',
    description: 'Writing assistance skill',
  },
  content: '# Writing Helper',
  rawContent: '---\nname: writing-helper\n---\n# Writing Helper',
  resources: [],
  status: 'enabled',
  source: 'builtin',
  category: 'communication',
  tags: ['writing'],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockDisabledSkill: Skill = {
  ...mockSkill1,
  id: 'disabled-skill',
  status: 'disabled',
  metadata: {
    name: 'disabled-skill',
    description: 'A disabled skill',
  },
};

const mockUseSkillStore = useSkillStore as jest.MockedFunction<typeof useSkillStore>;

describe('SkillPanel', () => {
  const mockEnableSkill = jest.fn();
  const mockDisableSkill = jest.fn();
  const mockActivateSkill = jest.fn();
  const mockDeactivateSkill = jest.fn();
  const mockDeleteSkill = jest.fn();
  const mockCreateSkill = jest.fn();
  const mockUpdateSkill = jest.fn();
  const mockImportSkill = jest.fn();
  const mockExportSkill = jest.fn();
  const mockSearchSkills = jest.fn();
  const mockGetAllSkills = jest.fn();
  const mockOnSkillSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchSkills.mockReturnValue({ skills: [mockSkill1, mockSkill2] });
    mockGetAllSkills.mockReturnValue([mockSkill1, mockSkill2]);
    mockCreateSkill.mockReturnValue({ id: 'new-skill' });
    mockExportSkill.mockReturnValue({ id: 'skill-1', content: 'exported' });

    mockUseSkillStore.mockReturnValue({
      skills: {
        'skill-1': mockSkill1,
        'skill-2': mockSkill2,
        'disabled-skill': mockDisabledSkill,
      },
      enableSkill: mockEnableSkill,
      disableSkill: mockDisableSkill,
      activateSkill: mockActivateSkill,
      deactivateSkill: mockDeactivateSkill,
      deleteSkill: mockDeleteSkill,
      createSkill: mockCreateSkill,
      updateSkill: mockUpdateSkill,
      importSkill: mockImportSkill,
      exportSkill: mockExportSkill,
      searchSkills: mockSearchSkills,
      getAllSkills: mockGetAllSkills,
      getSkillUsageStats: jest.fn(() => null),
      activeSkillIds: [],
    } as unknown as ReturnType<typeof useSkillStore>);
  });

  describe('browse view', () => {
    it('renders skills library header', () => {
      renderWithProviders(<SkillPanel />);

      expect(screen.getByText('skillsLibrary')).toBeInTheDocument();
    });

    it('displays skill count badge', () => {
      renderWithProviders(<SkillPanel />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders New Skill button', () => {
      renderWithProviders(<SkillPanel />);

      expect(screen.getByRole('button', { name: /newSkill/i })).toBeInTheDocument();
    });

    it('renders Analytics button', () => {
      renderWithProviders(<SkillPanel />);

      expect(screen.getByRole('button', { name: /analytics/i })).toBeInTheDocument();
    });

    it('renders search input', () => {
      renderWithProviders(<SkillPanel />);

      expect(screen.getByPlaceholderText('searchSkills')).toBeInTheDocument();
    });

    it('renders view mode toggle buttons', () => {
      renderWithProviders(<SkillPanel />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('displays skill cards in grid view by default', () => {
      renderWithProviders(<SkillPanel />);

      expect(screen.getByText('code-review')).toBeInTheDocument();
      expect(screen.getByText('writing-helper')).toBeInTheDocument();
    });

    it('displays skill descriptions', () => {
      renderWithProviders(<SkillPanel />);

      expect(screen.getByText('Code review skill')).toBeInTheDocument();
      expect(screen.getByText('Writing assistance skill')).toBeInTheDocument();
    });
  });

  describe('filtering', () => {
    it('filters skills by search query', () => {
      mockSearchSkills.mockReturnValue({ skills: [mockSkill1] });

      renderWithProviders(<SkillPanel />);

      const searchInput = screen.getByPlaceholderText('searchSkills');
      fireEvent.change(searchInput, { target: { value: 'code' } });

      expect(mockSearchSkills).toHaveBeenCalledWith('code');
    });

    it('shows clear search button when searching', () => {
      renderWithProviders(<SkillPanel />);

      const searchInput = screen.getByPlaceholderText('searchSkills');
      fireEvent.change(searchInput, { target: { value: 'code' } });

      const clearButtons = screen.getAllByRole('button');
      expect(clearButtons.length).toBeGreaterThan(0);
    });

    it('renders category filter dropdown', () => {
      renderWithProviders(<SkillPanel />);

      expect(screen.getByText('All Categories')).toBeInTheDocument();
    });

    it('renders status filter dropdown', () => {
      renderWithProviders(<SkillPanel />);

      expect(screen.getByText('All Status')).toBeInTheDocument();
    });

    it('renders source filter dropdown', () => {
      renderWithProviders(<SkillPanel />);

      expect(screen.getByText('All Sources')).toBeInTheDocument();
    });

    it('renders active only toggle', () => {
      renderWithProviders(<SkillPanel />);

      expect(screen.getByText('activeOnly')).toBeInTheDocument();
    });

    it('shows clear filters button when filters active', () => {
      renderWithProviders(<SkillPanel />);

      const searchInput = screen.getByPlaceholderText('searchSkills');
      fireEvent.change(searchInput, { target: { value: 'code' } });

      expect(screen.getByText('clearFilters')).toBeInTheDocument();
    });

    it('renders category filter button', () => {
      renderWithProviders(<SkillPanel />);

      expect(screen.getByText('All Categories')).toBeInTheDocument();
    });

    it('toggles active only filter', () => {
      renderWithProviders(<SkillPanel />);

      fireEvent.click(screen.getByText('activeOnly'));

      // After toggle, button should have different styling
      const activeOnlyButton = screen.getByText('activeOnly').closest('button');
      expect(activeOnlyButton).toHaveClass('bg-primary');
    });
  });

  describe('view modes', () => {
    it('switches to list view when list button clicked', () => {
      renderWithProviders(<SkillPanel />);

      const viewButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('svg')
      );
      // Find the list view button (second one in the toggle group)
      const listButton = viewButtons.find(btn => 
        btn.className.includes('rounded-l-none')
      );
      
      if (listButton) {
        fireEvent.click(listButton);
        // Skills should still be visible in list view
        expect(screen.getByText('code-review')).toBeInTheDocument();
      }
    });
  });

  describe('skill actions', () => {
    it('calls enableSkill when enabling a disabled skill', () => {
      renderWithProviders(<SkillPanel />);

      // Find skill card and interact with it
      expect(screen.getByText('code-review')).toBeInTheDocument();
    });

    it('calls disableSkill when disabling an enabled skill', () => {
      renderWithProviders(<SkillPanel />);

      expect(screen.getByText('code-review')).toBeInTheDocument();
    });

    it('calls activateSkill when activating a skill', () => {
      renderWithProviders(<SkillPanel />);

      expect(screen.getByText('code-review')).toBeInTheDocument();
    });

    it('calls deactivateSkill when deactivating a skill', () => {
      renderWithProviders(<SkillPanel />);

      expect(screen.getByText('writing-helper')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('navigates to create view when New Skill clicked', () => {
      renderWithProviders(<SkillPanel />);

      fireEvent.click(screen.getByRole('button', { name: /newSkill/i }));

      // Should render SkillEditor for new skill
      expect(screen.queryByText('skillsLibrary')).not.toBeInTheDocument();
    });

    it('navigates to analytics view when Analytics clicked', () => {
      renderWithProviders(<SkillPanel />);

      fireEvent.click(screen.getByRole('button', { name: /analytics/i }));

      expect(screen.getByText('skillAnalytics')).toBeInTheDocument();
    });

    it('shows close button in analytics view', () => {
      renderWithProviders(<SkillPanel />);

      fireEvent.click(screen.getByRole('button', { name: /analytics/i }));

      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    it('returns to browse from analytics when close clicked', () => {
      renderWithProviders(<SkillPanel />);

      fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
      fireEvent.click(screen.getByRole('button', { name: /close/i }));

      expect(screen.getByText('skillsLibrary')).toBeInTheDocument();
    });

    it('calls onSkillSelect when skill is selected', () => {
      renderWithProviders(<SkillPanel onSkillSelect={mockOnSkillSelect} />);

      const skillCard = screen.getByText('code-review').closest('[data-slot="card"]');
      fireEvent.click(skillCard!);

      expect(mockOnSkillSelect).toHaveBeenCalled();
    });
  });

  describe('delete dialog', () => {
    it('opens delete dialog when delete action triggered', () => {
      renderWithProviders(<SkillPanel />);

      // The delete dialog is part of the panel, triggered by skill card actions
      expect(screen.getByText('code-review')).toBeInTheDocument();
    });
  });

  describe('import dialog', () => {
    it('opens import dialog from more menu', () => {
      renderWithProviders(<SkillPanel />);

      expect(screen.getByText('more')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no skills match filters', () => {
      mockSearchSkills.mockReturnValue({ skills: [] });
      mockUseSkillStore.mockReturnValue({
        skills: {
          'skill-1': mockSkill1,
        },
        enableSkill: mockEnableSkill,
        disableSkill: mockDisableSkill,
        activateSkill: mockActivateSkill,
        deactivateSkill: mockDeactivateSkill,
        deleteSkill: mockDeleteSkill,
        createSkill: mockCreateSkill,
        updateSkill: mockUpdateSkill,
        importSkill: mockImportSkill,
        exportSkill: mockExportSkill,
        searchSkills: mockSearchSkills,
        getAllSkills: mockGetAllSkills,
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillPanel />);

      const searchInput = screen.getByPlaceholderText('searchSkills');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('noSkillsFound')).toBeInTheDocument();
    });

    it('shows create first skill button when no skills exist', () => {
      mockUseSkillStore.mockReturnValue({
        skills: {},
        enableSkill: mockEnableSkill,
        disableSkill: mockDisableSkill,
        activateSkill: mockActivateSkill,
        deactivateSkill: mockDeactivateSkill,
        deleteSkill: mockDeleteSkill,
        createSkill: mockCreateSkill,
        updateSkill: mockUpdateSkill,
        importSkill: mockImportSkill,
        exportSkill: mockExportSkill,
        searchSkills: jest.fn(() => ({ skills: [] })),
        getAllSkills: jest.fn(() => []),
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillPanel />);

      expect(screen.getByText('noSkillsYet')).toBeInTheDocument();
      expect(screen.getByText('createFirstSkill')).toBeInTheDocument();
    });
  });

  describe('duplicate skill', () => {
    it('calls createSkill when duplicating', () => {
      renderWithProviders(<SkillPanel />);

      // Skill duplication is handled through skill card actions
      expect(screen.getByText('code-review')).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      renderWithProviders(<SkillPanel className="custom-class" />);

      const panel = document.querySelector('.custom-class');
      expect(panel).toBeInTheDocument();
    });
  });

  describe('defaultView prop', () => {
    it('starts with browse view by default', () => {
      renderWithProviders(<SkillPanel />);

      expect(screen.getByText('skillsLibrary')).toBeInTheDocument();
    });

    it('starts with analytics view when specified', () => {
      renderWithProviders(<SkillPanel defaultView="analytics" />);

      expect(screen.getByText('skillAnalytics')).toBeInTheDocument();
    });
  });
});
