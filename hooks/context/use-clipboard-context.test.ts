/**
 * Clipboard Context Hook Tests
 */

import { renderHook } from '@testing-library/react';
import { useClipboardContext, CATEGORY_INFO, LANGUAGE_INFO, TRANSFORM_ACTIONS } from './use-clipboard-context';

// Mock the store
jest.mock('@/stores/context', () => {
  const actual = jest.requireActual('@/stores/context');
  return {
    ...actual,
    useClipboardContextStore: jest.fn(() => ({
      currentContent: null,
      currentAnalysis: null,
      isAnalyzing: false,
      templates: [],
      isMonitoring: false,
      lastUpdateTime: null,
      autoAnalyze: true,
      monitoringInterval: 2000,
      error: null,
      readClipboard: jest.fn(),
      writeText: jest.fn(),
      writeHtml: jest.fn(),
      clearClipboard: jest.fn(),
      analyzeContent: jest.fn(),
      getCurrentWithAnalysis: jest.fn(),
      transformContent: jest.fn(),
      transformAndWrite: jest.fn(),
      extractEntities: jest.fn().mockResolvedValue([]),
      getSuggestedActions: jest.fn().mockResolvedValue([]),
      detectCategory: jest.fn(),
      detectLanguage: jest.fn(),
      checkSensitive: jest.fn().mockResolvedValue(false),
      getStats: jest.fn(),
      addTemplate: jest.fn(),
      removeTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      applyTemplate: jest.fn(),
      searchTemplates: jest.fn().mockReturnValue([]),
      startMonitoring: jest.fn(),
      stopMonitoring: jest.fn(),
      setAutoAnalyze: jest.fn(),
      setMonitoringInterval: jest.fn(),
      clearError: jest.fn(),
      reset: jest.fn(),
    })),
  };
});

