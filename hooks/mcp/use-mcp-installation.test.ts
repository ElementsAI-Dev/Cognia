/**
 * Tests for useMcpInstallation hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useMcpInstallation } from './use-mcp-installation';
import { useMcpMarketplaceStore, useMcpStore } from '@/stores/mcp';
import { parseInstallationConfig } from '@/lib/mcp/marketplace';
import { checkMcpEnvironment } from '@/lib/mcp/marketplace-utils';
import type { McpMarketplaceItem, McpDownloadResponse } from '@/types/mcp/mcp-marketplace';
import type { McpServerConfig } from '@/types/mcp';
import type { EnvironmentCheckResult } from '@/lib/mcp/marketplace-utils';

// Mock stores and utilities
jest.mock('@/stores/mcp', () => ({
  useMcpMarketplaceStore: jest.fn(),
  useMcpStore: jest.fn(),
}));

jest.mock('@/lib/mcp/marketplace', () => ({
  parseInstallationConfig: jest.fn(),
}));

jest.mock('@/lib/mcp/marketplace-utils', () => ({
  checkMcpEnvironment: jest.fn(),
}));

const mockUseMcpMarketplaceStore = useMcpMarketplaceStore as jest.MockedFunction<typeof useMcpMarketplaceStore>;
const mockUseMcpStore = useMcpStore as jest.MockedFunction<typeof useMcpStore>;
const mockParseInstallationConfig = parseInstallationConfig as jest.MockedFunction<typeof parseInstallationConfig>;
const mockCheckMcpEnvironment = checkMcpEnvironment as jest.MockedFunction<typeof checkMcpEnvironment>;

describe('useMcpInstallation', () => {
  const mockItem: McpMarketplaceItem = {
    mcpId: 'test-mcp',
    name: 'Test MCP Server',
    author: 'Test Author',
    description: 'A test MCP server',
    githubUrl: 'https://github.com/test/mcp',
    githubStars: 100,
    downloadCount: 1000,
    tags: ['test'],
    source: 'cline',
    verified: false,
    requiresApiKey: false,
    remote: false,
  };

  const mockDownloadResponse: McpDownloadResponse = {
    mcpId: 'test-mcp',
    githubUrl: 'https://github.com/test/mcp',
    name: 'Test MCP Server',
    author: 'Test Author',
    description: 'A test MCP server',
    readmeContent: '# Test MCP Server\n\nThis is a test MCP server.',
    requiresApiKey: false,
  };

  const mockEnvCheckResult: EnvironmentCheckResult = {
    supported: true,
    hasNode: true,
    hasNpx: true,
    missingDeps: [],
    message: 'Environment ready',
  };

  const createMockMarketplaceStore = (overrides: Record<string, unknown> = {}) => ({
    downloadDetails: mockDownloadResponse,
    isLoadingDetails: false,
    fetchItemDetails: jest.fn(),
    setInstallStatus: jest.fn(),
    getInstallStatus: jest.fn().mockReturnValue('not_installed'),
    ...overrides,
  });

  const createMockMcpStore = (overrides: Record<string, unknown> = {}) => ({
    addServer: jest.fn(),
    servers: [],
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockParseInstallationConfig.mockReturnValue({
      name: 'Test MCP Server',
      command: 'npx',
      args: ['test-mcp'],
      env: {},
      connectionType: 'stdio' as const,
      url: '',
      enabled: true,
      autoStart: false,
    } as McpServerConfig);
    mockCheckMcpEnvironment.mockResolvedValue(mockEnvCheckResult);
  });

  describe('initial state', () => {
    it('should initialize with default values', () => {
      mockUseMcpMarketplaceStore.mockReturnValue(createMockMarketplaceStore());
      mockUseMcpStore.mockReturnValue(createMockMcpStore());

      const { result } = renderHook(() => 
        useMcpInstallation({ item: null, isOpen: false })
      );

      expect(result.current.isInstalling).toBe(false);
      expect(result.current.installError).toBeNull();
      expect(result.current.envValues).toEqual({});
      expect(result.current.envCheck).toBeNull();
      expect(result.current.isCheckingEnv).toBe(false);
      expect(result.current.installConfig).toBeNull();
      expect(result.current.isCurrentlyInstalled).toBe(false);
      expect(typeof result.current.setEnvValue).toBe('function');
      expect(typeof result.current.setEnvValues).toBe('function');
      expect(typeof result.current.handleInstall).toBe('function');
      expect(typeof result.current.resetInstallation).toBe('function');
    });
  });

  describe('environment checking', () => {
    it('should check environment when dialog opens for stdio connections', async () => {
      const stdioItem = { ...mockItem, remote: false };
      mockUseMcpMarketplaceStore.mockReturnValue(createMockMarketplaceStore());
      mockUseMcpStore.mockReturnValue(createMockMcpStore());

      const { result } = renderHook(() => 
        useMcpInstallation({ item: stdioItem, isOpen: true })
      );

      await waitFor(() => {
        expect(result.current.envCheck).toEqual(mockEnvCheckResult);
      });

      expect(mockCheckMcpEnvironment).toHaveBeenCalledTimes(1);
    });

    it('should not check environment when item is remote', () => {
      const remoteItem = { ...mockItem, remote: true };
      mockUseMcpMarketplaceStore.mockReturnValue(createMockMarketplaceStore());
      mockUseMcpStore.mockReturnValue(createMockMcpStore());

      renderHook(() => 
        useMcpInstallation({ item: remoteItem, isOpen: true })
      );

      expect(mockCheckMcpEnvironment).not.toHaveBeenCalled();
    });

    it('should not check environment when item is null', () => {
      mockUseMcpMarketplaceStore.mockReturnValue(createMockMarketplaceStore());
      mockUseMcpStore.mockReturnValue(createMockMcpStore());

      renderHook(() => 
        useMcpInstallation({ item: null, isOpen: true })
      );

      expect(mockCheckMcpEnvironment).not.toHaveBeenCalled();
    });
  });

  describe('installation status', () => {
    it('should check if item is installed', () => {
      const mockGetInstallStatus = jest.fn().mockReturnValue('installed');
      mockUseMcpMarketplaceStore.mockReturnValue(createMockMarketplaceStore({
        getInstallStatus: mockGetInstallStatus,
      }));
      mockUseMcpStore.mockReturnValue(createMockMcpStore());

      const { result } = renderHook(() => 
        useMcpInstallation({ item: mockItem, isOpen: false })
      );

      expect(result.current.isCurrentlyInstalled).toBe(true);
      expect(mockGetInstallStatus).toHaveBeenCalledWith(mockItem.mcpId);
    });

    it('should return false when item is not installed', () => {
      const mockGetInstallStatus = jest.fn().mockReturnValue('not_installed');
      mockUseMcpMarketplaceStore.mockReturnValue(createMockMarketplaceStore({
        getInstallStatus: mockGetInstallStatus,
      }));
      mockUseMcpStore.mockReturnValue(createMockMcpStore());

      const { result } = renderHook(() => 
        useMcpInstallation({ item: mockItem, isOpen: false })
      );

      expect(result.current.isCurrentlyInstalled).toBe(false);
    });
  });

  describe('environment values', () => {
    it('should set individual environment values', () => {
      mockUseMcpMarketplaceStore.mockReturnValue(createMockMarketplaceStore());
      mockUseMcpStore.mockReturnValue(createMockMcpStore());

      const { result } = renderHook(() => 
        useMcpInstallation({ item: mockItem, isOpen: false })
      );

      act(() => {
        result.current.setEnvValue('API_KEY', 'secret-key');
      });

      expect(result.current.envValues).toEqual({ API_KEY: 'secret-key' });
    });

    it('should set multiple environment values', () => {
      mockUseMcpMarketplaceStore.mockReturnValue(createMockMarketplaceStore());
      mockUseMcpStore.mockReturnValue(createMockMcpStore());

      const { result } = renderHook(() => 
        useMcpInstallation({ item: mockItem, isOpen: false })
      );

      const envValues = { API_KEY: 'secret-key', DATABASE_URL: 'localhost:5432' };

      act(() => {
        result.current.setEnvValues(envValues);
      });

      expect(result.current.envValues).toEqual(envValues);
    });
  });

  describe('handleInstall', () => {
    it('should install successfully', async () => {
      const mockSetInstallStatus = jest.fn();
      const mockAddServer = jest.fn();
      const onSuccess = jest.fn();

      mockUseMcpMarketplaceStore.mockReturnValue(createMockMarketplaceStore({
        setInstallStatus: mockSetInstallStatus,
      }));
      mockUseMcpStore.mockReturnValue(createMockMcpStore({
        addServer: mockAddServer,
      }));

      const { result } = renderHook(() => 
        useMcpInstallation({ item: mockItem, isOpen: true, onSuccess })
      );

      await act(async () => {
        await result.current.handleInstall();
      });

      expect(mockSetInstallStatus).toHaveBeenCalledWith(mockItem.mcpId, 'installing');
      expect(mockParseInstallationConfig).toHaveBeenCalledWith(mockItem, mockDownloadResponse);
      expect(mockAddServer).toHaveBeenCalledWith(mockItem.mcpId, expect.any(Object));
      expect(mockSetInstallStatus).toHaveBeenCalledWith(mockItem.mcpId, 'installed');
      expect(onSuccess).toHaveBeenCalled();
      expect(result.current.isInstalling).toBe(false);
      expect(result.current.installError).toBeNull();
    });

    it('should handle installation failure', async () => {
      const errorMessage = 'Installation failed';
      const mockSetInstallStatus = jest.fn();
      const mockAddServer = jest.fn().mockRejectedValue(new Error(errorMessage));
      const onError = jest.fn();

      mockUseMcpMarketplaceStore.mockReturnValue(createMockMarketplaceStore({
        setInstallStatus: mockSetInstallStatus,
      }));
      mockUseMcpStore.mockReturnValue(createMockMcpStore({
        addServer: mockAddServer,
      }));

      const { result } = renderHook(() => 
        useMcpInstallation({ item: mockItem, isOpen: true, onError })
      );

      await act(async () => {
        await result.current.handleInstall();
      });

      expect(result.current.isInstalling).toBe(false);
      expect(result.current.installError).toBe(errorMessage);
      expect(mockSetInstallStatus).toHaveBeenCalledWith(mockItem.mcpId, 'error', errorMessage);
    });

    it('should not install if already installed', async () => {
      const mockSetInstallStatus = jest.fn();
      const mockGetInstallStatus = jest.fn().mockReturnValue('installed');

      mockUseMcpMarketplaceStore.mockReturnValue(createMockMarketplaceStore({
        setInstallStatus: mockSetInstallStatus,
        getInstallStatus: mockGetInstallStatus,
      }));
      mockUseMcpStore.mockReturnValue(createMockMcpStore());

      const { result } = renderHook(() => 
        useMcpInstallation({ item: mockItem, isOpen: true })
      );

      await act(async () => {
        await result.current.handleInstall();
      });

      // Should still call setInstallStatus with 'installing' first, then handle the already installed case
      expect(mockSetInstallStatus).toHaveBeenCalledWith(mockItem.mcpId, 'installing');
      expect(mockSetInstallStatus).toHaveBeenCalledWith(mockItem.mcpId, 'installed');
    });

    it('should set loading state during installation', async () => {
      let resolveAdd: (value: void) => void;
      const addPromise = new Promise<void>((resolve) => {
        resolveAdd = resolve;
      });
      const mockSetInstallStatus = jest.fn();
      const mockAddServer = jest.fn().mockReturnValue(addPromise);

      mockUseMcpMarketplaceStore.mockReturnValue(createMockMarketplaceStore({
        setInstallStatus: mockSetInstallStatus,
      }));
      mockUseMcpStore.mockReturnValue(createMockMcpStore({
        addServer: mockAddServer,
      }));

      const { result } = renderHook(() => 
        useMcpInstallation({ item: mockItem, isOpen: true })
      );

      act(() => {
        result.current.handleInstall();
      });

      expect(result.current.isInstalling).toBe(true);

      await act(async () => {
        resolveAdd!();
        await addPromise;
      });

      expect(result.current.isInstalling).toBe(false);
    });
  });

  describe('resetInstallation', () => {
    it('should reset installation state', () => {
      mockUseMcpMarketplaceStore.mockReturnValue(createMockMarketplaceStore());
      mockUseMcpStore.mockReturnValue(createMockMcpStore());

      const { result } = renderHook(() => 
        useMcpInstallation({ item: mockItem, isOpen: false })
      );

      // Set some state first
      act(() => {
        result.current.setEnvValues({ API_KEY: 'test' });
      });

      expect(result.current.envValues).toEqual({ API_KEY: 'test' });

      act(() => {
        result.current.resetInstallation();
      });

      expect(result.current.envValues).toEqual({});
      expect(result.current.installError).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle null item gracefully', () => {
      mockUseMcpMarketplaceStore.mockReturnValue(createMockMarketplaceStore());
      mockUseMcpStore.mockReturnValue(createMockMcpStore());

      const { result } = renderHook(() => 
        useMcpInstallation({ item: null, isOpen: true })
      );

      expect(result.current.isCurrentlyInstalled).toBe(false);

      act(() => {
        result.current.handleInstall();
      });

      // Should not set error when item is null - just returns early
      expect(result.current.installError).toBeNull();
    });

    it('should handle missing download details gracefully', () => {
      mockUseMcpMarketplaceStore.mockReturnValue(createMockMarketplaceStore({
        downloadDetails: null,
      }));
      mockUseMcpStore.mockReturnValue(createMockMcpStore());

      const { result } = renderHook(() => 
        useMcpInstallation({ item: mockItem, isOpen: true })
      );

      act(() => {
        result.current.handleInstall();
      });

      // Should use default config when no download details available
      expect(result.current.installError).toBeNull();
    });
  });
});
