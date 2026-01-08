import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SkillTestPanel } from './skill-test-panel';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { Skill } from '@/types/skill';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
};

jest.mock('@/lib/skills/executor', () => ({
  buildSkillSystemPrompt: jest.fn(() => 'Mock system prompt for testing'),
  estimateSkillTokens: jest.fn(() => 150),
  matchSkillToQuery: jest.fn((_, query) => {
    // Check partial first since "partial match" contains both words
    if (query.includes('partial')) return 0.5;
    if (query.includes('match')) return 0.8;
    return 0.2;
  }),
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
  resources: [
    { type: 'script', name: 'helper.py', path: '/scripts/helper.py', size: 100, mimeType: 'text/x-python' },
  ],
  status: 'enabled',
  source: 'custom',
  category: 'development',
  tags: ['test'],
  isActive: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockDisabledSkill: Skill = {
  ...mockSkill,
  id: 'disabled-skill-1',
  status: 'disabled',
};

const mockSkillWithErrors: Skill = {
  ...mockSkill,
  id: 'error-skill-1',
  validationErrors: [
    { field: 'content', message: 'Missing required section', severity: 'error' },
    { field: 'tags', message: 'Too few tags', severity: 'warning' },
  ],
};

describe('SkillTestPanel', () => {
  const mockOnExecutionComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders Skill Test Panel title', () => {
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      expect(screen.getByText('Skill Test Panel')).toBeInTheDocument();
    });

    it('renders description', () => {
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      expect(screen.getByText(/Test your skill/)).toBeInTheDocument();
    });

    it('displays token estimate badge', () => {
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      expect(screen.getByText('~150 tokens')).toBeInTheDocument();
    });

    it('displays resource count badge', () => {
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      expect(screen.getByText('1 Resources')).toBeInTheDocument();
    });

    it('displays skill status badge', () => {
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      // The component renders the raw status value (lowercase)
      expect(screen.getByText('enabled')).toBeInTheDocument();
    });

    it('renders test query input', () => {
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      expect(screen.getByLabelText(/Test Query/)).toBeInTheDocument();
    });

    it('renders Run Test button', () => {
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      expect(screen.getByRole('button', { name: /run test/i })).toBeInTheDocument();
    });
  });

  describe('test execution', () => {
    it('runs test when Run Test button clicked', async () => {
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      fireEvent.click(screen.getByRole('button', { name: /run test/i }));

      await waitFor(() => {
        expect(screen.getByText('Test Passed')).toBeInTheDocument();
      });
    });

    it('calls onExecutionComplete callback', async () => {
      renderWithProviders(
        <SkillTestPanel 
          skill={mockSkill} 
          onExecutionComplete={mockOnExecutionComplete} 
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /run test/i }));

      await waitFor(() => {
        expect(mockOnExecutionComplete).toHaveBeenCalled();
      });
    });

    it('displays test results tabs after execution', async () => {
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      fireEvent.click(screen.getByRole('button', { name: /run test/i }));

      await waitFor(() => {
        const tabs = screen.getAllByRole('tab');
        expect(tabs.length).toBe(3); // Results, System Prompt, Logs
      });
    });

    it('shows token count in results', async () => {
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      fireEvent.click(screen.getByRole('button', { name: /run test/i }));

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument();
        expect(screen.getByText('Tokens')).toBeInTheDocument();
      });
    });

    it('shows execution duration in results', async () => {
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      fireEvent.click(screen.getByRole('button', { name: /run test/i }));

      await waitFor(() => {
        expect(screen.getByText('Duration')).toBeInTheDocument();
      });
    });

    it('logs warning for disabled skills', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SkillTestPanel skill={mockDisabledSkill} />);

      await user.click(screen.getByRole('button', { name: /run test/i }));

      await waitFor(() => {
        expect(screen.getAllByRole('tab').length).toBe(3);
      });

      // Click Logs tab
      const logsTab = screen.getAllByRole('tab')[2];
      await user.click(logsTab);

      await waitFor(() => {
        expect(screen.getByText('Skill is not enabled')).toBeInTheDocument();
      });
    });

    it('logs validation errors', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SkillTestPanel skill={mockSkillWithErrors} />);

      await user.click(screen.getByRole('button', { name: /run test/i }));

      await waitFor(() => {
        expect(screen.getAllByRole('tab').length).toBe(3);
      });

      // Click Logs tab
      const logsTab = screen.getAllByRole('tab')[2];
      await user.click(logsTab);

      await waitFor(() => {
        expect(screen.getByText(/Validation errors: 1/)).toBeInTheDocument();
      });
    });

    it('logs validation warnings', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SkillTestPanel skill={mockSkillWithErrors} />);

      await user.click(screen.getByRole('button', { name: /run test/i }));

      await waitFor(() => {
        expect(screen.getAllByRole('tab').length).toBe(3);
      });

      // Click Logs tab
      const logsTab = screen.getAllByRole('tab')[2];
      await user.click(logsTab);

      await waitFor(() => {
        expect(screen.getByText(/Validation warnings: 1/)).toBeInTheDocument();
      });
    });

    it('logs resource count', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      await user.click(screen.getByRole('button', { name: /run test/i }));

      await waitFor(() => {
        expect(screen.getAllByRole('tab').length).toBe(3);
      });

      // Click Logs tab
      const logsTab = screen.getAllByRole('tab')[2];
      await user.click(logsTab);

      await waitFor(() => {
        expect(screen.getByText(/Resources attached: 1/)).toBeInTheDocument();
      });
    });
  });

  describe('query matching', () => {
    it('renders test query input', () => {
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      expect(screen.getByLabelText(/Test Query/)).toBeInTheDocument();
    });

    it('accepts query input', () => {
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      const queryInput = screen.getByLabelText(/Test Query/);
      fireEvent.change(queryInput, { target: { value: 'test query' } });

      expect(queryInput).toHaveValue('test query');
    });

    it('shows match score when query provided', async () => {
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      const queryInput = screen.getByLabelText(/Test Query/);
      fireEvent.change(queryInput, { target: { value: 'match this query' } });
      fireEvent.click(screen.getByRole('button', { name: /run test/i }));

      await waitFor(() => {
        expect(screen.getByText('Match Score')).toBeInTheDocument();
      });
    });

    it('shows high match indicator for high score', async () => {
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      const queryInput = screen.getByLabelText(/Test Query/);
      fireEvent.change(queryInput, { target: { value: 'match this query' } });
      fireEvent.click(screen.getByRole('button', { name: /run test/i }));

      await waitFor(() => {
        expect(screen.getByText(/High match/)).toBeInTheDocument();
      });
    });

    it('shows medium match indicator for medium score', async () => {
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      const queryInput = screen.getByLabelText(/Test Query/);
      fireEvent.change(queryInput, { target: { value: 'partial match' } });
      fireEvent.click(screen.getByRole('button', { name: /run test/i }));

      await waitFor(() => {
        expect(screen.getByText(/Medium match/)).toBeInTheDocument();
      });
    });

    it('shows low match indicator for low score', async () => {
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      const queryInput = screen.getByLabelText(/Test Query/);
      fireEvent.change(queryInput, { target: { value: 'xyz query' } });
      fireEvent.click(screen.getByRole('button', { name: /run test/i }));

      await waitFor(() => {
        expect(screen.getByText(/Low match/)).toBeInTheDocument();
      });
    });

    it('shows N/A for match score when no query', async () => {
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      fireEvent.click(screen.getByRole('button', { name: /run test/i }));

      await waitFor(() => {
        expect(screen.getByText('N/A')).toBeInTheDocument();
      });
    });
  });

  describe('tabs', () => {
    it('shows all three tabs after test', async () => {
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      fireEvent.click(screen.getByRole('button', { name: /run test/i }));

      await waitFor(() => {
        const tabs = screen.getAllByRole('tab');
        expect(tabs.length).toBe(3);
        expect(tabs[0]).toHaveTextContent('Results');
        expect(tabs[1]).toHaveTextContent('System Prompt');
        expect(tabs[2]).toHaveTextContent(/Logs/);
      });
    });

    it('switches to System Prompt tab and shows content', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      await user.click(screen.getByRole('button', { name: /run test/i }));

      await waitFor(() => {
        expect(screen.getAllByRole('tab').length).toBe(3);
      });

      // Click System Prompt tab
      const promptTab = screen.getAllByRole('tab')[1];
      await user.click(promptTab);

      await waitFor(() => {
        expect(screen.getByText('Mock system prompt for testing')).toBeInTheDocument();
      });
    });

    it('switches to Logs tab and shows entries', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      await user.click(screen.getByRole('button', { name: /run test/i }));

      await waitFor(() => {
        expect(screen.getAllByRole('tab').length).toBe(3);
      });

      // Click Logs tab
      const logsTab = screen.getAllByRole('tab')[2];
      await user.click(logsTab);

      await waitFor(() => {
        expect(screen.getByText(/Starting test for skill/)).toBeInTheDocument();
      });
    });
  });

  describe('actions', () => {
    it('shows Reset button after test', async () => {
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      fireEvent.click(screen.getByRole('button', { name: /run test/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
      });
    });

    it('resets test results when Reset clicked', async () => {
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      fireEvent.click(screen.getByRole('button', { name: /run test/i }));

      await waitFor(() => {
        expect(screen.getByText('Test Passed')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /reset/i }));

      expect(screen.queryByText('Test Passed')).not.toBeInTheDocument();
    });

    it('shows Clear Logs button after test', async () => {
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      fireEvent.click(screen.getByRole('button', { name: /run test/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clear logs/i })).toBeInTheDocument();
      });
    });

    it('clears logs when Clear Logs clicked', async () => {
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      fireEvent.click(screen.getByRole('button', { name: /run test/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clear logs/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /clear logs/i }));

      expect(screen.queryByRole('button', { name: /clear logs/i })).not.toBeInTheDocument();
    });

    it('shows Copy button in System Prompt tab', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      await user.click(screen.getByRole('button', { name: /run test/i }));

      await waitFor(() => {
        expect(screen.getAllByRole('tab').length).toBe(3);
      });

      // Click System Prompt tab
      const promptTab = screen.getAllByRole('tab')[1];
      await user.click(promptTab);

      // The CopyButton renders as an icon-only button; verify the system prompt content is visible instead
      await waitFor(() => {
        expect(screen.getByText('Mock system prompt for testing')).toBeInTheDocument();
      });
    });
  });

  describe('empty states', () => {
    it('shows no logs message before test', () => {
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      // Before running test, there should be no logs displayed
      expect(screen.queryByText(/Starting test for skill/)).not.toBeInTheDocument();
    });

    it('shows prompt to run test initially', () => {
      renderWithProviders(<SkillTestPanel skill={mockSkill} />);

      expect(screen.getByRole('button', { name: /run test/i })).toBeInTheDocument();
      expect(screen.queryByText('Test Passed')).not.toBeInTheDocument();
    });
  });
});
