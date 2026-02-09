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

  // === Original tests (icon prop) ===

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

  // === New tests (providerId prop) ===

  it('resolves icon from providerId for known providers', () => {
    render(<ProviderIcon providerId="openai" />);
    const img = screen.getByTestId('next-image');
    expect(img).toHaveAttribute('src', '/icons/providers/openai.svg');
    expect(img).toHaveAttribute('alt', 'OpenAI icon');
  });

  it('resolves icon from providerId for anthropic', () => {
    render(<ProviderIcon providerId="anthropic" />);
    const img = screen.getByTestId('next-image');
    expect(img).toHaveAttribute('src', '/icons/providers/anthropic.svg');
    expect(img).toHaveAttribute('alt', 'Anthropic icon');
  });

  it('icon prop takes precedence over providerId', () => {
    render(<ProviderIcon icon="/custom/icon.svg" providerId="openai" />);
    const img = screen.getByTestId('next-image');
    expect(img).toHaveAttribute('src', '/custom/icon.svg');
  });

  it('renders CDN fallback img for unknown providerId', () => {
    const { container } = render(<ProviderIcon providerId="custom-ai" />);
    // Unknown providers fall back to CDN URL, rendered as native img
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img?.getAttribute('src')).toContain('models.dev/logos/custom-ai.svg');
  });

  it('renders avatar variant with brand color background', () => {
    const { container } = render(<ProviderIcon providerId="openai" variant="avatar" size={32} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ width: '32px', height: '32px' });
    // Should have the avatar wrapper with brand color bg
    expect(wrapper.querySelector('img')).toBeInTheDocument();
  });

  it('renders InitialAvatar for avatar variant with unknown provider', () => {
    const { container } = render(<ProviderIcon providerId="unknown-provider" variant="avatar" size={32} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ width: '32px', height: '32px' });
    expect(container.textContent).toContain('U');
  });

  it('custom alt overrides providerId-based alt', () => {
    render(<ProviderIcon providerId="openai" alt="My custom alt" />);
    const img = screen.getByTestId('next-image');
    expect(img).toHaveAttribute('alt', 'My custom alt');
  });
});
