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
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
          is_minimized: false,
          is_maximized: false,
          is_focused: true,
          is_visible: true,
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
        x: 100,
        y: 100,
        width: 800,
        height: 600,
        is_minimized: false,
        is_maximized: false,
        is_focused: true,
        is_visible: true,
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
        path: '/path/to/file.ts',
        name: 'file.ts',
        extension: 'ts',
        language: 'typescript',
        is_modified: false,
        project_root: '/path/to/project',
        file_type: 'SourceCode',
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
        browser: 'Chrome',
        url: 'https://example.com',
        domain: 'example.com',
        page_title: 'Example Page',
        is_secure: true,
        page_type: 'General',
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
          x: 0,
          y: 0,
          width: 800,
          height: 600,
          is_minimized: false,
          is_maximized: false,
          is_focused: true,
          is_visible: true,
        },
        {
          handle: 2,
          title: 'Window 2',
          class_name: 'Class2',
          process_id: 200,
          process_name: 'proc2.exe',
          x: 100,
          y: 100,
          width: 1024,
          height: 768,
          is_minimized: true,
          is_maximized: false,
          is_focused: false,
          is_visible: true,
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
      exe_path: 'C:\\Program Files\\Test\\test.exe',
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      is_minimized: false,
      is_maximized: true,
      is_focused: true,
      is_visible: true,
    };

    expect(window.exe_path).toBeDefined();
    expect(window.is_maximized).toBe(true);
    expect(window.is_focused).toBe(true);
  });
});

describe('New Context Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setCacheDuration', () => {
    it('should call invoke with correct parameters', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { setCacheDuration } = await import('./context');
      await setCacheDuration(1000);
      expect(mockInvoke).toHaveBeenCalledWith('context_set_cache_duration', { ms: 1000 });
    });
  });

  describe('getCacheDuration', () => {
    it('should call invoke and return duration', async () => {
      mockInvoke.mockResolvedValue(500);

      const { getCacheDuration } = await import('./context');
      const result = await getCacheDuration();
      expect(mockInvoke).toHaveBeenCalledWith('context_get_cache_duration');
      expect(result).toBe(500);
    });
  });

  describe('analyzeUiAutomation', () => {
    it('should call invoke and return UI elements', async () => {
      const mockElements = [
        {
          element_type: 'Button',
          text: 'Click',
          x: 100,
          y: 100,
          width: 80,
          height: 30,
          is_interactive: true,
        },
      ];
      mockInvoke.mockResolvedValue(mockElements);

      const { analyzeUiAutomation } = await import('./context');
      const result = await analyzeUiAutomation();
      expect(mockInvoke).toHaveBeenCalledWith('context_analyze_ui_automation');
      expect(result).toEqual(mockElements);
    });
  });

  describe('getTextAt', () => {
    it('should call invoke with coordinates', async () => {
      mockInvoke.mockResolvedValue('Hello World');

      const { getTextAt } = await import('./context');
      const result = await getTextAt(100, 200);
      expect(mockInvoke).toHaveBeenCalledWith('context_get_text_at', { x: 100, y: 200 });
      expect(result).toBe('Hello World');
    });

    it('should return null when no text found', async () => {
      mockInvoke.mockResolvedValue(null);

      const { getTextAt } = await import('./context');
      const result = await getTextAt(0, 0);
      expect(result).toBeNull();
    });
  });

  describe('getElementAt', () => {
    it('should call invoke with coordinates', async () => {
      const mockElement = {
        element_type: 'Button',
        text: 'Submit',
        x: 50,
        y: 50,
        width: 100,
        height: 40,
        is_interactive: true,
      };
      mockInvoke.mockResolvedValue(mockElement);

      const { getElementAt } = await import('./context');
      const result = await getElementAt(50, 50);
      expect(mockInvoke).toHaveBeenCalledWith('context_get_element_at', { x: 50, y: 50 });
      expect(result).toEqual(mockElement);
    });

    it('should return null when no element found', async () => {
      mockInvoke.mockResolvedValue(null);

      const { getElementAt } = await import('./context');
      const result = await getElementAt(0, 0);
      expect(result).toBeNull();
    });
  });
});
