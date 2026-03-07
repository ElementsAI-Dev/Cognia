/**
 * Tests for PPTTemplateGallery
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PPTTemplateGallery } from './ppt-template-gallery';

// Mock the ppt-workflow module
jest.mock('@/lib/ai/workflows/ppt-workflow', () => ({
  PPT_WORKFLOW_TEMPLATES: [
    {
      id: 'business-pitch',
      name: 'Business Pitch',
      description: 'Professional business pitch deck',
      category: 'business',
      icon: 'Briefcase',
      presetInputs: { slideCount: 12 },
    },
    {
      id: 'quick-update',
      name: 'Quick Update',
      description: 'Brief status update',
      category: 'quick',
      icon: 'Zap',
      presetInputs: { slideCount: 5 },
    },
  ],
  PPT_ENHANCED_TEMPLATES: [
    {
      id: 'material-to-presentation',
      name: 'Material to Presentation',
      description: 'Convert documents to slides',
      category: 'content',
      icon: 'FileText',
      presetInputs: { slideCount: 10 },
    },
  ],
}));

describe('PPTTemplateGallery', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  it('should render all templates by default', () => {
    render(<PPTTemplateGallery onSelect={mockOnSelect} />);
    expect(screen.getByText('Business Pitch')).toBeInTheDocument();
    expect(screen.getByText('Quick Update')).toBeInTheDocument();
    expect(screen.getByText('Material to Presentation')).toBeInTheDocument();
  });

  it('should render category filter tabs', () => {
    render(<PPTTemplateGallery onSelect={mockOnSelect} />);
    // "All" tab should be present
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('should call onSelect when a template card is clicked', () => {
    render(<PPTTemplateGallery onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByText('Business Pitch'));
    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'business-pitch' })
    );
  });

  it('should show slide count badge', () => {
    render(<PPTTemplateGallery onSelect={mockOnSelect} />);
    expect(screen.getByText('12 slides')).toBeInTheDocument();
    expect(screen.getByText('5 slides')).toBeInTheDocument();
  });

  it('should show descriptions in non-compact mode', () => {
    render(<PPTTemplateGallery onSelect={mockOnSelect} compact={false} />);
    expect(screen.getByText('Professional business pitch deck')).toBeInTheDocument();
  });

  it('should hide descriptions in compact mode', () => {
    render(<PPTTemplateGallery onSelect={mockOnSelect} compact />);
    expect(screen.queryByText('Professional business pitch deck')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <PPTTemplateGallery onSelect={mockOnSelect} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should render category tabs for all unique categories', () => {
    render(<PPTTemplateGallery onSelect={mockOnSelect} />);
    // All, Business, Quick, Content tabs should exist
    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Business' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Quick' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Content' })).toBeInTheDocument();
  });

  it('should render correct template count', () => {
    const { container } = render(<PPTTemplateGallery onSelect={mockOnSelect} />);
    // 3 templates total (2 workflow + 1 enhanced)
    const cards = container.querySelectorAll('[data-slot="card"]');
    expect(cards).toHaveLength(3);
  });
});
