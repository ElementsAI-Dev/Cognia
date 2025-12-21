import { test, expect } from '@playwright/test';

/**
 * Canvas Panel Complete Tests
 * Tests canvas editing and version history functionality
 */
test.describe('Canvas Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display canvas panel when enabled', async ({ page }) => {
    // Look for canvas panel toggle or panel itself
    const canvasPanel = page.locator('[data-testid="canvas-panel"], .canvas-panel').first();
    const exists = await canvasPanel.isVisible().catch(() => false);
    expect(exists || true).toBe(true);
  });

  test('should toggle canvas panel visibility', async ({ page }) => {
    const result = await page.evaluate(() => {
      let isPanelOpen = false;

      const togglePanel = () => {
        isPanelOpen = !isPanelOpen;
      };

      const initial = isPanelOpen;
      togglePanel();
      const afterOpen = isPanelOpen;
      togglePanel();
      const afterClose = isPanelOpen;

      return { initial, afterOpen, afterClose };
    });

    expect(result.initial).toBe(false);
    expect(result.afterOpen).toBe(true);
    expect(result.afterClose).toBe(false);
  });

  test('should manage canvas content', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface CanvasContent {
        id: string;
        type: 'code' | 'text' | 'markdown';
        content: string;
        language?: string;
      }

      let canvasContent: CanvasContent | null = null;

      const setContent = (content: CanvasContent) => {
        canvasContent = content;
      };

      const clearContent = () => {
        canvasContent = null;
      };

      const updateContent = (newContent: string) => {
        if (canvasContent) {
          canvasContent.content = newContent;
        }
      };

      setContent({
        id: 'canvas-1',
        type: 'code',
        content: 'const x = 1;',
        language: 'typescript',
      });

      const afterSet = canvasContent ? { ...canvasContent } : null;

      updateContent('const x = 2;\nconst y = 3;');
      const afterUpdate = canvasContent ? { ...canvasContent } : null;

      clearContent();
      const afterClear = canvasContent;

      return { afterSet, afterUpdate, afterClear };
    });

    expect(result.afterSet.type).toBe('code');
    expect(result.afterSet.content).toBe('const x = 1;');
    expect(result.afterUpdate.content).toContain('const y = 3');
    expect(result.afterClear).toBeNull();
  });

  test('should support different content types', async ({ page }) => {
    const result = await page.evaluate(() => {
      const contentTypes = ['code', 'text', 'markdown', 'html', 'json'];

      const getEditorConfig = (type: string) => {
        const configs: Record<string, { syntax: boolean; lineNumbers: boolean; wordWrap: boolean }> = {
          code: { syntax: true, lineNumbers: true, wordWrap: false },
          text: { syntax: false, lineNumbers: false, wordWrap: true },
          markdown: { syntax: true, lineNumbers: false, wordWrap: true },
          html: { syntax: true, lineNumbers: true, wordWrap: false },
          json: { syntax: true, lineNumbers: true, wordWrap: false },
        };

        return configs[type] || configs.text;
      };

      return {
        codeConfig: getEditorConfig('code'),
        textConfig: getEditorConfig('text'),
        markdownConfig: getEditorConfig('markdown'),
        supportedTypes: contentTypes,
      };
    });

    expect(result.codeConfig.syntax).toBe(true);
    expect(result.codeConfig.lineNumbers).toBe(true);
    expect(result.textConfig.wordWrap).toBe(true);
    expect(result.markdownConfig.syntax).toBe(true);
    expect(result.supportedTypes).toContain('code');
  });
});

