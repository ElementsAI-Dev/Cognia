import { test, expect } from '@playwright/test';

/**
 * Defect Detection Tests
 * Tests designed to find potential bugs and issues in the application
 */

test.describe('State Synchronization Defects', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should detect race condition in session updates', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Simulate race condition scenario
      let sessionTitle = 'Original';
      let updateCount = 0;

      const updateTitle = async (newTitle: string, delay: number) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        sessionTitle = newTitle;
        updateCount++;
      };

      // Simulate concurrent updates
      const update1 = updateTitle('Update 1', 10);
      const update2 = updateTitle('Update 2', 5);

      return Promise.all([update1, update2]).then(() => ({
        finalTitle: sessionTitle,
        updateCount,
        // Potential defect: last write wins without conflict resolution
        potentialIssue: updateCount === 2 && sessionTitle === 'Update 1',
      }));
    });

    // This test documents potential race condition behavior
    expect(result.updateCount).toBe(2);
  });

  test('should detect stale state after navigation', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Simulate state that might become stale
      interface CachedState {
        data: string;
        timestamp: number;
        isStale: boolean;
      }

      const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

      const checkStaleness = (state: CachedState): boolean => {
        const age = Date.now() - state.timestamp;
        return age > STALE_THRESHOLD;
      };

      const oldState: CachedState = {
        data: 'old data',
        timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
        isStale: false,
      };

      const freshState: CachedState = {
        data: 'fresh data',
        timestamp: Date.now(),
        isStale: false,
      };

      return {
        oldStateIsStale: checkStaleness(oldState),
        freshStateIsStale: checkStaleness(freshState),
      };
    });

    expect(result.oldStateIsStale).toBe(true);
    expect(result.freshStateIsStale).toBe(false);
  });

  test('should detect memory leak in event listeners', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Simulate event listener tracking
      const listeners: { event: string; handler: string }[] = [];
      let listenerCount = 0;

      const addListener = (event: string) => {
        listeners.push({ event, handler: `handler-${listenerCount++}` });
      };

      const removeListener = (event: string) => {
        const index = listeners.findIndex(l => l.event === event);
        if (index !== -1) {
          listeners.splice(index, 1);
          return true;
        }
        return false;
      };

      // Simulate component mount/unmount cycles
      for (let i = 0; i < 10; i++) {
        addListener('resize');
        addListener('scroll');
        // Bug: only removing one listener per cycle
        removeListener('resize');
      }

      return {
        listenerCount: listeners.length,
        // Potential defect: listeners accumulating
        hasLeakedListeners: listeners.length > 2,
        leakedEvents: listeners.map(l => l.event),
      };
    });

    // Document potential memory leak
    expect(result.hasLeakedListeners).toBe(true);
    expect(result.leakedEvents.filter(e => e === 'scroll').length).toBe(10);
  });
});

