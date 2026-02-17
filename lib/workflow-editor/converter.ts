/**
 * Workflow Converter - Converts between visual workflow and execution definition
 */

import type {
  VisualWorkflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowNodeData,
  AINodeData,
  ToolNodeData,
  ConditionalNodeData,
  HumanNodeData,
  ParallelNodeData,
  StartNodeData,
  EndNodeData,
  CodeNodeData,
  TransformNodeData,
  LoopNodeData,
  WebhookNodeData,
  DelayNodeData,
  MergeNodeData,
  SubworkflowNodeData,
  KnowledgeRetrievalNodeData,
  ParameterExtractorNodeData,
  VariableAggregatorNodeData,
  QuestionClassifierNodeData,
  TemplateTransformNodeData,
  ChartNodeData,
} from '@/types/workflow/workflow-editor';
import type {
  WorkflowDefinition,
  WorkflowCodeSandboxOptions,
  WorkflowStepDefinition,
  WorkflowIOSchema,
} from '@/types/workflow';

function normalizeCodeSandboxOptions(
  raw: unknown
): WorkflowCodeSandboxOptions | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

  const value = raw as Record<string, unknown>;
  const runtime =
    typeof value.runtime === 'string' ? (value.runtime as WorkflowCodeSandboxOptions['runtime']) : undefined;
  const timeoutMs = typeof value.timeoutMs === 'number' ? value.timeoutMs : undefined;
  const memoryLimitMb =
    typeof value.memoryLimitMb === 'number' ? value.memoryLimitMb : undefined;
  const networkEnabled =
    typeof value.networkEnabled === 'boolean' ? value.networkEnabled : undefined;
  const env =
    value.env && typeof value.env === 'object' && !Array.isArray(value.env)
      ? (value.env as Record<string, string>)
      : undefined;
  const args = Array.isArray(value.args)
    ? value.args.filter((item): item is string => typeof item === 'string')
    : undefined;
  const files =
    value.files && typeof value.files === 'object' && !Array.isArray(value.files)
      ? (value.files as Record<string, string>)
      : undefined;

  if (
    runtime === undefined &&
    timeoutMs === undefined &&
    memoryLimitMb === undefined &&
    networkEnabled === undefined &&
    env === undefined &&
    args === undefined &&
    files === undefined
  ) {
    return undefined;
  }

  return {
    runtime,
    timeoutMs,
    memoryLimitMb,
    networkEnabled,
    env,
    args,
    files,
  };
}

function extractLegacyCodeSandbox(raw: Record<string, unknown>): WorkflowCodeSandboxOptions | undefined {
  return normalizeCodeSandboxOptions({
    runtime: raw.runtime,
    timeoutMs: raw.timeoutMs,
    memoryLimitMb: raw.memoryLimitMb,
    networkEnabled: raw.networkEnabled,
    env: raw.env,
    args: raw.args,
    files: raw.files,
  });
}

/**
 * Convert a visual workflow to an executable workflow definition
 */
export function visualToDefinition(visual: VisualWorkflow): WorkflowDefinition {
  const steps: WorkflowStepDefinition[] = [];

  // Build adjacency list for dependencies
  const incomingEdges = new Map<string, string[]>();
  visual.edges.forEach(edge => {
    const existing = incomingEdges.get(edge.target) || [];
    existing.push(edge.source);
    incomingEdges.set(edge.target, existing);
  });

  // Convert executable nodes to steps (decorative/container nodes are editor-only)
  visual.nodes.forEach(node => {
    if (
      node.type === 'start' ||
      node.type === 'end' ||
      node.type === 'group' ||
      node.type === 'annotation'
    ) {
      return;
    }

    steps.push(nodeToStep(node, incomingEdges.get(node.id) || []));
  });

  // Get inputs from start node
  const startNode = visual.nodes.find(n => n.type === 'start');
  const inputs: Record<string, WorkflowIOSchema> = startNode
    ? (startNode.data as StartNodeData).workflowInputs || {}
    : {};

  // Get outputs from end node
  const endNode = visual.nodes.find(n => n.type === 'end');
  const outputs: Record<string, WorkflowIOSchema> = endNode
    ? (endNode.data as EndNodeData).workflowOutputs || {}
    : {};

  return {
    id: visual.id,
    name: visual.name,
    description: visual.description,
    type: visual.type,
    version: visual.version,
    icon: visual.icon,
    category: visual.category,
    tags: visual.tags,
    steps,
    inputs,
    outputs,
    defaultConfig: {},
    createdAt: visual.createdAt,
    updatedAt: visual.updatedAt,
  };
}

