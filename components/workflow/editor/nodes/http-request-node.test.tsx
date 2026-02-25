/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { HttpRequestNode } from './http-request-node';
import type { HttpRequestNodeData } from '@/types/workflow/workflow-editor';

// Mock BaseNode
jest.mock('./base-node', () => ({
  BaseNode: ({
    data,
    children,
    ..._props
  }: {
    data: { nodeType: string };
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div data-testid="base-node" data-node-type={data.nodeType}>
      {children}
    </div>
  ),
}));

// Mock Badge
jest.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    className,
    variant: _variant,
    ...props
  }: {
    children?: React.ReactNode;
    className?: string;
    variant?: string;
    [key: string]: unknown;
  }) => (
    <span data-testid="badge" className={className} {...props}>
      {children}
    </span>
  ),
}));

const mockData: HttpRequestNodeData = {
  nodeType: 'httpRequest',
  label: 'HTTP Request',
  executionStatus: 'idle',
  isConfigured: true,
  hasError: false,
  method: 'GET',
  url: 'https://api.example.com/users',
  headers: {},
  body: '',
  auth: { type: 'none' },
  timeout: 30000,
  bodyType: 'none',
  followRedirects: true,
};

const baseProps = {
  id: 'http-1',
  type: 'httpRequest',
  draggable: true,
  selectable: true,
  deletable: true,
  dragging: false,
  zIndex: 0,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
  selected: false,
};

describe('HttpRequestNode', () => {
  it('renders without crashing', () => {
    render(<HttpRequestNode {...baseProps} data={mockData} />);
    expect(screen.getByTestId('base-node')).toBeInTheDocument();
  });

  it('has correct node type', () => {
    render(<HttpRequestNode {...baseProps} data={mockData} />);
    expect(screen.getByTestId('base-node')).toHaveAttribute('data-node-type', 'httpRequest');
  });

  it('renders method badge', () => {
    render(<HttpRequestNode {...baseProps} data={mockData} />);
    expect(screen.getByText('GET')).toBeInTheDocument();
  });

  it('renders URL', () => {
    render(<HttpRequestNode {...baseProps} data={mockData} />);
    expect(screen.getByText('https://api.example.com/users')).toBeInTheDocument();
  });
});

describe('HttpRequestNode HTTP methods', () => {
  it('renders GET method', () => {
    render(<HttpRequestNode {...baseProps} data={mockData} />);
    expect(screen.getByText('GET')).toBeInTheDocument();
  });

  it('renders POST method', () => {
    const postData = { ...mockData, method: 'POST' as const };
    render(<HttpRequestNode {...baseProps} data={postData} />);
    expect(screen.getByText('POST')).toBeInTheDocument();
  });

  it('renders PUT method', () => {
    const putData = { ...mockData, method: 'PUT' as const };
    render(<HttpRequestNode {...baseProps} data={putData} />);
    expect(screen.getByText('PUT')).toBeInTheDocument();
  });

  it('renders DELETE method', () => {
    const deleteData = { ...mockData, method: 'DELETE' as const };
    render(<HttpRequestNode {...baseProps} data={deleteData} />);
    expect(screen.getByText('DELETE')).toBeInTheDocument();
  });

  it('renders PATCH method', () => {
    const patchData = { ...mockData, method: 'PATCH' as const };
    render(<HttpRequestNode {...baseProps} data={patchData} />);
    expect(screen.getByText('PATCH')).toBeInTheDocument();
  });
});

describe('HttpRequestNode method badge colors', () => {
  it('GET badge has green color class', () => {
    render(<HttpRequestNode {...baseProps} data={mockData} />);
    const badge = screen.getByText('GET').closest('[data-testid="badge"]');
    expect(badge).toHaveClass('bg-green-500/20');
    expect(badge).toHaveClass('text-green-600');
  });

  it('POST badge has blue color class', () => {
    const postData = { ...mockData, method: 'POST' as const };
    render(<HttpRequestNode {...baseProps} data={postData} />);
    const badge = screen.getByText('POST').closest('[data-testid="badge"]');
    expect(badge).toHaveClass('bg-blue-500/20');
    expect(badge).toHaveClass('text-blue-600');
  });

  it('DELETE badge has red color class', () => {
    const deleteData = { ...mockData, method: 'DELETE' as const };
    render(<HttpRequestNode {...baseProps} data={deleteData} />);
    const badge = screen.getByText('DELETE').closest('[data-testid="badge"]');
    expect(badge).toHaveClass('bg-red-500/20');
    expect(badge).toHaveClass('text-red-600');
  });
});

describe('HttpRequestNode URL display', () => {
  it('does not render URL when empty', () => {
    const noUrlData = { ...mockData, url: '' };
    render(<HttpRequestNode {...baseProps} data={noUrlData} />);
    expect(screen.queryByText(/api\.example\.com/)).not.toBeInTheDocument();
  });

  it('truncates long URLs via CSS max-width', () => {
    const longUrlData = {
      ...mockData,
      url: 'https://very-long-domain-name.example.com/very/long/path/that/exceeds/limit',
    };
    render(<HttpRequestNode {...baseProps} data={longUrlData} />);
    const urlElement = screen.getByText(longUrlData.url);
    expect(urlElement).toHaveClass('truncate');
  });
});

describe('HttpRequestNode defaults', () => {
  it('defaults method to GET when not set', () => {
    const noMethodData = { ...mockData, method: undefined as unknown as string };
    render(<HttpRequestNode {...baseProps} data={noMethodData} />);
    expect(screen.getByText('GET')).toBeInTheDocument();
  });
});
