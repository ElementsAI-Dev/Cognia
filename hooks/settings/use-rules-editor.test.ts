/**
 * Tests for useRulesEditor hook
 * Comprehensive test coverage for rules editor functionality
 */

import { renderHook, act } from '@testing-library/react';
import { useRulesEditor } from './use-rules-editor';

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/stores', () => ({
  useSettingsStore: () => ({
    defaultProvider: 'openai',
    providerSettings: {
      openai: {
        apiKey: 'test-key',
        defaultModel: 'gpt-4o',
        baseURL: undefined,
      },
    },
  }),
}));

jest.mock('@/lib/ai/generation/rules-optimizer', () => ({
  optimizeRules: jest.fn().mockResolvedValue({
    optimizedContent: '# Optimized Rules\n- Rule 1\n- Rule 2',
    changes: [{ type: 'improved', description: 'Enhanced clarity' }],
  }),
}));

jest.mock('@/components/settings/rules/constants', () => ({
  RULE_TARGETS: [
    { id: 'cursor', label: 'Cursor', path: '.cursorrules', icon: null },
    { id: 'windsurf', label: 'Windsurf', path: '.windsurfrules', icon: null },
  ],
  RULE_TEMPLATES: {
    general: {
      base: {
        label: 'Balanced Base',
        content: '# Default Rules\n- Rule 1',
      },
      senior: {
        label: 'Senior Engineer',
        content: '# Senior Rules\n- Rule A',
      },
    },
    frontend: {
      react: {
        label: 'React & Tailwind',
        content: '# React Rules\n- Component rules',
      },
    },
  },
  MAX_HISTORY_SIZE: 50,
}));

// Mock clipboard API
const mockClipboard = {
  writeText: jest.fn().mockResolvedValue(undefined),
};
Object.assign(navigator, { clipboard: mockClipboard });

// Mock URL methods
const mockCreateObjectURL = jest.fn().mockReturnValue('blob:test-url');
const mockRevokeObjectURL = jest.fn();
URL.createObjectURL = mockCreateObjectURL;
URL.revokeObjectURL = mockRevokeObjectURL;

