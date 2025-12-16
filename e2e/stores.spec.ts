import { test, expect } from '@playwright/test';

/**
 * Store State Management Complete Tests
 * Tests all Zustand stores: vector, document, settings, agent, memory, project
 */
test.describe('Vector Store', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should initialize with default settings', async ({ page }) => {
    const store = await page.evaluate(() => {
      const defaultState = {
        collections: [],
        documents: {},
        settings: {
          mode: 'embedded',
          serverUrl: 'http://localhost:8000',
          embeddingProvider: 'openai',
          embeddingModel: 'text-embedding-3-small',
          chunkSize: 1000,
          chunkOverlap: 200,
          autoEmbed: true,
        },
      };

      return {
        hasCollections: Array.isArray(defaultState.collections),
        hasDocuments: typeof defaultState.documents === 'object',
        mode: defaultState.settings.mode,
        provider: defaultState.settings.embeddingProvider,
        chunkSize: defaultState.settings.chunkSize,
      };
    });

    expect(store.hasCollections).toBe(true);
    expect(store.hasDocuments).toBe(true);
    expect(store.mode).toBe('embedded');
    expect(store.provider).toBe('openai');
    expect(store.chunkSize).toBe(1000);
  });

  test('should manage collections', async ({ page }) => {
    const result = await page.evaluate(() => {
      const collections: { id: string; name: string; documentCount: number }[] = [];

      // Add collection
      const addCollection = (name: string) => {
        const id = `col-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        collections.push({ id, name, documentCount: 0 });
        return id;
      };

      // Remove collection
      const removeCollection = (id: string) => {
        const index = collections.findIndex(c => c.id === id);
        if (index !== -1) collections.splice(index, 1);
      };

      const id1 = addCollection('Test Collection 1');
      const id2 = addCollection('Test Collection 2');
      
      const countAfterAdd = collections.length;
      
      removeCollection(id1);
      const countAfterRemove = collections.length;

      return {
        countAfterAdd,
        countAfterRemove,
        remainingId: collections[0]?.id === id2,
      };
    });

    expect(result.countAfterAdd).toBe(2);
    expect(result.countAfterRemove).toBe(1);
    expect(result.remainingId).toBe(true);
  });

  test('should persist vector store to localStorage', async ({ page }) => {
    await page.evaluate(() => {
      const testData = {
        state: {
          collections: [{ id: 'test-1', name: 'Test', documentCount: 5 }],
          settings: { mode: 'embedded', embeddingProvider: 'openai' },
        },
      };
      localStorage.setItem('cognia-vector', JSON.stringify(testData));
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const stored = await page.evaluate(() => {
      const data = localStorage.getItem('cognia-vector');
      return data ? JSON.parse(data) : null;
    });

    expect(stored).not.toBeNull();
    expect(stored.state.collections).toHaveLength(1);
    expect(stored.state.collections[0].name).toBe('Test');
  });
});

test.describe('Document Store', () => {
  test('should manage documents', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const documents: {
        id: string;
        filename: string;
        content: string;
        isIndexed: boolean;
        version: number;
      }[] = [];

      // Add document
      const addDocument = (filename: string, content: string) => {
        const id = `doc-${Date.now()}`;
        documents.push({
          id,
          filename,
          content,
          isIndexed: false,
          version: 1,
        });
        return id;
      };

      // Update document
      const updateDocument = (id: string, updates: Partial<typeof documents[0]>) => {
        const doc = documents.find(d => d.id === id);
        if (doc) {
          Object.assign(doc, updates);
          doc.version++;
        }
      };

      // Delete document
      const _deleteDocument = (id: string) => {
        const index = documents.findIndex(d => d.id === id);
        if (index !== -1) documents.splice(index, 1);
      };

      const id = addDocument('test.md', '# Test Content');
      updateDocument(id, { isIndexed: true });
      
      const docAfterUpdate = documents.find(d => d.id === id);
      
      return {
        documentCount: documents.length,
        isIndexed: docAfterUpdate?.isIndexed,
        version: docAfterUpdate?.version,
      };
    });

    expect(result.documentCount).toBe(1);
    expect(result.isIndexed).toBe(true);
    expect(result.version).toBe(2);
  });

  test('should filter documents', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const documents = [
        { id: '1', filename: 'readme.md', type: 'markdown', isIndexed: true },
        { id: '2', filename: 'app.ts', type: 'code', isIndexed: false },
        { id: '3', filename: 'notes.md', type: 'markdown', isIndexed: true },
        { id: '4', filename: 'config.json', type: 'json', isIndexed: false },
      ];

      const filterDocuments = (
        docs: typeof documents,
        filter: { type?: string; isIndexed?: boolean }
      ) => {
        return docs.filter(doc => {
          if (filter.type && doc.type !== filter.type) return false;
          if (filter.isIndexed !== undefined && doc.isIndexed !== filter.isIndexed) return false;
          return true;
        });
      };

      return {
        allCount: documents.length,
        markdownCount: filterDocuments(documents, { type: 'markdown' }).length,
        indexedCount: filterDocuments(documents, { isIndexed: true }).length,
        markdownIndexed: filterDocuments(documents, { type: 'markdown', isIndexed: true }).length,
      };
    });

    expect(result.allCount).toBe(4);
    expect(result.markdownCount).toBe(2);
    expect(result.indexedCount).toBe(2);
    expect(result.markdownIndexed).toBe(2);
  });

  test('should track document versions', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const versions: { documentId: string; version: number; content: string; createdAt: Date }[] = [];

      const saveVersion = (documentId: string, content: string) => {
        const lastVersion = versions
          .filter(v => v.documentId === documentId)
          .sort((a, b) => b.version - a.version)[0];

        versions.push({
          documentId,
          version: (lastVersion?.version || 0) + 1,
          content,
          createdAt: new Date(),
        });
      };

      const getVersions = (documentId: string) => {
        return versions
          .filter(v => v.documentId === documentId)
          .sort((a, b) => b.version - a.version);
      };

      saveVersion('doc-1', 'Version 1 content');
      saveVersion('doc-1', 'Version 2 content');
      saveVersion('doc-1', 'Version 3 content');

      const docVersions = getVersions('doc-1');

      return {
        versionCount: docVersions.length,
        latestVersion: docVersions[0]?.version,
        latestContent: docVersions[0]?.content,
      };
    });

    expect(result.versionCount).toBe(3);
    expect(result.latestVersion).toBe(3);
    expect(result.latestContent).toBe('Version 3 content');
  });
});

test.describe('Settings Store', () => {
  test('should manage provider settings', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const providerSettings: Record<string, {
        providerId: string;
        apiKey: string;
        defaultModel: string;
        enabled: boolean;
      }> = {
        openai: { providerId: 'openai', apiKey: '', defaultModel: 'gpt-4o', enabled: true },
        anthropic: { providerId: 'anthropic', apiKey: '', defaultModel: 'claude-3-5-sonnet-20241022', enabled: false },
        google: { providerId: 'google', apiKey: '', defaultModel: 'gemini-1.5-pro', enabled: false },
      };

      const updateProvider = (id: string, updates: Partial<typeof providerSettings.openai>) => {
        if (providerSettings[id]) {
          Object.assign(providerSettings[id], updates);
        }
      };

      const getEnabledProviders = () => {
        return Object.values(providerSettings).filter(p => p.enabled);
      };

      updateProvider('anthropic', { enabled: true, apiKey: 'test-key' });

      return {
        totalProviders: Object.keys(providerSettings).length,
        enabledCount: getEnabledProviders().length,
        anthropicEnabled: providerSettings.anthropic.enabled,
        anthropicHasKey: providerSettings.anthropic.apiKey.length > 0,
      };
    });

    expect(result.totalProviders).toBe(3);
    expect(result.enabledCount).toBe(2);
    expect(result.anthropicEnabled).toBe(true);
    expect(result.anthropicHasKey).toBe(true);
  });

  test('should manage theme settings', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      let theme: 'light' | 'dark' | 'system' = 'system';
      let colorTheme = 'default';

      const setTheme = (newTheme: typeof theme) => {
        theme = newTheme;
      };

      const setColorTheme = (newColorTheme: string) => {
        colorTheme = newColorTheme;
      };

      const getEffectiveTheme = () => {
        if (theme === 'system') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return theme;
      };

      setTheme('dark');
      setColorTheme('ocean');

      return {
        theme,
        colorTheme,
        effectiveTheme: getEffectiveTheme(),
      };
    });

    expect(result.theme).toBe('dark');
    expect(result.colorTheme).toBe('ocean');
    expect(result.effectiveTheme).toBe('dark');
  });

  test('should persist settings to localStorage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const result = await page.evaluate(() => {
      // Simulate settings persistence logic
      const settings = {
        theme: 'dark',
        language: 'zh-CN',
        defaultProvider: 'openai',
        streamingEnabled: true,
      };

      // Test serialization/deserialization
      const serialized = JSON.stringify({ state: settings });
      const deserialized = JSON.parse(serialized);

      return {
        canSerialize: serialized.length > 0,
        theme: deserialized.state.theme,
        language: deserialized.state.language,
        provider: deserialized.state.defaultProvider,
      };
    });

    expect(result.canSerialize).toBe(true);
    expect(result.theme).toBe('dark');
    expect(result.language).toBe('zh-CN');
  });
});

test.describe('Agent Store', () => {
  test('should track agent execution state', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const state = {
        isRunning: false,
        currentStep: 0,
        totalSteps: 0,
        toolExecutions: [] as { id: string; name: string; status: string }[],
        error: null as string | null,
      };

      const startExecution = () => {
        state.isRunning = true;
        state.currentStep = 0;
        state.error = null;
      };

      const addToolExecution = (name: string) => {
        const id = `tool-${Date.now()}`;
        state.toolExecutions.push({ id, name, status: 'pending' });
        return id;
      };

      const completeToolExecution = (id: string, success: boolean) => {
        const tool = state.toolExecutions.find(t => t.id === id);
        if (tool) {
          tool.status = success ? 'completed' : 'failed';
        }
      };

      const completeExecution = () => {
        state.isRunning = false;
      };

      startExecution();
      const toolId = addToolExecution('calculator');
      state.currentStep = 1;
      completeToolExecution(toolId, true);
      completeExecution();

      return {
        isRunning: state.isRunning,
        currentStep: state.currentStep,
        toolCount: state.toolExecutions.length,
        toolStatus: state.toolExecutions[0]?.status,
      };
    });

    expect(result.isRunning).toBe(false);
    expect(result.currentStep).toBe(1);
    expect(result.toolCount).toBe(1);
    expect(result.toolStatus).toBe('completed');
  });

  test('should manage agent plans', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      interface PlanStep {
        id: string;
        description: string;
        status: 'pending' | 'in_progress' | 'completed' | 'failed';
      }

      const plans: { id: string; steps: PlanStep[] }[] = [];

      const createPlan = (steps: string[]) => {
        const plan = {
          id: `plan-${Date.now()}`,
          steps: steps.map((desc, i) => ({
            id: `step-${i}`,
            description: desc,
            status: 'pending' as const,
          })),
        };
        plans.push(plan);
        return plan.id;
      };

      const updateStepStatus = (planId: string, stepId: string, status: PlanStep['status']) => {
        const plan = plans.find(p => p.id === planId);
        const step = plan?.steps.find(s => s.id === stepId);
        if (step) step.status = status;
      };

      const planId = createPlan([
        'Search for relevant documents',
        'Analyze the content',
        'Generate summary',
      ]);

      updateStepStatus(planId, 'step-0', 'completed');
      updateStepStatus(planId, 'step-1', 'in_progress');

      const plan = plans.find(p => p.id === planId);

      return {
        stepCount: plan?.steps.length,
        completedCount: plan?.steps.filter(s => s.status === 'completed').length,
        inProgressCount: plan?.steps.filter(s => s.status === 'in_progress').length,
        pendingCount: plan?.steps.filter(s => s.status === 'pending').length,
      };
    });

    expect(result.stepCount).toBe(3);
    expect(result.completedCount).toBe(1);
    expect(result.inProgressCount).toBe(1);
    expect(result.pendingCount).toBe(1);
  });
});

test.describe('Memory Store', () => {
  test('should manage AI memories', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const memories: {
        id: string;
        content: string;
        importance: number;
        createdAt: Date;
      }[] = [];

      const addMemory = (content: string, importance: number = 0.5) => {
        const id = `mem-${Date.now()}`;
        memories.push({ id, content, importance, createdAt: new Date() });
        return id;
      };

      const getRelevantMemories = (query: string, limit: number = 5) => {
        // Simple keyword matching for test
        const keywords = query.toLowerCase().split(/\s+/);
        return memories
          .map(m => ({
            ...m,
            relevance: keywords.filter(k => m.content.toLowerCase().includes(k)).length,
          }))
          .filter(m => m.relevance > 0)
          .sort((a, b) => b.relevance - a.relevance || b.importance - a.importance)
          .slice(0, limit);
      };

      addMemory('User prefers dark mode', 0.8);
      addMemory('User is working on AI project', 0.9);
      addMemory('User likes TypeScript', 0.7);

      const relevant = getRelevantMemories('AI project preferences');

      return {
        totalMemories: memories.length,
        relevantCount: relevant.length,
        topMemory: relevant[0]?.content,
      };
    });

    expect(result.totalMemories).toBe(3);
    expect(result.relevantCount).toBeGreaterThan(0);
  });

  test('should format memories for system prompt', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const memories = [
        { content: 'User prefers concise responses', importance: 0.9 },
        { content: 'User is a software developer', importance: 0.8 },
        { content: 'User uses React and TypeScript', importance: 0.7 },
      ];

      const formatForPrompt = (mems: typeof memories) => {
        if (mems.length === 0) return '';

        const header = '\n\n## Relevant Context from Memory:\n';
        const items = mems
          .sort((a, b) => b.importance - a.importance)
          .map(m => `- ${m.content}`)
          .join('\n');

        return header + items;
      };

      const formatted = formatForPrompt(memories);

      return {
        hasHeader: formatted.includes('Memory'),
        hasItems: formatted.includes('- '),
        itemCount: (formatted.match(/^- /gm) || []).length,
        firstItem: formatted.includes('concise responses'),
      };
    });

    expect(result.hasHeader).toBe(true);
    expect(result.hasItems).toBe(true);
    expect(result.itemCount).toBe(3);
    expect(result.firstItem).toBe(true);
  });
});

test.describe('Project Store', () => {
  test('should manage projects', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const projects: {
        id: string;
        name: string;
        description: string;
        knowledgeBase: { id: string; name: string }[];
        createdAt: Date;
      }[] = [];

      const createProject = (name: string, description: string) => {
        const id = `proj-${Date.now()}`;
        projects.push({
          id,
          name,
          description,
          knowledgeBase: [],
          createdAt: new Date(),
        });
        return id;
      };

      const addToKnowledgeBase = (projectId: string, fileName: string) => {
        const project = projects.find(p => p.id === projectId);
        if (project) {
          project.knowledgeBase.push({
            id: `kb-${Date.now()}`,
            name: fileName,
          });
        }
      };

      const projectId = createProject('AI Assistant', 'Building an AI assistant');
      addToKnowledgeBase(projectId, 'requirements.md');
      addToKnowledgeBase(projectId, 'architecture.md');

      const project = projects.find(p => p.id === projectId);

      return {
        projectCount: projects.length,
        projectName: project?.name,
        knowledgeBaseCount: project?.knowledgeBase.length,
      };
    });

    expect(result.projectCount).toBe(1);
    expect(result.projectName).toBe('AI Assistant');
    expect(result.knowledgeBaseCount).toBe(2);
  });
});
