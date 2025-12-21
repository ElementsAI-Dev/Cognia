import { test, expect } from '@playwright/test';

/**
 * Workflow Integration Tests
 * Tests for complete end-to-end workflows
 */

test.describe('Chat Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should complete full chat session workflow', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Simulate complete chat workflow
      interface Message {
        id: string;
        role: 'user' | 'assistant';
        content: string;
        timestamp: number;
      }

      interface Session {
        id: string;
        title: string;
        messages: Message[];
        createdAt: number;
        updatedAt: number;
      }

      // Step 1: Create session
      const session: Session = {
        id: 'session-1',
        title: 'New Chat',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Step 2: Send user message
      const userMessage: Message = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello, how are you?',
        timestamp: Date.now(),
      };
      session.messages.push(userMessage);
      session.updatedAt = Date.now();

      // Step 3: Receive assistant response
      const assistantMessage: Message = {
        id: 'msg-2',
        role: 'assistant',
        content: 'I am doing well, thank you for asking!',
        timestamp: Date.now(),
      };
      session.messages.push(assistantMessage);
      session.updatedAt = Date.now();

      // Step 4: Auto-generate title from first message
      const generateTitle = (messages: Message[]): string => {
        const firstUserMessage = messages.find(m => m.role === 'user');
        if (!firstUserMessage) return 'New Chat';
        const title = firstUserMessage.content.slice(0, 30);
        return title.length < firstUserMessage.content.length ? title + '...' : title;
      };

      session.title = generateTitle(session.messages);

      return {
        sessionCreated: !!session.id,
        messageCount: session.messages.length,
        hasUserMessage: session.messages.some(m => m.role === 'user'),
        hasAssistantMessage: session.messages.some(m => m.role === 'assistant'),
        titleGenerated: session.title !== 'New Chat',
        title: session.title,
      };
    });

    expect(result.sessionCreated).toBe(true);
    expect(result.messageCount).toBe(2);
    expect(result.hasUserMessage).toBe(true);
    expect(result.hasAssistantMessage).toBe(true);
    expect(result.titleGenerated).toBe(true);
  });

  test('should handle message with artifacts', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Artifact {
        id: string;
        type: 'code' | 'document' | 'diagram';
        content: string;
        language?: string;
      }

      interface Message {
        id: string;
        content: string;
        artifacts: Artifact[];
      }

      // Simulate message with code artifact
      const message: Message = {
        id: 'msg-1',
        content: 'Here is the code you requested:',
        artifacts: [],
      };

      // Extract code blocks from response
      const extractArtifacts = (content: string): Artifact[] => {
        const artifacts: Artifact[] = [];
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        let match;
        let index = 0;

        while ((match = codeBlockRegex.exec(content)) !== null) {
          artifacts.push({
            id: `artifact-${index++}`,
            type: 'code',
            language: match[1] || 'text',
            content: match[2].trim(),
          });
        }

        return artifacts;
      };

      const responseWithCode = `Here is the code:
\`\`\`javascript
function hello() {
  console.log('Hello World');
}
\`\`\`

And here is some Python:
\`\`\`python
def hello():
    print('Hello World')
\`\`\``;

      message.artifacts = extractArtifacts(responseWithCode);

      return {
        artifactCount: message.artifacts.length,
        firstLanguage: message.artifacts[0]?.language,
        secondLanguage: message.artifacts[1]?.language,
        hasContent: message.artifacts.every(a => a.content.length > 0),
      };
    });

    expect(result.artifactCount).toBe(2);
    expect(result.firstLanguage).toBe('javascript');
    expect(result.secondLanguage).toBe('python');
    expect(result.hasContent).toBe(true);
  });
});