/**
 * Convert a workflow node to a step definition
 */
function nodeToStep(node: WorkflowNode, dependencies: string[]): WorkflowStepDefinition {
  const data = node.data;
  const baseStep: Partial<WorkflowStepDefinition> = {
    id: node.id,
    name: data.label,
    description: data.description || '',
    dependencies: dependencies.filter(d => d !== 'start-1'), // Filter out start node
    retryCount: data.errorConfig?.retryOnFailure ? data.errorConfig.maxRetries : undefined,
    continueOnFail: data.errorConfig?.continueOnFail,
    timeout: data.errorConfig?.timeout,
    errorBranch: data.errorConfig?.errorBranch,
    fallbackOutput: data.errorConfig?.fallbackOutput,
  };

  switch (data.nodeType) {
    case 'ai': {
      const aiData = data as AINodeData;
      return {
        ...baseStep,
        type: 'ai',
        aiPrompt: aiData.aiPrompt,
        inputs: aiData.inputs || {},
        outputs: aiData.outputs || {},
      } as WorkflowStepDefinition;
    }

    case 'tool': {
      const toolData = data as ToolNodeData;
      return {
        ...baseStep,
        type: 'tool',
        toolName: toolData.toolName,
        metadata: {
          parameterMapping: toolData.parameterMapping || {},
          toolCategory: toolData.toolCategory,
        },
        inputs: toolData.inputs || {},
        outputs: toolData.outputs || {},
      } as WorkflowStepDefinition;
    }

    case 'conditional': {
      const condData = data as ConditionalNodeData;
      return {
        ...baseStep,
        type: 'conditional',
        condition: condData.condition,
        inputs: condData.inputs || {},
        outputs: {},
      } as WorkflowStepDefinition;
    }

    case 'human': {
      const humanData = data as HumanNodeData;
      return {
        ...baseStep,
        type: 'human',
        inputs: humanData.inputs || {},
        outputs: humanData.outputs || {},
        metadata: {
          approvalMessage: humanData.approvalMessage,
          approvalOptions: humanData.approvalOptions,
          defaultAction: humanData.defaultAction,
          assignee: humanData.assignee,
        },
      } as WorkflowStepDefinition;
    }

    case 'parallel': {
      const parallelData = data as ParallelNodeData;
      return {
        ...baseStep,
        type: 'parallel',
        inputs: parallelData.inputs || {},
        outputs: parallelData.outputs || {},
        metadata: {
          branches: parallelData.branches,
          waitForAll: parallelData.waitForAll,
          maxConcurrency: parallelData.maxConcurrency,
        },
      } as WorkflowStepDefinition;
    }

    case 'code':
    case 'transform':
    case 'loop':
    case 'webhook':
    case 'delay':
    case 'merge':
    case 'subworkflow': {
      // Use the actual node type as the step type for proper execution
      return createExtendedStep(data, baseStep);
    }

    case 'knowledgeRetrieval':
    case 'parameterExtractor':
    case 'variableAggregator':
    case 'questionClassifier':
    case 'templateTransform':
    case 'chart':
    case 'lineChart':
    case 'barChart':
    case 'pieChart':
    case 'areaChart':
    case 'scatterChart':
    case 'radarChart':
      return createExtendedStep(data, baseStep);

    default:
      throw new Error(`Unsupported workflow node type for execution: ${data.nodeType}`);
  }
}

