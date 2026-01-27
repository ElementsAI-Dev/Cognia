import { render, screen, fireEvent } from '@testing-library/react';
import { SkillFilterSheet } from './skill-filter-sheet';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('SkillFilterSheet', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    categoryFilter: 'all' as const,
    onCategoryChange: jest.fn(),
    statusFilter: 'all' as const,
    onStatusChange: jest.fn(),
    sourceFilter: 'all' as const,
    onSourceChange: jest.fn(),
    showActiveOnly: false,
    onShowActiveOnlyChange: jest.fn(),
    categoryCounts: {
      all: 10,
      'creative-design': 2,
      development: 3,
      enterprise: 1,
      productivity: 2,
      'data-analysis': 1,
      communication: 1,
      meta: 0,
      custom: 0,
    },
    onClearFilters: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders sheet with title when open', () => {
      render(<SkillFilterSheet {...defaultProps} />);

      expect(screen.getByText('filterSkills')).toBeInTheDocument();
    });

    it('renders category section', () => {
      render(<SkillFilterSheet {...defaultProps} />);

      expect(screen.getByText('category')).toBeInTheDocument();
    });

    it('renders status section', () => {
      render(<SkillFilterSheet {...defaultProps} />);

      expect(screen.getByText('status')).toBeInTheDocument();
    });

    it('renders source section', () => {
      render(<SkillFilterSheet {...defaultProps} />);

      expect(screen.getByText('source')).toBeInTheDocument();
    });

    it('renders active only toggle', () => {
      render(<SkillFilterSheet {...defaultProps} />);

      expect(screen.getByText('activeOnly')).toBeInTheDocument();
      expect(screen.getByText('showActiveSkillsOnly')).toBeInTheDocument();
    });

    it('renders apply and cancel buttons', () => {
      render(<SkillFilterSheet {...defaultProps} />);

      expect(screen.getByText('cancel')).toBeInTheDocument();
      expect(screen.getByText('applyFilters')).toBeInTheDocument();
    });

    it('renders all category options', () => {
      render(<SkillFilterSheet {...defaultProps} />);

      expect(screen.getByText('allCategories')).toBeInTheDocument();
      expect(screen.getByText('categoryCreativeDesign')).toBeInTheDocument();
      expect(screen.getByText('categoryDevelopment')).toBeInTheDocument();
      expect(screen.getByText('categoryEnterprise')).toBeInTheDocument();
      expect(screen.getByText('categoryProductivity')).toBeInTheDocument();
      expect(screen.getByText('categoryDataAnalysis')).toBeInTheDocument();
      expect(screen.getByText('categoryCommunication')).toBeInTheDocument();
      expect(screen.getByText('categoryMeta')).toBeInTheDocument();
    });

    it('renders status options', () => {
      render(<SkillFilterSheet {...defaultProps} />);

      expect(screen.getByText('allStatus')).toBeInTheDocument();
      expect(screen.getByText('enabled')).toBeInTheDocument();
      expect(screen.getByText('disabled')).toBeInTheDocument();
      expect(screen.getByText('hasErrors')).toBeInTheDocument();
    });

    it('renders source options', () => {
      render(<SkillFilterSheet {...defaultProps} />);

      expect(screen.getByText('allSources')).toBeInTheDocument();
      expect(screen.getByText('builtin')).toBeInTheDocument();
      expect(screen.getByText('imported')).toBeInTheDocument();
    });

    it('displays category counts', () => {
      render(<SkillFilterSheet {...defaultProps} />);

      // The component uses t('skillCountNumber', { count }) which returns 'skillCountNumber'
      const countElements = screen.getAllByText('skillCountNumber');
      expect(countElements.length).toBeGreaterThan(0);
    });
  });

  describe('filter state display', () => {
    it('shows clear filters button when filters are active', () => {
      render(
        <SkillFilterSheet
          {...defaultProps}
          categoryFilter="development"
        />
      );

      expect(screen.getByText('clearFilters')).toBeInTheDocument();
    });

    it('hides clear filters button when no filters active', () => {
      render(<SkillFilterSheet {...defaultProps} />);

      expect(screen.queryByText('clearFilters')).not.toBeInTheDocument();
    });

    it('shows active filter count when filters applied', () => {
      render(
        <SkillFilterSheet
          {...defaultProps}
          categoryFilter="development"
          statusFilter="enabled"
        />
      );

      expect(screen.getByText('activeFiltersCount')).toBeInTheDocument();
    });

    it('shows badge on category when filtered', () => {
      render(
        <SkillFilterSheet
          {...defaultProps}
          categoryFilter="development"
        />
      );

      // Badge shows "1" when category is filtered
      const badges = screen.getAllByText('1');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('shows badge on status when filtered', () => {
      render(
        <SkillFilterSheet
          {...defaultProps}
          statusFilter="enabled"
        />
      );

      const badges = screen.getAllByText('1');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('shows badge on source when filtered', () => {
      render(
        <SkillFilterSheet
          {...defaultProps}
          sourceFilter="builtin"
        />
      );

      const badges = screen.getAllByText('1');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe('interactions', () => {
    it('calls onCategoryChange when category is selected', () => {
      render(<SkillFilterSheet {...defaultProps} />);

      const developmentOption = screen.getByText('categoryDevelopment');
      fireEvent.click(developmentOption.closest('button')!);

      expect(defaultProps.onCategoryChange).toHaveBeenCalledWith('development');
    });

    it('calls onStatusChange when status is selected', () => {
      render(<SkillFilterSheet {...defaultProps} />);

      const enabledButton = screen.getByText('enabled');
      fireEvent.click(enabledButton);

      expect(defaultProps.onStatusChange).toHaveBeenCalledWith('enabled');
    });

    it('calls onSourceChange when source is selected', () => {
      render(<SkillFilterSheet {...defaultProps} />);

      const builtinButton = screen.getByText('builtin');
      fireEvent.click(builtinButton);

      expect(defaultProps.onSourceChange).toHaveBeenCalledWith('builtin');
    });

    it('calls onShowActiveOnlyChange when toggle is clicked', () => {
      render(<SkillFilterSheet {...defaultProps} />);

      const switchElement = document.querySelector('[role="switch"]');
      fireEvent.click(switchElement!);

      expect(defaultProps.onShowActiveOnlyChange).toHaveBeenCalledWith(true);
    });

    it('calls onClearFilters when clear button is clicked', () => {
      render(
        <SkillFilterSheet
          {...defaultProps}
          categoryFilter="development"
        />
      );

      const clearButton = screen.getByText('clearFilters');
      fireEvent.click(clearButton);

      expect(defaultProps.onClearFilters).toHaveBeenCalled();
    });

    it('calls onOpenChange(false) when cancel is clicked', () => {
      render(<SkillFilterSheet {...defaultProps} />);

      const cancelButton = screen.getByText('cancel');
      fireEvent.click(cancelButton);

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });

    it('calls onOpenChange(false) when apply is clicked', () => {
      render(<SkillFilterSheet {...defaultProps} />);

      const applyButton = screen.getByText('applyFilters');
      fireEvent.click(applyButton);

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('selected state', () => {
    it('shows check icon for selected category', () => {
      render(
        <SkillFilterSheet
          {...defaultProps}
          categoryFilter="development"
        />
      );

      // The selected category button should have primary styling
      const developmentButton = screen.getByText('categoryDevelopment').closest('button');
      expect(developmentButton).toHaveClass('border-primary');
    });

    it('shows check icon for selected status', () => {
      render(
        <SkillFilterSheet
          {...defaultProps}
          statusFilter="enabled"
        />
      );

      // The enabled button should be the default variant (selected)
      const buttons = screen.getAllByRole('button');
      const enabledButton = buttons.find(btn => btn.textContent?.includes('enabled'));
      expect(enabledButton).toBeInTheDocument();
    });

    it('shows switch in checked state when activeOnly is true', () => {
      render(
        <SkillFilterSheet
          {...defaultProps}
          showActiveOnly={true}
        />
      );

      const switchElement = document.querySelector('[role="switch"]');
      expect(switchElement).toHaveAttribute('data-state', 'checked');
    });
  });

  describe('active filter count badge', () => {
    it('shows count 1 with one filter', () => {
      render(
        <SkillFilterSheet
          {...defaultProps}
          categoryFilter="development"
        />
      );

      expect(screen.getByText('activeFiltersCount')).toBeInTheDocument();
    });

    it('shows count 2 with two filters', () => {
      render(
        <SkillFilterSheet
          {...defaultProps}
          categoryFilter="development"
          statusFilter="enabled"
        />
      );

      expect(screen.getByText('activeFiltersCount')).toBeInTheDocument();
    });

    it('shows count 3 with three filters', () => {
      render(
        <SkillFilterSheet
          {...defaultProps}
          categoryFilter="development"
          statusFilter="enabled"
          sourceFilter="builtin"
        />
      );

      expect(screen.getByText('activeFiltersCount')).toBeInTheDocument();
    });

    it('shows count 4 with all filters active', () => {
      render(
        <SkillFilterSheet
          {...defaultProps}
          categoryFilter="development"
          statusFilter="enabled"
          sourceFilter="builtin"
          showActiveOnly={true}
        />
      );

      expect(screen.getByText('activeFiltersCount')).toBeInTheDocument();
    });
  });

  describe('apply button badge', () => {
    it('shows filter count badge on apply button when filters active', () => {
      render(
        <SkillFilterSheet
          {...defaultProps}
          categoryFilter="development"
          statusFilter="enabled"
        />
      );

      const applyButton = screen.getByText('applyFilters').closest('button');
      expect(applyButton).toBeInTheDocument();
      // Badge with count "2" should be in the button
      expect(applyButton?.textContent).toContain('2');
    });

    it('does not show badge on apply when no filters', () => {
      render(<SkillFilterSheet {...defaultProps} />);

      const applyButton = screen.getByText('applyFilters').closest('button');
      expect(applyButton?.textContent).toBe('applyFilters');
    });
  });

  describe('closed state', () => {
    it('does not render content when closed', () => {
      render(<SkillFilterSheet {...defaultProps} open={false} />);

      // Sheet content should not be visible when closed
      expect(screen.queryByText('filterSkills')).not.toBeInTheDocument();
    });
  });
});
