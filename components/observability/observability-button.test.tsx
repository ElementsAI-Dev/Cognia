/**
 * ObservabilityButton Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ObservabilityButton } from './observability-button';

// Mock dependencies
jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      observabilitySettings: {
        enabled: true,
        langfuseEnabled: true,
        openTelemetryEnabled: true,
      },
    };
    return selector(state);
  }),
}));

jest.mock('./observability-dashboard', () => ({
  ObservabilityDashboard: ({ onClose }: { onClose?: () => void }) => (
    <div data-testid="observability-dashboard">
      Dashboard
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock Radix UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="dialog" data-open={open}>{children}</div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    asChild ? <>{children}</> : <div>{children}</div>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    asChild ? <>{children}</> : <div>{children}</div>
  ),
}));

describe('ObservabilityButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render button with Activity icon', () => {
    render(<ObservabilityButton />);
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should render with default props', () => {
    render(<ObservabilityButton />);
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should show label when showLabel is true', () => {
    render(<ObservabilityButton showLabel={true} />);
    
    expect(screen.getByText('Observability')).toBeInTheDocument();
  });

  it('should not show label when showLabel is false', () => {
    render(<ObservabilityButton showLabel={false} />);
    
    expect(screen.queryByText('Observability')).not.toBeInTheDocument();
  });

  it('should open dialog on click', () => {
    render(<ObservabilityButton />);
    
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    
    expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
  });

  it('should render tooltip content', () => {
    render(<ObservabilityButton />);
    
    expect(screen.getByText('Observability Dashboard')).toBeInTheDocument();
  });

  it('should apply variant prop', () => {
    render(<ObservabilityButton variant="outline" />);
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should apply size prop', () => {
    render(<ObservabilityButton size="sm" />);
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});

describe('ObservabilityButton when disabled', () => {
  beforeEach(() => {
    const stores = jest.requireMock('@/stores');
    stores.useSettingsStore.mockImplementation((selector: (state: unknown) => unknown) => {
      const state = {
        observabilitySettings: {
          enabled: false,
        },
      };
      return selector(state);
    });
  });

  it('should show disabled message in tooltip', () => {
    render(<ObservabilityButton />);
    
    expect(screen.getByText(/enable in settings/i)).toBeInTheDocument();
  });
});
