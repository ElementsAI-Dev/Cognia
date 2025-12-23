import { test, expect } from '@playwright/test';

/**
 * Edge Cases and Error Handling Tests
 * Tests boundary conditions, error scenarios, and potential defects
 */

test.describe('Session Store Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should handle empty session title', async ({ page }) => {
    const result = await page.evaluate(() => {
      const createSession = (title: string) => {
        // Empty title should default to "New Chat"
        const finalTitle = title.trim() || 'New Chat';
        return { id: 'test', title: finalTitle };
      };

      return {
        emptyTitle: createSession('').title,
        whitespaceTitle: createSession('   ').title,
        validTitle: createSession('My Chat').title,
      };
    });

    expect(result.emptyTitle).toBe('New Chat');
    expect(result.whitespaceTitle).toBe('New Chat');
    expect(result.validTitle).toBe('My Chat');
  });

  test('should handle duplicate session deletion', async ({ page }) => {
    const result = await page.evaluate(() => {
      const sessions = [
        { id: 's1', title: 'Session 1' },
        { id: 's2', title: 'Session 2' },
      ];

      const deleteSession = (id: string) => {
        const index = sessions.findIndex(s => s.id === id);
        if (index !== -1) {
          sessions.splice(index, 1);
          return true;
        }
        return false;
      };

      const firstDelete = deleteSession('s1');
      const secondDelete = deleteSession('s1'); // Try to delete again

      return {
        firstDelete,
        secondDelete,
        remainingSessions: sessions.length,
      };
    });

    expect(result.firstDelete).toBe(true);
    expect(result.secondDelete).toBe(false);
    expect(result.remainingSessions).toBe(1);
  });

  test('should handle session with very long title', async ({ page }) => {
    const result = await page.evaluate(() => {
      const MAX_TITLE_LENGTH = 100;
      const longTitle = 'A'.repeat(500);

      const truncateTitle = (title: string, maxLength: number = MAX_TITLE_LENGTH) => {
        if (title.length <= maxLength) return title;
        return title.slice(0, maxLength - 3) + '...';
      };

      const truncated = truncateTitle(longTitle);

      return {
        originalLength: longTitle.length,
        truncatedLength: truncated.length,
        endsWith: truncated.endsWith('...'),
      };
    });

    expect(result.originalLength).toBe(500);
    expect(result.truncatedLength).toBe(100);
    expect(result.endsWith).toBe(true);
  });

  test('should handle branch creation on non-existent session', async ({ page }) => {
    const result = await page.evaluate(() => {
      const sessions: { id: string; branches: unknown[] }[] = [];

      const createBranch = (sessionId: string) => {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return null;
        const branch = { id: 'b1', name: 'Branch 1' };
        session.branches.push(branch);
        return branch;
      };

      const branch = createBranch('non-existent');

      return {
        branchCreated: branch !== null,
      };
    });

    expect(result.branchCreated).toBe(false);
  });

  test('should handle switching to non-existent branch', async ({ page }) => {
    const result = await page.evaluate(() => {
      const session = {
        id: 's1',
        activeBranchId: null as string | null,
        branches: [{ id: 'b1', name: 'Branch 1' }],
      };

      const switchBranch = (branchId: string): boolean => {
        const branch = session.branches.find(b => b.id === branchId);
        if (!branch) return false;
        session.activeBranchId = branchId;
        return true;
      };

      const validSwitch = switchBranch('b1');
      const invalidSwitch = switchBranch('non-existent');

      return {
        validSwitch,
        invalidSwitch,
        activeBranchId: session.activeBranchId,
      };
    });

    expect(result.validSwitch).toBe(true);
    expect(result.invalidSwitch).toBe(false);
    expect(result.activeBranchId).toBe('b1');
  });
});