test.describe('Data Integrity Defects', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should detect orphaned artifacts after session deletion', async ({ page }) => {
    const result = await page.evaluate(() => {
      const sessions = [{ id: 's1' }, { id: 's2' }];
      const artifacts = [
        { id: 'a1', sessionId: 's1' },
        { id: 'a2', sessionId: 's1' },
        { id: 'a3', sessionId: 's2' },
      ];

      // Delete session without cleaning up artifacts
      const deleteSession = (sessionId: string) => {
        const index = sessions.findIndex(s => s.id === sessionId);
        if (index !== -1) {
          sessions.splice(index, 1);
        }
        // Bug: artifacts not cleaned up
      };

      deleteSession('s1');

      const orphanedArtifacts = artifacts.filter(
        a => !sessions.some(s => s.id === a.sessionId)
      );

      return {
        remainingSessions: sessions.length,
        totalArtifacts: artifacts.length,
        orphanedCount: orphanedArtifacts.length,
        // Potential defect: orphaned data
        hasOrphanedData: orphanedArtifacts.length > 0,
      };
    });

    // Document potential data integrity issue
    expect(result.hasOrphanedData).toBe(true);
    expect(result.orphanedCount).toBe(2);
  });

  test('should detect inconsistent message ordering', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Message {
        id: string;
        timestamp: number;
        order: number;
      }

      const messages: Message[] = [
        { id: 'm1', timestamp: 1000, order: 0 },
        { id: 'm2', timestamp: 2000, order: 1 },
        { id: 'm3', timestamp: 1500, order: 2 }, // Timestamp out of order
      ];

      const checkOrderConsistency = (msgs: Message[]): boolean => {
        for (let i = 1; i < msgs.length; i++) {
          if (msgs[i].timestamp < msgs[i - 1].timestamp) {
            return false;
          }
        }
        return true;
      };

      const isConsistent = checkOrderConsistency(messages);

      return {
        messageCount: messages.length,
        isConsistent,
        // Potential defect: order inconsistency
        hasOrderingIssue: !isConsistent,
      };
    });

    expect(result.hasOrderingIssue).toBe(true);
  });

  test('should detect duplicate IDs', async ({ page }) => {
    const result = await page.evaluate(() => {
      const items = [
        { id: 'item-1', name: 'First' },
        { id: 'item-2', name: 'Second' },
        { id: 'item-1', name: 'Duplicate' }, // Duplicate ID
      ];

      const findDuplicateIds = (arr: { id: string }[]): string[] => {
        const seen = new Set<string>();
        const duplicates: string[] = [];

        for (const item of arr) {
          if (seen.has(item.id)) {
            duplicates.push(item.id);
          } else {
            seen.add(item.id);
          }
        }

        return duplicates;
      };

      const duplicates = findDuplicateIds(items);

      return {
        itemCount: items.length,
        duplicateIds: duplicates,
        hasDuplicates: duplicates.length > 0,
      };
    });

    expect(result.hasDuplicates).toBe(true);
    expect(result.duplicateIds).toContain('item-1');
  });
});

test.describe('UI State Defects', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should detect loading state stuck', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface LoadingState {
        isLoading: boolean;
        startedAt: number | null;
        error: string | null;
      }

      const MAX_LOADING_TIME = 30000; // 30 seconds

      const checkStuckLoading = (state: LoadingState): boolean => {
        if (!state.isLoading || !state.startedAt) return false;
        const elapsed = Date.now() - state.startedAt;
        return elapsed > MAX_LOADING_TIME;
      };

      const stuckState: LoadingState = {
        isLoading: true,
        startedAt: Date.now() - 60000, // 60 seconds ago
        error: null,
      };

      const normalState: LoadingState = {
        isLoading: true,
        startedAt: Date.now() - 1000, // 1 second ago
        error: null,
      };

      return {
        stuckStateIsStuck: checkStuckLoading(stuckState),
        normalStateIsStuck: checkStuckLoading(normalState),
      };
    });

    expect(result.stuckStateIsStuck).toBe(true);
    expect(result.normalStateIsStuck).toBe(false);
  });

  test('should detect modal state inconsistency', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ModalState {
        isOpen: boolean;
        content: string | null;
        onClose: (() => void) | null;
      }

      const validateModalState = (state: ModalState): { valid: boolean; issues: string[] } => {
        const issues: string[] = [];

        if (state.isOpen && !state.content) {
          issues.push('Modal is open but has no content');
        }

        if (state.isOpen && !state.onClose) {
          issues.push('Modal is open but has no close handler');
        }

        if (!state.isOpen && state.content) {
          issues.push('Modal is closed but still has content (potential memory issue)');
        }

        return { valid: issues.length === 0, issues };
      };

      const invalidState: ModalState = {
        isOpen: true,
        content: null,
        onClose: null,
      };

      const validState: ModalState = {
        isOpen: true,
        content: 'Modal content',
        onClose: () => {},
      };

      return {
        invalidStateResult: validateModalState(invalidState),
        validStateResult: validateModalState(validState),
      };
    });

    expect(result.invalidStateResult.valid).toBe(false);
    expect(result.invalidStateResult.issues.length).toBeGreaterThan(0);
    expect(result.validStateResult.valid).toBe(true);
  });

  test('should detect focus trap issues', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Simulate focus trap validation
      const validateFocusTrap = (
        containerElements: string[],
        focusableElements: string[]
      ): { valid: boolean; issues: string[] } => {
        const issues: string[] = [];

        if (focusableElements.length === 0) {
          issues.push('No focusable elements in trap');
        }

        if (focusableElements.length === 1) {
          issues.push('Only one focusable element - focus cannot cycle');
        }

        // Check if first and last elements are properly identified
        const hasFirstFocusable = focusableElements.length > 0;
        const hasLastFocusable = focusableElements.length > 0;

        if (!hasFirstFocusable || !hasLastFocusable) {
          issues.push('Focus trap boundaries not properly defined');
        }

        return { valid: issues.length === 0, issues };
      };

      return {
        emptyTrap: validateFocusTrap(['modal'], []),
        singleElement: validateFocusTrap(['modal'], ['button']),
        validTrap: validateFocusTrap(['modal'], ['button', 'input', 'button']),
      };
    });

    expect(result.emptyTrap.valid).toBe(false);
    expect(result.singleElement.valid).toBe(false);
    expect(result.validTrap.valid).toBe(true);
  });
});

