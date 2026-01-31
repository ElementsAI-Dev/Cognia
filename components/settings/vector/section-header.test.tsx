/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Database } from 'lucide-react';
import { SectionHeader } from './section-header';

describe('SectionHeader', () => {
  it('renders without crashing', () => {
    render(<SectionHeader icon={Database} title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('displays the title correctly', () => {
    render(<SectionHeader icon={Database} title="Vector Database Provider" />);
    expect(screen.getByText('Vector Database Provider')).toBeInTheDocument();
  });

  it('renders with the icon', () => {
    const { container } = render(<SectionHeader icon={Database} title="Test" />);
    // Check that SVG icon is rendered
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    const { container } = render(<SectionHeader icon={Database} title="Test" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('flex', 'items-center', 'gap-2');
  });

  it('renders title with correct font styling', () => {
    render(<SectionHeader icon={Database} title="Styled Title" />);
    const title = screen.getByText('Styled Title');
    expect(title).toHaveClass('text-sm', 'font-semibold');
  });
});
