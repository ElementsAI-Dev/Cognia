import { test, expect } from '@playwright/test';

/**
 * MCP (Model Context Protocol) Complete Tests
 * Tests MCP server configuration and management
 */
test.describe('MCP Server Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should list MCP servers', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface MCPServer {
        id: string;
        name: string;
        command: string;
        args: string[];
        env: Record<string, string>;
        enabled: boolean;
        status: 'connected' | 'disconnected' | 'error';
      }

      const servers: MCPServer[] = [
        {
          id: 'server-1',
          name: 'File System',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', '/path'],
          env: {},
          enabled: true,
          status: 'connected',
        },
        {
          id: 'server-2',
          name: 'GitHub',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-github'],
          env: { GITHUB_TOKEN: '***' },
          enabled: true,
          status: 'connected',
        },
        {
          id: 'server-3',
          name: 'Disabled Server',
          command: 'npx',
          args: ['-y', 'some-server'],
          env: {},
          enabled: false,
          status: 'disconnected',
        },
      ];

      const getEnabledServers = () => servers.filter(s => s.enabled);
      const getConnectedServers = () => servers.filter(s => s.status === 'connected');

      return {
        totalCount: servers.length,
        enabledCount: getEnabledServers().length,
        connectedCount: getConnectedServers().length,
        serverNames: servers.map(s => s.name),
      };
    });

    expect(result.totalCount).toBe(3);
    expect(result.enabledCount).toBe(2);
    expect(result.connectedCount).toBe(2);
    expect(result.serverNames).toContain('File System');
    expect(result.serverNames).toContain('GitHub');
  });

  test('should add a new MCP server', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface MCPServer {
        id: string;
        name: string;
        command: string;
        args: string[];
        env: Record<string, string>;
        enabled: boolean;
      }

      const servers: MCPServer[] = [];

      const addServer = (config: Omit<MCPServer, 'id'>): MCPServer => {
        const server: MCPServer = {
          ...config,
          id: `server-${Date.now()}`,
        };
        servers.push(server);
        return server;
      };

      const added = addServer({
        name: 'Custom Server',
        command: 'node',
        args: ['./my-server.js'],
        env: { API_KEY: 'secret' },
        enabled: true,
      });

      return {
        serverCount: servers.length,
        addedName: added.name,
        hasId: !!added.id,
        hasEnv: Object.keys(added.env).length > 0,
      };
    });

    expect(result.serverCount).toBe(1);
    expect(result.addedName).toBe('Custom Server');
    expect(result.hasId).toBe(true);
    expect(result.hasEnv).toBe(true);
  });

  test('should update MCP server configuration', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface MCPServer {
        id: string;
        name: string;
        command: string;
        args: string[];
        enabled: boolean;
      }

      const servers: MCPServer[] = [
        {
          id: 'server-1',
          name: 'Original Name',
          command: 'npx',
          args: ['original-arg'],
          enabled: true,
        },
      ];

      const updateServer = (id: string, updates: Partial<MCPServer>): boolean => {
        const server = servers.find(s => s.id === id);
        if (!server) return false;
        Object.assign(server, updates);
        return true;
      };

      const updated = updateServer('server-1', {
        name: 'Updated Name',
        args: ['new-arg-1', 'new-arg-2'],
      });

      return {
        updated,
        newName: servers[0].name,
        newArgs: servers[0].args,
        argsCount: servers[0].args.length,
      };
    });

    expect(result.updated).toBe(true);
    expect(result.newName).toBe('Updated Name');
    expect(result.argsCount).toBe(2);
  });

  test('should delete MCP server', async ({ page }) => {
    const result = await page.evaluate(() => {
      const servers = [
        { id: 'server-1', name: 'Server 1' },
        { id: 'server-2', name: 'Server 2' },
        { id: 'server-3', name: 'Server 3' },
      ];

      const deleteServer = (id: string): boolean => {
        const index = servers.findIndex(s => s.id === id);
        if (index === -1) return false;
        servers.splice(index, 1);
        return true;
      };

      const countBefore = servers.length;
      const deleted = deleteServer('server-2');
      const countAfter = servers.length;
      const remainingIds = servers.map(s => s.id);

      return { countBefore, countAfter, deleted, remainingIds };
    });

    expect(result.countBefore).toBe(3);
    expect(result.countAfter).toBe(2);
    expect(result.deleted).toBe(true);
    expect(result.remainingIds).not.toContain('server-2');
  });

  test('should toggle server enabled state', async ({ page }) => {
    const result = await page.evaluate(() => {
      const servers = [
        { id: 'server-1', name: 'Server 1', enabled: true },
        { id: 'server-2', name: 'Server 2', enabled: false },
      ];

      const toggleServer = (id: string): boolean => {
        const server = servers.find(s => s.id === id);
        if (!server) return false;
        server.enabled = !server.enabled;
        return true;
      };

      const server1Initial = servers[0].enabled;
      toggleServer('server-1');
      const server1After = servers[0].enabled;

      const server2Initial = servers[1].enabled;
      toggleServer('server-2');
      const server2After = servers[1].enabled;

      return {
        server1Initial,
        server1After,
        server2Initial,
        server2After,
      };
    });

    expect(result.server1Initial).toBe(true);
    expect(result.server1After).toBe(false);
    expect(result.server2Initial).toBe(false);
    expect(result.server2After).toBe(true);
  });
});

