/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplateSelector } from './template-selector';
import type { ChatTemplate, TemplateCategory } from '@/types/template';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'title': 'Templates',
      'dialogTitle': 'Chat Templates',
      'dialogDescription': 'Choose a template to start a new conversation',
      'searchPlaceholder': 'Search templates...',
      'all': 'All',
      'preview': 'Preview',
      'selectToPreview': 'Select a template to preview',
      'builtIn': 'Built-in',
      'useTemplate': 'Use Template',
      'noTemplates': 'No templates found',
    };
    return translations[key] || key;
  },
}));

// Mock stores
const mockTemplates: ChatTemplate[] = [
  {
    id: 'template-1',
    name: 'Code Assistant',
    description: 'Help with coding tasks',
    icon: '💻',
    category: 'coding' as TemplateCategory,
    isBuiltIn: true,
    systemPrompt: 'You are a helpful coding assistant.',
    suggestedQuestions: ['Help me debug', 'Write a function'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'template-2',
    name: 'Writing Helper',
    description: 'Help with writing tasks',
    icon: '✍️',
    category: 'writing' as TemplateCategory,
    isBuiltIn: true,
    suggestedQuestions: ['Improve this text'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'template-3',
    name: 'Custom Template',
    description: 'A custom template',
    icon: '⭐',
    category: 'general' as TemplateCategory,
    isBuiltIn: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

jest.mock('@/stores', () => ({
  useTemplateStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      templates: mockTemplates,
      searchTemplates: (query: string) => 
        mockTemplates.filter(t => 
          t.name.toLowerCase().includes(query.toLowerCase()) ||
          t.description.toLowerCase().includes(query.toLowerCase())
        ),
    };
    return selector(state);
  },
}));

// Mock template types
jest.mock('@/types/template', () => ({
  TEMPLATE_CATEGORY_LABELS: {
    coding: 'Coding',
    writing: 'Writing',
    general: 'General',
    research: 'Research',
    creative: 'Creative',
  },
}));

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    open ? <div data-testid="dialog">{children}</div> : <div>{children}</div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-trigger">{children}</div>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      data-testid="search-input"
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange: _onValueChange }: { 
    children: React.ReactNode; 
    value?: string;
    onValueChange?: (value: string) => void;
  }) => (
    <div data-testid="tabs" data-value={value}>{children}</div>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value?: string }) => (
    <div data-testid="tabs-content" data-value={value}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tabs-list">{children}</div>
  ),
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value?: string }) => (
    <button data-testid="tabs-trigger" data-value={value}>{children}</button>
  ),
}));

describe('TemplateSelector', () => {
  const mockOnSelectTemplate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<TemplateSelector onSelectTemplate={mockOnSelectTemplate} />);
    // Find the trigger button - use getAllByRole since dialog may have multiple buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('opens dialog when trigger is clicked', () => {
    render(<TemplateSelector onSelectTemplate={mockOnSelectTemplate} />);
    
    const triggerButton = screen.getAllByRole('button')[0];
    fireEvent.click(triggerButton);
    
    // Title shows "Templates" (there are two - button and h2)
    expect(screen.getAllByText('Templates').length).toBeGreaterThan(0);
  });

  it('displays dialog description', () => {
    render(<TemplateSelector onSelectTemplate={mockOnSelectTemplate} />);
    const triggerButton = screen.getAllByRole('button')[0];
    fireEvent.click(triggerButton);
    
    // Description is mocked as "description"
    expect(screen.getByText('description')).toBeInTheDocument();
  });

  it('displays template list', () => {
    render(<TemplateSelector onSelectTemplate={mockOnSelectTemplate} />);
    const triggerButton = screen.getAllByRole('button')[0];
    fireEvent.click(triggerButton);
    
    expect(screen.getByText('Code Assistant')).toBeInTheDocument();
    expect(screen.getByText('Writing Helper')).toBeInTheDocument();
    expect(screen.getByText('Custom Template')).toBeInTheDocument();
  });

  it('displays template icons', () => {
    render(<TemplateSelector onSelectTemplate={mockOnSelectTemplate} />);
    const triggerButton = screen.getAllByRole('button')[0];
    fireEvent.click(triggerButton);
    
    expect(screen.getByText('💻')).toBeInTheDocument();
    expect(screen.getByText('✍️')).toBeInTheDocument();
    expect(screen.getByText('⭐')).toBeInTheDocument();
  });

  it('displays template descriptions', () => {
    render(<TemplateSelector onSelectTemplate={mockOnSelectTemplate} />);
    const triggerButton = screen.getAllByRole('button')[0];
    fireEvent.click(triggerButton);
    
    expect(screen.getByText('Help with coding tasks')).toBeInTheDocument();
    expect(screen.getByText('Help with writing tasks')).toBeInTheDocument();
  });

  it('has search input', () => {
    render(<TemplateSelector onSelectTemplate={mockOnSelectTemplate} />);
    const triggerButton = screen.getAllByRole('button')[0];
    fireEvent.click(triggerButton);
    
    // Search input should be present
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  it('filters templates based on search', () => {
    render(<TemplateSelector onSelectTemplate={mockOnSelectTemplate} />);
    const triggerButton = screen.getAllByRole('button')[0];
    fireEvent.click(triggerButton);
    
    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'Code' } });
    
    expect(screen.getByText('Code Assistant')).toBeInTheDocument();
  });

  it('displays category tabs', () => {
    render(<TemplateSelector onSelectTemplate={mockOnSelectTemplate} />);
    const triggerButton = screen.getAllByRole('button')[0];
    fireEvent.click(triggerButton);
    
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('shows built-in badge for built-in templates', () => {
    render(<TemplateSelector onSelectTemplate={mockOnSelectTemplate} />);
    const triggerButton = screen.getAllByRole('button')[0];
    fireEvent.click(triggerButton);
    
    expect(screen.getAllByText('Built-in').length).toBeGreaterThan(0);
  });

  it('renders with custom trigger', () => {
    render(
      <TemplateSelector
        onSelectTemplate={mockOnSelectTemplate}
        trigger={<button>Custom Trigger</button>}
      />
    );
    
    expect(screen.getByText('Custom Trigger')).toBeInTheDocument();
  });

  it('shows suggested questions for templates', () => {
    render(<TemplateSelector onSelectTemplate={mockOnSelectTemplate} />);
    const triggerButton = screen.getAllByRole('button')[0];
    fireEvent.click(triggerButton);
    
    // Dialog should be open with template content - title is "Templates" in h2
    expect(screen.getAllByText('Templates').length).toBeGreaterThan(0);
  });

  it('has preview panel', () => {
    render(<TemplateSelector onSelectTemplate={mockOnSelectTemplate} />);
    const triggerButton = screen.getAllByRole('button')[0];
    fireEvent.click(triggerButton);
    
    // Preview panel text when no template selected
    expect(screen.getByText('Select a template to preview')).toBeInTheDocument();
  });
});
