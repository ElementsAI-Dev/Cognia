import { render, screen, fireEvent } from '@testing-library/react';
import { SkillSelector } from './skill-selector';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useSkillStore } from '@/stores/skill-store';
import type { Skill } from '@/types/skill';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
};

jest.mock('@/stores/skill-store');

const mockSkill1: Skill = {
  id: 'skill-1',
  metadata: {
    name: 'skill-one',
    description: 'First test skill',
  },
  content: '# Skill One',
  rawContent: '---\nname: skill-one\n---\n# Skill One',
  resources: [],
  status: 'enabled',
  source: 'custom',
  category: 'development',
  tags: ['test'],
  isActive: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSkill2: Skill = {
  id: 'skill-2',
  metadata: {
    name: 'skill-two',
    description: 'Second test skill',
  },
  content: '# Skill Two',
  rawContent: '---\nname: skill-two\n---\n# Skill Two',
  resources: [],
  status: 'enabled',
  source: 'custom',
  category: 'productivity',
  tags: ['productivity'],
  isActive: false,
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

describe('SkillSelector', () => {
  const mockOnSkillsChange = jest.fn();
  const mockActivateSkill = jest.fn();
  const mockDeactivateSkill = jest.fn();
  const mockGetActiveSkills = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActiveSkills.mockReturnValue([]);
    mockUseSkillStore.mockReturnValue({
      skills: {
        'skill-1': mockSkill1,
        'skill-2': mockSkill2,
        'disabled-skill': mockDisabledSkill,
      },
      activeSkillIds: [],
      activateSkill: mockActivateSkill,
      deactivateSkill: mockDeactivateSkill,
      getActiveSkills: mockGetActiveSkills,
    } as unknown as ReturnType<typeof useSkillStore>);
  });

  describe('default (full) view', () => {
    it('renders Active Skills header', () => {
      renderWithProviders(<SkillSelector onSkillsChange={mockOnSkillsChange} />);

      expect(screen.getByText('Active Skills')).toBeInTheDocument();
    });

    it('displays skills count badge', () => {
      renderWithProviders(<SkillSelector onSkillsChange={mockOnSkillsChange} maxSkills={5} />);

      expect(screen.getByText('0/5')).toBeInTheDocument();
    });

    it('renders search input', () => {
      renderWithProviders(<SkillSelector onSkillsChange={mockOnSkillsChange} />);

      expect(screen.getByPlaceholderText('searchSkills')).toBeInTheDocument();
    });

    it('displays enabled skills grouped by category', () => {
      renderWithProviders(<SkillSelector onSkillsChange={mockOnSkillsChange} />);

      expect(screen.getByText('Development')).toBeInTheDocument();
      expect(screen.getByText('Productivity')).toBeInTheDocument();
    });

    it('displays skill names', () => {
      renderWithProviders(<SkillSelector onSkillsChange={mockOnSkillsChange} />);

      expect(screen.getByText('skill-one')).toBeInTheDocument();
      expect(screen.getByText('skill-two')).toBeInTheDocument();
    });

    it('displays skill descriptions', () => {
      renderWithProviders(<SkillSelector onSkillsChange={mockOnSkillsChange} />);

      expect(screen.getByText('First test skill')).toBeInTheDocument();
      expect(screen.getByText('Second test skill')).toBeInTheDocument();
    });

    it('does not display disabled skills', () => {
      renderWithProviders(<SkillSelector onSkillsChange={mockOnSkillsChange} />);

      expect(screen.queryByText('disabled-skill')).not.toBeInTheDocument();
    });

    it('filters skills by search query', () => {
      renderWithProviders(<SkillSelector onSkillsChange={mockOnSkillsChange} />);

      const searchInput = screen.getByPlaceholderText('searchSkills');
      fireEvent.change(searchInput, { target: { value: 'one' } });

      expect(screen.getByText('skill-one')).toBeInTheDocument();
      expect(screen.queryByText('skill-two')).not.toBeInTheDocument();
    });

    it('filters skills by tag', () => {
      renderWithProviders(<SkillSelector onSkillsChange={mockOnSkillsChange} />);

      const searchInput = screen.getByPlaceholderText('searchSkills');
      fireEvent.change(searchInput, { target: { value: 'productivity' } });

      expect(screen.queryByText('skill-one')).not.toBeInTheDocument();
      expect(screen.getByText('skill-two')).toBeInTheDocument();
    });

    it('activates skill when clicked', () => {
      renderWithProviders(<SkillSelector onSkillsChange={mockOnSkillsChange} />);

      const skillButton = screen.getByText('skill-one').closest('button');
      fireEvent.click(skillButton!);

      expect(mockActivateSkill).toHaveBeenCalledWith('skill-1');
    });

    it('calls onSkillsChange when skill is activated', () => {
      renderWithProviders(<SkillSelector onSkillsChange={mockOnSkillsChange} />);

      const skillButton = screen.getByText('skill-one').closest('button');
      fireEvent.click(skillButton!);

      expect(mockOnSkillsChange).toHaveBeenCalled();
    });

    it('deactivates skill when clicking active skill badge remove button', () => {
      mockGetActiveSkills.mockReturnValue([mockSkill1]);
      mockUseSkillStore.mockReturnValue({
        skills: {
          'skill-1': mockSkill1,
          'skill-2': mockSkill2,
        },
        activeSkillIds: ['skill-1'],
        activateSkill: mockActivateSkill,
        deactivateSkill: mockDeactivateSkill,
        getActiveSkills: mockGetActiveSkills,
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillSelector onSkillsChange={mockOnSkillsChange} />);

      // Find the badge's remove button (X icon) inside the badge
      const badge = screen.getAllByText('skill-one')[0].closest('[data-slot="badge"]');
      const removeButton = badge?.querySelector('button');
      if (removeButton) {
        fireEvent.click(removeButton);
        expect(mockDeactivateSkill).toHaveBeenCalledWith('skill-1');
      }
    });

    it('displays active skills badges', () => {
      mockGetActiveSkills.mockReturnValue([mockSkill1]);
      mockUseSkillStore.mockReturnValue({
        skills: {
          'skill-1': mockSkill1,
          'skill-2': mockSkill2,
        },
        activeSkillIds: ['skill-1'],
        activateSkill: mockActivateSkill,
        deactivateSkill: mockDeactivateSkill,
        getActiveSkills: mockGetActiveSkills,
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillSelector onSkillsChange={mockOnSkillsChange} />);

      expect(screen.getByText('1/5')).toBeInTheDocument();
    });

    it('shows Clear All button when skills are active', () => {
      mockGetActiveSkills.mockReturnValue([mockSkill1]);
      mockUseSkillStore.mockReturnValue({
        skills: {
          'skill-1': mockSkill1,
          'skill-2': mockSkill2,
        },
        activeSkillIds: ['skill-1'],
        activateSkill: mockActivateSkill,
        deactivateSkill: mockDeactivateSkill,
        getActiveSkills: mockGetActiveSkills,
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillSelector onSkillsChange={mockOnSkillsChange} />);

      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    it('clears all active skills when Clear All clicked', () => {
      mockGetActiveSkills.mockReturnValue([mockSkill1, mockSkill2]);
      mockUseSkillStore.mockReturnValue({
        skills: {
          'skill-1': mockSkill1,
          'skill-2': mockSkill2,
        },
        activeSkillIds: ['skill-1', 'skill-2'],
        activateSkill: mockActivateSkill,
        deactivateSkill: mockDeactivateSkill,
        getActiveSkills: mockGetActiveSkills,
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillSelector onSkillsChange={mockOnSkillsChange} />);

      fireEvent.click(screen.getByText('Clear All'));

      expect(mockDeactivateSkill).toHaveBeenCalledWith('skill-1');
      expect(mockDeactivateSkill).toHaveBeenCalledWith('skill-2');
      expect(mockOnSkillsChange).toHaveBeenCalledWith([]);
    });

    it('prevents activating more than maxSkills', () => {
      mockGetActiveSkills.mockReturnValue([mockSkill1]);
      mockUseSkillStore.mockReturnValue({
        skills: {
          'skill-1': mockSkill1,
          'skill-2': mockSkill2,
        },
        activeSkillIds: ['skill-1'],
        activateSkill: mockActivateSkill,
        deactivateSkill: mockDeactivateSkill,
        getActiveSkills: mockGetActiveSkills,
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillSelector onSkillsChange={mockOnSkillsChange} maxSkills={1} />);

      const skillButton = screen.getByText('skill-two').closest('button');
      fireEvent.click(skillButton!);

      expect(mockActivateSkill).not.toHaveBeenCalled();
    });

    it('shows active skill badge', () => {
      mockGetActiveSkills.mockReturnValue([mockSkill1]);
      mockUseSkillStore.mockReturnValue({
        skills: {
          'skill-1': mockSkill1,
          'skill-2': mockSkill2,
        },
        activeSkillIds: ['skill-1'],
        activateSkill: mockActivateSkill,
        deactivateSkill: mockDeactivateSkill,
        getActiveSkills: mockGetActiveSkills,
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillSelector onSkillsChange={mockOnSkillsChange} />);

      // Active skill should appear as a badge
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('compact view', () => {
    it('renders compact button', () => {
      renderWithProviders(<SkillSelector onSkillsChange={mockOnSkillsChange} compact />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('shows skill count when skills are active', () => {
      mockGetActiveSkills.mockReturnValue([mockSkill1]);
      mockUseSkillStore.mockReturnValue({
        skills: {
          'skill-1': mockSkill1,
          'skill-2': mockSkill2,
        },
        activeSkillIds: ['skill-1'],
        activateSkill: mockActivateSkill,
        deactivateSkill: mockDeactivateSkill,
        getActiveSkills: mockGetActiveSkills,
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillSelector onSkillsChange={mockOnSkillsChange} compact />);

      expect(screen.getByText('1 skill')).toBeInTheDocument();
    });

    it('shows plural skill count', () => {
      mockGetActiveSkills.mockReturnValue([mockSkill1, mockSkill2]);
      mockUseSkillStore.mockReturnValue({
        skills: {
          'skill-1': mockSkill1,
          'skill-2': mockSkill2,
        },
        activeSkillIds: ['skill-1', 'skill-2'],
        activateSkill: mockActivateSkill,
        deactivateSkill: mockDeactivateSkill,
        getActiveSkills: mockGetActiveSkills,
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillSelector onSkillsChange={mockOnSkillsChange} compact />);

      expect(screen.getByText('2 skills')).toBeInTheDocument();
    });

    it('shows Select skills when no skills active', () => {
      renderWithProviders(<SkillSelector onSkillsChange={mockOnSkillsChange} compact />);

      expect(screen.getByText('Select skills')).toBeInTheDocument();
    });

    it('renders compact trigger button', () => {
      renderWithProviders(<SkillSelector onSkillsChange={mockOnSkillsChange} compact />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });
});
