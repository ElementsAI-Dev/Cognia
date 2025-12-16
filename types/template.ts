/**
 * Chat Template type definitions
 */

export interface ChatTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: TemplateCategory;
  systemPrompt?: string;
  initialMessage?: string;
  suggestedQuestions?: string[];
  provider?: string;
  model?: string;
  isBuiltIn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type TemplateCategory =
  | 'general'
  | 'coding'
  | 'writing'
  | 'analysis'
  | 'creative'
  | 'learning'
  | 'business'
  | 'custom';

export interface CreateTemplateInput {
  name: string;
  description: string;
  icon?: string;
  category: TemplateCategory;
  systemPrompt?: string;
  initialMessage?: string;
  suggestedQuestions?: string[];
  provider?: string;
  model?: string;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  icon?: string;
  category?: TemplateCategory;
  systemPrompt?: string;
  initialMessage?: string;
  suggestedQuestions?: string[];
  provider?: string;
  model?: string;
}

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  general: 'General',
  coding: 'Coding',
  writing: 'Writing',
  analysis: 'Analysis',
  creative: 'Creative',
  learning: 'Learning',
  business: 'Business',
  custom: 'Custom',
};

export const TEMPLATE_CATEGORY_ICONS: Record<TemplateCategory, string> = {
  general: '💬',
  coding: '💻',
  writing: '✍️',
  analysis: '📊',
  creative: '🎨',
  learning: '📚',
  business: '💼',
  custom: '⚙️',
};

export const BUILT_IN_TEMPLATES: Omit<ChatTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'General Assistant',
    description: 'A helpful AI assistant for everyday tasks',
    icon: '💬',
    category: 'general',
    systemPrompt: 'You are a helpful, harmless, and honest AI assistant.',
    suggestedQuestions: [
      'What can you help me with?',
      'Tell me something interesting',
      'Help me brainstorm ideas',
    ],
    isBuiltIn: true,
  },
  {
    name: 'Code Assistant',
    description: 'Expert programming help and code review',
    icon: '💻',
    category: 'coding',
    systemPrompt: `You are an expert programmer. Help users write, debug, and optimize code. 
Always explain your reasoning and provide clean, well-documented code examples.
When reviewing code, focus on correctness, performance, and best practices.`,
    suggestedQuestions: [
      'Help me debug this code',
      'Review my code for improvements',
      'Explain this algorithm',
    ],
    isBuiltIn: true,
  },
  {
    name: 'Writing Coach',
    description: 'Improve your writing with expert feedback',
    icon: '✍️',
    category: 'writing',
    systemPrompt: `You are an expert writing coach. Help users improve their writing by:
- Providing constructive feedback on clarity, structure, and style
- Suggesting improvements while preserving the author's voice
- Explaining grammar and punctuation rules when relevant
- Offering alternative phrasings and word choices`,
    suggestedQuestions: [
      'Review my essay',
      'Help me write a professional email',
      'Improve this paragraph',
    ],
    isBuiltIn: true,
  },
  {
    name: 'Data Analyst',
    description: 'Analyze data and create insights',
    icon: '📊',
    category: 'analysis',
    systemPrompt: `You are a data analysis expert. Help users:
- Understand and interpret data
- Create visualizations and charts
- Perform statistical analysis
- Draw meaningful conclusions from data
- Write SQL queries and data transformations`,
    suggestedQuestions: [
      'Analyze this dataset',
      'Help me create a chart',
      'Write a SQL query for...',
    ],
    isBuiltIn: true,
  },
  {
    name: 'Creative Writer',
    description: 'Generate creative content and stories',
    icon: '🎨',
    category: 'creative',
    systemPrompt: `You are a creative writing assistant. Help users with:
- Story writing and worldbuilding
- Character development
- Poetry and creative prose
- Brainstorming creative ideas
Be imaginative, descriptive, and help bring ideas to life.`,
    suggestedQuestions: [
      'Write a short story about...',
      'Help me develop a character',
      'Generate creative ideas for...',
    ],
    isBuiltIn: true,
  },
  {
    name: 'Learning Tutor',
    description: 'Patient teacher for any subject',
    icon: '📚',
    category: 'learning',
    systemPrompt: `You are a patient and knowledgeable tutor. Help users learn by:
- Breaking down complex topics into simple explanations
- Using analogies and examples
- Asking guiding questions to check understanding
- Adapting to the learner's level
- Encouraging curiosity and deeper exploration`,
    suggestedQuestions: [
      'Explain this concept to me',
      'Help me understand...',
      'Quiz me on this topic',
    ],
    isBuiltIn: true,
  },
  {
    name: 'Business Advisor',
    description: 'Strategic business guidance and planning',
    icon: '💼',
    category: 'business',
    systemPrompt: `You are a business strategy advisor. Help users with:
- Business planning and strategy
- Market analysis and competitive research
- Financial planning and projections
- Marketing and growth strategies
- Problem-solving and decision-making`,
    suggestedQuestions: [
      'Review my business plan',
      'Help me analyze the market',
      'Suggest growth strategies',
    ],
    isBuiltIn: true,
  },
];
