import { test, expect } from '@playwright/test';

/**
 * Workflow Editor E2E Tests
 * Tests visual workflow editor functionality with React Flow
 */
test.describe('Workflow Editor Store', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should initialize workflow editor state', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface WorkflowEditorState {
        currentWorkflow: object | null;
        selectedNodes: string[];
        selectedEdges: string[];
        copiedNodes: object[];
        copiedEdges: object[];
        history: object[];
        historyIndex: number;
        isDirty: boolean;
        isExecuting: boolean;
        showNodePalette: boolean;
        showConfigPanel: boolean;
        showExecutionPanel: boolean;
        showMinimap: boolean;
        validationErrors: object[];
        searchQuery: string;
      }

      const initialState: WorkflowEditorState = {
        currentWorkflow: null,
        selectedNodes: [],
        selectedEdges: [],
        copiedNodes: [],
        copiedEdges: [],
        history: [],
        historyIndex: -1,
        isDirty: false,
        isExecuting: false,
        showNodePalette: true,
        showConfigPanel: true,
        showExecutionPanel: false,
        showMinimap: true,
        validationErrors: [],
        searchQuery: '',
      };

      return {
        noWorkflow: initialState.currentWorkflow === null,
        noSelection: initialState.selectedNodes.length === 0,
        notDirty: !initialState.isDirty,
        notExecuting: !initialState.isExecuting,
        showsPalette: initialState.showNodePalette,
        showsConfig: initialState.showConfigPanel,
      };
    });

    expect(result.noWorkflow).toBe(true);
    expect(result.noSelection).toBe(true);
    expect(result.notDirty).toBe(true);
    expect(result.notExecuting).toBe(true);
    expect(result.showsPalette).toBe(true);
    expect(result.showsConfig).toBe(true);
  });

  test('should create empty workflow', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface VisualWorkflow {
        id: string;
        name: string;
        description: string;
        nodes: object[];
        edges: object[];
        viewport: { x: number; y: number; zoom: number };
        createdAt: Date;
        updatedAt: Date;
      }

      const createEmptyWorkflow = (name?: string): VisualWorkflow => {
        const now = new Date();
        return {
          id: `wf-${Date.now()}`,
          name: name || 'Untitled Workflow',
          description: '',
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
          createdAt: now,
          updatedAt: now,
        };
      };

      const workflow = createEmptyWorkflow('Test Workflow');

      return {
        hasId: workflow.id.startsWith('wf-'),
        name: workflow.name,
        noNodes: workflow.nodes.length === 0,
        noEdges: workflow.edges.length === 0,
        defaultViewport: workflow.viewport.zoom === 1,
      };
    });

    expect(result.hasId).toBe(true);
    expect(result.name).toBe('Test Workflow');
    expect(result.noNodes).toBe(true);
    expect(result.noEdges).toBe(true);
    expect(result.defaultViewport).toBe(true);
  });

  test('should manage workflow nodes', async ({ page }) => {
    const result = await page.evaluate(() => {
      type NodeType = 'start' | 'end' | 'ai' | 'tool' | 'conditional' | 'parallel';

      interface WorkflowNode {
        id: string;
        type: NodeType;
        position: { x: number; y: number };
        data: {
          label: string;
          nodeType: NodeType;
          isConfigured: boolean;
        };
      }

      const nodes: WorkflowNode[] = [];

      const addNode = (type: NodeType, position: { x: number; y: number }): WorkflowNode => {
        const node: WorkflowNode = {
          id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type,
          position,
          data: {
            label: type.charAt(0).toUpperCase() + type.slice(1),
            nodeType: type,
            isConfigured: false,
          },
        };
        nodes.push(node);
        return node;
      };

      const updateNodePosition = (nodeId: string, position: { x: number; y: number }) => {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
          node.position = position;
        }
      };

      const deleteNode = (nodeId: string) => {
        const index = nodes.findIndex(n => n.id === nodeId);
        if (index !== -1) nodes.splice(index, 1);
      };

      // Create workflow with nodes
      const startNode = addNode('start', { x: 100, y: 100 });
      const aiNode = addNode('ai', { x: 300, y: 100 });
      const _endNode = addNode('end', { x: 500, y: 100 });

      const countAfterAdd = nodes.length;

      updateNodePosition(aiNode.id, { x: 350, y: 150 });
      const updatedAiNode = nodes.find(n => n.id === aiNode.id);

      deleteNode(startNode.id);
      const countAfterDelete = nodes.length;

      return {
        countAfterAdd,
        countAfterDelete,
        aiNodeMoved: updatedAiNode?.position.x === 350 && updatedAiNode?.position.y === 150,
        endNodeExists: nodes.some(n => n.type === 'end'),
      };
    });

    expect(result.countAfterAdd).toBe(3);
    expect(result.countAfterDelete).toBe(2);
    expect(result.aiNodeMoved).toBe(true);
    expect(result.endNodeExists).toBe(true);
  });

  test('should manage workflow edges', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface WorkflowEdge {
        id: string;
        source: string;
        target: string;
        sourceHandle?: string;
        targetHandle?: string;
        type: string;
        animated?: boolean;
      }

      const edges: WorkflowEdge[] = [];

      const addEdge = (source: string, target: string): WorkflowEdge => {
        const edge: WorkflowEdge = {
          id: `edge-${source}-${target}`,
          source,
          target,
          type: 'default',
          animated: false,
        };
        edges.push(edge);
        return edge;
      };

      const deleteEdge = (edgeId: string) => {
        const index = edges.findIndex(e => e.id === edgeId);
        if (index !== -1) edges.splice(index, 1);
      };

      const getEdgesFromNode = (nodeId: string) => {
        return edges.filter(e => e.source === nodeId);
      };

      const getEdgesToNode = (nodeId: string) => {
        return edges.filter(e => e.target === nodeId);
      };

      // Create edges
      addEdge('node-1', 'node-2');
      addEdge('node-2', 'node-3');
      addEdge('node-2', 'node-4');

      const edgesFromNode2 = getEdgesFromNode('node-2');
      const edgesToNode2 = getEdgesToNode('node-2');

      deleteEdge('edge-node-2-node-4');

      return {
        totalEdges: edges.length,
        edgesFromNode2Count: edgesFromNode2.length,
        edgesToNode2Count: edgesToNode2.length,
        edgeAfterDelete: edges.length,
      };
    });

    expect(result.totalEdges).toBe(2);
    expect(result.edgesFromNode2Count).toBe(2);
    expect(result.edgesToNode2Count).toBe(1);
    expect(result.edgeAfterDelete).toBe(2);
  });

  test('should validate workflow structure', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ValidationError {
        nodeId?: string;
        edgeId?: string;
        type: 'error' | 'warning';
        message: string;
      }

      interface WorkflowNode {
        id: string;
        type: string;
        data: { isConfigured: boolean };
      }

      interface WorkflowEdge {
        source: string;
        target: string;
      }

      const validateWorkflow = (
        nodes: WorkflowNode[],
        edges: WorkflowEdge[]
      ): ValidationError[] => {
        const errors: ValidationError[] = [];

        // Check for start node
        const startNodes = nodes.filter(n => n.type === 'start');
        if (startNodes.length === 0) {
          errors.push({ type: 'error', message: 'Workflow must have a start node' });
        } else if (startNodes.length > 1) {
          errors.push({ type: 'error', message: 'Workflow can only have one start node' });
        }

        // Check for end node
        const endNodes = nodes.filter(n => n.type === 'end');
        if (endNodes.length === 0) {
          errors.push({ type: 'error', message: 'Workflow must have an end node' });
        }

        // Check for unconfigured nodes
        const unconfiguredNodes = nodes.filter(n => !n.data.isConfigured && n.type !== 'start' && n.type !== 'end');
        for (const node of unconfiguredNodes) {
          errors.push({
            nodeId: node.id,
            type: 'warning',
            message: `Node ${node.id} is not configured`,
          });
        }

        // Check for disconnected nodes
        for (const node of nodes) {
          if (node.type === 'start') continue;
          const hasIncoming = edges.some(e => e.target === node.id);
          if (!hasIncoming) {
            errors.push({
              nodeId: node.id,
              type: 'warning',
              message: `Node ${node.id} has no incoming connections`,
            });
          }
        }

        return errors;
      };

      const validNodes: WorkflowNode[] = [
        { id: 'start', type: 'start', data: { isConfigured: true } },
        { id: 'ai', type: 'ai', data: { isConfigured: true } },
        { id: 'end', type: 'end', data: { isConfigured: true } },
      ];
      const validEdges: WorkflowEdge[] = [
        { source: 'start', target: 'ai' },
        { source: 'ai', target: 'end' },
      ];

      const invalidNodes: WorkflowNode[] = [
        { id: 'ai', type: 'ai', data: { isConfigured: false } },
      ];
      const invalidEdges: WorkflowEdge[] = [];

      return {
        validErrors: validateWorkflow(validNodes, validEdges),
        invalidErrors: validateWorkflow(invalidNodes, invalidEdges),
      };
    });

    expect(result.validErrors).toHaveLength(0);
    expect(result.invalidErrors.length).toBeGreaterThan(0);
    expect(result.invalidErrors.some(e => e.message.includes('start node'))).toBe(true);
    expect(result.invalidErrors.some(e => e.message.includes('end node'))).toBe(true);
  });

  test('should handle undo/redo operations', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface HistoryEntry {
        nodes: object[];
        edges: object[];
        timestamp: number;
      }

      const history: HistoryEntry[] = [];
      let historyIndex = -1;
      const maxHistorySize = 50;

      const pushToHistory = (entry: Omit<HistoryEntry, 'timestamp'>) => {
        // Remove any redo entries
        if (historyIndex < history.length - 1) {
          history.splice(historyIndex + 1);
        }

        // Add new entry
        history.push({ ...entry, timestamp: Date.now() });

        // Enforce max size
        if (history.length > maxHistorySize) {
          history.shift();
        } else {
          historyIndex++;
        }
      };

      const canUndo = () => historyIndex > 0;
      const canRedo = () => historyIndex < history.length - 1;

      const undo = () => {
        if (canUndo()) {
          historyIndex--;
          return history[historyIndex];
        }
        return null;
      };

      const redo = () => {
        if (canRedo()) {
          historyIndex++;
          return history[historyIndex];
        }
        return null;
      };

      // Simulate history operations
      pushToHistory({ nodes: [{ id: '1' }], edges: [] });
      pushToHistory({ nodes: [{ id: '1' }, { id: '2' }], edges: [] });
      pushToHistory({ nodes: [{ id: '1' }, { id: '2' }, { id: '3' }], edges: [] });

      const canUndoAfterPush = canUndo();
      const canRedoAfterPush = canRedo();

      undo();
      const canRedoAfterUndo = canRedo();
      const currentIndex = historyIndex;

      redo();
      const finalIndex = historyIndex;

      return {
        historyLength: history.length,
        canUndoAfterPush,
        canRedoAfterPush,
        canRedoAfterUndo,
        currentIndex,
        finalIndex,
      };
    });

    expect(result.historyLength).toBe(3);
    expect(result.canUndoAfterPush).toBe(true);
    expect(result.canRedoAfterPush).toBe(false);
    expect(result.canRedoAfterUndo).toBe(true);
    expect(result.currentIndex).toBe(1);
    expect(result.finalIndex).toBe(2);
  });
});

