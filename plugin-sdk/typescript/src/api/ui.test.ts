/**
 * UI API Tests
 *
 * @description Tests for UI API type definitions.
 */

import type {
  PluginUIAPI,
  PluginNotification,
  PluginDialog,
  PluginInputDialog,
  PluginConfirmDialog,
  PluginStatusBarItem,
  PluginSidebarPanel,
  PluginShortcutsAPI,
  ShortcutOptions,
  ShortcutRegistration,
  PluginContextMenuAPI,
  ContextMenuItem,
  ContextMenuClickContext,
  PluginWindowAPI,
  WindowOptions,
  PluginWindow,
  PluginSecretsAPI,
} from './ui';

describe('UI API Types', () => {
  describe('PluginNotification', () => {
    it('should create a valid notification', () => {
      const notification: PluginNotification = {
        title: 'Success',
        body: 'Operation completed successfully',
        icon: 'check',
        timeout: 5000,
        actions: [
          { label: 'View', action: 'view' },
          { label: 'Dismiss', action: 'dismiss' },
        ],
      };

      expect(notification.title).toBe('Success');
      expect(notification.body).toBe('Operation completed successfully');
      expect(notification.timeout).toBe(5000);
      expect(notification.actions).toHaveLength(2);
    });

    it('should create a minimal notification', () => {
      const notification: PluginNotification = {
        title: 'Alert',
        body: 'Something happened',
      };

      expect(notification.icon).toBeUndefined();
      expect(notification.timeout).toBeUndefined();
      expect(notification.actions).toBeUndefined();
    });
  });

  describe('PluginDialog', () => {
    it('should create a valid dialog', () => {
      const dialog: PluginDialog = {
        title: 'Confirm Action',
        content: 'Are you sure?',
        actions: [
          { label: 'Cancel', value: false },
          { label: 'Confirm', value: true, variant: 'primary' },
        ],
      };

      expect(dialog.title).toBe('Confirm Action');
      expect(dialog.actions).toHaveLength(2);
    });
  });

  describe('PluginInputDialog', () => {
    it('should create a valid input dialog', () => {
      const dialog: PluginInputDialog = {
        title: 'Enter Name',
        message: 'Please enter your name:',
        placeholder: 'John Doe',
        defaultValue: '',
        validate: (value) => (value.length < 2 ? 'Name too short' : null),
      };

      expect(dialog.title).toBe('Enter Name');
      expect(dialog.validate).toBeDefined();
      expect(dialog.validate?.('A')).toBe('Name too short');
      expect(dialog.validate?.('John')).toBeNull();
    });
  });

  describe('PluginConfirmDialog', () => {
    it('should create a valid confirm dialog', () => {
      const dialog: PluginConfirmDialog = {
        title: 'Delete Item',
        message: 'Are you sure you want to delete this item?',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        variant: 'destructive',
      };

      expect(dialog.variant).toBe('destructive');
      expect(dialog.confirmLabel).toBe('Delete');
    });
  });

  describe('PluginStatusBarItem', () => {
    it('should create a valid status bar item', () => {
      const item: PluginStatusBarItem = {
        id: 'my-status',
        text: 'Ready',
        icon: 'check',
        tooltip: 'Plugin is ready',
        onClick: jest.fn(),
        priority: 100,
      };

      expect(item.id).toBe('my-status');
      expect(item.text).toBe('Ready');
      expect(item.onClick).toBeDefined();
    });
  });

  describe('PluginSidebarPanel', () => {
    it('should create a valid sidebar panel', () => {
      const panel: PluginSidebarPanel = {
        id: 'my-panel',
        title: 'My Panel',
        icon: 'layout-sidebar',
        component: () => null,
        position: 'top',
      };

      expect(panel.id).toBe('my-panel');
      expect(panel.position).toBe('top');
    });
  });

  describe('ShortcutOptions', () => {
    it('should create valid shortcut options', () => {
      const options: ShortcutOptions = {
        when: 'editorFocus',
        preventDefault: true,
        description: 'Do something',
      };

      expect(options.when).toBe('editorFocus');
      expect(options.preventDefault).toBe(true);
    });
  });

  describe('ShortcutRegistration', () => {
    it('should create valid shortcut registration', () => {
      const registration: ShortcutRegistration = {
        shortcut: 'Ctrl+K',
        callback: jest.fn(),
        options: { description: 'Open command palette' },
      };

      expect(registration.shortcut).toBe('Ctrl+K');
      expect(registration.callback).toBeDefined();
    });
  });

  describe('PluginShortcutsAPI', () => {
    it('should define all required API methods', () => {
      const mockAPI: PluginShortcutsAPI = {
        register: jest.fn(),
        registerMany: jest.fn(),
        isAvailable: jest.fn(),
        getRegistered: jest.fn(),
      };

      expect(mockAPI.register).toBeDefined();
      expect(mockAPI.registerMany).toBeDefined();
      expect(mockAPI.isAvailable).toBeDefined();
      expect(mockAPI.getRegistered).toBeDefined();
    });

    it('should register shortcuts', () => {
      const unregister = jest.fn();
      const mockAPI: PluginShortcutsAPI = {
        register: jest.fn().mockReturnValue(unregister),
        registerMany: jest.fn(),
        isAvailable: jest.fn().mockReturnValue(true),
        getRegistered: jest.fn(),
      };

      const result = mockAPI.register('Ctrl+Shift+D', jest.fn(), {
        description: 'Do something',
      });

      expect(result).toBe(unregister);
      expect(mockAPI.isAvailable('Ctrl+Shift+D')).toBe(true);
    });
  });

  describe('ContextMenuItem', () => {
    it('should create valid context menu item', () => {
      const item: ContextMenuItem = {
        id: 'copy-text',
        label: 'Copy',
        icon: 'copy',
        when: 'chat:message',
        onClick: jest.fn(),
      };

      expect(item.id).toBe('copy-text');
      expect(item.label).toBe('Copy');
    });

    it('should create item with submenu', () => {
      const item: ContextMenuItem = {
        id: 'actions',
        label: 'Actions',
        onClick: jest.fn(),
        submenu: [
          { id: 'action1', label: 'Action 1', onClick: jest.fn() },
          { id: 'action2', label: 'Action 2', onClick: jest.fn() },
        ],
      };

      expect(item.submenu).toHaveLength(2);
    });

    it('should support disabled state as function', () => {
      const item: ContextMenuItem = {
        id: 'paste',
        label: 'Paste',
        onClick: jest.fn(),
        disabled: (context) => !context.selection,
      };

      expect(typeof item.disabled).toBe('function');
      if (typeof item.disabled === 'function') {
        expect(item.disabled({ target: 'message' })).toBe(true);
        expect(item.disabled({ target: 'message', selection: 'text' })).toBe(false);
      }
    });
  });

  describe('ContextMenuClickContext', () => {
    it('should create valid click context', () => {
      const context: ContextMenuClickContext = {
        target: 'chat:message',
        selection: 'selected text',
        messageId: 'msg-123',
        sessionId: 'session-456',
        position: { x: 100, y: 200 },
      };

      expect(context.target).toBe('chat:message');
      expect(context.selection).toBe('selected text');
      expect(context.position?.x).toBe(100);
    });
  });

  describe('PluginContextMenuAPI', () => {
    it('should define all required API methods', () => {
      const mockAPI: PluginContextMenuAPI = {
        register: jest.fn(),
        registerMany: jest.fn(),
      };

      expect(mockAPI.register).toBeDefined();
      expect(mockAPI.registerMany).toBeDefined();
    });
  });

  describe('WindowOptions', () => {
    it('should create valid window options', () => {
      const options: WindowOptions = {
        title: 'My Window',
        width: 800,
        height: 600,
        minWidth: 400,
        minHeight: 300,
        center: true,
        resizable: true,
        alwaysOnTop: false,
      };

      expect(options.title).toBe('My Window');
      expect(options.width).toBe(800);
      expect(options.center).toBe(true);
    });
  });

  describe('PluginWindow', () => {
    it('should define all window methods', () => {
      const mockWindow: PluginWindow = {
        id: 'window-1',
        title: 'Test Window',
        setTitle: jest.fn(),
        close: jest.fn(),
        minimize: jest.fn(),
        maximize: jest.fn(),
        unmaximize: jest.fn(),
        isMaximized: jest.fn().mockReturnValue(false),
        setSize: jest.fn(),
        getSize: jest.fn().mockReturnValue({ width: 800, height: 600 }),
        setPosition: jest.fn(),
        getPosition: jest.fn().mockReturnValue({ x: 100, y: 100 }),
        center: jest.fn(),
        setAlwaysOnTop: jest.fn(),
        show: jest.fn(),
        hide: jest.fn(),
        onClose: jest.fn(),
      };

      expect(mockWindow.id).toBe('window-1');
      expect(mockWindow.getSize()).toEqual({ width: 800, height: 600 });
      expect(mockWindow.isMaximized()).toBe(false);
    });
  });

  describe('PluginWindowAPI', () => {
    it('should define all required API methods', () => {
      const mockAPI: PluginWindowAPI = {
        create: jest.fn(),
        getMain: jest.fn(),
        getAll: jest.fn(),
        focus: jest.fn(),
      };

      expect(mockAPI.create).toBeDefined();
      expect(mockAPI.getMain).toBeDefined();
      expect(mockAPI.getAll).toBeDefined();
      expect(mockAPI.focus).toBeDefined();
    });
  });

  describe('PluginSecretsAPI', () => {
    it('should define all required API methods', () => {
      const mockAPI: PluginSecretsAPI = {
        store: jest.fn(),
        get: jest.fn(),
        delete: jest.fn(),
        has: jest.fn(),
      };

      expect(mockAPI.store).toBeDefined();
      expect(mockAPI.get).toBeDefined();
      expect(mockAPI.delete).toBeDefined();
      expect(mockAPI.has).toBeDefined();
    });

    it('should handle secret operations', async () => {
      const mockAPI: PluginSecretsAPI = {
        store: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue('secret-value'),
        delete: jest.fn().mockResolvedValue(undefined),
        has: jest.fn().mockResolvedValue(true),
      };

      await mockAPI.store('apiKey', 'sk-123');
      expect(mockAPI.store).toHaveBeenCalledWith('apiKey', 'sk-123');

      const value = await mockAPI.get('apiKey');
      expect(value).toBe('secret-value');

      const exists = await mockAPI.has('apiKey');
      expect(exists).toBe(true);

      await mockAPI.delete('apiKey');
      expect(mockAPI.delete).toHaveBeenCalledWith('apiKey');
    });
  });

  describe('PluginUIAPI', () => {
    it('should define all required API methods', () => {
      const mockAPI: PluginUIAPI = {
        showNotification: jest.fn(),
        showToast: jest.fn(),
        showDialog: jest.fn(),
        showInputDialog: jest.fn(),
        showConfirmDialog: jest.fn(),
        registerStatusBarItem: jest.fn(),
        registerSidebarPanel: jest.fn(),
      };

      expect(mockAPI.showNotification).toBeDefined();
      expect(mockAPI.showToast).toBeDefined();
      expect(mockAPI.showDialog).toBeDefined();
      expect(mockAPI.showInputDialog).toBeDefined();
      expect(mockAPI.showConfirmDialog).toBeDefined();
      expect(mockAPI.registerStatusBarItem).toBeDefined();
      expect(mockAPI.registerSidebarPanel).toBeDefined();
    });

    it('should call UI methods correctly', async () => {
      const mockAPI: PluginUIAPI = {
        showNotification: jest.fn(),
        showToast: jest.fn(),
        showDialog: jest.fn().mockResolvedValue('ok'),
        showInputDialog: jest.fn().mockResolvedValue('user input'),
        showConfirmDialog: jest.fn().mockResolvedValue(true),
        registerStatusBarItem: jest.fn().mockReturnValue(jest.fn()),
        registerSidebarPanel: jest.fn().mockReturnValue(jest.fn()),
      };

      mockAPI.showNotification({ title: 'Test', body: 'Body' });
      expect(mockAPI.showNotification).toHaveBeenCalled();

      mockAPI.showToast('Message', 'success');
      expect(mockAPI.showToast).toHaveBeenCalledWith('Message', 'success');

      const confirmed = await mockAPI.showConfirmDialog({
        title: 'Confirm',
        message: 'Are you sure?',
      });
      expect(confirmed).toBe(true);

      const input = await mockAPI.showInputDialog({
        title: 'Enter Value',
      });
      expect(input).toBe('user input');
    });
  });
});