/**
 * Create extended step definition for complex node types
 */
function createExtendedStep(
  data: WorkflowNodeData,
  baseStep: Partial<WorkflowStepDefinition>
): WorkflowStepDefinition {
  const inputs = (data as unknown as AINodeData).inputs || {};
  const outputs = (data as unknown as AINodeData).outputs || {};

  switch (data.nodeType) {
    case 'code': {
      const codeData = data as import('@/types/workflow/workflow-editor').CodeNodeData;
      const legacySandbox = extractLegacyCodeSandbox(codeData as unknown as Record<string, unknown>);
      const sandbox = normalizeCodeSandboxOptions(codeData.sandbox) || legacySandbox;
      return {
        ...baseStep,
        type: 'code',
        code: codeData.code || '',
        language: codeData.language || 'javascript',
        codeSandbox: sandbox,
        inputs,
        outputs,
      } as WorkflowStepDefinition;
    }

    case 'transform': {
      const transformData = data as import('@/types/workflow/workflow-editor').TransformNodeData;
      return {
        ...baseStep,
        type: 'transform',
        transformType: transformData.transformType || 'custom',
        expression: transformData.expression || '',
        inputs,
        outputs,
      } as WorkflowStepDefinition;
    }

    case 'loop': {
      const loopData = data as import('@/types/workflow/workflow-editor').LoopNodeData;
      return {
        ...baseStep,
        type: 'loop',
        loopType: loopData.loopType || 'forEach',
        iteratorVariable: loopData.iteratorVariable || 'item',
        collection: loopData.collection,
        maxIterations: loopData.maxIterations || 100,
        condition: loopData.condition,
        inputs,
        outputs,
      } as WorkflowStepDefinition;
    }

    case 'webhook': {
      const webhookData = data as import('@/types/workflow/workflow-editor').WebhookNodeData;
      return {
        ...baseStep,
        type: 'webhook',
        webhookUrl: webhookData.webhookUrl || '',
        method: webhookData.method || 'POST',
        headers: webhookData.headers || {},
        body: webhookData.body,
        inputs,
        outputs,
      } as WorkflowStepDefinition;
    }

    case 'delay': {
      const delayData = data as import('@/types/workflow/workflow-editor').DelayNodeData;
      return {
        ...baseStep,
        type: 'delay',
        delayType: delayData.delayType || 'fixed',
        delayMs: delayData.delayMs || 1000,
        untilTime: delayData.untilTime,
        cronExpression: delayData.cronExpression,
        inputs: {},
        outputs: {},
      } as WorkflowStepDefinition;
    }

    case 'merge': {
      const mergeData = data as import('@/types/workflow/workflow-editor').MergeNodeData;
      return {
        ...baseStep,
        type: 'merge',
        mergeStrategy: mergeData.mergeStrategy || 'merge',
        inputs,
        outputs,
      } as WorkflowStepDefinition;
    }

    case 'subworkflow': {
      const subworkflowData = data as import('@/types/workflow/workflow-editor').SubworkflowNodeData;
      return {
        ...baseStep,
        type: 'subworkflow',
        workflowId: subworkflowData.workflowId || '',
        inputMapping: subworkflowData.inputMapping || {},
        outputMapping: subworkflowData.outputMapping || {},
        inputs,
        outputs,
      } as WorkflowStepDefinition;
    }

    case 'knowledgeRetrieval': {
      const retrievalData = data as KnowledgeRetrievalNodeData;
      return {
        ...baseStep,
        type: 'knowledgeRetrieval',
        queryVariable: retrievalData.queryVariable,
        knowledgeBaseIds: retrievalData.knowledgeBaseIds,
        retrievalMode: retrievalData.retrievalMode,
        topK: retrievalData.topK,
        scoreThreshold: retrievalData.scoreThreshold,
        rerankingEnabled: retrievalData.rerankingEnabled,
        rerankingModel: retrievalData.rerankingModel,
        inputs,
        outputs,
      } as WorkflowStepDefinition;
    }

    case 'parameterExtractor': {
      const extractorData = data as ParameterExtractorNodeData;
      return {
        ...baseStep,
        type: 'parameterExtractor',
        model: extractorData.model,
        instruction: extractorData.instruction,
        inputVariable: extractorData.inputVariable,
        parameters: extractorData.parameters,
        inputs,
        outputs,
      } as WorkflowStepDefinition;
    }

    case 'variableAggregator': {
      const aggregatorData = data as VariableAggregatorNodeData;
      return {
        ...baseStep,
        type: 'variableAggregator',
        variableRefs: aggregatorData.variableRefs,
        aggregationMode: aggregatorData.aggregationMode,
        outputVariableName: aggregatorData.outputVariableName,
        inputs,
        outputs,
      } as WorkflowStepDefinition;
    }

    case 'questionClassifier': {
      const classifierData = data as QuestionClassifierNodeData;
      return {
        ...baseStep,
        type: 'questionClassifier',
        model: classifierData.model,
        inputVariable: classifierData.inputVariable,
        classes: classifierData.classes,
        inputs,
        outputs,
      } as WorkflowStepDefinition;
    }

    case 'templateTransform': {
      const templateData = data as TemplateTransformNodeData;
      return {
        ...baseStep,
        type: 'templateTransform',
        template: templateData.template,
        variableRefs: templateData.variableRefs,
        outputType: templateData.outputType,
        inputs,
        outputs,
      } as WorkflowStepDefinition;
    }

    case 'chart':
    case 'lineChart':
    case 'barChart':
    case 'pieChart':
    case 'areaChart':
    case 'scatterChart':
    case 'radarChart': {
      const chartData = data as ChartNodeData;
      return {
        ...baseStep,
        type: data.nodeType,
        chartType: chartData.chartType,
        title: chartData.title,
        xAxisKey: chartData.xAxisKey,
        yAxisKey: chartData.yAxisKey,
        series: chartData.series,
        showLegend: chartData.showLegend,
        showGrid: chartData.showGrid,
        showTooltip: chartData.showTooltip,
        stacked: chartData.stacked,
        aspectRatio: chartData.aspectRatio,
        inputs,
        outputs,
      } as WorkflowStepDefinition;
    }

    default:
      throw new Error(`Unsupported workflow node type for step conversion: ${data.nodeType}`);
  }
}