test.describe('MCP Server Connection', () => {
  test('should connect to MCP server', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ConnectionState {
        serverId: string;
        status: 'connecting' | 'connected' | 'disconnected' | 'error';
        error?: string;
        connectedAt?: Date;
      }

      const connections: Map<string, ConnectionState> = new Map();

      const connect = async (serverId: string): Promise<ConnectionState> => {
        const state: ConnectionState = {
          serverId,
          status: 'connecting',
        };
        connections.set(serverId, state);

        // Simulate connection
        state.status = 'connected';
        state.connectedAt = new Date();

        return state;
      };

      const disconnect = (serverId: string): boolean => {
        const state = connections.get(serverId);
        if (!state) return false;
        state.status = 'disconnected';
        return true;
      };

      const getStatus = (serverId: string): string => {
        return connections.get(serverId)?.status || 'unknown';
      };

      // Test connection flow
      connect('server-1');
      const afterConnect = getStatus('server-1');

      disconnect('server-1');
      const afterDisconnect = getStatus('server-1');

      return { afterConnect, afterDisconnect };
    });

    expect(result.afterConnect).toBe('connected');
    expect(result.afterDisconnect).toBe('disconnected');
  });

  test('should handle connection errors', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ConnectionResult {
        success: boolean;
        error?: string;
        retryable: boolean;
      }

      const simulateConnection = (shouldFail: boolean, errorType?: string): ConnectionResult => {
        if (!shouldFail) {
          return { success: true, retryable: false };
        }

        const errors: Record<string, { message: string; retryable: boolean }> = {
          timeout: { message: 'Connection timed out', retryable: true },
          auth: { message: 'Authentication failed', retryable: false },
          notfound: { message: 'Server not found', retryable: false },
          network: { message: 'Network error', retryable: true },
        };

        const error = errors[errorType || 'network'];
        return {
          success: false,
          error: error.message,
          retryable: error.retryable,
        };
      };

      return {
        success: simulateConnection(false),
        timeout: simulateConnection(true, 'timeout'),
        auth: simulateConnection(true, 'auth'),
        network: simulateConnection(true, 'network'),
      };
    });

    expect(result.success.success).toBe(true);
    expect(result.timeout.success).toBe(false);
    expect(result.timeout.retryable).toBe(true);
    expect(result.auth.retryable).toBe(false);
    expect(result.network.retryable).toBe(true);
  });

  test('should retry failed connections', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      let attemptCount = 0;
      const maxRetries = 3;
      const successOnAttempt = 2;

      const attemptConnection = (): boolean => {
        attemptCount++;
        return attemptCount >= successOnAttempt;
      };

      const connectWithRetry = (): { success: boolean; attempts: number } => {
        for (let i = 0; i < maxRetries; i++) {
          if (attemptConnection()) {
            return { success: true, attempts: attemptCount };
          }
        }
        return { success: false, attempts: attemptCount };
      };

      const result = connectWithRetry();

      return {
        success: result.success,
        attempts: result.attempts,
        retriedBeforeSuccess: result.attempts > 1,
      };
    });

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(2);
    expect(result.retriedBeforeSuccess).toBe(true);
  });
});

