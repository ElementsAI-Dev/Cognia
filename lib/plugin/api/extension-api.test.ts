/**
 * Tests for Extension Points Plugin API
 */

import React from 'react';
import {
  createExtensionAPI,
  getExtensionsForPoint,
  clearPluginExtensions,
} from './extension-api';
import type { ExtensionPoint, ExtensionProps } from '@/types/plugin/plugin-extended';

describe('Extension API', () => {
  const testPluginId = 'test-plugin';

  beforeEach(() => {
    // Clear all extensions before each test
    clearPluginExtensions(testPluginId);
    clearPluginExtensions('other-plugin');
  });

  describe('createExtensionAPI', () => {
    it('should create an API object with all expected methods', () => {
      const api = createExtensionAPI(testPluginId);

      expect(api).toBeDefined();
      expect(typeof api.registerExtension).toBe('function');
      expect(typeof api.getExtensions).toBe('function');
      expect(typeof api.hasExtensions).toBe('function');
    });
  });

  describe('registerExtension', () => {
    it('should register an extension at a point', () => {
      const api = createExtensionAPI(testPluginId);
      const TestComponent: React.ComponentType<ExtensionProps> = () => null;

      const unregister = api.registerExtension('sidebar:top' as ExtensionPoint, TestComponent);

      expect(typeof unregister).toBe('function');
      expect(api.hasExtensions('sidebar:top' as ExtensionPoint)).toBe(true);
    });

    it('should unregister extension when cleanup is called', () => {
      const api = createExtensionAPI(testPluginId);
      const TestComponent: React.ComponentType<ExtensionProps> = () => null;

      const unregister = api.registerExtension('sidebar:top' as ExtensionPoint, TestComponent);
      expect(api.hasExtensions('sidebar:top' as ExtensionPoint)).toBe(true);

      unregister();
      expect(api.hasExtensions('sidebar:top' as ExtensionPoint)).toBe(false);
    });

    it('should register with priority option', () => {
      const api = createExtensionAPI(testPluginId);
      const HighPriority: React.ComponentType<ExtensionProps> = () => null;
      const LowPriority: React.ComponentType<ExtensionProps> = () => null;

      api.registerExtension('chat:input' as ExtensionPoint, LowPriority, { priority: 1 });
      api.registerExtension('chat:input' as ExtensionPoint, HighPriority, { priority: 10 });

      const extensions = api.getExtensions('chat:input' as ExtensionPoint);
      expect(extensions.length).toBe(2);
      // Higher priority should come first
      expect(extensions[0].options.priority).toBe(10);
    });

    it('should register with condition option', () => {
      const api = createExtensionAPI(testPluginId);
      const ConditionalComponent: React.ComponentType<ExtensionProps> = () => null;
      let conditionResult = true;

      api.registerExtension(
        'toolbar:actions' as ExtensionPoint,
        ConditionalComponent,
        { condition: () => conditionResult }
      );

      expect(api.hasExtensions('toolbar:actions' as ExtensionPoint)).toBe(true);

      conditionResult = false;
      expect(api.hasExtensions('toolbar:actions' as ExtensionPoint)).toBe(false);
    });
  });

  describe('getExtensions', () => {
    it('should return empty array for point with no extensions', () => {
      const api = createExtensionAPI(testPluginId);

      const extensions = api.getExtensions('sidebar:bottom' as ExtensionPoint);
      expect(extensions).toEqual([]);
    });

    it('should return all extensions for a point', () => {
      const api = createExtensionAPI(testPluginId);
      const Component1: React.ComponentType<ExtensionProps> = () => null;
      const Component2: React.ComponentType<ExtensionProps> = () => null;

      api.registerExtension('message:actions' as ExtensionPoint, Component1);
      api.registerExtension('message:actions' as ExtensionPoint, Component2);

      const extensions = api.getExtensions('message:actions' as ExtensionPoint);
      expect(extensions.length).toBe(2);
    });

    it('should filter by condition', () => {
      const api = createExtensionAPI(testPluginId);
      const ShowComponent: React.ComponentType<ExtensionProps> = () => null;
      const HideComponent: React.ComponentType<ExtensionProps> = () => null;

      api.registerExtension('settings:panel' as ExtensionPoint, ShowComponent, { condition: () => true });
      api.registerExtension('settings:panel' as ExtensionPoint, HideComponent, { condition: () => false });

      const extensions = api.getExtensions('settings:panel' as ExtensionPoint);
      expect(extensions.length).toBe(1);
    });

    it('should handle condition errors gracefully', () => {
      const api = createExtensionAPI(testPluginId);
      const ErrorComponent: React.ComponentType<ExtensionProps> = () => null;

      api.registerExtension(
        'header:right' as ExtensionPoint,
        ErrorComponent,
        { condition: () => { throw new Error('Condition error'); } }
      );

      const extensions = api.getExtensions('header:right' as ExtensionPoint);
      expect(extensions.length).toBe(0);
    });
  });

  describe('hasExtensions', () => {
    it('should return false for point with no extensions', () => {
      const api = createExtensionAPI(testPluginId);

      expect(api.hasExtensions('footer:left' as ExtensionPoint)).toBe(false);
    });

    it('should return true for point with extensions', () => {
      const api = createExtensionAPI(testPluginId);
      const TestComponent: React.ComponentType<ExtensionProps> = () => null;

      api.registerExtension('footer:left' as ExtensionPoint, TestComponent);

      expect(api.hasExtensions('footer:left' as ExtensionPoint)).toBe(true);
    });

    it('should respect conditions', () => {
      const api = createExtensionAPI(testPluginId);
      const TestComponent: React.ComponentType<ExtensionProps> = () => null;

      api.registerExtension(
        'context:menu' as ExtensionPoint,
        TestComponent,
        { condition: () => false }
      );

      expect(api.hasExtensions('context:menu' as ExtensionPoint)).toBe(false);
    });
  });

  describe('getExtensionsForPoint', () => {
    it('should return extensions from all plugins', () => {
      const api1 = createExtensionAPI('plugin-1');
      const api2 = createExtensionAPI('plugin-2');
      const Component1: React.ComponentType<ExtensionProps> = () => null;
      const Component2: React.ComponentType<ExtensionProps> = () => null;

      api1.registerExtension('global:point' as ExtensionPoint, Component1);
      api2.registerExtension('global:point' as ExtensionPoint, Component2);

      const extensions = getExtensionsForPoint('global:point' as ExtensionPoint);
      expect(extensions.length).toBe(2);

      // Cleanup
      clearPluginExtensions('plugin-1');
      clearPluginExtensions('plugin-2');
    });
  });

  describe('clearPluginExtensions', () => {
    it('should clear all extensions for a specific plugin', () => {
      const api = createExtensionAPI(testPluginId);
      const TestComponent: React.ComponentType<ExtensionProps> = () => null;

      api.registerExtension('point:1' as ExtensionPoint, TestComponent);
      api.registerExtension('point:2' as ExtensionPoint, TestComponent);

      expect(api.hasExtensions('point:1' as ExtensionPoint)).toBe(true);
      expect(api.hasExtensions('point:2' as ExtensionPoint)).toBe(true);

      clearPluginExtensions(testPluginId);

      expect(api.hasExtensions('point:1' as ExtensionPoint)).toBe(false);
      expect(api.hasExtensions('point:2' as ExtensionPoint)).toBe(false);
    });

    it('should not affect other plugins', () => {
      const api1 = createExtensionAPI('plugin-a');
      const api2 = createExtensionAPI('plugin-b');
      const TestComponent: React.ComponentType<ExtensionProps> = () => null;

      api1.registerExtension('shared:point' as ExtensionPoint, TestComponent);
      api2.registerExtension('shared:point' as ExtensionPoint, TestComponent);

      clearPluginExtensions('plugin-a');

      const extensions = getExtensionsForPoint('shared:point' as ExtensionPoint);
      expect(extensions.length).toBe(1);
      expect(extensions[0].pluginId).toBe('plugin-b');

      // Cleanup
      clearPluginExtensions('plugin-b');
    });
  });

  describe('Extension registration details', () => {
    it('should include pluginId in registration', () => {
      const api = createExtensionAPI(testPluginId);
      const TestComponent: React.ComponentType<ExtensionProps> = () => null;

      api.registerExtension('test:point' as ExtensionPoint, TestComponent);

      const extensions = api.getExtensions('test:point' as ExtensionPoint);
      expect(extensions[0].pluginId).toBe(testPluginId);
    });

    it('should include unique ID in registration', () => {
      const api = createExtensionAPI(testPluginId);
      const TestComponent: React.ComponentType<ExtensionProps> = () => null;

      api.registerExtension('unique:point' as ExtensionPoint, TestComponent);
      api.registerExtension('unique:point' as ExtensionPoint, TestComponent);

      const extensions = api.getExtensions('unique:point' as ExtensionPoint);
      expect(extensions[0].id).not.toBe(extensions[1].id);
    });
  });
});