/**
 * Convert an executable workflow definition to a visual workflow
 */
export function definitionToVisual(definition: WorkflowDefinition): VisualWorkflow {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  // Create start node
  const startNode: WorkflowNode = {
    id: 'start-1',
    type: 'start',
    position: { x: 400, y: 50 },
    data: {
      label: 'Start',
      nodeType: 'start',
      executionStatus: 'idle',
      isConfigured: true,
      hasError: false,
      workflowInputs: definition.inputs,
    } as StartNodeData,
  };
  nodes.push(startNode);

  // Create step nodes
  const stepPositions = calculateStepPositions(definition.steps);
  
  definition.steps.forEach((step, index) => {
    const node = stepToNode(step, stepPositions[step.id] || { x: 400, y: 150 + index * 120 });
    nodes.push(node);

    // Create edges from dependencies
    if (step.dependencies && step.dependencies.length > 0) {
      step.dependencies.forEach(depId => {
        edges.push({
          id: `edge-${depId}-${step.id}`,
          source: depId,
          target: step.id,
          type: 'default',
          data: {},
        });
      });
    } else {
      // Connect to start node if no dependencies
      edges.push({
        id: `edge-start-${step.id}`,
        source: 'start-1',
        target: step.id,
        type: 'default',
        data: {},
      });
    }
  });

  // Create end node
  const endNode: WorkflowNode = {
    id: 'end-1',
    type: 'end',
    position: { x: 400, y: 150 + definition.steps.length * 120 },
    data: {
      label: 'End',
      nodeType: 'end',
      executionStatus: 'idle',
      isConfigured: true,
      hasError: false,
      workflowOutputs: definition.outputs,
      outputMapping: {},
    } as EndNodeData,
  };
  nodes.push(endNode);

  // Connect last steps to end node
  const lastSteps = findLastSteps(definition.steps);
  lastSteps.forEach(stepId => {
    edges.push({
      id: `edge-${stepId}-end`,
      source: stepId,
      target: 'end-1',
      type: 'default',
      data: {},
    });
  });

  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    type: definition.type,
    version: definition.version,
    icon: definition.icon,
    category: definition.category,
    tags: definition.tags,
    nodes,
    edges,
    viewport: { x: 0, y: 0, zoom: 1 },
    inputs: definition.inputs,
    outputs: definition.outputs,
    variables: {},
    settings: {
      autoSave: true,
      autoLayout: false,
      showMinimap: true,
      showGrid: true,
      snapToGrid: true,
      gridSize: 20,
      retryOnFailure: true,
      maxRetries: 3,
      logLevel: 'info',
    },
    createdAt: definition.createdAt || new Date(),
    updatedAt: definition.updatedAt || new Date(),
  };
}

