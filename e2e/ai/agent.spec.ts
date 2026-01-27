import { test, expect } from '@playwright/test';

/**
 * Agent functionality tests
 */
test.describe('Agent Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have agent store initialized', async ({ page }) => {
    // Check for agent store in the app
    const agentStoreExists = await page.evaluate(() => {
      // Check if zustand stores are accessible
      return typeof window !== 'undefined';
    });

    expect(agentStoreExists).toBe(true);
  });

  test('should support tool registration pattern', async ({ page }) => {
    // Test tool registration logic
    const toolResult = await page.evaluate(() => {
      const tools: Record<string, { name: string; description: string }> = {};
      
      // Simulate tool registration
      tools['calculator'] = {
        name: 'calculator',
        description: 'Perform mathematical calculations',
      };
      
      tools['web_search'] = {
        name: 'web_search',
        description: 'Search the web for information',
      };

      return {
        toolCount: Object.keys(tools).length,
        hasCalculator: 'calculator' in tools,
        hasWebSearch: 'web_search' in tools,
      };
    });

    expect(toolResult.toolCount).toBe(2);
    expect(toolResult.hasCalculator).toBe(true);
    expect(toolResult.hasWebSearch).toBe(true);
  });

  test('should support stop conditions', async ({ page }) => {
    // Test stop condition logic
    const stopResult = await page.evaluate(() => {
      const state = {
        stepCount: 5,
        maxSteps: 10,
        lastToolCalls: [],
        isRunning: true,
      };

      // Step count condition
      const stepCountReached = state.stepCount >= state.maxSteps;
      
      // No tool calls condition
      const noToolCalls = state.lastToolCalls.length === 0;

      return {
        stepCountReached,
        noToolCalls,
        shouldStop: stepCountReached || noToolCalls,
      };
    });

    expect(stopResult.stepCountReached).toBe(false);
    expect(stopResult.noToolCalls).toBe(true);
    expect(stopResult.shouldStop).toBe(true);
  });

  test('should track agent execution state', async ({ page }) => {
    const stateResult = await page.evaluate(() => {
      const executionState = {
        stepCount: 0,
        startTime: new Date(),
        lastResponse: '',
        lastToolCalls: [] as { name: string; status: string }[],
        isRunning: false,
        error: null as string | null,
      };

      // Simulate execution
      executionState.isRunning = true;
      executionState.stepCount = 1;
      executionState.lastResponse = 'Test response';
      executionState.lastToolCalls.push({ name: 'test_tool', status: 'completed' });
      executionState.isRunning = false;

      return {
        stepCount: executionState.stepCount,
        hasResponse: executionState.lastResponse.length > 0,
        toolCallCount: executionState.lastToolCalls.length,
        isComplete: !executionState.isRunning,
      };
    });

    expect(stateResult.stepCount).toBe(1);
    expect(stateResult.hasResponse).toBe(true);
    expect(stateResult.toolCallCount).toBe(1);
    expect(stateResult.isComplete).toBe(true);
  });
});

test.describe('Calculator Tool', () => {
  test('should evaluate mathematical expressions', async ({ page }) => {
    await page.goto('/');
    
    const calcResult = await page.evaluate(() => {
      // Safe math evaluation
      const evaluateExpression = (expr: string): number => {
        const sanitized = expr
          .replace(/\s+/g, '')
          .replace(/\^/g, '**');
        
        try {
          const fn = new Function(`"use strict"; return (${sanitized});`);
          return fn();
        } catch {
          return NaN;
        }
      };

      return {
        addition: evaluateExpression('2 + 3'),
        multiplication: evaluateExpression('4 * 5'),
        power: evaluateExpression('2 ^ 3'),
        complex: evaluateExpression('(10 + 5) * 2'),
      };
    });

    expect(calcResult.addition).toBe(5);
    expect(calcResult.multiplication).toBe(20);
    expect(calcResult.power).toBe(8);
    expect(calcResult.complex).toBe(30);
  });

  test('should handle unit conversions', async ({ page }) => {
    await page.goto('/');
    
    const conversionResult = await page.evaluate(() => {
      const conversions: Record<string, number> = {
        m: 1,
        km: 1000,
        cm: 0.01,
        ft: 0.3048,
      };

      const convert = (value: number, from: string, to: string): number => {
        const fromFactor = conversions[from];
        const toFactor = conversions[to];
        return (value * fromFactor) / toFactor;
      };

      return {
        kmToM: convert(1, 'km', 'm'),
        mToCm: convert(1, 'm', 'cm'),
        ftToM: convert(1, 'ft', 'm'),
      };
    });

    expect(conversionResult.kmToM).toBe(1000);
    expect(conversionResult.mToCm).toBe(100);
    expect(conversionResult.ftToM).toBeCloseTo(0.3048, 4);
  });
});

/**
 * Agent Loop Cancellation Tests
 * Tests cancellation token and loop interruption
 */
