/**
 * Tests for ThemePreviewCard
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemePreviewCard } from './theme-preview-card';
import type { PPTTheme } from '@/types/workflow';

const mockTheme: PPTTheme = {
  id: 'test-theme',
  name: 'Test Theme',
  primaryColor: '#3B82F6',
  secondaryColor: '#1E40AF',
  accentColor: '#60A5FA',
  backgroundColor: '#FFFFFF',
  textColor: '#1E293B',
  headingFont: 'Inter',
  bodyFont: 'Inter',
  codeFont: 'JetBrains Mono',
};

describe('ThemePreviewCard', () => {
  it('should render theme name', () => {
    render(<ThemePreviewCard theme={mockTheme} />);
    expect(screen.getByText('Test Theme')).toBeInTheDocument();
  });

  it('should render sample text', () => {
    render(<ThemePreviewCard theme={mockTheme} />);
    expect(screen.getByText('Sample presentation text')).toBeInTheDocument();
  });

  it('should apply background color from theme', () => {
    const { container } = render(<ThemePreviewCard theme={mockTheme} />);
    const previewArea = container.querySelector('.aspect-video');
    expect(previewArea).toHaveStyle({ backgroundColor: '#FFFFFF' });
  });

  it('should apply primary color to heading', () => {
    render(<ThemePreviewCard theme={mockTheme} />);
    const heading = screen.getByText('Test Theme');
    expect(heading).toHaveStyle({ color: '#3B82F6' });
  });

  it('should apply heading font from theme', () => {
    render(<ThemePreviewCard theme={mockTheme} />);
    const heading = screen.getByText('Test Theme');
    expect(heading).toHaveStyle({ fontFamily: 'Inter' });
  });

  it('should call onSelect when clicked', () => {
    const onSelect = jest.fn();
    render(<ThemePreviewCard theme={mockTheme} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('should show selected state with ring', () => {
    const { container } = render(
      <ThemePreviewCard theme={mockTheme} selected />
    );
    const button = container.querySelector('button');
    expect(button?.className).toContain('ring-primary');
  });

  it('should not show selected ring when not selected', () => {
    const { container } = render(
      <ThemePreviewCard theme={mockTheme} selected={false} />
    );
    const button = container.querySelector('button');
    expect(button?.className).not.toContain('border-primary');
  });

  it('should render three color swatches', () => {
    const { container } = render(<ThemePreviewCard theme={mockTheme} />);
    // Three color bars at the bottom
    const swatches = container.querySelectorAll('.h-3.flex-1');
    expect(swatches).toHaveLength(3);
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ThemePreviewCard theme={mockTheme} className="custom-class" />
    );
    const button = container.querySelector('button');
    expect(button?.className).toContain('custom-class');
  });
});
