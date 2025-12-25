import { render, screen, fireEvent } from '@testing-library/react';
import { SkillDetail } from './skill-detail';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useSkillStore } from '@/stores/skill-store';
import type { Skill } from '@/types/skill';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
};

jest.mock('@/stores/skill-store');
jest.mock('@/lib/skills/executor', () => ({
  estimateSkillTokens: jest.fn(() => 100),
}));
jest.mock('@/lib/skills/packager', () => ({
  downloadSkillAsMarkdown: jest.fn(),
  downloadSkillAsPackage: jest.fn(),
}));

const mockSkill: Skill = {
  id: 'test-skill-1',
  metadata: {
    name: 'test-skill',
    description: 'A test skill for testing',
  },
  content: '# Test Skill\n\nThis is test content.',
  rawContent: `---
name: test-skill
description: A test skill for testing
---

# Test Skill

This is test content.`,
  resources: [],
  status: 'enabled',
  source: 'custom',
  category: 'development',
  tags: ['test', 'development'],
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

const mockSkillWithErrors: Skill = {
  ...mockSkill,
  id: 'error-skill-1',
  validationErrors: [
    { field: 'content', message: 'Missing required section', severity: 'error' },
    { field: 'tags', message: 'Too few tags', severity: 'warning' },
  ],
};

const mockUseSkillStore = useSkillStore as jest.MockedFunction<typeof useSkillStore>;

describe('SkillDetail', () => {
  const mockOnClose = jest.fn();
  const _mockOnEdit = jest.fn();
  const mockEnableSkill = jest.fn();
  const mockDisableSkill = jest.fn();
  const mockActivateSkill = jest.fn();
  const mockDeactivateSkill = jest.fn();
  const mockDeleteSkill = jest.fn();
  const mockUpdateSkill = jest.fn();
  const mockGetSkillUsageStats = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSkillStore.mockReturnValue({
      skills: { 
        'test-skill-1': mockSkill,
        'builtin-skill-1': mockBuiltinSkill,
        'error-skill-1': mockSkillWithErrors,
      },
      enableSkill: mockEnableSkill,
      disableSkill: mockDisableSkill,
      activateSkill: mockActivateSkill,
      deactivateSkill: mockDeactivateSkill,
      deleteSkill: mockDeleteSkill,
      updateSkill: mockUpdateSkill,
      getSkillUsageStats: mockGetSkillUsageStats,
    } as unknown as ReturnType<typeof useSkillStore>);
  });

  describe('rendering', () => {
    it('renders skill not found when skill does not exist', () => {
      renderWithProviders(<SkillDetail skillId="non-existent" />);

      expect(screen.getByText('Skill not found')).toBeInTheDocument();
    });

    it('renders Go Back button when skill not found and onClose provided', () => {
      renderWithProviders(<SkillDetail skillId="non-existent" onClose={mockOnClose} />);

      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    });

    it('renders skill name in header', () => {
      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      expect(screen.getByText('test-skill')).toBeInTheDocument();
    });

    it('renders skill description', () => {
      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      expect(screen.getByText('A test skill for testing')).toBeInTheDocument();
    });

    it('renders status badge', () => {
      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      expect(screen.getByText('enabled')).toBeInTheDocument();
    });

    it('renders Active badge for active skills', () => {
      const activeSkill = { ...mockSkill, isActive: true };
      mockUseSkillStore.mockReturnValue({
        skills: { 'test-skill-1': activeSkill },
        enableSkill: mockEnableSkill,
        disableSkill: mockDisableSkill,
        activateSkill: mockActivateSkill,
        deactivateSkill: mockDeactivateSkill,
        deleteSkill: mockDeleteSkill,
        updateSkill: mockUpdateSkill,
        getSkillUsageStats: mockGetSkillUsageStats,
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders Built-in badge for builtin skills', () => {
      renderWithProviders(<SkillDetail skillId="builtin-skill-1" />);

      expect(screen.getByText('Built-in')).toBeInTheDocument();
    });

    it('renders back button when onClose provided', () => {
      renderWithProviders(<SkillDetail skillId="test-skill-1" onClose={mockOnClose} />);

      const backButtons = screen.getAllByRole('button');
      expect(backButtons.length).toBeGreaterThan(0);
    });
  });

  describe('tabs', () => {
    it('renders all tabs', () => {
      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /content/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /resources/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /edit/i })).toBeInTheDocument();
    });

    it('shows overview tab by default', () => {
      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      expect(screen.getByRole('tab', { name: /overview/i })).toHaveAttribute('data-state', 'active');
    });

    it('displays About this Skill card in overview', () => {
      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      expect(screen.getByText('About this Skill')).toBeInTheDocument();
    });

    it('displays category info in overview', () => {
      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('Development')).toBeInTheDocument();
    });

    it('displays source info in overview', () => {
      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      expect(screen.getByText('Source')).toBeInTheDocument();
      expect(screen.getByText('custom')).toBeInTheDocument();
    });

    it('displays version info in overview', () => {
      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      expect(screen.getByText('Version')).toBeInTheDocument();
      expect(screen.getByText('1.0.0')).toBeInTheDocument();
    });

    it('displays token estimate in overview', () => {
      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      expect(screen.getByText('Token Estimate')).toBeInTheDocument();
      expect(screen.getByText('~100 tokens')).toBeInTheDocument();
    });

    it('displays tags in overview', () => {
      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      expect(screen.getByText('Tags')).toBeInTheDocument();
      expect(screen.getByText('test')).toBeInTheDocument();
      expect(screen.getByText('development')).toBeInTheDocument();
    });

    it('renders content tab', () => {
      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      expect(screen.getByRole('tab', { name: /content/i })).toBeInTheDocument();
    });

    it('renders resources tab', () => {
      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      expect(screen.getByRole('tab', { name: /resources/i })).toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('renders Test button', () => {
      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      expect(screen.getByRole('button', { name: /test/i })).toBeInTheDocument();
    });

    it('renders Export button', () => {
      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('renders Delete button for custom skills', () => {
      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('does not render Delete button for builtin skills', () => {
      renderWithProviders(<SkillDetail skillId="builtin-skill-1" />);

      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('opens delete dialog when Delete button clicked', () => {
      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      fireEvent.click(screen.getByRole('button', { name: /delete/i }));

      expect(screen.getByText('Delete Skill')).toBeInTheDocument();
    });

    it('renders delete confirmation dialog when delete clicked', () => {
      renderWithProviders(<SkillDetail skillId="test-skill-1" onClose={mockOnClose} />);

      fireEvent.click(screen.getByRole('button', { name: /delete/i }));

      expect(screen.getByText('Delete Skill')).toBeInTheDocument();
    });

    it('closes delete dialog when Cancel clicked', () => {
      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(screen.queryByText('This action cannot be undone')).not.toBeInTheDocument();
    });
  });

  describe('toggle controls', () => {
    it('renders Enabled switch', () => {
      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      expect(screen.getByText('Enabled')).toBeInTheDocument();
    });

    it('renders Active in Chat switch', () => {
      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      expect(screen.getByText('Active in Chat')).toBeInTheDocument();
    });

    it('calls disableSkill when toggling enabled off', () => {
      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      const switches = document.querySelectorAll('[role="switch"]');
      fireEvent.click(switches[0]);

      expect(mockDisableSkill).toHaveBeenCalledWith('test-skill-1');
    });

    it('calls enableSkill when toggling disabled skill on', () => {
      const disabledSkill = { ...mockSkill, status: 'disabled' as const };
      mockUseSkillStore.mockReturnValue({
        skills: { 'test-skill-1': disabledSkill },
        enableSkill: mockEnableSkill,
        disableSkill: mockDisableSkill,
        activateSkill: mockActivateSkill,
        deactivateSkill: mockDeactivateSkill,
        deleteSkill: mockDeleteSkill,
        updateSkill: mockUpdateSkill,
        getSkillUsageStats: mockGetSkillUsageStats,
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      const switches = document.querySelectorAll('[role="switch"]');
      fireEvent.click(switches[0]);

      expect(mockEnableSkill).toHaveBeenCalledWith('test-skill-1');
    });

    it('calls activateSkill when toggling active on', () => {
      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      const switches = document.querySelectorAll('[role="switch"]');
      fireEvent.click(switches[1]);

      expect(mockActivateSkill).toHaveBeenCalledWith('test-skill-1');
    });

    it('calls deactivateSkill when toggling active off', () => {
      const activeSkill = { ...mockSkill, isActive: true };
      mockUseSkillStore.mockReturnValue({
        skills: { 'test-skill-1': activeSkill },
        enableSkill: mockEnableSkill,
        disableSkill: mockDisableSkill,
        activateSkill: mockActivateSkill,
        deactivateSkill: mockDeactivateSkill,
        deleteSkill: mockDeleteSkill,
        updateSkill: mockUpdateSkill,
        getSkillUsageStats: mockGetSkillUsageStats,
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      const switches = document.querySelectorAll('[role="switch"]');
      fireEvent.click(switches[1]);

      expect(mockDeactivateSkill).toHaveBeenCalledWith('test-skill-1');
    });
  });

  describe('validation errors', () => {
    it('displays validation issues card when errors exist', () => {
      renderWithProviders(<SkillDetail skillId="error-skill-1" />);

      expect(screen.getByText('Validation Issues')).toBeInTheDocument();
    });

    it('displays error messages', () => {
      renderWithProviders(<SkillDetail skillId="error-skill-1" />);

      expect(screen.getByText(/Missing required section/)).toBeInTheDocument();
    });

    it('displays warning messages', () => {
      renderWithProviders(<SkillDetail skillId="error-skill-1" />);

      expect(screen.getByText(/Too few tags/)).toBeInTheDocument();
    });
  });

  describe('test dialog', () => {
    it('renders test button', () => {
      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      const testButtons = screen.getAllByRole('button', { name: /test/i });
      expect(testButtons.length).toBeGreaterThan(0);
    });
  });

  describe('usage statistics', () => {
    it('displays usage statistics when available', () => {
      mockGetSkillUsageStats.mockReturnValue({
        skillId: 'test-skill-1',
        totalExecutions: 10,
        successfulExecutions: 8,
        averageExecutionTime: 150,
        lastExecutionAt: new Date(),
      });

      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      expect(screen.getByText('Usage Statistics')).toBeInTheDocument();
      expect(screen.getByText('Total Executions')).toBeInTheDocument();
    });

    it('displays success rate', () => {
      mockGetSkillUsageStats.mockReturnValue({
        skillId: 'test-skill-1',
        totalExecutions: 10,
        successfulExecutions: 8,
        averageExecutionTime: 150,
        lastExecutionAt: new Date(),
      });

      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      expect(screen.getByText('80%')).toBeInTheDocument();
    });

    it('displays average duration', () => {
      mockGetSkillUsageStats.mockReturnValue({
        skillId: 'test-skill-1',
        totalExecutions: 10,
        successfulExecutions: 8,
        averageExecutionTime: 150,
        lastExecutionAt: new Date(),
      });

      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      expect(screen.getByText('150ms')).toBeInTheDocument();
    });

    it('does not display usage statistics when not available', () => {
      mockGetSkillUsageStats.mockReturnValue(undefined);

      renderWithProviders(<SkillDetail skillId="test-skill-1" />);

      expect(screen.queryByText('Usage Statistics')).not.toBeInTheDocument();
    });
  });
});
