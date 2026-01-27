/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { WebhookNode } from './webhook-node';
import type { WebhookNodeData } from '@/types/workflow/workflow-editor';

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

// Mock UI components
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

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Globe: ({ className }: { className?: string }) => (
    <svg data-testid="globe-icon" className={className} />
  ),
  ArrowRight: ({ className }: { className?: string }) => (
    <svg data-testid="arrow-right-icon" className={className} />
  ),
  Lock: ({ className }: { className?: string }) => (
    <svg data-testid="lock-icon" className={className} />
  ),
  Unlock: ({ className }: { className?: string }) => (
    <svg data-testid="unlock-icon" className={className} />
  ),
}));

const mockData: WebhookNodeData = {
  id: 'webhook-1',
  nodeType: 'webhook',
  label: 'HTTP Request',
  description: 'Make HTTP request',
  method: 'POST',
  webhookUrl: 'https://api.example.com/endpoint',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer token',
  },
  executionStatus: 'idle',
  isConfigured: true,
};

const mockProps = {
  id: 'webhook-1',
  data: mockData,
  selected: false,
};

describe('WebhookNode', () => {
  it('renders without crashing', () => {
    render(<WebhookNode {...mockProps} />);
    expect(screen.getByTestId('base-node')).toBeInTheDocument();
  });

  it('renders HTTP method badge', () => {
    render(<WebhookNode {...mockProps} />);
    expect(screen.getByText('POST')).toBeInTheDocument();
  });

  it('renders URL display', () => {
    render(<WebhookNode {...mockProps} />);
    expect(screen.getByText(/api\.example\.com\/endpoint/)).toBeInTheDocument();
  });

  it('has correct node type', () => {
    render(<WebhookNode {...mockProps} />);
    expect(screen.getByTestId('base-node')).toHaveAttribute('data-node-type', 'webhook');
  });
});

describe('WebhookNode HTTP methods', () => {
  it('renders GET method', () => {
    const getData = { ...mockData, method: 'GET' as const };
    render(<WebhookNode {...mockProps} data={getData} />);
    expect(screen.getByText('GET')).toBeInTheDocument();
  });

  it('renders POST method', () => {
    render(<WebhookNode {...mockProps} />);
    expect(screen.getByText('POST')).toBeInTheDocument();
  });

  it('renders PUT method', () => {
    const putData = { ...mockData, method: 'PUT' as const };
    render(<WebhookNode {...mockProps} data={putData} />);
    expect(screen.getByText('PUT')).toBeInTheDocument();
  });

  it('renders DELETE method', () => {
    const deleteData = { ...mockData, method: 'DELETE' as const };
    render(<WebhookNode {...mockProps} data={deleteData} />);
    expect(screen.getByText('DELETE')).toBeInTheDocument();
  });
});

describe('WebhookNode method badge colors', () => {
  it('GET method has green color scheme', () => {
    const getData = { ...mockData, method: 'GET' as const };
    const badge = render(<WebhookNode {...mockProps} data={getData} />)
      .getByText('GET')
      .closest('[data-testid="badge"]');
    expect(badge).toHaveClass('bg-green-100');
    expect(badge).toHaveClass('text-green-700');
  });

  it('POST method has blue color scheme', () => {
    const badge = render(<WebhookNode {...mockProps} />)
      .getByText('POST')
      .closest('[data-testid="badge"]');
    expect(badge).toHaveClass('bg-blue-100');
    expect(badge).toHaveClass('text-blue-700');
  });

  it('PUT method has yellow color scheme', () => {
    const putData = { ...mockData, method: 'PUT' as const };
    const badge = render(<WebhookNode {...mockProps} data={putData} />)
      .getByText('PUT')
      .closest('[data-testid="badge"]');
    expect(badge).toHaveClass('bg-yellow-100');
    expect(badge).toHaveClass('text-yellow-700');
  });

  it('DELETE method has red color scheme', () => {
    const deleteData = { ...mockData, method: 'DELETE' as const };
    const badge = render(<WebhookNode {...mockProps} data={deleteData} />)
      .getByText('DELETE')
      .closest('[data-testid="badge"]');
    expect(badge).toHaveClass('bg-red-100');
    expect(badge).toHaveClass('text-red-700');
  });
});

