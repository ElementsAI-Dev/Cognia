# Cognia Plugin SDK for TypeScript

> **Version 2.0.0** | Create powerful TypeScript/JavaScript plugins for Cognia with full type safety and comprehensive API access.

## Installation

```bash
npm install @cognia/plugin-sdk
# or
pnpm add @cognia/plugin-sdk
```

## Quick Start

Create a plugin in seconds:

```typescript
import { definePlugin, defineTool, Schema, parameters } from '@cognia/plugin-sdk';
import type { PluginContext, PluginHooks } from '@cognia/plugin-sdk';

export default definePlugin({
  activate(context: PluginContext): PluginHooks {
    context.logger.info('Plugin activated!');

    // Register a tool
    context.agent.registerTool({
      name: 'my_tool',
      pluginId: context.pluginId,
      definition: {
        name: 'my_tool',
        description: 'Does something cool',
        parametersSchema: parameters({
          input: Schema.string('Input text'),
          count: Schema.optional(Schema.integer('Count', { maximum: 100 })),
        }, ['input']),
      },
      execute: async (args, toolContext) => {
        const { input, count = 1 } = args as { input: string; count?: number };
        return { result: input.repeat(count) };
      },
    });

    // Return hooks
    return {
      onAgentStep: (agentId, step) => {
        context.logger.debug(`Agent ${agentId} step: ${step.type}`);
      },
    };
  },

  deactivate() {
    console.log('Plugin deactivated');
  },
});
```

## Plugin Manifest

Create a `plugin.json` file in your plugin root:

```json
{
  "id": "com.example.my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "My awesome plugin",
  "type": "frontend",
  "main": "dist/index.js",
  "capabilities": ["tools", "hooks", "scheduler"],
  "permissions": ["network:fetch"],
  "scheduledTasks": [
    {
      "name": "daily-maintenance",
      "handler": "dailyMaintenance",
      "trigger": { "type": "cron", "expression": "0 6 * * *" },
      "defaultEnabled": true
    }
  ]
}
```

## What's Included

The SDK provides comprehensive TypeScript types and helper functions for:

### Core Plugin Types
- **PluginManifest** - Plugin metadata and configuration
- **PluginContext** - Full API access context
- **PluginHooks** - Base lifecycle and event hooks
- **ExtendedPluginHooks** - Extended event integration hooks

### Plugin Capabilities
- **Tools** - AI agent tools with JSON Schema parameters
- **Modes** - Custom AI agent modes
- **Commands** - Slash commands for the command palette
- **Components** - A2UI custom components
- **Hooks** - Event-driven lifecycle hooks
- **Scheduler** - Scheduled tasks (`cron`, `interval`, `once`, `event`)

### Available APIs

#### Core APIs
| API | Description |
|-----|-------------|
| `context.logger` | Logging utilities |
| `context.storage` | Persistent key-value storage |
| `context.events` | Event emitter |
| `context.ui` | Notifications, dialogs, UI elements |
| `context.agent` | Tool and mode registration |
| `context.settings` | Application settings |
| `context.network` | HTTP requests |
| `context.fs` | File system operations |
| `context.shell` | Shell commands |
| `context.db` | SQLite database |
| `context.scheduler` | Scheduled task registration and execution |
| `context.shortcuts` | Keyboard shortcuts |
| `context.secrets` | Secure credential storage |

#### Extended APIs
| API | Description |
|-----|-------------|
| `context.session` | Chat session management |
| `context.project` | Project and knowledge base |
| `context.vector` | Vector/RAG operations |
| `context.theme` | Theme customization |
| `context.export` | Data export |
| `context.i18n` | Internationalization |
| `context.canvas` | Canvas document editing |
| `context.artifact` | Artifact management |
| `context.notifications` | Notification center |
| `context.ai` | AI model access |
| `context.extensions` | UI extension points |
| `context.permissions` | Permission management |

## Examples

### Define a Tool

```typescript
import { defineTool, Schema, parameters } from '@cognia/plugin-sdk';

const searchTool = defineTool(
  'web_search',
  'Search the web for information',
  parameters({
    query: Schema.string('Search query'),
    limit: Schema.optional(Schema.integer('Max results', { maximum: 100 })),
    language: Schema.optional(Schema.string('Language', { enum: ['en', 'es', 'fr'] })),
  }, ['query']),
  async (args, context) => {
    const { query, limit = 10 } = args as { query: string; limit?: number };
    // Perform search...
    return { results: [] };
  },
  {
    category: 'search',
    requiresApproval: false,
  }
);
```

### Define a Command

```typescript
import { defineCommand } from '@cognia/plugin-sdk';

const myCommand = defineCommand(
  'my-plugin.do-something',
  'Do Something',
  async (args) => {
    console.log('Command executed!');
  },
  {
    description: 'Does something useful',
    icon: 'zap',
    shortcut: 'Ctrl+Shift+D',
  }
);
```

### Use Hooks

