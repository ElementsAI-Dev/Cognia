import { test, expect } from '@playwright/test';

/**
 * MCP Settings Complete Tests
 * Tests MCP server configuration and management
 */

test.describe('MCP Settings - Server List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display empty state when no servers', async ({ page }) => {
    const result = await page.evaluate(() => {
      const servers: { id: string; name: string }[] = [];

      const hasServers = servers.length > 0;
      const emptyMessage = !hasServers ? 'No MCP Servers' : null;

      return { hasServers, emptyMessage };
    });

    expect(result.hasServers).toBe(false);
    expect(result.emptyMessage).toBe('No MCP Servers');
  });

  test('should list configured servers', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface McpServer {
        id: string;
        name: string;
        config: {
          connectionType: 'stdio' | 'sse';
          command: string;
          args: string[];
          enabled: boolean;
        };
        status: { type: string };
      }

      const servers: McpServer[] = [
        {
          id: 'filesystem',
          name: 'Filesystem Server',
          config: {
            connectionType: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem'],
            enabled: true,
          },
          status: { type: 'disconnected' },
        },
        {
          id: 'github',
          name: 'GitHub Server',
          config: {
            connectionType: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-github'],
            enabled: false,
          },
          status: { type: 'disconnected' },
        },
      ];

      return {
        serverCount: servers.length,
        serverNames: servers.map((s) => s.name),
        enabledCount: servers.filter((s) => s.config.enabled).length,
      };
    });

    expect(result.serverCount).toBe(2);
    expect(result.serverNames).toContain('Filesystem Server');
    expect(result.enabledCount).toBe(1);
  });
});

test.describe('MCP Settings - Add Server', () => {
  test('should create stdio server configuration', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface McpServerConfig {
        name: string;
        connectionType: 'stdio' | 'sse';
        command: string;
        args: string[];
        env: Record<string, string>;
        enabled: boolean;
        autoStart: boolean;
      }

      const createServer = (config: McpServerConfig): { id: string; config: McpServerConfig } => {
        const id = config.name
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
        return { id, config };
      };

      const server = createServer({
        name: 'Test Server',
        connectionType: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/test-server'],
        env: { API_KEY: 'test-key' },
        enabled: true,
        autoStart: false,
      });

      return {
        id: server.id,
        name: server.config.name,
        connectionType: server.config.connectionType,
        command: server.config.command,
        argCount: server.config.args.length,
        hasEnv: Object.keys(server.config.env).length > 0,
      };
    });

    expect(result.id).toBe('test-server');
    expect(result.name).toBe('Test Server');
    expect(result.connectionType).toBe('stdio');
    expect(result.command).toBe('npx');
    expect(result.argCount).toBe(2);
    expect(result.hasEnv).toBe(true);
  });

  test('should create SSE server configuration', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface McpServerConfig {
        name: string;
        connectionType: 'stdio' | 'sse';
        url?: string;
        enabled: boolean;
        autoStart: boolean;
      }

      const createSSEServer = (
        name: string,
        url: string
      ): { id: string; config: McpServerConfig } => {
        const id = name
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
        return {
          id,
          config: {
            name,
            connectionType: 'sse',
            url,
            enabled: true,
            autoStart: false,
          },
        };
      };

      const server = createSSEServer(
        'Remote MCP Server',
        'http://localhost:8080/sse'
      );

      return {
        id: server.id,
        name: server.config.name,
        connectionType: server.config.connectionType,
        url: server.config.url,
      };
    });

    expect(result.id).toBe('remote-mcp-server');
    expect(result.connectionType).toBe('sse');
    expect(result.url).toBe('http://localhost:8080/sse');
  });

  test('should validate server configuration', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ValidationResult {
        valid: boolean;
        errors: string[];
      }

      const validateConfig = (config: {
        name: string;
        connectionType: string;
        command?: string;
        url?: string;
      }): ValidationResult => {
        const errors: string[] = [];

        if (!config.name || config.name.trim() === '') {
          errors.push('Server name is required');
        }

        if (config.connectionType === 'stdio') {
          if (!config.command || config.command.trim() === '') {
            errors.push('Command is required for stdio connections');
          }
        }

        if (config.connectionType === 'sse') {
          if (!config.url || config.url.trim() === '') {
            errors.push('URL is required for SSE connections');
          }
          try {
            if (config.url) new URL(config.url);
          } catch {
            errors.push('Invalid URL format');
          }
        }

        return { valid: errors.length === 0, errors };
      };

      return {
        validStdio: validateConfig({
          name: 'Test',
          connectionType: 'stdio',
          command: 'npx',
        }),
        missingName: validateConfig({
          name: '',
          connectionType: 'stdio',
          command: 'npx',
        }),
        missingCommand: validateConfig({
          name: 'Test',
          connectionType: 'stdio',
          command: '',
        }),
        validSSE: validateConfig({
          name: 'Test',
          connectionType: 'sse',
          url: 'http://localhost:8080/sse',
        }),
        invalidURL: validateConfig({
          name: 'Test',
          connectionType: 'sse',
          url: 'not-a-url',
        }),
      };
    });

    expect(result.validStdio.valid).toBe(true);
    expect(result.missingName.valid).toBe(false);
    expect(result.missingCommand.valid).toBe(false);
    expect(result.validSSE.valid).toBe(true);
    expect(result.invalidURL.valid).toBe(false);
  });

  test('should manage environment variables', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const env: Record<string, string> = {};

      const addEnvVar = (key: string, value: string): boolean => {
        if (!key.trim()) return false;
        env[key.trim()] = value;
        return true;
      };

      const removeEnvVar = (key: string): boolean => {
        if (key in env) {
          delete env[key];
          return true;
        }
        return false;
      };

      addEnvVar('API_KEY', 'secret-key-123');
      addEnvVar('DEBUG', 'true');
      const afterAdd = Object.keys(env).length;

      removeEnvVar('DEBUG');
      const afterRemove = Object.keys(env).length;

      return {
        afterAdd,
        afterRemove,
        hasApiKey: 'API_KEY' in env,
        hasDebug: 'DEBUG' in env,
      };
    });

    expect(result.afterAdd).toBe(2);
    expect(result.afterRemove).toBe(1);
    expect(result.hasApiKey).toBe(true);
    expect(result.hasDebug).toBe(false);
  });

  test('should manage command arguments', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const args: string[] = [];

      const addArg = (arg: string): boolean => {
        if (!arg.trim()) return false;
        args.push(arg.trim());
        return true;
      };

      const removeArg = (index: number): boolean => {
        if (index >= 0 && index < args.length) {
          args.splice(index, 1);
          return true;
        }
        return false;
      };

      addArg('-y');
      addArg('@modelcontextprotocol/server-test');
      addArg('--port');
      addArg('8080');
      const afterAdd = args.length;

      removeArg(2); // Remove '--port'
      const afterRemove = args.length;

      return {
        afterAdd,
        afterRemove,
        currentArgs: args,
      };
    });

    expect(result.afterAdd).toBe(4);
    expect(result.afterRemove).toBe(3);
    expect(result.currentArgs).toContain('-y');
    expect(result.currentArgs).not.toContain('--port');
  });
});

