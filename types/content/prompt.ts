/**
 * Prompt optimization type definitions
 */

export type PromptOptimizationStyle =
  | 'concise' // 简洁风格
  | 'detailed' // 详细风格
  | 'creative' // 创意风格
  | 'professional' // 专业风格
  | 'academic' // 学术风格
  | 'technical' // 技术风格
  | 'step-by-step' // 逐步推理风格 (Chain-of-Thought)
  | 'structured' // 结构化输出风格
  | 'custom'; // 自定义风格

export interface PromptOptimizationConfig {
  style: PromptOptimizationStyle;
  targetModel?: string;
  targetProvider?: string;
  customPrompt?: string;
  preserveIntent: boolean;
  enhanceClarity: boolean;
  addContext: boolean;
}

export interface OptimizedPrompt {
  original: string;
  optimized: string;
  style: PromptOptimizationStyle;
  improvements: string[];
  model: string;
  provider: string;
}

export interface PromptOptimizationPreset {
  id: string;
  name: string;
  description: string;
  style: PromptOptimizationStyle;
  customPrompt?: string;
  isDefault?: boolean;
}

export const DEFAULT_OPTIMIZATION_PRESETS: PromptOptimizationPreset[] = [
  {
    id: 'concise',
    name: 'Concise',
    description: 'Make the prompt shorter and more direct',
    style: 'concise',
    isDefault: true,
  },
  {
    id: 'detailed',
    name: 'Detailed',
    description: 'Add more context and specificity',
    style: 'detailed',
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Encourage creative and imaginative responses',
    style: 'creative',
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Formal and business-appropriate language',
    style: 'professional',
  },
  {
    id: 'academic',
    name: 'Academic',
    description: 'Scholarly and research-oriented style',
    style: 'academic',
  },
  {
    id: 'technical',
    name: 'Technical',
    description: 'Precise technical language for developers',
    style: 'technical',
  },
  {
    id: 'step-by-step',
    name: 'Step-by-Step',
    description: 'Add chain-of-thought reasoning structure',
    style: 'step-by-step',
  },
  {
    id: 'structured',
    name: 'Structured Output',
    description: 'Specify clear output format and constraints',
    style: 'structured',
  },
];

/** Prompt optimization mode */
export type PromptOptimizationMode = 'local' | 'mcp';

/** MCP prompt optimization result */
export interface McpOptimizedPrompt {
  original: string;
  optimized: string;
  improvements: string[];
  mode: 'mcp';
  serverName: string;
}

/** Privacy consent state for MCP prompt optimization */
export interface McpPrivacyConsent {
  accepted: boolean;
  acceptedAt?: number;
  dontAskAgain?: boolean;
}

export const MCP_PRIVACY_CONSENT_KEY = 'cognia-mcp-prompt-privacy-consent';

/** Optimization history entry */
export interface PromptOptimizationHistoryEntry {
  id: string;
  original: string;
  optimized: string;
  mode: PromptOptimizationMode;
  style?: PromptOptimizationStyle;
  serverName?: string;
  improvements: string[];
  timestamp: number;
}

export const PROMPT_OPTIMIZATION_HISTORY_KEY = 'cognia-prompt-optimization-history';
export const MAX_OPTIMIZATION_HISTORY = 20;
