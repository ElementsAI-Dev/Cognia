/**
 * Workflow Editor Templates
 * Pre-built workflow templates for common use cases
 */

import type { WorkflowEditorTemplate, VisualWorkflow, StartNodeData, EndNodeData, AINodeData } from '@/types/workflow-editor';

/**
 * Create a basic workflow template
 */
function createTemplate(
  id: string,
  name: string,
  description: string,
  category: string,
  icon: string,
  tags: string[],
  workflow: Partial<VisualWorkflow>
): WorkflowEditorTemplate {
  const now = new Date();
  
  const defaultWorkflow: VisualWorkflow = {
    id: `template-${id}`,
    name,
    description,
    type: 'custom',
    version: '1.0.0',
    icon,
    category,
    tags,
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    inputs: {},
    outputs: {},
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
    createdAt: now,
    updatedAt: now,
    isTemplate: true,
    ...workflow,
  };

  return {
    id,
    name,
    description,
    category,
    icon,
    tags,
    workflow: defaultWorkflow,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Simple AI Chat Template
 */
const simpleChatTemplate = createTemplate(
  'simple-chat',
  'Simple AI Chat',
  'A basic workflow with a single AI step',
  'basic',
  'MessageSquare',
  ['chat', 'simple', 'ai'],
  {
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 300, y: 50 },
        data: {
          label: 'Start',
          nodeType: 'start',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          workflowInputs: {
            message: { type: 'string', description: 'User message' },
          },
        } as StartNodeData,
      },
      {
        id: 'ai-1',
        type: 'ai',
        position: { x: 300, y: 180 },
        data: {
          label: 'AI Response',
          nodeType: 'ai',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          aiPrompt: 'Respond to the user message: {{input.message}}',
          inputs: {
            message: { type: 'string', description: 'User message' },
          },
          outputs: {
            result: { type: 'string', description: 'AI response' },
          },
          temperature: 0.7,
          responseFormat: 'text',
        } as AINodeData,
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 300, y: 310 },
        data: {
          label: 'End',
          nodeType: 'end',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          workflowOutputs: {
            response: { type: 'string', description: 'AI response' },
          },
          outputMapping: { response: 'ai-1.result' },
        } as EndNodeData,
      },
    ],
    edges: [
      { id: 'edge-1', source: 'start-1', target: 'ai-1', type: 'default', data: {} },
      { id: 'edge-2', source: 'ai-1', target: 'end-1', type: 'default', data: {} },
    ],
    inputs: {
      message: { type: 'string', description: 'User message' },
    },
    outputs: {
      response: { type: 'string', description: 'AI response' },
    },
  }
);

/**
 * Multi-step Analysis Template
 */
const multiStepAnalysisTemplate = createTemplate(
  'multi-step-analysis',
  'Multi-step Analysis',
  'Analyze content in multiple steps with different perspectives',
  'analysis',
  'Search',
  ['analysis', 'multi-step', 'ai'],
  {
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 300, y: 50 },
        data: {
          label: 'Start',
          nodeType: 'start',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          workflowInputs: {
            content: { type: 'string', description: 'Content to analyze' },
          },
        } as StartNodeData,
      },
      {
        id: 'ai-summary',
        type: 'ai',
        position: { x: 300, y: 180 },
        data: {
          label: 'Summarize',
          nodeType: 'ai',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          aiPrompt: 'Summarize the following content in 2-3 sentences:\n\n{{input.content}}',
          inputs: { content: { type: 'string', description: 'Content' } },
          outputs: { result: { type: 'string', description: 'Summary' } },
          temperature: 0.5,
          responseFormat: 'text',
        } as AINodeData,
      },
      {
        id: 'ai-insights',
        type: 'ai',
        position: { x: 300, y: 310 },
        data: {
          label: 'Extract Insights',
          nodeType: 'ai',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          aiPrompt: 'Based on this summary, extract 3-5 key insights:\n\n{{ai-summary.result}}',
          inputs: { summary: { type: 'string', description: 'Summary' } },
          outputs: { result: { type: 'string', description: 'Insights' } },
          temperature: 0.7,
          responseFormat: 'text',
        } as AINodeData,
      },
      {
        id: 'ai-recommendations',
        type: 'ai',
        position: { x: 300, y: 440 },
        data: {
          label: 'Generate Recommendations',
          nodeType: 'ai',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          aiPrompt: 'Based on these insights, provide actionable recommendations:\n\n{{ai-insights.result}}',
          inputs: { insights: { type: 'string', description: 'Insights' } },
          outputs: { result: { type: 'string', description: 'Recommendations' } },
          temperature: 0.7,
          responseFormat: 'text',
        } as AINodeData,
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 300, y: 570 },
        data: {
          label: 'End',
          nodeType: 'end',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          workflowOutputs: {
            summary: { type: 'string', description: 'Summary' },
            insights: { type: 'string', description: 'Insights' },
            recommendations: { type: 'string', description: 'Recommendations' },
          },
          outputMapping: {},
        } as EndNodeData,
      },
    ],
    edges: [
      { id: 'edge-1', source: 'start-1', target: 'ai-summary', type: 'default', data: {} },
      { id: 'edge-2', source: 'ai-summary', target: 'ai-insights', type: 'default', data: {} },
      { id: 'edge-3', source: 'ai-insights', target: 'ai-recommendations', type: 'default', data: {} },
      { id: 'edge-4', source: 'ai-recommendations', target: 'end-1', type: 'default', data: {} },
    ],
  }
);

