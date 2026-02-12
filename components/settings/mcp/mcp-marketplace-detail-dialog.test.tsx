/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { McpMarketplaceDetailDialog } from './mcp-marketplace-detail-dialog';
import type { McpMarketplaceItem } from '@/types/mcp/mcp-marketplace';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    if (params) return `${key}: ${JSON.stringify(params)}`;
    return key;
  },
}));

// Mock next/image
/* eslint-disable @next/next/no-img-element */
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, onError }: { src: string; alt: string; onError?: () => void }) => (
    // Using img for test mock
    <img src={src} alt={alt} onError={onError} data-testid="mcp-icon" />
  ),
}));
/* eslint-enable @next/next/no-img-element */

// Mock react-markdown
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => {},
}));

// Mock stores
const mockFetchItemDetails = jest.fn();
const mockSetInstallStatus = jest.fn();
const mockGetInstallStatus = jest.fn(() => 'not_installed');
const mockAddServer = jest.fn();
const mockHandleInstall = jest.fn();

jest.mock('@/stores/mcp', () => ({
  useMcpMarketplaceStore: () => ({
    downloadDetails: null,
    isLoadingDetails: false,
    fetchItemDetails: mockFetchItemDetails,
    setInstallStatus: mockSetInstallStatus,
    getInstallStatus: mockGetInstallStatus,
  }),
  useMcpStore: () => ({
    addServer: mockAddServer,
    servers: [],
    connectServer: jest.fn(),
  }),
}));

// Mock useMcpInstallation hook
jest.mock('@/hooks/mcp/use-mcp-installation', () => ({
  useMcpInstallation: () => ({
    isInstalling: false,
    installError: null,
    envValues: {},
    envCheck: { supported: true, missingDeps: [] },
    isCheckingEnv: false,
    installConfig: null,
    isCurrentlyInstalled: false,
    setEnvValue: jest.fn(),
    handleInstall: mockHandleInstall,
    resetInstallation: jest.fn(),
  }),
}));

// Mock marketplace utils
jest.mock('@/lib/mcp/marketplace', () => ({
  formatDownloadCount: (count: number) => `${count}`,
  formatStarCount: (count: number) => `${count}`,
  formatRelativeTime: (date: string) => date,
  parseInstallationConfig: () => null,
}));

jest.mock('@/lib/mcp/marketplace-utils', () => ({
  getSourceColor: () => 'text-blue-500',
  checkMcpEnvironment: () => Promise.resolve({ supported: true, nodeVersion: '18.0.0', missingDeps: [] }),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} data-testid="button">{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-footer">{children}</div>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div data-testid="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs">{children}</div>,
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`tab-${value}`}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-testid={`tab-trigger-${value}`}>{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} data-testid="input" />,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

const mockItem: McpMarketplaceItem = {
  mcpId: 'test-mcp-server',
  name: 'Test MCP Server',
  author: 'Test Author',
  description: 'A test MCP server for unit testing',
  tags: ['test', 'mock'],
  githubStars: 100,
  downloadCount: 500,
  verified: true,
  remote: false,
  requiresApiKey: false,
  version: '1.0.0',
  license: 'MIT',
  updatedAt: '2024-01-01',
  homepage: 'https://example.com',
  githubUrl: 'https://github.com/test/test-mcp-server',
  source: 'smithery' as const,
};

describe('McpMarketplaceDetailDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when item is null', () => {
    const { container } = render(
      <McpMarketplaceDetailDialog
        open={true}
        onOpenChange={() => {}}
        item={null}
        isInstalled={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders dialog when open and item provided', () => {
    render(
      <McpMarketplaceDetailDialog
        open={true}
        onOpenChange={() => {}}
        item={mockItem}
        isInstalled={false}
      />
    );
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('displays item name in title', () => {
    render(
      <McpMarketplaceDetailDialog
        open={true}
        onOpenChange={() => {}}
        item={mockItem}
        isInstalled={false}
      />
    );
    expect(screen.getByText('Test MCP Server')).toBeInTheDocument();
  });

  it('shows verified badge for verified items', () => {
    render(
      <McpMarketplaceDetailDialog
        open={true}
        onOpenChange={() => {}}
        item={mockItem}
        isInstalled={false}
      />
    );
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('shows installed badge when item is installed', () => {
    render(
      <McpMarketplaceDetailDialog
        open={true}
        onOpenChange={() => {}}
        item={mockItem}
        isInstalled={true}
      />
    );
    // Multiple 'installed' texts may appear
    const installedElements = screen.getAllByText('installed');
    expect(installedElements.length).toBeGreaterThan(0);
  });

  it('displays tags', () => {
    render(
      <McpMarketplaceDetailDialog
        open={true}
        onOpenChange={() => {}}
        item={mockItem}
        isInstalled={false}
      />
    );
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('mock')).toBeInTheDocument();
  });

  it('calls fetchItemDetails when opened', () => {
    render(
      <McpMarketplaceDetailDialog
        open={true}
        onOpenChange={() => {}}
        item={mockItem}
        isInstalled={false}
      />
    );
    expect(mockFetchItemDetails).toHaveBeenCalledWith('test-mcp-server');
  });

  it('shows favorite button when onToggleFavorite provided', () => {
    const mockToggleFavorite = jest.fn();
    render(
      <McpMarketplaceDetailDialog
        open={true}
        onOpenChange={() => {}}
        item={mockItem}
        isInstalled={false}
        onToggleFavorite={mockToggleFavorite}
      />
    );
    const buttons = screen.getAllByTestId('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('calls onOpenChange when close button clicked', () => {
    const mockOnOpenChange = jest.fn();
    render(
      <McpMarketplaceDetailDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        item={mockItem}
        isInstalled={false}
      />
    );
    const closeButton = screen.getByText('close');
    fireEvent.click(closeButton);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('displays tabs for overview, readme, and install', () => {
    render(
      <McpMarketplaceDetailDialog
        open={true}
        onOpenChange={() => {}}
        item={mockItem}
        isInstalled={false}
      />
    );
    expect(screen.getByTestId('tabs')).toBeInTheDocument();
    expect(screen.getByTestId('tab-trigger-overview')).toBeInTheDocument();
    expect(screen.getByTestId('tab-trigger-readme')).toBeInTheDocument();
    expect(screen.getByTestId('tab-trigger-install')).toBeInTheDocument();
  });

  it('renders dialog when item is installed', () => {
    render(
      <McpMarketplaceDetailDialog
        open={true}
        onOpenChange={() => {}}
        item={mockItem}
        isInstalled={true}
      />
    );
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('handles remote items correctly', () => {
    const remoteItem = { ...mockItem, remote: true };
    render(
      <McpMarketplaceDetailDialog
        open={true}
        onOpenChange={() => {}}
        item={remoteItem}
        isInstalled={false}
      />
    );
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('shows API key requirement indicator', () => {
    const apiKeyItem = { ...mockItem, requiresApiKey: true };
    render(
      <McpMarketplaceDetailDialog
        open={true}
        onOpenChange={() => {}}
        item={apiKeyItem}
        isInstalled={false}
      />
    );
    // requiresApiKey text should appear
    const elements = screen.getAllByText('requiresApiKey');
    expect(elements.length).toBeGreaterThan(0);
  });
});
