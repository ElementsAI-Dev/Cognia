---
description: Create Cognia plugins using the plugin SDK — tool definitions, handlers, manifest, and testing.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Parse Arguments**: Extract from user input:
   - Plugin name (required)
   - Plugin type: `tool` | `provider` | `integration`
   - Language: `typescript` (default) | `python`
   - Options: `--test`, `--example`

2. **Choose SDK**:
   - TypeScript plugins: `plugin-sdk/typescript/`
   - Python plugins: `plugin-sdk/python/`

3. **Create Plugin Directory**:

   ```
   plugins/<plugin-name>/
   ├── src/
   │   ├── index.ts           # Entry point
   │   └── tools/
   │       └── <tool-name>.ts # Tool implementations
   ├── plugin.json            # Plugin manifest
   ├── package.json           # Dependencies
   ├── tsconfig.json          # TypeScript config
   └── README.md              # Documentation
   ```

4. **Generate Plugin Manifest** (`plugin.json`):

   ```json
   {
     "name": "<plugin-name>",
     "version": "1.0.0",
     "description": "<Plugin description>",
     "author": "<author>",
     "license": "MIT",
     "main": "src/index.ts",
     "tools": [
       {
         "name": "<tool-name>",
         "description": "<Tool description>",
         "parameters": {
           "type": "object",
           "properties": {
             "input": {
               "type": "string",
               "description": "Input parameter"
             }
           },
           "required": ["input"]
         }
       }
     ],
     "settings": {
       "apiKey": {
         "type": "string",
         "description": "API key for the service",
         "required": false,
         "secret": true
       }
     }
   }
   ```

5. **Generate Entry Point** (`src/index.ts`):

   ```typescript
   import { Plugin, ToolHandler, ToolResult } from '@cognia/plugin-sdk'

   const plugin = new Plugin({
     name: '<plugin-name>',
     version: '1.0.0',
   })

   // Register tool handler
   plugin.registerTool('<tool-name>', async (params, context): Promise<ToolResult> => {
     const { input } = params

     try {
       // Tool implementation
       const result = await processInput(input)

       return {
         success: true,
         data: result,
       }
     } catch (error) {
       return {
         success: false,
         error: error instanceof Error ? error.message : 'Unknown error',
       }
     }
   })

   export default plugin
   ```

6. **Generate Tool Implementation** (`src/tools/<tool-name>.ts`):

   ```typescript
   import type { ToolHandler, ToolResult } from '@cognia/plugin-sdk'

   interface <ToolName>Params {
     input: string
     options?: {
       format?: 'json' | 'text'
       verbose?: boolean
     }
   }

   export const <toolName>Handler: ToolHandler<<ToolName>Params> = async (
     params,
     context
   ) => {
     const { input, options } = params
     const { settings, logger } = context

     logger.info(`Processing: ${input}`)

     // Implementation
     const result = await doWork(input, options)

     return {
       success: true,
       data: result,
       metadata: {
         processingTime: Date.now() - startTime,
       },
     }
   }
   ```

7. **Generate package.json**:

   ```json
   {
     "name": "@cognia-plugins/<plugin-name>",
     "version": "1.0.0",
     "type": "module",
     "main": "src/index.ts",
     "dependencies": {
       "@cognia/plugin-sdk": "workspace:*"
     },
     "devDependencies": {
       "typescript": "^5.0.0"
     }
   }
   ```

8. **Generate Tests** (if `--test`):

   ```typescript
   import { describe, it, expect } from 'vitest'
   import plugin from '../src/index'

   describe('<plugin-name>', () => {
     it('should register tools', () => {
       expect(plugin.getTools()).toContain('<tool-name>')
     })

     it('should handle valid input', async () => {
       const result = await plugin.executeTool('<tool-name>', {
         input: 'test input',
       })

       expect(result.success).toBe(true)
       expect(result.data).toBeDefined()
     })

     it('should handle errors gracefully', async () => {
       const result = await plugin.executeTool('<tool-name>', {
         input: '',
       })

       expect(result.success).toBe(false)
       expect(result.error).toBeDefined()
     })
   })
   ```

9. **Generate README.md**:

   ```markdown
   # <Plugin Name>

   <Description>

   ## Installation

   This plugin is installed via the Cognia plugin manager.

   ## Configuration

   | Setting | Type | Required | Description |
   |---------|------|----------|-------------|
   | `apiKey` | string | No | API key for the service |

   ## Tools

   ### <tool-name>

   <Tool description>

   **Parameters**:
   - `input` (string, required): Input to process

   **Returns**: Processed result

   ## Examples

   [Usage examples]
   ```

## Reference Plugins

| Plugin | Location | Description |
|--------|----------|-------------|
| `ai-tools` | `plugins/ai-tools/` | AI utility tools |
| `git-tools` | `plugins/git-tools/` | Git operations |
| `docker-tools` | `plugins/docker-tools/` | Docker management |
| `notification-tools` | `plugins/notification-tools/` | Notifications |

## Plugin SDK API

```typescript
// Core types
interface Plugin {
  registerTool(name: string, handler: ToolHandler): void
  getTools(): string[]
  executeTool(name: string, params: unknown): Promise<ToolResult>
}

interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
  metadata?: Record<string, unknown>
}

interface ToolContext {
  settings: Record<string, unknown>
  logger: Logger
  session: SessionInfo
}
```

## Notes

- Study existing plugins in `plugins/` for patterns
- Use the plugin SDK types for type safety
- Handle all errors gracefully — never throw from tool handlers
- Log operations for debugging: `context.logger.info()`
- Keep plugins focused — one concern per plugin
- Settings marked `secret: true` are encrypted in storage
- Test plugins independently before integration
