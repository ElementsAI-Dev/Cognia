/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { HumanNode } from './human-node';
import type { HumanNodeData } from '@/types/workflow/workflow-editor';

// Mock BaseNode
jest.mock('./base-node', () => ({
  BaseNode: ({
    data,
    children,
    ...props
  }: {
    data: { label: string };
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div data-testid="base-node" {...props}>
      <h3>{data.label}</h3>
      {children}
    </div>
  ),
}));

// Mock Badge
jest.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    className,
    variant,
    ...props
  }: {
    children?: React.ReactNode;
    className?: string;
    variant?: string;
    [key: string]: unknown;
  }) => (
    <span data-testid="badge" className={className} data-variant={variant} {...props}>
      {children}
    </span>
  ),
}));

const mockData: HumanNodeData = {
  id: 'human-1',
  nodeType: 'human',
  label: 'Manager Approval',
  executionStatus: 'idle',
  isConfigured: true,
  hasError: false,
  inputs: {},
  outputs: {},
  approvalMessage: 'Please review and approve this request',
  approvalOptions: ['Approve', 'Reject', 'Request Changes'],
  timeout: 3600,
  assignee: 'manager@example.com',
};

const baseProps = {
  id: 'human-1',
  type: 'human',
  draggable: true,
  selectable: true,
  deletable: true,
  dragging: false,
  zIndex: 0,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
};

describe('HumanNode', () => {
  it('renders without crashing', () => {
    render(<HumanNode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('Manager Approval')).toBeInTheDocument();
  });

  it('renders approval message', () => {
    render(<HumanNode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('Please review and approve this request')).toBeInTheDocument();
  });

  it('renders approval options', () => {
    render(<HumanNode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
    expect(screen.getByText('Request Changes')).toBeInTheDocument();
  });

  it('renders timeout', () => {
    render(<HumanNode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('Timeout: 3600s')).toBeInTheDocument();
  });

  it('renders assignee', () => {
    render(<HumanNode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('Assignee: manager@example.com')).toBeInTheDocument();
  });

  it('does not render approval message when not set', () => {
    const noMessageData: HumanNodeData = {
      ...mockData,
      approvalMessage: '',
    };

    render(<HumanNode {...baseProps} data={noMessageData} selected={false} />);
    expect(screen.queryByText(/Please review/)).not.toBeInTheDocument();
  });

  it('does not render timeout when not set', () => {
    const noTimeoutData: HumanNodeData = {
      ...mockData,
      timeout: undefined,
    };

    render(<HumanNode {...baseProps} data={noTimeoutData} selected={false} />);
    expect(screen.queryByText(/Timeout:/)).not.toBeInTheDocument();
  });

  it('does not render assignee when not set', () => {
    const noAssigneeData: HumanNodeData = {
      ...mockData,
      assignee: undefined,
    };

    render(<HumanNode {...baseProps} data={noAssigneeData} selected={false} />);
    expect(screen.queryByText(/Assignee:/)).not.toBeInTheDocument();
  });

  it('renders approval options badges', () => {
    render(<HumanNode {...baseProps} data={mockData} selected={false} />);

    const badges = screen.getAllByTestId('badge');
    expect(badges.some((b) => b.textContent === 'Approve')).toBe(true);
    expect(badges.some((b) => b.textContent === 'Reject')).toBe(true);
    expect(badges.some((b) => b.textContent === 'Request Changes')).toBe(true);
  });
});

describe('HumanNode integration tests', () => {
  it('handles complete human approval node', () => {
    render(<HumanNode {...baseProps} data={mockData} selected={false} />);

    expect(screen.getByText('Manager Approval')).toBeInTheDocument();
    expect(screen.getByText('Please review and approve this request')).toBeInTheDocument();
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Timeout: 3600s')).toBeInTheDocument();
    expect(screen.getByText('Assignee: manager@example.com')).toBeInTheDocument();
  });

  it('handles minimal human node', () => {
    const minimalData: HumanNodeData = {
      ...mockData,
      approvalMessage: '',
      approvalOptions: [],
      timeout: 0,
      assignee: '',
    };

    render(<HumanNode {...baseProps} data={minimalData} selected={false} />);

    expect(screen.getByText('Manager Approval')).toBeInTheDocument();
    expect(screen.queryByText(/Please review/)).not.toBeInTheDocument();
  });

  it('handles human node with single option', () => {
    const singleOptionData: HumanNodeData = {
      ...mockData,
      approvalOptions: ['Acknowledge'],
    };

    render(<HumanNode {...baseProps} data={singleOptionData} selected={false} />);

    expect(screen.getByText('Acknowledge')).toBeInTheDocument();
  });

  it('handles human node with many options', () => {
    const manyOptionsData: HumanNodeData = {
      ...mockData,
      approvalOptions: ['Option 1', 'Option 2', 'Option 3', 'Option 4', 'Option 5'],
    };

    render(<HumanNode {...baseProps} data={manyOptionsData} selected={false} />);

    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 5')).toBeInTheDocument();
  });
});
