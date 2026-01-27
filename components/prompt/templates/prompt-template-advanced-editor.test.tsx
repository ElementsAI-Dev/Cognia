/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PromptTemplateAdvancedEditor } from './prompt-template-advanced-editor';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useFormatter: () => ({
    dateTime: (date: Date) => date.toLocaleDateString(),
  }),
}));

// Mock stores
jest.mock('@/stores', () => ({
  usePromptTemplateStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      templates: [],
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      saveVersion: jest.fn(),
      getVersionHistory: jest.fn().mockReturnValue([]),
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button role="tab" data-value={value}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('PromptTemplateAdvancedEditor', () => {
  const mockTemplate = {
    id: 'template-1',
    name: 'Test Template',
    content: 'Hello {{name}}, welcome to {{place}}!',
    category: 'general',
    variables: [
      { name: 'name', description: 'User name', defaultValue: 'User' },
      { name: 'place', description: 'Location', defaultValue: 'here' },
    ],
    tags: ['test'],
    source: 'user' as const,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const defaultProps = {
    template: mockTemplate,
    categories: ['general', 'writing', 'coding', 'custom'],
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders editor with header', () => {
    render(<PromptTemplateAdvancedEditor {...defaultProps} />);
    expect(screen.getByText('editTemplate')).toBeInTheDocument();
  });

  it('displays template name in input', () => {
    render(<PromptTemplateAdvancedEditor {...defaultProps} />);
    expect(screen.getByDisplayValue('Test Template')).toBeInTheDocument();
  });

  it('has tabs for different sections', () => {
    render(<PromptTemplateAdvancedEditor {...defaultProps} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /previewTab/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /variablesTab/i })).toBeInTheDocument();
  });

  it('displays template content in textarea', () => {
    render(<PromptTemplateAdvancedEditor {...defaultProps} />);
    const textareas = screen.getAllByRole('textbox');
    const contentTextarea = textareas.find(ta => 
      (ta as HTMLTextAreaElement).value?.includes('{{name}}')
    );
    expect(contentTextarea).toBeInTheDocument();
  });

  it('calls onSubmit when save button is clicked', () => {
    render(<PromptTemplateAdvancedEditor {...defaultProps} />);
    
    const saveButton = screen.getAllByRole('button').find(btn => 
      btn.textContent?.toLowerCase().includes('save')
    );
    
    expect(saveButton).toBeDefined();
    if (saveButton) {
      fireEvent.click(saveButton);
      expect(defaultProps.onSubmit).toHaveBeenCalled();
    }
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<PromptTemplateAdvancedEditor {...defaultProps} />);
    
    const cancelButton = screen.getAllByRole('button').find(btn => 
      btn.textContent?.toLowerCase().includes('cancel')
    );
    
    expect(cancelButton).toBeDefined();
    if (cancelButton) {
      fireEvent.click(cancelButton);
      expect(defaultProps.onCancel).toHaveBeenCalled();
    }
  });

  it('renders for new template when no template prop', () => {
    render(<PromptTemplateAdvancedEditor 
      categories={['general', 'custom']} 
      onSubmit={jest.fn()} 
      onCancel={jest.fn()} 
    />);
    expect(screen.getByText('newTemplate')).toBeInTheDocument();
  });

  it('detects variables from content', () => {
    render(<PromptTemplateAdvancedEditor {...defaultProps} />);
    // Variables badge should show the count
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('allows editing template name', () => {
    render(<PromptTemplateAdvancedEditor {...defaultProps} />);
    const nameInput = screen.getByDisplayValue('Test Template');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    expect(nameInput).toHaveValue('New Name');
  });
});
