/**
 * Prompt template domain types
 */

export type PromptTemplateSource = 'builtin' | 'user' | 'mcp' | 'imported';

export type PromptTemplateTarget = 'chat' | 'workflow' | 'agent' | 'ide-rules' | 'mcp' | 'project';

export type PromptTemplateVariableType = 'text' | 'multiline' | 'number' | 'boolean' | 'select';

export interface TemplateVariable {
  name: string;
  description?: string;
  required?: boolean;
  type?: PromptTemplateVariableType;
  options?: string[];
  defaultValue?: string;
  placeholder?: string;
  sampleValue?: string;
}

export interface PromptTemplateMeta {
  icon?: string;
  color?: string;
  author?: string;
  version?: number;
  ruleTargets?: Array<'cursor' | 'windsurf' | 'copilot' | 'cline'>;
  mcp?: {
    serverId?: string;
    promptName?: string;
    arguments?: Record<string, unknown>;
  };
  marketplace?: {
    marketplaceId?: string;
    installedVersion?: string;
  };
}

/**
 * Version history entry for a prompt template
 */
export interface PromptTemplateVersion {
  id: string;
  version: number;
  content: string;
  variables: TemplateVariable[];
  changelog?: string;
  createdAt: Date;
  createdBy?: string;
}

/**
 * Feedback entry for prompt effectiveness tracking
 */
export interface PromptFeedback {
  id: string;
  templateId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  effectiveness: 'excellent' | 'good' | 'average' | 'poor';
  comment?: string;
  context?: {
    model?: string;
    provider?: string;
    inputTokens?: number;
    outputTokens?: number;
    responseTime?: number;
  };
  createdAt: Date;
}

/**
 * Aggregated statistics for a prompt template
 */
export interface PromptTemplateStats {
  totalUses: number;
  successfulUses: number;
  averageRating: number;
  ratingCount: number;
  averageResponseTime?: number;
  lastOptimizedAt?: Date;
  optimizationCount: number;
}

/**
 * Optimization history entry for tracking prompt improvements
 */
export interface PromptOptimizationHistory {
  id: string;
  templateId: string;
  originalContent: string;
  optimizedContent: string;
  style?: string;
  suggestions: string[];
  scores: {
    before: { clarity: number; specificity: number; structure: number; overall: number };
    after: { clarity: number; specificity: number; structure: number; overall: number };
  };
  appliedAt: Date;
  appliedBy?: 'user' | 'auto';
}

/**
 * Optimization recommendation for a template
 */
export interface OptimizationRecommendation {
  templateId: string;
  templateName: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  metrics: {
    usageCount: number;
    averageRating: number;
    successRate: number;
    daysSinceOptimized?: number;
  };
  suggestedActions: string[];
}

/**
 * A/B test configuration for prompt optimization
 */
export interface PromptABTest {
  id: string;
  templateId: string;
  hypothesis?: string;
  variantA: {
    content: string;
    uses: number;
    successRate: number;
    averageRating: number;
  };
  variantB: {
    content: string;
    uses: number;
    successRate: number;
    averageRating: number;
  };
  status: 'running' | 'completed' | 'paused';
  winner?: 'A' | 'B' | 'none';
  startedAt: Date;
  completedAt?: Date;
  minSampleSize: number;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description?: string;
  content: string;
  category?: string;
  tags: string[];
  variables: TemplateVariable[];
  targets?: PromptTemplateTarget[];
  source: PromptTemplateSource;
  meta?: PromptTemplateMeta;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;

  // Version history
  versionHistory?: PromptTemplateVersion[];
  currentVersion?: number;

  // Feedback & Statistics
  stats?: PromptTemplateStats;

  // A/B Testing
  activeABTest?: string;

  // Optimization tracking
  isOptimized?: boolean;
  lastOptimizedContent?: string;
  optimizationSuggestions?: string[];
}

export interface CreatePromptTemplateInput {
  name: string;
  description?: string;
  content: string;
  category?: string;
  tags?: string[];
  variables?: TemplateVariable[];
  targets?: PromptTemplateTarget[];
  source?: PromptTemplateSource;
  meta?: PromptTemplateMeta;
}

export type UpdatePromptTemplateInput = Partial<CreatePromptTemplateInput>;

export const DEFAULT_PROMPT_TEMPLATE_CATEGORIES: string[] = [
  'code-review',
  'documentation',
  'translation',
  'refactoring',
  'debugging',
  'testing',
  'architecture',
  'productivity',
  'creative',
  'custom',
];

export const DEFAULT_PROMPT_TEMPLATES: Array<
  Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>
> = [
  {
    name: 'Code Review - Bug Finder',
    description: 'Review code for correctness issues, edge cases, and regressions.',
    content:
      'You are a meticulous code reviewer. Analyze the provided code for bugs, edge cases, and regressions. Focus on correctness, unsafe patterns, and missing tests. Provide concise findings and suggest specific fixes.\n\nContext:\n{{context}}\n\nCode:\n{{code}}',
    category: 'code-review',
    tags: ['code-review', 'bugs', 'quality'],
    variables: [
      {
        name: 'context',
        description: 'Related requirements or tickets',
        required: false,
        type: 'multiline',
      },
      { name: 'code', description: 'Source code to review', required: true, type: 'multiline' },
    ],
    targets: ['chat', 'agent'],
    source: 'builtin',
    meta: {
      icon: '🕵️',
      color: '#6366f1',
      version: 1,
    },
    usageCount: 0,
    lastUsedAt: undefined,
  },
];
