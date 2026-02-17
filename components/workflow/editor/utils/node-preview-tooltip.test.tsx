import React from 'react';
import { render, screen } from '@testing-library/react';
import { NodePreviewTooltip } from './node-preview-tooltip';

jest.mock('@/components/ui/hover-card', () => ({
  HoverCard: ({ children, onOpenChange }: { children: React.ReactNode; onOpenChange?: (open: boolean) => void }) => {
    React.useEffect(() => onOpenChange?.(true), [onOpenChange]);
    return <div>{children}</div>;
  },
  HoverCardTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  HoverCardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('NodePreviewTooltip (utils implementation)', () => {
  it('shows AI node preview details', () => {
    render(
      <NodePreviewTooltip
        data={{
          id: 'n1',
          nodeType: 'ai',
          label: 'AI Step',
          description: 'Generate response',
          isConfigured: true,
          aiPrompt: 'Hello',
          model: 'gpt-4o',
          temperature: 0.5,
        } as any}
      >
        <button type="button">trigger</button>
      </NodePreviewTooltip>
    );

    expect(screen.getByText('AI Step')).toBeInTheDocument();
    expect(screen.getByText('gpt-4o')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('shows tool node fallback when no tool selected', () => {
    render(
      <NodePreviewTooltip
        data={{
          id: 'n2',
          nodeType: 'tool',
          label: 'Tool Step',
          isConfigured: false,
        } as any}
      >
        <button type="button">trigger2</button>
      </NodePreviewTooltip>
    );

    expect(screen.getByText('Tool Step')).toBeInTheDocument();
    expect(screen.getByText(/not configured/i)).toBeInTheDocument();
  });
});
