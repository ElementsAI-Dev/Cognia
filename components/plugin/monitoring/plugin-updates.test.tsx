/**
 * Plugin Updates Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PluginUpdates } from './plugin-updates';
import { usePluginStore } from '@/stores/plugin';
import { getPluginUpdater } from '@/lib/plugin';

jest.mock('@/stores/plugin', () => ({
  usePluginStore: jest.fn(),
}));

jest.mock('@/lib/plugin', () => ({
  getPluginUpdater: jest.fn(),
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

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => <div data-testid="progress" data-value={value}>Progress {value}%</div>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div data-testid="scroll-area">{children}</div>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (v: boolean) => void }) => (
    <button data-testid="switch" data-checked={checked} onClick={() => onCheckedChange(!checked)}>Switch</button>
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label data-testid="label" htmlFor={htmlFor}>{children}</label>
  ),
}));

const mockPlugins = {
  'plugin-1': {
    manifest: {
      id: 'plugin-1',
      name: 'Test Plugin 1',
      version: '1.0.0',
    },
    status: 'enabled',
  },
};

const mockUpdates = [
  {
    pluginId: 'plugin-1',
    currentVersion: '1.0.0',
    latestVersion: '2.0.0',
    changelog: 'New features and bug fixes',
    releaseDate: '2024-01-15',
    breaking: false,
  },
];

const mockUpdater = {
  checkForUpdates: jest.fn().mockResolvedValue(mockUpdates),
  update: jest.fn().mockResolvedValue(undefined),
  onProgress: jest.fn(),
  configureAutoUpdate: jest.fn(),
  stopAutoUpdate: jest.fn(),
};

describe('PluginUpdates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePluginStore as unknown as jest.Mock).mockReturnValue({
      plugins: mockPlugins,
      getEnabledPlugins: () => Object.values(mockPlugins),
    });
    (getPluginUpdater as jest.Mock).mockReturnValue(mockUpdater);
  });

  it('should render plugin updates title', () => {
    render(<PluginUpdates />);
    
    expect(screen.getByText('Plugin Updates')).toBeInTheDocument();
  });

  it('should render settings and refresh buttons', () => {
    render(<PluginUpdates />);
    
    const buttons = screen.getAllByTestId('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('should check for updates when autoCheck is true', async () => {
    render(<PluginUpdates autoCheck />);
    
    await waitFor(() => {
      expect(mockUpdater.checkForUpdates).toHaveBeenCalled();
    });
  });

  it('should display available updates', async () => {
    render(<PluginUpdates autoCheck />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Plugin 1')).toBeInTheDocument();
    });
  });

  it('should show version numbers', async () => {
    render(<PluginUpdates autoCheck />);
    
    await waitFor(() => {
      expect(screen.getByText('1.0.0')).toBeInTheDocument();
      expect(screen.getByText('2.0.0')).toBeInTheDocument();
    });
  });

  it('should show all plugins up to date message when no updates', async () => {
    mockUpdater.checkForUpdates.mockResolvedValue([]);
    
    render(<PluginUpdates autoCheck />);
    
    await waitFor(() => {
      expect(screen.getByText('All plugins are up to date')).toBeInTheDocument();
    });
  });

  it('should apply custom className', () => {
    const { container } = render(<PluginUpdates className="custom-class" />);
    
    const card = container.querySelector('[data-testid="card"]');
    expect(card).toHaveClass('custom-class');
  });

  it('should toggle settings panel', () => {
    render(<PluginUpdates />);
    
    const buttons = screen.getAllByTestId('button');
    const settingsButton = buttons[0];
    fireEvent.click(settingsButton);
    
    expect(screen.getByText('Auto-check for updates')).toBeInTheDocument();
  });

  it('should show update all button when multiple updates available', async () => {
    const multipleUpdates = [
      ...mockUpdates,
      {
        pluginId: 'plugin-2',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        changelog: 'Minor update',
        breaking: false,
      },
    ];
    mockUpdater.checkForUpdates.mockResolvedValue(multipleUpdates);

    render(<PluginUpdates autoCheck />);
    
    await waitFor(() => {
      expect(screen.getByText(/Update All/)).toBeInTheDocument();
    });
  });

  it('should show breaking changes section for breaking updates', async () => {
    const breakingUpdates = [
      {
        ...mockUpdates[0],
        breaking: true,
      },
    ];
    mockUpdater.checkForUpdates.mockResolvedValue(breakingUpdates);

    render(<PluginUpdates autoCheck />);
    
    await waitFor(() => {
      expect(screen.getByText('Breaking Changes')).toBeInTheDocument();
    });
  });
});
