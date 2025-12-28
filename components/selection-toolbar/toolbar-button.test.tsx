/**
 * Tests for ToolbarButton component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ToolbarButton } from './toolbar-button';
import { Search, Copy, Sparkles } from 'lucide-react';

// Mock the tooltip component
jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
  TooltipTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
}));

describe('ToolbarButton', () => {
  describe('rendering', () => {
    it('renders with icon and label', () => {
      render(<ToolbarButton icon={Search} label="Search" />);
      
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Search');
    });

    it('renders with different variants', () => {
      const { rerender } = render(<ToolbarButton icon={Search} label="Default" variant="default" />);
      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(<ToolbarButton icon={Search} label="Primary" variant="primary" />);
      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(<ToolbarButton icon={Search} label="Success" variant="success" />);
      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(<ToolbarButton icon={Search} label="Warning" variant="warning" />);
      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(<ToolbarButton icon={Search} label="Danger" variant="danger" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders with different sizes', () => {
      const { rerender } = render(<ToolbarButton icon={Search} label="Small" size="sm" />);
      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(<ToolbarButton icon={Search} label="Medium" size="md" />);
      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(<ToolbarButton icon={Search} label="Large" size="lg" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('states', () => {
    it('renders loading state with cursor-wait class', () => {
      render(<ToolbarButton icon={Search} label="Loading" isLoading />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('cursor-wait');
    });

    it('renders active state with scale-105 class', () => {
      render(<ToolbarButton icon={Search} label="Active" isActive />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('scale-105');
    });

    it('renders disabled state', () => {
      render(<ToolbarButton icon={Search} label="Disabled" disabled />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('badge', () => {
    it('renders badge with number', () => {
      render(<ToolbarButton icon={Search} label="With Badge" badge={5} />);
      
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('renders badge with string', () => {
      render(<ToolbarButton icon={Search} label="With Badge" badge="New" />);
      
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('does not render badge when undefined', () => {
      render(<ToolbarButton icon={Search} label="No Badge" />);
      
      expect(screen.queryByText(/\d+/)).not.toBeInTheDocument();
    });
  });

  describe('shortcut', () => {
    it('displays shortcut key', () => {
      render(<ToolbarButton icon={Search} label="Search" shortcut="S" showTooltip />);
      
      // Shortcut should be in tooltip content
      expect(screen.getByTestId('tooltip-content')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onClick when clicked', () => {
      const handleClick = jest.fn();
      render(<ToolbarButton icon={Search} label="Click Me" onClick={handleClick} />);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('button is disabled when disabled prop is true', () => {
      const handleClick = jest.fn();
      render(<ToolbarButton icon={Search} label="Disabled" onClick={handleClick} disabled />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('button shows loading state', () => {
      render(<ToolbarButton icon={Search} label="Loading" isLoading />);
      
      const button = screen.getByRole('button');
      // Loading state adds cursor-wait class
      expect(button).toHaveClass('cursor-wait');
    });
  });

  describe('tooltip', () => {
    it('shows tooltip with label and description', () => {
      render(
        <ToolbarButton 
          icon={Search} 
          label="Search" 
          description="Search the web"
          showTooltip 
        />
      );
      
      expect(screen.getByTestId('tooltip-content')).toBeInTheDocument();
    });

    it('hides tooltip when showTooltip is false', () => {
      render(
        <ToolbarButton 
          icon={Search} 
          label="Search" 
          description="Search the web"
          showTooltip={false}
        />
      );
      
      expect(screen.queryByTestId('tooltip-content')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has correct aria-label', () => {
      render(<ToolbarButton icon={Search} label="Search Button" />);
      
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Search Button');
    });

    it('is focusable when not disabled', () => {
      render(<ToolbarButton icon={Search} label="Focusable" />);
      
      const button = screen.getByRole('button');
      button.focus();
      
      expect(document.activeElement).toBe(button);
    });

    it('is not focusable when disabled', () => {
      render(<ToolbarButton icon={Search} label="Not Focusable" disabled />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('multiple icons', () => {
    it('renders different icons correctly', () => {
      const { rerender } = render(<ToolbarButton icon={Search} label="Search" />);
      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(<ToolbarButton icon={Copy} label="Copy" />);
      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(<ToolbarButton icon={Sparkles} label="Sparkles" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});
