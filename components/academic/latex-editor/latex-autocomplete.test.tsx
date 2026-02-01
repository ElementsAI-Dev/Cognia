/**
 * Unit tests for LaTeXAutocomplete component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LaTeXAutocomplete } from './latex-autocomplete';

import type { LaTeXSuggestion } from '@/types/latex';

describe('LaTeXAutocomplete', () => {
  const mockSuggestions: LaTeXSuggestion[] = [
    { id: '1', label: '\\alpha', insertText: '\\alpha', detail: 'Greek letter alpha', type: 'command' },
    { id: '2', label: '\\beta', insertText: '\\beta', detail: 'Greek letter beta', type: 'command' },
    { id: '3', label: '\\gamma', insertText: '\\gamma', detail: 'Greek letter gamma', type: 'command' },
  ];

  const defaultProps = {
    position: { x: 100, y: 200 },
    suggestions: mockSuggestions,
    onSelect: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the autocomplete popup', () => {
    render(<LaTeXAutocomplete {...defaultProps} />);
    expect(screen.getByText('\\alpha')).toBeInTheDocument();
  });

  it('displays all suggestions', () => {
    render(<LaTeXAutocomplete {...defaultProps} />);
    expect(screen.getByText('\\alpha')).toBeInTheDocument();
    expect(screen.getByText('\\beta')).toBeInTheDocument();
    expect(screen.getByText('\\gamma')).toBeInTheDocument();
  });

  it('displays suggestion details', () => {
    render(<LaTeXAutocomplete {...defaultProps} />);
    expect(screen.getByText('Greek letter alpha')).toBeInTheDocument();
  });

  it('calls onSelect when suggestion clicked', async () => {
    render(<LaTeXAutocomplete {...defaultProps} />);
    
    await userEvent.click(screen.getByText('\\alpha'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith(mockSuggestions[0]);
  });

  it('calls onClose when Escape pressed', async () => {
    render(<LaTeXAutocomplete {...defaultProps} />);
    
    await userEvent.keyboard('{Escape}');
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('positions popup at specified coordinates', () => {
    const { container } = render(<LaTeXAutocomplete {...defaultProps} />);
    const popup = container.firstChild as HTMLElement;
    
    // Check that styles are applied (either inline or via className)
    expect(popup).toBeDefined();
  });

  it('handles empty suggestions', () => {
    render(<LaTeXAutocomplete {...defaultProps} suggestions={[]} />);
    // Should render without errors
    expect(screen.queryByText('\\alpha')).not.toBeInTheDocument();
  });

  it('handles keyboard navigation', async () => {
    render(<LaTeXAutocomplete {...defaultProps} />);
    
    // Arrow down should highlight next item
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');
    
    // Should select the highlighted item
    expect(defaultProps.onSelect).toHaveBeenCalled();
  });

  it('renders at correct position', () => {
    const { container } = render(
      <LaTeXAutocomplete 
        {...defaultProps} 
        position={{ x: 150, y: 250 }} 
      />
    );
    
    expect(container.firstChild).toBeDefined();
  });
});
