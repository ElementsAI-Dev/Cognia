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
 * Content Translation Template
 */
const contentTranslationTemplate = createTemplate(
  'content-translation',
  'Content Translation',
  'Translate content between languages with quality check',
  'translation',
  'Languages',
  ['translation', 'multilingual', 'ai'],
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
            content: { type: 'string', description: 'Content to translate' },
            targetLanguage: { type: 'string', description: 'Target language (e.g., Chinese, Spanish)' },
          },
        } as StartNodeData,
      },
      {
        id: 'ai-translate',
        type: 'ai',
        position: { x: 300, y: 180 },
        data: {
          label: 'Translate Content',
          nodeType: 'ai',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          aiPrompt: 'Translate the following content to {{input.targetLanguage}}. Maintain the original tone and meaning:\n\n{{input.content}}',
          inputs: {
            content: { type: 'string', description: 'Content' },
            targetLanguage: { type: 'string', description: 'Target language' },
          },
          outputs: { result: { type: 'string', description: 'Translated content' } },
          temperature: 0.3,
          responseFormat: 'text',
        } as AINodeData,
      },
      {
        id: 'ai-quality-check',
        type: 'ai',
        position: { x: 300, y: 310 },
        data: {
          label: 'Quality Check',
          nodeType: 'ai',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          aiPrompt: 'Review this translation for accuracy and naturalness. Provide a quality score (1-10) and suggestions if needed:\n\nOriginal: {{input.content}}\n\nTranslation: {{ai-translate.result}}',
          inputs: { translation: { type: 'string', description: 'Translation' } },
          outputs: { result: { type: 'string', description: 'Quality assessment' } },
          temperature: 0.5,
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
            translation: { type: 'string', description: 'Translated content' },
            qualityReport: { type: 'string', description: 'Quality assessment' },
          },
          outputMapping: {},
        } as EndNodeData,
      },
    ],
    edges: [
      { id: 'edge-1', source: 'start-1', target: 'ai-translate', type: 'default', data: {} },
      { id: 'edge-2', source: 'ai-translate', target: 'ai-quality-check', type: 'default', data: {} },
      { id: 'edge-3', source: 'ai-quality-check', target: 'end-1', type: 'default', data: {} },
    ],
  }
);

/**
 * Document Summarization Template
 */
const documentSummarizationTemplate = createTemplate(
  'document-summarization',
  'Document Summarization',
  'Create different types of summaries for a document',
  'analysis',
  'FileText',
  ['summary', 'document', 'ai'],
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
            document: { type: 'string', description: 'Document content to summarize' },
          },
        } as StartNodeData,
      },
      {
        id: 'ai-executive',
        type: 'ai',
        position: { x: 100, y: 200 },
        data: {
          label: 'Executive Summary',
          nodeType: 'ai',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          aiPrompt: 'Create a concise executive summary (2-3 sentences) of this document:\n\n{{input.document}}',
          inputs: { document: { type: 'string', description: 'Document' } },
          outputs: { result: { type: 'string', description: 'Executive summary' } },
          temperature: 0.5,
          responseFormat: 'text',
        } as AINodeData,
      },
      {
        id: 'ai-bullets',
        type: 'ai',
        position: { x: 300, y: 200 },
        data: {
          label: 'Key Points',
          nodeType: 'ai',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          aiPrompt: 'Extract 5-7 key points from this document as bullet points:\n\n{{input.document}}',
          inputs: { document: { type: 'string', description: 'Document' } },
          outputs: { result: { type: 'string', description: 'Key points' } },
          temperature: 0.5,
          responseFormat: 'text',
        } as AINodeData,
      },
      {
        id: 'ai-detailed',
        type: 'ai',
        position: { x: 500, y: 200 },
        data: {
          label: 'Detailed Summary',
          nodeType: 'ai',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          aiPrompt: 'Create a detailed summary (1-2 paragraphs) of this document, preserving important details:\n\n{{input.document}}',
          inputs: { document: { type: 'string', description: 'Document' } },
          outputs: { result: { type: 'string', description: 'Detailed summary' } },
          temperature: 0.5,
          responseFormat: 'text',
        } as AINodeData,
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 300, y: 350 },
        data: {
          label: 'End',
          nodeType: 'end',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          workflowOutputs: {
            executive: { type: 'string', description: 'Executive summary' },
            keyPoints: { type: 'string', description: 'Key points' },
            detailed: { type: 'string', description: 'Detailed summary' },
          },
          outputMapping: {},
        } as EndNodeData,
      },
    ],
    edges: [
      { id: 'edge-1', source: 'start-1', target: 'ai-executive', type: 'default', data: {} },
      { id: 'edge-2', source: 'start-1', target: 'ai-bullets', type: 'default', data: {} },
      { id: 'edge-3', source: 'start-1', target: 'ai-detailed', type: 'default', data: {} },
      { id: 'edge-4', source: 'ai-executive', target: 'end-1', type: 'default', data: {} },
      { id: 'edge-5', source: 'ai-bullets', target: 'end-1', type: 'default', data: {} },
      { id: 'edge-6', source: 'ai-detailed', target: 'end-1', type: 'default', data: {} },
    ],
  }
);