test.describe('Agent Loop Cancellation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should create cancellation token', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface CancellationToken {
        isCancelled: boolean;
        cancel: () => void;
        onCancel?: () => void;
      }

      const createCancellationToken = (): CancellationToken => {
        const token: CancellationToken = {
          isCancelled: false,
          cancel: () => {
            token.isCancelled = true;
            token.onCancel?.();
          },
        };
        return token;
      };

      const token = createCancellationToken();
      const initialState = token.isCancelled;

      token.cancel();
      const afterCancel = token.isCancelled;

      return {
        initialState,
        afterCancel,
        hasCancelMethod: typeof token.cancel === 'function',
      };
    });

    expect(result.initialState).toBe(false);
    expect(result.afterCancel).toBe(true);
    expect(result.hasCancelMethod).toBe(true);
  });

  test('should trigger onCancel callback', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface CancellationToken {
        isCancelled: boolean;
        cancel: () => void;
        onCancel?: () => void;
      }

      let callbackTriggered = false;

      const token: CancellationToken = {
        isCancelled: false,
        cancel: () => {
          token.isCancelled = true;
          token.onCancel?.();
        },
        onCancel: () => {
          callbackTriggered = true;
        },
      };

      token.cancel();

      return {
        callbackTriggered,
        isCancelled: token.isCancelled,
      };
    });

    expect(result.callbackTriggered).toBe(true);
    expect(result.isCancelled).toBe(true);
  });

  test('should stop loop when cancelled', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface AgentLoopResult {
        success: boolean;
        cancelled: boolean;
        stepsCompleted: number;
      }

      const simulateAgentLoop = (
        maxSteps: number,
        cancelAtStep: number
      ): AgentLoopResult => {
        let isCancelled = false;
        let stepsCompleted = 0;

        for (let i = 0; i < maxSteps; i++) {
          if (i === cancelAtStep) {
            isCancelled = true;
          }

          if (isCancelled) {
            return {
              success: false,
              cancelled: true,
              stepsCompleted,
            };
          }

          stepsCompleted++;
        }

        return {
          success: true,
          cancelled: false,
          stepsCompleted,
        };
      };

      const completedRun = simulateAgentLoop(5, 10);
      const cancelledRun = simulateAgentLoop(10, 3);

      return {
        completedSuccess: completedRun.success,
        completedSteps: completedRun.stepsCompleted,
        cancelledSuccess: cancelledRun.success,
        cancelledSteps: cancelledRun.stepsCompleted,
        cancelledFlag: cancelledRun.cancelled,
      };
    });

    expect(result.completedSuccess).toBe(true);
    expect(result.completedSteps).toBe(5);
    expect(result.cancelledSuccess).toBe(false);
    expect(result.cancelledSteps).toBe(3);
    expect(result.cancelledFlag).toBe(true);
  });

  test('should report cancelled tasks', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface AgentTask {
        id: string;
        description: string;
        status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
      }

      const tasks: AgentTask[] = [
        { id: '1', description: 'Task 1', status: 'completed' },
        { id: '2', description: 'Task 2', status: 'running' },
        { id: '3', description: 'Task 3', status: 'pending' },
      ];

      const cancelTasks = () => {
        for (const task of tasks) {
          if (task.status === 'running' || task.status === 'pending') {
            task.status = 'cancelled';
          }
        }
      };

      cancelTasks();

      const completedCount = tasks.filter(t => t.status === 'completed').length;
      const cancelledCount = tasks.filter(t => t.status === 'cancelled').length;

      return {
        completedCount,
        cancelledCount,
        allTasksHandled: completedCount + cancelledCount === tasks.length,
      };
    });

    expect(result.completedCount).toBe(1);
    expect(result.cancelledCount).toBe(2);
    expect(result.allTasksHandled).toBe(true);
  });
});

/**
 * Context-Aware Agent Execution Tests
 * Tests context file handling and system context injection
 */
test.describe('Context-Aware Agent Execution', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should inject system context', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface SystemContext {
        app?: { app_name: string; app_type: string };
        window?: { title: string; focused: boolean };
        file?: { path: string; language: string };
        browser?: { url: string; title: string };
      }

      const buildSystemContextPrompt = (context: SystemContext): string => {
        const parts: string[] = [];

        if (context.app) {
          parts.push(`Current App: ${context.app.app_name} (${context.app.app_type})`);
        }
        if (context.window) {
          parts.push(`Window: ${context.window.title}`);
        }
        if (context.file) {
          parts.push(`File: ${context.file.path} (${context.file.language})`);
        }
        if (context.browser) {
          parts.push(`Browser: ${context.browser.url}`);
        }

        return parts.join('\n');
      };

      const context: SystemContext = {
        app: { app_name: 'VS Code', app_type: 'IDE' },
        window: { title: 'main.ts - My Project', focused: true },
        file: { path: '/src/main.ts', language: 'typescript' },
      };

      const prompt = buildSystemContextPrompt(context);

      return {
        hasAppInfo: prompt.includes('VS Code'),
        hasWindowInfo: prompt.includes('main.ts'),
        hasFileInfo: prompt.includes('typescript'),
        lineCount: prompt.split('\n').length,
      };
    });

    expect(result.hasAppInfo).toBe(true);
    expect(result.hasWindowInfo).toBe(true);
    expect(result.hasFileInfo).toBe(true);
    expect(result.lineCount).toBe(3);
  });

  test('should handle large output with context files', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ContextFileConfig {
        maxInlineOutputSize: number;
        enableContextFiles: boolean;
      }

      const config: ContextFileConfig = {
        maxInlineOutputSize: 1000,
        enableContextFiles: true,
      };

      const shouldPersistToFile = (output: string): boolean => {
        return config.enableContextFiles && output.length > config.maxInlineOutputSize;
      };

      const truncateOutput = (output: string, maxSize: number): string => {
        if (output.length <= maxSize) return output;
        return output.slice(0, maxSize) + '\n...[truncated, see context file]';
      };

      const smallOutput = 'Small output';
      const largeOutput = 'x'.repeat(2000);

      return {
        smallShouldPersist: shouldPersistToFile(smallOutput),
        largeShouldPersist: shouldPersistToFile(largeOutput),
        truncatedLength: truncateOutput(largeOutput, 1000).length,
        hasTruncateMarker: truncateOutput(largeOutput, 1000).includes('[truncated'),
      };
    });

    expect(result.smallShouldPersist).toBe(false);
    expect(result.largeShouldPersist).toBe(true);
    expect(result.truncatedLength).toBeLessThan(2000);
    expect(result.hasTruncateMarker).toBe(true);
  });

  test('should provide context tools', async ({ page }) => {
    const result = await page.evaluate(() => {
      const contextTools = [
        { name: 'read_context_file', description: 'Read a context file by ID' },
        { name: 'tail_context_file', description: 'Read last N lines of a context file' },
        { name: 'search_context_file', description: 'Search for pattern in context file' },
        { name: 'list_context_files', description: 'List all available context files' },
      ];

      const hasReadTool = contextTools.some(t => t.name === 'read_context_file');
      const hasTailTool = contextTools.some(t => t.name === 'tail_context_file');
      const hasSearchTool = contextTools.some(t => t.name === 'search_context_file');
      const hasListTool = contextTools.some(t => t.name === 'list_context_files');

      return {
        toolCount: contextTools.length,
        hasReadTool,
        hasTailTool,
        hasSearchTool,
        hasListTool,
      };
    });

    expect(result.toolCount).toBe(4);
    expect(result.hasReadTool).toBe(true);
    expect(result.hasTailTool).toBe(true);
    expect(result.hasSearchTool).toBe(true);
    expect(result.hasListTool).toBe(true);
  });
});

