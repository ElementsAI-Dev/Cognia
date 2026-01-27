'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProviderIcon } from './provider-icon';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, width, height, className }: { src: string; alt: string; width: number; height: number; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} className={className} data-testid="next-image" />
  ),
}));

describe('ProviderIcon', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Image for path icons', () => {
    render(<ProviderIcon icon="/icons/provider.svg" alt="Test provider" />);
    expect(screen.getByTestId('next-image')).toBeInTheDocument();
    expect(screen.getByTestId('next-image')).toHaveAttribute('src', '/icons/provider.svg');
  });

  it('renders emoji icon', () => {
    render(<ProviderIcon icon="🤖" />);
    expect(screen.getByText('🤖')).toBeInTheDocument();
  });

  it('renders fallback icon when no icon provided', () => {
    const { container } = render(<ProviderIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ProviderIcon icon="🤖" className="custom-class" />);
    expect(screen.getByText('🤖')).toHaveClass('custom-class');
  });

  it('applies custom size to emoji', () => {
    render(<ProviderIcon icon="🤖" size={32} />);
    expect(screen.getByText('🤖')).toHaveStyle({ fontSize: '32px' });
  });

  it('applies custom size to Image', () => {
    render(<ProviderIcon icon="/icons/test.svg" size={24} />);
    expect(screen.getByTestId('next-image')).toHaveAttribute('width', '24');
    expect(screen.getByTestId('next-image')).toHaveAttribute('height', '24');
  });

  it('renders fallback with custom size', () => {
    const { container } = render(<ProviderIcon size={40} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ width: '40px', height: '40px' });
  });

  it('uses default alt text', () => {
    render(<ProviderIcon icon="/icons/test.svg" />);
    expect(screen.getByTestId('next-image')).toHaveAttribute('alt', 'Provider icon');
  });

  it('uses custom alt text', () => {
    render(<ProviderIcon icon="/icons/test.svg" alt="Custom alt" />);
    expect(screen.getByTestId('next-image')).toHaveAttribute('alt', 'Custom alt');
  });
});