/**
 * Email Drafting Template
 */
const emailDraftingTemplate = createTemplate(
  'email-drafting',
  'Email Drafting',
  'Generate professional emails with different tones',
  'writing',
  'Mail',
  ['email', 'writing', 'communication'],
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
            topic: { type: 'string', description: 'Email topic or purpose' },
            context: { type: 'string', description: 'Additional context or details' },
            tone: { type: 'string', description: 'Desired tone (formal/casual/friendly)' },
          },
        } as StartNodeData,
      },
      {
        id: 'ai-draft',
        type: 'ai',
        position: { x: 300, y: 180 },
        data: {
          label: 'Draft Email',
          nodeType: 'ai',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          aiPrompt: 'Write a professional email with a {{input.tone}} tone.\n\nPurpose: {{input.topic}}\nContext: {{input.context}}\n\nInclude a subject line, greeting, body, and closing.',
          inputs: {
            topic: { type: 'string', description: 'Topic' },
            context: { type: 'string', description: 'Context' },
            tone: { type: 'string', description: 'Tone' },
          },
          outputs: { result: { type: 'string', description: 'Email draft' } },
          temperature: 0.7,
          responseFormat: 'text',
        } as AINodeData,
      },
      {
        id: 'ai-review',
        type: 'ai',
        position: { x: 300, y: 310 },
        data: {
          label: 'Review & Polish',
          nodeType: 'ai',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          aiPrompt: 'Review and polish this email draft. Check for grammar, clarity, and professionalism. Return the improved version:\n\n{{ai-draft.result}}',
          inputs: { draft: { type: 'string', description: 'Email draft' } },
          outputs: { result: { type: 'string', description: 'Polished email' } },
          temperature: 0.5,
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
            email: { type: 'string', description: 'Final email' },
          },
          outputMapping: {},
        } as EndNodeData,
      },
    ],
    edges: [
      { id: 'edge-1', source: 'start-1', target: 'ai-draft', type: 'default', data: {} },
      { id: 'edge-2', source: 'ai-draft', target: 'ai-review', type: 'default', data: {} },
      { id: 'edge-3', source: 'ai-review', target: 'end-1', type: 'default', data: {} },
    ],
  }
);

/**
 * Code Review Template
 */
