/**
 * ReAct Prompts - Explicit reasoning format prompts
 */

export type ReActStyle = 'standard' | 'detailed' | 'minimal' | 'cot' | 'disabled';

interface ReActConfig {
  prefix: string;
  format: string;
  example?: string;
}

const REACT_CONFIGS: Record<ReActStyle, ReActConfig> = {
  standard: {
    prefix: 'You are a reasoning agent. For each step, you MUST think explicitly before acting.',
    format: `Format your response as:
Thought: [your reasoning about what to do next]
Action: [tool name and parameters, or "finish" if done]`,
    example: `Example:
Thought: I need to search for information about X
Action: web_search(query="X")`,
  },
  detailed: {
    prefix: 'You are a reasoning agent. Use explicit step-by-step reasoning with observations.',
    format: `Format your response as:
Thought: [your detailed reasoning about what to do next]
Action: [tool name and parameters, or "finish" if done]
Observation: [will be filled automatically after tool execution]`,
    example: `Example:
Thought: The user is asking about X. I should search for current information.
Action: web_search(query="X", max_results=5)
Observation: [search results will appear here]
Thought: Based on the results, I now have enough information to answer.
Action: finish`,
  },
  minimal: {
    prefix: 'Think step-by-step before taking any action.',
    format: 'Use tools when needed to gather information.',
  },
  cot: {
    prefix: 'Use chain-of-thought reasoning to solve problems step by step.',
    format: `When solving problems:
1. Break down the problem into smaller parts
2. Think through each part carefully
3. Combine insights to reach a conclusion
4. Verify your reasoning before responding`,
  },
  disabled: {
    prefix: '',
    format: '',
  },
};

/**
 * Get the ReAct prompt for a given style
 */
export function getReActPrompt(style: ReActStyle = 'standard'): string {
  if (style === 'disabled') return '';

  const config = REACT_CONFIGS[style];
  let prompt = config.prefix;

  if (config.format) {
    prompt += `\n\n${config.format}`;
  }

  if (config.example) {
    prompt += `\n\n${config.example}`;
  }

  return prompt;
}

/**
 * Get the format instruction only (without prefix)
 */
export function getReActFormat(style: ReActStyle): string {
  if (style === 'disabled') return '';
  return REACT_CONFIGS[style].format;
}

/**
 * Build a custom ReAct prompt with options
 */
export function buildReActPrompt(options: {
  includePrefix?: boolean;
  includeFormat?: boolean;
  includeExample?: boolean;
  style?: ReActStyle;
}): string {
  const {
    includePrefix = true,
    includeFormat = true,
    includeExample = true,
    style = 'standard',
  } = options;

  if (style === 'disabled') return '';

  const config = REACT_CONFIGS[style];
  const parts: string[] = [];

  if (includePrefix && config.prefix) {
    parts.push(config.prefix);
  }

  if (includeFormat && config.format) {
    parts.push(config.format);
  }

  if (includeExample && config.example) {
    parts.push(config.example);
  }

  return parts.join('\n\n');
}

export default getReActPrompt;
