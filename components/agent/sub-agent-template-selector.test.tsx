'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubAgentTemplateSelector } from './sub-agent-template-selector';
import type { SubAgentTemplate } from '@/types/agent/sub-agent';

const mockTemplates = [
  {
    id: 'template-1',
    name: 'Research Template',
    description: 'A research template',
    category: 'research',
    isBuiltIn: true,
    taskTemplate: 'Research {topic}',
  },
  {
    id: 'template-2',
    name: 'Coding Template',
    description: 'A coding template',
    category: 'coding',
    isBuiltIn: false,
    taskTemplate: 'Code {feature}',
    variables: [{ name: 'feature', description: 'Feature to code', required: true }],
  },
] as unknown as SubAgentTemplate[];

describe('SubAgentTemplateSelector', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input', () => {
    render(<SubAgentTemplateSelector templates={mockTemplates} onSelect={mockOnSelect} />);
    expect(screen.getByPlaceholderText('Search templates...')).toBeInTheDocument();
  });

  it('renders All filter button', () => {
    render(<SubAgentTemplateSelector templates={mockTemplates} onSelect={mockOnSelect} />);
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('renders template names', () => {
    render(<SubAgentTemplateSelector templates={mockTemplates} onSelect={mockOnSelect} />);
    expect(screen.getByText('Research Template')).toBeInTheDocument();
    expect(screen.getByText('Coding Template')).toBeInTheDocument();
  });

  it('renders template descriptions', () => {
    render(<SubAgentTemplateSelector templates={mockTemplates} onSelect={mockOnSelect} />);
    expect(screen.getByText('A research template')).toBeInTheDocument();
    expect(screen.getByText('A coding template')).toBeInTheDocument();
  });

  it('renders category badges', () => {
    render(<SubAgentTemplateSelector templates={mockTemplates} onSelect={mockOnSelect} />);
    expect(screen.getByText('research')).toBeInTheDocument();
    expect(screen.getByText('coding')).toBeInTheDocument();
  });

  it('renders built-in badge for built-in templates', () => {
    render(<SubAgentTemplateSelector templates={mockTemplates} onSelect={mockOnSelect} />);
    expect(screen.getByText('Built-in')).toBeInTheDocument();
  });

  it('filters templates by search', () => {
    render(<SubAgentTemplateSelector templates={mockTemplates} onSelect={mockOnSelect} />);
    const searchInput = screen.getByPlaceholderText('Search templates...');
    fireEvent.change(searchInput, { target: { value: 'Research' } });
    expect(screen.getByText('Research Template')).toBeInTheDocument();
    expect(screen.queryByText('Coding Template')).not.toBeInTheDocument();
  });

  it('filters by category', () => {
    render(<SubAgentTemplateSelector templates={mockTemplates} onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByText('Research'));
    expect(screen.getByText('Research Template')).toBeInTheDocument();
    expect(screen.queryByText('Coding Template')).not.toBeInTheDocument();
  });

  it('calls onSelect for template without variables', () => {
    render(<SubAgentTemplateSelector templates={mockTemplates} onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByText('Research Template'));
    expect(mockOnSelect).toHaveBeenCalledWith('template-1', {});
  });

  it('opens dialog for template with variables', () => {
    render(<SubAgentTemplateSelector templates={mockTemplates} onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByText('Coding Template'));
    expect(screen.getByText('Configure Coding Template')).toBeInTheDocument();
  });

  it('shows no templates found when empty', () => {
    render(<SubAgentTemplateSelector templates={[]} onSelect={mockOnSelect} />);
    expect(screen.getByText('No templates found')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <SubAgentTemplateSelector
        templates={mockTemplates}
        onSelect={mockOnSelect}
        className="custom-class"
      />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
