/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CreateSkillDialog } from './create-skill-dialog';

// Mock skill templates
jest.mock('@/lib/skills/templates', () => ({
  getAllTemplates: () => [
    {
      id: 'template-1',
      name: 'Code Review',
      description: 'Review code quality',
      icon: '🔍',
      category: 'development',
      defaultContent: '# Code Review\n\nReview code...',
    },
    {
      id: 'template-2',
      name: 'Writing Assistant',
      description: 'Help with writing',
      icon: '✍️',
      category: 'creative-design',
      defaultContent: '# Writing\n\nHelp write...',
    },
  ],
  getTemplateById: (id: string) => {
    const templates: Record<
      string,
      { id: string; name: string; description: string; category: string; defaultContent: string }
    > = {
      'template-1': {
        id: 'template-1',
        name: 'Code Review',
        description: 'Review code quality',
        category: 'development',
        defaultContent: '# Code Review',
      },
      'template-2': {
        id: 'template-2',
        name: 'Writing Assistant',
        description: 'Help with writing',
        category: 'creative-design',
        defaultContent: '# Writing',
      },
    };
    return templates[id];
  },
}));

// Mock skill parser
jest.mock('@/lib/skills/parser', () => ({
  toHyphenCase: (name: string) => name.toLowerCase().replace(/\s+/g, '-'),
}));

// Mock skill icons
jest.mock('./skill-icons', () => ({
  SKILL_CATEGORY_ICONS: {
    'creative-design': <span data-testid="icon-creative">🎨</span>,
    development: <span data-testid="icon-dev">💻</span>,
    enterprise: <span data-testid="icon-enterprise">🏢</span>,
    productivity: <span data-testid="icon-productivity">⚡</span>,
    'data-analysis': <span data-testid="icon-data">📊</span>,
    communication: <span data-testid="icon-comm">💬</span>,
    meta: <span data-testid="icon-meta">⚙️</span>,
    custom: <span data-testid="icon-custom">📄</span>,
  },
}));

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, id }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      id={id}
      data-testid={`input-${id}`}
    />
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({
    value,
    onChange,
    placeholder,
    id,
    rows,
  }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      id={id}
      rows={rows}
      data-testid={`textarea-${id}`}
    />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({
    children,
    className,
    onClick,
  }: {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
  }) => (
    <div data-testid="card" className={className} onClick={onClick}>
      {children}
    </div>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h4>{children}</h4>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => (
    <div data-testid="tabs" data-value={value}>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(
              child as React.ReactElement<{ onValueChange?: (v: string) => void }>,
              { onValueChange }
            )
          : child
      )}
    </div>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`tabs-content-${value}`}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tabs-list">{children}</div>
  ),
  TabsTrigger: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange?: (v: string) => void;
  }) => (
    <button data-testid={`tab-trigger-${value}`} onClick={() => onValueChange?.(value)}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value }: { children: React.ReactNode; value?: string }) => (
    <div data-testid="select" data-value={value}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  SelectValue: () => <span>Select</span>,
}));

// Mock translation function
const mockT = (key: string) => {
  const translations: Record<string, string> = {
    createNewSkill: 'Create New Skill',
    createNewSkillDesc: 'Create a new skill from scratch or use a template',
    startBlank: 'Start Blank',
    useTemplate: 'Use Template',
    startBlankDesc: 'Start with a blank skill',
    name: 'Name',
    nameHint: 'Use lowercase with hyphens',
    category: 'Category',
    descriptionLabel: 'Description',
    descriptionPlaceholder: 'Describe what this skill does...',
    descriptionHint: 'Brief description of the skill',
    skillInstructions: 'Skill Instructions (Markdown)',
    cancel: 'Cancel',
    createSkill: 'Create Skill',
  };
  return translations[key] || key;
};