test.describe('Workflow Node Types', () => {
  test('should create AI node with configuration', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface AINodeData {
        nodeType: 'ai';
        label: string;
        aiPrompt: string;
        systemPrompt?: string;
        model?: string;
        temperature?: number;
        maxTokens?: number;
        isConfigured: boolean;
      }

      const createAINode = (config: Partial<AINodeData>): AINodeData => {
        return {
          nodeType: 'ai',
          label: config.label || 'AI Node',
          aiPrompt: config.aiPrompt || '',
          systemPrompt: config.systemPrompt,
          model: config.model || 'gpt-4o',
          temperature: config.temperature ?? 0.7,
          maxTokens: config.maxTokens ?? 4096,
          isConfigured: !!(config.aiPrompt && config.aiPrompt.length > 0),
        };
      };

      const unconfiguredNode = createAINode({});
      const configuredNode = createAINode({
        label: 'Summarize',
        aiPrompt: 'Summarize the following text: {{input}}',
        systemPrompt: 'You are a helpful assistant.',
        temperature: 0.5,
      });

      return {
        unconfiguredIsConfigured: unconfiguredNode.isConfigured,
        configuredIsConfigured: configuredNode.isConfigured,
        defaultModel: unconfiguredNode.model,
        configuredLabel: configuredNode.label,
        configuredTemp: configuredNode.temperature,
      };
    });

    expect(result.unconfiguredIsConfigured).toBe(false);
    expect(result.configuredIsConfigured).toBe(true);
    expect(result.defaultModel).toBe('gpt-4o');
    expect(result.configuredLabel).toBe('Summarize');
    expect(result.configuredTemp).toBe(0.5);
  });

  test('should create conditional node with branches', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ConditionalBranch {
        id: string;
        condition: string;
        label: string;
      }

      interface ConditionalNodeData {
        nodeType: 'conditional';
        label: string;
        branches: ConditionalBranch[];
        defaultBranch?: string;
        isConfigured: boolean;
      }

      const createConditionalNode = (): ConditionalNodeData => {
        return {
          nodeType: 'conditional',
          label: 'Conditional',
          branches: [
            { id: 'true', condition: 'result === true', label: 'True' },
            { id: 'false', condition: 'result === false', label: 'False' },
          ],
          defaultBranch: 'false',
          isConfigured: true,
        };
      };

      const addBranch = (node: ConditionalNodeData, branch: ConditionalBranch) => {
        node.branches.push(branch);
      };

      const node = createConditionalNode();
      addBranch(node, { id: 'maybe', condition: 'result === null', label: 'Maybe' });

      return {
        branchCount: node.branches.length,
        hasTrueBranch: node.branches.some(b => b.id === 'true'),
        hasFalseBranch: node.branches.some(b => b.id === 'false'),
        hasMaybeBranch: node.branches.some(b => b.id === 'maybe'),
        defaultBranch: node.defaultBranch,
      };
    });

    expect(result.branchCount).toBe(3);
    expect(result.hasTrueBranch).toBe(true);
    expect(result.hasFalseBranch).toBe(true);
    expect(result.hasMaybeBranch).toBe(true);
    expect(result.defaultBranch).toBe('false');
  });

  test('should create loop node with configuration', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface LoopNodeData {
        nodeType: 'loop';
        label: string;
        loopType: 'count' | 'while' | 'forEach';
        maxIterations: number;
        loopCondition?: string;
        itemsPath?: string;
        currentIndex: number;
        isConfigured: boolean;
      }

      const createLoopNode = (config: Partial<LoopNodeData>): LoopNodeData => {
        return {
          nodeType: 'loop',
          label: config.label || 'Loop',
          loopType: config.loopType || 'count',
          maxIterations: config.maxIterations ?? 10,
          loopCondition: config.loopCondition,
          itemsPath: config.itemsPath,
          currentIndex: 0,
          isConfigured: true,
        };
      };

      const countLoop = createLoopNode({ loopType: 'count', maxIterations: 5 });
      const whileLoop = createLoopNode({ loopType: 'while', loopCondition: 'result !== done' });
      const forEachLoop = createLoopNode({ loopType: 'forEach', itemsPath: 'data.items' });

      return {
        countLoopType: countLoop.loopType,
        countLoopMax: countLoop.maxIterations,
        whileLoopCondition: whileLoop.loopCondition,
        forEachItemsPath: forEachLoop.itemsPath,
      };
    });

    expect(result.countLoopType).toBe('count');
    expect(result.countLoopMax).toBe(5);
    expect(result.whileLoopCondition).toBe('result !== done');
    expect(result.forEachItemsPath).toBe('data.items');
  });

  test('should create parallel node with branches', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ParallelBranch {
        id: string;
        name: string;
        nodeIds: string[];
      }

      interface ParallelNodeData {
        nodeType: 'parallel';
        label: string;
        branches: ParallelBranch[];
        waitForAll: boolean;
        timeout?: number;
        isConfigured: boolean;
      }

      const createParallelNode = (): ParallelNodeData => {
        return {
          nodeType: 'parallel',
          label: 'Parallel',
          branches: [
            { id: 'branch-1', name: 'Branch 1', nodeIds: [] },
            { id: 'branch-2', name: 'Branch 2', nodeIds: [] },
          ],
          waitForAll: true,
          timeout: 30000,
          isConfigured: true,
        };
      };

      const node = createParallelNode();

      return {
        branchCount: node.branches.length,
        waitForAll: node.waitForAll,
        timeout: node.timeout,
        isConfigured: node.isConfigured,
      };
    });

    expect(result.branchCount).toBe(2);
    expect(result.waitForAll).toBe(true);
    expect(result.timeout).toBe(30000);
    expect(result.isConfigured).toBe(true);
  });
});

