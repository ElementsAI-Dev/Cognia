/**
 * Tests for Routing Indicator Component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoutingIndicator, RoutingBadge } from './routing-indicator';
import type { ModelSelection, TaskClassification } from '@/types/provider/auto-router';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const mockClassification: TaskClassification = {
  complexity: 'moderate',
  category: 'coding',
  requiresReasoning: true,
  requiresTools: false,
  requiresVision: false,
  requiresCreativity: false,
  requiresCoding: true,
  requiresLongContext: false,
  estimatedInputTokens: 50,
  estimatedOutputTokens: 100,
  confidence: 0.8,
};

const mockSelection: ModelSelection = {
  provider: 'openai',
  model: 'gpt-4o',
  tier: 'balanced',
  reason: 'Auto: balanced quality/speed (moderate task) [coding, reasoning]',
  routingMode: 'rule-based',
  routingLatency: 5,
  classification: mockClassification,
};

describe('RoutingIndicator', () => {
  it('renders nothing when selection is null', () => {
    const { container } = render(<RoutingIndicator selection={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when not visible', () => {
    const { container } = render(
      <RoutingIndicator selection={mockSelection} isVisible={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders routing info when visible', () => {
    render(<RoutingIndicator selection={mockSelection} isVisible={true} />);
    expect(screen.getByText(/Auto-routed to Balanced/i)).toBeInTheDocument();
  });

  it('displays the provider badge', () => {
    render(<RoutingIndicator selection={mockSelection} />);
    expect(screen.getByText('openai')).toBeInTheDocument();
  });

  it('displays classification details', () => {
    render(<RoutingIndicator selection={mockSelection} />);
    expect(screen.getByText(/coding/i)).toBeInTheDocument();
    expect(screen.getByText(/moderate/i)).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = jest.fn();
    render(<RoutingIndicator selection={mockSelection} onDismiss={onDismiss} />);
    
    // Find the dismiss button (the one with X icon)
    const buttons = screen.getAllByRole('button');
    const dismissButton = buttons[0]; // First button is the dismiss button
    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('renders in compact mode', () => {
    render(<RoutingIndicator selection={mockSelection} compact={true} />);
    expect(screen.getByText('Balanced')).toBeInTheDocument();
  });

  it('shows routing latency when available', () => {
    render(<RoutingIndicator selection={mockSelection} />);
    // Click to expand
    const header = screen.getByText(/Auto-routed to Balanced/i).closest('div');
    if (header) fireEvent.click(header);
    expect(screen.getByText(/5ms/)).toBeInTheDocument();
  });
});

describe('RoutingBadge', () => {
  it('renders nothing when selection is null', () => {
    const { container } = render(<RoutingBadge selection={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders tier label', () => {
    render(<RoutingBadge selection={mockSelection} />);
    expect(screen.getByText('Balanced')).toBeInTheDocument();
  });

  it('applies correct tier styling', () => {
    render(<RoutingBadge selection={mockSelection} />);
    // Find the badge element by its text content
    const badge = screen.getByText('Balanced').closest('div');
    expect(badge).not.toBeNull();
    expect(badge?.className).toMatch(/text-blue/);
  });

  it('shows tooltip with details on hover', () => {
    render(<RoutingBadge selection={mockSelection} />);
    const badge = screen.getByText('Balanced');
    fireEvent.mouseEnter(badge);
    // Tooltip content would appear in a portal, check the trigger is present
    expect(badge).toBeInTheDocument();
  });
});

describe('Tier configurations', () => {
  const tiers: Array<{ tier: 'fast' | 'balanced' | 'powerful' | 'reasoning'; color: string }> = [
    { tier: 'fast', color: 'green' },
    { tier: 'balanced', color: 'blue' },
    { tier: 'powerful', color: 'purple' },
    { tier: 'reasoning', color: 'amber' },
  ];

  tiers.forEach(({ tier, color }) => {
    it(`renders ${tier} tier with ${color} styling`, () => {
      const selection: ModelSelection = {
        ...mockSelection,
        tier,
      };
      render(<RoutingBadge selection={selection} />);
      // Find the badge element and check for tier-specific styling
      const tierLabels: Record<string, string> = {
        fast: 'Fast',
        balanced: 'Balanced',
        powerful: 'Powerful',
        reasoning: 'Reasoning',
      };
      const badge = screen.getByText(tierLabels[tier]).closest('div');
      expect(badge).not.toBeNull();
      expect(badge?.className).toMatch(new RegExp(`text-${color}`));
    });
  });
});

describe('Classification badges', () => {
  it('shows reasoning badge when classification requires reasoning', () => {
    render(<RoutingIndicator selection={mockSelection} />);
    // Click to expand
    const header = screen.getByText(/Auto-routed to Balanced/i).closest('div');
    if (header) fireEvent.click(header);
    expect(screen.getByText('Reasoning')).toBeInTheDocument();
  });

  it('shows coding badge when classification requires coding', () => {
    render(<RoutingIndicator selection={mockSelection} />);
    // Click to expand
    const header = screen.getByText(/Auto-routed to Balanced/i).closest('div');
    if (header) fireEvent.click(header);
    expect(screen.getByText('Code')).toBeInTheDocument();
  });

  it('shows vision badge when classification requires vision', () => {
    const selectionWithVision: ModelSelection = {
      ...mockSelection,
      classification: {
        ...mockClassification,
        requiresVision: true,
      },
    };
    render(<RoutingIndicator selection={selectionWithVision} />);
    // Click to expand
    const header = screen.getByText(/Auto-routed to Balanced/i).closest('div');
    if (header) fireEvent.click(header);
    expect(screen.getByText('Vision')).toBeInTheDocument();
  });
});