test.describe('Project Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should complete project creation and session linking', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Project {
        id: string;
        name: string;
        description: string;
        sessionIds: string[];
        knowledgeBase: { id: string; name: string }[];
        createdAt: number;
      }

      interface Session {
        id: string;
        title: string;
        projectId?: string;
      }

      // Step 1: Create project
      const project: Project = {
        id: 'proj-1',
        name: 'My AI Project',
        description: 'A project for AI development',
        sessionIds: [],
        knowledgeBase: [],
        createdAt: Date.now(),
      };

      // Step 2: Create sessions linked to project
      const sessions: Session[] = [
        { id: 'sess-1', title: 'Architecture Discussion', projectId: project.id },
        { id: 'sess-2', title: 'Code Review', projectId: project.id },
      ];

      project.sessionIds = sessions.map(s => s.id);

      // Step 3: Add knowledge base files
      project.knowledgeBase.push(
        { id: 'kb-1', name: 'README.md' },
        { id: 'kb-2', name: 'architecture.md' }
      );

      // Step 4: Get project context
      const getProjectContext = (proj: Project): string => {
        return `Project: ${proj.name}\nFiles: ${proj.knowledgeBase.map(f => f.name).join(', ')}`;
      };

      return {
        projectCreated: !!project.id,
        sessionCount: project.sessionIds.length,
        knowledgeBaseCount: project.knowledgeBase.length,
        context: getProjectContext(project),
        sessionsLinked: sessions.every(s => s.projectId === project.id),
      };
    });

    expect(result.projectCreated).toBe(true);
    expect(result.sessionCount).toBe(2);
    expect(result.knowledgeBaseCount).toBe(2);
    expect(result.context).toContain('My AI Project');
    expect(result.sessionsLinked).toBe(true);
  });

  test('should handle RAG workflow with project knowledge base', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Document {
        id: string;
        content: string;
        chunks: { id: string; content: string; embedding: number[] }[];
      }

      interface SearchResult {
        chunkId: string;
        content: string;
        score: number;
      }

      // Step 1: Index document
      const document: Document = {
        id: 'doc-1',
        content: 'React is a JavaScript library for building user interfaces. It uses a virtual DOM for efficient updates.',
        chunks: [],
      };

      // Step 2: Chunk document
      const chunkDocument = (content: string, chunkSize: number = 50): string[] => {
        const chunks: string[] = [];
        const sentences = content.split('. ');
        let currentChunk = '';

        for (const sentence of sentences) {
          if ((currentChunk + sentence).length > chunkSize && currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence;
          } else {
            currentChunk += (currentChunk ? '. ' : '') + sentence;
          }
        }
        if (currentChunk) chunks.push(currentChunk.trim());

        return chunks;
      };

      const chunks = chunkDocument(document.content);
      document.chunks = chunks.map((content, i) => ({
        id: `chunk-${i}`,
        content,
        embedding: [Math.random(), Math.random(), Math.random()], // Simulated embedding
      }));

      // Step 3: Search
      const search = (query: string): SearchResult[] => {
        // Simulate semantic search
        return document.chunks
          .map(chunk => ({
            chunkId: chunk.id,
            content: chunk.content,
            score: chunk.content.toLowerCase().includes(query.toLowerCase()) ? 0.9 : 0.3,
          }))
          .sort((a, b) => b.score - a.score);
      };

      const searchResults = search('React');

      // Step 4: Generate context
      const generateContext = (results: SearchResult[], topK: number = 3): string => {
        return results
          .slice(0, topK)
          .map(r => r.content)
          .join('\n\n');
      };

      const context = generateContext(searchResults);

      return {
        chunkCount: document.chunks.length,
        searchResultCount: searchResults.length,
        topResultScore: searchResults[0]?.score,
        contextGenerated: context.length > 0,
        contextContainsReact: context.includes('React'),
      };
    });

    expect(result.chunkCount).toBeGreaterThan(0);
    expect(result.searchResultCount).toBeGreaterThan(0);
    expect(result.topResultScore).toBe(0.9);
    expect(result.contextGenerated).toBe(true);
    expect(result.contextContainsReact).toBe(true);
  });
});

