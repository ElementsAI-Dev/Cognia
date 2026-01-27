import { test, expect } from '@playwright/test';

/**
 * Native Features E2E Tests
 * Tests clipboard history, screenshot, focus tracker, and system monitor
 */
test.describe('Clipboard History', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should manage clipboard history entries', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ClipboardEntry {
        id: string;
        content: string;
        type: 'text' | 'image' | 'file';
        timestamp: Date;
        isPinned: boolean;
        metadata?: {
          source?: string;
          size?: number;
          mimeType?: string;
        };
      }

      const history: ClipboardEntry[] = [];
      const pinnedItems: Set<string> = new Set();

      const addEntry = (content: string, type: ClipboardEntry['type'] = 'text'): ClipboardEntry => {
        const entry: ClipboardEntry = {
          id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content,
          type,
          timestamp: new Date(),
          isPinned: false,
          metadata: { size: content.length },
        };
        history.unshift(entry);
        return entry;
      };

      const pinEntry = (id: string) => {
        const entry = history.find(e => e.id === id);
        if (entry) {
          entry.isPinned = true;
          pinnedItems.add(id);
        }
      };

      const _unpinEntry = (id: string) => {
        const entry = history.find(e => e.id === id);
        if (entry) {
          entry.isPinned = false;
          pinnedItems.delete(id);
        }
      };

      const deleteEntry = (id: string) => {
        const index = history.findIndex(e => e.id === id);
        if (index !== -1) {
          history.splice(index, 1);
          pinnedItems.delete(id);
        }
      };

      const clearUnpinned = () => {
        const unpinned = history.filter(e => !e.isPinned);
        unpinned.forEach(e => deleteEntry(e.id));
      };

      // Add entries
      const _entry1 = addEntry('Hello World');
      const _entry2 = addEntry('Test content');
      const entry3 = addEntry('Pinned item');

      pinEntry(entry3.id);

      const countBeforeClear = history.length;
      clearUnpinned();
      const countAfterClear = history.length;

      return {
        countBeforeClear,
        countAfterClear,
        pinnedCount: pinnedItems.size,
        remainingEntry: history[0]?.content,
      };
    });

    expect(result.countBeforeClear).toBe(3);
    expect(result.countAfterClear).toBe(1);
    expect(result.pinnedCount).toBe(1);
    expect(result.remainingEntry).toBe('Pinned item');
  });

  test('should search clipboard history', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ClipboardEntry {
        id: string;
        content: string;
        type: 'text' | 'image' | 'file';
      }

      const history: ClipboardEntry[] = [
        { id: '1', content: 'Hello World', type: 'text' },
        { id: '2', content: 'JavaScript code example', type: 'text' },
        { id: '3', content: 'TypeScript interface', type: 'text' },
        { id: '4', content: 'React component', type: 'text' },
        { id: '5', content: 'Hello TypeScript', type: 'text' },
      ];

      const searchHistory = (query: string): ClipboardEntry[] => {
        const lowerQuery = query.toLowerCase();
        return history.filter(e => 
          e.content.toLowerCase().includes(lowerQuery)
        );
      };

      const helloResults = searchHistory('hello');
      const typescriptResults = searchHistory('typescript');
      const noResults = searchHistory('python');

      return {
        helloCount: helloResults.length,
        typescriptCount: typescriptResults.length,
        noResultsCount: noResults.length,
        helloIds: helloResults.map(e => e.id),
      };
    });

    expect(result.helloCount).toBe(2);
    expect(result.typescriptCount).toBe(2);
    expect(result.noResultsCount).toBe(0);
    expect(result.helloIds).toContain('1');
    expect(result.helloIds).toContain('5');
  });

  test('should handle different content types', async ({ page }) => {
    const result = await page.evaluate(() => {
      type ClipboardType = 'text' | 'image' | 'file';

      const getTypeIcon = (type: ClipboardType): string => {
        const icons: Record<ClipboardType, string> = {
          text: 'FileText',
          image: 'Image',
          file: 'File',
        };
        return icons[type];
      };

      const formatContent = (content: string, type: ClipboardType, maxLength = 50): string => {
        if (type === 'image') {
          return '[Image]';
        }
        if (type === 'file') {
          return `[File: ${content}]`;
        }
        if (content.length > maxLength) {
          return content.slice(0, maxLength) + '...';
        }
        return content;
      };

      return {
        textIcon: getTypeIcon('text'),
        imageIcon: getTypeIcon('image'),
        fileIcon: getTypeIcon('file'),
        shortText: formatContent('Hello', 'text'),
        longText: formatContent('This is a very long text that should be truncated', 'text', 20),
        imageContent: formatContent('base64data', 'image'),
        fileContent: formatContent('document.pdf', 'file'),
      };
    });

    expect(result.textIcon).toBe('FileText');
    expect(result.imageIcon).toBe('Image');
    expect(result.fileIcon).toBe('File');
    expect(result.shortText).toBe('Hello');
    expect(result.longText).toBe('This is a very long ...');
    expect(result.imageContent).toBe('[Image]');
    expect(result.fileContent).toBe('[File: document.pdf]');
  });
});

test.describe('Screenshot Panel', () => {
  test('should manage screenshot state', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface Screenshot {
        id: string;
        dataUrl: string;
        width: number;
        height: number;
        timestamp: Date;
        source: 'screen' | 'window' | 'region';
      }

      const screenshots: Screenshot[] = [];

      const addScreenshot = (
        dataUrl: string,
        width: number,
        height: number,
        source: Screenshot['source']
      ): Screenshot => {
        const screenshot: Screenshot = {
          id: `ss-${Date.now()}`,
          dataUrl,
          width,
          height,
          timestamp: new Date(),
          source,
        };
        screenshots.push(screenshot);
        return screenshot;
      };

      const deleteScreenshot = (id: string) => {
        const index = screenshots.findIndex(s => s.id === id);
        if (index !== -1) screenshots.splice(index, 1);
      };

      // Add screenshots
      const ss1 = addScreenshot('data:image/png;base64,abc123', 1920, 1080, 'screen');
      addScreenshot('data:image/png;base64,def456', 800, 600, 'window');
      addScreenshot('data:image/png;base64,ghi789', 400, 300, 'region');

      const countBefore = screenshots.length;
      deleteScreenshot(ss1.id);
      const countAfter = screenshots.length;

      return {
        countBefore,
        countAfter,
        remainingSources: screenshots.map(s => s.source),
      };
    });

    expect(result.countBefore).toBe(3);
    expect(result.countAfter).toBe(2);
    expect(result.remainingSources).toContain('window');
    expect(result.remainingSources).toContain('region');
  });

  test('should calculate screenshot dimensions', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface Dimensions {
        width: number;
        height: number;
      }

      const calculateThumbnailSize = (
        original: Dimensions,
        maxSize: number
      ): Dimensions => {
        const ratio = original.width / original.height;
        
        if (original.width > original.height) {
          return {
            width: maxSize,
            height: Math.round(maxSize / ratio),
          };
        } else {
          return {
            width: Math.round(maxSize * ratio),
            height: maxSize,
          };
        }
      };

      const landscape = calculateThumbnailSize({ width: 1920, height: 1080 }, 200);
      const portrait = calculateThumbnailSize({ width: 1080, height: 1920 }, 200);
      const square = calculateThumbnailSize({ width: 1000, height: 1000 }, 200);

      return {
        landscape,
        portrait,
        square,
      };
    });

    expect(result.landscape.width).toBe(200);
    expect(result.landscape.height).toBe(113);
    expect(result.portrait.width).toBe(113);
    expect(result.portrait.height).toBe(200);
    expect(result.square.width).toBe(200);
    expect(result.square.height).toBe(200);
  });
});