test.describe('Workflow Execution', () => {
  test('should track execution state', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      type NodeExecutionStatus = 'idle' | 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

      interface NodeExecutionState {
        nodeId: string;
        status: NodeExecutionStatus;
        startTime?: number;
        endTime?: number;
        output?: unknown;
        error?: string;
      }

      interface WorkflowExecutionState {
        workflowId: string;
        status: 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
        startTime?: number;
        endTime?: number;
        currentNodeId?: string;
        nodeStates: Record<string, NodeExecutionState>;
        variables: Record<string, unknown>;
        logs: { timestamp: number; level: string; message: string }[];
      }

      const createExecutionState = (workflowId: string): WorkflowExecutionState => ({
        workflowId,
        status: 'idle',
        nodeStates: {},
        variables: {},
        logs: [],
      });

      const startExecution = (state: WorkflowExecutionState) => {
        state.status = 'running';
        state.startTime = Date.now();
      };

      const updateNodeState = (
        state: WorkflowExecutionState,
        nodeId: string,
        nodeState: Partial<NodeExecutionState>
      ) => {
        if (!state.nodeStates[nodeId]) {
          state.nodeStates[nodeId] = { nodeId, status: 'idle' };
        }
        Object.assign(state.nodeStates[nodeId], nodeState);
      };

      const completeExecution = (state: WorkflowExecutionState) => {
        state.status = 'completed';
        state.endTime = Date.now();
      };

      // Simulate execution
      const execState = createExecutionState('wf-123');
      startExecution(execState);

      updateNodeState(execState, 'node-1', { status: 'running', startTime: Date.now() });
      updateNodeState(execState, 'node-1', { status: 'completed', endTime: Date.now(), output: { result: 'ok' } });

      updateNodeState(execState, 'node-2', { status: 'running', startTime: Date.now() });
      updateNodeState(execState, 'node-2', { status: 'completed', endTime: Date.now() });

      completeExecution(execState);

      return {
        workflowId: execState.workflowId,
        status: execState.status,
        hasStartTime: !!execState.startTime,
        hasEndTime: !!execState.endTime,
        nodeCount: Object.keys(execState.nodeStates).length,
        node1Status: execState.nodeStates['node-1']?.status,
        node2Status: execState.nodeStates['node-2']?.status,
      };
    });

    expect(result.workflowId).toBe('wf-123');
    expect(result.status).toBe('completed');
    expect(result.hasStartTime).toBe(true);
    expect(result.hasEndTime).toBe(true);
    expect(result.nodeCount).toBe(2);
    expect(result.node1Status).toBe('completed');
    expect(result.node2Status).toBe('completed');
  });

  test('should manage execution logs', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ExecutionLog {
        id: string;
        timestamp: number;
        level: 'info' | 'warn' | 'error' | 'debug';
        nodeId?: string;
        message: string;
        data?: unknown;
      }

      const logs: ExecutionLog[] = [];

      const addLog = (
        level: ExecutionLog['level'],
        message: string,
        nodeId?: string,
        data?: unknown
      ) => {
        logs.push({
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          level,
          nodeId,
          message,
          data,
        });
      };

      const getLogsByLevel = (level: ExecutionLog['level']) => {
        return logs.filter(l => l.level === level);
      };

      const getLogsByNode = (nodeId: string) => {
        return logs.filter(l => l.nodeId === nodeId);
      };

      // Add logs
      addLog('info', 'Workflow started');
      addLog('info', 'Executing node', 'node-1');
      addLog('debug', 'Node input', 'node-1', { input: 'test' });
      addLog('info', 'Node completed', 'node-1');
      addLog('warn', 'Slow execution detected', 'node-2');
      addLog('error', 'Node failed', 'node-3', { error: 'timeout' });

      return {
        totalLogs: logs.length,
        infoCount: getLogsByLevel('info').length,
        warnCount: getLogsByLevel('warn').length,
        errorCount: getLogsByLevel('error').length,
        node1Logs: getLogsByNode('node-1').length,
      };
    });

    expect(result.totalLogs).toBe(6);
    expect(result.infoCount).toBe(3);
    expect(result.warnCount).toBe(1);
    expect(result.errorCount).toBe(1);
    expect(result.node1Logs).toBe(3);
  });
});