describe('useClipboardContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CATEGORY_INFO', () => {
    it('should have info for all expected categories', () => {
      const expectedCategories = [
        'PlainText', 'Url', 'Email', 'PhoneNumber', 'FilePath',
        'Code', 'Json', 'Markup', 'Markdown', 'Math', 'Color',
        'DateTime', 'Uuid', 'IpAddress', 'SensitiveData', 'Command',
        'Sql', 'RegexPattern', 'StructuredData', 'NaturalText', 'Unknown'
      ];

      expectedCategories.forEach(category => {
        expect(CATEGORY_INFO[category as keyof typeof CATEGORY_INFO]).toBeDefined();
        expect(CATEGORY_INFO[category as keyof typeof CATEGORY_INFO].label).toBeDefined();
        expect(CATEGORY_INFO[category as keyof typeof CATEGORY_INFO].icon).toBeDefined();
        expect(CATEGORY_INFO[category as keyof typeof CATEGORY_INFO].color).toBeDefined();
      });
    });

    it('should have Url category with correct properties', () => {
      expect(CATEGORY_INFO.Url).toEqual({
        label: 'URL',
        icon: 'link',
        color: 'blue'
      });
    });

    it('should have Code category with correct properties', () => {
      expect(CATEGORY_INFO.Code).toEqual({
        label: 'Code',
        icon: 'code',
        color: 'cyan'
      });
    });
  });

  describe('LANGUAGE_INFO', () => {
    it('should have info for all expected languages', () => {
      const expectedLanguages = [
        'JavaScript', 'TypeScript', 'Python', 'Rust', 'Go',
        'Java', 'CSharp', 'Cpp', 'Ruby', 'Php', 'Swift',
        'Kotlin', 'Sql', 'Html', 'Css', 'Json', 'Yaml',
        'Toml', 'Markdown', 'Shell', 'PowerShell', 'Unknown'
      ];

      expectedLanguages.forEach(language => {
        expect(LANGUAGE_INFO[language as keyof typeof LANGUAGE_INFO]).toBeDefined();
        expect(LANGUAGE_INFO[language as keyof typeof LANGUAGE_INFO].label).toBeDefined();
        expect(LANGUAGE_INFO[language as keyof typeof LANGUAGE_INFO].icon).toBeDefined();
      });
    });

    it('should have JavaScript with correct properties', () => {
      expect(LANGUAGE_INFO.JavaScript).toEqual({
        label: 'JavaScript',
        icon: 'file-code'
      });
    });
  });

  describe('TRANSFORM_ACTIONS', () => {
    it('should have all expected transform actions', () => {
      const expectedActions = [
        'format_json', 'minify_json', 'extract_urls', 'extract_emails',
        'trim_whitespace', 'to_uppercase', 'to_lowercase',
        'remove_empty_lines', 'sort_lines', 'unique_lines',
        'escape_html', 'unescape_html'
      ];

      expectedActions.forEach(actionId => {
        const action = TRANSFORM_ACTIONS.find(a => a.id === actionId);
        expect(action).toBeDefined();
        expect(action?.label).toBeDefined();
        expect(action?.description).toBeDefined();
        expect(action?.icon).toBeDefined();
        expect(action?.category).toBeDefined();
      });
    });

    it('should have format_json action with correct properties', () => {
      const formatJson = TRANSFORM_ACTIONS.find(a => a.id === 'format_json');
      expect(formatJson).toEqual({
        id: 'format_json',
        label: 'Format JSON',
        description: 'Pretty print JSON',
        icon: 'braces',
        category: 'format'
      });
    });

    it('should categorize actions correctly', () => {
      const formatActions = TRANSFORM_ACTIONS.filter(a => a.category === 'format');
      const extractActions = TRANSFORM_ACTIONS.filter(a => a.category === 'extract');
      const caseActions = TRANSFORM_ACTIONS.filter(a => a.category === 'case');
      const linesActions = TRANSFORM_ACTIONS.filter(a => a.category === 'lines');
      const encodeActions = TRANSFORM_ACTIONS.filter(a => a.category === 'encode');

      expect(formatActions.length).toBeGreaterThan(0);
      expect(extractActions.length).toBeGreaterThan(0);
      expect(caseActions.length).toBeGreaterThan(0);
      expect(linesActions.length).toBeGreaterThan(0);
      expect(encodeActions.length).toBeGreaterThan(0);
    });
  });

  describe('hook behavior', () => {
    it('should return default state', () => {
      const { result } = renderHook(() => useClipboardContext());

      expect(result.current.content).toBeNull();
      expect(result.current.analysis).toBeNull();
      expect(result.current.isAnalyzing).toBe(false);
      expect(result.current.isMonitoring).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.hasSensitiveContent).toBe(false);
    });

    it('should provide category info helper', () => {
      const { result } = renderHook(() => useClipboardContext());

      const urlInfo = result.current.getCategoryInfo('Url');
      expect(urlInfo).toEqual(CATEGORY_INFO.Url);

      const codeInfo = result.current.getCategoryInfo('Code');
      expect(codeInfo).toEqual(CATEGORY_INFO.Code);
    });

    it('should provide language info helper', () => {
      const { result } = renderHook(() => useClipboardContext());

      const jsInfo = result.current.getLanguageInfo('JavaScript');
      expect(jsInfo).toEqual(LANGUAGE_INFO.JavaScript);

      const pyInfo = result.current.getLanguageInfo('Python');
      expect(pyInfo).toEqual(LANGUAGE_INFO.Python);
    });

    it('should provide applicable transforms based on category', () => {
      const { result } = renderHook(() => useClipboardContext());

      // When no category, should return all transforms
      const allTransforms = result.current.getApplicableTransforms();
      expect(allTransforms.length).toBe(TRANSFORM_ACTIONS.length);

      // For JSON category, should filter to JSON-related transforms
      const jsonTransforms = result.current.getApplicableTransforms('Json');
      expect(jsonTransforms.some(t => t.id === 'format_json')).toBe(true);
      expect(jsonTransforms.some(t => t.id === 'minify_json')).toBe(true);

      // For URL category
      const urlTransforms = result.current.getApplicableTransforms('Url');
      expect(urlTransforms.some(t => t.id === 'extract_urls')).toBe(true);
    });

    it('should expose templates and template operations', () => {
      const { result } = renderHook(() => useClipboardContext());

      expect(result.current.templates).toEqual([]);
      expect(typeof result.current.addTemplate).toBe('function');
      expect(typeof result.current.removeTemplate).toBe('function');
      expect(typeof result.current.updateTemplate).toBe('function');
      expect(typeof result.current.applyTemplate).toBe('function');
      expect(typeof result.current.searchTemplates).toBe('function');
    });

    it('should expose monitoring controls', () => {
      const { result } = renderHook(() => useClipboardContext());

      expect(typeof result.current.startMonitoring).toBe('function');
      expect(typeof result.current.stopMonitoring).toBe('function');
    });

    it('should expose clipboard operations', () => {
      const { result } = renderHook(() => useClipboardContext());

      expect(typeof result.current.readClipboard).toBe('function');
      expect(typeof result.current.writeText).toBe('function');
      expect(typeof result.current.writeHtml).toBe('function');
      expect(typeof result.current.clearClipboard).toBe('function');
    });

    it('should expose analysis operations', () => {
      const { result } = renderHook(() => useClipboardContext());

      expect(typeof result.current.analyzeContent).toBe('function');
      expect(typeof result.current.extractEntities).toBe('function');
      expect(typeof result.current.getSuggestedActions).toBe('function');
      expect(typeof result.current.detectCategory).toBe('function');
      expect(typeof result.current.detectLanguage).toBe('function');
      expect(typeof result.current.checkSensitive).toBe('function');
      expect(typeof result.current.getStats).toBe('function');
    });

    it('should expose transform operations', () => {
      const { result } = renderHook(() => useClipboardContext());

      expect(typeof result.current.transformContent).toBe('function');
      expect(typeof result.current.transformAndWrite).toBe('function');
      expect(typeof result.current.quickTransform).toBe('function');
    });

    it('should expose utility operations', () => {
      const { result } = renderHook(() => useClipboardContext());

      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.reset).toBe('function');
      expect(typeof result.current.readAndAnalyze).toBe('function');
      expect(typeof result.current.smartPaste).toBe('function');
      expect(typeof result.current.executeAction).toBe('function');
    });
  });
});
