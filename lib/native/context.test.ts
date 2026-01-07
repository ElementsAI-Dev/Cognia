/**
 * Context Tests
 *
 * Tests for context native API functions.
 */

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import {
  getFullContext,
  getWindowInfo,
  getAppContext,
  getFileContext,
  getBrowserContext,
  getEditorContext,
  getAllWindows,
  findWindowsByTitle,
  findWindowsByProcess,
  clearCache,
  type FullContext,
  type WindowInfo,
  type AppContext,
  type FileContext,
  type BrowserContext,
  type EditorContext,
} from './context';

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;

describe('Context - Context Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFullContext', () => {
    it('should call invoke with correct command', async () => {
      const mockContext: FullContext = {
        timestamp: Date.now(),
      };
      mockInvoke.mockResolvedValue(mockContext);

      const result = await getFullContext();
      expect(mockInvoke).toHaveBeenCalledWith('context_get_full');
      expect(result).toEqual(mockContext);
    });

    it('should return full context with all fields', async () => {
      const mockContext: FullContext = {
        window: {
          handle: 12345,
          title: 'Test Window',
          class_name: 'Chrome_WidgetWin_1',
          process_id: 1234,
          process_name: 'chrome.exe',
          is_visible: true,
          is_minimized: false,
          is_maximized: false,
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
        },
        app: {
          app_type: 'Browser',
          app_name: 'Chrome',
          supports_text_input: true,
          supports_rich_text: true,
          is_dev_tool: false,
          suggested_actions: ['copy', 'paste'],
          metadata: {},
        },
        timestamp: Date.now(),
      };
      mockInvoke.mockResolvedValue(mockContext);

      const result = await getFullContext();
      expect(result.window?.title).toBe('Test Window');
      expect(result.app?.app_type).toBe('Browser');
    });
  });

  describe('getWindowInfo', () => {
    it('should call invoke with correct command', async () => {
      const mockWindow: WindowInfo = {
        handle: 12345,
        title: 'Test Window',
        class_name: 'Test_Class',
        process_id: 1234,
        process_name: 'test.exe',
        is_visible: true,
        is_minimized: false,
        is_maximized: false,
        x: 100,
        y: 100,
        width: 800,
        height: 600,
      };
      mockInvoke.mockResolvedValue(mockWindow);

      const result = await getWindowInfo();
      expect(mockInvoke).toHaveBeenCalledWith('context_get_window');
      expect(result).toEqual(mockWindow);
    });
  });

  describe('getAppContext', () => {
    it('should call invoke with correct command', async () => {
      const mockApp: AppContext = {
        app_type: 'CodeEditor',
        app_name: 'VSCode',
        version: '1.85.0',
        supports_text_input: true,
        supports_rich_text: false,
        is_dev_tool: true,
        suggested_actions: ['format', 'save'],
        metadata: { workspace: 'cognia' },
      };
      mockInvoke.mockResolvedValue(mockApp);

      const result = await getAppContext();
      expect(mockInvoke).toHaveBeenCalledWith('context_get_app');
      expect(result).toEqual(mockApp);
    });
  });

  describe('getFileContext', () => {
    it('should call invoke with correct command', async () => {
      const mockFile: FileContext = {
        file_path: '/path/to/file.ts',
        file_name: 'file.ts',
        file_extension: 'ts',
        directory: '/path/to',
        is_modified: false,
        language: 'typescript',
        project_root: '/path/to/project',
      };
      mockInvoke.mockResolvedValue(mockFile);

      const result = await getFileContext();
      expect(mockInvoke).toHaveBeenCalledWith('context_get_file');
      expect(result).toEqual(mockFile);
    });
  });

  describe('getBrowserContext', () => {
    it('should call invoke with correct command', async () => {
      const mockBrowser: BrowserContext = {
        browser_name: 'Chrome',
        url: 'https://example.com',
        domain: 'example.com',
        page_title: 'Example Page',
        is_secure: true,
        tab_count: 5,
      };
      mockInvoke.mockResolvedValue(mockBrowser);

      const result = await getBrowserContext();
      expect(mockInvoke).toHaveBeenCalledWith('context_get_browser');
      expect(result).toEqual(mockBrowser);
    });
  });

  describe('getEditorContext', () => {
    it('should call invoke with correct command', async () => {
      const mockEditor: EditorContext = {
        editor_name: 'VSCode',
        file_path: '/project/src/main.ts',
        file_name: 'main.ts',
        file_extension: 'ts',
        language: 'typescript',
        project_name: 'my-project',
        is_modified: true,
        git_branch: 'main',
        line_number: 42,
        column_number: 10,
        metadata: {},
      };
      mockInvoke.mockResolvedValue(mockEditor);

      const result = await getEditorContext();
      expect(mockInvoke).toHaveBeenCalledWith('context_get_editor');
      expect(result).toEqual(mockEditor);
    });
  });

  describe('getAllWindows', () => {
    it('should call invoke with correct command', async () => {
      const mockWindows: WindowInfo[] = [
        {
          handle: 1,
          title: 'Window 1',
          class_name: 'Class1',
          process_id: 100,
          process_name: 'proc1.exe',
          is_visible: true,
          is_minimized: false,
          is_maximized: false,
          x: 0,
          y: 0,
          width: 800,
          height: 600,
        },
        {
          handle: 2,
          title: 'Window 2',
          class_name: 'Class2',
          process_id: 200,
          process_name: 'proc2.exe',
          is_visible: true,
          is_minimized: true,
          is_maximized: false,
          x: 100,
          y: 100,
          width: 1024,
          height: 768,
        },
      ];
      mockInvoke.mockResolvedValue(mockWindows);

      const result = await getAllWindows();
      expect(mockInvoke).toHaveBeenCalledWith('context_get_all_windows');
      expect(result).toHaveLength(2);
    });
  });

  describe('findWindowsByTitle', () => {
    it('should call invoke with pattern parameter', async () => {
      mockInvoke.mockResolvedValue([]);

      await findWindowsByTitle('*Chrome*');
      expect(mockInvoke).toHaveBeenCalledWith('context_find_windows_by_title', { pattern: '*Chrome*' });
    });
  });

  describe('findWindowsByProcess', () => {
    it('should call invoke with process name parameter', async () => {
      mockInvoke.mockResolvedValue([]);

      await findWindowsByProcess('chrome.exe');
      expect(mockInvoke).toHaveBeenCalledWith('context_find_windows_by_process', { processName: 'chrome.exe' });
    });
  });

  describe('clearCache', () => {
    it('should call invoke with correct command', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await clearCache();
      expect(mockInvoke).toHaveBeenCalledWith('context_clear_cache');
    });
  });
});

