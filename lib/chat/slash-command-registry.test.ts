/**
 * Tests for Slash Command Registry
 */

import {
  slashCommandRegistry,
  registerCommand,
  unregisterCommand,
  getCommand,
  getAllCommands,
  getGroupedCommands,
  searchCommands,
  parseSlashCommand,
  executeCommand,
} from './slash-command-registry';
import type { SlashCommandDefinition } from '@/types/chat/slash-commands';

// Mock plugin lifecycle hooks
const mockDispatchOnCommand = jest.fn().mockResolvedValue(false);
jest.mock('@/lib/plugin', () => ({
  getPluginLifecycleHooks: () => ({
    dispatchOnCommand: mockDispatchOnCommand,
  }),
}));

describe('slashCommandRegistry', () => {
  // Store original commands to restore after tests
  const originalCommands = getAllCommands();

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up any test commands
    slashCommandRegistry.clear();
    // Restore original commands
    for (const cmd of originalCommands) {
      slashCommandRegistry.register(cmd);
    }
  });

  describe('built-in commands', () => {
    it('should have built-in commands registered', () => {
      const commands = getAllCommands();
      expect(commands.length).toBeGreaterThan(0);
    });

    it('should include common commands like clear, help, image', () => {
      expect(getCommand('clear')).toBeDefined();
      expect(getCommand('help')).toBeDefined();
      expect(getCommand('image')).toBeDefined();
    });

    it('should support command aliases', () => {
      const clearCmd = getCommand('cls');
      expect(clearCmd).toBeDefined();
      expect(clearCmd?.command).toBe('clear');
    });
  });

  describe('register/unregister', () => {
    it('should register a new command', () => {
      const testCommand: SlashCommandDefinition = {
        id: 'test-cmd',
        command: 'testcmd',
        description: 'A test command',
        category: 'custom',
        handler: () => ({ success: true }),
      };

      registerCommand(testCommand);
      expect(getCommand('testcmd')).toBeDefined();
      expect(getCommand('testcmd')?.id).toBe('test-cmd');
    });

    it('should register command with aliases', () => {
      const testCommand: SlashCommandDefinition = {
        id: 'test-alias',
        command: 'testalias',
        description: 'A test command with aliases',
        category: 'custom',
        aliases: ['ta', 'testalias2'],
        handler: () => ({ success: true }),
      };

      registerCommand(testCommand);
      expect(getCommand('ta')).toBeDefined();
      expect(getCommand('testalias2')).toBeDefined();
      expect(getCommand('ta')?.command).toBe('testalias');
    });

    it('should unregister a command', () => {
      const testCommand: SlashCommandDefinition = {
        id: 'to-remove',
        command: 'toremove',
        description: 'A command to remove',
        category: 'custom',
        handler: () => ({ success: true }),
      };

      registerCommand(testCommand);
      expect(getCommand('toremove')).toBeDefined();

      unregisterCommand('toremove');
      expect(getCommand('toremove')).toBeUndefined();
    });
  });

  describe('search', () => {
    it('should search commands by name', () => {
      const results = searchCommands('clear');
      expect(results.some((r) => r.command === 'clear')).toBe(true);
    });

    it('should search commands by description', () => {
      const results = searchCommands('conversation');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return all commands for empty query', () => {
      const results = searchCommands('');
      expect(results.length).toBe(getAllCommands().length);
    });

    it('should search by alias', () => {
      const results = searchCommands('cls');
      expect(results.some((r) => r.command === 'clear')).toBe(true);
    });
  });

  describe('getGroupedCommands', () => {
    it('should return commands grouped by category', () => {
      const groups = getGroupedCommands();
      expect(groups.length).toBeGreaterThan(0);

      for (const group of groups) {
        expect(group.category).toBeDefined();
        expect(group.label).toBeDefined();
        expect(group.commands.length).toBeGreaterThan(0);
      }
    });

    it('should have proper category labels', () => {
      const groups = getGroupedCommands();
      const chatGroup = groups.find((g) => g.category === 'chat');
      expect(chatGroup?.label).toBe('Chat');
    });
  });

  describe('parseSlashCommand', () => {
    it('should parse simple command', () => {
      const result = parseSlashCommand('/clear');
      expect(result).toBeDefined();
      expect(result?.command).toBe('clear');
      expect(result?.startIndex).toBe(0);
    });

    it('should parse command with arguments', () => {
      const result = parseSlashCommand('/image a sunset over mountains');
      expect(result).toBeDefined();
      expect(result?.command).toBe('image');
      expect(result?.rawArgs).toBe('a sunset over mountains');
    });

    it('should parse command in middle of text', () => {
      const result = parseSlashCommand('hello /help me', 14);
      expect(result).toBeDefined();
      expect(result?.command).toBe('help');
    });

    it('should not parse when / is part of a word', () => {
      const result = parseSlashCommand('http://example.com', 18);
      expect(result).toBeNull();
    });

    it('should parse positional arguments', () => {
      const result = parseSlashCommand('/translate chinese hello world');
      expect(result?.args.arg0).toBe('chinese');
      expect(result?.args.arg1).toBe('hello');
      expect(result?.args.arg2).toBe('world');
    });
  });

  describe('executeCommand', () => {
    it('should execute a valid command', async () => {
      const result = await executeCommand('clear', {}, {
        input: '',
        messageCount: 5,
        mode: 'chat',
      });

      expect(result.success).toBe(true);
      expect((result.data as Record<string, unknown>)?.action).toBe('clear-conversation');
    });

    it('should return error for unknown command', async () => {
      const result = await executeCommand('unknowncommand123', {}, {
        input: '',
        messageCount: 0,
        mode: 'chat',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown command');
    });

    it('should pass arguments to handler', async () => {
      const result = await executeCommand('image', { arg0: 'a cat' }, {
        input: '',
        messageCount: 0,
        mode: 'chat',
      });

      expect(result.success).toBe(true);
      expect(result.newInput).toContain('a cat');
    });

    it('should dispatch plugin hook before executing command', async () => {
      await executeCommand('clear', {}, {
        input: '',
        messageCount: 5,
        mode: 'chat',
      });

      expect(mockDispatchOnCommand).toHaveBeenCalledWith('clear', []);
    });

    it('should short-circuit when plugin handles the command', async () => {
      mockDispatchOnCommand.mockResolvedValueOnce(true);

      const result = await executeCommand('clear', {}, {
        input: '',
        messageCount: 5,
        mode: 'chat',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('handled by plugin');
    });

    it('should proceed to built-in handler when plugin does not handle', async () => {
      mockDispatchOnCommand.mockResolvedValueOnce(false);

      const result = await executeCommand('clear', {}, {
        input: '',
        messageCount: 5,
        mode: 'chat',
      });

      expect(result.success).toBe(true);
      // Should have the built-in clear action, not plugin message
      expect(result.message).not.toContain('handled by plugin');
    });
  });
});