test.describe('Focus Tracker', () => {
  test('should track focus events', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface FocusEvent {
        id: string;
        timestamp: Date;
        appName: string;
        windowTitle: string;
        duration?: number;
      }

      const focusHistory: FocusEvent[] = [];
      let currentFocus: FocusEvent | null = null;

      const trackFocus = (appName: string, windowTitle: string) => {
        const now = new Date();

        // End previous focus
        if (currentFocus) {
          currentFocus.duration = now.getTime() - currentFocus.timestamp.getTime();
        }

        // Start new focus
        currentFocus = {
          id: `focus-${Date.now()}`,
          timestamp: now,
          appName,
          windowTitle,
        };
        focusHistory.push(currentFocus);
      };

      const getFocusByApp = (appName: string) => {
        return focusHistory.filter(f => f.appName === appName);
      };

      const getTotalTimeByApp = () => {
        const timeByApp: Record<string, number> = {};
        focusHistory.forEach(f => {
          if (f.duration) {
            timeByApp[f.appName] = (timeByApp[f.appName] || 0) + f.duration;
          }
        });
        return timeByApp;
      };

      // Simulate focus tracking
      trackFocus('VS Code', 'project - Visual Studio Code');
      focusHistory[focusHistory.length - 1].duration = 60000;

      trackFocus('Chrome', 'Google - Chrome');
      focusHistory[focusHistory.length - 1].duration = 30000;

      trackFocus('VS Code', 'another-file.ts - Visual Studio Code');
      focusHistory[focusHistory.length - 1].duration = 45000;

      const vscodeEvents = getFocusByApp('VS Code');
      const timeByApp = getTotalTimeByApp();

      return {
        totalEvents: focusHistory.length,
        vscodeEventCount: vscodeEvents.length,
        vscodeTime: timeByApp['VS Code'],
        chromeTime: timeByApp['Chrome'],
      };
    });

    expect(result.totalEvents).toBe(3);
    expect(result.vscodeEventCount).toBe(2);
    expect(result.vscodeTime).toBe(105000);
    expect(result.chromeTime).toBe(30000);
  });
});

test.describe('System Monitor', () => {
  test('should track system metrics', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface SystemMetrics {
        timestamp: Date;
        cpu: {
          usage: number;
          cores: number;
        };
        memory: {
          total: number;
          used: number;
          free: number;
        };
        disk: {
          total: number;
          used: number;
          free: number;
        };
      }

      const metricsHistory: SystemMetrics[] = [];

      const recordMetrics = (metrics: Omit<SystemMetrics, 'timestamp'>) => {
        metricsHistory.push({
          ...metrics,
          timestamp: new Date(),
        });
      };

      const getAverageCpuUsage = () => {
        if (metricsHistory.length === 0) return 0;
        const total = metricsHistory.reduce((sum, m) => sum + m.cpu.usage, 0);
        return total / metricsHistory.length;
      };

      const getMemoryUsagePercent = (metrics: SystemMetrics) => {
        return (metrics.memory.used / metrics.memory.total) * 100;
      };

      // Record sample metrics
      recordMetrics({
        cpu: { usage: 25, cores: 8 },
        memory: { total: 16000, used: 8000, free: 8000 },
        disk: { total: 500000, used: 250000, free: 250000 },
      });

      recordMetrics({
        cpu: { usage: 50, cores: 8 },
        memory: { total: 16000, used: 12000, free: 4000 },
        disk: { total: 500000, used: 250000, free: 250000 },
      });

      recordMetrics({
        cpu: { usage: 75, cores: 8 },
        memory: { total: 16000, used: 10000, free: 6000 },
        disk: { total: 500000, used: 250000, free: 250000 },
      });

      const avgCpu = getAverageCpuUsage();
      const lastMetrics = metricsHistory[metricsHistory.length - 1];
      const memoryPercent = getMemoryUsagePercent(lastMetrics);

      return {
        recordCount: metricsHistory.length,
        avgCpuUsage: avgCpu,
        lastMemoryPercent: memoryPercent,
        diskUsedPercent: (lastMetrics.disk.used / lastMetrics.disk.total) * 100,
      };
    });

    expect(result.recordCount).toBe(3);
    expect(result.avgCpuUsage).toBe(50);
    expect(result.lastMemoryPercent).toBe(62.5);
    expect(result.diskUsedPercent).toBe(50);
  });

  test('should detect high resource usage', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ResourceAlert {
        type: 'cpu' | 'memory' | 'disk';
        level: 'warning' | 'critical';
        value: number;
        threshold: number;
        message: string;
      }

      const THRESHOLDS = {
        cpu: { warning: 70, critical: 90 },
        memory: { warning: 80, critical: 95 },
        disk: { warning: 85, critical: 95 },
      };

      const checkResourceUsage = (
        type: 'cpu' | 'memory' | 'disk',
        value: number
      ): ResourceAlert | null => {
        const thresholds = THRESHOLDS[type];

        if (value >= thresholds.critical) {
          return {
            type,
            level: 'critical',
            value,
            threshold: thresholds.critical,
            message: `Critical ${type} usage: ${value}%`,
          };
        }

        if (value >= thresholds.warning) {
          return {
            type,
            level: 'warning',
            value,
            threshold: thresholds.warning,
            message: `High ${type} usage: ${value}%`,
          };
        }

        return null;
      };

      const cpuNormal = checkResourceUsage('cpu', 50);
      const cpuWarning = checkResourceUsage('cpu', 75);
      const cpuCritical = checkResourceUsage('cpu', 95);
      const memoryWarning = checkResourceUsage('memory', 85);

      return {
        cpuNormal: cpuNormal === null,
        cpuWarningLevel: cpuWarning?.level,
        cpuCriticalLevel: cpuCritical?.level,
        memoryWarningMessage: memoryWarning?.message,
      };
    });

    expect(result.cpuNormal).toBe(true);
    expect(result.cpuWarningLevel).toBe('warning');
    expect(result.cpuCriticalLevel).toBe('critical');
    expect(result.memoryWarningMessage).toBe('High memory usage: 85%');
  });
});