function chartNodeTypeToChartType(
  type:
    | 'chart'
    | 'lineChart'
    | 'barChart'
    | 'pieChart'
    | 'areaChart'
    | 'scatterChart'
    | 'radarChart'
): ChartNodeData['chartType'] {
  switch (type) {
    case 'lineChart':
      return 'line';
    case 'barChart':
      return 'bar';
    case 'pieChart':
      return 'pie';
    case 'areaChart':
      return 'area';
    case 'scatterChart':
      return 'scatter';
    case 'radarChart':
      return 'radar';
    case 'chart':
    default:
      return 'bar';
  }
}

/**
 * Convert a step definition to a workflow node
 */
function stepToNode(step: WorkflowStepDefinition, position: { x: number; y: number }): WorkflowNode {
  const baseData: Partial<WorkflowNodeData> = {
    label: step.name,
    description: step.description,
    executionStatus: 'idle',
    isConfigured: true,
    hasError: false,
  };

  const commonErrorConfig = {
    retryOnFailure: (step.retryCount || 0) > 0,
    maxRetries: step.retryCount || 0,
    retryInterval: 1000,
    continueOnFail: step.continueOnFail ?? false,
    fallbackOutput: step.fallbackOutput,
    errorBranch: step.errorBranch || 'stop',
    timeout: step.timeout,
  } as const;

  let nodeType = step.type as WorkflowNode['type'];
  let data: WorkflowNodeData;

  switch (step.type) {
    case 'ai':
      data = {
        ...baseData,
        errorConfig: commonErrorConfig,
        nodeType: 'ai',
        aiPrompt: step.aiPrompt || '',
        inputs: step.inputs,
        outputs: step.outputs,
        temperature: 0.7,
        responseFormat: 'text',
      } as AINodeData;
      break;

    case 'tool': {
      const toolMetadata = step.metadata as
        | { parameterMapping?: Record<string, string>; toolCategory?: string }
        | undefined;
      data = {
        ...baseData,
        errorConfig: commonErrorConfig,
        nodeType: 'tool',
        toolName:
          step.toolName ||
          (step as unknown as { tool_name?: string }).tool_name ||
          '',
        toolCategory: toolMetadata?.toolCategory,
        inputs: step.inputs,
        outputs: step.outputs,
        parameterMapping: toolMetadata?.parameterMapping || {},
      } as ToolNodeData;
      break;
    }

    case 'conditional':
      data = {
        ...baseData,
        errorConfig: commonErrorConfig,
        nodeType: 'conditional',
        condition: step.condition || '',
        conditionType: 'expression',
        inputs: step.inputs,
      } as ConditionalNodeData;
      nodeType = 'conditional';
      break;

    case 'human':
      data = {
        ...baseData,
        errorConfig: commonErrorConfig,
        nodeType: 'human',
        approvalMessage:
          (step.metadata as { approvalMessage?: string } | undefined)?.approvalMessage ||
          'Please review and approve',
        approvalOptions:
          (step.metadata as { approvalOptions?: string[] } | undefined)?.approvalOptions || [
            'Approve',
            'Reject',
          ],
        defaultAction: (step.metadata as { defaultAction?: 'approve' | 'reject' | 'timeout' } | undefined)
          ?.defaultAction,
        assignee: (step.metadata as { assignee?: string } | undefined)?.assignee,
        inputs: step.inputs,
        outputs: step.outputs,
      } as HumanNodeData;
      break;

    case 'parallel':
      data = {
        ...baseData,
        errorConfig: commonErrorConfig,
        nodeType: 'parallel',
        branches: (step.metadata as { branches?: string[] } | undefined)?.branches || [],
        waitForAll: (step.metadata as { waitForAll?: boolean } | undefined)?.waitForAll ?? true,
        maxConcurrency: (step.metadata as { maxConcurrency?: number } | undefined)?.maxConcurrency,
        inputs: step.inputs,
        outputs: step.outputs,
      } as ParallelNodeData;
      break;

    case 'code':
      {
      const legacySandbox = extractLegacyCodeSandbox(step as unknown as Record<string, unknown>);
      const sandbox =
        normalizeCodeSandboxOptions((step as { codeSandbox?: unknown }).codeSandbox) ||
        legacySandbox;
      data = {
        ...baseData,
        errorConfig: commonErrorConfig,
        nodeType: 'code',
        code: (step as unknown as { code?: string }).code || '',
        language: (step as unknown as { language?: string }).language || 'javascript',
        sandbox,
        inputs: step.inputs,
        outputs: step.outputs,
      } as CodeNodeData;
      break;
      }

    case 'transform':
      data = {
        ...baseData,
        errorConfig: commonErrorConfig,
        nodeType: 'transform',
        transformType: (step as unknown as { transformType?: string }).transformType || 'custom',
        expression: (step as unknown as { expression?: string }).expression || '',
        inputs: step.inputs,
        outputs: step.outputs,
      } as TransformNodeData;
      break;

    case 'loop':
      data = {
        ...baseData,
        errorConfig: commonErrorConfig,
        nodeType: 'loop',
        loopType: (step as unknown as { loopType?: string }).loopType || 'forEach',
        iteratorVariable: (step as unknown as { iteratorVariable?: string }).iteratorVariable || 'item',
        collection: (step as unknown as { collection?: string }).collection,
        maxIterations: (step as unknown as { maxIterations?: number }).maxIterations || 100,
        condition: (step as unknown as { condition?: string }).condition,
        inputs: step.inputs,
        outputs: step.outputs,
      } as LoopNodeData;
      break;

    case 'webhook':
      data = {
        ...baseData,
        errorConfig: commonErrorConfig,
        nodeType: 'webhook',
        webhookUrl: (step as unknown as { webhookUrl?: string }).webhookUrl || '',
        method: (step as unknown as { method?: string }).method || 'POST',
        headers: (step as unknown as { headers?: Record<string, string> }).headers || {},
        body: (step as unknown as { body?: string }).body,
        inputs: step.inputs,
        outputs: step.outputs,
      } as WebhookNodeData;
      break;

    case 'delay':
      data = {
        ...baseData,
        errorConfig: commonErrorConfig,
        nodeType: 'delay',
        delayType: (step as unknown as { delayType?: string }).delayType || 'fixed',
        delayMs: (step as unknown as { delayMs?: number }).delayMs || 1000,
        untilTime: (step as unknown as { untilTime?: string }).untilTime,
        cronExpression: (step as unknown as { cronExpression?: string }).cronExpression,
      } as DelayNodeData;
      break;

    case 'merge':
      data = {
        ...baseData,
        errorConfig: commonErrorConfig,
        nodeType: 'merge',
        mergeStrategy: (step as unknown as { mergeStrategy?: string }).mergeStrategy || 'merge',
        inputs: step.inputs,
        outputs: step.outputs,
      } as MergeNodeData;
      break;

    case 'subworkflow':
      data = {
        ...baseData,
        errorConfig: commonErrorConfig,
        nodeType: 'subworkflow',
        workflowId: (step as unknown as { workflowId?: string }).workflowId || '',
        inputMapping: (step as unknown as { inputMapping?: Record<string, string> }).inputMapping || {},
        outputMapping: (step as unknown as { outputMapping?: Record<string, string> }).outputMapping || {},
        inputs: step.inputs,
        outputs: step.outputs,
      } as SubworkflowNodeData;
      break;

    case 'knowledgeRetrieval':
      data = {
        ...baseData,
        errorConfig: commonErrorConfig,
        nodeType: 'knowledgeRetrieval',
        queryVariable: step.queryVariable || null,
        knowledgeBaseIds: step.knowledgeBaseIds || [],
        retrievalMode: step.retrievalMode || 'single',
        topK: step.topK || 3,
        scoreThreshold: step.scoreThreshold || 0,
        rerankingEnabled: step.rerankingEnabled ?? false,
        rerankingModel: step.rerankingModel,
        inputs: step.inputs,
        outputs: step.outputs,
      } as KnowledgeRetrievalNodeData;
      break;

    case 'parameterExtractor':
      data = {
        ...baseData,
        errorConfig: commonErrorConfig,
        nodeType: 'parameterExtractor',
        model: step.model,
        instruction: step.instruction || '',
        inputVariable: step.inputVariable || null,
        parameters: step.parameters || [],
        inputs: step.inputs,
        outputs: step.outputs,
      } as ParameterExtractorNodeData;
      break;

    case 'variableAggregator':
      data = {
        ...baseData,
        errorConfig: commonErrorConfig,
        nodeType: 'variableAggregator',
        variableRefs: step.variableRefs || [],
        aggregationMode: step.aggregationMode || 'merge',
        outputVariableName: step.outputVariableName || 'result',
        inputs: step.inputs,
        outputs: step.outputs,
      } as VariableAggregatorNodeData;
      break;

    case 'questionClassifier':
      data = {
        ...baseData,
        errorConfig: commonErrorConfig,
        nodeType: 'questionClassifier',
        model: step.model,
        inputVariable: step.inputVariable || null,
        classes: step.classes || [],
        inputs: step.inputs,
        outputs: step.outputs,
      } as QuestionClassifierNodeData;
      break;

    case 'templateTransform':
      data = {
        ...baseData,
        errorConfig: commonErrorConfig,
        nodeType: 'templateTransform',
        template: step.template || '',
        variableRefs: step.variableRefs || [],
        outputType: step.outputType || 'string',
        inputs: step.inputs,
        outputs: step.outputs,
      } as TemplateTransformNodeData;
      break;

    case 'chart':
    case 'lineChart':
    case 'barChart':
    case 'pieChart':
    case 'areaChart':
    case 'scatterChart':
    case 'radarChart':
      nodeType = step.type;
      data = {
        ...baseData,
        errorConfig: commonErrorConfig,
        nodeType: step.type,
        chartType: step.chartType || chartNodeTypeToChartType(step.type),
        title: step.title,
        xAxisKey: step.xAxisKey,
        yAxisKey: step.yAxisKey,
        series: step.series || [],
        showLegend: step.showLegend ?? true,
        showGrid: step.showGrid ?? true,
        showTooltip: step.showTooltip ?? true,
        stacked: step.stacked ?? false,
        aspectRatio: step.aspectRatio,
        inputs: step.inputs,
        outputs: step.outputs,
      } as ChartNodeData;
      break;

    default:
      throw new Error(`Unsupported workflow step type for node conversion: ${step.type}`);
  }

  return {
    id: step.id,
    type: nodeType,
    position,
    data,
  } as WorkflowNode;
}

