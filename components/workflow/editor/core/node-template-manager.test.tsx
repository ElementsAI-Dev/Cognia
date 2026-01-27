'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeTemplatePanel } from './node-template-manager';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      searchNodes: 'Search templates...',
      saveAsTemplate: 'Save as Template',
      createFromSelection: 'Create from Selection',
      noResultsFound: 'No templates found',
      noTemplates: 'No templates yet',
      tryDifferentSearch: 'Try a different search',
      createFirstTemplate: 'Create your first template',
      createTemplate: 'Create Template',
      templateName: 'Template Name',
      templateNamePlaceholder: 'Enter template name',
      templateDescription: 'Description',
      templateDescriptionPlaceholder: 'Enter description',
      deleteTemplate: 'Delete Template',
      confirmDeleteTemplate: 'Are you sure?',
    };
    return translations[key] || key;
  },
}));

jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: jest.fn(() => ({
    nodeTemplates: [
      { id: '1', name: 'Template 1', nodeType: 'ai', description: 'AI template' },
      { id: '2', name: 'Template 2', nodeType: 'code' },
    ],
    deleteNodeTemplate: jest.fn(),
    selectedNodes: ['node-1'],
    saveNodeAsTemplate: jest.fn(),
  })),
}));

jest.mock('zustand/react/shallow', () => ({
  useShallow: (fn: (state: unknown) => unknown) => fn,
}));

describe('NodeTemplatePanel', () => {
  const mockOnAddTemplate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input', () => {
    render(<NodeTemplatePanel onAddTemplate={mockOnAddTemplate} />);
    expect(screen.getByPlaceholderText('Search templates...')).toBeInTheDocument();
  });

  it('renders create from selection button', () => {
    render(<NodeTemplatePanel onAddTemplate={mockOnAddTemplate} />);
    expect(screen.getByText('Save as Template')).toBeInTheDocument();
  });

  it('renders template list', () => {
    render(<NodeTemplatePanel onAddTemplate={mockOnAddTemplate} />);
    expect(screen.getByText('Template 1')).toBeInTheDocument();
    expect(screen.getByText('Template 2')).toBeInTheDocument();
  });

  it('renders template description', () => {
    render(<NodeTemplatePanel onAddTemplate={mockOnAddTemplate} />);
    expect(screen.getByText('AI template')).toBeInTheDocument();
  });

  it('renders node type badges', () => {
    render(<NodeTemplatePanel onAddTemplate={mockOnAddTemplate} />);
    expect(screen.getByText('ai')).toBeInTheDocument();
    expect(screen.getByText('code')).toBeInTheDocument();
  });

  it('filters templates by search', () => {
    render(<NodeTemplatePanel onAddTemplate={mockOnAddTemplate} />);
    const searchInput = screen.getByPlaceholderText('Search templates...');
    fireEvent.change(searchInput, { target: { value: 'Template 1' } });
    expect(screen.getByText('Template 1')).toBeInTheDocument();
    expect(screen.queryByText('Template 2')).not.toBeInTheDocument();
  });

  it('renders Use button for templates', () => {
    render(<NodeTemplatePanel onAddTemplate={mockOnAddTemplate} />);
    const useButtons = screen.getAllByText('Use');
    expect(useButtons.length).toBe(2);
  });

  it('applies custom className', () => {
    const { container } = render(
      <NodeTemplatePanel onAddTemplate={mockOnAddTemplate} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('NodeTemplatePanel search', () => {
  it('shows no templates found when search has no results', () => {
    render(<NodeTemplatePanel />);
    const searchInput = screen.getByPlaceholderText('Search templates...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    expect(screen.getByText('No templates found')).toBeInTheDocument();
  });
});
