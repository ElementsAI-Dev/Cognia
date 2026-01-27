import { render, screen, fireEvent, act } from '@testing-library/react';
import { ProjectTemplatesDialog, PROJECT_TEMPLATES } from './project-templates';

// Mock next-intl with key return
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    // Return recognizable text for template names
    const translations: Record<string, string> = {
      createFromTemplate: 'createFromTemplate',
      chooseTemplate: 'chooseTemplate',
      all: 'all',
      'categories.development': 'categories.development',
      'categories.writing': 'categories.writing',
      'categories.research': 'categories.research',
      'categories.business': 'categories.business',
      'categories.personal': 'categories.personal',
      clickToCreate: 'clickToCreate',
      'codingAssistant.name': 'Coding Assistant',
      'codingAssistant.description': 'AI-powered coding help',
      'codingAssistant.instructions': 'coding instructions',
      'researchProject.name': 'Research Project',
      'researchProject.description': 'Organize research',
      'businessStrategy.name': 'Business Strategy',
      'businessStrategy.description': 'Strategic planning',
      'blankProject.name': 'Blank Project',
      'blankProject.description': 'Start fresh with a clean slate',
    };
    return translations[key] || key;
  },
}));

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock project store
const mockCreateProject = jest.fn().mockReturnValue({ id: 'new-id', name: 'Test Project' });

jest.mock('@/stores', () => ({
  useProjectStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      createProject: mockCreateProject,
    };
    return selector(state);
  },
}));

describe('ProjectTemplatesDialog', () => {
  const mockOnOpenChange = jest.fn();
  const mockOnProjectCreated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', async () => {
    await act(async () => {
      render(<ProjectTemplatesDialog open={true} onOpenChange={mockOnOpenChange} />);
    });
    expect(screen.getByText('createFromTemplate')).toBeInTheDocument();
  });

  it('displays dialog description', async () => {
    await act(async () => {
      render(<ProjectTemplatesDialog open={true} onOpenChange={mockOnOpenChange} />);
    });
    expect(screen.getByText('chooseTemplate')).toBeInTheDocument();
  });

  it('displays category filters', async () => {
    await act(async () => {
      render(<ProjectTemplatesDialog open={true} onOpenChange={mockOnOpenChange} />);
    });
    expect(screen.getByText('all')).toBeInTheDocument();
    expect(screen.getByText('categories.development')).toBeInTheDocument();
    expect(screen.getByText('categories.writing')).toBeInTheDocument();
    expect(screen.getByText('categories.research')).toBeInTheDocument();
    expect(screen.getByText('categories.business')).toBeInTheDocument();
    expect(screen.getByText('categories.personal')).toBeInTheDocument();
  });

  it('displays all templates', async () => {
    await act(async () => {
      render(<ProjectTemplatesDialog open={true} onOpenChange={mockOnOpenChange} />);
    });
    
    // Check for some template names using the i18n keys
    expect(screen.getByText('Coding Assistant')).toBeInTheDocument();
    expect(screen.getByText('Research Project')).toBeInTheDocument();
    expect(screen.getByText('Business Strategy')).toBeInTheDocument();
    expect(screen.getByText('Blank Project')).toBeInTheDocument();
  });

  it('displays template descriptions', async () => {
    await act(async () => {
      render(<ProjectTemplatesDialog open={true} onOpenChange={mockOnOpenChange} />);
    });
    
    expect(screen.getByText(/AI-powered coding help/)).toBeInTheDocument();
    expect(screen.getByText(/Start fresh with a clean slate/)).toBeInTheDocument();
  });

  it('filters templates by category', async () => {
    await act(async () => {
      render(<ProjectTemplatesDialog open={true} onOpenChange={mockOnOpenChange} />);
    });
    
    const developmentFilter = screen.getByText('categories.development');
    await act(async () => {
      fireEvent.click(developmentFilter);
    });
    
    // Only development templates should show
    expect(screen.getByText('Coding Assistant')).toBeInTheDocument();
    expect(screen.queryByText('Research Project')).not.toBeInTheDocument();
  });

  it('creates project when template is selected', async () => {
    await act(async () => {
      render(
        <ProjectTemplatesDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onProjectCreated={mockOnProjectCreated}
        />
      );
    });
    
    // Find template card by its name text
    const codingTemplateText = screen.getByText('Coding Assistant');
    const card = codingTemplateText.closest('[data-slot="card-content"]')?.parentElement;
    if (card) {
      await act(async () => {
        fireEvent.click(card);
      });
    }
    
    expect(mockCreateProject).toHaveBeenCalled();
  });

  it('does not render when closed', async () => {
    await act(async () => {
      render(<ProjectTemplatesDialog open={false} onOpenChange={mockOnOpenChange} />);
    });
    expect(screen.queryByText('createFromTemplate')).not.toBeInTheDocument();
  });
});

describe('PROJECT_TEMPLATES', () => {
  it('has expected templates', () => {
    expect(PROJECT_TEMPLATES.length).toBeGreaterThan(0);
  });

  it('all templates have required fields', () => {
    PROJECT_TEMPLATES.forEach((template) => {
      expect(template.id).toBeTruthy();
      expect(template.name).toBeTruthy();
      expect(template.description).toBeTruthy();
      expect(template.icon).toBeTruthy();
      expect(template.color).toBeTruthy();
      expect(template.defaultMode).toBeTruthy();
      expect(template.category).toBeTruthy();
    });
  });

  it('includes blank project template', () => {
    const blankTemplate = PROJECT_TEMPLATES.find((t) => t.id === 'blank-project');
    expect(blankTemplate).toBeDefined();
    expect(blankTemplate?.name).toBe('Blank Project');
  });
});
