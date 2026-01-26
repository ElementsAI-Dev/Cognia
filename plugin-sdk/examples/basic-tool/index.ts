/**
 * Basic Tool Example Plugin
 * 
 * This example demonstrates how to create a simple plugin with tools
 * that can be used by the AI agent.
 */

import { definePlugin, tool } from '@cognia/plugin-sdk';

// Define the calculate tool
const calculateTool = tool({
  name: 'calculate',
  description: 'Perform basic math calculations',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['add', 'subtract', 'multiply', 'divide'],
        description: 'The math operation to perform',
      },
      a: {
        type: 'number',
        description: 'First operand',
      },
      b: {
        type: 'number',
        description: 'Second operand',
      },
    },
    required: ['operation', 'a', 'b'],
  },
  execute: async ({ operation, a, b }) => {
    switch (operation) {
      case 'add':
        return { result: a + b, expression: `${a} + ${b} = ${a + b}` };
      case 'subtract':
        return { result: a - b, expression: `${a} - ${b} = ${a - b}` };
      case 'multiply':
        return { result: a * b, expression: `${a} × ${b} = ${a * b}` };
      case 'divide':
        if (b === 0) {
          throw new Error('Division by zero is not allowed');
        }
        return { result: a / b, expression: `${a} ÷ ${b} = ${a / b}` };
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  },
});

// Define the format_text tool
const formatTextTool = tool({
  name: 'format_text',
  description: 'Format text in various ways',
  parameters: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The text to format',
      },
      format: {
        type: 'string',
        enum: ['uppercase', 'lowercase', 'titlecase', 'reverse'],
        description: 'The format to apply',
      },
    },
    required: ['text', 'format'],
  },
  execute: async ({ text, format }) => {
    switch (format) {
      case 'uppercase':
        return { result: text.toUpperCase() };
      case 'lowercase':
        return { result: text.toLowerCase() };
      case 'titlecase':
        return {
          result: text.replace(/\w\S*/g, (txt) =>
            txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
          ),
        };
      case 'reverse':
        return { result: text.split('').reverse().join('') };
      default:
        throw new Error(`Unknown format: ${format}`);
    }
  },
});

// Define and export the plugin
export default definePlugin({
  id: 'basic-tool-example',
  name: 'Basic Tool Example',
  version: '1.0.0',
  
  // Register tools
  tools: [calculateTool, formatTextTool],
  
  // Lifecycle hooks
  hooks: {
    onLoad: async (context) => {
      context.logger.info('Basic Tool Example plugin loaded');
    },
    
    onEnable: async (context) => {
      context.logger.info('Basic Tool Example plugin enabled');
    },
    
    onDisable: async (context) => {
      context.logger.info('Basic Tool Example plugin disabled');
    },
    
    onUnload: async (context) => {
      context.logger.info('Basic Tool Example plugin unloaded');
    },
  },
});