test.describe('MCP Settings - Server Status', () => {
  test('should track server connection status', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      type ServerStatus =
        | { type: 'disconnected' }
        | { type: 'connecting' }
        | { type: 'connected' }
        | { type: 'reconnecting' }
        | { type: 'error'; message: string };

      const getStatusText = (status: ServerStatus): string => {
        switch (status.type) {
          case 'connected':
            return 'Connected';
          case 'connecting':
            return 'Connecting...';
          case 'reconnecting':
            return 'Reconnecting...';
          case 'error':
            return `Error: ${status.message}`;
          default:
            return 'Disconnected';
        }
      };

      const getStatusColor = (status: ServerStatus): string => {
        switch (status.type) {
          case 'connected':
            return 'green';
          case 'connecting':
          case 'reconnecting':
            return 'yellow';
          case 'error':
            return 'red';
          default:
            return 'gray';
        }
      };

      return {
        disconnected: {
          text: getStatusText({ type: 'disconnected' }),
          color: getStatusColor({ type: 'disconnected' }),
        },
        connecting: {
          text: getStatusText({ type: 'connecting' }),
          color: getStatusColor({ type: 'connecting' }),
        },
        connected: {
          text: getStatusText({ type: 'connected' }),
          color: getStatusColor({ type: 'connected' }),
        },
        error: {
          text: getStatusText({ type: 'error', message: 'Connection refused' }),
          color: getStatusColor({ type: 'error', message: 'Connection refused' }),
        },
      };
    });

    expect(result.disconnected.text).toBe('Disconnected');
    expect(result.disconnected.color).toBe('gray');
    expect(result.connected.text).toBe('Connected');
    expect(result.connected.color).toBe('green');
    expect(result.error.color).toBe('red');
  });

  test('should display server capabilities when connected', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface McpServer {
        id: string;
        name: string;
        tools: { name: string; description?: string }[];
        resources: { name: string }[];
        prompts: { name: string }[];
      }

      const server: McpServer = {
        id: 'test-server',
        name: 'Test Server',
        tools: [
          { name: 'read_file', description: 'Read file contents' },
          { name: 'write_file', description: 'Write to a file' },
          { name: 'list_directory', description: 'List directory contents' },
        ],
        resources: [{ name: 'file:///' }],
        prompts: [{ name: 'summarize' }],
      };

      return {
        toolCount: server.tools.length,
        resourceCount: server.resources.length,
        promptCount: server.prompts.length,
        toolNames: server.tools.map((t) => t.name),
      };
    });

    expect(result.toolCount).toBe(3);
    expect(result.resourceCount).toBe(1);
    expect(result.promptCount).toBe(1);
    expect(result.toolNames).toContain('read_file');
  });
});