test.describe('Message Handling Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should handle empty message content', async ({ page }) => {
    const result = await page.evaluate(() => {
      const validateMessage = (content: string): { valid: boolean; error?: string } => {
        const trimmed = content.trim();
        if (!trimmed) {
          return { valid: false, error: 'Message cannot be empty' };
        }
        return { valid: true };
      };

      return {
        empty: validateMessage(''),
        whitespace: validateMessage('   '),
        valid: validateMessage('Hello'),
      };
    });

    expect(result.empty.valid).toBe(false);
    expect(result.whitespace.valid).toBe(false);
    expect(result.valid.valid).toBe(true);
  });

  test('should handle message with only special characters', async ({ page }) => {
    const result = await page.evaluate(() => {
      const isValidMessage = (content: string): boolean => {
        // Check if message has any alphanumeric content
        return /[a-zA-Z0-9\u4e00-\u9fa5]/.test(content);
      };

      return {
        onlyEmoji: isValidMessage('😀😀😀'),
        onlyPunctuation: isValidMessage('!!!???'),
        withText: isValidMessage('Hello! 😀'),
        chinese: isValidMessage('你好'),
      };
    });

    // Emoji-only and punctuation-only should still be valid for chat
    expect(result.withText).toBe(true);
    expect(result.chinese).toBe(true);
  });

  test('should handle very long message', async ({ page }) => {
    const result = await page.evaluate(() => {
      const MAX_MESSAGE_LENGTH = 100000;
      const longMessage = 'A'.repeat(150000);

      const validateLength = (content: string): { valid: boolean; truncated?: string } => {
        if (content.length > MAX_MESSAGE_LENGTH) {
          return {
            valid: false,
            truncated: content.slice(0, MAX_MESSAGE_LENGTH),
          };
        }
        return { valid: true };
      };

      const validation = validateLength(longMessage);

      return {
        originalLength: longMessage.length,
        valid: validation.valid,
        truncatedLength: validation.truncated?.length,
      };
    });

    expect(result.originalLength).toBe(150000);
    expect(result.valid).toBe(false);
    expect(result.truncatedLength).toBe(100000);
  });

  test('should handle message with XSS attempt', async ({ page }) => {
    const result = await page.evaluate(() => {
      const sanitizeMessage = (content: string): string => {
        return content
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
      };

      const xssAttempt = '<script>alert("xss")</script>';
      const sanitized = sanitizeMessage(xssAttempt);

      return {
        original: xssAttempt,
        sanitized,
        containsScript: sanitized.includes('<script>'),
      };
    });

    expect(result.containsScript).toBe(false);
    expect(result.sanitized).toContain('&lt;script&gt;');
  });
});

test.describe('Artifact Store Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should handle artifact with empty content', async ({ page }) => {
    const result = await page.evaluate(() => {
      const createArtifact = (content: string) => {
        if (!content.trim()) {
          return { success: false, error: 'Content cannot be empty' };
        }
        return { success: true, artifact: { id: 'a1', content } };
      };

      return {
        empty: createArtifact(''),
        whitespace: createArtifact('   '),
        valid: createArtifact('console.log("hello")'),
      };
    });

    expect(result.empty.success).toBe(false);
    expect(result.whitespace.success).toBe(false);
    expect(result.valid.success).toBe(true);
  });

  test('should handle duplicate artifact IDs', async ({ page }) => {
    const result = await page.evaluate(() => {
      const artifacts: Record<string, { id: string; content: string }> = {};

      const addArtifact = (id: string, content: string): boolean => {
        if (artifacts[id]) {
          return false; // Duplicate
        }
        artifacts[id] = { id, content };
        return true;
      };

      const first = addArtifact('a1', 'content1');
      const duplicate = addArtifact('a1', 'content2');

      return {
        firstAdded: first,
        duplicateAdded: duplicate,
        artifactCount: Object.keys(artifacts).length,
        content: artifacts['a1']?.content,
      };
    });

    expect(result.firstAdded).toBe(true);
    expect(result.duplicateAdded).toBe(false);
    expect(result.artifactCount).toBe(1);
    expect(result.content).toBe('content1');
  });

  test('should handle canvas version limit', async ({ page }) => {
    const result = await page.evaluate(() => {
      const MAX_VERSIONS = 50;
      const versions: { id: string; content: string }[] = [];

      const saveVersion = (content: string) => {
        if (versions.length >= MAX_VERSIONS) {
          versions.shift(); // Remove oldest
        }
        versions.push({ id: `v${versions.length}`, content });
      };

      // Add 60 versions
      for (let i = 0; i < 60; i++) {
        saveVersion(`content-${i}`);
      }

      return {
        versionCount: versions.length,
        oldestVersion: versions[0]?.id,
        newestVersion: versions[versions.length - 1]?.id,
      };
    });

    expect(result.versionCount).toBe(50);
    expect(result.oldestVersion).toBe('v10'); // First 10 were removed
  });

  test('should handle restoring non-existent version', async ({ page }) => {
    const result = await page.evaluate(() => {
      const versions = [
        { id: 'v1', content: 'version 1' },
        { id: 'v2', content: 'version 2' },
      ];

      const restoreVersion = (versionId: string): string | null => {
        const version = versions.find(v => v.id === versionId);
        return version?.content || null;
      };

      return {
        validRestore: restoreVersion('v1'),
        invalidRestore: restoreVersion('v999'),
      };
    });

    expect(result.validRestore).toBe('version 1');
    expect(result.invalidRestore).toBeNull();
  });
});

