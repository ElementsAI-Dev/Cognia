/**
 * Prompt optimization type definitions
 */

export type PromptOptimizationStyle =
  | 'concise'      // 简洁风格
  | 'detailed'     // 详细风格
  | 'creative'     // 创意风格
  | 'professional' // 专业风格
  | 'academic'     // 学术风格
  | 'technical'    // 技术风格
  | 'custom';      // 自定义风格

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
];

export const STYLE_SYSTEM_PROMPTS: Record<PromptOptimizationStyle, string> = {
  concise: `You are a prompt optimization expert. Your task is to make the given prompt more concise and direct while preserving its core intent. Remove unnecessary words, simplify complex sentences, and focus on the essential request. Output only the optimized prompt without any explanation.`,
  
  detailed: `You are a prompt optimization expert. Your task is to enhance the given prompt by adding relevant context, specific requirements, and clear expectations. Make the prompt more comprehensive while keeping it focused. Include format preferences if applicable. Output only the optimized prompt without any explanation.`,
  
  creative: `You are a prompt optimization expert. Your task is to transform the given prompt to encourage creative, imaginative, and innovative responses. Add elements that inspire unique perspectives and unconventional thinking. Output only the optimized prompt without any explanation.`,
  
  professional: `You are a prompt optimization expert. Your task is to refine the given prompt using formal, business-appropriate language. Ensure clarity, professionalism, and appropriate tone for workplace communication. Output only the optimized prompt without any explanation.`,
  
  academic: `You are a prompt optimization expert. Your task is to transform the given prompt into scholarly, research-oriented language. Include requests for citations, evidence-based reasoning, and academic rigor where appropriate. Output only the optimized prompt without any explanation.`,
  
  technical: `You are a prompt optimization expert. Your task is to optimize the given prompt for technical precision. Use accurate terminology, specify technical requirements clearly, and structure the prompt for optimal code or technical output. Output only the optimized prompt without any explanation.`,
  
  custom: `You are a prompt optimization expert. Follow the custom instructions provided to optimize the given prompt. Output only the optimized prompt without any explanation.`,
};
