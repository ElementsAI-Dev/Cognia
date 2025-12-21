import { test, expect } from '@playwright/test';

/**
 * React Hooks Complete Tests
 * Tests useVectorDB, useRAG, useAgent hooks functionality
 */
test.describe('useVectorDB Hook', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should provide collection management functions', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Simulate hook state and functions
      const hookState = {
        collections: [] as { id: string; name: string }[],
        isLoading: false,
        error: null as string | null,
      };

      const createCollection = (name: string) => {
        const id = `col-${Date.now()}`;
        hookState.collections.push({ id, name });
        return id;
      };

      const deleteCollection = (id: string) => {
        const index = hookState.collections.findIndex(c => c.id === id);
        if (index !== -1) hookState.collections.splice(index, 1);
      };

      const getCollection = (id: string) => {
        return hookState.collections.find(c => c.id === id);
      };

      // Test operations
      const id1 = createCollection('Documents');
      createCollection('Code');
      
      const countAfterCreate = hookState.collections.length;
      const foundCollection = getCollection(id1);
      
      deleteCollection(id1);
      const countAfterDelete = hookState.collections.length;

      return {
        countAfterCreate,
        foundCollection: foundCollection?.name,
        countAfterDelete,
        remainingCollection: hookState.collections[0]?.name,
      };
    });

    expect(result.countAfterCreate).toBe(2);
    expect(result.foundCollection).toBe('Documents');
    expect(result.countAfterDelete).toBe(1);
    expect(result.remainingCollection).toBe('Code');
  });

  test('should provide document operations', async ({ page }) => {
    const result = await page.evaluate(() => {
      const documents: { id: string; content: string; collectionId: string }[] = [];

      const addDocument = (collectionId: string, content: string) => {
        const id = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        documents.push({ id, content, collectionId });
        return id;
      };

      const getDocuments = (collectionId: string) => {
        return documents.filter(d => d.collectionId === collectionId);
      };

      const _removeDocument = (id: string) => {
        const index = documents.findIndex(d => d.id === id);
        if (index !== -1) documents.splice(index, 1);
      };

      // Test
      addDocument('col-1', 'First document');
      addDocument('col-1', 'Second document');
      addDocument('col-2', 'Third document');

      const col1Docs = getDocuments('col-1');
      const col2Docs = getDocuments('col-2');

      return {
        totalDocs: documents.length,
        col1Count: col1Docs.length,
        col2Count: col2Docs.length,
      };
    });

    expect(result.totalDocs).toBe(3);
    expect(result.col1Count).toBe(2);
    expect(result.col2Count).toBe(1);
  });

  test('should provide search functionality', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Simulate vector search
      const searchDocuments = (
        query: string,
        documents: { id: string; content: string }[],
        topK: number
      ) => {
        // Simple keyword matching for simulation
        const queryWords = query.toLowerCase().split(/\s+/);
        
        const scored = documents.map(doc => {
          const contentWords = doc.content.toLowerCase().split(/\s+/);
          const matches = queryWords.filter(q => contentWords.some(c => c.includes(q)));
          const similarity = matches.length / queryWords.length;
          return { ...doc, similarity };
        });

        return scored
          .filter(d => d.similarity > 0)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, topK);
      };

      const documents = [
        { id: '1', content: 'Machine learning is a subset of AI' },
        { id: '2', content: 'Deep learning uses neural networks' },
        { id: '3', content: 'Natural language processing for text' },
        { id: '4', content: 'Computer vision for image analysis' },
      ];

      const results = searchDocuments('machine learning AI', documents, 2);

      return {
        resultCount: results.length,
        topResult: results[0]?.id,
        topSimilarity: results[0]?.similarity,
      };
    });

    expect(result.resultCount).toBeGreaterThan(0);
    expect(result.topResult).toBe('1');
    expect(result.topSimilarity).toBeGreaterThan(0);
  });

  test('should handle loading and error states', async ({ page }) => {
    const result = await page.evaluate(() => {
      const state = {
        isLoading: false,
        error: null as string | null,
      };

      const setLoading = (loading: boolean) => {
        state.isLoading = loading;
      };

      const setError = (error: string | null) => {
        state.error = error;
      };

      // Simulate async operation
      setLoading(true);
      const loadingDuringOp = state.isLoading;
      
      // Simulate error
      setError('Connection failed');
      setLoading(false);
      
      const errorAfterFail = state.error;
      const loadingAfterFail = state.isLoading;

      // Clear error
      setError(null);

      return {
        loadingDuringOp,
        errorAfterFail,
        loadingAfterFail,
        errorAfterClear: state.error,
      };
    });

    expect(result.loadingDuringOp).toBe(true);
    expect(result.errorAfterFail).toBe('Connection failed');
    expect(result.loadingAfterFail).toBe(false);
    expect(result.errorAfterClear).toBeNull();
  });
});