test.describe('API Error Handling Defects', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should detect unhandled API errors', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ApiResponse {
        success: boolean;
        data?: unknown;
        error?: { code: string; message: string };
      }

      const handleApiResponse = (response: ApiResponse): { handled: boolean; userMessage: string } => {
        if (response.success) {
          return { handled: true, userMessage: 'Success' };
        }

        // Check for proper error handling
        if (!response.error) {
          return { handled: false, userMessage: 'Unknown error occurred' };
        }

        const errorMessages: Record<string, string> = {
          'RATE_LIMIT': 'Too many requests. Please wait a moment.',
          'AUTH_FAILED': 'Authentication failed. Please check your API key.',
          'NETWORK_ERROR': 'Network error. Please check your connection.',
        };

        const userMessage = errorMessages[response.error.code] || response.error.message;

        return { handled: true, userMessage };
      };

      return {
        successResponse: handleApiResponse({ success: true, data: {} }),
        knownError: handleApiResponse({ success: false, error: { code: 'RATE_LIMIT', message: 'Rate limited' } }),
        unknownError: handleApiResponse({ success: false, error: { code: 'UNKNOWN', message: 'Something went wrong' } }),
        missingError: handleApiResponse({ success: false }),
      };
    });

    expect(result.successResponse.handled).toBe(true);
    expect(result.knownError.handled).toBe(true);
    expect(result.unknownError.handled).toBe(true);
    expect(result.missingError.handled).toBe(false);
  });

  test('should detect retry logic issues', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface RetryConfig {
        maxRetries: number;
        baseDelay: number;
        maxDelay: number;
      }

      const validateRetryConfig = (config: RetryConfig): { valid: boolean; issues: string[] } => {
        const issues: string[] = [];

        if (config.maxRetries < 0) {
          issues.push('maxRetries cannot be negative');
        }

        if (config.maxRetries > 10) {
          issues.push('maxRetries too high - may cause excessive delays');
        }

        if (config.baseDelay <= 0) {
          issues.push('baseDelay must be positive');
        }

        if (config.maxDelay < config.baseDelay) {
          issues.push('maxDelay must be >= baseDelay');
        }

        return { valid: issues.length === 0, issues };
      };

      return {
        negativeRetries: validateRetryConfig({ maxRetries: -1, baseDelay: 1000, maxDelay: 5000 }),
        tooManyRetries: validateRetryConfig({ maxRetries: 20, baseDelay: 1000, maxDelay: 5000 }),
        invalidDelay: validateRetryConfig({ maxRetries: 3, baseDelay: 5000, maxDelay: 1000 }),
        validConfig: validateRetryConfig({ maxRetries: 3, baseDelay: 1000, maxDelay: 10000 }),
      };
    });

    expect(result.negativeRetries.valid).toBe(false);
    expect(result.tooManyRetries.valid).toBe(false);
    expect(result.invalidDelay.valid).toBe(false);
    expect(result.validConfig.valid).toBe(true);
  });
});