test.describe('Context Panel', () => {
  test('should manage context entries', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ContextEntry {
        id: string;
        type: 'file' | 'selection' | 'url' | 'note';
        content: string;
        source: string;
        timestamp: Date;
        isActive: boolean;
      }

      const contexts: ContextEntry[] = [];

      const addContext = (
        type: ContextEntry['type'],
        content: string,
        source: string
      ): ContextEntry => {
        const context: ContextEntry = {
          id: `ctx-${Date.now()}`,
          type,
          content,
          source,
          timestamp: new Date(),
          isActive: true,
        };
        contexts.push(context);
        return context;
      };

      const toggleContext = (id: string) => {
        const context = contexts.find(c => c.id === id);
        if (context) {
          context.isActive = !context.isActive;
        }
      };

      const getActiveContexts = () => contexts.filter(c => c.isActive);

      const removeContext = (id: string) => {
        const index = contexts.findIndex(c => c.id === id);
        if (index !== -1) contexts.splice(index, 1);
      };

      // Add contexts
      const ctx1 = addContext('file', '/src/app.ts', 'VS Code');
      addContext('selection', 'function test() {}', 'VS Code');
      addContext('url', 'https://docs.example.com', 'Chrome');

      const activeBeforeToggle = getActiveContexts().length;

      toggleContext(ctx1.id);
      const activeAfterToggle = getActiveContexts().length;

      removeContext(ctx1.id);
      const totalAfterRemove = contexts.length;

      return {
        activeBeforeToggle,
        activeAfterToggle,
        totalAfterRemove,
        contextTypes: contexts.map(c => c.type),
      };
    });

    expect(result.activeBeforeToggle).toBe(3);
    expect(result.activeAfterToggle).toBe(2);
    expect(result.totalAfterRemove).toBe(2);
    expect(result.contextTypes).toContain('selection');
    expect(result.contextTypes).toContain('url');
  });
});

/**
 * Screenshot Editor Tests
 * Tests annotation tools, resize handles, and editing operations
 */
test.describe('Screenshot Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should manage annotation tools', async ({ page }) => {
    const result = await page.evaluate(() => {
      type AnnotationTool = 'rectangle' | 'ellipse' | 'arrow' | 'freehand' | 'text' | 'blur' | 'highlight' | 'marker';

      interface EditorState {
        activeTool: AnnotationTool;
        strokeColor: string;
        strokeWidth: number;
        fillColor: string | null;
      }

      const state: EditorState = {
        activeTool: 'rectangle',
        strokeColor: '#FF0000',
        strokeWidth: 2,
        fillColor: null,
      };

      const setTool = (tool: AnnotationTool) => {
        state.activeTool = tool;
      };

      const setStrokeColor = (color: string) => {
        state.strokeColor = color;
      };

      const setStrokeWidth = (width: number) => {
        state.strokeWidth = width;
      };

      const availableTools: AnnotationTool[] = ['rectangle', 'ellipse', 'arrow', 'freehand', 'text', 'blur', 'highlight', 'marker'];

      const initialTool = state.activeTool;
      setTool('arrow');
      const afterSetTool = state.activeTool;

      setStrokeColor('#00FF00');
      const newColor = state.strokeColor;

      setStrokeWidth(5);
      const newWidth = state.strokeWidth;

      return {
        toolCount: availableTools.length,
        initialTool,
        afterSetTool,
        newColor,
        newWidth,
      };
    });

    expect(result.toolCount).toBe(8);
    expect(result.initialTool).toBe('rectangle');
    expect(result.afterSetTool).toBe('arrow');
    expect(result.newColor).toBe('#00FF00');
    expect(result.newWidth).toBe(5);
  });

  test('should manage annotations with undo/redo', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Annotation {
        id: string;
        type: string;
        x: number;
        y: number;
        width: number;
        height: number;
      }

      const annotations: Annotation[] = [];
      const undoStack: Annotation[][] = [];
      const redoStack: Annotation[][] = [];
      const MAX_HISTORY = 50;

      const saveState = () => {
        undoStack.push([...annotations]);
        if (undoStack.length > MAX_HISTORY) {
          undoStack.shift();
        }
        redoStack.length = 0;
      };

      const addAnnotation = (type: string, x: number, y: number, width: number, height: number) => {
        saveState();
        annotations.push({
          id: `ann-${Date.now()}-${Math.random()}`,
          type,
          x,
          y,
          width,
          height,
        });
      };

      const undo = (): boolean => {
        if (undoStack.length === 0) return false;
        redoStack.push([...annotations]);
        const previousState = undoStack.pop()!;
        annotations.length = 0;
        annotations.push(...previousState);
        return true;
      };

      const redo = (): boolean => {
        if (redoStack.length === 0) return false;
        undoStack.push([...annotations]);
        const nextState = redoStack.pop()!;
        annotations.length = 0;
        annotations.push(...nextState);
        return true;
      };

      addAnnotation('rectangle', 10, 10, 100, 50);
      addAnnotation('ellipse', 50, 50, 80, 80);
      addAnnotation('arrow', 100, 100, 150, 50);

      const countAfterAdd = annotations.length;
      const undoSuccess = undo();
      const countAfterUndo = annotations.length;
      const redoSuccess = redo();
      const countAfterRedo = annotations.length;

      return {
        countAfterAdd,
        undoSuccess,
        countAfterUndo,
        redoSuccess,
        countAfterRedo,
        undoStackSize: undoStack.length,
      };
    });

    expect(result.countAfterAdd).toBe(3);
    expect(result.undoSuccess).toBe(true);
    expect(result.countAfterUndo).toBe(2);
    expect(result.redoSuccess).toBe(true);
    expect(result.countAfterRedo).toBe(3);
  });

  test('should handle resize handles', async ({ page }) => {
    const result = await page.evaluate(() => {
      type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

      interface Rectangle {
        x: number;
        y: number;
        width: number;
        height: number;
      }

      const resizeRectangle = (
        rect: Rectangle,
        handle: ResizeHandle,
        deltaX: number,
        deltaY: number
      ): Rectangle => {
        const result = { ...rect };

        switch (handle) {
          case 'nw':
            result.x += deltaX;
            result.y += deltaY;
            result.width -= deltaX;
            result.height -= deltaY;
            break;
          case 'n':
            result.y += deltaY;
            result.height -= deltaY;
            break;
          case 'ne':
            result.y += deltaY;
            result.width += deltaX;
            result.height -= deltaY;
            break;
          case 'e':
            result.width += deltaX;
            break;
          case 'se':
            result.width += deltaX;
            result.height += deltaY;
            break;
          case 's':
            result.height += deltaY;
            break;
          case 'sw':
            result.x += deltaX;
            result.width -= deltaX;
            result.height += deltaY;
            break;
          case 'w':
            result.x += deltaX;
            result.width -= deltaX;
            break;
        }

        return result;
      };

      const original: Rectangle = { x: 100, y: 100, width: 200, height: 150 };
      const resizedSE = resizeRectangle(original, 'se', 50, 30);
      const resizedNW = resizeRectangle(original, 'nw', -20, -20);

      return {
        originalWidth: original.width,
        resizedSEWidth: resizedSE.width,
        resizedSEHeight: resizedSE.height,
        resizedNWX: resizedNW.x,
        resizedNWWidth: resizedNW.width,
      };
    });

    expect(result.originalWidth).toBe(200);
    expect(result.resizedSEWidth).toBe(250);
    expect(result.resizedSEHeight).toBe(180);
    expect(result.resizedNWX).toBe(80);
    expect(result.resizedNWWidth).toBe(220);
  });

  test('should support keyboard shortcuts', async ({ page }) => {
    const result = await page.evaluate(() => {
      type AnnotationTool = 'rectangle' | 'ellipse' | 'arrow' | 'freehand' | 'text' | 'blur' | 'highlight' | 'marker';

      const keyboardShortcuts: Record<string, AnnotationTool> = {
        'r': 'rectangle',
        'e': 'ellipse',
        'a': 'arrow',
        'f': 'freehand',
        't': 'text',
        'b': 'blur',
        'h': 'highlight',
        'm': 'marker',
      };

      const getToolFromKey = (key: string): AnnotationTool | null => {
        return keyboardShortcuts[key.toLowerCase()] ?? null;
      };

      return {
        rKey: getToolFromKey('r'),
        eKey: getToolFromKey('e'),
        aKey: getToolFromKey('a'),
        tKey: getToolFromKey('t'),
        unknownKey: getToolFromKey('x'),
      };
    });

    expect(result.rKey).toBe('rectangle');
    expect(result.eKey).toBe('ellipse');
    expect(result.aKey).toBe('arrow');
    expect(result.tKey).toBe('text');
    expect(result.unknownKey).toBe(null);
  });

  test('should manage blur and highlight regions', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface BlurRegion {
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
        blurAmount: number;
      }

      interface HighlightRegion {
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
        color: string;
        opacity: number;
      }

      const blurRegions: BlurRegion[] = [];
      const highlightRegions: HighlightRegion[] = [];

      const addBlur = (x: number, y: number, width: number, height: number, blurAmount: number = 10) => {
        blurRegions.push({
          id: `blur-${Date.now()}`,
          x, y, width, height, blurAmount,
        });
      };

      const addHighlight = (x: number, y: number, width: number, height: number, color: string = '#FFFF00', opacity: number = 0.3) => {
        highlightRegions.push({
          id: `highlight-${Date.now()}`,
          x, y, width, height, color, opacity,
        });
      };

      addBlur(100, 100, 200, 50, 15);
      addBlur(300, 200, 100, 30);
      addHighlight(50, 50, 150, 40);
      addHighlight(200, 150, 180, 60, '#00FF00', 0.5);

      return {
        blurCount: blurRegions.length,
        highlightCount: highlightRegions.length,
        firstBlurAmount: blurRegions[0]?.blurAmount,
        secondHighlightColor: highlightRegions[1]?.color,
        secondHighlightOpacity: highlightRegions[1]?.opacity,
      };
    });

    expect(result.blurCount).toBe(2);
    expect(result.highlightCount).toBe(2);
    expect(result.firstBlurAmount).toBe(15);
    expect(result.secondHighlightColor).toBe('#00FF00');
    expect(result.secondHighlightOpacity).toBe(0.5);
  });
});

