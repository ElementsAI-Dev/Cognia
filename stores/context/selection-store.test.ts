/**
 * Tests for selection-store
 */

import { act, renderHook } from '@testing-library/react';
import {
  useSelectionStore,
  selectConfig,
  selectIsEnabled,
  selectIsToolbarVisible,
  selectSelectedText,
  selectIsProcessing,
  selectResult,
  selectError,
  selectHistory,
} from './selection-store';

// Mock crypto.randomUUID
const mockUUID = 'test-uuid-1234';
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => mockUUID,
  },
});

describe('useSelectionStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useSelectionStore());
    act(() => {
      result.current.resetConfig();
      result.current.hideToolbar();
      result.current.clearHistory();
      result.current.setEnabled(true);
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useSelectionStore());

      expect(result.current.isEnabled).toBe(true);
      expect(result.current.isToolbarVisible).toBe(false);
      expect(result.current.selectedText).toBe('');
      expect(result.current.position).toEqual({ x: 0, y: 0 });
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.currentAction).toBeNull();
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.history).toEqual([]);
    });
  });

  describe('updateConfig', () => {
    it('should update config partially', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.updateConfig({ enabled: false });
      });

      expect(result.current.config.enabled).toBe(false);
    });

    it('should preserve other config values', () => {
      const { result } = renderHook(() => useSelectionStore());
      const originalConfig = { ...result.current.config };

      act(() => {
        result.current.updateConfig({ enabled: false });
      });

      expect(result.current.config.enabled).toBe(false);
      // Other values should remain unchanged
      expect(result.current.config.triggerMode).toBe(originalConfig.triggerMode);
    });

    it('should update multiple config values', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.updateConfig({
          minTextLength: 5,
          maxTextLength: 1000,
          delayMs: 500,
        });
      });

      expect(result.current.config.minTextLength).toBe(5);
      expect(result.current.config.maxTextLength).toBe(1000);
      expect(result.current.config.delayMs).toBe(500);
    });
  });

  describe('resetConfig', () => {
    it('should reset config to defaults', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.updateConfig({ enabled: false, minTextLength: 100 });
        result.current.resetConfig();
      });

      expect(result.current.config.enabled).toBe(true);
      expect(result.current.config.minTextLength).toBe(1);
    });
  });

  describe('setEnabled', () => {
    it('should set enabled state', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.setEnabled(false);
      });

      expect(result.current.isEnabled).toBe(false);

      act(() => {
        result.current.setEnabled(true);
      });

      expect(result.current.isEnabled).toBe(true);
    });
  });

  describe('toggle', () => {
    it('should toggle enabled state', () => {
      const { result } = renderHook(() => useSelectionStore());

      expect(result.current.isEnabled).toBe(true);

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isEnabled).toBe(false);

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isEnabled).toBe(true);
    });
  });

  describe('showToolbar', () => {
    it('should show toolbar with text and position', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.showToolbar('selected text', 100, 200);
      });

      expect(result.current.isToolbarVisible).toBe(true);
      expect(result.current.selectedText).toBe('selected text');
      expect(result.current.position).toEqual({ x: 100, y: 200 });
    });

    it('should reset result and error when showing toolbar', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.setResult('previous result');
        result.current.setError('previous error');
        result.current.showToolbar('new text', 0, 0);
      });

      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.currentAction).toBeNull();
    });
  });

  describe('hideToolbar', () => {
    it('should hide toolbar and reset state', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.showToolbar('text', 100, 200);
        result.current.setResult('result');
        result.current.hideToolbar();
      });

      expect(result.current.isToolbarVisible).toBe(false);
      expect(result.current.selectedText).toBe('');
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.currentAction).toBeNull();
    });
  });

  describe('setProcessing', () => {
    it('should set processing state with action', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.setProcessing('explain');
      });

      expect(result.current.isProcessing).toBe(true);
      expect(result.current.currentAction).toBe('explain');
    });

    it('should clear processing state when action is null', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.setProcessing('explain');
        result.current.setProcessing(null);
      });

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.currentAction).toBeNull();
    });
  });

  describe('setResult', () => {
    it('should set result and clear processing', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.setProcessing('explain');
        result.current.setResult('explanation result');
      });

      expect(result.current.result).toBe('explanation result');
      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error and clear processing', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.setProcessing('explain');
        result.current.setError('something went wrong');
      });

      expect(result.current.error).toBe('something went wrong');
      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('clearResult', () => {
    it('should clear result, error, and current action', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.setResult('result');
        result.current.setError('error');
        result.current.setProcessing('explain');
        result.current.clearResult();
      });

      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.currentAction).toBeNull();
    });
  });

  describe('addToHistory', () => {
    it('should add item to history with id and timestamp', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.addToHistory({
          text: 'selected text',
          action: 'explain',
          result: 'explanation',
        });
      });

      expect(result.current.history).toHaveLength(1);
      expect(result.current.history[0]).toMatchObject({
        id: mockUUID,
        text: 'selected text',
        action: 'explain',
        result: 'explanation',
      });
      expect(result.current.history[0].timestamp).toBeDefined();
    });

    it('should prepend new items to history', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.addToHistory({ text: 'first', action: 'explain', result: 'r1' });
        result.current.addToHistory({ text: 'second', action: 'translate', result: 'r2' });
      });

      expect(result.current.history).toHaveLength(2);
      expect(result.current.history[0].text).toBe('second');
      expect(result.current.history[1].text).toBe('first');
    });

    it('should limit history to 200 items', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        for (let i = 0; i < 210; i++) {
          result.current.addToHistory({
            text: `text ${i}`,
            action: 'explain',
            result: `result ${i}`,
          });
        }
      });

      expect(result.current.history).toHaveLength(200);
      expect(result.current.history[0].text).toBe('text 209');
    });
  });

  describe('clearHistory', () => {
    it('should clear all history', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.addToHistory({ text: 'text1', action: 'explain', result: 'r1' });
        result.current.addToHistory({ text: 'text2', action: 'translate', result: 'r2' });
        result.current.clearHistory();
      });

      expect(result.current.history).toEqual([]);
    });
  });

  describe('selectors', () => {
    it('selectConfig should return config', () => {
      const { result } = renderHook(() => useSelectionStore());
      const state = result.current;
      expect(selectConfig(state)).toBe(state.config);
    });

    it('selectIsEnabled should return isEnabled', () => {
      const { result } = renderHook(() => useSelectionStore());
      const state = result.current;
      expect(selectIsEnabled(state)).toBe(state.isEnabled);
    });

    it('selectIsToolbarVisible should return isToolbarVisible', () => {
      const { result } = renderHook(() => useSelectionStore());
      const state = result.current;
      expect(selectIsToolbarVisible(state)).toBe(state.isToolbarVisible);
    });

    it('selectSelectedText should return selectedText', () => {
      const { result } = renderHook(() => useSelectionStore());
      const state = result.current;
      expect(selectSelectedText(state)).toBe(state.selectedText);
    });

    it('selectIsProcessing should return isProcessing', () => {
      const { result } = renderHook(() => useSelectionStore());
      const state = result.current;
      expect(selectIsProcessing(state)).toBe(state.isProcessing);
    });

    it('selectResult should return result', () => {
      const { result } = renderHook(() => useSelectionStore());
      const state = result.current;
      expect(selectResult(state)).toBe(state.result);
    });

    it('selectError should return error', () => {
      const { result } = renderHook(() => useSelectionStore());
      const state = result.current;
      expect(selectError(state)).toBe(state.error);
    });

    it('selectHistory should return history', () => {
      const { result } = renderHook(() => useSelectionStore());
      const state = result.current;
      expect(selectHistory(state)).toBe(state.history);
    });
  });

  describe('multi-selection', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useSelectionStore());
      act(() => {
        result.current.clearSelections();
      });
    });

    it('should have initial multi-select state', () => {
      const { result } = renderHook(() => useSelectionStore());
      expect(result.current.selections).toEqual([]);
      expect(result.current.isMultiSelectMode).toBe(false);
    });

    it('should toggle multi-select mode', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.toggleMultiSelectMode();
      });

      expect(result.current.isMultiSelectMode).toBe(true);

      act(() => {
        result.current.toggleMultiSelectMode();
      });

      expect(result.current.isMultiSelectMode).toBe(false);
    });

    it('should add selection', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.addSelection('test text', { x: 100, y: 200 });
      });

      expect(result.current.selections).toHaveLength(1);
      expect(result.current.selections[0]).toMatchObject({
        text: 'test text',
        position: { x: 100, y: 200 },
      });
      expect(result.current.selections[0].id).toBeDefined();
      expect(result.current.selections[0].timestamp).toBeDefined();
    });

    it('should add selection with options', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.addSelection(
          'code text',
          { x: 0, y: 0 },
          {
            sourceApp: 'VSCode',
            textType: 'code',
          }
        );
      });

      expect(result.current.selections[0].sourceApp).toBe('VSCode');
      expect(result.current.selections[0].textType).toBe('code');
    });

    it('should not add duplicate selections', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.addSelection('same text', { x: 100, y: 200 });
        result.current.addSelection('same text', { x: 300, y: 400 });
      });

      expect(result.current.selections).toHaveLength(1);
    });

    it('should remove selection by id', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.addSelection('text 1', { x: 0, y: 0 });
        result.current.addSelection('text 2', { x: 0, y: 0 });
      });

      const idToRemove = result.current.selections[0].id;

      act(() => {
        result.current.removeSelection(idToRemove);
      });

      expect(result.current.selections).toHaveLength(1);
      expect(result.current.selections[0].text).toBe('text 2');
    });

    it('should clear all selections', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.toggleMultiSelectMode();
        result.current.addSelection('text 1', { x: 0, y: 0 });
        result.current.addSelection('text 2', { x: 0, y: 0 });
        result.current.clearSelections();
      });

      expect(result.current.selections).toEqual([]);
      expect(result.current.isMultiSelectMode).toBe(false);
    });

    it('should get selected texts', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.addSelection('text 1', { x: 0, y: 0 });
        result.current.addSelection('text 2', { x: 0, y: 0 });
      });

      const texts = result.current.getSelectedTexts();
      expect(texts).toEqual(['text 1', 'text 2']);
    });

    it('should get combined text', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.addSelection('first paragraph', { x: 0, y: 0 });
        result.current.addSelection('second paragraph', { x: 0, y: 0 });
      });

      const combined = result.current.getCombinedText();
      expect(combined).toBe('first paragraph\n\n---\n\nsecond paragraph');
    });

    it('should return selectedText when no selections', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.showToolbar('current selection', 0, 0);
      });

      const combined = result.current.getCombinedText();
      expect(combined).toBe('current selection');
    });
  });

  describe('references', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useSelectionStore());
      act(() => {
        result.current.clearReferences();
      });
    });

    it('should have initial references state', () => {
      const { result } = renderHook(() => useSelectionStore());
      expect(result.current.references).toEqual([]);
    });

    it('should add reference', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.addReference({
          type: 'file',
          title: 'test.txt',
          content: 'file content',
          preview: 'file...',
        });
      });

      expect(result.current.references).toHaveLength(1);
      expect(result.current.references[0]).toMatchObject({
        type: 'file',
        title: 'test.txt',
        content: 'file content',
        preview: 'file...',
      });
      expect(result.current.references[0].id).toBeDefined();
    });

    it('should add reference with metadata', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.addReference({
          type: 'url',
          title: 'Example',
          content: 'content',
          metadata: {
            url: 'https://example.com',
            timestamp: 1234567890,
          },
        });
      });

      expect(result.current.references[0].metadata).toEqual({
        url: 'https://example.com',
        timestamp: 1234567890,
      });
    });

    it('should remove reference by id', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.addReference({ type: 'note', title: 'Note 1', content: 'c1' });
        result.current.addReference({ type: 'note', title: 'Note 2', content: 'c2' });
      });

      const idToRemove = result.current.references[0].id;

      act(() => {
        result.current.removeReference(idToRemove);
      });

      expect(result.current.references).toHaveLength(1);
      expect(result.current.references[0].title).toBe('Note 2');
    });

    it('should clear all references', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.addReference({ type: 'note', title: 'Note 1', content: 'c1' });
        result.current.addReference({ type: 'note', title: 'Note 2', content: 'c2' });
        result.current.clearReferences();
      });

      expect(result.current.references).toEqual([]);
    });

    it('should update reference', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.addReference({
          type: 'note',
          title: 'Original Title',
          content: 'original content',
        });
      });

      const refId = result.current.references[0].id;

      act(() => {
        result.current.updateReference(refId, {
          title: 'Updated Title',
          content: 'updated content',
        });
      });

      expect(result.current.references[0].title).toBe('Updated Title');
      expect(result.current.references[0].content).toBe('updated content');
      expect(result.current.references[0].type).toBe('note'); // unchanged
    });

    it('should support all reference types', () => {
      const { result } = renderHook(() => useSelectionStore());

      const types = ['file', 'url', 'clipboard', 'selection', 'note'] as const;

      act(() => {
        types.forEach((type) => {
          result.current.addReference({
            type,
            title: `${type} ref`,
            content: `${type} content`,
          });
        });
      });

      expect(result.current.references).toHaveLength(5);
      types.forEach((type, index) => {
        expect(result.current.references[index].type).toBe(type);
      });
    });
  });

  describe('streaming', () => {
    it('should set streaming state', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.setStreaming(true);
      });

      expect(result.current.isStreaming).toBe(true);
      expect(result.current.streamingResult).toBe('');
    });

    it('should append streaming result', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.setStreaming(true);
        result.current.appendStreamingResult('Hello');
        result.current.appendStreamingResult(' World');
      });

      expect(result.current.streamingResult).toBe('Hello World');
    });

    it('should clear streaming result when streaming ends', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.setStreaming(true);
        result.current.appendStreamingResult('content');
        result.current.setStreaming(false);
      });

      expect(result.current.isStreaming).toBe(false);
      expect(result.current.streamingResult).toBeNull();
    });
  });

  describe('favorites', () => {
    it('should toggle favorite on history item', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.addToHistory({
          text: 'test',
          action: 'explain',
          result: 'result',
        });
      });

      const itemId = result.current.history[0].id;

      act(() => {
        result.current.toggleFavorite(itemId);
      });

      expect(result.current.history[0].isFavorite).toBe(true);

      act(() => {
        result.current.toggleFavorite(itemId);
      });

      expect(result.current.history[0].isFavorite).toBe(false);
    });
  });

  describe('history export/import', () => {
    it('should export history as JSON', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.addToHistory({
          text: 'test',
          action: 'explain',
          result: 'result',
        });
      });

      const exported = result.current.exportHistory();
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].text).toBe('test');
    });

    it('should import history from JSON', () => {
      const { result } = renderHook(() => useSelectionStore());

      const historyData = [
        {
          id: 'import-1',
          text: 'imported text',
          action: 'translate',
          result: 'imported result',
          timestamp: Date.now(),
        },
      ];

      let success: boolean;
      act(() => {
        success = result.current.importHistory(JSON.stringify(historyData));
      });

      expect(success!).toBe(true);
      expect(result.current.history).toHaveLength(1);
      expect(result.current.history[0].text).toBe('imported text');
    });

    it('should reject invalid JSON on import', () => {
      const { result } = renderHook(() => useSelectionStore());

      let success: boolean;
      act(() => {
        success = result.current.importHistory('invalid json');
      });

      expect(success!).toBe(false);
    });
  });

  describe('translation memory', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useSelectionStore());
      act(() => {
        result.current.clearTranslationMemory();
      });
    });

    it('should have initial empty translation memory', () => {
      const { result } = renderHook(() => useSelectionStore());
      expect(result.current.translationMemory).toEqual([]);
    });

    it('should add translation memory entry', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.addTranslationMemory({
          sourceText: 'Hello',
          sourceLanguage: 'en',
          targetLanguage: 'zh-CN',
          translation: '你好',
        });
      });

      expect(result.current.translationMemory).toHaveLength(1);
      expect(result.current.translationMemory[0]).toMatchObject({
        sourceText: 'Hello',
        sourceLanguage: 'en',
        targetLanguage: 'zh-CN',
        translation: '你好',
        usageCount: 1,
      });
      expect(result.current.translationMemory[0].id).toBeDefined();
      expect(result.current.translationMemory[0].timestamp).toBeDefined();
    });

    it('should update existing entry instead of adding duplicate', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.addTranslationMemory({
          sourceText: 'Hello',
          sourceLanguage: 'en',
          targetLanguage: 'zh-CN',
          translation: '你好',
        });
      });

      act(() => {
        result.current.addTranslationMemory({
          sourceText: 'Hello',
          sourceLanguage: 'en',
          targetLanguage: 'zh-CN',
          translation: '您好', // Different translation
        });
      });

      expect(result.current.translationMemory).toHaveLength(1);
      expect(result.current.translationMemory[0].translation).toBe('您好');
      expect(result.current.translationMemory[0].usageCount).toBe(2);
    });

    it('should find translation memory entry', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.addTranslationMemory({
          sourceText: 'Hello',
          sourceLanguage: 'en',
          targetLanguage: 'zh-CN',
          translation: '你好',
        });
      });

      const found = result.current.findTranslationMemory('Hello', 'zh-CN');
      expect(found).not.toBeNull();
      expect(found?.translation).toBe('你好');
    });

    it('should find translation memory case-insensitively', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.addTranslationMemory({
          sourceText: 'Hello',
          sourceLanguage: 'en',
          targetLanguage: 'zh-CN',
          translation: '你好',
        });
      });

      const found = result.current.findTranslationMemory('HELLO', 'zh-CN');
      expect(found).not.toBeNull();
    });

    it('should return null when no match found', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.addTranslationMemory({
          sourceText: 'Hello',
          sourceLanguage: 'en',
          targetLanguage: 'zh-CN',
          translation: '你好',
        });
      });

      const found = result.current.findTranslationMemory('Goodbye', 'zh-CN');
      expect(found).toBeNull();
    });

    it('should not match different target language', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.addTranslationMemory({
          sourceText: 'Hello',
          sourceLanguage: 'en',
          targetLanguage: 'zh-CN',
          translation: '你好',
        });
      });

      const found = result.current.findTranslationMemory('Hello', 'ja');
      expect(found).toBeNull();
    });

    it('should increment usage count', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.addTranslationMemory({
          sourceText: 'Hello',
          sourceLanguage: 'en',
          targetLanguage: 'zh-CN',
          translation: '你好',
        });
      });

      const entryId = result.current.translationMemory[0].id;

      act(() => {
        result.current.incrementTranslationUsage(entryId);
        result.current.incrementTranslationUsage(entryId);
      });

      expect(result.current.translationMemory[0].usageCount).toBe(3);
    });

    it('should clear translation memory', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.addTranslationMemory({
          sourceText: 'Hello',
          sourceLanguage: 'en',
          targetLanguage: 'zh-CN',
          translation: '你好',
        });
        result.current.addTranslationMemory({
          sourceText: 'Goodbye',
          sourceLanguage: 'en',
          targetLanguage: 'zh-CN',
          translation: '再见',
        });
        result.current.clearTranslationMemory();
      });

      expect(result.current.translationMemory).toEqual([]);
    });

    it('should limit translation memory to 500 entries', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        for (let i = 0; i < 510; i++) {
          result.current.addTranslationMemory({
            sourceText: `text ${i}`,
            sourceLanguage: 'en',
            targetLanguage: 'zh-CN',
            translation: `翻译 ${i}`,
          });
        }
      });

      expect(result.current.translationMemory.length).toBeLessThanOrEqual(500);
    });
  });
});