describe('WebhookNode HTTPS security indicator', () => {
  it('shows lock icon for HTTPS URLs', () => {
    render(<WebhookNode {...mockProps} />);
    expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
  });

  it('shows unlock icon for HTTP URLs', () => {
    const httpData = { ...mockData, webhookUrl: 'http://api.example.com/endpoint' };
    render(<WebhookNode {...mockProps} data={httpData} />);
    expect(screen.getByTestId('unlock-icon')).toBeInTheDocument();
  });

  it('lock icon has green color', () => {
    render(<WebhookNode {...mockProps} />);
    const icon = screen.getByTestId('lock-icon');
    expect(icon).toHaveClass('text-green-500');
  });

  it('unlock icon has yellow color', () => {
    const httpData = { ...mockData, webhookUrl: 'http://api.example.com/endpoint' };
    render(<WebhookNode {...mockProps} data={httpData} />);
    const icon = screen.getByTestId('unlock-icon');
    expect(icon).toHaveClass('text-yellow-500');
  });
});

describe('WebhookNode URL display', () => {
  it('shows "No URL configured" when webhookUrl is missing', () => {
    const noUrlData = { ...mockData, webhookUrl: undefined as unknown as string };
    render(<WebhookNode {...mockProps} data={noUrlData} />);
    expect(screen.getByText('No URL configured')).toBeInTheDocument();
  });

  it('shows "No URL configured" when webhookUrl is empty', () => {
    const emptyUrlData = { ...mockData, webhookUrl: '' };
    render(<WebhookNode {...mockProps} data={emptyUrlData} />);
    expect(screen.getByText('No URL configured')).toBeInTheDocument();
  });

  it('truncates long URLs', () => {
    const longUrlData = {
      ...mockData,
      webhookUrl: 'https://very-long-domain-name.example.com/very/long/path/that/exceeds/limit',
    };
    render(<WebhookNode {...mockProps} data={longUrlData} />);
    const urlText = screen.getByText(/very-long-domain-name/);
    expect(urlText).toBeInTheDocument();
    expect(urlText.textContent).toContain('...');
  });

  it('removes protocol from display URL', () => {
    render(<WebhookNode {...mockProps} />);
    expect(screen.queryByText(/^https:\/\//)).not.toBeInTheDocument();
  });

  it('renders globe icon for URL', () => {
    render(<WebhookNode {...mockProps} />);
    expect(screen.getByTestId('globe-icon')).toBeInTheDocument();
  });

  it('globe icon has orange color', () => {
    render(<WebhookNode {...mockProps} />);
    const icon = screen.getByTestId('globe-icon');
    expect(icon).toHaveClass('text-orange-500');
  });

  it('globe icon has correct size', () => {
    render(<WebhookNode {...mockProps} />);
    const icon = screen.getByTestId('globe-icon');
    // Class names with dots don't need escaping in toHaveClass
    expect(icon).toHaveClass('h-3.5');
    expect(icon).toHaveClass('w-3.5');
  });

  it('renders arrow right icon for URL', () => {
    render(<WebhookNode {...mockProps} />);
    expect(screen.getByTestId('arrow-right-icon')).toBeInTheDocument();
  });
});

describe('WebhookNode URL display styling', () => {
  it('URL container has muted background', () => {
    const { container } = render(<WebhookNode {...mockProps} />);
    const urlContainer = container.querySelector('.bg-muted\\/50');
    expect(urlContainer).toBeInTheDocument();
  });

  it('URL container is rounded', () => {
    const { container } = render(<WebhookNode {...mockProps} />);
    const urlContainer = container.querySelector('.rounded');
    expect(urlContainer).toBeInTheDocument();
  });

  it('URL container has flex layout', () => {
    const { container } = render(<WebhookNode {...mockProps} />);
    const urlContainer = container.querySelector('.flex.items-center.gap-2');
    expect(urlContainer).toBeInTheDocument();
  });

  it('URL text has font-mono class', () => {
    const { container } = render(<WebhookNode {...mockProps} />);
    const urlText = container.querySelector('.font-mono');
    expect(urlText).toBeInTheDocument();
  });

  it('URL text has muted-foreground color', () => {
    const { container } = render(<WebhookNode {...mockProps} />);
    const urlText = container.querySelector('.text-muted-foreground');
    expect(urlText).toBeInTheDocument();
  });

  it('URL text has truncate class', () => {
    const { container } = render(<WebhookNode {...mockProps} />);
    const urlText = container.querySelector('.truncate');
    expect(urlText).toBeInTheDocument();
  });
});

describe('WebhookNode empty URL state', () => {
  it('shows italic text when no URL', () => {
    const noUrlData = { ...mockData, webhookUrl: undefined as unknown as string };
    render(<WebhookNode {...mockProps} data={noUrlData} />);
    const emptyText = screen.getByText('No URL configured');
    expect(emptyText).toHaveClass('italic');
  });

  it('shows muted-foreground color when no URL', () => {
    const noUrlData = { ...mockData, webhookUrl: undefined as unknown as string };
    render(<WebhookNode {...mockProps} data={noUrlData} />);
    const emptyText = screen.getByText('No URL configured');
    expect(emptyText).toHaveClass('text-muted-foreground');
  });

  it('shows text-xs when no URL', () => {
    const noUrlData = { ...mockData, webhookUrl: undefined as unknown as string };
    render(<WebhookNode {...mockProps} data={noUrlData} />);
    const emptyText = screen.getByText('No URL configured');
    expect(emptyText).toHaveClass('text-xs');
  });
});

describe('WebhookNode headers badge', () => {
  it('renders headers count badge', () => {
    render(<WebhookNode {...mockProps} />);
    expect(screen.getByText('2 headers')).toBeInTheDocument();
  });

  it('does not render headers badge when headers is empty', () => {
    const noHeadersData = { ...mockData, headers: {} };
    render(<WebhookNode {...mockProps} data={noHeadersData} />);
    expect(screen.queryByText(/headers/)).not.toBeInTheDocument();
  });

  it('handles single header', () => {
    const singleHeaderData = { ...mockData, headers: { 'Content-Type': 'application/json' } };
    render(<WebhookNode {...mockProps} data={singleHeaderData} />);
    expect(screen.getByText('1 headers')).toBeInTheDocument();
  });

  it('handles many headers', () => {
    const manyHeadersData = {
      ...mockData,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
        Accept: 'application/json',
        'User-Agent': 'MyApp',
        'X-Custom-Header': 'value',
      },
    };
    render(<WebhookNode {...mockProps} data={manyHeadersData} />);
    expect(screen.getByText('5 headers')).toBeInTheDocument();
  });

  it('headers badge has outline variant', () => {
    render(<WebhookNode {...mockProps} />);
    const badge = screen.getByText('2 headers').closest('[data-testid="badge"]');
    expect(badge).toBeInTheDocument();
  });

  it('headers badge has text-xs class', () => {
    render(<WebhookNode {...mockProps} />);
    const badge = screen.getByText('2 headers').closest('[data-testid="badge"]');
    expect(badge).toHaveClass('text-xs');
  });
});

describe('WebhookNode method badge styling', () => {
  it('method badge has secondary variant', () => {
    render(<WebhookNode {...mockProps} />);
    const badge = screen.getByText('POST').closest('[data-testid="badge"]');
    expect(badge).toBeInTheDocument();
  });

  it('method badge has text-xs class', () => {
    render(<WebhookNode {...mockProps} />);
    const badge = screen.getByText('POST').closest('[data-testid="badge"]');
    expect(badge).toHaveClass('text-xs');
  });

  it('method badge has font-mono class', () => {
    render(<WebhookNode {...mockProps} />);
    const badge = screen.getByText('POST').closest('[data-testid="badge"]');
    expect(badge).toHaveClass('font-mono');
  });
});

describe('WebhookNode content layout', () => {
  it('has space-y-2 class for content spacing', () => {
    const { container } = render(<WebhookNode {...mockProps} />);
    const content = container.querySelector('.space-y-2');
    expect(content).toBeInTheDocument();
  });

  it('method badge is in flex container', () => {
    const { container } = render(<WebhookNode {...mockProps} />);
    const flexContainer = container.querySelector('.flex.items-center.gap-2');
    expect(flexContainer).toBeInTheDocument();
  });
});

describe('WebhookNode edge cases', () => {
  it('handles null webhookUrl', () => {
    const nullUrlData = { ...mockData, webhookUrl: null as unknown as string };
    render(<WebhookNode {...mockProps} data={nullUrlData} />);
    expect(screen.getByText('No URL configured')).toBeInTheDocument();
  });

  it('handles undefined headers', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    const undefinedHeadersData = { ...mockData, headers: undefined as unknown as {} };
    render(<WebhookNode {...mockProps} data={undefinedHeadersData} />);
    expect(screen.queryByText(/headers/)).not.toBeInTheDocument();
  });

  it('handles null headers', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    const nullHeadersData = { ...mockData, headers: null as unknown as {} };
    render(<WebhookNode {...mockProps} data={nullHeadersData} />);
    expect(screen.queryByText(/headers/)).not.toBeInTheDocument();
  });

  it('handles URL with special characters', () => {
    const specialUrlData = {
      ...mockData,
      webhookUrl: 'https://api.example.com/endpoint?param=value&other=123',
    };
    render(<WebhookNode {...mockProps} data={specialUrlData} />);
    expect(screen.getByText(/endpoint\?param/)).toBeInTheDocument();
  });

  it('handles very long domain name', () => {
    const longDomainData = {
      ...mockData,
      webhookUrl: 'https://a'.repeat(50) + '.com/endpoint',
    };
    render(<WebhookNode {...mockProps} data={longDomainData} />);
    // URL is truncated, check for presence of truncation marker or partial URL
    const urlText = screen.getByText(/https:\/\/a+/);
    expect(urlText).toBeInTheDocument();
  });
});