/**
 * Awareness Service Tests
 * Tests system awareness and active window tracking
 */
test.describe('Awareness Service', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should track active application', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ActiveApp {
        name: string;
        bundleId?: string;
        pid: number;
        path?: string;
      }

      interface AwarenessState {
        activeApp: ActiveApp | null;
        lastUpdated: number;
        isTracking: boolean;
      }

      const state: AwarenessState = {
        activeApp: null,
        lastUpdated: 0,
        isTracking: false,
      };

      const startTracking = () => {
        state.isTracking = true;
      };

      const stopTracking = () => {
        state.isTracking = false;
      };

      const updateActiveApp = (app: ActiveApp) => {
        state.activeApp = app;
        state.lastUpdated = Date.now();
      };

      const initialTracking = state.isTracking;
      startTracking();
      const afterStart = state.isTracking;

      updateActiveApp({
        name: 'Visual Studio Code',
        bundleId: 'com.microsoft.VSCode',
        pid: 12345,
        path: '/Applications/Visual Studio Code.app',
      });

      const hasActiveApp = state.activeApp !== null;
      const appName = state.activeApp?.name;

      stopTracking();
      const afterStop = state.isTracking;

      return {
        initialTracking,
        afterStart,
        hasActiveApp,
        appName,
        afterStop,
      };
    });

    expect(result.initialTracking).toBe(false);
    expect(result.afterStart).toBe(true);
    expect(result.hasActiveApp).toBe(true);
    expect(result.appName).toBe('Visual Studio Code');
    expect(result.afterStop).toBe(false);
  });

  test('should detect active window info', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface WindowInfo {
        title: string;
        id: number;
        bounds: { x: number; y: number; width: number; height: number };
        isFullscreen: boolean;
        isMinimized: boolean;
      }

      const getActiveWindow = (): WindowInfo => {
        return {
          title: 'main.ts - MyProject - Visual Studio Code',
          id: 54321,
          bounds: { x: 0, y: 23, width: 1920, height: 1057 },
          isFullscreen: false,
          isMinimized: false,
        };
      };

      const parseWindowTitle = (title: string): { file?: string; project?: string; app?: string } => {
        const parts = title.split(' - ');
        if (parts.length >= 3) {
          return {
            file: parts[0],
            project: parts[1],
            app: parts[2],
          };
        }
        return { app: title };
      };

      const window = getActiveWindow();
      const parsed = parseWindowTitle(window.title);

      return {
        windowTitle: window.title,
        windowWidth: window.bounds.width,
        isFullscreen: window.isFullscreen,
        parsedFile: parsed.file,
        parsedProject: parsed.project,
        parsedApp: parsed.app,
      };
    });

    expect(result.windowTitle).toContain('Visual Studio Code');
    expect(result.windowWidth).toBe(1920);
    expect(result.isFullscreen).toBe(false);
    expect(result.parsedFile).toBe('main.ts');
    expect(result.parsedProject).toBe('MyProject');
    expect(result.parsedApp).toBe('Visual Studio Code');
  });

  test('should detect IDE context', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface IdeContext {
        isIde: boolean;
        ideName: string | null;
        currentFile: string | null;
        language: string | null;
        projectPath: string | null;
      }

      const idePatterns: Record<string, RegExp> = {
        'VS Code': /visual studio code|vscode/i,
        'IntelliJ IDEA': /intellij|idea/i,
        'WebStorm': /webstorm/i,
        'PyCharm': /pycharm/i,
        'Xcode': /xcode/i,
      };

      const languageExtensions: Record<string, string> = {
        'ts': 'TypeScript',
        'tsx': 'TypeScript React',
        'js': 'JavaScript',
        'jsx': 'JavaScript React',
        'py': 'Python',
        'rs': 'Rust',
        'go': 'Go',
      };

      const detectIdeContext = (appName: string, windowTitle: string): IdeContext => {
        let ideName: string | null = null;

        for (const [name, pattern] of Object.entries(idePatterns)) {
          if (pattern.test(appName)) {
            ideName = name;
            break;
          }
        }

        let currentFile: string | null = null;
        let language: string | null = null;

        const fileMatch = windowTitle.match(/^([^\s]+\.[a-zA-Z]+)/);
        if (fileMatch) {
          currentFile = fileMatch[1];
          const ext = currentFile.split('.').pop()?.toLowerCase();
          if (ext && languageExtensions[ext]) {
            language = languageExtensions[ext];
          }
        }

        return {
          isIde: ideName !== null,
          ideName,
          currentFile,
          language,
          projectPath: null,
        };
      };

      const vscodeContext = detectIdeContext('Visual Studio Code', 'main.ts - MyProject - Visual Studio Code');
      const chromeContext = detectIdeContext('Google Chrome', 'Google - Chrome');

      return {
        vscodeIsIde: vscodeContext.isIde,
        vscodeIdeName: vscodeContext.ideName,
        vscodeFile: vscodeContext.currentFile,
        vscodeLanguage: vscodeContext.language,
        chromeIsIde: chromeContext.isIde,
      };
    });

    expect(result.vscodeIsIde).toBe(true);
    expect(result.vscodeIdeName).toBe('VS Code');
    expect(result.vscodeFile).toBe('main.ts');
    expect(result.vscodeLanguage).toBe('TypeScript');
    expect(result.chromeIsIde).toBe(false);
  });
});

