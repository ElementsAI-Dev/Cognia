/**
 * Extended Context Tests
 *
 * @description Tests for extended plugin context type definitions.
 */

import type {
  SessionFilter,
  MessageQueryOptions,
  SendMessageOptions,
  MessageAttachment,
  SessionStats,
  PluginSessionAPI,
  ProjectFilter,
  ProjectFileInput,
  PluginProjectAPI,
  VectorDocument,
  VectorSearchOptions,
  VectorFilter,
  VectorSearchResult,
  CollectionOptions,
  CollectionStats,
  PluginVectorAPI,
  ThemeMode,
  ColorThemePreset,
  ThemeColors,
  CustomTheme,
  ThemeState,
  PluginThemeAPI,
  ExportFormat,
  ExportOptions,
  CustomExporter,
  ExportResult,
  PluginExportAPI,
  Locale,
  TranslationParams,
  PluginI18nAPI,
  ArtifactLanguage,
  PluginCanvasDocument,
  CreateCanvasDocumentOptions,
  CanvasSelection,
  PluginCanvasAPI,
  CreateArtifactOptions,
  ArtifactFilter,
  ArtifactRenderer,
  PluginArtifactAPI,
  NotificationOptions,
  NotificationAction,
  Notification,
  PluginNotificationCenterAPI,
  AIChatMessage,
  AIChatOptions,
  AIChatChunk,
  AIModel,
  AIProviderDefinition,
  PluginAIProviderAPI,
  ExtensionPoint,
  ExtensionOptions,
  ExtensionRegistration,
  ExtensionProps,
  PluginExtensionAPI,
  PluginPermissionAPI,
  ExtendedPluginContext,
} from './extended';

