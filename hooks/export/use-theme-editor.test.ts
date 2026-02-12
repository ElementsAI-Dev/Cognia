/**
 * Tests for useThemeEditor hook
 */

import { renderHook, act } from '@testing-library/react';
import { useThemeEditor } from './use-theme-editor';

const mockAddTheme = jest.fn().mockReturnValue('new-theme-id');
const mockUpdateTheme = jest.fn();
const mockGetTheme = jest.fn().mockReturnValue(null);
const mockExportTheme = jest.fn().mockReturnValue('{"name":"test"}');
const mockImportTheme = jest.fn().mockReturnValue({ success: true });

jest.mock('@/stores/settings', () => ({
  useCustomThemeStore: jest.fn(() => ({
    addTheme: mockAddTheme,
    updateTheme: mockUpdateTheme,
    getTheme: mockGetTheme,
    exportTheme: mockExportTheme,
    importTheme: mockImportTheme,
  })),
  createDefaultThemeTemplate: jest.fn((_name: string, isDark: boolean) => ({
    colors: {
      background: isDark ? '#1e1e1e' : '#ffffff',
      foreground: isDark ? '#d4d4d4' : '#333333',
      comment: '#6a9955',
      keyword: '#569cd6',
      string: '#ce9178',
      number: '#b5cea8',
      function: '#dcdcaa',
      operator: '#d4d4d4',
      property: '#9cdcfe',
      className: '#4ec9b0',
      constant: '#4fc1ff',
      tag: '#569cd6',
      attrName: '#9cdcfe',
      attrValue: '#ce9178',
      punctuation: '#d4d4d4',
      selection: '#264f78',
      lineHighlight: '#2a2d2e',
    },
  })),
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockT = jest.fn((key: string) => key);
const mockOnSave = jest.fn();
const mockOnOpenChange = jest.fn();

describe('useThemeEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default values for new theme', () => {
    const { result } = renderHook(() =>
      useThemeEditor(null, mockOnSave, mockOnOpenChange, mockT)
    );

    expect(result.current.themeName).toBe('My Custom Theme');
    expect(result.current.isDark).toBe(true);
    expect(result.current.colors).toBeDefined();
    expect(result.current.colors.background).toBe('#1e1e1e');
  });

  it('should allow changing theme name', () => {
    const { result } = renderHook(() =>
      useThemeEditor(null, mockOnSave, mockOnOpenChange, mockT)
    );

    act(() => {
      result.current.setThemeName('My Dark Theme');
    });

    expect(result.current.themeName).toBe('My Dark Theme');
  });

  it('should allow toggling dark mode', () => {
    const { result } = renderHook(() =>
      useThemeEditor(null, mockOnSave, mockOnOpenChange, mockT)
    );

    act(() => {
      result.current.setIsDark(false);
    });

    expect(result.current.isDark).toBe(false);
  });

  it('should update individual colors', () => {
    const { result } = renderHook(() =>
      useThemeEditor(null, mockOnSave, mockOnOpenChange, mockT)
    );

    act(() => {
      result.current.updateColor('background', '#000000');
    });

    expect(result.current.colors.background).toBe('#000000');
  });

  it('should reset colors to defaults', () => {
    const { result } = renderHook(() =>
      useThemeEditor(null, mockOnSave, mockOnOpenChange, mockT)
    );

    act(() => {
      result.current.updateColor('background', '#ff0000');
    });

    expect(result.current.colors.background).toBe('#ff0000');

    act(() => {
      result.current.resetToDefaults();
    });

    expect(result.current.colors.background).toBe('#1e1e1e');
  });

  it('should save new theme', () => {
    const { result } = renderHook(() =>
      useThemeEditor(null, mockOnSave, mockOnOpenChange, mockT)
    );

    act(() => {
      result.current.handleSave();
    });

    expect(mockAddTheme).toHaveBeenCalledWith(expect.objectContaining({
      displayName: 'My Custom Theme',
      isDark: true,
    }));
    expect(mockOnSave).toHaveBeenCalledWith('new-theme-id');
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should not save with empty name', () => {
    const { toast } = jest.requireMock('sonner');
    const { result } = renderHook(() =>
      useThemeEditor(null, mockOnSave, mockOnOpenChange, mockT)
    );

    act(() => {
      result.current.setThemeName('');
    });

    act(() => {
      result.current.handleSave();
    });

    expect(toast.error).toHaveBeenCalledWith('enterThemeName');
    expect(mockAddTheme).not.toHaveBeenCalled();
  });

  it('should update existing theme', () => {
    const existingTheme = {
      displayName: 'Existing Theme',
      isDark: false,
      colors: { background: '#ffffff', foreground: '#333333' },
    };
    mockGetTheme.mockReturnValue(existingTheme);

    const { result } = renderHook(() =>
      useThemeEditor('existing-id', mockOnSave, mockOnOpenChange, mockT)
    );

    act(() => {
      result.current.handleSave();
    });

    expect(mockUpdateTheme).toHaveBeenCalledWith('existing-id', expect.objectContaining({
      displayName: 'Existing Theme',
    }));
  });

  it('should handle export', () => {
    // Setup URL mocks before rendering
    const origCreateObjectURL = URL.createObjectURL;
    const origRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = jest.fn().mockReturnValue('blob:mock');
    URL.revokeObjectURL = jest.fn();

    const mockClick = jest.fn();
    const origCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return { href: '', download: '', click: mockClick } as unknown as HTMLElement;
      }
      return origCreateElement(tag);
    });

    const { result } = renderHook(() =>
      useThemeEditor('existing-id', mockOnSave, mockOnOpenChange, mockT)
    );

    act(() => {
      result.current.handleExport();
    });

    expect(mockExportTheme).toHaveBeenCalledWith('existing-id');
    expect(mockClick).toHaveBeenCalled();

    // Restore
    URL.createObjectURL = origCreateObjectURL;
    URL.revokeObjectURL = origRevokeObjectURL;
    jest.restoreAllMocks();
  });

  it('should provide handleImport function', () => {
    const { result } = renderHook(() =>
      useThemeEditor(null, mockOnSave, mockOnOpenChange, mockT)
    );

    expect(typeof result.current.handleImport).toBe('function');
  });
});