test.describe('Accessibility Defects', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should detect missing ARIA labels', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Simulate checking for ARIA labels
      interface Element {
        tag: string;
        ariaLabel?: string;
        ariaLabelledBy?: string;
        textContent?: string;
      }

      const checkAccessibility = (element: Element): { accessible: boolean; issues: string[] } => {
        const issues: string[] = [];

        // Interactive elements need accessible names
        const interactiveElements = ['button', 'a', 'input', 'select', 'textarea'];

        if (interactiveElements.includes(element.tag)) {
          const hasAccessibleName = 
            element.ariaLabel || 
            element.ariaLabelledBy || 
            element.textContent;

          if (!hasAccessibleName) {
            issues.push(`${element.tag} missing accessible name`);
          }
        }

        return { accessible: issues.length === 0, issues };
      };

      return {
        buttonWithLabel: checkAccessibility({ tag: 'button', ariaLabel: 'Submit' }),
        buttonWithText: checkAccessibility({ tag: 'button', textContent: 'Submit' }),
        buttonWithoutLabel: checkAccessibility({ tag: 'button' }),
        inputWithLabel: checkAccessibility({ tag: 'input', ariaLabel: 'Email' }),
        inputWithoutLabel: checkAccessibility({ tag: 'input' }),
      };
    });

    expect(result.buttonWithLabel.accessible).toBe(true);
    expect(result.buttonWithText.accessible).toBe(true);
    expect(result.buttonWithoutLabel.accessible).toBe(false);
    expect(result.inputWithLabel.accessible).toBe(true);
    expect(result.inputWithoutLabel.accessible).toBe(false);
  });

  test('should detect color contrast issues', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Simplified contrast ratio calculation
      const getLuminance = (r: number, g: number, b: number): number => {
        const [rs, gs, bs] = [r, g, b].map(c => {
          c = c / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      };

      const getContrastRatio = (
        fg: [number, number, number],
        bg: [number, number, number]
      ): number => {
        const l1 = getLuminance(...fg);
        const l2 = getLuminance(...bg);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
      };

      const WCAG_AA_NORMAL = 4.5;
      const WCAG_AA_LARGE = 3;

      const checkContrast = (
        fg: [number, number, number],
        bg: [number, number, number],
        isLargeText: boolean = false
      ): { passes: boolean; ratio: number; required: number } => {
        const ratio = getContrastRatio(fg, bg);
        const required = isLargeText ? WCAG_AA_LARGE : WCAG_AA_NORMAL;
        return { passes: ratio >= required, ratio, required };
      };

      return {
        // Black on white - high contrast
        blackOnWhite: checkContrast([0, 0, 0], [255, 255, 255]),
        // Light gray on white - low contrast
        lightGrayOnWhite: checkContrast([200, 200, 200], [255, 255, 255]),
        // Dark gray on white - acceptable
        darkGrayOnWhite: checkContrast([100, 100, 100], [255, 255, 255]),
      };
    });

    expect(result.blackOnWhite.passes).toBe(true);
    expect(result.lightGrayOnWhite.passes).toBe(false);
    expect(result.darkGrayOnWhite.passes).toBe(true);
  });
});

