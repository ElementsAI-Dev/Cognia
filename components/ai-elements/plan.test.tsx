/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Plan, PlanHeader, PlanTitle, PlanDescription, PlanAction, PlanContent, PlanFooter, PlanTrigger } from './plan';

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button className={className} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardAction: ({ children }: { children: React.ReactNode }) => <div data-testid="card-action">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p data-testid="card-description" className={className}>{children}</p>
  ),
  CardFooter: ({ children }: { children: React.ReactNode }) => <div data-testid="card-footer">{children}</div>,
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-header" className={className}>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3 data-testid="card-title">{children}</h3>,
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="collapsible" data-as-child={asChild}>{children}</div>
  ),
  CollapsibleContent: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="collapsible-content" data-as-child={asChild}>{children}</div>
  ),
  CollapsibleTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="collapsible-trigger" data-as-child={asChild}>{children}</div>
  ),
}));

jest.mock('./shimmer', () => ({
  Shimmer: ({ children }: { children: React.ReactNode }) => <span data-testid="shimmer">{children}</span>,
}));

describe('Plan', () => {
  it('renders without crashing', () => {
    render(<Plan>Plan content</Plan>);
    expect(screen.getByTestId('collapsible')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(<Plan><span>Child content</span></Plan>);
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Plan className="custom-class">Content</Plan>);
    expect(screen.getByTestId('card')).toHaveClass('custom-class');
  });
});

describe('PlanHeader', () => {
  it('renders without crashing', () => {
    render(<Plan><PlanHeader>Header content</PlanHeader></Plan>);
    expect(screen.getByTestId('card-header')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Plan><PlanHeader className="custom-class">Header</PlanHeader></Plan>);
    expect(screen.getByTestId('card-header')).toHaveClass('custom-class');
  });
});

describe('PlanTitle', () => {
  it('renders title text', () => {
    render(<Plan><PlanTitle>My Plan</PlanTitle></Plan>);
    expect(screen.getByText('My Plan')).toBeInTheDocument();
  });

  it('shows shimmer effect when streaming', () => {
    render(<Plan isStreaming><PlanTitle>Loading...</PlanTitle></Plan>);
    expect(screen.getByTestId('shimmer')).toBeInTheDocument();
  });

  it('shows plain text when not streaming', () => {
    render(<Plan isStreaming={false}><PlanTitle>Static Title</PlanTitle></Plan>);
    expect(screen.queryByTestId('shimmer')).not.toBeInTheDocument();
    expect(screen.getByText('Static Title')).toBeInTheDocument();
  });
});

describe('PlanDescription', () => {
  it('renders description text', () => {
    render(<Plan><PlanDescription>Plan description here</PlanDescription></Plan>);
    expect(screen.getByText('Plan description here')).toBeInTheDocument();
  });

  it('shows shimmer effect when streaming', () => {
    render(<Plan isStreaming><PlanDescription>Loading...</PlanDescription></Plan>);
    expect(screen.getByTestId('shimmer')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Plan><PlanDescription className="custom-class">Desc</PlanDescription></Plan>);
    expect(screen.getByTestId('card-description')).toHaveClass('custom-class');
  });
});

describe('PlanAction', () => {
  it('renders without crashing', () => {
    render(<Plan><PlanAction>Action</PlanAction></Plan>);
    expect(screen.getByTestId('card-action')).toBeInTheDocument();
  });
});

describe('PlanContent', () => {
  it('renders without crashing', () => {
    render(<Plan><PlanContent>Content</PlanContent></Plan>);
    expect(screen.getByTestId('collapsible-content')).toBeInTheDocument();
  });
});

describe('PlanFooter', () => {
  it('renders without crashing', () => {
    render(<Plan><PlanFooter>Footer</PlanFooter></Plan>);
    expect(screen.getByTestId('card-footer')).toBeInTheDocument();
  });
});

describe('PlanTrigger', () => {
  it('renders without crashing', () => {
    render(<Plan><PlanTrigger /></Plan>);
    expect(screen.getByTestId('collapsible-trigger')).toBeInTheDocument();
  });

  it('has screen reader text', () => {
    render(<Plan><PlanTrigger /></Plan>);
    expect(screen.getByText('Toggle plan')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Plan><PlanTrigger className="custom-class" /></Plan>);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });
});