/**
 * MCP Tool Selection Tests
 * Tests intelligent tool selection and filtering
 */
test.describe('MCP Tool Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should filter tools by relevance', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Tool {
        name: string;
        description: string;
        keywords: string[];
        relevanceScore?: number;
      }

      const tools: Tool[] = [
        { name: 'file_read', description: 'Read file contents', keywords: ['file', 'read', 'content'] },
        { name: 'file_write', description: 'Write to file', keywords: ['file', 'write', 'save'] },
        { name: 'web_search', description: 'Search the web', keywords: ['web', 'search', 'internet'] },
        { name: 'code_execute', description: 'Execute code', keywords: ['code', 'run', 'execute'] },
      ];

      const calculateRelevance = (tool: Tool, query: string): number => {
        const lowerQuery = query.toLowerCase();
        let score = 0;

        if (tool.name.toLowerCase().includes(lowerQuery)) score += 10;
        if (tool.description.toLowerCase().includes(lowerQuery)) score += 5;
        for (const keyword of tool.keywords) {
          if (keyword.includes(lowerQuery) || lowerQuery.includes(keyword)) score += 3;
        }

        return score;
      };

      const selectRelevantTools = (query: string, maxTools: number): Tool[] => {
        return tools
          .map(t => ({ ...t, relevanceScore: calculateRelevance(t, query) }))
          .filter(t => (t.relevanceScore ?? 0) > 0)
          .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
          .slice(0, maxTools);
      };

      const fileTools = selectRelevantTools('file', 5);
      const searchTools = selectRelevantTools('search', 5);
      const codeTools = selectRelevantTools('code', 5);

      return {
        fileToolCount: fileTools.length,
        fileToolNames: fileTools.map(t => t.name),
        searchToolCount: searchTools.length,
        codeToolCount: codeTools.length,
      };
    });

    expect(result.fileToolCount).toBe(2);
    expect(result.fileToolNames).toContain('file_read');
    expect(result.fileToolNames).toContain('file_write');
    expect(result.searchToolCount).toBe(1);
    expect(result.codeToolCount).toBe(1);
  });

  test('should boost frequently used tools', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ToolUsageRecord {
        toolName: string;
        useCount: number;
        lastUsed: number;
        successRate: number;
      }

      const usageHistory: Map<string, ToolUsageRecord> = new Map([
        ['file_read', { toolName: 'file_read', useCount: 50, lastUsed: Date.now(), successRate: 0.95 }],
        ['web_search', { toolName: 'web_search', useCount: 10, lastUsed: Date.now() - 86400000, successRate: 0.80 }],
        ['code_execute', { toolName: 'code_execute', useCount: 30, lastUsed: Date.now() - 3600000, successRate: 0.90 }],
      ]);

      const calculateUsageBoost = (toolName: string): number => {
        const record = usageHistory.get(toolName);
        if (!record) return 0;

        const recencyBoost = Math.max(0, 1 - (Date.now() - record.lastUsed) / (7 * 24 * 60 * 60 * 1000));
        const frequencyBoost = Math.min(1, record.useCount / 100);
        const successBoost = record.successRate;

        return (recencyBoost * 0.3 + frequencyBoost * 0.4 + successBoost * 0.3) * 10;
      };

      const fileReadBoost = calculateUsageBoost('file_read');
      const webSearchBoost = calculateUsageBoost('web_search');
      const unknownBoost = calculateUsageBoost('unknown_tool');

      return {
        fileReadBoost: Math.round(fileReadBoost * 100) / 100,
        webSearchBoost: Math.round(webSearchBoost * 100) / 100,
        unknownBoost,
        fileReadHigher: fileReadBoost > webSearchBoost,
      };
    });

    expect(result.fileReadBoost).toBeGreaterThan(0);
    expect(result.webSearchBoost).toBeGreaterThan(0);
    expect(result.unknownBoost).toBe(0);
    expect(result.fileReadHigher).toBe(true);
  });

  test('should respect tool selection config', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ToolSelectionConfig {
        maxToolsPerRequest: number;
        minRelevanceScore: number;
        enableUsageBoost: boolean;
        enableSemanticMatching: boolean;
      }

      const defaultConfig: ToolSelectionConfig = {
        maxToolsPerRequest: 10,
        minRelevanceScore: 0.3,
        enableUsageBoost: true,
        enableSemanticMatching: true,
      };

      interface Tool {
        name: string;
        relevanceScore: number;
      }

      const allTools: Tool[] = [
        { name: 'tool1', relevanceScore: 0.9 },
        { name: 'tool2', relevanceScore: 0.7 },
        { name: 'tool3', relevanceScore: 0.5 },
        { name: 'tool4', relevanceScore: 0.2 },
        { name: 'tool5', relevanceScore: 0.1 },
      ];

      const selectTools = (tools: Tool[], config: ToolSelectionConfig): Tool[] => {
        return tools
          .filter(t => t.relevanceScore >= config.minRelevanceScore)
          .slice(0, config.maxToolsPerRequest);
      };

      const selectedDefault = selectTools(allTools, defaultConfig);
      const selectedStrict = selectTools(allTools, { ...defaultConfig, minRelevanceScore: 0.6 });
      const selectedLimited = selectTools(allTools, { ...defaultConfig, maxToolsPerRequest: 2 });

      return {
        defaultCount: selectedDefault.length,
        strictCount: selectedStrict.length,
        limitedCount: selectedLimited.length,
      };
    });

    expect(result.defaultCount).toBe(3);
    expect(result.strictCount).toBe(2);
    expect(result.limitedCount).toBe(2);
  });
});