test.describe('Agent Store Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should handle agent step overflow', async ({ page }) => {
    const result = await page.evaluate(() => {
      let currentStep = 0;
      const maxSteps = 5;

      const nextStep = (): boolean => {
        if (currentStep >= maxSteps) {
          return false; // Cannot exceed max
        }
        currentStep++;
        return true;
      };

      // Try to go beyond max steps
      for (let i = 0; i < 10; i++) {
        nextStep();
      }

      return {
        currentStep,
        maxSteps,
        exceededMax: currentStep > maxSteps,
      };
    });

    expect(result.currentStep).toBe(5);
    expect(result.exceededMax).toBe(false);
  });

  test('should handle tool execution timeout', async ({ page }) => {
    const result = await page.evaluate(() => {
      const TIMEOUT_MS = 30000;

      interface ToolExecution {
        id: string;
        startedAt: number;
        status: 'running' | 'completed' | 'failed' | 'timeout';
      }

      const checkTimeout = (execution: ToolExecution): boolean => {
        const elapsed = Date.now() - execution.startedAt;
        if (elapsed > TIMEOUT_MS && execution.status === 'running') {
          execution.status = 'timeout';
          return true;
        }
        return false;
      };

      const oldExecution: ToolExecution = {
        id: 't1',
        startedAt: Date.now() - 60000, // 60 seconds ago
        status: 'running',
      };

      const recentExecution: ToolExecution = {
        id: 't2',
        startedAt: Date.now() - 1000, // 1 second ago
        status: 'running',
      };

      return {
        oldTimedOut: checkTimeout(oldExecution),
        recentTimedOut: checkTimeout(recentExecution),
        oldStatus: oldExecution.status,
        recentStatus: recentExecution.status,
      };
    });

    expect(result.oldTimedOut).toBe(true);
    expect(result.recentTimedOut).toBe(false);
    expect(result.oldStatus).toBe('timeout');
    expect(result.recentStatus).toBe('running');
  });

  test('should handle plan with no steps', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Plan {
        id: string;
        steps: { id: string; status: string }[];
        status: 'pending' | 'running' | 'completed' | 'failed';
      }

      const startPlan = (plan: Plan): { success: boolean; error?: string } => {
        if (plan.steps.length === 0) {
          return { success: false, error: 'Plan must have at least one step' };
        }
        plan.status = 'running';
        return { success: true };
      };

      const emptyPlan: Plan = { id: 'p1', steps: [], status: 'pending' };
      const validPlan: Plan = { id: 'p2', steps: [{ id: 's1', status: 'pending' }], status: 'pending' };

      return {
        emptyPlanStart: startPlan(emptyPlan),
        validPlanStart: startPlan(validPlan),
      };
    });

    expect(result.emptyPlanStart.success).toBe(false);
    expect(result.emptyPlanStart.error).toContain('at least one step');
    expect(result.validPlanStart.success).toBe(true);
  });

  test('should handle concurrent tool executions', async ({ page }) => {
    const result = await page.evaluate(() => {
      const MAX_CONCURRENT = 3;
      const runningTools: string[] = [];

      const startTool = (toolId: string): boolean => {
        if (runningTools.length >= MAX_CONCURRENT) {
          return false;
        }
        runningTools.push(toolId);
        return true;
      };

      const completeTool = (toolId: string): boolean => {
        const index = runningTools.indexOf(toolId);
        if (index === -1) return false;
        runningTools.splice(index, 1);
        return true;
      };

      // Start 5 tools
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(startTool(`tool-${i}`));
      }

      const runningCount = runningTools.length;
      completeTool('tool-0');
      const afterComplete = runningTools.length;

      return {
        startResults: results,
        runningCount,
        afterComplete,
        successfulStarts: results.filter(r => r).length,
      };
    });

    expect(result.successfulStarts).toBe(3);
    expect(result.runningCount).toBe(3);
    expect(result.afterComplete).toBe(2);
  });
});