/**
 * Conditional Workflow Template
 */
const conditionalTemplate = createTemplate(
  'conditional-workflow',
  'Conditional Workflow',
  'A workflow with conditional branching based on input',
  'advanced',
  'GitBranch',
  ['conditional', 'branching', 'advanced'],
  {
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 300, y: 50 },
        data: {
          label: 'Start',
          nodeType: 'start',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          workflowInputs: {
            type: { type: 'string', description: 'Request type (question/task)' },
            content: { type: 'string', description: 'Content' },
          },
        } as StartNodeData,
      },
      {
        id: 'condition-1',
        type: 'conditional',
        position: { x: 300, y: 180 },
        data: {
          label: 'Check Type',
          nodeType: 'conditional',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          condition: 'input.type === "question"',
          conditionType: 'expression',
          inputs: { type: { type: 'string', description: 'Type' } },
        },
      },
      {
        id: 'ai-question',
        type: 'ai',
        position: { x: 100, y: 310 },
        data: {
          label: 'Answer Question',
          nodeType: 'ai',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          aiPrompt: 'Answer this question:\n\n{{input.content}}',
          inputs: { content: { type: 'string', description: 'Question' } },
          outputs: { result: { type: 'string', description: 'Answer' } },
          temperature: 0.7,
          responseFormat: 'text',
        } as AINodeData,
      },
      {
        id: 'ai-task',
        type: 'ai',
        position: { x: 500, y: 310 },
        data: {
          label: 'Execute Task',
          nodeType: 'ai',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          aiPrompt: 'Execute this task and provide the result:\n\n{{input.content}}',
          inputs: { content: { type: 'string', description: 'Task' } },
          outputs: { result: { type: 'string', description: 'Result' } },
          temperature: 0.7,
          responseFormat: 'text',
        } as AINodeData,
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 300, y: 440 },
        data: {
          label: 'End',
          nodeType: 'end',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          workflowOutputs: {
            result: { type: 'string', description: 'Result' },
          },
          outputMapping: {},
        } as EndNodeData,
      },
    ],
    edges: [
      { id: 'edge-1', source: 'start-1', target: 'condition-1', type: 'default', data: {} },
      { id: 'edge-2', source: 'condition-1', sourceHandle: 'true', target: 'ai-question', type: 'default', data: { label: 'Question' } },
      { id: 'edge-3', source: 'condition-1', sourceHandle: 'false', target: 'ai-task', type: 'default', data: { label: 'Task' } },
      { id: 'edge-4', source: 'ai-question', target: 'end-1', type: 'default', data: {} },
      { id: 'edge-5', source: 'ai-task', target: 'end-1', type: 'default', data: {} },
    ],
  }
);

/**
 * Data Processing Template
 */
const dataProcessingTemplate = createTemplate(
  'data-processing',
  'Data Processing',
  'Process and transform data with multiple steps',
  'data',
  'Database',
  ['data', 'processing', 'transform'],
  {
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 300, y: 50 },
        data: {
          label: 'Start',
          nodeType: 'start',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          workflowInputs: {
            data: { type: 'string', description: 'Input data (JSON)' },
          },
        } as StartNodeData,
      },
      {
        id: 'code-parse',
        type: 'code',
        position: { x: 300, y: 180 },
        data: {
          label: 'Parse Data',
          nodeType: 'code',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          language: 'javascript',
          code: '// Parse input data\nconst parsed = JSON.parse(input.data);\nreturn { parsed };',
          inputs: { data: { type: 'string', description: 'Raw data' } },
          outputs: { parsed: { type: 'object', description: 'Parsed data' } },
        },
      },
      {
        id: 'ai-analyze',
        type: 'ai',
        position: { x: 300, y: 310 },
        data: {
          label: 'Analyze Data',
          nodeType: 'ai',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          aiPrompt: 'Analyze this data and provide insights:\n\n{{code-parse.parsed}}',
          inputs: { data: { type: 'object', description: 'Parsed data' } },
          outputs: { result: { type: 'string', description: 'Analysis' } },
          temperature: 0.5,
          responseFormat: 'json',
        } as AINodeData,
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 300, y: 440 },
        data: {
          label: 'End',
          nodeType: 'end',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          workflowOutputs: {
            analysis: { type: 'string', description: 'Analysis result' },
          },
          outputMapping: {},
        } as EndNodeData,
      },
    ],
    edges: [
      { id: 'edge-1', source: 'start-1', target: 'code-parse', type: 'default', data: {} },
      { id: 'edge-2', source: 'code-parse', target: 'ai-analyze', type: 'default', data: {} },
      { id: 'edge-3', source: 'ai-analyze', target: 'end-1', type: 'default', data: {} },
    ],
  }
);

/**
 * All available templates
 */
export const workflowEditorTemplates: WorkflowEditorTemplate[] = [
  simpleChatTemplate,
  multiStepAnalysisTemplate,
  conditionalTemplate,
  dataProcessingTemplate,
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): WorkflowEditorTemplate | undefined {
  return workflowEditorTemplates.find(t => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): WorkflowEditorTemplate[] {
  return workflowEditorTemplates.filter(t => t.category === category);
}

/**
 * Get all template categories
 */
export function getTemplateCategories(): string[] {
  return [...new Set(workflowEditorTemplates.map(t => t.category))];
}

export default workflowEditorTemplates;