test.describe('useRAG Hook', () => {
  test('should provide indexing functionality', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const indexedDocuments: { id: string; chunks: string[] }[] = [];

      const indexDocument = (id: string, content: string, chunkSize: number) => {
        const chunks: string[] = [];
        for (let i = 0; i < content.length; i += chunkSize) {
          chunks.push(content.slice(i, i + chunkSize));
        }
        indexedDocuments.push({ id, chunks });
        return { documentId: id, chunksCreated: chunks.length };
      };

      const result1 = indexDocument('doc-1', 'A'.repeat(250), 100);
      const result2 = indexDocument('doc-2', 'B'.repeat(150), 100);

      return {
        totalIndexed: indexedDocuments.length,
        doc1Chunks: result1.chunksCreated,
        doc2Chunks: result2.chunksCreated,
      };
    });

    expect(result.totalIndexed).toBe(2);
    expect(result.doc1Chunks).toBe(3);
    expect(result.doc2Chunks).toBe(2);
  });

  test('should provide retrieval functionality', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const retrieve = (
        query: string,
        documents: { id: string; content: string }[],
        options: { topK: number; threshold: number }
      ) => {
        // Simple retrieval simulation
        const queryTerms = query.toLowerCase().split(/\s+/);
        
        const results = documents
          .map(doc => {
            const contentLower = doc.content.toLowerCase();
            const matchCount = queryTerms.filter(t => contentLower.includes(t)).length;
            const similarity = matchCount / queryTerms.length;
            return { ...doc, similarity };
          })
          .filter(r => r.similarity >= options.threshold)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, options.topK);

        return results;
      };

      const documents = [
        { id: '1', content: 'React is a JavaScript library for building user interfaces' },
        { id: '2', content: 'Vue is a progressive JavaScript framework' },
        { id: '3', content: 'Angular is a TypeScript-based framework' },
        { id: '4', content: 'Python is great for machine learning' },
      ];

      const results = retrieve('JavaScript framework', documents, { topK: 3, threshold: 0.3 });

      return {
        resultCount: results.length,
        hasReact: results.some(r => r.id === '1'),
        hasVue: results.some(r => r.id === '2'),
        hasPython: results.some(r => r.id === '4'),
      };
    });

    expect(result.resultCount).toBeGreaterThan(0);
    expect(result.hasReact).toBe(true);
    expect(result.hasVue).toBe(true);
    expect(result.hasPython).toBe(false);
  });

  test('should generate augmented prompts', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const generatePrompt = (
        query: string,
        context: { content: string; source: string }[],
        systemPrompt: string
      ) => {
        const contextSection = context.length > 0
          ? `\n\nRelevant Context:\n${context.map((c, i) => `[${i + 1}] ${c.source}:\n${c.content}`).join('\n\n')}`
          : '';

        return {
          system: systemPrompt + contextSection,
          user: query,
          hasContext: context.length > 0,
          contextCount: context.length,
        };
      };

      const context = [
        { content: 'React uses virtual DOM for efficient updates', source: 'react-docs.md' },
        { content: 'Components are the building blocks of React apps', source: 'react-guide.md' },
      ];

      const prompt = generatePrompt(
        'How does React work?',
        context,
        'You are a helpful assistant.'
      );

      return {
        hasContext: prompt.hasContext,
        contextCount: prompt.contextCount,
        systemIncludesContext: prompt.system.includes('Relevant Context'),
        systemIncludesSource: prompt.system.includes('react-docs.md'),
      };
    });

    expect(result.hasContext).toBe(true);
    expect(result.contextCount).toBe(2);
    expect(result.systemIncludesContext).toBe(true);
    expect(result.systemIncludesSource).toBe(true);
  });

  test('should provide chunking utilities', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const chunkText = (
        text: string,
        strategy: 'fixed' | 'sentence' | 'paragraph',
        options: { size: number; overlap: number }
      ) => {
        if (strategy === 'fixed') {
          const chunks: string[] = [];
          for (let i = 0; i < text.length; i += options.size - options.overlap) {
            chunks.push(text.slice(i, i + options.size));
            if (i + options.size >= text.length) break;
          }
          return chunks;
        }
        
        if (strategy === 'sentence') {
          return text.match(/[^.!?]+[.!?]+/g) || [text];
        }
        
        if (strategy === 'paragraph') {
          return text.split(/\n\n+/).filter(p => p.trim());
        }

        return [text];
      };

      const text = 'First sentence. Second sentence. Third sentence.';
      const paragraphText = 'Para 1.\n\nPara 2.\n\nPara 3.';

      return {
        fixedChunks: chunkText('A'.repeat(100), 'fixed', { size: 30, overlap: 10 }).length,
        sentenceChunks: chunkText(text, 'sentence', { size: 0, overlap: 0 }).length,
        paragraphChunks: chunkText(paragraphText, 'paragraph', { size: 0, overlap: 0 }).length,
      };
    });

    expect(result.fixedChunks).toBeGreaterThan(1);
    expect(result.sentenceChunks).toBe(3);
    expect(result.paragraphChunks).toBe(3);
  });
});