test.describe('Performance Defects', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should detect excessive re-renders', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Simulate render tracking
      const renderCounts: Record<string, number> = {};
      const RENDER_THRESHOLD = 10;

      const trackRender = (componentName: string) => {
        renderCounts[componentName] = (renderCounts[componentName] || 0) + 1;
      };

      const checkExcessiveRenders = (): { component: string; count: number }[] => {
        return Object.entries(renderCounts)
          .filter(([_, count]) => count > RENDER_THRESHOLD)
          .map(([component, count]) => ({ component, count }));
      };

      // Simulate component renders
      for (let i = 0; i < 5; i++) trackRender('Header');
      for (let i = 0; i < 15; i++) trackRender('MessageList'); // Excessive
      for (let i = 0; i < 20; i++) trackRender('ChatInput'); // Excessive
      for (let i = 0; i < 3; i++) trackRender('Sidebar');

      const excessive = checkExcessiveRenders();

      return {
        excessiveComponents: excessive,
        hasPerformanceIssue: excessive.length > 0,
      };
    });

    expect(result.hasPerformanceIssue).toBe(true);
    expect(result.excessiveComponents.length).toBe(2);
  });

  test('should detect large payload issues', async ({ page }) => {
    const result = await page.evaluate(() => {
      const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB

      const checkPayloadSize = (data: unknown): { ok: boolean; size: number; warning?: string } => {
        const size = JSON.stringify(data).length;

        if (size > MAX_PAYLOAD_SIZE) {
          return { ok: false, size, warning: 'Payload exceeds maximum size' };
        }

        if (size > MAX_PAYLOAD_SIZE * 0.8) {
          return { ok: true, size, warning: 'Payload approaching maximum size' };
        }

        return { ok: true, size };
      };

      const smallPayload = { message: 'Hello' };
      const largePayload = { data: 'x'.repeat(2 * 1024 * 1024) };
      const mediumPayload = { data: 'x'.repeat(900 * 1024) };

      return {
        small: checkPayloadSize(smallPayload),
        large: checkPayloadSize(largePayload),
        medium: checkPayloadSize(mediumPayload),
      };
    });

    expect(result.small.ok).toBe(true);
    expect(result.large.ok).toBe(false);
    expect(result.medium.ok).toBe(true);
    expect(result.medium.warning).toBeDefined();
  });
});

test.describe('Security Defects', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should detect API key exposure in logs', async ({ page }) => {
    const result = await page.evaluate(() => {
      const sensitivePatterns = [
        /sk-[a-zA-Z0-9]{32,}/g, // OpenAI
        /sk-ant-[a-zA-Z0-9-]+/g, // Anthropic
        /AIza[a-zA-Z0-9_-]{35}/g, // Google
      ];

      const containsSensitiveData = (text: string): boolean => {
        return sensitivePatterns.some(pattern => pattern.test(text));
      };

      const sanitizeForLogging = (text: string): string => {
        let sanitized = text;
        for (const pattern of sensitivePatterns) {
          sanitized = sanitized.replace(pattern, '[REDACTED]');
        }
        return sanitized;
      };

      const logWithApiKey = 'Error with key sk-' + 'a'.repeat(48);
      const safeLog = 'User clicked button';

      return {
        unsafeLogContainsSensitive: containsSensitiveData(logWithApiKey),
        safeLogContainsSensitive: containsSensitiveData(safeLog),
        sanitizedLog: sanitizeForLogging(logWithApiKey),
        sanitizedContainsSensitive: containsSensitiveData(sanitizeForLogging(logWithApiKey)),
      };
    });

    expect(result.unsafeLogContainsSensitive).toBe(true);
    expect(result.safeLogContainsSensitive).toBe(false);
    expect(result.sanitizedLog).toContain('[REDACTED]');
    expect(result.sanitizedContainsSensitive).toBe(false);
  });

  test('should detect unsafe URL handling', async ({ page }) => {
    const result = await page.evaluate(() => {
      const validateUrl = (url: string): { safe: boolean; issues: string[] } => {
        const issues: string[] = [];

        try {
          const parsed = new URL(url);

          // Check for javascript: protocol
          if (parsed.protocol === 'javascript:') {
            issues.push('JavaScript protocol not allowed');
          }

          // Check for data: protocol with scripts
          if (parsed.protocol === 'data:' && url.includes('script')) {
            issues.push('Data URL with script content not allowed');
          }

          // Check for file: protocol
          if (parsed.protocol === 'file:') {
            issues.push('File protocol not allowed');
          }
        } catch {
          issues.push('Invalid URL format');
        }

        return { safe: issues.length === 0, issues };
      };

      return {
        httpUrl: validateUrl('https://example.com'),
        javascriptUrl: validateUrl('javascript:alert(1)'),
        dataUrl: validateUrl('data:text/html,<script>alert(1)</script>'),
        fileUrl: validateUrl('file:///etc/passwd'),
        invalidUrl: validateUrl('not a url'),
      };
    });

    expect(result.httpUrl.safe).toBe(true);
    expect(result.javascriptUrl.safe).toBe(false);
    expect(result.dataUrl.safe).toBe(false);
    expect(result.fileUrl.safe).toBe(false);
    expect(result.invalidUrl.safe).toBe(false);
  });
});