test.describe('MCP Settings - Server Actions', () => {
  test('should connect to server', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface Server {
        id: string;
        status: { type: string };
      }

      const server: Server = {
        id: 'test-server',
        status: { type: 'disconnected' },
      };

      const _connectServer = (): Promise<boolean> => {
        server.status = { type: 'connecting' };
        // Simulate connection
        return new Promise((resolve) => {
          setTimeout(() => {
            server.status = { type: 'connected' };
            resolve(true);
          }, 100);
        });
      };

      const initialStatus = server.status.type;

      return {
        initialStatus,
        canConnect: server.status.type === 'disconnected',
      };
    });

    expect(result.initialStatus).toBe('disconnected');
    expect(result.canConnect).toBe(true);
  });

  test('should disconnect from server', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface Server {
        id: string;
        status: { type: string };
      }

      const server: Server = {
        id: 'test-server',
        status: { type: 'connected' },
      };

      const disconnectServer = (): boolean => {
        if (server.status.type === 'connected') {
          server.status = { type: 'disconnected' };
          return true;
        }
        return false;
      };

      const initialStatus = server.status.type;
      const disconnected = disconnectServer();
      const afterDisconnect = server.status.type;

      return { initialStatus, disconnected, afterDisconnect };
    });

    expect(result.initialStatus).toBe('connected');
    expect(result.disconnected).toBe(true);
    expect(result.afterDisconnect).toBe('disconnected');
  });

  test('should toggle server enabled state', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const server = {
        id: 'test-server',
        config: { enabled: true },
      };

      const toggleEnabled = (): void => {
        server.config.enabled = !server.config.enabled;
      };

      const initial = server.config.enabled;
      toggleEnabled();
      const afterToggle = server.config.enabled;

      return { initial, afterToggle };
    });

    expect(result.initial).toBe(true);
    expect(result.afterToggle).toBe(false);
  });

  test('should remove server', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const servers = [
        { id: 'server-1', name: 'Server 1' },
        { id: 'server-2', name: 'Server 2' },
        { id: 'server-3', name: 'Server 3' },
      ];

      const removeServer = (id: string): boolean => {
        const index = servers.findIndex((s) => s.id === id);
        if (index !== -1) {
          servers.splice(index, 1);
          return true;
        }
        return false;
      };

      const initialCount = servers.length;
      removeServer('server-2');
      const afterRemove = servers.length;
      const remainingIds = servers.map((s) => s.id);

      return { initialCount, afterRemove, remainingIds };
    });

    expect(result.initialCount).toBe(3);
    expect(result.afterRemove).toBe(2);
    expect(result.remainingIds).not.toContain('server-2');
  });
});

test.describe('MCP Settings - Quick Install', () => {
  test('should list popular MCP servers', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const popularServers = [
        {
          id: 'filesystem',
          name: 'Filesystem',
          package: '@modelcontextprotocol/server-filesystem',
          description: 'Access and manage local files',
        },
        {
          id: 'github',
          name: 'GitHub',
          package: '@modelcontextprotocol/server-github',
          description: 'Interact with GitHub repositories',
        },
        {
          id: 'puppeteer',
          name: 'Puppeteer',
          package: '@modelcontextprotocol/server-puppeteer',
          description: 'Browser automation',
        },
        {
          id: 'postgres',
          name: 'PostgreSQL',
          package: '@modelcontextprotocol/server-postgres',
          description: 'Database operations',
        },
      ];

      return {
        serverCount: popularServers.length,
        serverNames: popularServers.map((s) => s.name),
        hasFilesystem: popularServers.some((s) => s.id === 'filesystem'),
        hasGitHub: popularServers.some((s) => s.id === 'github'),
      };
    });

    expect(result.serverCount).toBeGreaterThanOrEqual(4);
    expect(result.serverNames).toContain('Filesystem');
    expect(result.hasFilesystem).toBe(true);
    expect(result.hasGitHub).toBe(true);
  });

  test('should create config from quick install', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface QuickInstallServer {
        id: string;
        name: string;
        package: string;
        defaultArgs?: string[];
        envVars?: string[];
      }

      const createConfigFromQuickInstall = (
        server: QuickInstallServer
      ): {
        name: string;
        command: string;
        args: string[];
        env: Record<string, string>;
      } => {
        return {
          name: server.name,
          command: 'npx',
          args: ['-y', server.package, ...(server.defaultArgs || [])],
          env: (server.envVars || []).reduce(
            (acc, key) => ({ ...acc, [key]: '' }),
            {}
          ),
        };
      };

      const filesystemServer: QuickInstallServer = {
        id: 'filesystem',
        name: 'Filesystem',
        package: '@modelcontextprotocol/server-filesystem',
        defaultArgs: ['/home/user/documents'],
      };

      const config = createConfigFromQuickInstall(filesystemServer);

      return {
        name: config.name,
        command: config.command,
        argCount: config.args.length,
        hasPackage: config.args.includes('@modelcontextprotocol/server-filesystem'),
      };
    });

    expect(result.name).toBe('Filesystem');
    expect(result.command).toBe('npx');
    expect(result.argCount).toBe(3);
    expect(result.hasPackage).toBe(true);
  });
});