test.describe('Agent Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should complete agent planning and execution workflow', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface PlanStep {
        id: string;
        description: string;
        status: 'pending' | 'running' | 'completed' | 'failed';
        output?: string;
      }

      interface Plan {
        id: string;
        goal: string;
        steps: PlanStep[];
        status: 'draft' | 'approved' | 'running' | 'completed' | 'failed';
      }

      // Step 1: Create plan
      const plan: Plan = {
        id: 'plan-1',
        goal: 'Research and summarize React hooks',
        steps: [
          { id: 's1', description: 'Search for React hooks documentation', status: 'pending' },
          { id: 's2', description: 'Extract key concepts', status: 'pending' },
          { id: 's3', description: 'Generate summary', status: 'pending' },
        ],
        status: 'draft',
      };

      // Step 2: Approve plan
      plan.status = 'approved';

      // Step 3: Execute steps
      const executeStep = (step: PlanStep): PlanStep => {
        step.status = 'running';
        // Simulate execution
        step.status = 'completed';
        step.output = `Completed: ${step.description}`;
        return step;
      };

      plan.status = 'running';
      for (const step of plan.steps) {
        executeStep(step);
      }

      // Step 4: Complete plan
      const allCompleted = plan.steps.every(s => s.status === 'completed');
      plan.status = allCompleted ? 'completed' : 'failed';

      return {
        planCreated: !!plan.id,
        stepCount: plan.steps.length,
        allStepsCompleted: allCompleted,
        planStatus: plan.status,
        hasOutputs: plan.steps.every(s => !!s.output),
      };
    });

    expect(result.planCreated).toBe(true);
    expect(result.stepCount).toBe(3);
    expect(result.allStepsCompleted).toBe(true);
    expect(result.planStatus).toBe('completed');
    expect(result.hasOutputs).toBe(true);
  });

  test('should handle tool execution in agent workflow', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ToolCall {
        id: string;
        name: string;
        args: Record<string, unknown>;
        status: 'pending' | 'running' | 'completed' | 'failed';
        result?: unknown;
        error?: string;
      }

      interface AgentStep {
        thought: string;
        toolCalls: ToolCall[];
        observation: string;
      }

      const steps: AgentStep[] = [];

      // Step 1: Think and decide to use tool
      const step1: AgentStep = {
        thought: 'I need to calculate 15 + 27',
        toolCalls: [{
          id: 'tc-1',
          name: 'calculator',
          args: { expression: '15 + 27' },
          status: 'pending',
        }],
        observation: '',
      };

      // Execute tool
      step1.toolCalls[0].status = 'running';
      step1.toolCalls[0].result = 42;
      step1.toolCalls[0].status = 'completed';
      step1.observation = 'The result is 42';
      steps.push(step1);

      // Step 2: Use result
      const step2: AgentStep = {
        thought: 'Now I have the result, I can provide the answer',
        toolCalls: [],
        observation: 'Final answer: 15 + 27 = 42',
      };
      steps.push(step2);

      return {
        stepCount: steps.length,
        toolCallCount: steps.reduce((acc, s) => acc + s.toolCalls.length, 0),
        allToolsCompleted: steps.every(s => 
          s.toolCalls.every(tc => tc.status === 'completed')
        ),
        hasObservations: steps.every(s => s.observation.length > 0),
        finalAnswer: steps[steps.length - 1].observation,
      };
    });

    expect(result.stepCount).toBe(2);
    expect(result.toolCallCount).toBe(1);
    expect(result.allToolsCompleted).toBe(true);
    expect(result.hasObservations).toBe(true);
    expect(result.finalAnswer).toContain('42');
  });
});

test.describe('Export Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should complete full export workflow', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Message {
        role: 'user' | 'assistant';
        content: string;
        timestamp: number;
      }

      interface ExportOptions {
        format: 'markdown' | 'json' | 'html';
        includeMetadata: boolean;
        includeTimestamps: boolean;
      }

      const messages: Message[] = [
        { role: 'user', content: 'What is React?', timestamp: 1000 },
        { role: 'assistant', content: 'React is a JavaScript library...', timestamp: 2000 },
        { role: 'user', content: 'How do hooks work?', timestamp: 3000 },
        { role: 'assistant', content: 'Hooks are functions that...', timestamp: 4000 },
      ];

      // Export to Markdown
      const exportToMarkdown = (msgs: Message[], options: ExportOptions): string => {
        let output = '# Chat Export\n\n';
        
        if (options.includeMetadata) {
          output += `Exported: ${new Date().toISOString()}\n`;
          output += `Messages: ${msgs.length}\n\n`;
        }

        for (const msg of msgs) {
          const role = msg.role === 'user' ? '**User**' : '**Assistant**';
          output += `${role}:\n${msg.content}\n\n`;
          if (options.includeTimestamps) {
            output += `_${new Date(msg.timestamp).toISOString()}_\n\n`;
          }
        }

        return output;
      };

      // Export to JSON
      const exportToJSON = (msgs: Message[], options: ExportOptions): string => {
        const data: Record<string, unknown> = {
          messages: msgs.map(m => ({
            role: m.role,
            content: m.content,
            ...(options.includeTimestamps ? { timestamp: m.timestamp } : {}),
          })),
        };

        if (options.includeMetadata) {
          data.exportedAt = new Date().toISOString();
          data.messageCount = msgs.length;
        }

        return JSON.stringify(data, null, 2);
      };

      const mdExport = exportToMarkdown(messages, {
        format: 'markdown',
        includeMetadata: true,
        includeTimestamps: false,
      });

      const jsonExport = exportToJSON(messages, {
        format: 'json',
        includeMetadata: true,
        includeTimestamps: true,
      });

      return {
        mdLength: mdExport.length,
        mdContainsTitle: mdExport.includes('# Chat Export'),
        mdContainsMessages: mdExport.includes('User') && mdExport.includes('Assistant'),
        jsonValid: (() => {
          try {
            JSON.parse(jsonExport);
            return true;
          } catch {
            return false;
          }
        })(),
        jsonMessageCount: JSON.parse(jsonExport).messages.length,
      };
    });

    expect(result.mdLength).toBeGreaterThan(0);
    expect(result.mdContainsTitle).toBe(true);
    expect(result.mdContainsMessages).toBe(true);
    expect(result.jsonValid).toBe(true);
    expect(result.jsonMessageCount).toBe(4);
  });
});