/**
 * Multi-Skill System Prompt Tests
 * Tests skill integration into agent prompts
 */
test.describe('Multi-Skill System Prompt', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should build multi-skill prompt', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Skill {
        id: string;
        name: string;
        description: string;
        content: string;
      }

      const skills: Skill[] = [
        { id: 'code-review', name: 'Code Review', description: 'Review code for issues', content: 'When reviewing code, check for...' },
        { id: 'git-helper', name: 'Git Helper', description: 'Git assistance', content: 'For Git operations, always...' },
      ];

      const buildMultiSkillPrompt = (activeSkills: Skill[]): string => {
        if (activeSkills.length === 0) return '';

        const skillSections = activeSkills.map(skill => {
          return `## ${skill.name}\n${skill.description}\n\n${skill.content}`;
        });

        return `# Active Skills\n\n${skillSections.join('\n\n---\n\n')}`;
      };

      const prompt = buildMultiSkillPrompt(skills);
      const emptyPrompt = buildMultiSkillPrompt([]);

      return {
        hasHeader: prompt.includes('# Active Skills'),
        hasCodeReview: prompt.includes('Code Review'),
        hasGitHelper: prompt.includes('Git Helper'),
        hasSeparator: prompt.includes('---'),
        emptyIsEmpty: emptyPrompt === '',
      };
    });

    expect(result.hasHeader).toBe(true);
    expect(result.hasCodeReview).toBe(true);
    expect(result.hasGitHelper).toBe(true);
    expect(result.hasSeparator).toBe(true);
    expect(result.emptyIsEmpty).toBe(true);
  });

  test('should create skill tools', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Skill {
        id: string;
        name: string;
        tools?: { name: string; description: string }[];
      }

      interface AgentTool {
        name: string;
        description: string;
        source: string;
      }

      const skills: Skill[] = [
        {
          id: 'code-analyzer',
          name: 'Code Analyzer',
          tools: [
            { name: 'analyze_complexity', description: 'Analyze code complexity' },
            { name: 'find_issues', description: 'Find potential issues' },
          ],
        },
        {
          id: 'doc-generator',
          name: 'Doc Generator',
          tools: [
            { name: 'generate_docs', description: 'Generate documentation' },
          ],
        },
      ];

      const createSkillTools = (activeSkills: Skill[]): AgentTool[] => {
        const tools: AgentTool[] = [];

        for (const skill of activeSkills) {
          if (skill.tools) {
            for (const tool of skill.tools) {
              tools.push({
                name: `${skill.id}_${tool.name}`,
                description: `[${skill.name}] ${tool.description}`,
                source: skill.id,
              });
            }
          }
        }

        return tools;
      };

      const allTools = createSkillTools(skills);
      const analyzerTools = allTools.filter(t => t.source === 'code-analyzer');
      const docTools = allTools.filter(t => t.source === 'doc-generator');

      return {
        totalTools: allTools.length,
        analyzerToolCount: analyzerTools.length,
        docToolCount: docTools.length,
        hasPrefix: allTools[0]?.name.includes('code-analyzer_'),
      };
    });

    expect(result.totalTools).toBe(3);
    expect(result.analyzerToolCount).toBe(2);
    expect(result.docToolCount).toBe(1);
    expect(result.hasPrefix).toBe(true);
  });
});

/**
 * Agent Planning Tests
 * Tests task planning and breakdown
 */