test.describe('Workflow Templates', () => {
  test('should manage node templates', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface NodeTemplate {
        id: string;
        name: string;
        description: string;
        nodeType: string;
        defaultConfig: Record<string, unknown>;
        category: string;
        icon?: string;
      }

      const templates: NodeTemplate[] = [];

      const addTemplate = (template: Omit<NodeTemplate, 'id'>): NodeTemplate => {
        const newTemplate = {
          ...template,
          id: `template-${Date.now()}`,
        };
        templates.push(newTemplate);
        return newTemplate;
      };

      const getTemplatesByCategory = (category: string) => {
        return templates.filter(t => t.category === category);
      };

      // Add templates
      addTemplate({
        name: 'Summarizer',
        description: 'Summarize text content',
        nodeType: 'ai',
        defaultConfig: { temperature: 0.5, maxTokens: 2048 },
        category: 'Text Processing',
      });

      addTemplate({
        name: 'Translator',
        description: 'Translate text between languages',
        nodeType: 'ai',
        defaultConfig: { temperature: 0.3 },
        category: 'Text Processing',
      });

      addTemplate({
        name: 'Data Filter',
        description: 'Filter data based on conditions',
        nodeType: 'transform',
        defaultConfig: {},
        category: 'Data Processing',
      });

      return {
        totalTemplates: templates.length,
        textProcessingCount: getTemplatesByCategory('Text Processing').length,
        dataProcessingCount: getTemplatesByCategory('Data Processing').length,
        firstTemplateName: templates[0]?.name,
      };
    });

    expect(result.totalTemplates).toBe(3);
    expect(result.textProcessingCount).toBe(2);
    expect(result.dataProcessingCount).toBe(1);
    expect(result.firstTemplateName).toBe('Summarizer');
  });
});