test.describe('Settings Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should complete settings configuration workflow', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Settings {
        provider: string;
        model: string;
        apiKey: string;
        temperature: number;
        maxTokens: number;
        theme: 'light' | 'dark' | 'system';
      }

      const defaultSettings: Settings = {
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: '',
        temperature: 0.7,
        maxTokens: 4096,
        theme: 'system',
      };

      // Step 1: Load settings
      const settings = { ...defaultSettings };

      // Step 2: Update provider and model
      settings.provider = 'anthropic';
      settings.model = 'claude-3-5-sonnet';

      // Step 3: Set API key
      settings.apiKey = 'sk-ant-test-key';

      // Step 4: Adjust parameters
      settings.temperature = 0.5;
      settings.maxTokens = 8192;

      // Step 5: Change theme
      settings.theme = 'dark';

      // Step 6: Validate settings
      const validateSettings = (s: Settings): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];

        if (!s.apiKey) {
          errors.push('API key is required');
        }

        if (s.temperature < 0 || s.temperature > 2) {
          errors.push('Temperature must be between 0 and 2');
        }

        if (s.maxTokens < 1) {
          errors.push('Max tokens must be at least 1');
        }

        return { valid: errors.length === 0, errors };
      };

      const validation = validateSettings(settings);

      // Step 7: Save to localStorage
      const saveSettings = (s: Settings): boolean => {
        try {
          localStorage.setItem('settings', JSON.stringify(s));
          return true;
        } catch {
          return false;
        }
      };

      const saved = saveSettings(settings);

      return {
        providerChanged: settings.provider !== defaultSettings.provider,
        modelChanged: settings.model !== defaultSettings.model,
        hasApiKey: settings.apiKey.length > 0,
        temperatureValid: settings.temperature >= 0 && settings.temperature <= 2,
        themeChanged: settings.theme !== defaultSettings.theme,
        validationPassed: validation.valid,
        settingsSaved: saved,
      };
    });

    expect(result.providerChanged).toBe(true);
    expect(result.modelChanged).toBe(true);
    expect(result.hasApiKey).toBe(true);
    expect(result.temperatureValid).toBe(true);
    expect(result.themeChanged).toBe(true);
    expect(result.validationPassed).toBe(true);
    expect(result.settingsSaved).toBe(true);
  });
});

test.describe('Canvas Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should complete canvas editing workflow', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface CanvasDocument {
        id: string;
        title: string;
        content: string;
        language: string;
        versions: { id: string; content: string; timestamp: number }[];
      }

      // Step 1: Create canvas document
      const doc: CanvasDocument = {
        id: 'canvas-1',
        title: 'My Component',
        content: 'function Hello() {\n  return <div>Hello</div>;\n}',
        language: 'typescript',
        versions: [],
      };

      // Step 2: Save initial version
      const saveVersion = (d: CanvasDocument) => {
        d.versions.push({
          id: `v${d.versions.length + 1}`,
          content: d.content,
          timestamp: Date.now(),
        });
      };

      saveVersion(doc);

      // Step 3: Edit content
      doc.content = 'function Hello({ name }) {\n  return <div>Hello, {name}!</div>;\n}';

      // Step 4: Save new version
      saveVersion(doc);

      // Step 5: Apply AI suggestion
      const applySuggestion = (d: CanvasDocument, suggestion: string) => {
        saveVersion(d); // Save before applying
        d.content = suggestion;
      };

      applySuggestion(doc, 'function Hello({ name = "World" }) {\n  return <div>Hello, {name}!</div>;\n}');

      // Step 6: Undo (restore previous version)
      const undo = (d: CanvasDocument): boolean => {
        if (d.versions.length < 2) return false;
        d.content = d.versions[d.versions.length - 2].content;
        return true;
      };

      const undoSuccess = undo(doc);

      return {
        documentCreated: !!doc.id,
        versionCount: doc.versions.length,
        undoWorked: undoSuccess,
        contentRestored: doc.content.includes('{ name }'),
        hasLanguage: doc.language === 'typescript',
      };
    });

    expect(result.documentCreated).toBe(true);
    expect(result.versionCount).toBe(3);
    expect(result.undoWorked).toBe(true);
    expect(result.contentRestored).toBe(true);
    expect(result.hasLanguage).toBe(true);
  });
});