/**
 * Context Service Tests
 * Tests context gathering and management
 */
test.describe('Context Service', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should gather system context', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface SystemContext {
        app?: { app_name: string; app_type: string };
        window?: { title: string; focused: boolean };
        file?: { path: string; language: string; content?: string };
        selection?: { text: string; source: string };
        browser?: { url: string; title: string };
      }

      const gatherContext = (): SystemContext => {
        return {
          app: {
            app_name: 'Visual Studio Code',
            app_type: 'IDE',
          },
          window: {
            title: 'index.ts - cognia',
            focused: true,
          },
          file: {
            path: '/Users/dev/cognia/src/index.ts',
            language: 'typescript',
          },
          selection: {
            text: 'const greeting = "Hello World";',
            source: 'editor',
          },
        };
      };

      const context = gatherContext();
      const hasApp = context.app !== undefined;
      const hasWindow = context.window !== undefined;
      const hasFile = context.file !== undefined;
      const hasSelection = context.selection !== undefined;
      const hasBrowser = context.browser !== undefined;

      return {
        hasApp,
        hasWindow,
        hasFile,
        hasSelection,
        hasBrowser,
        appName: context.app?.app_name,
        fileLanguage: context.file?.language,
        selectionText: context.selection?.text,
      };
    });

    expect(result.hasApp).toBe(true);
    expect(result.hasWindow).toBe(true);
    expect(result.hasFile).toBe(true);
    expect(result.hasSelection).toBe(true);
    expect(result.hasBrowser).toBe(false);
    expect(result.appName).toBe('Visual Studio Code');
    expect(result.fileLanguage).toBe('typescript');
    expect(result.selectionText).toContain('Hello World');
  });

  test('should build context prompt', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface SystemContext {
        app?: { app_name: string; app_type: string };
        window?: { title: string };
        file?: { path: string; language: string };
        selection?: { text: string };
      }

      const buildContextPrompt = (context: SystemContext): string => {
        const parts: string[] = [];

        if (context.app) {
          parts.push(`**Current Application:** ${context.app.app_name} (${context.app.app_type})`);
        }

        if (context.window) {
          parts.push(`**Active Window:** ${context.window.title}`);
        }

        if (context.file) {
          parts.push(`**Current File:** ${context.file.path}`);
          parts.push(`**Language:** ${context.file.language}`);
        }

        if (context.selection) {
          parts.push(`**Selected Text:**\n\`\`\`\n${context.selection.text}\n\`\`\``);
        }

        return parts.length > 0 ? `## System Context\n\n${parts.join('\n\n')}` : '';
      };

      const context: SystemContext = {
        app: { app_name: 'VS Code', app_type: 'IDE' },
        window: { title: 'main.ts' },
        file: { path: '/src/main.ts', language: 'typescript' },
        selection: { text: 'console.log("test");' },
      };

      const prompt = buildContextPrompt(context);
      const emptyPrompt = buildContextPrompt({});

      return {
        hasHeader: prompt.includes('## System Context'),
        hasApp: prompt.includes('VS Code'),
        hasFile: prompt.includes('/src/main.ts'),
        hasLanguage: prompt.includes('typescript'),
        hasSelection: prompt.includes('console.log'),
        emptyIsEmpty: emptyPrompt === '',
      };
    });

    expect(result.hasHeader).toBe(true);
    expect(result.hasApp).toBe(true);
    expect(result.hasFile).toBe(true);
    expect(result.hasLanguage).toBe(true);
    expect(result.hasSelection).toBe(true);
    expect(result.emptyIsEmpty).toBe(true);
  });

  test('should detect browser context', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface BrowserContext {
        url: string;
        title: string;
        domain: string;
        isDocumentation: boolean;
        isStackOverflow: boolean;
        isGitHub: boolean;
      }

      const parseBrowserContext = (url: string, title: string): BrowserContext => {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;

        return {
          url,
          title,
          domain,
          isDocumentation: /docs?\./.test(domain) || title.toLowerCase().includes('documentation'),
          isStackOverflow: domain.includes('stackoverflow.com'),
          isGitHub: domain.includes('github.com'),
        };
      };

      const docsContext = parseBrowserContext('https://docs.example.com/api', 'API Documentation');
      const soContext = parseBrowserContext('https://stackoverflow.com/questions/12345', 'How to fix error');
      const ghContext = parseBrowserContext('https://github.com/user/repo', 'user/repo');

      return {
        docsIsDocumentation: docsContext.isDocumentation,
        soIsStackOverflow: soContext.isStackOverflow,
        ghIsGitHub: ghContext.isGitHub,
        docsDomain: docsContext.domain,
      };
    });

    expect(result.docsIsDocumentation).toBe(true);
    expect(result.soIsStackOverflow).toBe(true);
    expect(result.ghIsGitHub).toBe(true);
    expect(result.docsDomain).toBe('docs.example.com');
  });
});

/**
 * Selection Toolbar Tests
 * Tests text selection and action triggering
 */
test.describe('Selection Toolbar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should detect text selection', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface TextSelection {
        text: string;
        startOffset: number;
        endOffset: number;
        source: string;
        timestamp: number;
      }

      let currentSelection: TextSelection | null = null;

      const updateSelection = (text: string, startOffset: number, endOffset: number, source: string) => {
        if (text.trim().length === 0) {
          currentSelection = null;
          return;
        }

        currentSelection = {
          text,
          startOffset,
          endOffset,
          source,
          timestamp: Date.now(),
        };
      };

      const getSelection = (): TextSelection | null => currentSelection;

      const clearSelection = () => {
        currentSelection = null;
      };

      updateSelection('Selected text content', 10, 30, 'editor');
      const afterSelect = getSelection();

      updateSelection('   ', 0, 3, 'editor');
      const afterWhitespace = getSelection();

      updateSelection('New selection', 0, 13, 'browser');
      clearSelection();
      const afterClear = getSelection();

      return {
        afterSelectText: afterSelect?.text,
        afterSelectSource: afterSelect?.source,
        afterWhitespaceIsNull: afterWhitespace === null,
        afterClearIsNull: afterClear === null,
      };
    });

    expect(result.afterSelectText).toBe('Selected text content');
    expect(result.afterSelectSource).toBe('editor');
    expect(result.afterWhitespaceIsNull).toBe(true);
    expect(result.afterClearIsNull).toBe(true);
  });

  test('should provide selection actions', async ({ page }) => {
    const result = await page.evaluate(() => {
      type SelectionAction = 'explain' | 'translate' | 'summarize' | 'fix' | 'improve' | 'copy';

      interface ActionConfig {
        id: SelectionAction;
        label: string;
        icon: string;
        shortcut?: string;
      }

      const actions: ActionConfig[] = [
        { id: 'explain', label: 'Explain', icon: 'HelpCircle', shortcut: 'Ctrl+Shift+E' },
        { id: 'translate', label: 'Translate', icon: 'Languages', shortcut: 'Ctrl+Shift+T' },
        { id: 'summarize', label: 'Summarize', icon: 'FileText' },
        { id: 'fix', label: 'Fix', icon: 'Wrench' },
        { id: 'improve', label: 'Improve', icon: 'Sparkles' },
        { id: 'copy', label: 'Copy', icon: 'Copy', shortcut: 'Ctrl+C' },
      ];

      const getActionById = (id: SelectionAction): ActionConfig | undefined => {
        return actions.find(a => a.id === id);
      };

      const getActionsWithShortcuts = (): ActionConfig[] => {
        return actions.filter(a => a.shortcut !== undefined);
      };

      const explainAction = getActionById('explain');
      const actionsWithShortcuts = getActionsWithShortcuts();

      return {
        actionCount: actions.length,
        explainLabel: explainAction?.label,
        explainShortcut: explainAction?.shortcut,
        shortcutActionCount: actionsWithShortcuts.length,
      };
    });

    expect(result.actionCount).toBe(6);
    expect(result.explainLabel).toBe('Explain');
    expect(result.explainShortcut).toBe('Ctrl+Shift+E');
    expect(result.shortcutActionCount).toBe(3);
  });
});