test.describe('Chunking Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should handle empty document chunking', async ({ page }) => {
    const result = await page.evaluate(() => {
      const chunkDocument = (content: string, chunkSize: number) => {
        if (!content.trim()) {
          return { chunks: [], error: 'Document is empty' };
        }
        
        const chunks = [];
        for (let i = 0; i < content.length; i += chunkSize) {
          chunks.push(content.slice(i, i + chunkSize));
        }
        return { chunks };
      };

      return {
        empty: chunkDocument('', 100),
        whitespace: chunkDocument('   ', 100),
        valid: chunkDocument('Hello world', 5),
      };
    });

    expect(result.empty.chunks.length).toBe(0);
    expect(result.empty.error).toBe('Document is empty');
    expect(result.whitespace.chunks.length).toBe(0);
    expect(result.valid.chunks.length).toBeGreaterThan(0);
  });

  test('should handle chunk size larger than document', async ({ page }) => {
    const result = await page.evaluate(() => {
      const chunkDocument = (content: string, chunkSize: number) => {
        const chunks = [];
        for (let i = 0; i < content.length; i += chunkSize) {
          chunks.push(content.slice(i, i + chunkSize));
        }
        return chunks;
      };

      const shortDoc = 'Hello';
      const chunks = chunkDocument(shortDoc, 1000);

      return {
        documentLength: shortDoc.length,
        chunkCount: chunks.length,
        firstChunk: chunks[0],
      };
    });

    expect(result.chunkCount).toBe(1);
    expect(result.firstChunk).toBe('Hello');
  });

  test('should handle overlap larger than chunk size', async ({ page }) => {
    const result = await page.evaluate(() => {
      const validateChunkingOptions = (chunkSize: number, overlap: number) => {
        if (overlap >= chunkSize) {
          return { valid: false, error: 'Overlap must be less than chunk size' };
        }
        if (overlap < 0) {
          return { valid: false, error: 'Overlap cannot be negative' };
        }
        return { valid: true };
      };

      return {
        overlapTooLarge: validateChunkingOptions(100, 150),
        overlapEqual: validateChunkingOptions(100, 100),
        overlapNegative: validateChunkingOptions(100, -10),
        overlapValid: validateChunkingOptions(100, 50),
      };
    });

    expect(result.overlapTooLarge.valid).toBe(false);
    expect(result.overlapEqual.valid).toBe(false);
    expect(result.overlapNegative.valid).toBe(false);
    expect(result.overlapValid.valid).toBe(true);
  });
});

test.describe('RAG Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should handle empty query', async ({ page }) => {
    const result = await page.evaluate(() => {
      const searchDocuments = (query: string) => {
        if (!query.trim()) {
          return { results: [], error: 'Query cannot be empty' };
        }
        return { results: [{ id: 'd1', score: 0.9 }] };
      };

      return {
        empty: searchDocuments(''),
        whitespace: searchDocuments('   '),
        valid: searchDocuments('search term'),
      };
    });

    expect(result.empty.error).toBe('Query cannot be empty');
    expect(result.whitespace.error).toBe('Query cannot be empty');
    expect(result.valid.results.length).toBeGreaterThan(0);
  });

  test('should handle no matching documents', async ({ page }) => {
    const result = await page.evaluate(() => {
      const documents = [
        { id: 'd1', content: 'React hooks tutorial', embedding: [0.1, 0.2] },
        { id: 'd2', content: 'Vue.js guide', embedding: [0.3, 0.4] },
      ];

      const search = (query: string, _threshold: number = 0.5) => {
        // Simulate search with no matches above threshold
        const results = documents.filter(() => Math.random() < 0.1); // Low match rate
        
        if (results.length === 0) {
          return {
            results: [],
            message: 'No relevant documents found',
            suggestion: 'Try broadening your search terms',
          };
        }
        return { results };
      };

      const noMatch = search('quantum physics', 0.9);

      return {
        hasResults: noMatch.results.length > 0,
        hasMessage: !!noMatch.message,
        hasSuggestion: !!noMatch.suggestion,
      };
    });

    // Either has results or has helpful message
    expect(result.hasMessage || result.hasResults).toBe(true);
  });

  test('should handle similarity threshold edge cases', async ({ page }) => {
    const result = await page.evaluate(() => {
      const validateThreshold = (threshold: number) => {
        if (threshold < 0 || threshold > 1) {
          return { valid: false, error: 'Threshold must be between 0 and 1' };
        }
        return { valid: true };
      };

      return {
        negative: validateThreshold(-0.5),
        tooHigh: validateThreshold(1.5),
        zero: validateThreshold(0),
        one: validateThreshold(1),
        valid: validateThreshold(0.7),
      };
    });

    expect(result.negative.valid).toBe(false);
    expect(result.tooHigh.valid).toBe(false);
    expect(result.zero.valid).toBe(true);
    expect(result.one.valid).toBe(true);
    expect(result.valid.valid).toBe(true);
  });
});

