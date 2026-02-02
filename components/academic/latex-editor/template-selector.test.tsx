import { render, screen, fireEvent } from '@testing-library/react';
import { TemplateSelector, TemplateDialogContent } from './template-selector';
import type { LaTeXTemplate } from '@/lib/latex/templates';

const mockTemplates: LaTeXTemplate[] = [
  {
    id: 'article-basic',
    name: 'Basic Article',
    description: 'A simple article template',
    category: 'article',
    content: '\\documentclass{article}',
    packages: ['amsmath'],
    tags: ['basic', 'simple'],
  },
  {
    id: 'article-academic',
    name: 'Academic Paper',
    description: 'Full academic paper template',
    category: 'article',
    content: '\\documentclass{article}',
    packages: ['amsmath', 'graphicx'],
    tags: ['academic', 'research'],
  },
  {
    id: 'presentation-basic',
    name: 'Basic Presentation',
    description: 'Simple beamer presentation',
    category: 'presentation',
    content: '\\documentclass{beamer}',
    packages: ['beamer'],
    tags: ['slides', 'beamer'],
  },
];

const mockCategories = [
  { category: 'article', count: 2 },
  { category: 'presentation', count: 1 },
];

describe('TemplateSelector', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all template categories', () => {
    render(
      <TemplateSelector
        templates={mockTemplates}
        templateCategories={mockCategories}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('article')).toBeInTheDocument();
    expect(screen.getByText('presentation')).toBeInTheDocument();
  });

  it('renders category counts as badges', () => {
    render(
      <TemplateSelector
        templates={mockTemplates}
        templateCategories={mockCategories}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders all templates', () => {
    render(
      <TemplateSelector
        templates={mockTemplates}
        templateCategories={mockCategories}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Basic Article')).toBeInTheDocument();
    expect(screen.getByText('Academic Paper')).toBeInTheDocument();
    expect(screen.getByText('Basic Presentation')).toBeInTheDocument();
  });

  it('renders template descriptions', () => {
    render(
      <TemplateSelector
        templates={mockTemplates}
        templateCategories={mockCategories}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('A simple article template')).toBeInTheDocument();
    expect(screen.getByText('Full academic paper template')).toBeInTheDocument();
  });

  it('renders template tags', () => {
    render(
      <TemplateSelector
        templates={mockTemplates}
        templateCategories={mockCategories}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('basic')).toBeInTheDocument();
    expect(screen.getByText('academic')).toBeInTheDocument();
  });

  it('calls onSelect when template is clicked', () => {
    render(
      <TemplateSelector
        templates={mockTemplates}
        templateCategories={mockCategories}
        onSelect={mockOnSelect}
      />
    );

    fireEvent.click(screen.getByText('Basic Article'));

    expect(mockOnSelect).toHaveBeenCalledWith('article-basic');
  });

  it('renders compact variant by default', () => {
    const { container } = render(
      <TemplateSelector
        templates={mockTemplates}
        templateCategories={mockCategories}
        onSelect={mockOnSelect}
      />
    );

    // Default compact variant has grid-cols-2
    const gridElements = container.querySelectorAll('.grid-cols-2');
    expect(gridElements.length).toBeGreaterThan(0);
  });

  it('renders expanded variant when specified', () => {
    const { container } = render(
      <TemplateSelector
        templates={mockTemplates}
        templateCategories={mockCategories}
        onSelect={mockOnSelect}
        variant="expanded"
      />
    );

    // Expanded variant has responsive grid classes
    const gridElements = container.querySelectorAll('[class*="lg:grid-cols-3"]');
    expect(gridElements.length).toBeGreaterThan(0);
  });

  it('applies custom className', () => {
    const { container } = render(
      <TemplateSelector
        templates={mockTemplates}
        templateCategories={mockCategories}
        onSelect={mockOnSelect}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('TemplateDialogContent', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders TemplateSelector inside ScrollArea', () => {
    render(
      <TemplateDialogContent
        templates={mockTemplates}
        templateCategories={mockCategories}
        onSelect={mockOnSelect}
      />
    );

    // Should render all templates
    expect(screen.getByText('Basic Article')).toBeInTheDocument();
    expect(screen.getByText('Academic Paper')).toBeInTheDocument();
    expect(screen.getByText('Basic Presentation')).toBeInTheDocument();
  });

  it('passes onSelect to TemplateSelector', () => {
    render(
      <TemplateDialogContent
        templates={mockTemplates}
        templateCategories={mockCategories}
        onSelect={mockOnSelect}
      />
    );

    fireEvent.click(screen.getByText('Basic Article'));

    expect(mockOnSelect).toHaveBeenCalledWith('article-basic');
  });
});
