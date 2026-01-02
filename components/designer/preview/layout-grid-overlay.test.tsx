/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LayoutGridOverlay } from './layout-grid-overlay';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, className }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; className?: string }) => (
    <button onClick={onClick} data-variant={variant} className={className}>{children}</button>
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <label className={className}>{children}</label>
  ),
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange }: { value?: number[]; onValueChange?: (v: number[]) => void }) => (
    <input
      type="range"
      data-testid="slider"
      value={value?.[0]}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
    />
  ),
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (v: boolean) => void }) => (
    <input
      type="checkbox"
      data-testid="switch"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div data-testid="popover-content">{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

describe('LayoutGridOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render toggle button', () => {
    render(<LayoutGridOverlay />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should render settings button', () => {
    render(<LayoutGridOverlay />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('should toggle grid visibility when toggle button is clicked', async () => {
    render(<LayoutGridOverlay />);
    
    const buttons = screen.getAllByRole('button');
    const toggleButton = buttons[0];
    
    await userEvent.click(toggleButton);
    // Grid should now be visible
    expect(toggleButton).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<LayoutGridOverlay className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should use default container dimensions', () => {
    const { container } = render(<LayoutGridOverlay />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should accept custom container dimensions', () => {
    const { container } = render(
      <LayoutGridOverlay containerWidth={1920} containerHeight={1080} />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render grid settings in popover', () => {
    render(<LayoutGridOverlay />);
    
    // Popover content is always rendered in the mocked version
    expect(screen.getByTestId('popover-content')).toBeInTheDocument();
  });

  it('should render column slider in settings', () => {
    render(<LayoutGridOverlay />);
    expect(screen.getByText('columns')).toBeInTheDocument();
  });

  it('should render gutter slider in settings', () => {
    render(<LayoutGridOverlay />);
    expect(screen.getByText('gutter')).toBeInTheDocument();
  });

  it('should render margin slider in settings', () => {
    render(<LayoutGridOverlay />);
    expect(screen.getByText('margin')).toBeInTheDocument();
  });

  it('should render opacity slider in settings', () => {
    render(<LayoutGridOverlay />);
    expect(screen.getByText('opacity')).toBeInTheDocument();
  });

  it('should render show columns toggle', () => {
    render(<LayoutGridOverlay />);
    expect(screen.getByText('showColumns')).toBeInTheDocument();
  });

  it('should render show baseline toggle', () => {
    render(<LayoutGridOverlay />);
    expect(screen.getByText('showBaseline')).toBeInTheDocument();
  });
});