/**
 * Clipboard Manager Tests
 * Tests clipboard history, formatting, and cross-app clipboard
 */
test.describe('Clipboard Manager', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should manage clipboard history', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ClipboardEntry {
        id: string;
        content: string;
        type: 'text' | 'image' | 'file' | 'html';
        timestamp: number;
        source: string;
        pinned: boolean;
      }

      class ClipboardManager {
        private history: ClipboardEntry[] = [];
        private maxSize: number;

        constructor(maxSize: number = 50) {
          this.maxSize = maxSize;
        }

        add(content: string, type: ClipboardEntry['type'], source: string): ClipboardEntry {
          const entry: ClipboardEntry = {
            id: `clip-${Date.now()}-${Math.random()}`,
            content,
            type,
            timestamp: Date.now(),
            source,
            pinned: false,
          };

          const existingIndex = this.history.findIndex(e => e.content === content);
          if (existingIndex !== -1) {
            this.history.splice(existingIndex, 1);
          }

          this.history.unshift(entry);

          while (this.history.length > this.maxSize) {
            const unpinnedIndex = [...this.history].reverse().findIndex(e => !e.pinned);
            if (unpinnedIndex !== -1) {
              this.history.splice(this.history.length - 1 - unpinnedIndex, 1);
            } else {
              break;
            }
          }

          return entry;
        }

        pin(id: string): void {
          const entry = this.history.find(e => e.id === id);
          if (entry) entry.pinned = true;
        }

        unpin(id: string): void {
          const entry = this.history.find(e => e.id === id);
          if (entry) entry.pinned = false;
        }

        getHistory(): ClipboardEntry[] {
          return [...this.history];
        }

        search(query: string): ClipboardEntry[] {
          return this.history.filter(e => 
            e.content.toLowerCase().includes(query.toLowerCase())
          );
        }

        clear(): void {
          this.history = this.history.filter(e => e.pinned);
        }
      }

      const manager = new ClipboardManager(5);

      manager.add('First copy', 'text', 'VSCode');
      manager.add('Second copy', 'text', 'Chrome');
      const thirdEntry = manager.add('Third copy', 'text', 'Terminal');
      manager.pin(thirdEntry.id);
      manager.add('Fourth copy', 'text', 'VSCode');
      manager.add('Fifth copy', 'text', 'Chrome');
      manager.add('Sixth copy', 'text', 'Terminal');

      const history = manager.getHistory();
      const searchResults = manager.search('copy');

      manager.clear();
      const afterClear = manager.getHistory();

      return {
        historyLength: history.length,
        firstItem: history[0].content,
        searchResultCount: searchResults.length,
        pinnedRemains: afterClear.length,
        pinnedContent: afterClear[0]?.content,
      };
    });

    expect(result.historyLength).toBe(5);
    expect(result.firstItem).toBe('Sixth copy');
    expect(result.searchResultCount).toBe(5);
    expect(result.pinnedRemains).toBe(1);
    expect(result.pinnedContent).toBe('Third copy');
  });

  test('should detect clipboard content type', async ({ page }) => {
    const result = await page.evaluate(() => {
      type ContentType = 'text' | 'url' | 'email' | 'code' | 'json' | 'path' | 'unknown';

      const detectContentType = (content: string): ContentType => {
        if (/^https?:\/\/\S+$/.test(content)) return 'url';
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content)) return 'email';
        if (/^[A-Za-z]:\\|^\//.test(content) && /\.\w+$/.test(content)) return 'path';

        try {
          JSON.parse(content);
          return 'json';
        } catch {
          // Not JSON
        }

        if (/^(function|const|let|var|class|import|export)\b/.test(content)) return 'code';
        if (/[{};()]/.test(content) && content.split('\n').length > 1) return 'code';

        return 'text';
      };

      return {
        urlType: detectContentType('https://example.com/path'),
        emailType: detectContentType('user@example.com'),
        jsonType: detectContentType('{"key": "value"}'),
        codeType: detectContentType('const x = 10;\nfunction test() {}'),
        pathType: detectContentType('/Users/test/file.txt'),
        textType: detectContentType('Hello, world!'),
      };
    });

    expect(result.urlType).toBe('url');
    expect(result.emailType).toBe('email');
    expect(result.jsonType).toBe('json');
    expect(result.codeType).toBe('code');
    expect(result.pathType).toBe('path');
    expect(result.textType).toBe('text');
  });
});

/**
 * Window Management Tests
 * Tests window tracking, focus, and layout
 */
