/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PromptTemplateManager } from './prompt-template-manager';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: 'Prompt Templates',
      subtitle: 'Manage your templates',
      searchPlaceholder: 'Search templates',
      newTemplate: 'New template',
      noTemplates: 'No templates found. Create one to get started.',
    };
    return translations[key] || key;
  },
}));

// Mock stores
jest.mock('@/stores', () => ({
  usePromptTemplateStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      templates: [],
      categories: [],
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      duplicateTemplate: jest.fn(),
      searchTemplates: jest.fn().mockReturnValue([]),
      importTemplates: jest.fn().mockReturnValue(0),
      exportTemplates: jest.fn().mockReturnValue('[]'),
      initializeDefaults: jest.fn(),
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => {
  const MockInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    (props, ref) => <input ref={ref} {...props} />
  );
  MockInput.displayName = 'MockInput';
  return { Input: MockInput };
});

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ScrollBar: () => null,
}));

jest.mock('@/components/ui/empty', () => ({
  Empty: ({ children }: { children: React.ReactNode }) => <div data-testid="empty">{children}</div>,
  EmptyMedia: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  EmptyTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  EmptyDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

// Mock child components
jest.mock('./prompt-template-card', () => ({
  PromptTemplateCard: () => <div data-testid="template-card">Card</div>,
}));

jest.mock('./prompt-template-editor', () => ({
  PromptTemplateEditor: ({ onSave }: { onSave: () => void }) => (
    <div data-testid="template-editor">
      <button onClick={onSave}>Save</button>
    </div>
  ),
}));

jest.mock('./prompt-template-advanced-editor', () => ({
  PromptTemplateAdvancedEditor: () => <div data-testid="advanced-editor">Advanced</div>,
}));

describe('PromptTemplateManager keyboard shortcuts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens editor on Ctrl+N', () => {
    render(<PromptTemplateManager />);
    
    // Editor should not be visible initially
    expect(screen.queryByTestId('template-editor')).not.toBeInTheDocument();
    
    // Press Ctrl+N
    fireEvent.keyDown(window, { key: 'n', ctrlKey: true });
    
    // Editor dialog should now be visible
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('opens editor on Meta+N (Mac)', () => {
    render(<PromptTemplateManager />);
    
    fireEvent.keyDown(window, { key: 'n', metaKey: true });
    
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('focuses search input on Ctrl+F', () => {
    render(<PromptTemplateManager />);
    
    const searchInput = screen.getByPlaceholderText('Search templates');
    expect(document.activeElement).not.toBe(searchInput);
    
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true });
    
    expect(document.activeElement).toBe(searchInput);
  });

  it('closes editor dialog on Escape', () => {
    render(<PromptTemplateManager />);
    
    // Open editor first
    fireEvent.keyDown(window, { key: 'n', ctrlKey: true });
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    
    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    
    // Dialog should be closed
    expect(screen.queryByTestId('template-editor')).not.toBeInTheDocument();
  });
});
