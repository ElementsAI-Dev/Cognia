/**
 * Clipboard Context Store Tests
 */

import { act, renderHook } from '@testing-library/react';
import {
  useClipboardContextStore,
  useCurrentClipboardContent,
  useClipboardTemplates,
  useIsClipboardMonitoring,
} from './clipboard-context-store';

// Mock Tauri invoke
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

// Mock Tauri events
jest.mock('@tauri-apps/api/event', () => ({
  listen: jest.fn().mockResolvedValue(jest.fn()),
}));

// Mock isTauri
jest.mock('@/lib/native/utils', () => ({
  isTauri: jest.fn().mockReturnValue(false),
}));

describe('clipboard-context-store', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useClipboardContextStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useClipboardContextStore());

      expect(result.current.currentContent).toBeNull();
      expect(result.current.currentAnalysis).toBeNull();
      expect(result.current.isAnalyzing).toBe(false);
      expect(result.current.templates).toEqual([]);
      expect(result.current.isMonitoring).toBe(false);
      expect(result.current.lastUpdateTime).toBeNull();
      expect(result.current.autoAnalyze).toBe(true);
      expect(result.current.monitoringInterval).toBe(2000);
      expect(result.current.error).toBeNull();
    });
  });

  describe('template management', () => {
    it('should add a template', () => {
      const { result } = renderHook(() => useClipboardContextStore());

      act(() => {
        result.current.addTemplate({
          name: 'Test Template',
          description: 'A test template',
          content: 'Hello {{name}}!',
          variables: ['name'],
          category: 'test',
          tags: ['greeting'],
        });
      });

      expect(result.current.templates).toHaveLength(1);
      expect(result.current.templates[0].name).toBe('Test Template');
      expect(result.current.templates[0].content).toBe('Hello {{name}}!');
      expect(result.current.templates[0].variables).toEqual(['name']);
      expect(result.current.templates[0].usageCount).toBe(0);
    });

    it('should remove a template', () => {
      const { result } = renderHook(() => useClipboardContextStore());

      act(() => {
        result.current.addTemplate({
          name: 'Template 1',
          content: 'Content 1',
          variables: [],
          tags: [],
        });
        result.current.addTemplate({
          name: 'Template 2',
          content: 'Content 2',
          variables: [],
          tags: [],
        });
      });

      expect(result.current.templates).toHaveLength(2);

      const templateId = result.current.templates[0].id;
      act(() => {
        result.current.removeTemplate(templateId);
      });

      expect(result.current.templates).toHaveLength(1);
      expect(result.current.templates[0].name).toBe('Template 2');
    });

    it('should update a template', () => {
      const { result } = renderHook(() => useClipboardContextStore());

      act(() => {
        result.current.addTemplate({
          name: 'Original Name',
          content: 'Original Content',
          variables: [],
          tags: [],
        });
      });

      const templateId = result.current.templates[0].id;
      act(() => {
        result.current.updateTemplate(templateId, {
          name: 'Updated Name',
          content: 'Updated Content',
        });
      });

      expect(result.current.templates[0].name).toBe('Updated Name');
      expect(result.current.templates[0].content).toBe('Updated Content');
    });

    it('should search templates', () => {
      const { result } = renderHook(() => useClipboardContextStore());

      act(() => {
        result.current.addTemplate({
          name: 'Email Signature',
          description: 'Professional signature',
          content: 'Best regards',
          variables: [],
          tags: ['email', 'professional'],
        });
        result.current.addTemplate({
          name: 'Code Comment',
          description: 'JSDoc comment',
          content: '/** */',
          variables: [],
          tags: ['code', 'documentation'],
        });
      });

      const emailResults = result.current.searchTemplates('email');
      expect(emailResults).toHaveLength(1);
      expect(emailResults[0].name).toBe('Email Signature');

      const codeResults = result.current.searchTemplates('code');
      expect(codeResults).toHaveLength(1);
      expect(codeResults[0].name).toBe('Code Comment');

      const docResults = result.current.searchTemplates('documentation');
      expect(docResults).toHaveLength(1);
    });
  });

  describe('settings', () => {
    it('should update autoAnalyze setting', () => {
      const { result } = renderHook(() => useClipboardContextStore());

      expect(result.current.autoAnalyze).toBe(true);

      act(() => {
        result.current.setAutoAnalyze(false);
      });

      expect(result.current.autoAnalyze).toBe(false);
    });

    it('should update monitoring interval', () => {
      const { result } = renderHook(() => useClipboardContextStore());

      expect(result.current.monitoringInterval).toBe(2000);

      act(() => {
        result.current.setMonitoringInterval(5000);
      });

      expect(result.current.monitoringInterval).toBe(5000);
    });
  });

  describe('error handling', () => {
    it('should clear error', () => {
      const { result } = renderHook(() => useClipboardContextStore());

      // Manually set an error state for testing
      act(() => {
        useClipboardContextStore.setState({ error: 'Test error' });
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      const { result } = renderHook(() => useClipboardContextStore());

      // Modify state
      act(() => {
        result.current.addTemplate({
          name: 'Test',
          content: 'Content',
          variables: [],
          tags: [],
        });
        result.current.setAutoAnalyze(false);
        result.current.setMonitoringInterval(5000);
      });

      expect(result.current.templates).toHaveLength(1);
      expect(result.current.autoAnalyze).toBe(false);
      expect(result.current.monitoringInterval).toBe(5000);

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.templates).toEqual([]);
      expect(result.current.autoAnalyze).toBe(true);
      expect(result.current.monitoringInterval).toBe(2000);
    });
  });

  describe('selector hooks', () => {
    it('useCurrentClipboardContent should return content', () => {
      renderHook(() => useClipboardContextStore());
      const { result: contentResult } = renderHook(() => useCurrentClipboardContent());

      expect(contentResult.current).toBeNull();

      act(() => {
        useClipboardContextStore.setState({ currentContent: 'Test content' });
      });

      // Re-render to get updated value
      const { result: contentResult2 } = renderHook(() => useCurrentClipboardContent());
      expect(contentResult2.current).toBe('Test content');
    });

    it('useClipboardTemplates should return templates', () => {
      const { result: templatesResult } = renderHook(() => useClipboardTemplates());

      expect(templatesResult.current).toEqual([]);

      act(() => {
        useClipboardContextStore.getState().addTemplate({
          name: 'Test',
          content: 'Content',
          variables: [],
          tags: [],
        });
      });

      const { result: templatesResult2 } = renderHook(() => useClipboardTemplates());
      expect(templatesResult2.current).toHaveLength(1);
    });

    it('useIsClipboardMonitoring should return monitoring state', () => {
      const { result: monitoringResult } = renderHook(() => useIsClipboardMonitoring());

      expect(monitoringResult.current).toBe(false);
    });
  });
});
