/**
 * Core Types Tests
 *
 * @description Tests for core plugin type definitions.
 * Since these are TypeScript type-only definitions, we test:
 * - Type exports are available
 * - Type compatibility with expected values
 * - Type constraints are properly enforced at compile time
 */

import type {
  PluginType,
  PluginCapability,
  PluginStatus,
  PluginSource,
  PluginPermission,
  ExtendedPluginPermission,
} from './types';

describe('Core Types', () => {
  describe('PluginType', () => {
    it('should allow valid plugin types', () => {
      const frontendType: PluginType = 'frontend';
      const pythonType: PluginType = 'python';
      const hybridType: PluginType = 'hybrid';

      expect(frontendType).toBe('frontend');
      expect(pythonType).toBe('python');
      expect(hybridType).toBe('hybrid');
    });

    it('should cover all expected plugin types', () => {
      const allTypes: PluginType[] = ['frontend', 'python', 'hybrid'];
      expect(allTypes).toHaveLength(3);
    });
  });

  describe('PluginCapability', () => {
    it('should allow valid capabilities', () => {
      const capabilities: PluginCapability[] = [
        'tools',
        'components',
        'modes',
        'skills',
        'themes',
        'commands',
        'hooks',
        'processors',
        'providers',
        'exporters',
        'importers',
        'a2ui',
        'python',
      ];

      expect(capabilities).toContain('tools');
      expect(capabilities).toContain('components');
      expect(capabilities).toContain('modes');
      expect(capabilities).toContain('skills');
      expect(capabilities).toContain('themes');
      expect(capabilities).toContain('commands');
      expect(capabilities).toContain('hooks');
      expect(capabilities).toContain('processors');
      expect(capabilities).toContain('providers');
      expect(capabilities).toContain('exporters');
      expect(capabilities).toContain('importers');
      expect(capabilities).toContain('a2ui');
      expect(capabilities).toContain('python');
      expect(capabilities).toHaveLength(13);
    });
  });

  describe('PluginStatus', () => {
    it('should allow valid status values', () => {
      const statuses: PluginStatus[] = [
        'discovered',
        'installed',
        'loading',
        'loaded',
        'enabling',
        'enabled',
        'disabling',
        'disabled',
        'unloading',
        'error',
        'updating',
      ];

      expect(statuses).toContain('discovered');
      expect(statuses).toContain('installed');
      expect(statuses).toContain('loading');
      expect(statuses).toContain('loaded');
      expect(statuses).toContain('enabling');
      expect(statuses).toContain('enabled');
      expect(statuses).toContain('disabling');
      expect(statuses).toContain('disabled');
      expect(statuses).toContain('unloading');
      expect(statuses).toContain('error');
      expect(statuses).toContain('updating');
      expect(statuses).toHaveLength(11);
    });

    it('should represent a complete lifecycle', () => {
      // Test a typical lifecycle flow
      const lifecycle: PluginStatus[] = ['discovered', 'loading', 'loaded', 'enabling', 'enabled'];
      expect(lifecycle[0]).toBe('discovered');
      expect(lifecycle[lifecycle.length - 1]).toBe('enabled');
    });
  });

  describe('PluginSource', () => {
    it('should allow valid source values', () => {
      const sources: PluginSource[] = ['builtin', 'local', 'marketplace', 'git', 'dev'];

      expect(sources).toContain('builtin');
      expect(sources).toContain('local');
      expect(sources).toContain('marketplace');
      expect(sources).toContain('git');
      expect(sources).toContain('dev');
      expect(sources).toHaveLength(5);
    });
  });

  describe('PluginPermission', () => {
    it('should allow valid permission values', () => {
      const permissions: PluginPermission[] = [
        'filesystem:read',
        'filesystem:write',
        'network:fetch',
        'network:websocket',
        'clipboard:read',
        'clipboard:write',
        'notification',
        'shell:execute',
        'process:spawn',
        'database:read',
        'database:write',
        'settings:read',
        'settings:write',
        'session:read',
        'session:write',
        'agent:control',
        'python:execute',
      ];

      expect(permissions).toContain('filesystem:read');
      expect(permissions).toContain('filesystem:write');
      expect(permissions).toContain('network:fetch');
      expect(permissions).toContain('network:websocket');
      expect(permissions).toContain('clipboard:read');
      expect(permissions).toContain('clipboard:write');
      expect(permissions).toContain('notification');
      expect(permissions).toContain('shell:execute');
      expect(permissions).toContain('process:spawn');
      expect(permissions).toContain('database:read');
      expect(permissions).toContain('database:write');
      expect(permissions).toContain('settings:read');
      expect(permissions).toContain('settings:write');
      expect(permissions).toContain('session:read');
      expect(permissions).toContain('session:write');
      expect(permissions).toContain('agent:control');
      expect(permissions).toContain('python:execute');
      expect(permissions).toHaveLength(17);
    });

    it('should have proper permission categories', () => {
      const filesystemPermissions: PluginPermission[] = ['filesystem:read', 'filesystem:write'];
      const networkPermissions: PluginPermission[] = ['network:fetch', 'network:websocket'];
      const clipboardPermissions: PluginPermission[] = ['clipboard:read', 'clipboard:write'];
      const databasePermissions: PluginPermission[] = ['database:read', 'database:write'];
      const settingsPermissions: PluginPermission[] = ['settings:read', 'settings:write'];
      const sessionPermissions: PluginPermission[] = ['session:read', 'session:write'];

      expect(filesystemPermissions).toHaveLength(2);
      expect(networkPermissions).toHaveLength(2);
      expect(clipboardPermissions).toHaveLength(2);
      expect(databasePermissions).toHaveLength(2);
      expect(settingsPermissions).toHaveLength(2);
      expect(sessionPermissions).toHaveLength(2);
    });
  });

  describe('ExtendedPluginPermission', () => {
    it('should allow valid extended permission values', () => {
      const extendedPermissions: ExtendedPluginPermission[] = [
        'session:read',
        'session:write',
        'session:delete',
        'project:read',
        'project:write',
        'project:delete',
        'vector:read',
        'vector:write',
        'canvas:read',
        'canvas:write',
        'artifact:read',
        'artifact:write',
        'ai:chat',
        'ai:embed',
        'export:session',
        'export:project',
        'theme:read',
        'theme:write',
        'extension:ui',
        'notification:show',
      ];

      expect(extendedPermissions).toContain('session:delete');
      expect(extendedPermissions).toContain('project:delete');
      expect(extendedPermissions).toContain('vector:read');
      expect(extendedPermissions).toContain('canvas:write');
      expect(extendedPermissions).toContain('ai:chat');
      expect(extendedPermissions).toContain('export:session');
      expect(extendedPermissions).toContain('theme:write');
      expect(extendedPermissions).toContain('extension:ui');
      expect(extendedPermissions).toContain('notification:show');
      expect(extendedPermissions).toHaveLength(20);
    });

    it('should have proper extended permission categories', () => {
      const sessionPermissions: ExtendedPluginPermission[] = [
        'session:read',
        'session:write',
        'session:delete',
      ];
      const projectPermissions: ExtendedPluginPermission[] = [
        'project:read',
        'project:write',
        'project:delete',
      ];
      const vectorPermissions: ExtendedPluginPermission[] = ['vector:read', 'vector:write'];
      const canvasPermissions: ExtendedPluginPermission[] = ['canvas:read', 'canvas:write'];
      const artifactPermissions: ExtendedPluginPermission[] = ['artifact:read', 'artifact:write'];
      const aiPermissions: ExtendedPluginPermission[] = ['ai:chat', 'ai:embed'];
      const exportPermissions: ExtendedPluginPermission[] = ['export:session', 'export:project'];
      const themePermissions: ExtendedPluginPermission[] = ['theme:read', 'theme:write'];

      expect(sessionPermissions).toHaveLength(3);
      expect(projectPermissions).toHaveLength(3);
      expect(vectorPermissions).toHaveLength(2);
      expect(canvasPermissions).toHaveLength(2);
      expect(artifactPermissions).toHaveLength(2);
      expect(aiPermissions).toHaveLength(2);
      expect(exportPermissions).toHaveLength(2);
      expect(themePermissions).toHaveLength(2);
    });
  });
});
