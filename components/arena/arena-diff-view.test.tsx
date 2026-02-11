/**
 * Unit tests for ArenaDiffView component
 */

import { render, screen } from '@testing-library/react';
import { ArenaDiffView } from './arena-diff-view';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('ArenaDiffView', () => {
  const defaultProps = {
    responseA: 'The quick brown fox jumps over the lazy dog',
    responseB: 'The quick red fox jumps over the lazy cat',
    labelA: 'Model A',
    labelB: 'Model B',
  };

  it('renders with default labels', () => {
    render(<ArenaDiffView {...defaultProps} />);
    expect(screen.getByText('Model A')).toBeInTheDocument();
    expect(screen.getByText('Model B')).toBeInTheDocument();
  });

  it('renders comparison header', () => {
    render(<ArenaDiffView {...defaultProps} />);
    expect(screen.getByText('diffView.title')).toBeInTheDocument();
  });

  it('shows similarity percentage', () => {
    render(<ArenaDiffView {...defaultProps} />);
    // Should show a similarity badge
    const badge = screen.getByText(/diffView.similar/);
    expect(badge).toBeInTheDocument();
  });

  it('renders with identical responses showing high similarity', () => {
    render(
      <ArenaDiffView
        responseA="Hello world"
        responseB="Hello world"
        labelA="A"
        labelB="B"
      />
    );
    expect(screen.getByText(/100%/)).toBeInTheDocument();
  });

  it('renders with completely different responses showing low similarity', () => {
    render(
      <ArenaDiffView
        responseA="alpha beta gamma"
        responseB="delta epsilon zeta"
        labelA="A"
        labelB="B"
      />
    );
    // Should show 0% since no words overlap
    expect(screen.getByText(/0%/)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ArenaDiffView {...defaultProps} className="custom-diff" />
    );
    expect(container.firstChild).toHaveClass('custom-diff');
  });

  it('renders custom labels', () => {
    render(
      <ArenaDiffView
        {...defaultProps}
        labelA="GPT-4"
        labelB="Claude 3"
      />
    );
    expect(screen.getByText('GPT-4')).toBeInTheDocument();
    expect(screen.getByText('Claude 3')).toBeInTheDocument();
  });

  it('handles empty responses gracefully', () => {
    render(
      <ArenaDiffView
        responseA=""
        responseB=""
        labelA="A"
        labelB="B"
      />
    );
    expect(screen.getByText('diffView.title')).toBeInTheDocument();
  });
});
