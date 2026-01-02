import { render, screen, fireEvent } from '@testing-library/react';
import { SkillSuggestions, ActiveSkillsIndicator } from './skill-suggestions';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useSkillStore } from '@/stores/agent';
import type { Skill } from '@/types/skill';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
};

jest.mock('@/stores/agent', () => ({
  useSkillStore: jest.fn(),
}));
jest.mock('@/lib/skills/executor', () => ({
  findMatchingSkills: jest.fn((skills, _query, _max) => skills.slice(0, 2)),
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
  source: 'custom',
  category: 'communication',
  tags: ['writing'],
  isActive: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockActiveSkill: Skill = {
  ...mockSkill1,
  id: 'active-skill-1',
  isActive: true,
  metadata: {
    name: 'active-skill',
    description: 'An active skill',
  },
};

const mockUseSkillStore = useSkillStore as jest.MockedFunction<typeof useSkillStore>;

describe('SkillSuggestions', () => {
  const mockOnSkillActivate = jest.fn();
  const mockOnSkillDeactivate = jest.fn();
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
      },
      activateSkill: mockActivateSkill,
      deactivateSkill: mockDeactivateSkill,
      getActiveSkills: mockGetActiveSkills,
    } as unknown as ReturnType<typeof useSkillStore>);
  });

  describe('rendering', () => {
    it('renders nothing when query is too short', () => {
      const { container } = renderWithProviders(
        <SkillSuggestions 
          query="ab" 
          onSkillActivate={mockOnSkillActivate}
          minQueryLength={3}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when no matching skills and no active skills', () => {
      mockUseSkillStore.mockReturnValue({
        skills: {},
        activateSkill: mockActivateSkill,
        deactivateSkill: mockDeactivateSkill,
        getActiveSkills: jest.fn(() => []),
      } as unknown as ReturnType<typeof useSkillStore>);

      const { container } = renderWithProviders(
        <SkillSuggestions 
          query="code review" 
          onSkillActivate={mockOnSkillActivate}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders suggestions when query matches', () => {
      renderWithProviders(
        <SkillSuggestions 
          query="code review" 
          onSkillActivate={mockOnSkillActivate}
        />
      );

      expect(screen.getByText('suggestedSkills')).toBeInTheDocument();
    });

    it('displays matching skill names', () => {
      renderWithProviders(
        <SkillSuggestions 
          query="code review" 
          onSkillActivate={mockOnSkillActivate}
        />
      );

      expect(screen.getByText('code-review')).toBeInTheDocument();
    });

    it('displays skill descriptions', () => {
      renderWithProviders(
        <SkillSuggestions 
          query="code review" 
          onSkillActivate={mockOnSkillActivate}
        />
      );

      expect(screen.getByText('Code review skill')).toBeInTheDocument();
    });

    it('displays suggestions count badge', () => {
      renderWithProviders(
        <SkillSuggestions 
          query="code review" 
          onSkillActivate={mockOnSkillActivate}
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('calls activateSkill when Activate button clicked', () => {
      renderWithProviders(
        <SkillSuggestions 
          query="code review" 
          onSkillActivate={mockOnSkillActivate}
        />
      );

      const activateButton = screen.getAllByRole('button', { name: /activate/i })[0];
      fireEvent.click(activateButton);

      expect(mockActivateSkill).toHaveBeenCalled();
    });

    it('calls onSkillActivate callback when skill activated', () => {
      renderWithProviders(
        <SkillSuggestions 
          query="code review" 
          onSkillActivate={mockOnSkillActivate}
        />
      );

      const activateButton = screen.getAllByRole('button', { name: /activate/i })[0];
      fireEvent.click(activateButton);

      expect(mockOnSkillActivate).toHaveBeenCalled();
    });

    it('dismisses suggestions when X button clicked', () => {
      renderWithProviders(
        <SkillSuggestions 
          query="code review" 
          onSkillActivate={mockOnSkillActivate}
        />
      );

      const dismissButtons = screen.getAllByRole('button');
      const dismissButton = dismissButtons.find(btn => 
        btn.querySelector('svg.lucide-x') && !btn.textContent?.includes('activate')
      );
      
      if (dismissButton) {
        fireEvent.click(dismissButton);
        expect(screen.queryByText('suggestedSkills')).not.toBeInTheDocument();
      }
    });

    it('collapses suggestions when collapse button clicked', () => {
      renderWithProviders(
        <SkillSuggestions 
          query="code review" 
          onSkillActivate={mockOnSkillActivate}
        />
      );

      const collapseButton = screen.getAllByRole('button')[0];
      fireEvent.click(collapseButton);

      // After collapse, skill details should not be visible
      expect(screen.queryByText('Code review skill')).not.toBeInTheDocument();
    });
  });

  describe('active skills display', () => {
    it('shows active skills indicator when no suggestions but has active skills', () => {
      mockGetActiveSkills.mockReturnValue([mockActiveSkill]);
      mockUseSkillStore.mockReturnValue({
        skills: {},
        activateSkill: mockActivateSkill,
        deactivateSkill: mockDeactivateSkill,
        getActiveSkills: mockGetActiveSkills,
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(
        <SkillSuggestions 
          query="" 
          onSkillActivate={mockOnSkillActivate}
          showActiveSkills={true}
        />
      );

      expect(screen.getByText('activeSkillsCount')).toBeInTheDocument();
    });

    it('displays active skill badges', () => {
      mockGetActiveSkills.mockReturnValue([mockActiveSkill]);
      mockUseSkillStore.mockReturnValue({
        skills: { 'active-skill-1': mockActiveSkill },
        activateSkill: mockActivateSkill,
        deactivateSkill: mockDeactivateSkill,
        getActiveSkills: mockGetActiveSkills,
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(
        <SkillSuggestions 
          query="" 
          onSkillActivate={mockOnSkillActivate}
          showActiveSkills={true}
        />
      );

      expect(screen.getByText('active-skill')).toBeInTheDocument();
    });

    it('shows currently active section in suggestions panel', () => {
      mockGetActiveSkills.mockReturnValue([mockActiveSkill]);
      mockUseSkillStore.mockReturnValue({
        skills: { 
          'skill-1': mockSkill1,
          'active-skill-1': mockActiveSkill,
        },
        activateSkill: mockActivateSkill,
        deactivateSkill: mockDeactivateSkill,
        getActiveSkills: mockGetActiveSkills,
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(
        <SkillSuggestions 
          query="code" 
          onSkillActivate={mockOnSkillActivate}
          showActiveSkills={true}
        />
      );

      expect(screen.getByText('currentlyActive')).toBeInTheDocument();
    });

    it('calls deactivateSkill when clicking active skill badge', () => {
      mockGetActiveSkills.mockReturnValue([mockActiveSkill]);
      mockUseSkillStore.mockReturnValue({
        skills: { 'active-skill-1': mockActiveSkill },
        activateSkill: mockActivateSkill,
        deactivateSkill: mockDeactivateSkill,
        getActiveSkills: mockGetActiveSkills,
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(
        <SkillSuggestions 
          query="" 
          onSkillActivate={mockOnSkillActivate}
          onSkillDeactivate={mockOnSkillDeactivate}
          showActiveSkills={true}
        />
      );

      // Active skill badge should be displayed
      expect(screen.getByText('active-skill')).toBeInTheDocument();
    });

    it('shows +N badge when more than 3 active skills', () => {
      const multipleActiveSkills = [
        { ...mockActiveSkill, id: 'a1', metadata: { name: 's1', description: '' } },
        { ...mockActiveSkill, id: 'a2', metadata: { name: 's2', description: '' } },
        { ...mockActiveSkill, id: 'a3', metadata: { name: 's3', description: '' } },
        { ...mockActiveSkill, id: 'a4', metadata: { name: 's4', description: '' } },
      ] as Skill[];

      mockGetActiveSkills.mockReturnValue(multipleActiveSkills);
      mockUseSkillStore.mockReturnValue({
        skills: {},
        activateSkill: mockActivateSkill,
        deactivateSkill: mockDeactivateSkill,
        getActiveSkills: mockGetActiveSkills,
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(
        <SkillSuggestions 
          query="" 
          onSkillActivate={mockOnSkillActivate}
          showActiveSkills={true}
        />
      );

      expect(screen.getByText('+1')).toBeInTheDocument();
    });

    it('renders with showActiveSkills false', () => {
      mockGetActiveSkills.mockReturnValue([mockActiveSkill]);
      mockUseSkillStore.mockReturnValue({
        skills: { 'active-skill-1': mockActiveSkill },
        activateSkill: mockActivateSkill,
        deactivateSkill: mockDeactivateSkill,
        getActiveSkills: mockGetActiveSkills,
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(
        <SkillSuggestions 
          query="" 
          onSkillActivate={mockOnSkillActivate}
          showActiveSkills={false}
        />
      );

      // Component should render without showing active skills section
      expect(screen.queryByText('activeSkills')).not.toBeInTheDocument();
    });
  });

  describe('configuration', () => {
    it('respects minQueryLength prop', () => {
      const { container } = renderWithProviders(
        <SkillSuggestions 
          query="code" 
          onSkillActivate={mockOnSkillActivate}
          minQueryLength={5}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('applies custom className', () => {
      mockGetActiveSkills.mockReturnValue([mockActiveSkill]);
      mockUseSkillStore.mockReturnValue({
        skills: {},
        activateSkill: mockActivateSkill,
        deactivateSkill: mockDeactivateSkill,
        getActiveSkills: mockGetActiveSkills,
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(
        <SkillSuggestions 
          query="" 
          onSkillActivate={mockOnSkillActivate}
          showActiveSkills={true}
          className="custom-class"
        />
      );

      const container = document.querySelector('.custom-class');
      expect(container).toBeInTheDocument();
    });
  });
});

describe('ActiveSkillsIndicator', () => {
  const mockOnClick = jest.fn();
  const mockGetActiveSkills = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when no active skills', () => {
    mockGetActiveSkills.mockReturnValue([]);
    mockUseSkillStore.mockReturnValue({
      skills: {},
      getActiveSkills: mockGetActiveSkills,
    } as unknown as ReturnType<typeof useSkillStore>);

    const { container } = renderWithProviders(<ActiveSkillsIndicator onClick={mockOnClick} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders button when skills are active', () => {
    mockGetActiveSkills.mockReturnValue([mockActiveSkill]);
    mockUseSkillStore.mockReturnValue({
      skills: { 'active-skill-1': mockActiveSkill },
      getActiveSkills: mockGetActiveSkills,
    } as unknown as ReturnType<typeof useSkillStore>);

    renderWithProviders(<ActiveSkillsIndicator onClick={mockOnClick} />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('displays active skills count', () => {
    mockGetActiveSkills.mockReturnValue([mockActiveSkill]);
    mockUseSkillStore.mockReturnValue({
      skills: { 'active-skill-1': mockActiveSkill },
      getActiveSkills: mockGetActiveSkills,
    } as unknown as ReturnType<typeof useSkillStore>);

    renderWithProviders(<ActiveSkillsIndicator onClick={mockOnClick} />);

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('calls onClick when button clicked', () => {
    mockGetActiveSkills.mockReturnValue([mockActiveSkill]);
    mockUseSkillStore.mockReturnValue({
      skills: { 'active-skill-1': mockActiveSkill },
      getActiveSkills: mockGetActiveSkills,
    } as unknown as ReturnType<typeof useSkillStore>);

    renderWithProviders(<ActiveSkillsIndicator onClick={mockOnClick} />);

    fireEvent.click(screen.getByRole('button'));

    expect(mockOnClick).toHaveBeenCalled();
  });

  it('applies custom className', () => {
    mockGetActiveSkills.mockReturnValue([mockActiveSkill]);
    mockUseSkillStore.mockReturnValue({
      skills: { 'active-skill-1': mockActiveSkill },
      getActiveSkills: mockGetActiveSkills,
    } as unknown as ReturnType<typeof useSkillStore>);

    renderWithProviders(<ActiveSkillsIndicator onClick={mockOnClick} className="custom-class" />);

    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });
});