describe('useRulesEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should return default state values', () => {
      const { result } = renderHook(() => useRulesEditor({}));

      expect(result.current.activeTab).toBe('cursor');
      expect(result.current.showPreview).toBe(true);
      expect(result.current.wordWrap).toBe(true);
      expect(result.current.theme).toBe('vs-dark');
      expect(result.current.mobileMenuOpen).toBe(false);
      expect(result.current.isOptimizing).toBe(false);
      expect(result.current.showResetDialog).toBe(false);
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });

    it('should initialize with default template content', () => {
      const { result } = renderHook(() => useRulesEditor({}));

      expect(result.current.activeContent).toBe('# Default Rules\n- Rule 1');
      expect(result.current.isDirty).toBe(false);
    });

    it('should initialize with provided initialContent', () => {
      const initialContent = {
        cursor: '# Custom Rules',
        windsurf: '# Windsurf Rules',
      };
      const { result } = renderHook(() => useRulesEditor({ initialContent }));

      expect(result.current.contents.cursor).toBe('# Custom Rules');
      expect(result.current.contents.windsurf).toBe('# Windsurf Rules');
    });

    it('should calculate correct statistics', () => {
      const { result } = renderHook(() => useRulesEditor({}));

      const content = result.current.activeContent;
      expect(result.current.charCount).toBe(content.length);
      expect(result.current.wordCount).toBeGreaterThan(0);
      expect(result.current.tokenEstimate).toBe(Math.ceil(content.length / 4));
    });
  });

  describe('Tab Management', () => {
    it('should change active tab', () => {
      const { result } = renderHook(() => useRulesEditor({}));

      expect(result.current.activeTab).toBe('cursor');

      act(() => {
        result.current.setActiveTab('windsurf');
      });

      expect(result.current.activeTab).toBe('windsurf');
    });

    it('should maintain separate content for each tab', () => {
      const { result } = renderHook(() => useRulesEditor({}));

      act(() => {
        result.current.handleContentChange('# Cursor specific content');
      });

      act(() => {
        result.current.setActiveTab('windsurf');
      });

      expect(result.current.activeContent).toBe('# Default Rules\n- Rule 1');

      act(() => {
        result.current.setActiveTab('cursor');
      });

      expect(result.current.activeContent).toBe('# Cursor specific content');
    });
  });

  describe('Content Editing', () => {
    it('should update content when handleContentChange is called', () => {
      const { result } = renderHook(() => useRulesEditor({}));

      act(() => {
        result.current.handleContentChange('# New Content');
      });

      expect(result.current.activeContent).toBe('# New Content');
      expect(result.current.isDirty).toBe(true);
    });

    it('should handle undefined value in handleContentChange', () => {
      const { result } = renderHook(() => useRulesEditor({}));

      act(() => {
        result.current.handleContentChange(undefined);
      });

      expect(result.current.activeContent).toBe('');
    });

    it('should insert variable at end of content', () => {
      const { result } = renderHook(() => useRulesEditor({}));

      act(() => {
        result.current.handleInsertVariable('{{project_name}}');
      });

      expect(result.current.activeContent).toContain('{{project_name}}');
    });

  });

  describe('Template Application', () => {
    it('should apply template content', () => {
      const { result } = renderHook(() => useRulesEditor({}));

      act(() => {
        result.current.handleApplyTemplate('general', 'senior');
      });

      expect(result.current.activeContent).toBe('# Senior Rules\n- Rule A');
    });

    it('should show success toast on template application', async () => {
      const { toast } = await import('sonner');
      const { result } = renderHook(() => useRulesEditor({}));

      act(() => {
        result.current.handleApplyTemplate('frontend', 'react');
      });

      expect(toast.success).toHaveBeenCalledWith('Applied template: React & Tailwind');
    });

    it('should not change content for invalid template', () => {
      const { result } = renderHook(() => useRulesEditor({}));
      const originalContent = result.current.activeContent;

      act(() => {
        result.current.handleApplyTemplate('invalid', 'category');
      });

      expect(result.current.activeContent).toBe(originalContent);
    });
  });

  describe('History Management (Undo/Redo)', () => {
    it('should enable undo after content change', () => {
      const { result } = renderHook(() => useRulesEditor({}));

      expect(result.current.canUndo).toBe(false);

      act(() => {
        result.current.handleContentChange('# Change 1');
      });

      expect(result.current.canUndo).toBe(true);
    });

    it('should undo content changes', () => {
      const { result } = renderHook(() => useRulesEditor({}));
      const originalContent = result.current.activeContent;

      act(() => {
        result.current.handleContentChange('# Change 1');
      });

      act(() => {
        result.current.handleUndo();
      });

      expect(result.current.activeContent).toBe(originalContent);
      expect(result.current.canUndo).toBe(false);
    });

    it('should enable redo after undo', () => {
      const { result } = renderHook(() => useRulesEditor({}));

      act(() => {
        result.current.handleContentChange('# Change 1');
      });

      act(() => {
        result.current.handleUndo();
      });

      expect(result.current.canRedo).toBe(true);
    });

    it('should redo content changes', () => {
      const { result } = renderHook(() => useRulesEditor({}));

      act(() => {
        result.current.handleContentChange('# Change 1');
      });

      act(() => {
        result.current.handleUndo();
      });

      act(() => {
        result.current.handleRedo();
      });

      expect(result.current.activeContent).toBe('# Change 1');
    });

    it('should maintain separate history per tab', () => {
      const { result } = renderHook(() => useRulesEditor({}));

      act(() => {
        result.current.handleContentChange('# Cursor Change');
      });

      act(() => {
        result.current.setActiveTab('windsurf');
      });

      expect(result.current.canUndo).toBe(false);
    });

    it('should not undo when canUndo is false', () => {
      const { result } = renderHook(() => useRulesEditor({}));
      const originalContent = result.current.activeContent;

      act(() => {
        result.current.handleUndo();
      });

      expect(result.current.activeContent).toBe(originalContent);
    });

    it('should not redo when canRedo is false', () => {
      const { result } = renderHook(() => useRulesEditor({}));
      const originalContent = result.current.activeContent;

      act(() => {
        result.current.handleRedo();
      });

      expect(result.current.activeContent).toBe(originalContent);
    });
  });

  describe('File Operations', () => {
    it('should call onSave with correct path and content', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useRulesEditor({ onSave }));

      await act(async () => {
        await result.current.handleSave();
      });

      expect(onSave).toHaveBeenCalledWith('.cursorrules', result.current.activeContent);
    });

    it('should update originalContents after successful save', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useRulesEditor({ onSave }));

      act(() => {
        result.current.handleContentChange('# Modified');
      });

      expect(result.current.isDirty).toBe(true);

      await act(async () => {
        await result.current.handleSave();
      });

      expect(result.current.isDirty).toBe(false);
    });

  });

});