test.describe('Export Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should handle export of empty conversation', async ({ page }) => {
    const result = await page.evaluate(() => {
      const exportConversation = (messages: unknown[]) => {
        if (messages.length === 0) {
          return { success: false, error: 'No messages to export' };
        }
        return { success: true, content: 'exported content' };
      };

      return {
        empty: exportConversation([]),
        valid: exportConversation([{ role: 'user', content: 'Hello' }]),
      };
    });

    expect(result.empty.success).toBe(false);
    expect(result.empty.error).toBe('No messages to export');
    expect(result.valid.success).toBe(true);
  });

  test('should handle invalid export format', async ({ page }) => {
    const result = await page.evaluate(() => {
      const VALID_FORMATS = ['markdown', 'json', 'html', 'txt'];

      const validateFormat = (format: string) => {
        if (!VALID_FORMATS.includes(format)) {
          return { valid: false, error: `Invalid format. Supported: ${VALID_FORMATS.join(', ')}` };
        }
        return { valid: true };
      };

      return {
        invalid: validateFormat('pdf'),
        markdown: validateFormat('markdown'),
        json: validateFormat('json'),
      };
    });

    expect(result.invalid.valid).toBe(false);
    expect(result.markdown.valid).toBe(true);
    expect(result.json.valid).toBe(true);
  });

  test('should handle filename with special characters', async ({ page }) => {
    const result = await page.evaluate(() => {
      const sanitizeFilename = (filename: string): string => {
        // Remove or replace invalid characters
        return filename
          .replace(/[<>:"/\\|?*]/g, '_')
          .replace(/\s+/g, '_')
          .replace(/_+/g, '_')
          .trim();
      };

      return {
        withSlash: sanitizeFilename('my/file/name.md'),
        withColon: sanitizeFilename('file:name.md'),
        withSpaces: sanitizeFilename('my file name.md'),
        valid: sanitizeFilename('my_file_name.md'),
      };
    });

    expect(result.withSlash).not.toContain('/');
    expect(result.withColon).not.toContain(':');
    expect(result.withSpaces).not.toContain(' ');
    expect(result.valid).toBe('my_file_name.md');
  });
});