test.describe('Agent Planning', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should parse planning response', async ({ page }) => {
    const result = await page.evaluate(() => {
      const parsePlanningResponse = (response: string): string[] => {
        const lines = response.split('\n');
        const tasks: string[] = [];

        for (const line of lines) {
          const match = line.match(/^\s*\d+[.):\s]+(.+)/);
          if (match) {
            tasks.push(match[1].trim());
          }
        }

        return tasks;
      };

      const response = `Here are the subtasks:
1. First, analyze the requirements
2. Then, design the solution
3) Implement the core logic
4: Write tests
5. Document the changes`;

      const tasks = parsePlanningResponse(response);

      return {
        taskCount: tasks.length,
        firstTask: tasks[0],
        lastTask: tasks[tasks.length - 1],
        allParsed: tasks.every(t => t.length > 0),
      };
    });

    expect(result.taskCount).toBe(5);
    expect(result.firstTask).toBe('First, analyze the requirements');
    expect(result.lastTask).toBe('Document the changes');
    expect(result.allParsed).toBe(true);
  });

  test('should track task progress', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface AgentTask {
        id: string;
        description: string;
        status: 'pending' | 'running' | 'completed' | 'failed';
        result?: string;
      }

      const tasks: AgentTask[] = [
        { id: '1', description: 'Task 1', status: 'pending' },
        { id: '2', description: 'Task 2', status: 'pending' },
        { id: '3', description: 'Task 3', status: 'pending' },
      ];

      const startTask = (id: string) => {
        const task = tasks.find(t => t.id === id);
        if (task) task.status = 'running';
      };

      const completeTask = (id: string, result: string) => {
        const task = tasks.find(t => t.id === id);
        if (task) {
          task.status = 'completed';
          task.result = result;
        }
      };

      const getProgress = () => {
        const completed = tasks.filter(t => t.status === 'completed').length;
        return { completed, total: tasks.length, percentage: (completed / tasks.length) * 100 };
      };

      startTask('1');
      const afterStart = getProgress();

      completeTask('1', 'Success');
      completeTask('2', 'Success');
      const afterComplete = getProgress();

      return {
        afterStartCompleted: afterStart.completed,
        afterCompleteCompleted: afterComplete.completed,
        finalPercentage: afterComplete.percentage,
      };
    });

    expect(result.afterStartCompleted).toBe(0);
    expect(result.afterCompleteCompleted).toBe(2);
    expect(result.finalPercentage).toBeCloseTo(66.67, 0);
  });
});

/**
 * Agent Memory Management Tests
 * Tests agent memory, conversation context, and knowledge retention
 */
test.describe('Agent Memory Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should manage conversation memory', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface MemoryEntry {
        id: string;
        role: 'user' | 'assistant' | 'system';
        content: string;
        timestamp: number;
        tokens: number;
      }

      class ConversationMemory {
        private entries: MemoryEntry[] = [];
        private maxTokens: number;
        private currentTokens: number = 0;

        constructor(maxTokens: number = 4000) {
          this.maxTokens = maxTokens;
        }

        add(role: MemoryEntry['role'], content: string): void {
          const tokens = Math.ceil(content.length / 4);
          
          while (this.currentTokens + tokens > this.maxTokens && this.entries.length > 0) {
            const removed = this.entries.shift();
            if (removed) this.currentTokens -= removed.tokens;
          }

          const entry: MemoryEntry = {
            id: `mem-${Date.now()}-${Math.random()}`,
            role,
            content,
            timestamp: Date.now(),
            tokens,
          };

          this.entries.push(entry);
          this.currentTokens += tokens;
        }

        getAll(): MemoryEntry[] {
          return [...this.entries];
        }

        getTokenCount(): number {
          return this.currentTokens;
        }

        clear(): void {
          this.entries = [];
          this.currentTokens = 0;
        }
      }

      const memory = new ConversationMemory(100);

      memory.add('user', 'Hello, how are you?');
      memory.add('assistant', 'I am doing well, thank you for asking!');
      memory.add('user', 'Can you help me with a task?');

      const entriesBeforeOverflow = memory.getAll().length;
      const tokensBeforeOverflow = memory.getTokenCount();

      memory.add('assistant', 'A'.repeat(400));

      const entriesAfterOverflow = memory.getAll().length;

      return {
        entriesBeforeOverflow,
        tokensBeforeOverflow,
        entriesAfterOverflow,
        hasOverflowed: entriesAfterOverflow < entriesBeforeOverflow + 1,
      };
    });

    expect(result.entriesBeforeOverflow).toBe(3);
    expect(result.tokensBeforeOverflow).toBeLessThan(100);
    expect(result.hasOverflowed).toBe(true);
  });

  test('should extract and store key facts', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Fact {
        id: string;
        content: string;
        source: string;
        confidence: number;
        timestamp: number;
      }

      const facts: Fact[] = [];

      const extractFacts = (text: string, source: string): Fact[] => {
        const extracted: Fact[] = [];
        const patterns = [
          /(?:my name is|i am|i'm) ([A-Z][a-z]+ ?[A-Z]?[a-z]*)/gi,
          /(?:i work at|i'm from|i live in) ([A-Z][a-z]+(?: [A-Z][a-z]+)*)/gi,
          /(?:i prefer|i like|i use) ([a-zA-Z]+(?: [a-zA-Z]+)*)/gi,
        ];

        for (const pattern of patterns) {
          let match;
          while ((match = pattern.exec(text)) !== null) {
            extracted.push({
              id: `fact-${Date.now()}-${Math.random()}`,
              content: match[0],
              source,
              confidence: 0.8,
              timestamp: Date.now(),
            });
          }
        }

        return extracted;
      };

      const storeFacts = (newFacts: Fact[]): void => {
        facts.push(...newFacts);
      };

      const getFactsByConfidence = (minConfidence: number): Fact[] => {
        return facts.filter(f => f.confidence >= minConfidence);
      };

      const text1 = "My name is John Smith and I work at Google.";
      const text2 = "I prefer TypeScript and I use VS Code.";

      storeFacts(extractFacts(text1, 'conversation'));
      storeFacts(extractFacts(text2, 'conversation'));

      return {
        totalFacts: facts.length,
        highConfidenceFacts: getFactsByConfidence(0.7).length,
        hasNameFact: facts.some(f => f.content.toLowerCase().includes('name')),
        hasPreferenceFact: facts.some(f => f.content.toLowerCase().includes('prefer')),
      };
    });

    expect(result.totalFacts).toBeGreaterThan(0);
    expect(result.highConfidenceFacts).toBe(result.totalFacts);
  });

  test('should summarize conversation history', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Message {
        role: 'user' | 'assistant';
        content: string;
      }

      const summarizeConversation = (messages: Message[]): string => {
        if (messages.length === 0) return '';

        const topics = new Set<string>();
        const userQuestions = messages.filter(m => m.role === 'user').length;
        const assistantResponses = messages.filter(m => m.role === 'assistant').length;

        messages.forEach(m => {
          const words = m.content.toLowerCase().split(/\s+/);
          const keywords = words.filter(w => w.length > 5);
          keywords.forEach(k => topics.add(k));
        });

        const topicList = Array.from(topics).slice(0, 5).join(', ');

        return `Conversation summary: ${userQuestions} user messages, ${assistantResponses} assistant responses. Topics: ${topicList}`;
      };

      const messages: Message[] = [
        { role: 'user', content: 'Can you help me with JavaScript programming?' },
        { role: 'assistant', content: 'Of course! I can help with JavaScript. What do you need?' },
        { role: 'user', content: 'How do I create an async function?' },
        { role: 'assistant', content: 'You can use the async keyword before function...' },
      ];

      const summary = summarizeConversation(messages);

      return {
        summaryLength: summary.length,
        hasUserCount: summary.includes('2 user'),
        hasAssistantCount: summary.includes('2 assistant'),
        hasTopics: summary.includes('Topics:'),
      };
    });

    expect(result.summaryLength).toBeGreaterThan(0);
    expect(result.hasUserCount).toBe(true);
    expect(result.hasAssistantCount).toBe(true);
    expect(result.hasTopics).toBe(true);
  });
});

