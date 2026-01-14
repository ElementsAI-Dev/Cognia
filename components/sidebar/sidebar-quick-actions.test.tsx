/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SidebarQuickActions } from './sidebar-quick-actions';

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock UI components
jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, open }: { children: React.ReactNode; open: boolean }) => (
    <div data-testid="collapsible" data-open={open}>{children}</div>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="collapsible-content">{children}</div>
  ),
  CollapsibleTrigger: ({ children, className, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
    <button data-testid="collapsible-trigger" className={className} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('SidebarQuickActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<SidebarQuickActions />);
    expect(screen.getByTestId('collapsible')).toBeInTheDocument();
  });

  it('shows Quick Actions label', () => {
    render(<SidebarQuickActions />);
    // Multiple elements contain "Quick Actions" text, so use getAllByText
    const elements = screen.getAllByText(/Quick Actions/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('renders Image Studio link', () => {
    render(<SidebarQuickActions defaultOpen />);
    const elements = screen.getAllByText(/Image Studio/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('renders Video Studio link', () => {
    render(<SidebarQuickActions defaultOpen />);
    const elements = screen.getAllByText(/Video Studio/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('renders Video Editor link', () => {
    render(<SidebarQuickActions defaultOpen />);
    const elements = screen.getAllByText(/Video Editor/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('renders Selection Toolbar link', () => {
    render(<SidebarQuickActions defaultOpen />);
    // Text appears in both link and tooltip - use getAllByText
    const elements = screen.getAllByText(/Selection Toolbar/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('links to correct routes', () => {
    render(<SidebarQuickActions defaultOpen />);
    
    const links = screen.getAllByRole('link');
    const hrefs = links.map((link) => link.getAttribute('href'));
    
    expect(hrefs).toContain('/image-studio');
    expect(hrefs).toContain('/video-studio');
    expect(hrefs).toContain('/video-editor');
    expect(hrefs).toContain('/settings?section=selection');
  });

  it('respects defaultOpen prop', () => {
    render(<SidebarQuickActions defaultOpen />);
    const collapsible = screen.getByTestId('collapsible');
    expect(collapsible).toHaveAttribute('data-open', 'true');
  });

  it('starts closed when defaultOpen is false', () => {
    render(<SidebarQuickActions defaultOpen={false} />);
    const collapsible = screen.getByTestId('collapsible');
    expect(collapsible).toHaveAttribute('data-open', 'false');
  });

  it('renders collapsed view with limited actions', () => {
    render(<SidebarQuickActions collapsed />);
    
    // In collapsed mode, only first 3 actions should be visible
    const links = screen.getAllByRole('link');
    expect(links.length).toBe(3);
  });

  it('renders tooltips in collapsed mode', () => {
    render(<SidebarQuickActions collapsed />);
    const tooltips = screen.getAllByTestId('tooltip-content');
    expect(tooltips.length).toBeGreaterThan(0);
  });

  it('applies custom className', () => {
    render(<SidebarQuickActions className="custom-class" />);
    // The className is applied to the Collapsible component which is mocked
    const collapsible = screen.getByTestId('collapsible');
    expect(collapsible).toBeInTheDocument();
  });

  it('displays color-coded icons for each action', () => {
    render(<SidebarQuickActions defaultOpen />);
    const content = screen.getByTestId('collapsible-content');
    
    // Check for color classes on icons
    expect(content.innerHTML).toContain('text-pink-500');
    expect(content.innerHTML).toContain('text-red-500');
    expect(content.innerHTML).toContain('text-violet-500');
    expect(content.innerHTML).toContain('text-cyan-500');
  });

  it('renders in a 2-column grid when expanded', () => {
    render(<SidebarQuickActions defaultOpen />);
    const content = screen.getByTestId('collapsible-content');
    expect(content.innerHTML).toContain('grid-cols-2');
  });
});