describe('CreateSkillDialog', () => {
  const mockOnOpenChange = jest.fn();
  const mockOnCreateSkill = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    render(
      <CreateSkillDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        onCreateSkill={mockOnCreateSkill}
        t={mockT}
      />
    );
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog when open', () => {
    render(
      <CreateSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateSkill={mockOnCreateSkill}
        t={mockT}
      />
    );
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('Create New Skill')).toBeInTheDocument();
  });

  it('displays dialog description', () => {
    render(
      <CreateSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateSkill={mockOnCreateSkill}
        t={mockT}
      />
    );
    expect(
      screen.getByText('Create a new skill from scratch or use a template')
    ).toBeInTheDocument();
  });

  it('displays tabs for blank and template modes', () => {
    render(
      <CreateSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateSkill={mockOnCreateSkill}
        t={mockT}
      />
    );
    expect(screen.getByTestId('tab-trigger-blank')).toBeInTheDocument();
    expect(screen.getByTestId('tab-trigger-template')).toBeInTheDocument();
  });

  it('displays form fields', () => {
    render(
      <CreateSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateSkill={mockOnCreateSkill}
        t={mockT}
      />
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Skill Instructions (Markdown)')).toBeInTheDocument();
  });

  it('displays cancel and create buttons', () => {
    render(
      <CreateSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateSkill={mockOnCreateSkill}
        t={mockT}
      />
    );
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Create Skill')).toBeInTheDocument();
  });

  it('displays name and description inputs', () => {
    render(
      <CreateSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateSkill={mockOnCreateSkill}
        t={mockT}
      />
    );
    expect(screen.getByTestId('input-name')).toBeInTheDocument();
    expect(screen.getByTestId('textarea-description')).toBeInTheDocument();
  });

  it('displays textarea for skill content', () => {
    render(
      <CreateSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateSkill={mockOnCreateSkill}
        t={mockT}
      />
    );
    expect(screen.getByTestId('textarea-content')).toBeInTheDocument();
  });

  it('updates name input value on change', () => {
    render(
      <CreateSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateSkill={mockOnCreateSkill}
        t={mockT}
      />
    );
    const nameInput = screen.getByTestId('input-name');
    fireEvent.change(nameInput, { target: { value: 'my-new-skill' } });
    expect(nameInput).toHaveValue('my-new-skill');
  });

  it('updates description on change', () => {
    render(
      <CreateSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateSkill={mockOnCreateSkill}
        t={mockT}
      />
    );
    const descInput = screen.getByTestId('textarea-description');
    fireEvent.change(descInput, { target: { value: 'A test skill description' } });
    expect(descInput).toHaveValue('A test skill description');
  });

  it('updates content on change', () => {
    render(
      <CreateSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateSkill={mockOnCreateSkill}
        t={mockT}
      />
    );
    const contentInput = screen.getByTestId('textarea-content');
    fireEvent.change(contentInput, { target: { value: '# My Skill Content' } });
    expect(contentInput).toHaveValue('# My Skill Content');
  });

  it('calls onOpenChange when cancel is clicked', () => {
    render(
      <CreateSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateSkill={mockOnCreateSkill}
        t={mockT}
      />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('create button is disabled when form is incomplete', () => {
    render(
      <CreateSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateSkill={mockOnCreateSkill}
        t={mockT}
      />
    );
    const createButton = screen.getByText('Create Skill');
    expect(createButton).toBeDisabled();
  });

  it('displays templates in template tab', () => {
    render(
      <CreateSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateSkill={mockOnCreateSkill}
        t={mockT}
      />
    );
    expect(screen.getByText('Code Review')).toBeInTheDocument();
    expect(screen.getByText('Writing Assistant')).toBeInTheDocument();
  });

  it('displays template descriptions', () => {
    render(
      <CreateSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateSkill={mockOnCreateSkill}
        t={mockT}
      />
    );
    expect(screen.getByText('Review code quality')).toBeInTheDocument();
    expect(screen.getByText('Help with writing')).toBeInTheDocument();
  });

  it('calls onCreateSkill when form is complete and submitted', () => {
    render(
      <CreateSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateSkill={mockOnCreateSkill}
        t={mockT}
      />
    );

    // Fill in form
    fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'test-skill' } });
    fireEvent.change(screen.getByTestId('textarea-description'), {
      target: { value: 'Test description' },
    });
    fireEvent.change(screen.getByTestId('textarea-content'), {
      target: { value: '# Test Content' },
    });

    // Submit
    fireEvent.click(screen.getByText('Create Skill'));

    expect(mockOnCreateSkill).toHaveBeenCalledWith({
      name: 'test-skill',
      description: 'Test description',
      content: '# Test Content',
      category: 'custom',
      tags: [],
    });
  });

  it('closes dialog after successful submission', () => {
    render(
      <CreateSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateSkill={mockOnCreateSkill}
        t={mockT}
      />
    );

    // Fill in form
    fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'test-skill' } });
    fireEvent.change(screen.getByTestId('textarea-description'), {
      target: { value: 'Test description' },
    });
    fireEvent.change(screen.getByTestId('textarea-content'), {
      target: { value: '# Test Content' },
    });

    // Submit
    fireEvent.click(screen.getByText('Create Skill'));

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('displays category select', () => {
    render(
      <CreateSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateSkill={mockOnCreateSkill}
        t={mockT}
      />
    );
    expect(screen.getByTestId('select')).toBeInTheDocument();
  });

  it('displays name hint text', () => {
    render(
      <CreateSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateSkill={mockOnCreateSkill}
        t={mockT}
      />
    );
    expect(screen.getByText('Use lowercase with hyphens')).toBeInTheDocument();
  });

  it('displays description hint text', () => {
    render(
      <CreateSkillDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateSkill={mockOnCreateSkill}
        t={mockT}
      />
    );
    expect(screen.getByText('Brief description of the skill')).toBeInTheDocument();
  });
});
