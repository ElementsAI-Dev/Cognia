/**
 * Manifest Types Tests
 *
 * @description Tests for plugin manifest type definitions.
 */

import type {
  PluginManifest,
  PluginConfigSchema,
  PluginConfigProperty,
  PluginActivationEvent,
} from './types';

describe('Manifest Types', () => {
  describe('PluginManifest', () => {
    it('should create a valid minimal manifest', () => {
      const manifest: PluginManifest = {
        id: 'com.example.my-plugin',
        name: 'My Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        type: 'frontend',
        capabilities: ['tools'],
      };

      expect(manifest.id).toBe('com.example.my-plugin');
      expect(manifest.name).toBe('My Plugin');
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.description).toBe('A test plugin');
      expect(manifest.type).toBe('frontend');
      expect(manifest.capabilities).toContain('tools');
    });

    it('should create a valid full manifest with all optional fields', () => {
      const manifest: PluginManifest = {
        id: 'com.example.full-plugin',
        name: 'Full Plugin',
        version: '2.0.0',
        description: 'A fully featured plugin',
        author: {
          name: 'Test Author',
          email: 'test@example.com',
          url: 'https://example.com',
        },
        homepage: 'https://example.com/plugin',
        repository: 'https://github.com/example/plugin',
        license: 'MIT',
        type: 'hybrid',
        capabilities: ['tools', 'components', 'hooks'],
        keywords: ['test', 'plugin', 'example'],
        icon: 'puzzle',
        screenshots: ['screenshot1.png', 'screenshot2.png'],
        main: 'dist/index.js',
        pythonMain: 'src/main.py',
        styles: 'dist/styles.css',
        dependencies: {
          'other-plugin': '>=1.0.0',
        },
        engines: {
          cognia: '>=1.0.0',
          node: '>=18.0.0',
          python: '>=3.10',
        },
        pythonDependencies: ['numpy', 'pandas'],
        configSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', title: 'API Key' },
          },
          required: ['apiKey'],
        },
        defaultConfig: {
          apiKey: '',
        },
        permissions: ['network:fetch'],
        optionalPermissions: ['filesystem:read'],
        a2uiComponents: [],
        a2uiTemplates: [],
        tools: [],
        modes: [],
        activationEvents: ['onStartup'],
        activateOnStartup: true,
      };

      expect(manifest.author?.name).toBe('Test Author');
      expect(manifest.author?.email).toBe('test@example.com');
      expect(manifest.homepage).toBe('https://example.com/plugin');
      expect(manifest.type).toBe('hybrid');
      expect(manifest.pythonMain).toBe('src/main.py');
      expect(manifest.engines?.cognia).toBe('>=1.0.0');
      expect(manifest.pythonDependencies).toContain('numpy');
      expect(manifest.configSchema?.properties.apiKey).toBeDefined();
      expect(manifest.activateOnStartup).toBe(true);
    });

    it('should support multiple capabilities', () => {
      const manifest: PluginManifest = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        description: 'Test',
        type: 'frontend',
        capabilities: ['tools', 'components', 'modes', 'hooks', 'commands'],
      };

      expect(manifest.capabilities).toHaveLength(5);
      expect(manifest.capabilities).toContain('tools');
      expect(manifest.capabilities).toContain('components');
      expect(manifest.capabilities).toContain('modes');
      expect(manifest.capabilities).toContain('hooks');
      expect(manifest.capabilities).toContain('commands');
    });

    it('should support plugin dependencies', () => {
      const manifest: PluginManifest = {
        id: 'dependent-plugin',
        name: 'Dependent Plugin',
        version: '1.0.0',
        description: 'A plugin with dependencies',
        type: 'frontend',
        capabilities: [],
        dependencies: {
          'base-plugin': '>=1.0.0',
          'utility-plugin': '^2.0.0',
        },
      };

      expect(manifest.dependencies).toBeDefined();
      expect(manifest.dependencies?.['base-plugin']).toBe('>=1.0.0');
      expect(manifest.dependencies?.['utility-plugin']).toBe('^2.0.0');
    });
  });

  describe('PluginConfigSchema', () => {
    it('should create a valid config schema', () => {
      const schema: PluginConfigSchema = {
        type: 'object',
        properties: {
          apiKey: {
            type: 'string',
            title: 'API Key',
            description: 'Your API key',
          },
          maxResults: {
            type: 'number',
            title: 'Max Results',
            default: 10,
            minimum: 1,
            maximum: 100,
          },
          enabled: {
            type: 'boolean',
            title: 'Enabled',
            default: true,
          },
        },
        required: ['apiKey'],
      };

      expect(schema.type).toBe('object');
      expect(schema.properties.apiKey.type).toBe('string');
      expect(schema.properties.maxResults.type).toBe('number');
      expect(schema.properties.enabled.type).toBe('boolean');
      expect(schema.required).toContain('apiKey');
    });

    it('should support nested object properties', () => {
      const schema: PluginConfigSchema = {
        type: 'object',
        properties: {
          settings: {
            type: 'object',
            properties: {
              nested: {
                type: 'string',
              },
            },
          },
        },
      };

      expect(schema.properties.settings.type).toBe('object');
      expect(schema.properties.settings.properties?.nested.type).toBe('string');
    });

    it('should support array properties', () => {
      const schema: PluginConfigSchema = {
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      };

      expect(schema.properties.tags.type).toBe('array');
      expect(schema.properties.tags.items?.type).toBe('string');
    });
  });

  describe('PluginConfigProperty', () => {
    it('should create valid string property with constraints', () => {
      const prop: PluginConfigProperty = {
        type: 'string',
        title: 'Username',
        description: 'Your username',
        minLength: 3,
        maxLength: 50,
        pattern: '^[a-zA-Z0-9_]+$',
      };

      expect(prop.type).toBe('string');
      expect(prop.minLength).toBe(3);
      expect(prop.maxLength).toBe(50);
      expect(prop.pattern).toBe('^[a-zA-Z0-9_]+$');
    });

    it('should create valid number property with constraints', () => {
      const prop: PluginConfigProperty = {
        type: 'number',
        title: 'Limit',
        minimum: 0,
        maximum: 1000,
        default: 100,
      };

      expect(prop.type).toBe('number');
      expect(prop.minimum).toBe(0);
      expect(prop.maximum).toBe(1000);
      expect(prop.default).toBe(100);
    });

    it('should create valid enum property', () => {
      const prop: PluginConfigProperty = {
        type: 'string',
        title: 'Language',
        enum: ['en', 'es', 'fr', 'de'],
        enumDescriptions: ['English', 'Spanish', 'French', 'German'],
        default: 'en',
      };

      expect(prop.type).toBe('string');
      expect(prop.enum).toContain('en');
      expect(prop.enum).toContain('es');
      expect(prop.enumDescriptions).toContain('English');
      expect(prop.default).toBe('en');
    });
  });

  describe('PluginActivationEvent', () => {
    it('should support standard activation events', () => {
      const events: PluginActivationEvent[] = [
        'onStartup',
        'onCommand:*',
        'onChat:*',
        'onAgent:start',
        'onA2UI:surface',
      ];

      expect(events).toContain('onStartup');
      expect(events).toContain('onCommand:*');
      expect(events).toContain('onChat:*');
      expect(events).toContain('onAgent:start');
      expect(events).toContain('onA2UI:surface');
    });

    it('should support specific command events', () => {
      const event: PluginActivationEvent = 'onCommand:my-plugin.doSomething';
      expect(event).toBe('onCommand:my-plugin.doSomething');
    });

    it('should support language-specific events', () => {
      const events: PluginActivationEvent[] = [
        'onLanguage:typescript',
        'onLanguage:python',
        'onLanguage:rust',
      ];

      expect(events[0]).toBe('onLanguage:typescript');
      expect(events[1]).toBe('onLanguage:python');
      expect(events[2]).toBe('onLanguage:rust');
    });

    it('should support file-specific events', () => {
      const events: PluginActivationEvent[] = [
        'onFile:*.ts',
        'onFile:package.json',
        'onFile:*.md',
      ];

      expect(events[0]).toBe('onFile:*.ts');
      expect(events[1]).toBe('onFile:package.json');
      expect(events[2]).toBe('onFile:*.md');
    });
  });
});