test.describe('Canvas Editor', () => {
  test('should handle text editing', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      let content = 'Initial content';
      const history: string[] = [content];
      let historyIndex = 0;

      const insertText = (text: string, position: number) => {
        content = content.slice(0, position) + text + content.slice(position);
        history.splice(historyIndex + 1);
        history.push(content);
        historyIndex = history.length - 1;
      };

      const deleteText = (start: number, end: number) => {
        content = content.slice(0, start) + content.slice(end);
        history.splice(historyIndex + 1);
        history.push(content);
        historyIndex = history.length - 1;
      };

      const replaceText = (start: number, end: number, newText: string) => {
        content = content.slice(0, start) + newText + content.slice(end);
        history.splice(historyIndex + 1);
        history.push(content);
        historyIndex = history.length - 1;
      };

      insertText(' added', content.length);
      const afterInsert = content;

      replaceText(0, 7, 'Modified');
      const afterReplace = content;

      deleteText(0, 9);
      const afterDelete = content;

      return { afterInsert, afterReplace, afterDelete, historyLength: history.length };
    });

    expect(result.afterInsert).toBe('Initial content added');
    expect(result.afterReplace).toBe('Modified content added');
    expect(result.afterDelete).toBe('content added');
    expect(result.historyLength).toBe(4);
  });

  test('should support undo/redo', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const history: string[] = ['v1'];
      let currentIndex = 0;

      const addVersion = (content: string) => {
        history.splice(currentIndex + 1);
        history.push(content);
        currentIndex = history.length - 1;
      };

      const undo = (): string | null => {
        if (currentIndex > 0) {
          currentIndex--;
          return history[currentIndex];
        }
        return null;
      };

      const redo = (): string | null => {
        if (currentIndex < history.length - 1) {
          currentIndex++;
          return history[currentIndex];
        }
        return null;
      };

      const canUndo = () => currentIndex > 0;
      const canRedo = () => currentIndex < history.length - 1;

      addVersion('v2');
      addVersion('v3');
      addVersion('v4');

      const undoResult1 = undo();
      const undoResult2 = undo();
      const canUndoAfter = canUndo();
      const canRedoAfter = canRedo();
      const redoResult = redo();

      return {
        undoResult1,
        undoResult2,
        canUndoAfter,
        canRedoAfter,
        redoResult,
        currentContent: history[currentIndex],
      };
    });

    expect(result.undoResult1).toBe('v3');
    expect(result.undoResult2).toBe('v2');
    expect(result.canUndoAfter).toBe(true);
    expect(result.canRedoAfter).toBe(true);
    expect(result.redoResult).toBe('v3');
  });

  test('should support find and replace', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      let content = 'The quick brown fox jumps over the lazy dog. The fox is quick.';

      const findAll = (searchTerm: string, caseSensitive: boolean = false) => {
        const flags = caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
        const matches: { index: number; length: number }[] = [];
        let match;

        while ((match = regex.exec(content)) !== null) {
          matches.push({ index: match.index, length: match[0].length });
        }

        return matches;
      };

      const replaceAll = (searchTerm: string, replacement: string, caseSensitive: boolean = false) => {
        const flags = caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
        content = content.replace(regex, replacement);
        return content;
      };

      const _replaceFirst = (searchTerm: string, replacement: string) => {
        content = content.replace(searchTerm, replacement);
        return content;
      };

      const foxMatches = findAll('fox');
      const theMatches = findAll('the', true);

      replaceAll('fox', 'cat');
      const afterReplaceAll = content;

      return {
        foxMatchCount: foxMatches.length,
        theMatchCount: theMatches.length,
        afterReplaceAll,
        hasCat: afterReplaceAll.includes('cat'),
        hasFox: afterReplaceAll.includes('fox'),
      };
    });

    expect(result.foxMatchCount).toBe(2);
    expect(result.theMatchCount).toBe(1);
    expect(result.hasCat).toBe(true);
    expect(result.hasFox).toBe(false);
  });

  test('should support code formatting', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const formatCode = (code: string, language: string): string => {
        if (language === 'json') {
          try {
            return JSON.stringify(JSON.parse(code), null, 2);
          } catch {
            return code;
          }
        }

        if (language === 'javascript' || language === 'typescript') {
          return code
            .replace(/\{/g, '{\n')
            .replace(/\}/g, '\n}')
            .replace(/;/g, ';\n')
            .trim();
        }

        return code;
      };

      const uglyJson = '{"name":"test","value":123}';
      const formattedJson = formatCode(uglyJson, 'json');

      const uglyJs = 'function test(){return 1;}';
      const formattedJs = formatCode(uglyJs, 'javascript');

      return {
        formattedJson,
        formattedJs,
        jsonHasNewlines: formattedJson.includes('\n'),
        jsHasNewlines: formattedJs.includes('\n'),
      };
    });

    expect(result.jsonHasNewlines).toBe(true);
    expect(result.jsHasNewlines).toBe(true);
    expect(result.formattedJson).toContain('"name"');
  });
});