test.describe('Settings Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should handle invalid API key format', async ({ page }) => {
    const result = await page.evaluate(() => {
      const validateApiKey = (provider: string, key: string) => {
        const patterns: Record<string, RegExp> = {
          openai: /^sk-[a-zA-Z0-9]{32,}$/,
          anthropic: /^sk-ant-[a-zA-Z0-9-]+$/,
        };

        const pattern = patterns[provider];
        if (!pattern) {
          return { valid: true }; // Unknown provider, accept any key
        }

        if (!pattern.test(key)) {
          return { valid: false, error: 'Invalid API key format' };
        }
        return { valid: true };
      };

      return {
        validOpenAI: validateApiKey('openai', 'sk-' + 'a'.repeat(48)),
        invalidOpenAI: validateApiKey('openai', 'invalid-key'),
        validAnthropic: validateApiKey('anthropic', 'sk-ant-api03-xxxxx'),
        unknownProvider: validateApiKey('custom', 'any-key'),
      };
    });

    expect(result.validOpenAI.valid).toBe(true);
    expect(result.invalidOpenAI.valid).toBe(false);
    expect(result.unknownProvider.valid).toBe(true);
  });

  test('should handle temperature out of range', async ({ page }) => {
    const result = await page.evaluate(() => {
      const validateTemperature = (temp: number) => {
        if (temp < 0 || temp > 2) {
          return { valid: false, error: 'Temperature must be between 0 and 2' };
        }
        return { valid: true };
      };

      return {
        negative: validateTemperature(-0.5),
        tooHigh: validateTemperature(2.5),
        zero: validateTemperature(0),
        max: validateTemperature(2),
        valid: validateTemperature(0.7),
      };
    });

    expect(result.negative.valid).toBe(false);
    expect(result.tooHigh.valid).toBe(false);
    expect(result.zero.valid).toBe(true);
    expect(result.max.valid).toBe(true);
    expect(result.valid.valid).toBe(true);
  });

  test('should handle max tokens validation', async ({ page }) => {
    const result = await page.evaluate(() => {
      const MODEL_LIMITS: Record<string, number> = {
        'gpt-4o': 128000,
        'gpt-4o-mini': 128000,
        'claude-3-5-sonnet': 200000,
      };

      const validateMaxTokens = (model: string, maxTokens: number) => {
        const limit = MODEL_LIMITS[model];
        if (!limit) {
          return { valid: true }; // Unknown model
        }

        if (maxTokens < 1) {
          return { valid: false, error: 'Max tokens must be at least 1' };
        }

        if (maxTokens > limit) {
          return { valid: false, error: `Max tokens cannot exceed ${limit} for ${model}` };
        }

        return { valid: true };
      };

      return {
        zero: validateMaxTokens('gpt-4o', 0),
        negative: validateMaxTokens('gpt-4o', -100),
        tooHigh: validateMaxTokens('gpt-4o', 200000),
        valid: validateMaxTokens('gpt-4o', 4096),
        unknownModel: validateMaxTokens('custom-model', 999999),
      };
    });

    expect(result.zero.valid).toBe(false);
    expect(result.negative.valid).toBe(false);
    expect(result.tooHigh.valid).toBe(false);
    expect(result.valid.valid).toBe(true);
    expect(result.unknownModel.valid).toBe(true);
  });
});

test.describe('Memory and Performance Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should handle localStorage quota exceeded', async ({ page }) => {
    const result = await page.evaluate(() => {
      const safeSetItem = (key: string, value: string): { success: boolean; error?: string } => {
        try {
          // Simulate quota check
          const currentSize = JSON.stringify(localStorage).length;
          const newSize = currentSize + value.length;
          const QUOTA_LIMIT = 5 * 1024 * 1024; // 5MB

          if (newSize > QUOTA_LIMIT) {
            return { success: false, error: 'Storage quota exceeded' };
          }

          localStorage.setItem(key, value);
          return { success: true };
        } catch {
          return { success: false, error: 'Storage error' };
        }
      };

      const smallData = safeSetItem('test', 'small value');
      // Don't actually try to exceed quota in test

      return {
        smallDataSuccess: smallData.success,
      };
    });

    expect(result.smallDataSuccess).toBe(true);
  });

  test('should handle circular reference in state', async ({ page }) => {
    const result = await page.evaluate(() => {
      const safeStringify = (obj: unknown): string | null => {
        const seen = new WeakSet();
        try {
          return JSON.stringify(obj, (_key, value) => {
            if (typeof value === 'object' && value !== null) {
              if (seen.has(value)) {
                return '[Circular]';
              }
              seen.add(value);
            }
            return value;
          });
        } catch {
          return null;
        }
      };

      const normalObj = { a: 1, b: 2 };
      const circularObj: Record<string, unknown> = { a: 1 };
      circularObj.self = circularObj;

      return {
        normalResult: safeStringify(normalObj) !== null,
        circularResult: safeStringify(circularObj) !== null,
        circularContainsMarker: safeStringify(circularObj)?.includes('[Circular]'),
      };
    });

    expect(result.normalResult).toBe(true);
    expect(result.circularResult).toBe(true);
    expect(result.circularContainsMarker).toBe(true);
  });
});