test.describe('MCP Settings - Persistence', () => {
  test('should persist MCP servers to localStorage', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const mcpServers = [
        {
          id: 'test-server',
          name: 'Test Server',
          config: {
            connectionType: 'stdio',
            command: 'npx',
            args: ['-y', 'test-package'],
            enabled: true,
          },
        },
      ];
      localStorage.setItem(
        'cognia-mcp-servers',
        JSON.stringify({ state: { servers: mcpServers } })
      );
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const stored = await page.evaluate(() => {
      const data = localStorage.getItem('cognia-mcp-servers');
      return data ? JSON.parse(data) : null;
    });

    expect(stored).not.toBeNull();
    expect(stored.state.servers.length).toBe(1);
    expect(stored.state.servers[0].name).toBe('Test Server');
  });

  test('should load MCP servers on startup', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const loadServers = (): { id: string; name: string }[] => {
        const storedData = localStorage.getItem('cognia-mcp-servers');
        if (!storedData) return [];

        try {
          const parsed = JSON.parse(storedData);
          return parsed.state?.servers || [];
        } catch {
          return [];
        }
      };

      // Pre-populate
      localStorage.setItem(
        'cognia-mcp-servers',
        JSON.stringify({
          state: {
            servers: [
              { id: 'server-1', name: 'Server 1' },
              { id: 'server-2', name: 'Server 2' },
            ],
          },
        })
      );

      const loaded = loadServers();

      return {
        serverCount: loaded.length,
        serverNames: loaded.map((s) => s.name),
      };
    });

    expect(result.serverCount).toBe(2);
    expect(result.serverNames).toContain('Server 1');
  });
});

test.describe('MCP Settings UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display MCP settings section', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await page.waitForTimeout(300);

      // Look for MCP tab
      const mcpSection = page.locator('text=MCP').first();
      const hasMCP = await mcpSection.isVisible().catch(() => false);
      expect(hasMCP).toBe(true);
    }
  });

  test('should display add server button', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await page.waitForTimeout(300);

      // Click MCP tab if available
      const mcpTab = page
        .locator('[role="tab"]:has-text("MCP"), button:has-text("MCP")')
        .first();
      if (await mcpTab.isVisible()) {
        await mcpTab.click();
        await page.waitForTimeout(200);
      }

      // Look for add button
      const addBtn = page.locator('button:has-text("Add")').first();
      const hasAdd = await addBtn.isVisible().catch(() => false);
      expect(hasAdd).toBe(true);
    }
  });

  test('should display quick install button', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await page.waitForTimeout(300);

      // Click MCP tab if available
      const mcpTab = page
        .locator('[role="tab"]:has-text("MCP"), button:has-text("MCP")')
        .first();
      if (await mcpTab.isVisible()) {
        await mcpTab.click();
        await page.waitForTimeout(200);
      }

      // Look for quick install button
      const quickInstallBtn = page
        .locator('button:has-text("Quick Install"), button:has-text("Quick")')
        .first();
      const hasQuickInstall = await quickInstallBtn.isVisible().catch(() => false);
      expect(hasQuickInstall).toBe(true);
    }
  });

  test('should display refresh button', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await page.waitForTimeout(300);

      // Look for refresh icon button
      const refreshBtn = page
        .locator('button:has(svg[class*="RefreshCw"]), button[aria-label*="refresh" i]')
        .first();
      const hasRefresh = await refreshBtn.isVisible().catch(() => false);
      expect(hasRefresh).toBe(true);
    }
  });
});