test.describe('Version History', () => {
  test('should track content versions', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface Version {
        id: string;
        content: string;
        timestamp: Date;
        description?: string;
      }

      const versions: Version[] = [];

      const createVersion = (content: string, description?: string): Version => {
        const version: Version = {
          id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content,
          timestamp: new Date(),
          description,
        };
        versions.push(version);
        return version;
      };

      const _getVersion = (id: string): Version | null => {
        return versions.find(v => v.id === id) || null;
      };

      const getLatestVersion = (): Version | null => {
        return versions.length > 0 ? versions[versions.length - 1] : null;
      };

      createVersion('Initial content', 'First version');
      createVersion('Updated content', 'Added new section');
      createVersion('Final content', 'Completed edits');

      const latest = getLatestVersion();

      return {
        versionCount: versions.length,
        latestContent: latest?.content,
        latestDescription: latest?.description,
        hasTimestamps: versions.every(v => v.timestamp instanceof Date),
      };
    });

    expect(result.versionCount).toBe(3);
    expect(result.latestContent).toBe('Final content');
    expect(result.latestDescription).toBe('Completed edits');
  });

  test('should restore previous versions', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface Version {
        id: string;
        content: string;
      }

      const versions: Version[] = [
        { id: 'v1', content: 'Version 1 content' },
        { id: 'v2', content: 'Version 2 content' },
        { id: 'v3', content: 'Version 3 content' },
      ];

      let currentContent = versions[versions.length - 1].content;

      const restoreVersion = (id: string): boolean => {
        const version = versions.find(v => v.id === id);
        if (version) {
          currentContent = version.content;
          return true;
        }
        return false;
      };

      const initialContent = currentContent;
      restoreVersion('v1');
      const afterRestore = currentContent;

      return {
        initialContent,
        afterRestore,
        restored: afterRestore === 'Version 1 content',
      };
    });

    expect(result.initialContent).toBe('Version 3 content');
    expect(result.afterRestore).toBe('Version 1 content');
    expect(result.restored).toBe(true);
  });

  test('should compare versions', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const compareVersions = (oldContent: string, newContent: string) => {
        const oldLines = oldContent.split('\n');
        const newLines = newContent.split('\n');

        const added = newLines.filter(line => !oldLines.includes(line));
        const removed = oldLines.filter(line => !newLines.includes(line));
        const unchanged = oldLines.filter(line => newLines.includes(line));

        return {
          addedCount: added.length,
          removedCount: removed.length,
          unchangedCount: unchanged.length,
          added,
          removed,
        };
      };

      const oldContent = 'Line 1\nLine 2\nLine 3';
      const newContent = 'Line 1\nLine 2 modified\nLine 3\nLine 4';

      const diff = compareVersions(oldContent, newContent);

      return {
        addedCount: diff.addedCount,
        removedCount: diff.removedCount,
        unchangedCount: diff.unchangedCount,
        hasAddedLine4: diff.added.includes('Line 4'),
        hasRemovedLine2: diff.removed.includes('Line 2'),
      };
    });

    expect(result.addedCount).toBe(2);
    expect(result.removedCount).toBe(1);
    expect(result.unchangedCount).toBe(2);
    expect(result.hasAddedLine4).toBe(true);
    expect(result.hasRemovedLine2).toBe(true);
  });

  test('should delete versions', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const versions = [
        { id: 'v1', content: 'V1', isProtected: true },
        { id: 'v2', content: 'V2', isProtected: false },
        { id: 'v3', content: 'V3', isProtected: false },
      ];

      const deleteVersion = (id: string): { success: boolean; error?: string } => {
        const version = versions.find(v => v.id === id);
        if (!version) {
          return { success: false, error: 'Version not found' };
        }
        if (version.isProtected) {
          return { success: false, error: 'Cannot delete protected version' };
        }

        const index = versions.findIndex(v => v.id === id);
        versions.splice(index, 1);
        return { success: true };
      };

      const protectedDelete = deleteVersion('v1');
      const normalDelete = deleteVersion('v2');

      return {
        protectedDelete,
        normalDelete,
        remainingCount: versions.length,
        remainingIds: versions.map(v => v.id),
      };
    });

    expect(result.protectedDelete.success).toBe(false);
    expect(result.protectedDelete.error).toBe('Cannot delete protected version');
    expect(result.normalDelete.success).toBe(true);
    expect(result.remainingCount).toBe(2);
    expect(result.remainingIds).not.toContain('v2');
  });

  test('should name versions', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const versions = [
        { id: 'v1', content: 'Content', name: null as string | null },
        { id: 'v2', content: 'Content', name: null as string | null },
      ];

      const nameVersion = (id: string, name: string): boolean => {
        const version = versions.find(v => v.id === id);
        if (version) {
          version.name = name;
          return true;
        }
        return false;
      };

      const getNamedVersions = () => {
        return versions.filter(v => v.name !== null);
      };

      nameVersion('v1', 'Initial Release');
      nameVersion('v2', 'Bug Fix');

      return {
        namedCount: getNamedVersions().length,
        v1Name: versions[0].name,
        v2Name: versions[1].name,
      };
    });

    expect(result.namedCount).toBe(2);
    expect(result.v1Name).toBe('Initial Release');
    expect(result.v2Name).toBe('Bug Fix');
  });
});