/**
 * Calculate positions for steps based on dependencies
 */
function calculateStepPositions(
  steps: WorkflowStepDefinition[]
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const levels = new Map<string, number>();

  // Calculate levels based on dependencies
  const calculateLevel = (stepId: string, visited: Set<string> = new Set()): number => {
    if (visited.has(stepId)) return 0;
    visited.add(stepId);

    if (levels.has(stepId)) return levels.get(stepId)!;

    const step = steps.find(s => s.id === stepId);
    if (!step || !step.dependencies || step.dependencies.length === 0) {
      levels.set(stepId, 0);
      return 0;
    }

    const maxDepLevel = Math.max(
      ...step.dependencies.map(depId => calculateLevel(depId, visited))
    );
    const level = maxDepLevel + 1;
    levels.set(stepId, level);
    return level;
  };

  steps.forEach(step => calculateLevel(step.id));

  // Group steps by level
  const levelGroups = new Map<number, string[]>();
  steps.forEach(step => {
    const level = levels.get(step.id) || 0;
    const group = levelGroups.get(level) || [];
    group.push(step.id);
    levelGroups.set(level, group);
  });

  // Calculate positions
  const nodeWidth = 200;
  const nodeHeight = 80;
  const horizontalGap = 50;
  const verticalGap = 100;
  const startY = 150;

  levelGroups.forEach((stepIds, level) => {
    const totalWidth = stepIds.length * (nodeWidth + horizontalGap) - horizontalGap;
    const startX = (800 - totalWidth) / 2;

    stepIds.forEach((stepId, index) => {
      positions[stepId] = {
        x: startX + index * (nodeWidth + horizontalGap),
        y: startY + level * (nodeHeight + verticalGap),
      };
    });
  });

  return positions;
}

