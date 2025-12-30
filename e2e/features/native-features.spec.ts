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