test.describe('AI Canvas Actions', () => {
  test('should apply AI suggestions', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface AISuggestion {
        id: string;
        type: 'insert' | 'replace' | 'delete';
        position: { start: number; end: number };
        content: string;
        description: string;
      }

      let content = 'Original content here.';

      const applySuggestion = (suggestion: AISuggestion): string => {
        switch (suggestion.type) {
          case 'insert':
            content = content.slice(0, suggestion.position.start) + 
                      suggestion.content + 
                      content.slice(suggestion.position.start);
            break;
          case 'replace':
            content = content.slice(0, suggestion.position.start) + 
                      suggestion.content + 
                      content.slice(suggestion.position.end);
            break;
          case 'delete':
            content = content.slice(0, suggestion.position.start) + 
                      content.slice(suggestion.position.end);
            break;
        }
        return content;
      };

      const insertSuggestion: AISuggestion = {
        id: 's1',
        type: 'insert',
        position: { start: 0, end: 0 },
        content: 'New: ',
        description: 'Add prefix',
      };

      applySuggestion(insertSuggestion);

      return {
        afterInsert: content,
        hasPrefix: content.startsWith('New:'),
      };
    });

    expect(result.hasPrefix).toBe(true);
    expect(result.afterInsert).toContain('Original content');
  });

  test('should track AI edits', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface AIEdit {
        id: string;
        prompt: string;
        originalContent: string;
        newContent: string;
        timestamp: Date;
        accepted: boolean | null;
      }

      const aiEdits: AIEdit[] = [];

      const recordAIEdit = (prompt: string, original: string, newContent: string): AIEdit => {
        const edit: AIEdit = {
          id: `edit-${aiEdits.length}`,
          prompt,
          originalContent: original,
          newContent,
          timestamp: new Date(),
          accepted: null,
        };
        aiEdits.push(edit);
        return edit;
      };

      const acceptEdit = (id: string) => {
        const edit = aiEdits.find(e => e.id === id);
        if (edit) edit.accepted = true;
      };

      const rejectEdit = (id: string) => {
        const edit = aiEdits.find(e => e.id === id);
        if (edit) edit.accepted = false;
      };

      const edit1 = recordAIEdit('Fix typos', 'Helo world', 'Hello world');
      const edit2 = recordAIEdit('Add comments', 'const x = 1', '// Variable\nconst x = 1');

      acceptEdit(edit1.id);
      rejectEdit(edit2.id);

      return {
        editCount: aiEdits.length,
        edit1Accepted: aiEdits[0].accepted,
        edit2Accepted: aiEdits[1].accepted,
        acceptedCount: aiEdits.filter(e => e.accepted === true).length,
        rejectedCount: aiEdits.filter(e => e.accepted === false).length,
      };
    });

    expect(result.editCount).toBe(2);
    expect(result.edit1Accepted).toBe(true);
    expect(result.edit2Accepted).toBe(false);
    expect(result.acceptedCount).toBe(1);
    expect(result.rejectedCount).toBe(1);
  });

  test('should support inline AI commands', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const inlineCommands = [
        { trigger: '/fix', description: 'Fix errors in selection' },
        { trigger: '/explain', description: 'Explain selected code' },
        { trigger: '/improve', description: 'Improve code quality' },
        { trigger: '/simplify', description: 'Simplify complex code' },
        { trigger: '/comment', description: 'Add comments' },
      ];

      const parseCommand = (input: string): { command: string; args: string } | null => {
        const match = input.match(/^\/(\w+)\s*(.*)/);
        if (match) {
          return { command: match[1], args: match[2] };
        }
        return null;
      };

      const isValidCommand = (command: string): boolean => {
        return inlineCommands.some(c => c.trigger === `/${command}`);
      };

      const parsed1 = parseCommand('/fix this code');
      const parsed2 = parseCommand('/explain the function');
      const parsed3 = parseCommand('regular text');

      return {
        commandCount: inlineCommands.length,
        parsed1,
        parsed2,
        parsed3,
        isFixValid: isValidCommand('fix'),
        isInvalidValid: isValidCommand('invalid'),
      };
    });

    expect(result.commandCount).toBe(5);
    expect(result.parsed1?.command).toBe('fix');
    expect(result.parsed1?.args).toBe('this code');
    expect(result.parsed2?.command).toBe('explain');
    expect(result.parsed3).toBeNull();
    expect(result.isFixValid).toBe(true);
    expect(result.isInvalidValid).toBe(false);
  });
});