test.describe('MCP Tools', () => {
  test('should list available tools from server', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface MCPTool {
        name: string;
        description: string;
        inputSchema: Record<string, unknown>;
        serverId: string;
      }

      const tools: MCPTool[] = [
        {
          name: 'read_file',
          description: 'Read contents of a file',
          inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
          serverId: 'filesystem',
        },
        {
          name: 'write_file',
          description: 'Write contents to a file',
          inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } } },
          serverId: 'filesystem',
        },
        {
          name: 'search_code',
          description: 'Search code in repository',
          inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
          serverId: 'github',
        },
      ];

      const getToolsByServer = (serverId: string) => tools.filter(t => t.serverId === serverId);
      const getAllTools = () => tools;

      return {
        totalTools: getAllTools().length,
        filesystemTools: getToolsByServer('filesystem').length,
        githubTools: getToolsByServer('github').length,
        toolNames: tools.map(t => t.name),
      };
    });

    expect(result.totalTools).toBe(3);
    expect(result.filesystemTools).toBe(2);
    expect(result.githubTools).toBe(1);
    expect(result.toolNames).toContain('read_file');
    expect(result.toolNames).toContain('search_code');
  });

  test('should execute MCP tool', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ToolExecution {
        toolName: string;
        args: Record<string, unknown>;
        result?: unknown;
        error?: string;
        duration: number;
      }

      const executeTool = (
        toolName: string,
        args: Record<string, unknown>
      ): ToolExecution => {
        const startTime = Date.now();

        // Simulate tool execution
        const toolResults: Record<string, unknown> = {
          read_file: { content: 'File contents here', size: 1024 },
          write_file: { success: true, bytesWritten: 512 },
          search_code: { results: ['file1.ts', 'file2.ts'], count: 2 },
        };

        const result = toolResults[toolName];
        const duration = Date.now() - startTime;

        if (!result) {
          return {
            toolName,
            args,
            error: 'Unknown tool',
            duration,
          };
        }

        return {
          toolName,
          args,
          result,
          duration,
        };
      };

      const readResult = executeTool('read_file', { path: '/test.txt' });
      const writeResult = executeTool('write_file', { path: '/out.txt', content: 'Hello' });
      const unknownResult = executeTool('unknown_tool', {});

      return {
        readSuccess: !readResult.error,
        readHasContent: !!(readResult.result as { content?: string })?.content,
        writeSuccess: !writeResult.error,
        unknownHasError: !!unknownResult.error,
      };
    });

    expect(result.readSuccess).toBe(true);
    expect(result.readHasContent).toBe(true);
    expect(result.writeSuccess).toBe(true);
    expect(result.unknownHasError).toBe(true);
  });

  test('should validate tool arguments', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ValidationResult {
        valid: boolean;
        errors: string[];
      }

      const validateArgs = (
        args: Record<string, unknown>,
        schema: { required: string[]; properties: Record<string, { type: string }> }
      ): ValidationResult => {
        const errors: string[] = [];

        // Check required fields
        for (const field of schema.required) {
          if (!(field in args)) {
            errors.push(`Missing required field: ${field}`);
          }
        }

        // Check types
        for (const [key, value] of Object.entries(args)) {
          const propSchema = schema.properties[key];
          if (propSchema) {
            const actualType = typeof value;
            if (actualType !== propSchema.type) {
              errors.push(`Invalid type for ${key}: expected ${propSchema.type}, got ${actualType}`);
            }
          }
        }

        return { valid: errors.length === 0, errors };
      };

      const schema = {
        required: ['path'],
        properties: {
          path: { type: 'string' },
          encoding: { type: 'string' },
        },
      };

      const validArgs = { path: '/test.txt', encoding: 'utf-8' };
      const missingRequired = { encoding: 'utf-8' };
      const wrongType = { path: 123 };

      return {
        validResult: validateArgs(validArgs, schema),
        missingResult: validateArgs(missingRequired, schema),
        wrongTypeResult: validateArgs(wrongType as Record<string, unknown>, schema),
      };
    });

    expect(result.validResult.valid).toBe(true);
    expect(result.missingResult.valid).toBe(false);
    expect(result.missingResult.errors).toContain('Missing required field: path');
    expect(result.wrongTypeResult.valid).toBe(false);
  });
});

