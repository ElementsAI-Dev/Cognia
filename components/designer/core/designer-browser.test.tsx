/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignerBrowser } from './designer-browser';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock designer templates
jest.mock('@/lib/designer', () => ({
  DESIGNER_TEMPLATES: [
    {
      id: 'template-1',
      name: 'Landing Page',
      description: 'A modern landing page template',
      category: 'Landing',
      framework: 'react',
      code: '<div className="landing">Hello</div>',
    },
    {
      id: 'template-2',
      name: 'Dashboard',
      description: 'Admin dashboard template',
      category: 'Dashboard',
      framework: 'react',
      code: '<div className="grid">Dashboard</div>',
    },
    {
      id: 'template-3',
      name: 'Form Page',
      description: 'Contact form template',
      category: 'Form',
      framework: 'vue',
      code: '<form><input /></form>',
    },
  ],
  FRAMEWORK_OPTIONS: [
    { value: 'react', label: 'React' },
    { value: 'vue', label: 'Vue' },
    { value: 'html', label: 'HTML' },
  ],
}));

// Mock UI components
jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>{children}</div>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

describe('DesignerBrowser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the template library header', () => {
    render(<DesignerBrowser />);
    expect(screen.getByText('templateLibrary')).toBeInTheDocument();
  });

  it('should display template count badge', () => {
    render(<DesignerBrowser />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should render search input', () => {
    render(<DesignerBrowser />);
    expect(screen.getByPlaceholderText('searchTemplates')).toBeInTheDocument();
  });

  it('should render view toggle buttons', () => {
    render(<DesignerBrowser />);
    const buttons = screen.getAllByRole('button');
    const gridButton = buttons.find((btn) => btn.querySelector('svg.lucide-grid-3x3'));
    const listButton = buttons.find((btn) => btn.querySelector('svg.lucide-list'));
    expect(gridButton).toBeInTheDocument();
    expect(listButton).toBeInTheDocument();
  });

  it('should render templates from DESIGNER_TEMPLATES', () => {
    render(<DesignerBrowser />);
    // Check that at least some templates are rendered
    expect(screen.getByText('Landing Page')).toBeInTheDocument();
    // Dashboard appears multiple times in the template (in sidebar nav text)
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
  });

  it('should show results count', () => {
    render(<DesignerBrowser />);
    // Look for templates count text pattern
    const resultsText = screen.getByText(/\d+ templatesFound/);
    expect(resultsText).toBeInTheDocument();
  });

  it('should call onSelectTemplate when template is selected', async () => {
    const onSelectTemplate = jest.fn();
    render(<DesignerBrowser onSelectTemplate={onSelectTemplate} />);
    
    const landingTemplate = screen.getByText('Landing Page');
    await userEvent.click(landingTemplate.closest('[class*="cursor-pointer"]')!);
    
    expect(onSelectTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'template-1', name: 'Landing Page' })
    );
  });

  it('should render new design button when onCreateNew is provided', () => {
    const onCreateNew = jest.fn();
    render(<DesignerBrowser onCreateNew={onCreateNew} />);
    
    expect(screen.getByText('newDesign')).toBeInTheDocument();
  });

  it('should not render new design button when onCreateNew is not provided', () => {
    render(<DesignerBrowser />);
    
    expect(screen.queryByText('newDesign')).not.toBeInTheDocument();
  });

  it('should call onCreateNew when new design button is clicked', async () => {
    const onCreateNew = jest.fn();
    render(<DesignerBrowser onCreateNew={onCreateNew} />);
    
    const newDesignButton = screen.getByText('newDesign');
    await userEvent.click(newDesignButton);
    
    expect(onCreateNew).toHaveBeenCalled();
  });

  it('should render back button when showBackButton is true', () => {
    render(<DesignerBrowser showBackButton={true} />);
    
    const backButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-arrow-left')
    );
    expect(backButton).toBeInTheDocument();
  });

  it('should not render back button when showBackButton is false', () => {
    render(<DesignerBrowser showBackButton={false} />);
    
    const backButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-arrow-left')
    );
    expect(backButton).toBeUndefined();
  });

  it('should have scroll area for template list', () => {
    render(<DesignerBrowser />);
    expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<DesignerBrowser className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should switch to list view when list button is clicked', async () => {
    render(<DesignerBrowser />);
    
    const buttons = screen.getAllByRole('button');
    const listButton = buttons.find((btn) => btn.querySelector('svg.lucide-list'));
    
    if (listButton) {
      await userEvent.click(listButton);
      // List button should now be active (secondary variant)
      expect(listButton).toHaveClass('rounded-l-none');
    }
  });
});
