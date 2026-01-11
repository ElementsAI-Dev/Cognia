import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SkillWizard } from './skill-wizard';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useSkillStore } from '@/stores/skills';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
};

jest.mock('@/stores/skills', () => ({
  useSkillStore: jest.fn(),
}));
jest.mock('@/lib/skills/templates', () => ({
  getAllTemplates: jest.fn(() => [
    {
      id: 'code-review',
      name: 'Code Review',
      description: 'Template for code review skills',
      category: 'development',
      icon: '👀',
      tags: ['code', 'review'],
      defaultContent: '# Code Review\n\nReview code for best practices.',
    },
    {
      id: 'writing-helper',
      name: 'Writing Helper',
      description: 'Template for writing assistance',
      category: 'communication',
      icon: '✍️',
      tags: ['writing'],
      defaultContent: '# Writing Helper\n\nHelp with writing tasks.',
    },
  ]),
}));
jest.mock('@/lib/skills/parser', () => ({
  parseSkillMd: jest.fn((content) => ({
    success: true,
    skill: { content },
    errors: [],
  })),
}));

const mockUseSkillStore = useSkillStore as jest.MockedFunction<typeof useSkillStore>;

describe('SkillWizard', () => {
  const mockOnComplete = jest.fn();
  const mockOnCancel = jest.fn();
  const mockCreateSkill = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateSkill.mockReturnValue({ id: 'new-skill-id' });
    mockUseSkillStore.mockReturnValue({
      createSkill: mockCreateSkill,
    } as unknown as ReturnType<typeof useSkillStore>);
  });

  describe('rendering', () => {
    it('renders wizard title', () => {
      renderWithProviders(<SkillWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      expect(screen.getByText(/Create New Skill/i)).toBeInTheDocument();
    });

    it('renders close button', () => {
      renderWithProviders(<SkillWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      const closeButtons = screen.getAllByRole('button');
      expect(closeButtons.length).toBeGreaterThan(0);
    });

    it('renders step indicator', () => {
      renderWithProviders(<SkillWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      // The step indicator shows "Start" as the first step - use getAllByText since multiple elements may contain "Start"
      const startElements = screen.getAllByText(/Start/i);
      expect(startElements.length).toBeGreaterThan(0);
    });

    it('shows start step by default', () => {
      renderWithProviders(<SkillWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      expect(screen.getByText(/How would you like to start/i)).toBeInTheDocument();
      expect(screen.getByText(/Choose whether to start/i)).toBeInTheDocument();
    });

    it('renders template and blank options', () => {
      renderWithProviders(<SkillWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      expect(screen.getByText(/Start from Template/i)).toBeInTheDocument();
      expect(screen.getByText(/Start from Scratch/i)).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('shows disabled Back button on first step', () => {
      renderWithProviders(<SkillWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      const backButton = screen.getByRole('button', { name: /back/i });
      expect(backButton).toBeDisabled();
    });

    it('shows disabled Next button until choice is made', () => {
      renderWithProviders(<SkillWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();
    });

    it('enables Next button after selecting template option', () => {
      renderWithProviders(<SkillWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByText(/Start from Template/i));

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).not.toBeDisabled();
    });

    it('enables Next button after selecting blank option', () => {
      renderWithProviders(<SkillWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByText(/Start from Scratch/i));

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).not.toBeDisabled();
    });

    it('calls onCancel when Cancel button clicked', () => {
      renderWithProviders(<SkillWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('calls onCancel when X button clicked', () => {
      renderWithProviders(<SkillWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      const closeButton = screen.getAllByRole('button')[0];
      fireEvent.click(closeButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('template flow', () => {
    it('navigates to template selection when template option chosen', () => {
      renderWithProviders(<SkillWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByText(/Start from Template/i));
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      expect(screen.getByText(/Choose a Template/i)).toBeInTheDocument();
    });

    it('displays available templates', () => {
      renderWithProviders(<SkillWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByText(/Start from Template/i));
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      expect(screen.getByText('Code Review')).toBeInTheDocument();
      expect(screen.getByText('Writing Helper')).toBeInTheDocument();
    });

    it('displays template descriptions', () => {
      renderWithProviders(<SkillWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByText(/Start from Template/i));
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      expect(screen.getByText('Template for code review skills')).toBeInTheDocument();
    });

    it('displays template tags', () => {
      renderWithProviders(<SkillWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByText(/Start from Template/i));
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      expect(screen.getByText('code')).toBeInTheDocument();
      expect(screen.getByText('review')).toBeInTheDocument();
    });

    it('enables Next after selecting template', () => {
      renderWithProviders(<SkillWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByText(/Start from Template/i));
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      fireEvent.click(screen.getByText('Code Review'));

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).not.toBeDisabled();
    });

    it('pre-fills basic info from template', () => {
      renderWithProviders(<SkillWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByText(/Start from Template/i));
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      fireEvent.click(screen.getByText('Code Review'));
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      const nameInput = screen.getByLabelText(/Skill Name/i);
      expect(nameInput).toHaveValue('code-review');
    });
  });

  describe('blank flow', () => {
    it('navigates directly to basic info when blank chosen', () => {
      renderWithProviders(<SkillWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByText(/Start from Scratch/i));
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      expect(screen.getByText(/Basic Information/i)).toBeInTheDocument();
    });
  });

  describe('basic info step', () => {
    beforeEach(() => {
      renderWithProviders(<SkillWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);
      fireEvent.click(screen.getByText(/Start from Scratch/i));
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    });

    it('displays name input', () => {
      expect(screen.getByLabelText(/Skill Name/i)).toBeInTheDocument();
    });

    it('displays description input', () => {
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    });

    it('displays category selector', () => {
      expect(screen.getByText(/Category|category/i)).toBeInTheDocument();
    });

    it('displays tags input', () => {
      expect(screen.getByLabelText(/tags/i)).toBeInTheDocument();
    });

    it('validates name length', () => {
      const nameInput = screen.getByLabelText(/Skill Name/i);
      fireEvent.change(nameInput, { target: { value: 'ab' } });

      expect(screen.getByText(/Name must be at least 3 characters/i)).toBeInTheDocument();
    });

    it('validates name input', () => {
      const nameInput = screen.getByLabelText(/Skill Name/i);
      fireEvent.change(nameInput, { target: { value: 'test-skill' } });

      expect(nameInput).toHaveValue('test-skill');
    });

    it('validates description length', () => {
      const descInput = screen.getByLabelText(/Description/i);
      const longDescription = 'a'.repeat(1025);
      fireEvent.change(descInput, { target: { value: longDescription } });

      expect(screen.getByText(/Description must be 1024 characters or less/i)).toBeInTheDocument();
    });

    it('shows character count for description', () => {
      const descInput = screen.getByLabelText(/Description/i);
      fireEvent.change(descInput, { target: { value: 'Test description' } });

      expect(screen.getByText('16/1024')).toBeInTheDocument();
    });

    it('allows selecting category', () => {
      const developmentCard = screen.getByText('Development').closest('[data-slot="card"]');
      fireEvent.click(developmentCard!);

      expect(developmentCard).toHaveClass('border-primary');
    });

    it('enables Next when valid input provided', () => {
      const nameInput = screen.getByLabelText(/Skill Name/i);
      const descInput = screen.getByLabelText(/Description/i);

      fireEvent.change(nameInput, { target: { value: 'valid-name' } });
      fireEvent.change(descInput, { target: { value: 'Valid description' } });

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).not.toBeDisabled();
    });

    it('goes back to start step', () => {
      fireEvent.click(screen.getByRole('button', { name: /back/i }));

      expect(screen.getByText(/How would you like to start/i)).toBeInTheDocument();
    });
  });

  describe('content step', () => {
    beforeEach(() => {
      renderWithProviders(<SkillWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);
      fireEvent.click(screen.getByText(/Start from Scratch/i));
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      const nameInput = screen.getByLabelText(/Skill Name/i);
      const descInput = screen.getByLabelText(/Description/i);
      fireEvent.change(nameInput, { target: { value: 'test-skill' } });
      fireEvent.change(descInput, { target: { value: 'Test description' } });

      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    });

    it('displays content textarea', () => {
      expect(screen.getByLabelText(/instructions/i)).toBeInTheDocument();
    });

    it('shows line count', () => {
      const textarea = screen.getByLabelText(/instructions/i);
      fireEvent.change(textarea, { target: { value: 'Line 1\nLine 2\nLine 3' } });

      expect(screen.getByText(/3.*lines/i)).toBeInTheDocument();
    });

    it('enables Next when content provided', () => {
      const textarea = screen.getByLabelText(/instructions/i);
      fireEvent.change(textarea, { target: { value: '# Test Content' } });

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).not.toBeDisabled();
    });
  });

  describe('preview step', () => {
    beforeEach(() => {
      renderWithProviders(<SkillWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);
      fireEvent.click(screen.getByText(/Start from Scratch/i));
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      const nameInput = screen.getByLabelText(/Skill Name/i);
      const descInput = screen.getByLabelText(/Description/i);
      fireEvent.change(nameInput, { target: { value: 'test-skill' } });
      fireEvent.change(descInput, { target: { value: 'Test description' } });

      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      const textarea = screen.getByLabelText(/instructions/i);
      fireEvent.change(textarea, { target: { value: '# Test Content' } });

      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    });

    it('displays preview header', () => {
      expect(screen.getByText(/Preview Your Skill/i)).toBeInTheDocument();
    });

    it('displays skill name in preview', () => {
      expect(screen.getByText('test-skill')).toBeInTheDocument();
    });

    it('displays skill description in preview', () => {
      expect(screen.getByText('Test description')).toBeInTheDocument();
    });

    it('displays category badge in preview', () => {
      expect(screen.getByText('custom')).toBeInTheDocument();
    });

    it('shows Create Skill button', () => {
      expect(screen.getByRole('button', { name: /Create Skill/i })).toBeInTheDocument();
    });

    it('creates skill when Create Skill clicked', async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create Skill/i }));

      await waitFor(() => {
        expect(mockCreateSkill).toHaveBeenCalled();
      });
    });

    it('calls onComplete with skill id after creation', async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create Skill/i }));

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith('new-skill-id');
      });
    });
  });

  describe('error handling', () => {
    it('displays error when skill creation fails', async () => {
      mockCreateSkill.mockImplementation(() => {
        throw new Error('Creation failed');
      });

      renderWithProviders(<SkillWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      // Navigate to preview
      fireEvent.click(screen.getByText(/Start from Scratch/i));
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      const nameInput = screen.getByLabelText(/Skill Name/i);
      const descInput = screen.getByLabelText(/Description/i);
      fireEvent.change(nameInput, { target: { value: 'test-skill' } });
      fireEvent.change(descInput, { target: { value: 'Test description' } });

      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      const textarea = screen.getByLabelText(/instructions/i);
      fireEvent.change(textarea, { target: { value: '# Test Content' } });

      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      fireEvent.click(screen.getByRole('button', { name: /Create Skill/i }));

      await waitFor(() => {
        expect(screen.getByText('Creation failed')).toBeInTheDocument();
      });
    });
  });

  describe('category options', () => {
    beforeEach(() => {
      renderWithProviders(<SkillWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);
      fireEvent.click(screen.getByText(/Start from Scratch/i));
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    });

    const categories = [
      'Creative & Design',
      'Development',
      'Enterprise',
      'Productivity',
      'Data Analysis',
      'Communication',
      'Meta Skills',
      'Custom',
    ];

    categories.forEach((category) => {
      it(`displays ${category} category option`, () => {
        expect(screen.getByText(category)).toBeInTheDocument();
      });
    });
  });
});