const codeReviewTemplate = createTemplate(
  'code-review',
  'Code Review',
  'Analyze code for quality, bugs, and improvements',
  'development',
  'Code',
  ['code', 'review', 'development'],
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
            code: { type: 'string', description: 'Code to review' },
            language: { type: 'string', description: 'Programming language' },
          },
        } as StartNodeData,
      },
      {
        id: 'ai-bugs',
        type: 'ai',
        position: { x: 150, y: 200 },
        data: {
          label: 'Bug Detection',
          nodeType: 'ai',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          aiPrompt: 'Analyze this {{input.language}} code for potential bugs, errors, and security issues. List each issue with line reference and explanation:\n\n```{{input.language}}\n{{input.code}}\n```',
          inputs: { code: { type: 'string', description: 'Code' } },
          outputs: { result: { type: 'string', description: 'Bug report' } },
          temperature: 0.3,
          responseFormat: 'text',
        } as AINodeData,
      },
      {
        id: 'ai-quality',
        type: 'ai',
        position: { x: 450, y: 200 },
        data: {
          label: 'Quality Analysis',
          nodeType: 'ai',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          aiPrompt: 'Analyze this {{input.language}} code for code quality, readability, and best practices. Provide a score (1-10) and specific suggestions:\n\n```{{input.language}}\n{{input.code}}\n```',
          inputs: { code: { type: 'string', description: 'Code' } },
          outputs: { result: { type: 'string', description: 'Quality analysis' } },
          temperature: 0.5,
          responseFormat: 'text',
        } as AINodeData,
      },
      {
        id: 'ai-summary',
        type: 'ai',
        position: { x: 300, y: 350 },
        data: {
          label: 'Review Summary',
          nodeType: 'ai',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          aiPrompt: 'Create a comprehensive code review summary based on:\n\nBug Report:\n{{ai-bugs.result}}\n\nQuality Analysis:\n{{ai-quality.result}}\n\nProvide prioritized recommendations.',
          inputs: {
            bugs: { type: 'string', description: 'Bug report' },
            quality: { type: 'string', description: 'Quality analysis' },
          },
          outputs: { result: { type: 'string', description: 'Review summary' } },
          temperature: 0.5,
          responseFormat: 'text',
        } as AINodeData,
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 300, y: 480 },
        data: {
          label: 'End',
          nodeType: 'end',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          workflowOutputs: {
            bugs: { type: 'string', description: 'Bug report' },
            quality: { type: 'string', description: 'Quality analysis' },
            summary: { type: 'string', description: 'Review summary' },
          },
          outputMapping: {},
        } as EndNodeData,
      },
    ],
    edges: [
      { id: 'edge-1', source: 'start-1', target: 'ai-bugs', type: 'default', data: {} },
      { id: 'edge-2', source: 'start-1', target: 'ai-quality', type: 'default', data: {} },
      { id: 'edge-3', source: 'ai-bugs', target: 'ai-summary', type: 'default', data: {} },
      { id: 'edge-4', source: 'ai-quality', target: 'ai-summary', type: 'default', data: {} },
      { id: 'edge-5', source: 'ai-summary', target: 'end-1', type: 'default', data: {} },
    ],
  }
);

/**
 * Content Moderation Template
 */
const contentModerationTemplate = createTemplate(
  'content-moderation',
  'Content Moderation',
  'Check content for policy compliance and safety',
  'moderation',
  'Shield',
  ['moderation', 'safety', 'compliance'],
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
            content: { type: 'string', description: 'Content to moderate' },
          },
        } as StartNodeData,
      },
      {
        id: 'ai-safety',
        type: 'ai',
        position: { x: 300, y: 180 },
        data: {
          label: 'Safety Check',
          nodeType: 'ai',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          aiPrompt: 'Analyze this content for safety issues including: violence, hate speech, harassment, adult content, dangerous activities. Return a JSON with categories and severity levels:\n\n{{input.content}}',
          inputs: { content: { type: 'string', description: 'Content' } },
          outputs: { result: { type: 'string', description: 'Safety analysis' } },
          temperature: 0.2,
          responseFormat: 'json',
        } as AINodeData,
      },
      {
        id: 'condition-1',
        type: 'conditional',
        position: { x: 300, y: 310 },
        data: {
          label: 'Is Safe?',
          nodeType: 'conditional',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          condition: '!ai-safety.result.includes("high")',
          conditionType: 'expression',
          inputs: { safetyResult: { type: 'string', description: 'Safety result' } },
        },
      },
      {
        id: 'ai-approve',
        type: 'ai',
        position: { x: 150, y: 440 },
        data: {
          label: 'Approve Content',
          nodeType: 'ai',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          aiPrompt: 'Content passed safety checks. Generate an approval summary:\n\nContent: {{input.content}}\nSafety Report: {{ai-safety.result}}',
          inputs: { content: { type: 'string', description: 'Content' } },
          outputs: { result: { type: 'string', description: 'Approval' } },
          temperature: 0.5,
          responseFormat: 'text',
        } as AINodeData,
      },
      {
        id: 'ai-flag',
        type: 'ai',
        position: { x: 450, y: 440 },
        data: {
          label: 'Flag for Review',
          nodeType: 'ai',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          aiPrompt: 'Content flagged for human review. Generate a detailed report explaining concerns:\n\nContent: {{input.content}}\nSafety Report: {{ai-safety.result}}',
          inputs: { content: { type: 'string', description: 'Content' } },
          outputs: { result: { type: 'string', description: 'Flag report' } },
          temperature: 0.5,
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
            safetyReport: { type: 'string', description: 'Safety analysis' },
            decision: { type: 'string', description: 'Moderation decision' },
          },
          outputMapping: {},
        } as EndNodeData,
      },
    ],
    edges: [
      { id: 'edge-1', source: 'start-1', target: 'ai-safety', type: 'default', data: {} },
      { id: 'edge-2', source: 'ai-safety', target: 'condition-1', type: 'default', data: {} },
      { id: 'edge-3', source: 'condition-1', sourceHandle: 'true', target: 'ai-approve', type: 'default', data: { label: 'Safe' } },
      { id: 'edge-4', source: 'condition-1', sourceHandle: 'false', target: 'ai-flag', type: 'default', data: { label: 'Flagged' } },
      { id: 'edge-5', source: 'ai-approve', target: 'end-1', type: 'default', data: {} },
      { id: 'edge-6', source: 'ai-flag', target: 'end-1', type: 'default', data: {} },
    ],
  }
);