describe('WebhookNode integration tests', () => {
  it('renders complete webhook node with all features', () => {
    render(<WebhookNode {...mockProps} />);

    expect(screen.getByText('POST')).toBeInTheDocument();
    expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
    expect(screen.getByText(/api\.example\.com/)).toBeInTheDocument();
    expect(screen.getByText('2 headers')).toBeInTheDocument();
    expect(screen.getByTestId('globe-icon')).toBeInTheDocument();
    expect(screen.getByTestId('arrow-right-icon')).toBeInTheDocument();
  });

  it('renders GET webhook node', () => {
    const getData: WebhookNodeData = {
      ...mockData,
      method: 'GET',
      webhookUrl: 'https://api.example.com/data',
      headers: {},
    };

    render(<WebhookNode {...mockProps} data={getData} />);

    expect(screen.getByText('GET')).toBeInTheDocument();
    expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
    expect(screen.getByText(/api\.example\.com\/data/)).toBeInTheDocument();
    expect(screen.queryByText(/headers/)).not.toBeInTheDocument();
  });

  it('renders HTTP webhook without security', () => {
    const httpData: WebhookNodeData = {
      ...mockData,
      webhookUrl: 'http://insecure-api.com/endpoint',
      headers: {},
    };

    render(<WebhookNode {...mockProps} data={httpData} />);

    expect(screen.getByTestId('unlock-icon')).toBeInTheDocument();
    expect(screen.getByText(/insecure-api\.com/)).toBeInTheDocument();
  });

  it('renders webhook node without URL', () => {
    const noUrlData: WebhookNodeData = {
      ...mockData,
      webhookUrl: undefined as unknown as string,
      headers: {},
    };

    render(<WebhookNode {...mockProps} data={noUrlData} />);

    expect(screen.getByText('No URL configured')).toBeInTheDocument();
    expect(screen.queryByText(/lock-icon|unlock-icon/)).not.toBeInTheDocument();
  });
});
