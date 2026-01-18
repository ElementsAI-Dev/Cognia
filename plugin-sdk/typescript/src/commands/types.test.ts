/**
 * Command Types Tests
 *
 * @description Tests for command type definitions.
 */

import type { PluginCommand } from './types';

describe('Command Types', () => {
  describe('PluginCommand', () => {
    it('should create a valid command', () => {
      const command: PluginCommand = {
        id: 'my-plugin.do-something',
        name: 'Do Something',
        description: 'Does something useful',
        icon: 'zap',
        shortcut: 'Ctrl+Shift+D',
        execute: jest.fn(),
      };

      expect(command.id).toBe('my-plugin.do-something');
      expect(command.name).toBe('Do Something');
      expect(command.description).toBe('Does something useful');
      expect(command.icon).toBe('zap');
      expect(command.shortcut).toBe('Ctrl+Shift+D');
      expect(typeof command.execute).toBe('function');
    });

    it('should create a minimal command', () => {
      const command: PluginCommand = {
        id: 'simple-command',
        name: 'Simple Command',
        execute: jest.fn(),
      };

      expect(command.id).toBe('simple-command');
      expect(command.name).toBe('Simple Command');
      expect(command.description).toBeUndefined();
      expect(command.icon).toBeUndefined();
      expect(command.shortcut).toBeUndefined();
    });

    it('should execute command without arguments', async () => {
      const execute = jest.fn();
      const command: PluginCommand = {
        id: 'test-command',
        name: 'Test Command',
        execute,
      };

      await command.execute();
      expect(execute).toHaveBeenCalled();
    });

    it('should execute command with arguments', async () => {
      const execute = jest.fn();
      const command: PluginCommand = {
        id: 'test-command',
        name: 'Test Command',
        execute,
      };

      await command.execute({ target: 'file.txt', force: true });
      expect(execute).toHaveBeenCalledWith({ target: 'file.txt', force: true });
    });

    it('should support async execute', async () => {
      const execute = jest.fn().mockResolvedValue(undefined);
      const command: PluginCommand = {
        id: 'async-command',
        name: 'Async Command',
        execute,
      };

      await command.execute();
      expect(execute).toHaveBeenCalled();
    });

    it('should support enabled as boolean', () => {
      const command: PluginCommand = {
        id: 'disabled-command',
        name: 'Disabled Command',
        enabled: false,
        execute: jest.fn(),
      };

      expect(command.enabled).toBe(false);
    });

    it('should support enabled as function', () => {
      let isEnabled = true;
      const command: PluginCommand = {
        id: 'dynamic-command',
        name: 'Dynamic Command',
        enabled: () => isEnabled,
        execute: jest.fn(),
      };

      expect(typeof command.enabled).toBe('function');
      if (typeof command.enabled === 'function') {
        expect(command.enabled()).toBe(true);
        isEnabled = false;
        expect(command.enabled()).toBe(false);
      }
    });

    it('should create command with all fields', () => {
      const command: PluginCommand = {
        id: 'full-command',
        name: 'Full Command',
        description: 'A fully featured command',
        icon: 'terminal',
        shortcut: 'Ctrl+Alt+F',
        enabled: true,
        execute: jest.fn(),
      };

      expect(command.id).toBe('full-command');
      expect(command.name).toBe('Full Command');
      expect(command.description).toBe('A fully featured command');
      expect(command.icon).toBe('terminal');
      expect(command.shortcut).toBe('Ctrl+Alt+F');
      expect(command.enabled).toBe(true);
    });

    it('should support various shortcut formats', () => {
      const commands: PluginCommand[] = [
        { id: 'cmd1', name: 'Command 1', shortcut: 'Ctrl+K', execute: jest.fn() },
        { id: 'cmd2', name: 'Command 2', shortcut: 'Ctrl+Shift+P', execute: jest.fn() },
        { id: 'cmd3', name: 'Command 3', shortcut: 'Alt+Enter', execute: jest.fn() },
        { id: 'cmd4', name: 'Command 4', shortcut: 'Cmd+S', execute: jest.fn() },
        { id: 'cmd5', name: 'Command 5', shortcut: 'F5', execute: jest.fn() },
      ];

      expect(commands[0].shortcut).toBe('Ctrl+K');
      expect(commands[1].shortcut).toBe('Ctrl+Shift+P');
      expect(commands[2].shortcut).toBe('Alt+Enter');
      expect(commands[3].shortcut).toBe('Cmd+S');
      expect(commands[4].shortcut).toBe('F5');
    });

    it('should support various icon names', () => {
      const commands: PluginCommand[] = [
        { id: 'cmd1', name: 'Play', icon: 'play', execute: jest.fn() },
        { id: 'cmd2', name: 'Save', icon: 'save', execute: jest.fn() },
        { id: 'cmd3', name: 'Search', icon: 'search', execute: jest.fn() },
        { id: 'cmd4', name: 'Settings', icon: 'settings', execute: jest.fn() },
        { id: 'cmd5', name: 'Help', icon: 'help-circle', execute: jest.fn() },
      ];

      expect(commands[0].icon).toBe('play');
      expect(commands[1].icon).toBe('save');
      expect(commands[2].icon).toBe('search');
      expect(commands[3].icon).toBe('settings');
      expect(commands[4].icon).toBe('help-circle');
    });

    it('should handle command execution errors', async () => {
      const error = new Error('Command failed');
      const execute = jest.fn().mockRejectedValue(error);
      const command: PluginCommand = {
        id: 'failing-command',
        name: 'Failing Command',
        execute,
      };

      await expect(command.execute()).rejects.toThrow('Command failed');
    });
  });
});