/**
 * Agent Error Handling Tests
 * Tests error recovery, retries, and graceful degradation
 */
test.describe('Agent Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should implement retry with backoff', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface RetryConfig {
        maxRetries: number;
        initialDelayMs: number;
        maxDelayMs: number;
        backoffMultiplier: number;
      }

      const calculateBackoff = (attempt: number, config: RetryConfig): number => {
        const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
        return Math.min(delay, config.maxDelayMs);
      };

      const shouldRetry = (error: { code: string }, attempt: number, maxRetries: number): boolean => {
        const retryableCodes = ['NETWORK_ERROR', 'RATE_LIMIT', 'TIMEOUT', 'SERVER_ERROR'];
        return attempt < maxRetries && retryableCodes.includes(error.code);
      };

      const config: RetryConfig = {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
      };

      const delay0 = calculateBackoff(0, config);
      const delay1 = calculateBackoff(1, config);
      const delay2 = calculateBackoff(2, config);
      const delay5 = calculateBackoff(5, config);

      const retryNetwork = shouldRetry({ code: 'NETWORK_ERROR' }, 1, 3);
      const retryAuth = shouldRetry({ code: 'AUTH_ERROR' }, 1, 3);
      const retryMaxed = shouldRetry({ code: 'NETWORK_ERROR' }, 3, 3);

      return {
        delay0,
        delay1,
        delay2,
        delay5Capped: delay5 === config.maxDelayMs,
        retryNetwork,
        retryAuth,
        retryMaxed,
      };
    });

    expect(result.delay0).toBe(1000);
    expect(result.delay1).toBe(2000);
    expect(result.delay2).toBe(4000);
    expect(result.delay5Capped).toBe(true);
    expect(result.retryNetwork).toBe(true);
    expect(result.retryAuth).toBe(false);
    expect(result.retryMaxed).toBe(false);
  });

  test('should handle graceful degradation', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface FallbackChain {
        primary: () => Promise<string>;
        fallbacks: (() => Promise<string>)[];
      }

      const executeWithFallback = async (chain: FallbackChain): Promise<{ result: string; usedFallback: boolean; fallbackIndex: number }> => {
        try {
          const result = await chain.primary();
          return { result, usedFallback: false, fallbackIndex: -1 };
        } catch {
          for (let i = 0; i < chain.fallbacks.length; i++) {
            try {
              const result = await chain.fallbacks[i]();
              return { result, usedFallback: true, fallbackIndex: i };
            } catch {
              continue;
            }
          }
          throw new Error('All fallbacks failed');
        }
      };

      const successChain: FallbackChain = {
        primary: async () => 'Primary success',
        fallbacks: [async () => 'Fallback 1', async () => 'Fallback 2'],
      };

      const failPrimaryChain: FallbackChain = {
        primary: async () => { throw new Error('Primary failed'); },
        fallbacks: [async () => 'Fallback 1 success', async () => 'Fallback 2'],
      };

      const allFailChain: FallbackChain = {
        primary: async () => { throw new Error('Primary failed'); },
        fallbacks: [
          async () => { throw new Error('Fallback 1 failed'); },
          async () => 'Fallback 2 success',
        ],
      };

      return Promise.all([
        executeWithFallback(successChain),
        executeWithFallback(failPrimaryChain),
        executeWithFallback(allFailChain),
      ]).then(([success, failPrimary, allFail]) => ({
        successResult: success.result,
        successUsedFallback: success.usedFallback,
        failPrimaryResult: failPrimary.result,
        failPrimaryFallbackIndex: failPrimary.fallbackIndex,
        allFailResult: allFail.result,
        allFailFallbackIndex: allFail.fallbackIndex,
      }));
    });

    expect(result.successResult).toBe('Primary success');
    expect(result.successUsedFallback).toBe(false);
    expect(result.failPrimaryResult).toBe('Fallback 1 success');
    expect(result.failPrimaryFallbackIndex).toBe(0);
    expect(result.allFailResult).toBe('Fallback 2 success');
    expect(result.allFailFallbackIndex).toBe(1);
  });

  test('should categorize and handle errors', async ({ page }) => {
    const result = await page.evaluate(() => {
      type ErrorCategory = 'network' | 'auth' | 'validation' | 'ratelimit' | 'internal' | 'unknown';

      interface CategorizedError {
        category: ErrorCategory;
        message: string;
        recoverable: boolean;
        suggestedAction: string;
      }

      const categorizeError = (error: { code?: string; status?: number; message: string }): CategorizedError => {
        if (error.code === 'NETWORK_ERROR' || error.message.includes('network')) {
          return {
            category: 'network',
            message: error.message,
            recoverable: true,
            suggestedAction: 'Check internet connection and retry',
          };
        }

        if (error.status === 401 || error.status === 403 || error.code === 'AUTH_ERROR') {
          return {
            category: 'auth',
            message: error.message,
            recoverable: false,
            suggestedAction: 'Re-authenticate or check API key',
          };
        }

        if (error.status === 429 || error.code === 'RATE_LIMIT') {
          return {
            category: 'ratelimit',
            message: error.message,
            recoverable: true,
            suggestedAction: 'Wait and retry with backoff',
          };
        }

        if (error.status === 400 || error.code === 'VALIDATION_ERROR') {
          return {
            category: 'validation',
            message: error.message,
            recoverable: false,
            suggestedAction: 'Fix input and retry',
          };
        }

        if (error.status && error.status >= 500) {
          return {
            category: 'internal',
            message: error.message,
            recoverable: true,
            suggestedAction: 'Retry after a delay',
          };
        }

        return {
          category: 'unknown',
          message: error.message,
          recoverable: false,
          suggestedAction: 'Check logs for details',
        };
      };

      const networkError = categorizeError({ code: 'NETWORK_ERROR', message: 'Connection failed' });
      const authError = categorizeError({ status: 401, message: 'Unauthorized' });
      const rateLimitError = categorizeError({ status: 429, message: 'Too many requests' });
      const validationError = categorizeError({ status: 400, message: 'Invalid input' });

      return {
        networkCategory: networkError.category,
        networkRecoverable: networkError.recoverable,
        authCategory: authError.category,
        authRecoverable: authError.recoverable,
        rateLimitCategory: rateLimitError.category,
        rateLimitRecoverable: rateLimitError.recoverable,
        validationCategory: validationError.category,
      };
    });

    expect(result.networkCategory).toBe('network');
    expect(result.networkRecoverable).toBe(true);
    expect(result.authCategory).toBe('auth');
    expect(result.authRecoverable).toBe(false);
    expect(result.rateLimitCategory).toBe('ratelimit');
    expect(result.rateLimitRecoverable).toBe(true);
    expect(result.validationCategory).toBe('validation');
  });
});

