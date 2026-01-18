/**
 * Tool Prompts - Tool usage guidance and examples
 */

export type ToolCategory =
  | 'search'
  | 'scraping'
  | 'calculation'
  | 'code'
  | 'file'
  | 'memory'
  | 'artifact'
  | 'environment'
  | 'mcp'
  | 'rag';

interface ToolCategoryConfig {
  name: string;
  description: string;
  whenToUse: string[];
  bestPractices: string[];
  examples?: string[];
}

const TOOL_CATEGORY_CONFIGS: Record<ToolCategory, ToolCategoryConfig> = {
  search: {
    name: 'Web Search Tools',
    description: 'Tools for searching the internet for current information.',
    whenToUse: [
      'When you need up-to-date information',
      'When the user asks about current events or news',
      'When you need to verify facts',
      'When looking for specific websites or resources',
    ],
    bestPractices: [
      'Use specific, targeted search queries',
      'Combine multiple searches for comprehensive research',
      'Verify information from multiple sources',
    ],
    examples: [
      'web_search(query="latest AI developments 2024")',
      'search_and_scrape(query="Python best practices", max_results=3)',
    ],
  },
  scraping: {
    name: 'Web Scraping Tools',
    description: 'Tools for extracting content from web pages.',
    whenToUse: [
      'When you need the full content of a specific webpage',
      'When search snippets are insufficient',
      'When analyzing website content',
    ],
    bestPractices: [
      'Use dynamic mode for JavaScript-heavy sites',
      'Extract only the content you need',
      'Respect rate limits and robots.txt',
    ],
  },
  calculation: {
    name: 'Calculation Tools',
    description: 'Tools for mathematical computations.',
    whenToUse: [
      'For any mathematical calculations',
      'Unit conversions',
      'Complex expressions',
    ],
    bestPractices: [
      'Show your work for complex calculations',
      'Verify results for critical calculations',
    ],
  },
  code: {
    name: 'Code Execution Tools',
    description: 'Tools for running code.',
    whenToUse: [
      'When you need to test code',
      'For data processing tasks',
      'When calculations require programming',
    ],
    bestPractices: [
      'Use safe, sandboxed execution',
      'Handle errors gracefully',
      'Limit execution time',
    ],
  },
  file: {
    name: 'File Management Tools',
    description: 'Tools for reading, writing, and managing files.',
    whenToUse: [
      'When the user asks to create or modify files',
      'When analyzing file contents',
      'When organizing files and directories',
    ],
    bestPractices: [
      'Always confirm before deleting files',
      'Use appropriate file paths',
      'Handle large files carefully',
    ],
  },
  memory: {
    name: 'Memory Tools',
    description: 'Tools for persistent memory storage and recall.',
    whenToUse: [
      'When information should persist across conversations',
      'When storing user preferences',
      'When building up knowledge over time',
    ],
    bestPractices: [
      'Use descriptive keys for memories',
      'Add relevant tags for searchability',
      'Clean up outdated memories',
    ],
  },
  artifact: {
    name: 'Artifact Tools',
    description: 'Tools for creating rich, interactive content.',
    whenToUse: [
      'When creating code examples for the user',
      'When generating diagrams or visualizations',
      'When creating interactive UI components',
    ],
    bestPractices: [
      'Choose the appropriate artifact type',
      'Provide descriptive titles',
      'Use auto-render for immediate display',
    ],
  },
  environment: {
    name: 'Environment Tools',
    description: 'Tools for managing Python virtual environments.',
    whenToUse: [
      'When setting up Python projects',
      'When installing packages',
      'When running Python scripts',
    ],
    bestPractices: [
      'Use uv for faster environment creation',
      'Pin package versions for reproducibility',
      'Clean up unused environments',
    ],
  },
  mcp: {
    name: 'MCP Tools',
    description: 'External tools from MCP servers.',
    whenToUse: [
      'When specialized functionality is needed',
      'When interacting with external services',
    ],
    bestPractices: [
      'Understand tool capabilities before use',
      'Handle errors from external services',
    ],
  },
  rag: {
    name: 'RAG Search Tools',
    description: 'Tools for searching knowledge bases.',
    whenToUse: [
      'When searching internal documents',
      'When the user has uploaded content',
      'When context from previous conversations is needed',
    ],
    bestPractices: [
      'Use specific search queries',
      'Combine with web search when needed',
    ],
  },
};

/**
 * Get guidance prompt for a tool category
 */
export function getToolCategoryPrompt(category: ToolCategory): string {
  const config = TOOL_CATEGORY_CONFIGS[category];

  let prompt = `## ${config.name}\n\n${config.description}\n\n`;
  prompt += `**When to use:**\n${config.whenToUse.map(w => `- ${w}`).join('\n')}\n\n`;
  prompt += `**Best practices:**\n${config.bestPractices.map(p => `- ${p}`).join('\n')}`;

  if (config.examples && config.examples.length > 0) {
    prompt += `\n\n**Examples:**\n${config.examples.map(e => `- \`${e}\``).join('\n')}`;
  }

  return prompt;
}

/**
 * Get a combined tool guidance prompt for multiple categories
 */
export function getToolGuidancePrompt(categories: ToolCategory[]): string {
  return categories.map(getToolCategoryPrompt).join('\n\n---\n\n');
}

/**
 * Get usage examples for a tool category
 */
export function getToolUsageExamples(category: ToolCategory): string[] {
  return TOOL_CATEGORY_CONFIGS[category].examples || [];
}

/**
 * Get all available tool categories
 */
export function getAllToolCategories(): ToolCategory[] {
  return Object.keys(TOOL_CATEGORY_CONFIGS) as ToolCategory[];
}

export default getToolGuidancePrompt;
