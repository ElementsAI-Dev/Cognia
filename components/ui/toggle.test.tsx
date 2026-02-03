/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toggle, toggleVariants } from './toggle';

describe('Toggle', () => {
  it('renders correctly', () => {
    render(<Toggle>Toggle me</Toggle>);
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Toggle me')).toBeInTheDocument();
  });

  it('applies data-slot attribute', () => {
    render(<Toggle>Test</Toggle>);
    expect(screen.getByRole('button')).toHaveAttribute('data-slot', 'toggle');
  });

  it('handles click events', async () => {
    const onPressedChange = jest.fn();
    render(<Toggle onPressedChange={onPressedChange}>Click me</Toggle>);
    
    await userEvent.click(screen.getByRole('button'));
    expect(onPressedChange).toHaveBeenCalled();
  });

  it('can be controlled', () => {
    const { rerender } = render(<Toggle pressed={false}>Toggle</Toggle>);
    expect(screen.getByRole('button')).toHaveAttribute('data-state', 'off');
    
    rerender(<Toggle pressed={true}>Toggle</Toggle>);
    expect(screen.getByRole('button')).toHaveAttribute('data-state', 'on');
  });

  it('can be disabled', () => {
    render(<Toggle disabled>Disabled</Toggle>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<Toggle className="custom-class">Test</Toggle>);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  describe('variants', () => {
    it('applies default variant styles', () => {
      render(<Toggle variant="default">Default</Toggle>);
      expect(screen.getByRole('button')).toHaveClass('bg-transparent');
    });

    it('applies outline variant styles', () => {
      render(<Toggle variant="outline">Outline</Toggle>);
      expect(screen.getByRole('button')).toHaveClass('border');
    });
  });

  describe('sizes', () => {
    it('applies default size', () => {
      render(<Toggle size="default">Default</Toggle>);
      expect(screen.getByRole('button')).toHaveClass('h-9');
    });

    it('applies small size', () => {
      render(<Toggle size="sm">Small</Toggle>);
      expect(screen.getByRole('button')).toHaveClass('h-8');
    });

    it('applies large size', () => {
      render(<Toggle size="lg">Large</Toggle>);
      expect(screen.getByRole('button')).toHaveClass('h-10');
    });
  });

  describe('toggleVariants', () => {
    it('returns correct classes for default variant', () => {
      const classes = toggleVariants({ variant: 'default' });
      expect(classes).toContain('bg-transparent');
    });

    it('returns correct classes for outline variant', () => {
      const classes = toggleVariants({ variant: 'outline' });
      expect(classes).toContain('border');
    });

    it('returns correct classes for different sizes', () => {
      expect(toggleVariants({ size: 'sm' })).toContain('h-8');
      expect(toggleVariants({ size: 'default' })).toContain('h-9');
      expect(toggleVariants({ size: 'lg' })).toContain('h-10');
    });
  });
});
