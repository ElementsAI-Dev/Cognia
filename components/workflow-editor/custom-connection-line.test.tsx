/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import { CustomConnectionLine } from './custom-connection-line';
import { Position, type ConnectionLineComponentProps } from '@xyflow/react';

describe('CustomConnectionLine', () => {
  const defaultProps = {
    fromX: 100,
    fromY: 100,
    toX: 200,
    toY: 200,
    connectionLineStyle: { stroke: 'red' },
    fromPosition: Position.Bottom,
    toPosition: Position.Top,
    connectionLineType: 'default',
    fromNode: { id: 'node-1', position: { x: 0, y: 0 }, data: {} },
    fromHandle: { id: 'handle-1', type: 'source', position: Position.Bottom },
    connectionStatus: null,
    toNode: null,
    toHandle: null,
  } as unknown as ConnectionLineComponentProps;

  it('renders without crashing', () => {
    const { container } = render(
      <svg>
        <CustomConnectionLine {...defaultProps} />
      </svg>
    );
    expect(container.querySelector('g')).toBeInTheDocument();
  });

  it('renders glow effect path', () => {
    const { container } = render(
      <svg>
        <CustomConnectionLine {...defaultProps} />
      </svg>
    );
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(2);
    
    // Glow effect path
    const glowPath = paths[0];
    expect(glowPath).toHaveAttribute('stroke-width', '6');
    expect(glowPath).toHaveAttribute('stroke-opacity', '0.3');
  });

  it('renders main line path', () => {
    const { container } = render(
      <svg>
        <CustomConnectionLine {...defaultProps} />
      </svg>
    );
    const paths = container.querySelectorAll('path');
    
    // Main line path
    const mainPath = paths[1];
    expect(mainPath).toHaveAttribute('stroke-width', '2');
  });

  it('renders animated dot at end position', () => {
    const { container } = render(
      <svg>
        <CustomConnectionLine {...defaultProps} />
      </svg>
    );
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(2);
    
    // Animated dot
    const dot = circles[0];
    expect(dot).toHaveAttribute('cx', '200');
    expect(dot).toHaveAttribute('cy', '200');
    expect(dot).toHaveAttribute('r', '4');
  });

  it('renders target indicator ring', () => {
    const { container } = render(
      <svg>
        <CustomConnectionLine {...defaultProps} />
      </svg>
    );
    const circles = container.querySelectorAll('circle');
    
    // Target ring
    const ring = circles[1];
    expect(ring).toHaveAttribute('cx', '200');
    expect(ring).toHaveAttribute('cy', '200');
    expect(ring).toHaveAttribute('r', '8');
    expect(ring).toHaveAttribute('stroke-width', '2');
  });

  it('calculates bezier path correctly', () => {
    const { container } = render(
      <svg>
        <CustomConnectionLine {...defaultProps} />
      </svg>
    );
    const path = container.querySelector('path');
    const d = path?.getAttribute('d');
    
    // Path should start at fromX, fromY
    expect(d).toContain('M100,100');
    // Path should end at toX, toY
    expect(d).toContain('200,200');
  });

  it('updates path when coordinates change', () => {
    const { container, rerender } = render(
      <svg>
        <CustomConnectionLine {...defaultProps} />
      </svg>
    );
    
    const newProps = {
      ...defaultProps,
      fromX: 50,
      fromY: 50,
      toX: 300,
      toY: 300,
    };
    
    rerender(
      <svg>
        <CustomConnectionLine {...newProps} />
      </svg>
    );
    
    const path = container.querySelector('path');
    const d = path?.getAttribute('d');
    expect(d).toContain('M50,50');
    expect(d).toContain('300,300');
  });

  it('applies connection line style to main path', () => {
    const customStyle = { stroke: 'blue', strokeDasharray: '5,5' };
    const { container } = render(
      <svg>
        <CustomConnectionLine {...defaultProps} connectionLineStyle={customStyle} />
      </svg>
    );
    
    const paths = container.querySelectorAll('path');
    const mainPath = paths[1];
    expect(mainPath).toHaveStyle({ stroke: 'blue' });
  });

  it('renders with different positions', () => {
    const positions = [
      { fromX: 0, fromY: 0, toX: 100, toY: 100 },
      { fromX: -50, fromY: -50, toX: 50, toY: 50 },
      { fromX: 500, fromY: 500, toX: 600, toY: 600 },
    ];

    positions.forEach((pos) => {
      const { container } = render(
        <svg>
          <CustomConnectionLine {...defaultProps} {...pos} />
        </svg>
      );
      
      const path = container.querySelector('path');
      expect(path).toBeInTheDocument();
    });
  });
});
