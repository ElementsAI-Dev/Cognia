/**
 * Tests for useExportOptions, useExportPreview, useExportHandler hooks
 */

import { renderHook, act } from '@testing-library/react';
import { useExportOptions, useExportHandler } from './use-beautiful-export';
import type { Session, UIMessage } from '@/types';
import type { SyntaxThemeName } from '@/lib/export/html/syntax-themes';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock dynamic imports used by useExportHandler
jest.mock('@/lib/export', () => ({
  exportToBeautifulHTML: jest.fn(() => '<html>mock</html>'),
  downloadFile: jest.fn(),
  generateFilename: jest.fn(() => 'test.html'),
  exportToRichMarkdown: jest.fn(() => '# Mock'),
  exportToRichJSON: jest.fn(() => '{}'),
  exportToAnimatedHTML: jest.fn(() => '<html>animated</html>'),
}));

jest.mock('@/lib/export/html/syntax-themes', () => ({
  getAvailableSyntaxThemes: jest.fn(() => []),
}));

describe('useExportOptions', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('should initialize with default format', () => {
    const { result } = renderHook(() => useExportOptions());
    expect(result.current.selectedFormat).toBe('beautiful-html');
  });

  it('should initialize with default options', () => {
    const { result } = renderHook(() => useExportOptions());
    expect(result.current.options.theme).toBe('system');
    expect(result.current.options.syntaxTheme).toBe('one-dark-pro');
    expect(result.current.options.showTimestamps).toBe(true);
    expect(result.current.options.showTokens).toBe(false);
  });

  it('should allow changing format', () => {
    const { result } = renderHook(() => useExportOptions());

    act(() => {
      result.current.setSelectedFormat('markdown');
    });

    expect(result.current.selectedFormat).toBe('markdown');
  });

  it('should allow changing options', () => {
    const { result } = renderHook(() => useExportOptions());

    act(() => {
      result.current.setOptions((prev) => ({ ...prev, showTimestamps: false }));
    });

    expect(result.current.options.showTimestamps).toBe(false);
  });

  it('should persist options to localStorage', () => {
    const { result } = renderHook(() => useExportOptions());

    act(() => {
      result.current.setSelectedFormat('pdf');
    });

    act(() => {
      result.current.persistOptions();
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith('cognia-export-format', 'pdf');
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'cognia-export-options',
      expect.any(String)
    );
  });

  it('should restore format from localStorage', () => {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'cognia-export-format') return 'markdown';
      return null;
    });

    const { result } = renderHook(() => useExportOptions());
    expect(result.current.selectedFormat).toBe('markdown');
  });
});

describe('useExportHandler', () => {
  const mockSession = {
    id: 'session-1',
    title: 'Test Session',
    createdAt: new Date(),
    updatedAt: new Date(),
    model: 'gpt-4',
    provider: 'openai',
  } as unknown as Session;

  const mockMessages = [
    { id: 'msg-1', role: 'user', content: 'Hello' },
    { id: 'msg-2', role: 'assistant', content: 'Hi' },
  ] as unknown as UIMessage[];

  const mockOptions = {
    theme: 'system' as const,
    syntaxTheme: 'one-dark-pro' as SyntaxThemeName,
    showTimestamps: true,
    showTokens: false,
    showThinkingProcess: true,
    showToolCalls: true,
    includeCoverPage: true,
    includeTableOfContents: true,
    syntaxHighlighting: true,
    compactMode: false,
    pageLayout: {
      pageSize: 'a4' as const,
      orientation: 'portrait' as const,
      margins: { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 },
      headerEnabled: false,
      footerEnabled: true,
      showPageNumbers: true,
    },
  };

  const mockPersistOptions = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useExportHandler(mockSession, mockMessages, 'beautiful-html', mockOptions, [], mockPersistOptions)
    );

    expect(result.current.isExporting).toBe(false);
    expect(result.current.exportSuccess).toBeNull();
    expect(result.current.exportError).toBeNull();
  });

  it('should provide resetState function', () => {
    const { result } = renderHook(() =>
      useExportHandler(mockSession, mockMessages, 'beautiful-html', mockOptions, [], mockPersistOptions)
    );

    act(() => {
      result.current.resetState();
    });

    expect(result.current.exportSuccess).toBeNull();
    expect(result.current.exportError).toBeNull();
  });

  it('should provide handleExport function', () => {
    const { result } = renderHook(() =>
      useExportHandler(mockSession, mockMessages, 'beautiful-html', mockOptions, [], mockPersistOptions)
    );

    expect(typeof result.current.handleExport).toBe('function');
  });
});