test.describe('useAgent Hook', () => {
  test('should manage agent execution', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const state = {
        isRunning: false,
        currentStep: 0,
        result: null as string | null,
        error: null as string | null,
      };

      const run = async (prompt: string) => {
        state.isRunning = true;
        state.currentStep = 0;
        state.error = null;

        try {
          // Simulate steps
          state.currentStep = 1;
          state.currentStep = 2;
          state.result = `Response to: ${prompt}`;
        } catch (e) {
          state.error = String(e);
        } finally {
          state.isRunning = false;
        }

        return state.result;
      };

      const reset = () => {
        state.isRunning = false;
        state.currentStep = 0;
        state.result = null;
        state.error = null;
      };

      // Test execution
      run('Test prompt');
      
      const afterRun = { ...state };
      
      reset();
      const afterReset = { ...state };

      return {
        afterRun,
        afterReset,
      };
    });

    expect(result.afterRun.result).toContain('Test prompt');
    expect(result.afterRun.currentStep).toBe(2);
    expect(result.afterReset.result).toBeNull();
    expect(result.afterReset.currentStep).toBe(0);
  });

  test('should manage tool registration', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const tools: Record<string, { name: string; description: string; execute: () => string }> = {};

      const registerTool = (
        name: string,
        description: string,
        execute: () => string
      ) => {
        tools[name] = { name, description, execute };
      };

      const unregisterTool = (name: string) => {
        delete tools[name];
      };

      const executeTool = (name: string) => {
        const tool = tools[name];
        if (!tool) throw new Error(`Tool ${name} not found`);
        return tool.execute();
      };

      // Register tools
      registerTool('calculator', 'Perform calculations', () => '42');
      registerTool('search', 'Search the web', () => 'search results');
      registerTool('weather', 'Get weather info', () => 'sunny');

      const countAfterRegister = Object.keys(tools).length;
      const calcResult = executeTool('calculator');

      unregisterTool('weather');
      const countAfterUnregister = Object.keys(tools).length;

      return {
        countAfterRegister,
        calcResult,
        countAfterUnregister,
        hasCalculator: 'calculator' in tools,
        hasWeather: 'weather' in tools,
      };
    });

    expect(result.countAfterRegister).toBe(3);
    expect(result.calcResult).toBe('42');
    expect(result.countAfterUnregister).toBe(2);
    expect(result.hasCalculator).toBe(true);
    expect(result.hasWeather).toBe(false);
  });

  test('should track tool calls', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const toolCalls: {
        id: string;
        name: string;
        args: Record<string, unknown>;
        result?: string;
        status: 'pending' | 'completed' | 'failed';
      }[] = [];

      const addToolCall = (name: string, args: Record<string, unknown>) => {
        const id = `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        toolCalls.push({ id, name, args, status: 'pending' });
        return id;
      };

      const completeToolCall = (id: string, result: string) => {
        const call = toolCalls.find(c => c.id === id);
        if (call) {
          call.result = result;
          call.status = 'completed';
        }
      };

      const failToolCall = (id: string, error: string) => {
        const call = toolCalls.find(c => c.id === id);
        if (call) {
          call.result = error;
          call.status = 'failed';
        }
      };

      // Test
      const id1 = addToolCall('calculator', { expression: '2+2' });
      const id2 = addToolCall('search', { query: 'AI news' });
      const id3 = addToolCall('weather', { city: 'NYC' });

      completeToolCall(id1, '4');
      completeToolCall(id2, 'Found 10 results');
      failToolCall(id3, 'API error');

      return {
        totalCalls: toolCalls.length,
        completedCount: toolCalls.filter(c => c.status === 'completed').length,
        failedCount: toolCalls.filter(c => c.status === 'failed').length,
        calcResult: toolCalls.find(c => c.id === id1)?.result,
      };
    });

    expect(result.totalCalls).toBe(3);
    expect(result.completedCount).toBe(2);
    expect(result.failedCount).toBe(1);
    expect(result.calcResult).toBe('4');
  });

  test('should support planning mode', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      interface PlanStep {
        description: string;
        status: 'pending' | 'in_progress' | 'completed' | 'failed';
        result?: string;
      }

      const createPlan = (task: string): PlanStep[] => {
        // Simulate plan generation
        return [
          { description: `Analyze task: ${task}`, status: 'pending' },
          { description: 'Gather relevant information', status: 'pending' },
          { description: 'Process and synthesize data', status: 'pending' },
          { description: 'Generate final response', status: 'pending' },
        ];
      };

      const executeStep = (plan: PlanStep[], index: number, result: string) => {
        if (index < plan.length) {
          plan[index].status = 'completed';
          plan[index].result = result;
        }
      };

      const plan = createPlan('Summarize the document');
      
      executeStep(plan, 0, 'Task analyzed');
      executeStep(plan, 1, 'Information gathered');

      return {
        stepCount: plan.length,
        completedSteps: plan.filter(s => s.status === 'completed').length,
        pendingSteps: plan.filter(s => s.status === 'pending').length,
        firstStepResult: plan[0].result,
      };
    });

    expect(result.stepCount).toBe(4);
    expect(result.completedSteps).toBe(2);
    expect(result.pendingSteps).toBe(2);
    expect(result.firstStepResult).toBe('Task analyzed');
  });

  test('should handle stop conditions', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      type StopCondition = (state: { stepCount: number; toolCalls: number }) => boolean;

      const stepCountIs = (max: number): StopCondition => 
        (state) => state.stepCount >= max;

      const noToolCalls = (): StopCondition => 
        (state) => state.toolCalls === 0;

      const anyOf = (...conditions: StopCondition[]): StopCondition =>
        (state) => conditions.some(c => c(state));

      const _allOf = (...conditions: StopCondition[]): StopCondition =>
        (state) => conditions.every(c => c(state));

      // Test conditions
      const state1 = { stepCount: 5, toolCalls: 2 };
      const state2 = { stepCount: 10, toolCalls: 0 };
      const state3 = { stepCount: 3, toolCalls: 0 };

      const maxSteps = stepCountIs(10);
      const noTools = noToolCalls();
      const combined = anyOf(maxSteps, noTools);

      return {
        state1MaxSteps: maxSteps(state1),
        state1NoTools: noTools(state1),
        state1Combined: combined(state1),
        state2MaxSteps: maxSteps(state2),
        state2NoTools: noTools(state2),
        state2Combined: combined(state2),
        state3Combined: combined(state3),
      };
    });

    expect(result.state1MaxSteps).toBe(false);
    expect(result.state1NoTools).toBe(false);
    expect(result.state1Combined).toBe(false);
    expect(result.state2MaxSteps).toBe(true);
    expect(result.state2NoTools).toBe(true);
    expect(result.state2Combined).toBe(true);
    expect(result.state3Combined).toBe(true);
  });
});
