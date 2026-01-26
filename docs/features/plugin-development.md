# Plugin Development Guide

This guide explains how to create plugins for Cognia.

## Overview

Cognia's plugin system allows you to extend the application with custom tools, UI components, agent modes, and more. Plugins can be written in TypeScript or Python.

## Plugin Types

| Type | Description | Entry Point |
|------|-------------|-------------|
| `frontend` | TypeScript/JavaScript plugins | `main` field |
| `python` | Python plugins | `pythonMain` field |
| `hybrid` | Both TypeScript and Python | Both fields |

## Getting Started

### 1. Create Plugin Directory

```bash
mkdir my-plugin
cd my-plugin
```

### 2. Create plugin.json

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "A custom plugin for Cognia",
  "type": "frontend",
  "capabilities": ["tools"],
  "main": "index.ts"
}
```

### 3. Implement Plugin

```typescript
import { definePlugin, tool } from '@cognia/plugin-sdk';

const myTool = tool({
  name: 'my_tool',
  description: 'Does something useful',
  parameters: {
    type: 'object',
    properties: {
      input: { type: 'string' }
    },
    required: ['input']
  },
  execute: async ({ input }) => {
    return { result: `Processed: ${input}` };
  }
});

export default definePlugin({
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  tools: [myTool]
});
```

## Plugin Manifest (plugin.json)

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique plugin identifier |
| `name` | string | Display name |
| `version` | string | Semantic version (e.g., "1.0.0") |
| `description` | string | Brief description |
| `type` | string | Plugin type: "frontend", "python", or "hybrid" |
| `capabilities` | array | Features the plugin provides |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `author` | object | Author info (name, email, url) |
| `homepage` | string | Plugin homepage URL |
| `repository` | string | Source repository URL |
| `license` | string | License identifier |
| `keywords` | array | Search keywords |
| `icon` | string | Icon path or URL |
| `main` | string | TypeScript/JS entry point |
| `pythonMain` | string | Python entry point |
| `permissions` | array | Required permissions |
| `dependencies` | object | NPM dependencies |
| `pythonDependencies` | array | Python dependencies |

## Capabilities

Plugins can provide various capabilities:

| Capability | Description |
|------------|-------------|
| `tools` | Agent tools that can be called |
| `components` | UI components |
| `modes` | Custom agent modes |
| `commands` | User commands |
| `hooks` | Lifecycle hooks |
| `themes` | Visual themes |
| `processors` | Message processors |
| `providers` | Custom providers |
| `exporters` | Export formats |
| `importers` | Import formats |

## Permissions

Plugins must declare permissions for sensitive operations:

| Permission | Description |
|------------|-------------|
| `filesystem:read` | Read files |
| `filesystem:write` | Write files |
| `network:fetch` | Make HTTP requests |
| `network:websocket` | WebSocket connections |
| `clipboard:read` | Read clipboard |
| `clipboard:write` | Write clipboard |
| `notification` | Show notifications |
| `shell:execute` | Execute shell commands |
| `database:read` | Read database |
| `database:write` | Write database |
| `settings:read` | Read settings |
| `settings:write` | Write settings |

## Plugin Context API

Plugins receive a context object with useful APIs:

```typescript
export default definePlugin({
  hooks: {
    onLoad: async (context) => {
      // Logging
      context.logger.info('Plugin loaded');
      context.logger.error('Something went wrong');
      
      // Storage
      await context.storage.set('key', 'value');
      const value = await context.storage.get('key');
      
      // Events
      context.events.emit('my-event', { data: 'hello' });
      context.events.on('other-event', (data) => { ... });
      
      // Settings
      const settings = context.settings.get();
      await context.settings.set({ theme: 'dark' });
    }
  }
});
```

## Tools

Tools are functions that the AI agent can call:

```typescript
import { tool } from '@cognia/plugin-sdk';

const searchTool = tool({
  name: 'search',
  description: 'Search for information',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query'
      },
      limit: {
        type: 'number',
        description: 'Max results',
        default: 10
      }
    },
    required: ['query']
  },
  requiresApproval: false,
  execute: async ({ query, limit }) => {
    // Perform search
    const results = await performSearch(query, limit);
    return { results };
  }
});
```

## Lifecycle Hooks

Plugins can respond to lifecycle events:

```typescript
export default definePlugin({
  hooks: {
    // Called when plugin is loaded
    onLoad: async (context) => { },
    
    // Called when plugin is enabled
    onEnable: async (context) => { },
    
    // Called when plugin is disabled
    onDisable: async (context) => { },
    
    // Called when plugin is unloaded
    onUnload: async (context) => { },
    
    // Called when config changes
    onConfigChange: (config) => { }
  }
});
```

## Event Hooks

Plugins can subscribe to application events:

```typescript
export default definePlugin({
  hooks: {
    // Called before agent step
    onBeforeAgentStep: async (context, step) => {
      return step; // Can modify step
    },
    
    // Called after agent step
    onAfterAgentStep: async (context, step, result) => { },
    
    // Called on new message
    onMessage: async (context, message) => { },
    
    // Called on tool call
    onToolCall: async (context, tool, args) => { }
  }
});
```

## Python Plugins

Python plugins use the `@cognia/plugin-sdk` Python package:

```python
from cognia import Plugin, tool, hook

class MyPlugin(Plugin):
    name = "my-python-plugin"
    version = "1.0.0"
    
    @tool(
        name="process_data",
        description="Process data",
        parameters={
            "type": "object",
            "properties": {
                "data": {"type": "string"}
            },
            "required": ["data"]
        }
    )
    async def process_data(self, data: str):
        return {"result": data.upper()}
    
    @hook("on_agent_step")
    async def on_step(self, agent_id: str, step: dict):
        self.logger.info(f"Step: {step}")

__plugin__ = MyPlugin
```

## Hot Reload

During development, plugins support hot reload:

1. Enable developer mode in Cognia settings
2. Make changes to your plugin
3. The plugin automatically reloads

## Publishing

To publish your plugin to the marketplace:

1. Ensure your plugin.json is complete
2. Test your plugin thoroughly
3. Create a GitHub repository
4. Submit to the Cognia Plugin Registry

## Best Practices

1. **Use descriptive tool names** - Clear names help the AI understand when to use them
2. **Write good descriptions** - Descriptions are used by the AI for tool selection
3. **Handle errors gracefully** - Always catch and report errors properly
4. **Request minimal permissions** - Only request what you need
5. **Follow naming conventions** - Use kebab-case for plugin IDs
6. **Version semantically** - Follow semver for version numbers
7. **Document your plugin** - Include a README.md

## Examples

See the `plugin-sdk/examples` directory for complete examples:

- `basic-tool` - Simple tool plugin
- `python-plugin` - Python plugin example
- `web-search` - Web search tool

## Troubleshooting

### Plugin not loading

1. Check plugin.json for syntax errors
2. Verify the entry point file exists
3. Check the console for error messages

### Tool not appearing

1. Ensure `tools` is in capabilities
2. Verify tool name is unique
3. Check parameter schema is valid

### Permission errors

1. Add required permissions to plugin.json
2. Grant permissions in plugin settings

## API Reference

For detailed API documentation, see:

- [Plugin SDK TypeScript API](../api/plugin-sdk-typescript.md)
- [Plugin SDK Python API](../api/plugin-sdk-python.md)
- [Plugin Context API](../api/plugin-context.md)
