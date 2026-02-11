/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PromptTemplateCardSkeleton } from './prompt-template-card-skeleton';

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
  CardFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-footer" className={className}>{children}</div>
  ),
}));

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

describe('PromptTemplateCardSkeleton', () => {
  it('renders card with skeleton elements', () => {
    render(<PromptTemplateCardSkeleton />);
    
    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByTestId('card-content')).toBeInTheDocument();
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(5);
  });

  it('does not render footer by default', () => {
    render(<PromptTemplateCardSkeleton />);
    
    expect(screen.queryByTestId('card-footer')).not.toBeInTheDocument();
  });

  it('renders footer when showFooter is true', () => {
    render(<PromptTemplateCardSkeleton showFooter />);
    
    expect(screen.getByTestId('card-footer')).toBeInTheDocument();
  });

  it('has skeleton for icon placeholder', () => {
    render(<PromptTemplateCardSkeleton />);
    
    const skeletons = screen.getAllByTestId('skeleton');
    // First skeleton is the 12x12 icon placeholder
    const iconSkeleton = skeletons.find(s => s.className?.includes('w-12') && s.className?.includes('h-12'));
    expect(iconSkeleton).toBeInTheDocument();
  });

  it('renders additional skeleton in footer when showFooter is true', () => {
    render(<PromptTemplateCardSkeleton showFooter />);
    
    const footer = screen.getByTestId('card-footer');
    const footerSkeletons = footer.querySelectorAll('[data-testid="skeleton"]');
    expect(footerSkeletons.length).toBe(1);
  });
});