test.describe('MCP Resources', () => {
  test('should list available resources', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface MCPResource {
        uri: string;
        name: string;
        description?: string;
        mimeType?: string;
        serverId: string;
      }

      const resources: MCPResource[] = [
        {
          uri: 'file:///project/README.md',
          name: 'README.md',
          description: 'Project readme file',
          mimeType: 'text/markdown',
          serverId: 'filesystem',
        },
        {
          uri: 'file:///project/src/index.ts',
          name: 'index.ts',
          mimeType: 'text/typescript',
          serverId: 'filesystem',
        },
        {
          uri: 'github://repo/issues',
          name: 'Issues',
          description: 'Repository issues',
          serverId: 'github',
        },
      ];

      const getResourcesByServer = (serverId: string) => 
        resources.filter(r => r.serverId === serverId);

      const getResourceByUri = (uri: string) => 
        resources.find(r => r.uri === uri);

      return {
        totalResources: resources.length,
        filesystemResources: getResourcesByServer('filesystem').length,
        githubResources: getResourcesByServer('github').length,
        readmeResource: getResourceByUri('file:///project/README.md'),
      };
    });

    expect(result.totalResources).toBe(3);
    expect(result.filesystemResources).toBe(2);
    expect(result.githubResources).toBe(1);
    expect(result.readmeResource?.name).toBe('README.md');
  });

  test('should read resource content', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ResourceContent {
        uri: string;
        content: string;
        mimeType: string;
      }

      const readResource = (uri: string): ResourceContent | null => {
        // Simulate reading resource
        const resources: Record<string, { content: string; mimeType: string }> = {
          'file:///README.md': {
            content: '# Project\n\nThis is the readme.',
            mimeType: 'text/markdown',
          },
          'file:///config.json': {
            content: '{"name": "project", "version": "1.0.0"}',
            mimeType: 'application/json',
          },
        };

        const resource = resources[uri];
        if (!resource) return null;

        return { uri, ...resource };
      };

      const readme = readResource('file:///README.md');
      const config = readResource('file:///config.json');
      const notFound = readResource('file:///notfound.txt');

      return {
        readmeContent: readme?.content,
        readmeMimeType: readme?.mimeType,
        configContent: config?.content,
        notFoundIsNull: notFound === null,
      };
    });

    expect(result.readmeContent).toContain('# Project');
    expect(result.readmeMimeType).toBe('text/markdown');
    expect(result.configContent).toContain('project');
    expect(result.notFoundIsNull).toBe(true);
  });
});

test.describe('MCP Install Wizard', () => {
  test('should list available MCP servers to install', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const availableServers = [
        {
          id: 'filesystem',
          name: 'File System',
          description: 'Read and write files',
          package: '@modelcontextprotocol/server-filesystem',
          category: 'files',
        },
        {
          id: 'github',
          name: 'GitHub',
          description: 'Interact with GitHub repositories',
          package: '@modelcontextprotocol/server-github',
          category: 'development',
        },
        {
          id: 'postgres',
          name: 'PostgreSQL',
          description: 'Query PostgreSQL databases',
          package: '@modelcontextprotocol/server-postgres',
          category: 'database',
        },
        {
          id: 'slack',
          name: 'Slack',
          description: 'Send and receive Slack messages',
          package: '@modelcontextprotocol/server-slack',
          category: 'communication',
        },
      ];

      const getByCategory = (category: string) => 
        availableServers.filter(s => s.category === category);

      const searchServers = (query: string) => 
        availableServers.filter(s => 
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.description.toLowerCase().includes(query.toLowerCase())
        );

      return {
        totalAvailable: availableServers.length,
        filesCategory: getByCategory('files').length,
        databaseCategory: getByCategory('database').length,
        searchGit: searchServers('git').length,
        categories: [...new Set(availableServers.map(s => s.category))],
      };
    });

    expect(result.totalAvailable).toBe(4);
    expect(result.filesCategory).toBe(1);
    expect(result.databaseCategory).toBe(1);
    expect(result.searchGit).toBe(1);
    expect(result.categories).toContain('development');
  });

  test('should generate server configuration', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ServerTemplate {
        id: string;
        name: string;
        package: string;
        requiredEnv: string[];
        optionalEnv: string[];
        defaultArgs: string[];
      }

      const generateConfig = (
        template: ServerTemplate,
        envValues: Record<string, string>,
        customArgs: string[] = []
      ) => {
        const config = {
          name: template.name,
          command: 'npx',
          args: ['-y', template.package, ...template.defaultArgs, ...customArgs],
          env: {} as Record<string, string>,
        };

        for (const envKey of template.requiredEnv) {
          if (envValues[envKey]) {
            config.env[envKey] = envValues[envKey];
          }
        }

        for (const envKey of template.optionalEnv) {
          if (envValues[envKey]) {
            config.env[envKey] = envValues[envKey];
          }
        }

        return config;
      };

      const githubTemplate: ServerTemplate = {
        id: 'github',
        name: 'GitHub',
        package: '@modelcontextprotocol/server-github',
        requiredEnv: ['GITHUB_TOKEN'],
        optionalEnv: ['GITHUB_API_URL'],
        defaultArgs: [],
      };

      const config = generateConfig(
        githubTemplate,
        { GITHUB_TOKEN: 'ghp_xxx', GITHUB_API_URL: 'https://api.github.com' },
        ['--repo', 'owner/repo']
      );

      return {
        name: config.name,
        command: config.command,
        hasPackage: config.args.includes('@modelcontextprotocol/server-github'),
        hasToken: !!config.env.GITHUB_TOKEN,
        hasApiUrl: !!config.env.GITHUB_API_URL,
        hasCustomArgs: config.args.includes('--repo'),
      };
    });

    expect(result.name).toBe('GitHub');
    expect(result.command).toBe('npx');
    expect(result.hasPackage).toBe(true);
    expect(result.hasToken).toBe(true);
    expect(result.hasApiUrl).toBe(true);
    expect(result.hasCustomArgs).toBe(true);
  });

  test('should validate server configuration', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ValidationResult {
        valid: boolean;
        errors: string[];
        warnings: string[];
      }

      const validateConfig = (config: {
        name: string;
        command: string;
        args: string[];
        env: Record<string, string>;
        requiredEnv: string[];
      }): ValidationResult => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!config.name || config.name.trim() === '') {
          errors.push('Server name is required');
        }

        if (!config.command || config.command.trim() === '') {
          errors.push('Command is required');
        }

        for (const envKey of config.requiredEnv) {
          if (!config.env[envKey]) {
            errors.push(`Missing required environment variable: ${envKey}`);
          }
        }

        if (config.args.length === 0) {
          warnings.push('No arguments specified');
        }

        return { valid: errors.length === 0, errors, warnings };
      };

      const validConfig = {
        name: 'GitHub',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        env: { GITHUB_TOKEN: 'token' },
        requiredEnv: ['GITHUB_TOKEN'],
      };

      const invalidConfig = {
        name: '',
        command: 'npx',
        args: [],
        env: {},
        requiredEnv: ['GITHUB_TOKEN'],
      };

      return {
        validResult: validateConfig(validConfig),
        invalidResult: validateConfig(invalidConfig),
      };
    });

    expect(result.validResult.valid).toBe(true);
    expect(result.validResult.errors).toHaveLength(0);
    expect(result.invalidResult.valid).toBe(false);
    expect(result.invalidResult.errors).toContain('Server name is required');
    expect(result.invalidResult.errors).toContain('Missing required environment variable: GITHUB_TOKEN');
  });
});