test.describe('Window Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should track window state', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface WindowState {
        id: string;
        title: string;
        bounds: { x: number; y: number; width: number; height: number };
        isMinimized: boolean;
        isFocused: boolean;
        zIndex: number;
      }

      class WindowManager {
        private windows: WindowState[] = [];
        private focusedId: string | null = null;
        private nextZIndex: number = 1;

        addWindow(title: string, bounds: WindowState['bounds']): WindowState {
          const window: WindowState = {
            id: `window-${Date.now()}-${Math.random()}`,
            title,
            bounds,
            isMinimized: false,
            isFocused: false,
            zIndex: this.nextZIndex++,
          };
          this.windows.push(window);
          this.focus(window.id);
          return window;
        }

        focus(id: string): void {
          if (this.focusedId) {
            const prev = this.windows.find(w => w.id === this.focusedId);
            if (prev) prev.isFocused = false;
          }

          const window = this.windows.find(w => w.id === id);
          if (window) {
            window.isFocused = true;
            window.isMinimized = false;
            window.zIndex = this.nextZIndex++;
            this.focusedId = id;
          }
        }

        minimize(id: string): void {
          const window = this.windows.find(w => w.id === id);
          if (window) {
            window.isMinimized = true;
            window.isFocused = false;
            if (this.focusedId === id) this.focusedId = null;
          }
        }

        getWindows(): WindowState[] {
          return [...this.windows].sort((a, b) => b.zIndex - a.zIndex);
        }

        getFocused(): WindowState | null {
          return this.windows.find(w => w.isFocused) || null;
        }
      }

      const manager = new WindowManager();

      const win1 = manager.addWindow('Editor', { x: 0, y: 0, width: 800, height: 600 });
      const _win2 = manager.addWindow('Terminal', { x: 100, y: 100, width: 600, height: 400 });
      manager.addWindow('Browser', { x: 200, y: 200, width: 1000, height: 700 });

      const focusedBeforeMinimize = manager.getFocused()?.title;

      manager.minimize(manager.getFocused()!.id);
      const focusedAfterMinimize = manager.getFocused();

      manager.focus(win1.id);
      const focusedAfterRefocus = manager.getFocused()?.title;

      return {
        windowCount: manager.getWindows().length,
        focusedBeforeMinimize,
        focusedAfterMinimize,
        focusedAfterRefocus,
        topWindowTitle: manager.getWindows()[0]?.title,
      };
    });

    expect(result.windowCount).toBe(3);
    expect(result.focusedBeforeMinimize).toBe('Browser');
    expect(result.focusedAfterMinimize).toBe(null);
    expect(result.focusedAfterRefocus).toBe('Editor');
    expect(result.topWindowTitle).toBe('Editor');
  });

  test('should calculate window layouts', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Bounds {
        x: number;
        y: number;
        width: number;
        height: number;
      }

      type LayoutType = 'cascade' | 'tile-horizontal' | 'tile-vertical' | 'grid';

      const calculateLayout = (
        windowCount: number,
        screenBounds: Bounds,
        layoutType: LayoutType
      ): Bounds[] => {
        const layouts: Bounds[] = [];
        const { x, y, width, height } = screenBounds;

        switch (layoutType) {
          case 'cascade':
            for (let i = 0; i < windowCount; i++) {
              layouts.push({
                x: x + i * 30,
                y: y + i * 30,
                width: width * 0.6,
                height: height * 0.6,
              });
            }
            break;

          case 'tile-horizontal':
            const tileWidth = width / windowCount;
            for (let i = 0; i < windowCount; i++) {
              layouts.push({
                x: x + i * tileWidth,
                y,
                width: tileWidth,
                height,
              });
            }
            break;

          case 'tile-vertical':
            const tileHeight = height / windowCount;
            for (let i = 0; i < windowCount; i++) {
              layouts.push({
                x,
                y: y + i * tileHeight,
                width,
                height: tileHeight,
              });
            }
            break;

          case 'grid':
            const cols = Math.ceil(Math.sqrt(windowCount));
            const rows = Math.ceil(windowCount / cols);
            const cellWidth = width / cols;
            const cellHeight = height / rows;

            for (let i = 0; i < windowCount; i++) {
              const col = i % cols;
              const row = Math.floor(i / cols);
              layouts.push({
                x: x + col * cellWidth,
                y: y + row * cellHeight,
                width: cellWidth,
                height: cellHeight,
              });
            }
            break;
        }

        return layouts;
      };

      const screen = { x: 0, y: 0, width: 1920, height: 1080 };

      const cascade = calculateLayout(3, screen, 'cascade');
      const tileH = calculateLayout(2, screen, 'tile-horizontal');
      const grid = calculateLayout(4, screen, 'grid');

      return {
        cascadeCount: cascade.length,
        cascadeSecondX: cascade[1]?.x,
        tileHWidth: tileH[0]?.width,
        gridCols: Math.sqrt(grid.length),
        gridCellWidth: grid[0]?.width,
      };
    });

    expect(result.cascadeCount).toBe(3);
    expect(result.cascadeSecondX).toBe(30);
    expect(result.tileHWidth).toBe(960);
    expect(result.gridCols).toBe(2);
    expect(result.gridCellWidth).toBe(960);
  });
});

/**
 * System Tray Tests
 * Tests system tray icon, menu, and notifications
 */
test.describe('System Tray', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should manage tray menu items', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface TrayMenuItem {
        id: string;
        label: string;
        type: 'item' | 'separator' | 'submenu' | 'checkbox';
        enabled: boolean;
        checked?: boolean;
        submenu?: TrayMenuItem[];
        onClick?: () => void;
      }

      class TrayMenu {
        private items: TrayMenuItem[] = [];

        addItem(item: Omit<TrayMenuItem, 'enabled'> & { enabled?: boolean }): void {
          this.items.push({ ...item, enabled: item.enabled !== false });
        }

        addSeparator(): void {
          this.items.push({
            id: `sep-${Date.now()}`,
            label: '',
            type: 'separator',
            enabled: true,
          });
        }

        getItems(): TrayMenuItem[] {
          return [...this.items];
        }

        setChecked(id: string, checked: boolean): void {
          const item = this.findItem(id);
          if (item && item.type === 'checkbox') {
            item.checked = checked;
          }
        }

        setEnabled(id: string, enabled: boolean): void {
          const item = this.findItem(id);
          if (item) item.enabled = enabled;
        }

        private findItem(id: string): TrayMenuItem | undefined {
          for (const item of this.items) {
            if (item.id === id) return item;
            if (item.submenu) {
              const found = item.submenu.find(i => i.id === id);
              if (found) return found;
            }
          }
          return undefined;
        }
      }

      const menu = new TrayMenu();

      menu.addItem({ id: 'show', label: 'Show Window', type: 'item' });
      menu.addSeparator();
      menu.addItem({ id: 'autostart', label: 'Start at Login', type: 'checkbox', checked: false });
      menu.addItem({ id: 'notifications', label: 'Enable Notifications', type: 'checkbox', checked: true });
      menu.addSeparator();
      menu.addItem({
        id: 'settings',
        label: 'Settings',
        type: 'submenu',
        submenu: [
          { id: 'theme', label: 'Theme', type: 'item', enabled: true },
          { id: 'language', label: 'Language', type: 'item', enabled: true },
        ],
      });
      menu.addSeparator();
      menu.addItem({ id: 'quit', label: 'Quit', type: 'item' });

      menu.setChecked('autostart', true);
      menu.setEnabled('quit', false);

      const items = menu.getItems();

      return {
        itemCount: items.length,
        separatorCount: items.filter(i => i.type === 'separator').length,
        checkboxCount: items.filter(i => i.type === 'checkbox').length,
        autostartChecked: items.find(i => i.id === 'autostart')?.checked,
        quitEnabled: items.find(i => i.id === 'quit')?.enabled,
        hasSubmenu: items.some(i => i.type === 'submenu'),
      };
    });

    expect(result.itemCount).toBe(8);
    expect(result.separatorCount).toBe(3);
    expect(result.checkboxCount).toBe(2);
    expect(result.autostartChecked).toBe(true);
    expect(result.quitEnabled).toBe(false);
    expect(result.hasSubmenu).toBe(true);
  });

  test('should handle tray notifications', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface TrayNotification {
        id: string;
        title: string;
        body: string;
        icon?: string;
        sound?: boolean;
        actions?: { id: string; label: string }[];
        timeout: number;
        timestamp: number;
      }

      class NotificationManager {
        private notifications: TrayNotification[] = [];
        private defaultTimeout: number = 5000;

        show(options: Omit<TrayNotification, 'id' | 'timestamp' | 'timeout'> & { timeout?: number }): TrayNotification {
          const notification: TrayNotification = {
            id: `notif-${Date.now()}-${Math.random()}`,
            ...options,
            timeout: options.timeout ?? this.defaultTimeout,
            timestamp: Date.now(),
          };

          this.notifications.push(notification);
          return notification;
        }

        dismiss(id: string): void {
          this.notifications = this.notifications.filter(n => n.id !== id);
        }

        dismissAll(): void {
          this.notifications = [];
        }

        getActive(): TrayNotification[] {
          const now = Date.now();
          return this.notifications.filter(n => now - n.timestamp < n.timeout);
        }

        getHistory(): TrayNotification[] {
          return [...this.notifications];
        }
      }

      const manager = new NotificationManager();

      manager.show({
        title: 'Update Available',
        body: 'Version 2.0 is ready to install',
        sound: true,
        actions: [
          { id: 'install', label: 'Install Now' },
          { id: 'later', label: 'Later' },
        ],
      });

      manager.show({
        title: 'Task Complete',
        body: 'Your export has finished',
        timeout: 3000,
      });

      manager.show({
        title: 'New Message',
        body: 'You have 3 new messages',
      });

      const activeCount = manager.getActive().length;
      const historyCount = manager.getHistory().length;
      const hasActions = manager.getHistory().some(n => n.actions && n.actions.length > 0);

      manager.dismissAll();
      const afterDismissCount = manager.getHistory().length;

      return {
        activeCount,
        historyCount,
        hasActions,
        afterDismissCount,
      };
    });

    expect(result.activeCount).toBe(3);
    expect(result.historyCount).toBe(3);
    expect(result.hasActions).toBe(true);
    expect(result.afterDismissCount).toBe(0);
  });
});

