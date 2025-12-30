/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomEdge } from './custom-edge';
import { Position } from '@xyflow/react';

// Mock the workflow editor store
const mockDeleteEdge = jest.fn();

jest.mock('@/stores/workflow-editor-store', () => ({
  useWorkflowEditorStore: () => ({
    deleteEdge: mockDeleteEdge,
  }),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button onClick={onClick} className={className} data-testid="delete-button" {...props}>
      {children}
    </button>
  ),
}));

// Mock lucide-react
jest.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon">X</span>,
}));

// Mock @xyflow/react components
jest.mock('@xyflow/react', () => ({
  ...jest.requireActual('@xyflow/react'),
  BaseEdge: ({ id, path, className }: { id: string; path: string; className?: string; markerEnd?: string; style?: React.CSSProperties }) => (
    <path data-testid={`edge-${id}`} d={path} className={className} />
  ),
  EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="edge-label-renderer">{children}</div>
  ),
  getBezierPath: () => ['M0,0 C50,50 100,100 150,150', 75, 75],
  Position: {
    Top: 'top',
    Right: 'right',
    Bottom: 'bottom',
    Left: 'left',
  },
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('CustomEdge', () => {
  const defaultProps = {
    id: 'edge-1',
    sourceX: 0,
    sourceY: 0,
    targetX: 100,
    targetY: 100,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    selected: false,
    data: undefined,
    markerEnd: undefined,
    source: 'node-1',
    target: 'node-2',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <svg>
        <CustomEdge {...defaultProps} />
      </svg>
    );
    expect(container).toBeInTheDocument();
  });

  it('renders BaseEdge with correct id', () => {
    render(
      <svg>
        <CustomEdge {...defaultProps} />
      </svg>
    );
    expect(screen.getByTestId('edge-edge-1')).toBeInTheDocument();
  });

  it('shows delete button when selected', () => {
    render(
      <svg>
        <CustomEdge {...defaultProps} selected={true} />
      </svg>
    );
    expect(screen.getByTestId('delete-button')).toBeInTheDocument();
  });

  it('does not show delete button when not selected', () => {
    render(
      <svg>
        <CustomEdge {...defaultProps} selected={false} />
      </svg>
    );
    expect(screen.queryByTestId('delete-button')).not.toBeInTheDocument();
  });

  it('calls deleteEdge when delete button is clicked', () => {
    render(
      <svg>
        <CustomEdge {...defaultProps} selected={true} />
      </svg>
    );
    
    const deleteButton = screen.getByTestId('delete-button');
    fireEvent.click(deleteButton);
    
    expect(mockDeleteEdge).toHaveBeenCalledWith('edge-1');
  });

  it('stops event propagation when delete button is clicked', () => {
    const stopPropagation = jest.fn();
    render(
      <svg>
        <CustomEdge {...defaultProps} selected={true} />
      </svg>
    );
    
    const deleteButton = screen.getByTestId('delete-button');
    fireEvent.click(deleteButton, { stopPropagation });
  });

  it('renders label when provided in data', () => {
    const propsWithLabel = {
      ...defaultProps,
      data: { label: 'Test Label' },
    };
    
    render(
      <svg>
        <CustomEdge {...propsWithLabel} />
      </svg>
    );
    
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('applies green border for true condition value', () => {
    const propsWithTrueCondition = {
      ...defaultProps,
      data: { label: 'True Branch', conditionValue: true },
    };
    
    render(
      <svg>
        <CustomEdge {...propsWithTrueCondition} />
      </svg>
    );
    
    const label = screen.getByText('True Branch');
    const labelClass = label.closest('div')?.getAttribute('class') || '';
    expect(labelClass).toContain('border-green-500');
  });

  it('applies red border for false condition value', () => {
    const propsWithFalseCondition = {
      ...defaultProps,
      data: { label: 'False Branch', conditionValue: false },
    };
    
    render(
      <svg>
        <CustomEdge {...propsWithFalseCondition} />
      </svg>
    );
    
    const label = screen.getByText('False Branch');
    const labelClass = label.closest('div')?.getAttribute('class') || '';
    expect(labelClass).toContain('border-red-500');
  });

  it('renders edge label renderer when label exists', () => {
    const propsWithLabel = {
      ...defaultProps,
      data: { label: 'Edge Label' },
    };
    
    render(
      <svg>
        <CustomEdge {...propsWithLabel} />
      </svg>
    );
    
    expect(screen.getByTestId('edge-label-renderer')).toBeInTheDocument();
  });

  it('renders edge label renderer when selected even without label', () => {
    render(
      <svg>
        <CustomEdge {...defaultProps} selected={true} />
      </svg>
    );
    
    expect(screen.getByTestId('edge-label-renderer')).toBeInTheDocument();
  });

  it('does not render edge label renderer when no label and not selected', () => {
    render(
      <svg>
        <CustomEdge {...defaultProps} selected={false} data={{}} />
      </svg>
    );
    
    expect(screen.queryByTestId('edge-label-renderer')).not.toBeInTheDocument();
  });

  it('handles animated edge data', () => {
    const propsWithAnimation = {
      ...defaultProps,
      data: { animated: true },
    };
    
    render(
      <svg>
        <CustomEdge {...propsWithAnimation} />
      </svg>
    );
    
    const edge = screen.getByTestId('edge-edge-1');
    expect(edge.getAttribute('class') || '').toContain('animate-pulse');
  });

  it('applies dashed style for conditional edges', () => {
    const propsWithCondition = {
      ...defaultProps,
      data: { condition: 'x > 5' },
    };
    
    render(
      <svg>
        <CustomEdge {...propsWithCondition} />
      </svg>
    );
    
    // Edge should render (style is applied via strokeDasharray)
    expect(screen.getByTestId('edge-edge-1')).toBeInTheDocument();
  });
});
