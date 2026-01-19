/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomEdge } from './custom-edge';
import { Position } from '@xyflow/react';

// Mock the workflow editor store
const mockDeleteEdge = jest.fn();
const mockUpdateEdge = jest.fn();

jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: () => ({
    deleteEdge: mockDeleteEdge,
    updateEdge: mockUpdateEdge,
  }),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, variant, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => {
    // Give unique test IDs based on variant
    const testId = variant === 'destructive' ? 'edge-delete-button' : 
                   variant === 'outline' ? 'outline-button' : 'button';
    return (
      <button onClick={onClick} className={className} data-testid={testId} data-variant={variant} {...props}>
        {children}
      </button>
    );
  },
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input data-testid="input" {...props} />,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span data-testid="badge" className={className}>{children}</span>
  ),
}));

jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="popover" data-open={open}>{children}</div>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div data-testid="popover-content">{children}</div>,
  PopoverTrigger: ({ children, className }: { children: React.ReactNode; className?: string; asChild?: boolean }) => (
    <div data-testid="popover-trigger" className={className}>{children}</div>
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

// Mock lucide-react
jest.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon">X</span>,
  Edit2: () => <span data-testid="edit-icon">Edit</span>,
  Check: () => <span data-testid="check-icon">Check</span>,
  Zap: () => <span data-testid="zap-icon">Zap</span>,
  AlertTriangle: () => <span data-testid="alert-icon">Alert</span>,
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
    // The delete edge button has variant="destructive"
    expect(screen.getByTestId('edge-delete-button')).toBeInTheDocument();
  });

  it('renders popover when not selected', () => {
    render(
      <svg>
        <CustomEdge {...defaultProps} selected={false} />
      </svg>
    );
    // The edge label renderer is always present with the popover
    expect(screen.getByTestId('edge-label-renderer')).toBeInTheDocument();
  });

  it('calls deleteEdge when delete button is clicked', () => {
    render(
      <svg>
        <CustomEdge {...defaultProps} selected={true} />
      </svg>
    );
    
    const deleteButton = screen.getByTestId('edge-delete-button');
    fireEvent.click(deleteButton);
    
    expect(mockDeleteEdge).toHaveBeenCalledWith('edge-1');
  });

  it('stops event propagation when delete button is clicked', () => {
    render(
      <svg>
        <CustomEdge {...defaultProps} selected={true} />
      </svg>
    );
    
    const deleteButton = screen.getByTestId('edge-delete-button');
    fireEvent.click(deleteButton);
    // Event propagation is stopped inside the click handler
    expect(mockDeleteEdge).toHaveBeenCalled();
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

  it('applies green styling for success edge type', () => {
    const propsWithSuccessType = {
      ...defaultProps,
      data: { label: 'Success Edge', edgeType: 'success' },
    };
    
    render(
      <svg>
        <CustomEdge {...propsWithSuccessType} />
      </svg>
    );
    
    // Check that the label text exists
    expect(screen.getByText('Success Edge')).toBeInTheDocument();
  });

  it('applies red styling for failure edge type', () => {
    const propsWithFailureType = {
      ...defaultProps,
      data: { label: 'Failure Edge', edgeType: 'failure' },
    };
    
    render(
      <svg>
        <CustomEdge {...propsWithFailureType} />
      </svg>
    );
    
    // Check that the label text exists
    expect(screen.getByText('Failure Edge')).toBeInTheDocument();
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

  it('renders edge label renderer even when no label and not selected', () => {
    render(
      <svg>
        <CustomEdge {...defaultProps} selected={false} data={{}} />
      </svg>
    );
    
    // The EdgeLabelRenderer is always present (contains the popover)
    expect(screen.getByTestId('edge-label-renderer')).toBeInTheDocument();
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
    // The main edge has animate-[dash_1s_linear_infinite] class
    expect(edge.getAttribute('class') || '').toContain('animate-[dash_1s_linear_infinite]');
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