describe('Extended Context Types', () => {
  describe('Session API Types', () => {
    it('should create valid session filter', () => {
      const filter: SessionFilter = {
        projectId: 'proj-1',
        mode: 'chat',
        hasMessages: true,
        createdAfter: new Date('2024-01-01'),
        limit: 10,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      };

      expect(filter.projectId).toBe('proj-1');
      expect(filter.limit).toBe(10);
      expect(filter.sortBy).toBe('updatedAt');
    });

    it('should create valid message query options', () => {
      const options: MessageQueryOptions = {
        limit: 50,
        offset: 10,
        branchId: 'branch-1',
        includeDeleted: false,
        afterId: 'msg-100',
      };

      expect(options.limit).toBe(50);
      expect(options.branchId).toBe('branch-1');
    });

    it('should create valid message attachment', () => {
      const attachment: MessageAttachment = {
        type: 'image',
        name: 'screenshot.png',
        url: 'data:image/png;base64,...',
        mimeType: 'image/png',
        size: 1024,
      };

      expect(attachment.type).toBe('image');
      expect(attachment.mimeType).toBe('image/png');
    });

    it('should create valid session stats', () => {
      const stats: SessionStats = {
        messageCount: 100,
        userMessageCount: 50,
        assistantMessageCount: 50,
        totalTokens: 25000,
        averageResponseTime: 1500,
        branchCount: 3,
        attachmentCount: 5,
      };

      expect(stats.totalTokens).toBe(25000);
      expect(stats.branchCount).toBe(3);
    });
  });

  describe('Project API Types', () => {
    it('should create valid project filter', () => {
      const filter: ProjectFilter = {
        isArchived: false,
        tags: ['important', 'work'],
        limit: 20,
        sortBy: 'lastAccessedAt',
      };

      expect(filter.tags).toContain('important');
    });

    it('should create valid project file input', () => {
      const file: ProjectFileInput = {
        name: 'document.md',
        content: '# Title\nContent here',
        type: 'text',
        mimeType: 'text/markdown',
      };

      expect(file.name).toBe('document.md');
    });
  });

  describe('Vector API Types', () => {
    it('should create valid vector document', () => {
      const doc: VectorDocument = {
        id: 'doc-1',
        content: 'This is document content',
        metadata: { source: 'file.txt', page: 1 },
        embedding: [0.1, 0.2, 0.3],
      };

      expect(doc.content).toBe('This is document content');
      expect(doc.embedding).toHaveLength(3);
    });

    it('should create valid vector search options', () => {
      const options: VectorSearchOptions = {
        topK: 10,
        threshold: 0.7,
        filters: [
          { key: 'source', value: 'docs', operation: 'eq' },
        ],
        filterMode: 'and',
        includeMetadata: true,
      };

      expect(options.topK).toBe(10);
      expect(options.filters?.[0].operation).toBe('eq');
    });

    it('should support all vector filter operations', () => {
      const operations: VectorFilter['operation'][] = [
        'eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'contains', 'in',
      ];
      expect(operations).toHaveLength(8);
    });

    it('should create valid search result', () => {
      const result: VectorSearchResult = {
        id: 'doc-1',
        content: 'Matching content',
        metadata: { page: 5 },
        score: 0.95,
      };

      expect(result.score).toBe(0.95);
    });
  });

  describe('Theme API Types', () => {
    it('should support all theme modes', () => {
      const modes: ThemeMode[] = ['light', 'dark', 'system'];
      expect(modes).toHaveLength(3);
    });

    it('should support all color presets', () => {
      const presets: ColorThemePreset[] = [
        'default', 'ocean', 'forest', 'sunset', 'lavender', 'rose', 'slate', 'amber',
      ];
      expect(presets).toHaveLength(8);
    });

    it('should create valid theme colors', () => {
      const colors: ThemeColors = {
        primary: '#007acc',
        primaryForeground: '#ffffff',
        secondary: '#6c757d',
        secondaryForeground: '#ffffff',
        accent: '#ffc107',
        accentForeground: '#000000',
        background: '#ffffff',
        foreground: '#000000',
        muted: '#f8f9fa',
        mutedForeground: '#6c757d',
        card: '#ffffff',
        cardForeground: '#000000',
        border: '#dee2e6',
        ring: '#007acc',
        destructive: '#dc3545',
        destructiveForeground: '#ffffff',
      };

      expect(colors.primary).toBe('#007acc');
    });

    it('should create valid custom theme', () => {
      const theme: CustomTheme = {
        id: 'my-theme',
        name: 'My Custom Theme',
        colors: {
          primary: '#ff0000',
          background: '#000000',
        },
        isDark: true,
      };

      expect(theme.isDark).toBe(true);
    });
  });

  describe('Export API Types', () => {
    it('should support all export formats', () => {
      const formats: ExportFormat[] = [
        'markdown', 'json', 'html', 'animated-html', 'pdf', 'text', 'docx', 'csv',
      ];
      expect(formats).toHaveLength(8);
    });

    it('should create valid export options', () => {
      const options: ExportOptions = {
        format: 'markdown',
        theme: 'dark',
        showTimestamps: true,
        showToolCalls: true,
        includeCoverPage: false,
      };

      expect(options.format).toBe('markdown');
    });

    it('should create valid custom exporter', () => {
      const exporter: CustomExporter = {
        id: 'custom-xml',
        name: 'XML Export',
        description: 'Export as XML',
        format: 'xml',
        extension: 'xml',
        mimeType: 'application/xml',
        export: jest.fn().mockResolvedValue('<data></data>'),
      };

      expect(exporter.mimeType).toBe('application/xml');
    });
  });

  describe('I18n API Types', () => {
    it('should support locales', () => {
      const locales: Locale[] = ['en', 'zh-CN'];
      expect(locales).toHaveLength(2);
    });

    it('should create valid translation params', () => {
      const params: TranslationParams = {
        name: 'John',
        count: 5,
        active: true,
      };

      expect(params.name).toBe('John');
    });
  });

  describe('Canvas API Types', () => {
    it('should support all artifact languages', () => {
      const languages: ArtifactLanguage[] = [
        'javascript', 'typescript', 'python', 'java', 'cpp', 'csharp',
        'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'dart',
        'html', 'css', 'json', 'xml', 'yaml', 'markdown', 'text',
        'sql', 'bash', 'powershell',
      ];
      expect(languages).toHaveLength(23);
    });

    it('should create valid canvas document', () => {
      const doc: PluginCanvasDocument = {
        id: 'doc-1',
        sessionId: 'session-1',
        title: 'Main.tsx',
        content: 'export default function() {}',
        language: 'typescript',
        type: 'code',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(doc.language).toBe('typescript');
      expect(doc.type).toBe('code');
    });

    it('should create valid canvas selection', () => {
      const selection: CanvasSelection = {
        start: 10,
        end: 50,
        text: 'selected text',
      };

      expect(selection.start).toBe(10);
      expect(selection.text).toBe('selected text');
    });
  });

  describe('Artifact API Types', () => {
    it('should create valid artifact options', () => {
      const options: CreateArtifactOptions = {
        title: 'My Component',
        content: 'export default function() {}',
        language: 'typescript',
        sessionId: 'session-1',
        type: 'react',
      };

      expect(options.type).toBe('react');
    });

    it('should create valid artifact filter', () => {
      const filter: ArtifactFilter = {
        sessionId: 'session-1',
        language: 'typescript',
        type: 'code',
        limit: 10,
      };

      expect(filter.language).toBe('typescript');
    });
  });

  describe('Notification Center API Types', () => {
    it('should create valid notification options', () => {
      const options: NotificationOptions = {
        title: 'Success',
        message: 'Operation completed',
        type: 'success',
        duration: 5000,
        actions: [{ label: 'View', action: 'view' }],
        persistent: false,
        progress: 100,
      };

      expect(options.type).toBe('success');
      expect(options.progress).toBe(100);
    });

    it('should create valid notification', () => {
      const notification: Notification = {
        id: 'notif-1',
        title: 'Alert',
        message: 'Something happened',
        type: 'info',
        createdAt: new Date(),
        persistent: false,
      };

      expect(notification.type).toBe('info');
    });
  });

  describe('AI Provider API Types', () => {
    it('should create valid AI chat message', () => {
      const message: AIChatMessage = {
        role: 'user',
        content: 'Hello!',
        name: 'John',
      };

      expect(message.role).toBe('user');
    });

    it('should create valid AI chat options', () => {
      const options: AIChatOptions = {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        stop: ['\n\n'],
        stream: true,
      };

      expect(options.temperature).toBe(0.7);
    });

    it('should create valid AI model', () => {
      const model: AIModel = {
        id: 'gpt-4',
        name: 'GPT-4',
        provider: 'openai',
        contextLength: 8192,
        capabilities: ['chat', 'function_calling', 'vision'],
      };

      expect(model.capabilities).toContain('chat');
    });
  });

  describe('Extension API Types', () => {
    it('should support all extension points', () => {
      const points: ExtensionPoint[] = [
        'sidebar.left.top', 'sidebar.left.bottom',
        'sidebar.right.top', 'sidebar.right.bottom',
        'toolbar.left', 'toolbar.center', 'toolbar.right',
        'statusbar.left', 'statusbar.center', 'statusbar.right',
        'chat.input.above', 'chat.input.below', 'chat.input.actions',
        'chat.message.actions', 'chat.message.footer',
        'artifact.toolbar', 'artifact.actions',
        'canvas.toolbar', 'canvas.sidebar',
        'settings.general', 'settings.appearance', 'settings.ai', 'settings.plugins',
        'command-palette',
      ];
      expect(points).toHaveLength(24);
    });

    it('should create valid extension options', () => {
      const options: ExtensionOptions = {
        priority: 100,
        condition: () => true,
      };

      expect(options.priority).toBe(100);
    });

    it('should create valid extension registration', () => {
      const registration: ExtensionRegistration = {
        id: 'ext-1',
        pluginId: 'my-plugin',
        point: 'toolbar.right',
        component: () => null,
        options: { priority: 50 },
      };

      expect(registration.point).toBe('toolbar.right');
    });
  });

  describe('Permission API Types', () => {
    it('should define permission API', () => {
      const mockAPI: PluginPermissionAPI = {
        hasPermission: jest.fn().mockReturnValue(true),
        requestPermission: jest.fn().mockResolvedValue(true),
        getGrantedPermissions: jest.fn().mockReturnValue([]),
        hasAllPermissions: jest.fn().mockReturnValue(false),
        hasAnyPermission: jest.fn().mockReturnValue(true),
      };

      expect(mockAPI.hasPermission('session:read')).toBe(true);
      expect(mockAPI.hasAnyPermission(['session:read', 'session:write'])).toBe(true);
    });
  });

  describe('ExtendedPluginContext', () => {
    it('should define all extended APIs', () => {
      const mockContext: ExtendedPluginContext = {
        session: {} as PluginSessionAPI,
        project: {} as PluginProjectAPI,
        vector: {} as PluginVectorAPI,
        theme: {} as PluginThemeAPI,
        export: {} as PluginExportAPI,
        i18n: {} as PluginI18nAPI,
        canvas: {} as PluginCanvasAPI,
        artifact: {} as PluginArtifactAPI,
        notifications: {} as PluginNotificationCenterAPI,
        ai: {} as PluginAIProviderAPI,
        extensions: {} as PluginExtensionAPI,
        permissions: {} as PluginPermissionAPI,
      };

      expect(mockContext.session).toBeDefined();
      expect(mockContext.project).toBeDefined();
      expect(mockContext.vector).toBeDefined();
      expect(mockContext.theme).toBeDefined();
      expect(mockContext.export).toBeDefined();
      expect(mockContext.i18n).toBeDefined();
      expect(mockContext.canvas).toBeDefined();
      expect(mockContext.artifact).toBeDefined();
      expect(mockContext.notifications).toBeDefined();
      expect(mockContext.ai).toBeDefined();
      expect(mockContext.extensions).toBeDefined();
      expect(mockContext.permissions).toBeDefined();
    });
  });
});
