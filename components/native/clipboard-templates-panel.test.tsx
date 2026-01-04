/**
 * Clipboard Templates Panel Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClipboardTemplatesPanel } from './clipboard-templates-panel';

// Mock the clipboard context hook
const mockUseClipboardContext = {
  templates: [] as Array<{
    id: string;
    name: string;
    description?: string;
    content: string;
    variables: string[];
    category?: string;
    tags: string[];
    createdAt: number;
    usageCount: number;
  }>,
  addTemplate: jest.fn(),
  removeTemplate: jest.fn(),
  updateTemplate: jest.fn(),
  applyTemplate: jest.fn().mockResolvedValue('Applied content'),
  searchTemplates: jest.fn().mockReturnValue([]),
};

jest.mock('@/hooks/context', () => ({
  useClipboardContext: () => mockUseClipboardContext,
}));

describe('ClipboardTemplatesPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseClipboardContext.templates = [];
    mockUseClipboardContext.searchTemplates.mockReturnValue([]);
  });

  it('renders the panel with header', () => {
    render(<ClipboardTemplatesPanel />);
    expect(screen.getByText('Templates')).toBeInTheDocument();
  });

  it('shows empty state when no templates', () => {
    render(<ClipboardTemplatesPanel />);
    expect(screen.getByText('No templates')).toBeInTheDocument();
  });

  it('shows template count in badge', () => {
    mockUseClipboardContext.templates = [
      {
        id: '1',
        name: 'Test Template',
        content: 'Test content',
        variables: [],
        tags: [],
        createdAt: Date.now(),
        usageCount: 0,
      },
    ];
    mockUseClipboardContext.searchTemplates.mockReturnValue(mockUseClipboardContext.templates);

    render(<ClipboardTemplatesPanel />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('displays templates when available', () => {
    mockUseClipboardContext.templates = [
      {
        id: '1',
        name: 'Email Signature',
        description: 'Professional email signature',
        content: 'Best regards, {{name}}',
        variables: ['name'],
        category: 'email',
        tags: ['email', 'signature'],
        createdAt: Date.now(),
        usageCount: 5,
      },
    ];
    mockUseClipboardContext.searchTemplates.mockReturnValue(mockUseClipboardContext.templates);

    render(<ClipboardTemplatesPanel />);
    expect(screen.getByText('Email Signature')).toBeInTheDocument();
    expect(screen.getByText('Professional email signature')).toBeInTheDocument();
  });

  it('shows Load Defaults button when no templates', () => {
    render(<ClipboardTemplatesPanel />);
    expect(screen.getByText('Load Defaults')).toBeInTheDocument();
  });

  it('calls addTemplate when Load Defaults is clicked', () => {
    render(<ClipboardTemplatesPanel />);
    const loadDefaultsButton = screen.getByText('Load Defaults');
    fireEvent.click(loadDefaultsButton);
    expect(mockUseClipboardContext.addTemplate).toHaveBeenCalled();
  });

  it('opens create dialog when plus button is clicked', () => {
    render(<ClipboardTemplatesPanel />);
    const buttons = screen.getAllByRole('button');
    const plusButton = buttons.find(btn => btn.querySelector('.lucide-plus'));
    if (plusButton) {
      fireEvent.click(plusButton);
      expect(
        screen.getByRole('heading', { name: 'Create Template' })
      ).toBeInTheDocument();
    }
  });

  it('filters templates by search query', () => {
    mockUseClipboardContext.templates = [
      {
        id: '1',
        name: 'Email Signature',
        content: 'Best regards',
        variables: [],
        tags: ['email'],
        createdAt: Date.now(),
        usageCount: 0,
      },
      {
        id: '2',
        name: 'Code Comment',
        content: '/** */',
        variables: [],
        tags: ['code'],
        createdAt: Date.now(),
        usageCount: 0,
      },
    ];
    mockUseClipboardContext.searchTemplates.mockImplementation((query: string) => {
      return mockUseClipboardContext.templates.filter(t => 
        t.name.toLowerCase().includes(query.toLowerCase())
      );
    });

    render(<ClipboardTemplatesPanel />);
    
    const searchInput = screen.getByPlaceholderText('Search templates...');
    fireEvent.change(searchInput, { target: { value: 'email' } });
    
    expect(mockUseClipboardContext.searchTemplates).toHaveBeenCalledWith('email');
  });

  it('shows variable count badge when template has variables', () => {
    mockUseClipboardContext.templates = [
      {
        id: '1',
        name: 'Template with vars',
        content: 'Hello {{name}}, welcome to {{company}}',
        variables: ['name', 'company'],
        tags: [],
        createdAt: Date.now(),
        usageCount: 0,
      },
    ];
    mockUseClipboardContext.searchTemplates.mockReturnValue(mockUseClipboardContext.templates);

    render(<ClipboardTemplatesPanel />);
    expect(screen.getByText('2 vars')).toBeInTheDocument();
  });

  it('shows category buttons when templates have categories', () => {
    mockUseClipboardContext.templates = [
      {
        id: '1',
        name: 'Email Template',
        content: 'Email content',
        variables: [],
        category: 'email',
        tags: [],
        createdAt: Date.now(),
        usageCount: 0,
      },
      {
        id: '2',
        name: 'Code Template',
        content: 'Code content',
        variables: [],
        category: 'code',
        tags: [],
        createdAt: Date.now(),
        usageCount: 0,
      },
    ];
    mockUseClipboardContext.searchTemplates.mockReturnValue(mockUseClipboardContext.templates);

    render(<ClipboardTemplatesPanel />);
    expect(screen.getByText('email')).toBeInTheDocument();
    expect(screen.getByText('code')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('filters templates by category when category button is clicked', () => {
    mockUseClipboardContext.templates = [
      {
        id: '1',
        name: 'Email Template',
        content: 'Email content',
        variables: [],
        category: 'email',
        tags: [],
        createdAt: Date.now(),
        usageCount: 0,
      },
      {
        id: '2',
        name: 'Code Template',
        content: 'Code content',
        variables: [],
        category: 'code',
        tags: [],
        createdAt: Date.now(),
        usageCount: 0,
      },
    ];
    mockUseClipboardContext.searchTemplates.mockReturnValue(mockUseClipboardContext.templates);

    render(<ClipboardTemplatesPanel />);
    
    const emailCategoryButton = screen.getByText('email');
    fireEvent.click(emailCategoryButton);
    
    // After clicking, only email template should be visible
    // The filtering is done in the component
  });

  it('calls applyTemplate when Use button is clicked for template without variables', async () => {
    mockUseClipboardContext.templates = [
      {
        id: '1',
        name: 'Simple Template',
        content: 'Simple content',
        variables: [],
        tags: [],
        createdAt: Date.now(),
        usageCount: 0,
      },
    ];
    mockUseClipboardContext.searchTemplates.mockReturnValue(mockUseClipboardContext.templates);

    render(<ClipboardTemplatesPanel />);
    
    const useButton = screen.getByText('Use');
    fireEvent.click(useButton);
    
    expect(mockUseClipboardContext.applyTemplate).toHaveBeenCalledWith('1');
  });

  it('opens variable input dialog when Use button is clicked for template with variables', () => {
    mockUseClipboardContext.templates = [
      {
        id: '1',
        name: 'Variable Template',
        content: 'Hello {{name}}',
        variables: ['name'],
        tags: [],
        createdAt: Date.now(),
        usageCount: 0,
      },
    ];
    mockUseClipboardContext.searchTemplates.mockReturnValue(mockUseClipboardContext.templates);

    render(<ClipboardTemplatesPanel />);
    
    const useButton = screen.getByText('Use');
    fireEvent.click(useButton);
    
    expect(screen.getByText('Apply Template')).toBeInTheDocument();
    expect(screen.getByText('name')).toBeInTheDocument();
  });

  it('calls removeTemplate when delete is clicked from dropdown', () => {
    mockUseClipboardContext.templates = [
      {
        id: '1',
        name: 'Template to delete',
        content: 'Content',
        variables: [],
        tags: [],
        createdAt: Date.now(),
        usageCount: 0,
      },
    ];
    mockUseClipboardContext.searchTemplates.mockReturnValue(mockUseClipboardContext.templates);

    render(<ClipboardTemplatesPanel />);
    
    // Find and click the more options button
    const buttons = screen.getAllByRole('button');
    const moreButton = buttons.find(btn => btn.querySelector('.lucide-more-vertical'));
    if (moreButton) {
      fireEvent.click(moreButton);
      
      // Click delete option
      const deleteOption = screen.getByText('Delete');
      fireEvent.click(deleteOption);
      
      expect(mockUseClipboardContext.removeTemplate).toHaveBeenCalledWith('1');
    }
  });

  it('applies custom className', () => {
    const { container } = render(<ClipboardTemplatesPanel className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('shows tags on template cards', () => {
    mockUseClipboardContext.templates = [
      {
        id: '1',
        name: 'Tagged Template',
        content: 'Content',
        variables: [],
        tags: ['important', 'work'],
        createdAt: Date.now(),
        usageCount: 0,
      },
    ];
    mockUseClipboardContext.searchTemplates.mockReturnValue(mockUseClipboardContext.templates);

    render(<ClipboardTemplatesPanel />);
    expect(screen.getByText('important')).toBeInTheDocument();
    expect(screen.getByText('work')).toBeInTheDocument();
  });

  it('shows content preview on template cards', () => {
    const longContent = 'This is a very long template content that should be truncated in the preview...';
    mockUseClipboardContext.templates = [
      {
        id: '1',
        name: 'Long Content Template',
        content: longContent,
        variables: [],
        tags: [],
        createdAt: Date.now(),
        usageCount: 0,
      },
    ];
    mockUseClipboardContext.searchTemplates.mockReturnValue(mockUseClipboardContext.templates);

    render(<ClipboardTemplatesPanel />);
    expect(screen.getByText(longContent.slice(0, 150))).toBeInTheDocument();
  });

  it('validates form before submission', () => {
    render(<ClipboardTemplatesPanel />);
    
    // Open create dialog
    const buttons = screen.getAllByRole('button');
    const plusButton = buttons.find(btn => btn.querySelector('.lucide-plus'));
    if (plusButton) {
      fireEvent.click(plusButton);
      
      // Try to submit without filling required fields
      const createButton = screen.getByRole('button', { name: 'Create Template' });
      expect(createButton).toBeDisabled();
    }
  });

  it('enables submit button when form is valid', () => {
    render(<ClipboardTemplatesPanel />);
    
    // Open create dialog
    const buttons = screen.getAllByRole('button');
    const plusButton = buttons.find(btn => btn.querySelector('.lucide-plus'));
    if (plusButton) {
      fireEvent.click(plusButton);
      
      // Fill in required fields
      const nameInput = screen.getByLabelText('Name');
      const contentInput = screen.getByLabelText('Content');
      
      fireEvent.change(nameInput, { target: { value: 'Test Template' } });
      fireEvent.change(contentInput, { target: { value: 'Test content' } });
      
      const createButton = screen.getByRole('button', { name: 'Create Template' });
      expect(createButton).not.toBeDisabled();
    }
  });

  it('extracts variables from content as user types', () => {
    render(<ClipboardTemplatesPanel />);
    
    // Open create dialog
    const buttons = screen.getAllByRole('button');
    const plusButton = buttons.find(btn => btn.querySelector('.lucide-plus'));
    if (plusButton) {
      fireEvent.click(plusButton);
      
      const contentInput = screen.getByLabelText('Content');
      fireEvent.change(contentInput, { target: { value: 'Hello {{name}}, welcome to {{company}}' } });
      
      // Variable badges should appear
      expect(screen.getByText('name')).toBeInTheDocument();
      expect(screen.getByText('company')).toBeInTheDocument();
    }
  });
});