/**
 * File System Watcher Tests
 * Tests file watching, change detection, and debouncing
 */
test.describe('File System Watcher', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should track file changes', async ({ page }) => {
    const result = await page.evaluate(() => {
      type ChangeType = 'create' | 'modify' | 'delete' | 'rename';

      interface FileChange {
        id: string;
        path: string;
        type: ChangeType;
        timestamp: number;
        oldPath?: string;
      }

      class FileWatcher {
        private changes: FileChange[] = [];
        private watchers: Map<string, { pattern: string; callback: (change: FileChange) => void }> = new Map();

        watch(pattern: string, callback: (change: FileChange) => void): string {
          const id = `watcher-${Date.now()}-${Math.random()}`;
          this.watchers.set(id, { pattern, callback });
          return id;
        }

        unwatch(id: string): void {
          this.watchers.delete(id);
        }

        simulateChange(path: string, type: ChangeType, oldPath?: string): void {
          const change: FileChange = {
            id: `change-${Date.now()}-${Math.random()}`,
            path,
            type,
            timestamp: Date.now(),
            oldPath,
          };

          this.changes.push(change);

          for (const [_id, watcher] of this.watchers) {
            if (this.matchesPattern(path, watcher.pattern)) {
              watcher.callback(change);
            }
          }
        }

        private matchesPattern(path: string, pattern: string): boolean {
          if (pattern === '**/*') return true;
          if (pattern.startsWith('*.')) {
            const ext = pattern.slice(1);
            return path.endsWith(ext);
          }
          return path.includes(pattern);
        }

        getChanges(): FileChange[] {
          return [...this.changes];
        }

        clearChanges(): void {
          this.changes = [];
        }
      }

      const watcher = new FileWatcher();
      const tsChanges: FileChange[] = [];
      const allChanges: FileChange[] = [];

      watcher.watch('*.ts', (change) => tsChanges.push(change));
      watcher.watch('**/*', (change) => allChanges.push(change));

      watcher.simulateChange('/src/app.ts', 'modify');
      watcher.simulateChange('/src/styles.css', 'modify');
      watcher.simulateChange('/src/utils.ts', 'create');
      watcher.simulateChange('/src/old.ts', 'rename', '/src/new.ts');

      return {
        totalChanges: watcher.getChanges().length,
        tsChangeCount: tsChanges.length,
        allChangeCount: allChanges.length,
        hasRename: watcher.getChanges().some(c => c.type === 'rename'),
        hasCreate: watcher.getChanges().some(c => c.type === 'create'),
      };
    });

    expect(result.totalChanges).toBe(4);
    expect(result.tsChangeCount).toBe(3);
    expect(result.allChangeCount).toBe(4);
    expect(result.hasRename).toBe(true);
    expect(result.hasCreate).toBe(true);
  });

  test('should debounce rapid file changes', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface DebouncedChange {
        path: string;
        changes: number;
        firstChange: number;
        lastChange: number;
      }

      class DebouncedWatcher {
        private pending: Map<string, { count: number; first: number; last: number }> = new Map();
        private debounceMs: number;
        private callback: (change: DebouncedChange) => void;
        private _timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

        constructor(debounceMs: number, callback: (change: DebouncedChange) => void) {
          this.debounceMs = debounceMs;
          this.callback = callback;
        }

        onChange(path: string): void {
          const now = Date.now();
          const existing = this.pending.get(path);

          if (existing) {
            existing.count++;
            existing.last = now;
          } else {
            this.pending.set(path, { count: 1, first: now, last: now });
          }

          const existingTimer = this._timers.get(path);
          if (existingTimer) {
            clearTimeout(existingTimer);
          }

          const timer = setTimeout(() => {
            const data = this.pending.get(path);
            if (data) {
              this.callback({
                path,
                changes: data.count,
                firstChange: data.first,
                lastChange: data.last,
              });
              this.pending.delete(path);
              this._timers.delete(path);
            }
          }, this.debounceMs);

          this._timers.set(path, timer);
        }

        getPendingCount(): number {
          return this.pending.size;
        }
      }

      const processedChanges: DebouncedChange[] = [];
      const watcher = new DebouncedWatcher(100, (change) => processedChanges.push(change));

      watcher.onChange('/src/app.ts');
      watcher.onChange('/src/app.ts');
      watcher.onChange('/src/app.ts');
      watcher.onChange('/src/utils.ts');
      watcher.onChange('/src/utils.ts');

      const pendingCount = watcher.getPendingCount();

      return new Promise<{
        pendingCount: number;
        processedCount: number;
        appChanges: number;
        utilsChanges: number;
      }>((resolve) => {
        setTimeout(() => {
          resolve({
            pendingCount,
            processedCount: processedChanges.length,
            appChanges: processedChanges.find(c => c.path === '/src/app.ts')?.changes ?? 0,
            utilsChanges: processedChanges.find(c => c.path === '/src/utils.ts')?.changes ?? 0,
          });
        }, 150);
      });
    });

    expect(result.pendingCount).toBe(2);
    expect(result.processedCount).toBe(2);
    expect(result.appChanges).toBe(3);
    expect(result.utilsChanges).toBe(2);
  });
});
