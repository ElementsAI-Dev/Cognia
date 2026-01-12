# Cognia Plugin SDK for TypeScript

Create powerful TypeScript/JavaScript plugins for Cognia with full type safety.

## Installation

```bash
npm install @cognia/plugin-sdk
# or
pnpm add @cognia/plugin-sdk
```

## Quick Start

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
        description: 'Do something cool',
        parametersSchema: parameters({
          input: Schema.string('Input text'),
          count: Schema.optional(Schema.integer('How many times')),
        }, ['input']),
      },
      execute: async (args) => {
        const input = args.input as string;
        const count = (args.count as number) || 1;
        return { result: input.repeat(count) };
      },
    });
    
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

Create a `plugin.json` file:

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "My awesome plugin",
  "type": "frontend",
  "main": "dist/index.js",
  "capabilities": ["tools", "hooks"],
  "permissions": ["network:fetch"]
}
```

## Available APIs

### Context APIs

| API | Description |
|-----|-------------|
| `context.logger` | Logging utilities |
| `context.storage` | Persistent key-value storage |
| `context.events` | Event emitter for plugin events |
| `context.ui` | UI utilities (notifications, dialogs) |
| `context.agent` | Register tools and modes |
| `context.settings` | Access plugin settings |
| `context.network` | HTTP requests |
| `context.fs` | File system operations |
| `context.shell` | Execute shell commands |
| `context.db` | Local database operations |
| `context.shortcuts` | Keyboard shortcuts |
| `context.contextMenu` | Context menu items |
| `context.secrets` | Secure credential storage |

### Extended APIs (from ExtendedPluginContext)

| API | Description |
|-----|-------------|
| `context.session` | Chat session management |
| `context.project` | Project management |
| `context.vector` | Vector/RAG operations |
| `context.theme` | Theme customization |
| `context.export` | Export sessions/projects |
| `context.i18n` | Internationalization |
| `context.canvas` | Canvas document editing |
| `context.artifact` | Artifact management |
| `context.notifications` | Notification center |
| `context.ai` | AI model access |
| `context.extensions` | UI extension points |
| `context.permissions` | Permission management |

## Hooks

Subscribe to application events:

```typescript
const hooks: PluginHooks = {
  // Lifecycle
  onLoad: async () => {},
  onEnable: async () => {},
  onDisable: async () => {},
  onUnload: async () => {},
  
  // Agent events
  onAgentStart: (agentId, config) => {},
  onAgentStep: (agentId, step) => {},
  onAgentToolCall: (agentId, tool, args) => {},
  onAgentComplete: (agentId, result) => {},
  
  // Message events
  onMessageSend: (message) => message,
  onMessageReceive: (message) => message,
  
  // Session events
  onSessionCreate: (sessionId) => {},
  onSessionSwitch: (sessionId) => {},
  
  // And many more...
};
```

## Schema Helpers

Build tool parameter schemas easily:

```typescript
import { Schema, parameters } from '@cognia/plugin-sdk';

const myParams = parameters({
  query: Schema.string('Search query'),
  limit: Schema.optional(Schema.integer('Max results', { minimum: 1, maximum: 100 })),
  providers: Schema.optional(Schema.array(
    Schema.string(undefined, { enum: ['google', 'bing', 'duckduckgo'] }),
    'Search providers to use'
  )),
  filters: Schema.optional(Schema.object({
    dateRange: Schema.string('Date range'),
    language: Schema.string('Language code'),
  })),
}, ['query']);
```

## Examples

See the `examples/` directory for complete plugin examples:

- `web-search/` - Web search with multiple providers
- `session-manager/` - Session management and export
- `theme-customizer/` - Custom theme creation
- `rag-integration/` - RAG/vector search integration

## License

MIT