describe('Context Types', () => {
  it('should have all AppType values', () => {
    const appTypes = [
      'Browser',
      'CodeEditor',
      'Terminal',
      'DocumentEditor',
      'Spreadsheet',
      'Presentation',
      'Email',
      'Chat',
      'FileManager',
      'MediaPlayer',
      'ImageEditor',
      'PdfViewer',
      'NoteTaking',
      'Database',
      'ApiClient',
      'VersionControl',
      'SystemSettings',
      'Game',
      'Unknown',
    ];

    appTypes.forEach((type) => {
      const context: AppContext = {
        app_type: type as AppContext['app_type'],
        app_name: 'Test',
        supports_text_input: false,
        supports_rich_text: false,
        is_dev_tool: false,
        suggested_actions: [],
        metadata: {},
      };
      expect(context.app_type).toBe(type);
    });
  });

  it('should have correct WindowInfo structure', () => {
    const window: WindowInfo = {
      handle: 12345,
      title: 'Test',
      class_name: 'TestClass',
      process_id: 1234,
      process_name: 'test.exe',
      executable_path: 'C:\\Program Files\\Test\\test.exe',
      is_visible: true,
      is_minimized: false,
      is_maximized: true,
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
    };

    expect(window.executable_path).toBeDefined();
    expect(window.is_maximized).toBe(true);
  });
});