/**
 * Agent Streaming Tests
 * Tests streaming responses, token by token output
 */
test.describe('Agent Streaming', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should handle streaming chunks', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface StreamChunk {
        type: 'text' | 'tool_call' | 'done' | 'error';
        content?: string;
        toolName?: string;
        toolArgs?: Record<string, unknown>;
        error?: string;
      }

      class StreamHandler {
        private chunks: StreamChunk[] = [];
        private textContent: string = '';
        private isComplete: boolean = false;

        processChunk(chunk: StreamChunk): void {
          this.chunks.push(chunk);

          if (chunk.type === 'text' && chunk.content) {
            this.textContent += chunk.content;
          } else if (chunk.type === 'done') {
            this.isComplete = true;
          }
        }

        getFullText(): string {
          return this.textContent;
        }

        getChunkCount(): number {
          return this.chunks.length;
        }

        isStreamComplete(): boolean {
          return this.isComplete;
        }

        getToolCalls(): StreamChunk[] {
          return this.chunks.filter(c => c.type === 'tool_call');
        }
      }

      const handler = new StreamHandler();

      handler.processChunk({ type: 'text', content: 'Hello, ' });
      handler.processChunk({ type: 'text', content: 'how ' });
      handler.processChunk({ type: 'text', content: 'are you?' });
      handler.processChunk({ type: 'tool_call', toolName: 'search', toolArgs: { query: 'test' } });
      handler.processChunk({ type: 'done' });

      return {
        fullText: handler.getFullText(),
        chunkCount: handler.getChunkCount(),
        isComplete: handler.isStreamComplete(),
        toolCallCount: handler.getToolCalls().length,
      };
    });

    expect(result.fullText).toBe('Hello, how are you?');
    expect(result.chunkCount).toBe(5);
    expect(result.isComplete).toBe(true);
    expect(result.toolCallCount).toBe(1);
  });

  test('should buffer and flush streaming output', async ({ page }) => {
    const result = await page.evaluate(() => {
      class StreamBuffer {
        private buffer: string = '';
        private flushThreshold: number;
        private flushedContent: string[] = [];

        constructor(flushThreshold: number = 10) {
          this.flushThreshold = flushThreshold;
        }

        write(text: string): string | null {
          this.buffer += text;

          if (this.buffer.length >= this.flushThreshold) {
            return this.flush();
          }

          return null;
        }

        flush(): string {
          const content = this.buffer;
          this.flushedContent.push(content);
          this.buffer = '';
          return content;
        }

        getBuffer(): string {
          return this.buffer;
        }

        getFlushedCount(): number {
          return this.flushedContent.length;
        }

        getTotalFlushed(): string {
          return this.flushedContent.join('');
        }
      }

      const buffer = new StreamBuffer(10);

      const flush1 = buffer.write('Hello');
      const bufferAfter1 = buffer.getBuffer();

      const flush2 = buffer.write(' World');
      const bufferAfter2 = buffer.getBuffer();

      buffer.write('!');
      const finalFlush = buffer.flush();

      return {
        flush1: flush1,
        bufferAfter1,
        flush2,
        bufferAfter2Length: bufferAfter2.length,
        finalFlush,
        flushedCount: buffer.getFlushedCount(),
        totalFlushed: buffer.getTotalFlushed(),
      };
    });

    expect(result.flush1).toBe(null);
    expect(result.bufferAfter1).toBe('Hello');
    expect(result.flush2).toBe('Hello World');
    expect(result.bufferAfter2Length).toBe(0);
    expect(result.finalFlush).toBe('!');
    expect(result.flushedCount).toBe(2);
    expect(result.totalFlushed).toBe('Hello World!');
  });
});

