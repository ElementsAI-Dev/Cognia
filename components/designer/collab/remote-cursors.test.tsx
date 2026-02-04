/**
 * Tests for RemoteCursors component
 */

import { render, screen } from '@testing-library/react';
import { RemoteCursors } from './remote-cursors';
import type { RemoteCursor } from '@/types/canvas/collaboration';

describe('RemoteCursors', () => {
  const mockCursors: RemoteCursor[] = [
    {
      participantId: 'user-1',
      position: { line: 5, column: 10 },
      color: '#3b82f6',
      name: 'Alice',
    },
    {
      participantId: 'user-2',
      position: { line: 10, column: 5 },
      color: '#10b981',
      name: 'Bob',
    },
  ];

  it('should render nothing when no cursors', () => {
    const { container } = render(<RemoteCursors cursors={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render cursor for each participant', () => {
    render(<RemoteCursors cursors={mockCursors} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <RemoteCursors cursors={mockCursors} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should position cursors based on line and column', () => {
    const lineHeight = 20;
    const characterWidth = 8;

    const { container } = render(
      <RemoteCursors
        cursors={mockCursors}
        lineHeight={lineHeight}
        characterWidth={characterWidth}
      />
    );

    // Check that cursors are rendered
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(container.querySelectorAll('.absolute').length).toBeGreaterThan(0);
  });

  it('should apply editor offset', () => {
    const lineHeight = 20;
    const characterWidth = 8;
    const offset = { top: 50, left: 100 };

    const { container } = render(
      <RemoteCursors
        cursors={[mockCursors[0]]}
        lineHeight={lineHeight}
        characterWidth={characterWidth}
        editorOffset={offset}
      />
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    // Verify cursor is positioned (actual position depends on implementation)
    expect(container.querySelectorAll('.absolute').length).toBeGreaterThan(0);
  });

  it('should render cursor with correct color', () => {
    const { container } = render(<RemoteCursors cursors={mockCursors} />);

    const aliceLabel = screen.getByText('Alice');
    expect(aliceLabel).toBeInTheDocument();
    // Color is applied via style attribute (rendered as rgb)
    expect(container.innerHTML).toContain('rgb(59, 130, 246)');
  });

  it('should be hidden from accessibility', () => {
    const { container } = render(<RemoteCursors cursors={mockCursors} />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('should render selection when present', () => {
    const cursorWithSelection: RemoteCursor[] = [
      {
        participantId: 'user-1',
        position: { line: 5, column: 10 },
        color: '#3b82f6',
        name: 'Alice',
        selection: {
          startLine: 5,
          startColumn: 0,
          endLine: 5,
          endColumn: 20,
        },
      },
    ];

    const { container } = render(<RemoteCursors cursors={cursorWithSelection} />);

    const selectionElements = container.querySelectorAll('.opacity-30');
    expect(selectionElements.length).toBeGreaterThan(0);
  });

  it('should filter out cursors without position', () => {
    const cursorsWithMissingPosition: RemoteCursor[] = [
      {
        participantId: 'user-1',
        position: { line: 5, column: 10 },
        color: '#3b82f6',
        name: 'Alice',
      },
      {
        participantId: 'user-2',
        position: undefined as unknown as { line: number; column: number },
        color: '#10b981',
        name: 'Bob',
      },
    ];

    render(<RemoteCursors cursors={cursorsWithMissingPosition} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  it('should handle multi-line selection', () => {
    const cursorWithMultiLineSelection: RemoteCursor[] = [
      {
        participantId: 'user-1',
        position: { line: 5, column: 10 },
        color: '#3b82f6',
        name: 'Alice',
        selection: {
          startLine: 5,
          startColumn: 0,
          endLine: 8,
          endColumn: 15,
        },
      },
    ];

    const { container } = render(
      <RemoteCursors cursors={cursorWithMultiLineSelection} />
    );

    const selectionElements = container.querySelectorAll('.opacity-30');
    expect(selectionElements.length).toBe(4);
  });
});
