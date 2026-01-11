/**
 * Plugin Conflicts Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PluginConflicts } from './plugin-conflicts';
import { usePluginStore } from '@/stores/plugin';
import { getConflictDetector } from '@/lib/plugin/conflict-detector';

jest.mock('@/stores/plugin', () => ({
  usePluginStore: jest.fn(),
}));

jest.mock('@/lib/plugin/conflict-detector', () => ({
  getConflictDetector: jest.fn(),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3 data-testid="card-title">{children}</h3>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button data-testid="button" onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div data-testid="scroll-area">{children}</div>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="alert" className={className}>{children}</div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div data-testid="alert-description">{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <h4 data-testid="alert-title">{children}</h4>,
}));

const mockPlugins = {
  'plugin-1': {
    manifest: {
      id: 'plugin-1',
      name: 'Test Plugin 1',
      tools: [{ name: 'tool1' }],
    },
    status: 'enabled',
  },
  'plugin-2': {
    manifest: {
      id: 'plugin-2',
      name: 'Test Plugin 2',
      tools: [{ name: 'tool1' }],
    },
    status: 'enabled',
  },
};

const mockConflicts = [
  {
    type: 'command',
    severity: 'warning',
    description: 'Tool name conflict: tool1',
    plugins: ['plugin-1', 'plugin-2'],
    resolution: 'Rename one of the tools',
    autoResolvable: false,
  },
];

const mockDetector = {
  setPlugins: jest.fn(),
  detectAll: jest.fn().mockReturnValue({
    errors: [],
    warnings: mockConflicts,
    info: [],
  }),
};

describe('PluginConflicts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePluginStore as unknown as jest.Mock).mockReturnValue({
      plugins: mockPlugins,
      getEnabledPlugins: () => Object.values(mockPlugins),
      disablePlugin: jest.fn(),
    });
    (getConflictDetector as jest.Mock).mockReturnValue(mockDetector);
  });

  it('should render plugin conflicts title', () => {
    render(<PluginConflicts />);
    
    expect(screen.getByText('Plugin Conflicts')).toBeInTheDocument();
  });

  it('should render refresh button', () => {
    render(<PluginConflicts />);
    
    const buttons = screen.getAllByTestId('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should detect conflicts on mount when autoDetect is true', async () => {
    render(<PluginConflicts autoDetect />);
    
    await waitFor(() => {
      expect(mockDetector.detectAll).toHaveBeenCalled();
    });
  });

  it('should display no conflicts message when there are none', async () => {
    mockDetector.detectAll.mockReturnValue({ errors: [], warnings: [], info: [] });
    
    render(<PluginConflicts />);
    
    await waitFor(() => {
      expect(screen.getByText('No conflicts detected')).toBeInTheDocument();
    });
  });

  it('should display conflict alerts when conflicts exist', async () => {
    render(<PluginConflicts autoDetect />);
    
    await waitFor(() => {
      expect(screen.getByText(/Tool name conflict/)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should show conflict count badge', async () => {
    render(<PluginConflicts />);
    
    await waitFor(() => {
      const badges = screen.getAllByTestId('badge');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  it('should apply custom className', () => {
    const { container } = render(<PluginConflicts className="custom-class" />);
    
    const card = container.querySelector('[data-testid="card"]');
    expect(card).toHaveClass('custom-class');
  });

  it('should refresh conflicts when refresh button is clicked', async () => {
    render(<PluginConflicts />);
    
    const buttons = screen.getAllByTestId('button');
    const refreshButton = buttons.find(b => b.querySelector('svg'));
    if (refreshButton) {
      fireEvent.click(refreshButton);
    }
    
    await waitFor(() => {
      expect(mockDetector.detectAll).toHaveBeenCalled();
    });
  });

  it('should show resolution suggestion for conflicts', async () => {
    render(<PluginConflicts autoDetect />);
    
    await waitFor(() => {
      expect(screen.getByText(/Rename one of the tools/)).toBeInTheDocument();
    }, { timeout: 1000 });
  });
});
