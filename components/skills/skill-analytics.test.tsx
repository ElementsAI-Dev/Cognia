import { render, screen } from '@testing-library/react';
import { SkillAnalytics } from './skill-analytics';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useSkillStore } from '@/stores/agent';
import type { Skill, SkillUsageStats } from '@/types/skill';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
};

jest.mock('@/stores/agent', () => ({
  useSkillStore: jest.fn(),
}));
jest.mock('@/lib/skills/executor', () => ({
  estimateSkillTokens: jest.fn(() => 100),
}));

const mockSkill: Skill = {
  id: 'test-skill-1',
  metadata: {
    name: 'test-skill',
    description: 'A test skill',
  },
  content: '# Test Skill',
  rawContent: '---\nname: test-skill\n---\n# Test Skill',
  resources: [],
  status: 'enabled',
  source: 'custom',
  category: 'development',
  tags: ['test'],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUsageStats: SkillUsageStats = {
  skillId: 'test-skill-1',
  totalExecutions: 10,
  successfulExecutions: 8,
  averageExecutionTime: 150,
  lastExecutionAt: new Date(),
};

const mockUseSkillStore = useSkillStore as jest.MockedFunction<typeof useSkillStore>;

describe('SkillAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SingleSkillAnalytics', () => {
    it('renders skill not found when skill does not exist', () => {
      mockUseSkillStore.mockReturnValue({
        skills: {},
        activeSkillIds: [],
        getSkillUsageStats: jest.fn(() => undefined),
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillAnalytics skillId="non-existent" />);

      expect(screen.getByText('Skill not found')).toBeInTheDocument();
    });

    it('renders skill analytics when skill exists', () => {
      mockUseSkillStore.mockReturnValue({
        skills: { 'test-skill-1': mockSkill },
        activeSkillIds: ['test-skill-1'],
        getSkillUsageStats: jest.fn(() => mockUsageStats),
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillAnalytics skillId="test-skill-1" />);

      expect(screen.getByText('Total Executions')).toBeInTheDocument();
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
      expect(screen.getByText(/Avg\.? Duration/i)).toBeInTheDocument();
      expect(screen.getByText('Token Cost')).toBeInTheDocument();
    });

    it('displays total executions count', () => {
      mockUseSkillStore.mockReturnValue({
        skills: { 'test-skill-1': mockSkill },
        activeSkillIds: ['test-skill-1'],
        getSkillUsageStats: jest.fn(() => mockUsageStats),
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillAnalytics skillId="test-skill-1" />);

      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('displays success rate percentage', () => {
      mockUseSkillStore.mockReturnValue({
        skills: { 'test-skill-1': mockSkill },
        activeSkillIds: ['test-skill-1'],
        getSkillUsageStats: jest.fn(() => mockUsageStats),
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillAnalytics skillId="test-skill-1" />);

      expect(screen.getByText('80%')).toBeInTheDocument();
    });

    it('displays execution history when stats exist', () => {
      mockUseSkillStore.mockReturnValue({
        skills: { 'test-skill-1': mockSkill },
        activeSkillIds: ['test-skill-1'],
        getSkillUsageStats: jest.fn(() => mockUsageStats),
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillAnalytics skillId="test-skill-1" />);

      expect(screen.getByText('Execution History')).toBeInTheDocument();
      expect(screen.getByText('Successful')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    it('displays successful execution count', () => {
      mockUseSkillStore.mockReturnValue({
        skills: { 'test-skill-1': mockSkill },
        activeSkillIds: ['test-skill-1'],
        getSkillUsageStats: jest.fn(() => mockUsageStats),
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillAnalytics skillId="test-skill-1" />);

      expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('displays failed execution count', () => {
      mockUseSkillStore.mockReturnValue({
        skills: { 'test-skill-1': mockSkill },
        activeSkillIds: ['test-skill-1'],
        getSkillUsageStats: jest.fn(() => mockUsageStats),
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillAnalytics skillId="test-skill-1" />);

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('shows no usage data message when no stats', () => {
      mockUseSkillStore.mockReturnValue({
        skills: { 'test-skill-1': mockSkill },
        activeSkillIds: ['test-skill-1'],
        getSkillUsageStats: jest.fn(() => undefined),
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillAnalytics skillId="test-skill-1" />);

      expect(screen.getByText('No usage data yet')).toBeInTheDocument();
    });

    it('shows no usage data when executions are zero', () => {
      const emptyStats: SkillUsageStats = {
        skillId: 'test-skill-1',
        totalExecutions: 0,
        successfulExecutions: 0,
        averageExecutionTime: 0,
      };

      mockUseSkillStore.mockReturnValue({
        skills: { 'test-skill-1': mockSkill },
        activeSkillIds: ['test-skill-1'],
        getSkillUsageStats: jest.fn(() => emptyStats),
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillAnalytics skillId="test-skill-1" />);

      expect(screen.getByText('No usage data yet')).toBeInTheDocument();
    });
  });

  describe('OverallAnalytics', () => {
    it('renders overall analytics when no skillId provided', () => {
      mockUseSkillStore.mockReturnValue({
        skills: { 'test-skill-1': mockSkill },
        activeSkillIds: ['test-skill-1'],
        getSkillUsageStats: jest.fn(() => mockUsageStats),
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillAnalytics />);

      expect(screen.getByText('Total Skills')).toBeInTheDocument();
      expect(screen.getByText('Active Skills')).toBeInTheDocument();
    });

    it('displays total skills count', () => {
      mockUseSkillStore.mockReturnValue({
        skills: { 
          'test-skill-1': mockSkill,
          'test-skill-2': { ...mockSkill, id: 'test-skill-2' },
        },
        activeSkillIds: ['test-skill-1'],
        getSkillUsageStats: jest.fn(() => mockUsageStats),
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillAnalytics />);

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('displays active skills count', () => {
      mockUseSkillStore.mockReturnValue({
        skills: { 'test-skill-1': mockSkill },
        activeSkillIds: ['test-skill-1'],
        getSkillUsageStats: jest.fn(() => mockUsageStats),
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillAnalytics />);

      // Check that inCurrentSession label exists (indicates active skills card)
      expect(screen.getByText('in current session')).toBeInTheDocument();
    });

    it('displays token budget card', () => {
      mockUseSkillStore.mockReturnValue({
        skills: { 'test-skill-1': mockSkill },
        activeSkillIds: ['test-skill-1'],
        getSkillUsageStats: jest.fn(() => mockUsageStats),
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillAnalytics />);

      expect(screen.getByText('Token Budget')).toBeInTheDocument();
    });

    it('displays most used skills section when data exists', () => {
      mockUseSkillStore.mockReturnValue({
        skills: { 'test-skill-1': mockSkill },
        activeSkillIds: ['test-skill-1'],
        getSkillUsageStats: jest.fn(() => mockUsageStats),
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillAnalytics />);

      expect(screen.getByText('Most Used Skills')).toBeInTheDocument();
    });

    it('displays recently used skills section when data exists', () => {
      mockUseSkillStore.mockReturnValue({
        skills: { 'test-skill-1': mockSkill },
        activeSkillIds: ['test-skill-1'],
        getSkillUsageStats: jest.fn(() => mockUsageStats),
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillAnalytics />);

      expect(screen.getByText('Recently Used')).toBeInTheDocument();
    });

    it('shows no usage data message when no executions', () => {
      mockUseSkillStore.mockReturnValue({
        skills: { 'test-skill-1': mockSkill },
        activeSkillIds: [],
        getSkillUsageStats: jest.fn(() => undefined),
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillAnalytics />);

      expect(screen.getByText('No usage data yet')).toBeInTheDocument();
    });

    it('displays enabled skills count in subtitle', () => {
      mockUseSkillStore.mockReturnValue({
        skills: { 
          'test-skill-1': mockSkill,
          'test-skill-2': { ...mockSkill, id: 'test-skill-2', status: 'disabled' },
        },
        activeSkillIds: [],
        getSkillUsageStats: jest.fn(() => undefined),
      } as unknown as ReturnType<typeof useSkillStore>);

      renderWithProviders(<SkillAnalytics />);

      // Translation: "{count} enabled" becomes "1 enabled"
      const enabledElements = screen.getAllByText(/\d+ enabled/);
      expect(enabledElements.length).toBeGreaterThan(0);
    });
  });
});