/**
 * Research Assistant Template
 */
const researchAssistantTemplate = createTemplate(
  'research-assistant',
  'Research Assistant',
  'Research a topic and compile findings with sources',
  'research',
  'BookOpen',
  ['research', 'analysis', 'learning'],
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
            topic: { type: 'string', description: 'Research topic or question' },
            depth: { type: 'string', description: 'Research depth (brief/standard/comprehensive)' },
          },
        } as StartNodeData,
      },
      {
        id: 'ai-outline',
        type: 'ai',
        position: { x: 300, y: 180 },
        data: {
          label: 'Create Outline',
          nodeType: 'ai',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          aiPrompt: 'Create a research outline for the topic: {{input.topic}}\n\nDepth level: {{input.depth}}\n\nList 4-6 key aspects to research.',
          inputs: { topic: { type: 'string', description: 'Topic' } },
          outputs: { result: { type: 'string', description: 'Research outline' } },
          temperature: 0.7,
          responseFormat: 'text',
        } as AINodeData,
      },
      {
        id: 'ai-research',
        type: 'ai',
        position: { x: 300, y: 310 },
        data: {
          label: 'Conduct Research',
          nodeType: 'ai',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          aiPrompt: 'Based on this outline, provide detailed research findings for each point:\n\nTopic: {{input.topic}}\nOutline: {{ai-outline.result}}\n\nInclude facts, statistics, and explanations.',
          inputs: { outline: { type: 'string', description: 'Outline' } },
          outputs: { result: { type: 'string', description: 'Research findings' } },
          temperature: 0.5,
          responseFormat: 'text',
        } as AINodeData,
      },
      {
        id: 'ai-compile',
        type: 'ai',
        position: { x: 300, y: 440 },
        data: {
          label: 'Compile Report',
          nodeType: 'ai',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          aiPrompt: 'Compile a well-structured research report:\n\nTopic: {{input.topic}}\nFindings: {{ai-research.result}}\n\nInclude an executive summary, main sections, and conclusion.',
          inputs: { findings: { type: 'string', description: 'Findings' } },
          outputs: { result: { type: 'string', description: 'Research report' } },
          temperature: 0.5,
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
            outline: { type: 'string', description: 'Research outline' },
            findings: { type: 'string', description: 'Research findings' },
            report: { type: 'string', description: 'Final report' },
          },
          outputMapping: {},
        } as EndNodeData,
      },
    ],
    edges: [
      { id: 'edge-1', source: 'start-1', target: 'ai-outline', type: 'default', data: {} },
      { id: 'edge-2', source: 'ai-outline', target: 'ai-research', type: 'default', data: {} },
      { id: 'edge-3', source: 'ai-research', target: 'ai-compile', type: 'default', data: {} },
      { id: 'edge-4', source: 'ai-compile', target: 'end-1', type: 'default', data: {} },
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
  contentTranslationTemplate,
  documentSummarizationTemplate,
  emailDraftingTemplate,
  codeReviewTemplate,
  contentModerationTemplate,
  researchAssistantTemplate,
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