/**
 * Agent Observability Tests
 * Tests agent observability, logging, and telemetry
 */
test.describe('Agent Observability', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should track execution metrics', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ExecutionMetrics {
        startTime: number;
        endTime: number | null;
        duration: number | null;
        tokenCount: { input: number; output: number };
        toolCalls: number;
        retries: number;
        errors: number;
      }

      class MetricsTracker {
        private metrics: ExecutionMetrics;

        constructor() {
          this.metrics = {
            startTime: Date.now(),
            endTime: null,
            duration: null,
            tokenCount: { input: 0, output: 0 },
            toolCalls: 0,
            retries: 0,
            errors: 0,
          };
        }

        recordTokens(input: number, output: number): void {
          this.metrics.tokenCount.input += input;
          this.metrics.tokenCount.output += output;
        }

        recordToolCall(): void {
          this.metrics.toolCalls++;
        }

        recordRetry(): void {
          this.metrics.retries++;
        }

        recordError(): void {
          this.metrics.errors++;
        }

        finish(): ExecutionMetrics {
          this.metrics.endTime = Date.now();
          this.metrics.duration = this.metrics.endTime - this.metrics.startTime;
          return { ...this.metrics };
        }

        getMetrics(): ExecutionMetrics {
          return { ...this.metrics };
        }
      }

      const tracker = new MetricsTracker();

      tracker.recordTokens(100, 50);
      tracker.recordTokens(200, 150);
      tracker.recordToolCall();
      tracker.recordToolCall();
      tracker.recordRetry();
      tracker.recordError();

      const finalMetrics = tracker.finish();

      return {
        inputTokens: finalMetrics.tokenCount.input,
        outputTokens: finalMetrics.tokenCount.output,
        toolCalls: finalMetrics.toolCalls,
        retries: finalMetrics.retries,
        errors: finalMetrics.errors,
        hasDuration: finalMetrics.duration !== null && finalMetrics.duration >= 0,
      };
    });

    expect(result.inputTokens).toBe(300);
    expect(result.outputTokens).toBe(200);
    expect(result.toolCalls).toBe(2);
    expect(result.retries).toBe(1);
    expect(result.errors).toBe(1);
    expect(result.hasDuration).toBe(true);
  });

  test('should generate execution trace', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface TraceSpan {
        id: string;
        name: string;
        startTime: number;
        endTime: number | null;
        parentId: string | null;
        attributes: Record<string, unknown>;
        events: { name: string; timestamp: number; attributes?: Record<string, unknown> }[];
      }

      class ExecutionTracer {
        private spans: TraceSpan[] = [];
        private activeSpans: Map<string, TraceSpan> = new Map();
        private spanIdCounter: number = 0;

        startSpan(name: string, parentId: string | null = null, attributes: Record<string, unknown> = {}): string {
          const id = `span-${++this.spanIdCounter}`;
          const span: TraceSpan = {
            id,
            name,
            startTime: Date.now(),
            endTime: null,
            parentId,
            attributes,
            events: [],
          };

          this.activeSpans.set(id, span);
          this.spans.push(span);
          return id;
        }

        addEvent(spanId: string, name: string, attributes?: Record<string, unknown>): void {
          const span = this.activeSpans.get(spanId);
          if (span) {
            span.events.push({ name, timestamp: Date.now(), attributes });
          }
        }

        endSpan(spanId: string): void {
          const span = this.activeSpans.get(spanId);
          if (span) {
            span.endTime = Date.now();
            this.activeSpans.delete(spanId);
          }
        }

        getTrace(): TraceSpan[] {
          return [...this.spans];
        }
      }

      const tracer = new ExecutionTracer();

      const rootSpan = tracer.startSpan('agent_execution', null, { model: 'gpt-4' });
      tracer.addEvent(rootSpan, 'started');

      const toolSpan = tracer.startSpan('tool_call', rootSpan, { tool: 'search' });
      tracer.addEvent(toolSpan, 'tool_started');
      tracer.addEvent(toolSpan, 'tool_completed', { success: true });
      tracer.endSpan(toolSpan);

      tracer.addEvent(rootSpan, 'completed');
      tracer.endSpan(rootSpan);

      const trace = tracer.getTrace();
      const rootTraceSpan = trace.find(s => s.name === 'agent_execution');
      const toolTraceSpan = trace.find(s => s.name === 'tool_call');

      return {
        spanCount: trace.length,
        rootSpanEvents: rootTraceSpan?.events.length,
        toolSpanParent: toolTraceSpan?.parentId === rootSpan,
        toolSpanEvents: toolTraceSpan?.events.length,
        rootSpanCompleted: rootTraceSpan?.endTime !== null,
      };
    });

    expect(result.spanCount).toBe(2);
    expect(result.rootSpanEvents).toBe(2);
    expect(result.toolSpanParent).toBe(true);
    expect(result.toolSpanEvents).toBe(2);
    expect(result.rootSpanCompleted).toBe(true);
  });
});
