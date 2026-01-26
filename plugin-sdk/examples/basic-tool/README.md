# Basic Tool Example

This example demonstrates how to create a simple Cognia plugin with tools that can be used by the AI agent.

## Features

- **calculate**: Perform basic math operations (add, subtract, multiply, divide)
- **format_text**: Format text in various ways (uppercase, lowercase, titlecase, reverse)

## Installation

1. Copy this directory to your Cognia plugins folder
2. Enable the plugin in Cognia settings

## Usage

Once enabled, the tools will be available to the AI agent. You can ask questions like:

- "Calculate 5 + 3"
- "What is 10 divided by 2?"
- "Convert 'hello world' to uppercase"
- "Reverse the text 'cognia'"

## Code Structure

```
basic-tool/
├── plugin.json    # Plugin manifest
├── index.ts       # Plugin entry point with tool definitions
└── README.md      # This file
```

## Tool Definitions

### calculate

```typescript
{
  operation: 'add' | 'subtract' | 'multiply' | 'divide',
  a: number,
  b: number
}
```

### format_text

```typescript
{
  text: string,
  format: 'uppercase' | 'lowercase' | 'titlecase' | 'reverse'
}
```

## Learning Points

1. **Plugin Definition**: Use `definePlugin()` to create a plugin
2. **Tool Creation**: Use `tool()` to define tools with parameters and execute functions
3. **Lifecycle Hooks**: Implement `onLoad`, `onEnable`, `onDisable`, `onUnload` for lifecycle management
4. **Type Safety**: Define parameter schemas for validation and documentation