/**
 * Find steps that have no dependents (last steps in the workflow)
 */
function findLastSteps(steps: WorkflowStepDefinition[]): string[] {
  const hasDependent = new Set<string>();

  steps.forEach(step => {
    if (step.dependencies) {
      step.dependencies.forEach(depId => hasDependent.add(depId));
    }
  });

  return steps.filter(step => !hasDependent.has(step.id)).map(step => step.id);
}

/**
 * Validate a visual workflow
 */
export function validateVisualWorkflow(workflow: VisualWorkflow): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for start node
  const startNodes = workflow.nodes.filter(n => n.type === 'start');
  if (startNodes.length === 0) {
    errors.push('Workflow must have a start node');
  } else if (startNodes.length > 1) {
    errors.push('Workflow can only have one start node');
  }

  // Check for end node
  const endNodes = workflow.nodes.filter(n => n.type === 'end');
  if (endNodes.length === 0) {
    errors.push('Workflow must have an end node');
  }

  // Check for disconnected nodes
  const connectedNodes = new Set<string>();
  workflow.edges.forEach(edge => {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  });

  workflow.nodes.forEach(node => {
    if (!connectedNodes.has(node.id) && node.type !== 'start' && node.type !== 'end') {
      warnings.push(`Node "${node.data.label}" is not connected`);
    }
  });

  // Check for unconfigured nodes
  workflow.nodes.forEach(node => {
    if (!node.data.isConfigured && node.type !== 'start' && node.type !== 'end') {
      warnings.push(`Node "${node.data.label}" is not configured`);
    }
  });

  // Check for circular dependencies
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const hasCycle = (nodeId: string): boolean => {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const outgoingEdges = workflow.edges.filter(e => e.source === nodeId);
    for (const edge of outgoingEdges) {
      if (!visited.has(edge.target)) {
        if (hasCycle(edge.target)) return true;
      } else if (recursionStack.has(edge.target)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  };

  for (const node of workflow.nodes) {
    if (!visited.has(node.id)) {
      if (hasCycle(node.id)) {
        errors.push('Workflow contains circular dependencies');
        break;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

const workflowConverter = {
  visualToDefinition,
  definitionToVisual,
  validateVisualWorkflow,
};

export default workflowConverter;