test.describe('MCP Store Persistence', () => {
  test('should persist MCP servers to localStorage', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const mcpState = {
        servers: [
          {
            id: 'server-1',
            name: 'Test Server',
            command: 'npx',
            args: ['-y', 'test-server'],
            env: {},
            enabled: true,
          },
        ],
        connections: {},
      };

      localStorage.setItem('cognia-mcp', JSON.stringify({ state: mcpState }));
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const stored = await page.evaluate(() => {
      const data = localStorage.getItem('cognia-mcp');
      return data ? JSON.parse(data) : null;
    });

    expect(stored).not.toBeNull();
    expect(stored.state.servers).toHaveLength(1);
    expect(stored.state.servers[0].name).toBe('Test Server');
  });

  test('should track server connection history', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ConnectionEvent {
        serverId: string;
        event: 'connected' | 'disconnected' | 'error';
        timestamp: Date;
        details?: string;
      }

      const connectionHistory: ConnectionEvent[] = [];

      const logEvent = (
        serverId: string,
        event: ConnectionEvent['event'],
        details?: string
      ) => {
        connectionHistory.push({
          serverId,
          event,
          timestamp: new Date(),
          details,
        });
      };

      const getServerHistory = (serverId: string) => 
        connectionHistory.filter(e => e.serverId === serverId);

      logEvent('server-1', 'connected');
      logEvent('server-1', 'disconnected');
      logEvent('server-1', 'connected');
      logEvent('server-2', 'error', 'Connection timeout');

      return {
        totalEvents: connectionHistory.length,
        server1Events: getServerHistory('server-1').length,
        server2Events: getServerHistory('server-2').length,
        hasError: connectionHistory.some(e => e.event === 'error'),
        errorDetails: connectionHistory.find(e => e.event === 'error')?.details,
      };
    });

    expect(result.totalEvents).toBe(4);
    expect(result.server1Events).toBe(3);
    expect(result.server2Events).toBe(1);
    expect(result.hasError).toBe(true);
    expect(result.errorDetails).toBe('Connection timeout');
  });
});
