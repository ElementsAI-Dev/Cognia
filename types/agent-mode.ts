/**
 * Agent Mode type definitions
 * Defines different agent sub-modes like web design, code generation, etc.
 */

export type AgentModeType = 
  | 'general'      // General purpose agent
  | 'web-design'   // Web page designer mode
  | 'code-gen'     // Code generation mode
  | 'data-analysis'// Data analysis mode
  | 'writing'      // Writing assistant mode
  | 'research'     // Research assistant mode
  | 'custom';      // Custom user-defined mode

export interface AgentModeConfig {
  id: string;
  type: AgentModeType;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  systemPrompt?: string;
  tools?: string[]; // Available tools for this mode
  outputFormat?: 'text' | 'code' | 'html' | 'react' | 'markdown';
  previewEnabled?: boolean;
  customConfig?: Record<string, unknown>;
}

export interface CustomAgentMode extends AgentModeConfig {
  type: 'custom';
  createdAt: Date;
  updatedAt: Date;
  isBuiltIn: false;
}

// Built-in agent modes
export const BUILT_IN_AGENT_MODES: AgentModeConfig[] = [
  {
    id: 'general',
    type: 'general',
    name: 'General Assistant',
    description: 'General purpose AI assistant for various tasks',
    icon: 'Bot',
    outputFormat: 'text',
    previewEnabled: false,
  },
  {
    id: 'web-design',
    type: 'web-design',
    name: 'Web Designer',
    description: 'Design and build web pages with live preview',
    icon: 'Layout',
    systemPrompt: `You are an expert web designer and React developer. When the user asks you to create or modify a web page:
1. Generate clean, modern React code with Tailwind CSS
2. Use semantic HTML and accessible components
3. Follow best practices for responsive design
4. Output the complete component code that can be previewed immediately

Always wrap your code in a single App component that can be rendered directly.`,
    tools: ['code_interpreter', 'web_preview'],
    outputFormat: 'react',
    previewEnabled: true,
  },
  {
    id: 'code-gen',
    type: 'code-gen',
    name: 'Code Generator',
    description: 'Generate and explain code in various languages',
    icon: 'Code2',
    systemPrompt: `You are an expert programmer. When generating code:
1. Write clean, well-documented code
2. Follow language-specific best practices
3. Include error handling where appropriate
4. Explain complex logic with comments`,
    tools: ['code_interpreter'],
    outputFormat: 'code',
    previewEnabled: false,
  },
  {
    id: 'data-analysis',
    type: 'data-analysis',
    name: 'Data Analyst',
    description: 'Analyze data and create visualizations',
    icon: 'BarChart3',
    systemPrompt: `You are a data analysis expert. Help users:
1. Understand and clean their data
2. Perform statistical analysis
3. Create meaningful visualizations
4. Draw insights from the data`,
    tools: ['code_interpreter', 'file_reader'],
    outputFormat: 'markdown',
    previewEnabled: true,
  },
  {
    id: 'writing',
    type: 'writing',
    name: 'Writing Assistant',
    description: 'Help with writing, editing, and content creation',
    icon: 'PenTool',
    systemPrompt: `You are a professional writing assistant. Help users:
1. Write clear, engaging content
2. Edit and improve existing text
3. Adapt tone and style as needed
4. Ensure proper grammar and structure`,
    outputFormat: 'markdown',
    previewEnabled: false,
  },
  {
    id: 'research',
    type: 'research',
    name: 'Research Assistant',
    description: 'Help with research and information gathering',
    icon: 'Search',
    systemPrompt: `You are a research assistant. Help users:
1. Find and synthesize information
2. Analyze sources critically
3. Summarize complex topics
4. Provide citations when possible`,
    tools: ['web_search'],
    outputFormat: 'markdown',
    previewEnabled: false,
  },
];

// Get agent mode by ID
export function getAgentMode(id: string): AgentModeConfig | undefined {
  return BUILT_IN_AGENT_MODES.find(mode => mode.id === id);
}

// Get agent mode by type
export function getAgentModeByType(type: AgentModeType): AgentModeConfig | undefined {
  return BUILT_IN_AGENT_MODES.find(mode => mode.type === type);
}