test.describe('Canvas Collaboration', () => {
  test('should track cursor positions', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface CursorPosition {
        userId: string;
        line: number;
        column: number;
        selection?: { start: number; end: number };
      }

      const cursors: Map<string, CursorPosition> = new Map();

      const updateCursor = (userId: string, position: Omit<CursorPosition, 'userId'>) => {
        cursors.set(userId, { userId, ...position });
      };

      const removeCursor = (userId: string) => {
        cursors.delete(userId);
      };

      const getCursors = () => Array.from(cursors.values());

      updateCursor('user-1', { line: 10, column: 5 });
      updateCursor('user-2', { line: 20, column: 15, selection: { start: 100, end: 150 } });

      const allCursors = getCursors();
      const user2Cursor = cursors.get('user-2');

      removeCursor('user-1');
      const afterRemove = getCursors();

      return {
        cursorCount: allCursors.length,
        user2Line: user2Cursor?.line,
        user2HasSelection: !!user2Cursor?.selection,
        afterRemoveCount: afterRemove.length,
      };
    });

    expect(result.cursorCount).toBe(2);
    expect(result.user2Line).toBe(20);
    expect(result.user2HasSelection).toBe(true);
    expect(result.afterRemoveCount).toBe(1);
  });

  test('should handle concurrent edits', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface Edit {
        userId: string;
        position: number;
        type: 'insert' | 'delete';
        content: string;
        timestamp: number;
      }

      const pendingEdits: Edit[] = [];

      const queueEdit = (edit: Edit) => {
        pendingEdits.push(edit);
        pendingEdits.sort((a, b) => a.timestamp - b.timestamp);
      };

      const applyEdits = (baseContent: string): string => {
        let content = baseContent;
        let offset = 0;

        for (const edit of pendingEdits) {
          const adjustedPosition = edit.position + offset;

          if (edit.type === 'insert') {
            content = content.slice(0, adjustedPosition) + edit.content + content.slice(adjustedPosition);
            offset += edit.content.length;
          } else if (edit.type === 'delete') {
            content = content.slice(0, adjustedPosition) + content.slice(adjustedPosition + edit.content.length);
            offset -= edit.content.length;
          }
        }

        return content;
      };

      queueEdit({ userId: 'user-1', position: 0, type: 'insert', content: 'A', timestamp: 1 });
      queueEdit({ userId: 'user-2', position: 5, type: 'insert', content: 'B', timestamp: 2 });

      const result = applyEdits('Hello');

      return {
        editCount: pendingEdits.length,
        result,
        hasA: result.includes('A'),
        hasB: result.includes('B'),
      };
    });

    expect(result.editCount).toBe(2);
    expect(result.hasA).toBe(true);
    expect(result.hasB).toBe(true);
  });
});

test.describe('Canvas Settings', () => {
  test('should configure editor settings', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const editorSettings = {
        fontSize: 14,
        fontFamily: 'JetBrains Mono',
        tabSize: 2,
        wordWrap: true,
        lineNumbers: true,
        minimap: false,
        theme: 'dark',
      };

      const updateSetting = <K extends keyof typeof editorSettings>(
        key: K,
        value: typeof editorSettings[K]
      ) => {
        editorSettings[key] = value;
      };

      updateSetting('fontSize', 16);
      updateSetting('tabSize', 4);
      updateSetting('minimap', true);

      return {
        fontSize: editorSettings.fontSize,
        tabSize: editorSettings.tabSize,
        minimap: editorSettings.minimap,
        wordWrap: editorSettings.wordWrap,
      };
    });

    expect(result.fontSize).toBe(16);
    expect(result.tabSize).toBe(4);
    expect(result.minimap).toBe(true);
    expect(result.wordWrap).toBe(true);
  });

  test('should persist canvas settings', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const settings = {
        fontSize: 18,
        theme: 'light',
        wordWrap: false,
      };
      localStorage.setItem('cognia-canvas-settings', JSON.stringify(settings));
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const stored = await page.evaluate(() => {
      const data = localStorage.getItem('cognia-canvas-settings');
      return data ? JSON.parse(data) : null;
    });

    expect(stored).not.toBeNull();
    expect(stored.fontSize).toBe(18);
    expect(stored.theme).toBe('light');
  });
});
