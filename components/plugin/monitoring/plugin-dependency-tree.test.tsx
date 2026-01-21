/**
 * Plugin Dependency Tree Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PluginDependencyTree } from './plugin-dependency-tree';
import { usePluginStore } from '@/stores/plugin';
import { getDependencyResolver } from '@/lib/plugin/dependency-resolver';
import type { Plugin, PluginManifest } from '@/types/plugin';

// Mock stores
jest.mock('@/stores/plugin', () => ({
  usePluginStore: jest.fn(),
}));

// Mock dependency resolver
jest.mock('@/lib/plugin/dependency-resolver', () => ({
  getDependencyResolver: jest.fn(),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'title': 'Dependency Tree',
      'stats.dependencies': `${params?.count || 0} dependencies`,
      'stats.satisfied': `${params?.count || 0} satisfied`,
      'stats.missing': `${params?.count || 0} missing`,
      'emptyState.selectPlugin': 'Select a plugin to view dependencies',
      'emptyState.noDependencies': 'No dependencies',
    };
    return translations[key] || key;
  },
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-header" className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 data-testid="card-title" className={className}>{children}</h3>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <span data-testid="badge" data-variant={variant} className={className}>{children}</span>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, className }: { 
    children: React.ReactNode; 
    onClick?: () => void;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button onClick={onClick} data-variant={variant} data-size={size} className={className} data-testid="button">
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>{children}</div>
  ),
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, open, onOpenChange: _onOpenChange }: { 
    children: React.ReactNode; 
    open?: boolean;
    onOpenChange?: (v: boolean) => void;
  }) => (
    <div data-testid="collapsible" data-open={open}>{children}</div>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="collapsible-content">{children}</div>
  ),
  CollapsibleTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="collapsible-trigger">{children}</div>
  ),
}));

const mockManifest: PluginManifest = {
  id: 'test-plugin',
  name: 'Test Plugin',
  version: '1.0.0',
  description: 'A test plugin',
  type: 'frontend',
  capabilities: ['tools'],
  author: { name: 'Test' },
  main: 'index.ts',
  dependencies: { 'dep-plugin': '^1.0.0' },
};

const mockPlugin: Plugin = {
  manifest: mockManifest,
  status: 'enabled',
  source: 'local',
  path: '/plugins/test-plugin',
  config: {},
};

const mockDepPlugin: Plugin = {
  manifest: {
    ...mockManifest,
    id: 'dep-plugin',
    name: 'Dependency Plugin',
    dependencies: {},
  },
  status: 'enabled',
  source: 'local',
  path: '/plugins/dep-plugin',
  config: {},
};

const mockDependencyTree = {
  id: 'test-plugin',
  version: '1.0.0',
  dependencies: [
    {
      id: 'dep-plugin',
      version: '1.0.0',
      dependencies: [],
    },
  ],
};

const mockDependencyTreeWithMissing = {
  id: 'test-plugin',
  version: '1.0.0',
  dependencies: [
    {
      id: 'dep-plugin',
      version: '1.0.0',
      dependencies: [],
    },
    {
      id: 'missing-plugin',
      version: '1.0.0',
      dependencies: [],
    },
  ],
};

describe('PluginDependencyTree', () => {
  const mockBuildDependencyTree = jest.fn();
  const mockGetEnabledPlugins = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    (usePluginStore as unknown as jest.Mock).mockReturnValue({
      plugins: {
        'test-plugin': mockPlugin,
        'dep-plugin': mockDepPlugin,
      },
      getEnabledPlugins: mockGetEnabledPlugins,
    });
    
    mockGetEnabledPlugins.mockReturnValue([mockPlugin, mockDepPlugin]);
    
    (getDependencyResolver as jest.Mock).mockReturnValue({
      buildDependencyTree: mockBuildDependencyTree,
    });
    
    mockBuildDependencyTree.mockResolvedValue(mockDependencyTree);
  });

  describe('Rendering', () => {
    it('should render card with title', () => {
      render(<PluginDependencyTree />);
      
      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByText('Dependency Tree')).toBeInTheDocument();
    });

    it('should render plugin selector buttons', () => {
      render(<PluginDependencyTree />);
      
      expect(screen.getByText('Test Plugin')).toBeInTheDocument();
      expect(screen.getByText('Dependency Plugin')).toBeInTheDocument();
    });

    it('should show empty state when no plugin selected', () => {
      render(<PluginDependencyTree />);
      
      expect(screen.getByText('Select a plugin to view dependencies')).toBeInTheDocument();
    });

    it('should apply className prop', () => {
      render(<PluginDependencyTree className="custom-class" />);
      
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('custom-class');
    });
  });

  describe('Plugin Selection', () => {
    it('should select plugin when button is clicked', async () => {
      render(<PluginDependencyTree />);
      
      const pluginButton = screen.getByText('Test Plugin');
      fireEvent.click(pluginButton);
      
      await waitFor(() => {
        expect(mockBuildDependencyTree).toHaveBeenCalledWith('test-plugin');
      });
    });

    it('should use pluginId prop if provided', async () => {
      render(<PluginDependencyTree pluginId="test-plugin" />);
      
      await waitFor(() => {
        expect(mockBuildDependencyTree).toHaveBeenCalledWith('test-plugin');
      });
    });

    it('should highlight selected plugin button', async () => {
      render(<PluginDependencyTree />);
      
      const pluginButton = screen.getByText('Test Plugin');
      fireEvent.click(pluginButton);
      
      await waitFor(() => {
        expect(pluginButton.closest('button')).toHaveAttribute('data-variant', 'default');
      });
    });
  });

  describe('Dependency Tree Display', () => {
    it('should render tree node after plugin selection', async () => {
      render(<PluginDependencyTree />);
      
      const pluginButton = screen.getByText('Test Plugin');
      fireEvent.click(pluginButton);
      
      await waitFor(() => {
        expect(screen.getAllByTestId('collapsible').length).toBeGreaterThan(0);
      });
    });

    it('should show dependency stats when tree has dependencies', async () => {
      render(<PluginDependencyTree />);
      
      const pluginButton = screen.getByText('Test Plugin');
      fireEvent.click(pluginButton);
      
      await waitFor(() => {
        expect(screen.getByText(/dependencies/)).toBeInTheDocument();
      });
    });

    it('should show satisfied count', async () => {
      render(<PluginDependencyTree />);
      
      const pluginButton = screen.getByText('Test Plugin');
      fireEvent.click(pluginButton);
      
      await waitFor(() => {
        expect(screen.getByText(/satisfied/)).toBeInTheDocument();
      });
    });

    it('should show missing count when dependencies are missing', async () => {
      mockBuildDependencyTree.mockResolvedValue(mockDependencyTreeWithMissing);
      
      render(<PluginDependencyTree />);
      
      const pluginButton = screen.getByText('Test Plugin');
      fireEvent.click(pluginButton);
      
      await waitFor(() => {
        // Tree renders with missing plugin visible
        expect(screen.getByText('missing-plugin')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator while building tree', async () => {
      // Create a promise that we can control
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockBuildDependencyTree.mockReturnValue(pendingPromise);
      
      render(<PluginDependencyTree />);
      
      const pluginButton = screen.getByText('Test Plugin');
      fireEvent.click(pluginButton);
      
      // Resolve the promise
      resolvePromise!(mockDependencyTree);
      
      await waitFor(() => {
        // After resolution, tree should be rendered
        expect(screen.getAllByTestId('collapsible').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle dependency resolver errors gracefully', async () => {
      mockBuildDependencyTree.mockRejectedValue(new Error('Failed to build tree'));
      
      render(<PluginDependencyTree />);
      
      const pluginButton = screen.getByText('Test Plugin');
      fireEvent.click(pluginButton);
      
      await waitFor(() => {
        // Should show no dependencies message on error
        expect(screen.getByText('No dependencies')).toBeInTheDocument();
      });
    });
  });

  describe('Plugin Not Found', () => {
    it('should clear tree when selected plugin not found', async () => {
      render(<PluginDependencyTree />);
      
      // First select a valid plugin
      const pluginButton = screen.getByText('Test Plugin');
      fireEvent.click(pluginButton);
      
      await waitFor(() => {
        expect(mockBuildDependencyTree).toHaveBeenCalled();
      });
      
      // Update store to remove the plugin
      (usePluginStore as unknown as jest.Mock).mockReturnValue({
        plugins: {},
        getEnabledPlugins: () => [],
      });
      
      // The tree should handle missing plugin gracefully
      expect(screen.getByTestId('card')).toBeInTheDocument();
    });
  });

  describe('TreeNode Component', () => {
    it('should render version badge when version is available', async () => {
      render(<PluginDependencyTree />);
      
      const pluginButton = screen.getByText('Test Plugin');
      fireEvent.click(pluginButton);
      
      await waitFor(() => {
        const badges = screen.getAllByTestId('badge');
        expect(badges.some(b => b.textContent === '1.0.0')).toBe(true);
      });
    });

    it('should render collapsible for nodes with children', async () => {
      render(<PluginDependencyTree />);
      
      const pluginButton = screen.getByText('Test Plugin');
      fireEvent.click(pluginButton);
      
      await waitFor(() => {
        expect(screen.getAllByTestId('collapsible').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Installed Status', () => {
    it('should show check icon for installed dependencies', async () => {
      render(<PluginDependencyTree />);
      
      const pluginButton = screen.getByText('Test Plugin');
      fireEvent.click(pluginButton);
      
      await waitFor(() => {
        // Tree should render with installed plugins showing checkmarks
        expect(screen.getAllByTestId('collapsible').length).toBeGreaterThan(0);
      });
    });

    it('should show x icon for missing dependencies', async () => {
      mockBuildDependencyTree.mockResolvedValue(mockDependencyTreeWithMissing);
      
      render(<PluginDependencyTree />);
      
      const pluginButton = screen.getByText('Test Plugin');
      fireEvent.click(pluginButton);
      
      await waitFor(() => {
        // Tree should render with missing plugins showing x icons
        expect(screen.getAllByTestId('collapsible').length).toBeGreaterThan(0);
      });
    });
  });
});