```typescript
const hooks: PluginHooks = {
  // Lifecycle
  onLoad: async () => {
    console.log('Plugin loaded');
  },

  onEnable: async () => {
    console.log('Plugin enabled');
  },

  // Agent events
  onAgentStart: (agentId, config) => {
    console.log(`Agent ${agentId} started`);
  },

  onAgentStep: (agentId, step) => {
    console.log(`Agent ${agentId} step: ${step.type}`);
  },

  // Message pipeline
  onMessageSend: (message) => {
    console.log('Sending:', message.content);
    return message;
  },

  // Session events
  onSessionCreate: (sessionId) => {
    console.log('Session created:', sessionId);
  },
};

// Extended hooks
const extendedHooks: ExtendedPluginHooks = {
  ...hooks,

  // Project events
  onProjectCreate: (project) => {
    console.log('Project created:', project.id);
  },

  // Canvas events
  onCanvasContentChange: (docId, content, prev) => {
    console.log('Canvas content changed');
  },

  // Theme events
  onThemeModeChange: (mode, resolved) => {
    console.log('Theme changed to', resolved);
  },

  // Pre/Post AI pipeline hooks
  onUserPromptSubmit: (prompt, sessionId, context) => {
    if (prompt.includes('forbidden')) {
      return { action: 'block', blockReason: 'Contains forbidden keyword' };
    }
    return { action: 'proceed' };
  },
  onPreToolUse: (toolName, toolArgs) => {
    return { action: 'allow' };
  },
  onPostChatReceive: (response) => {
    return { modifiedContent: response.content };
  },

  // MCP hooks
  onMCPServerConnect: (serverId, serverName) => {
    console.log('MCP connected:', serverId, serverName);
  },
  onMCPToolResult: (serverId, toolName, result) => {
    console.log('MCP tool result:', serverId, toolName, result);
  },
};
```

### Scheduler Example

```typescript
function activate(context: PluginContext): PluginHooks {
  context.scheduler.registerHandler('dailyMaintenance', async (_args, taskContext) => {
    taskContext.log('info', 'Running daily maintenance');
    return { success: true };
  });

  context.scheduler.createTask({
    name: 'Daily Maintenance',
    trigger: { type: 'cron', expression: '0 6 * * *' },
    handler: 'dailyMaintenance',
  });

  return {};
}
```

### Use Context APIs

```typescript
function activate(context: PluginContext): PluginHooks {
  // Storage
  await context.storage.set('apiKey', 'sk-...');
  const apiKey = await context.storage.get<string>('apiKey');

  // UI
  context.ui.showNotification({
    title: 'Success',
    body: 'Operation completed',
  });

  const input = await context.ui.showInputDialog({
    title: 'Enter value',
    placeholder: 'Type here...',
  });

  // Network
  const response = await context.network.get<{ data: string }>(
    'https://api.example.com/data'
  );

  // File system
  const content = await context.fs.readText('/path/to/file.txt');
  await context.fs.writeText('/path/to/file.txt', 'Hello!');

  // Database
  await context.db.createTable('users', {
    columns: [
      { name: 'id', type: 'integer', nullable: false },
      { name: 'name', type: 'text', nullable: false },
    ],
    primaryKey: 'id',
  });

  const users = await context.db.query<User>('SELECT * FROM users');

  // Shortcuts
  context.shortcuts.register('Ctrl+Shift+D', () => {
    console.log('Shortcut triggered!');
  });

  // Secrets
  await context.secrets.store('password', 'secret123');
  const password = await context.secrets.get('password');

  return {};
}
```

## Type Safety

The SDK provides full TypeScript types for everything:

```typescript
import type {
  PluginManifest,
  PluginContext,
  PluginHooks,
  ExtendedPluginHooks,
  PluginToolDef,
  PluginCommand,
  PluginSessionAPI,
  PluginProjectAPI,
  // ... and many more
} from '@cognia/plugin-sdk';
```

All types include comprehensive JSDoc documentation with examples.

## Module Structure

The SDK is organized into modular files for better maintainability:

```
src/
├── index.ts           # Main entry point (re-exports all modules)
├── plugin.ts          # Core plugin types (manifest, context, hooks, basic APIs)
├── plugin-extended.ts # Extended APIs (session, project, vector, theme, etc.)
├── plugin-hooks.ts    # Hook definitions and registration types
└── helpers.ts         # Helper functions (definePlugin, defineTool, Schema, etc.)
```

### Module Overview

**plugin.ts** (~1,200 lines)
- Core plugin types (PluginType, PluginCapability, PluginStatus, etc.)
- Plugin manifest and configuration
- A2UI integration types
- Tool and mode integration types
- Base plugin hooks
- Command types
- Plugin context and basic APIs (logger, storage, events, UI, agent, settings, network, filesystem, etc.)

**plugin-extended.ts** (~1,600 lines)
- Session management API
- Project and knowledge base API
- Vector/RAG API
- Theme customization API
- Export/import API
- Internationalization API
- Canvas document API
- Artifact API
- Notification center API
- AI provider API
- Extension points API
- Permission API
- Extended plugin context

**plugin-hooks.ts** (~150 lines)
- Extended plugin hooks (combines base + event hooks)
- Hook priority levels
- Hook registration options
- Hook execution result types

**helpers.ts** (~300 lines)
- `definePlugin()` - Plugin definition helper
- `defineTool()` - Tool definition helper
- `defineCommand()` - Command definition helper
- `Schema` - JSON Schema builders (string, number, integer, boolean, array, object, optional)
- `parameters()` - Parameter builder for tool schemas

## Documentation

For complete API documentation, see the inline JSDoc comments in each module file:
- `src/plugin.ts` - Core types and APIs
- `src/plugin-extended.ts` - Extended APIs
- `src/plugin-hooks.ts` - Hook definitions
- `src/helpers.ts` - Helper functions

The SDK exports:
- 100+ type definitions
- 30+ API interfaces
- 60+ event hooks
- Helper functions for plugins, tools, commands, and schema building

## License

MIT
