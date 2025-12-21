/**
 * Designer AI utilities - Unified AI editing logic for designer components
 */

import { generateText } from 'ai';
import { getProviderModel, type ProviderName } from '@/lib/ai/client';

export interface DesignerAIConfig {
  provider: ProviderName;
  model: string;
  apiKey?: string;
  baseURL?: string;
}

export interface DesignerAIResult {
  success: boolean;
  code?: string;
  error?: string;
}

const DESIGNER_SYSTEM_PROMPT = `You are an expert React developer. Modify the following React component based on the user's request.

Rules:
1. Return ONLY the complete modified code, no explanations or markdown.
2. Preserve the component structure and export default function App().
3. Use Tailwind CSS for all styling.
4. Make sure the code is valid JSX that can be rendered.
5. Keep imports at the top if needed (only useState, useEffect from 'react' are available).
6. Do not use external libraries or components unless they are already in the code.`;

/**
 * Clean AI response to extract pure code
 */
export function cleanAICodeResponse(text: string): string {
  let code = text.trim();
  
  // Remove markdown code blocks if present
  if (code.startsWith('```')) {
    code = code.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
  }
  
  // Remove any leading/trailing explanation text
  const exportMatch = code.match(/(?:import[\s\S]*?)?export\s+default\s+function/);
  if (exportMatch && exportMatch.index !== undefined && exportMatch.index > 0) {
    // Check if there's import before export
    const importMatch = code.match(/^import\s+/);
    if (!importMatch) {
      code = code.slice(exportMatch.index);
    }
  }
  
  return code.trim();
}

/**
 * Execute AI edit request for designer code
 */
export async function executeDesignerAIEdit(
  prompt: string,
  currentCode: string,
  config: DesignerAIConfig
): Promise<DesignerAIResult> {
  try {
    // Validate API key for non-ollama providers
    if (!config.apiKey && config.provider !== 'ollama') {
      return {
        success: false,
        error: `No API key configured for ${config.provider}. Please add your API key in Settings.`,
      };
    }

    const modelInstance = getProviderModel(
      config.provider,
      config.model,
      config.apiKey || '',
      config.baseURL
    );

    const result = await generateText({
      model: modelInstance,
      system: DESIGNER_SYSTEM_PROMPT,
      prompt: `Current code:\n\n${currentCode}\n\nUser request: ${prompt}`,
      temperature: 0.7,
    });

    if (result.text) {
      const cleanedCode = cleanAICodeResponse(result.text);
      return {
        success: true,
        code: cleanedCode,
      };
    }

    return {
      success: false,
      error: 'No response from AI',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'AI edit failed',
    };
  }
}

/**
 * Generate a new component from description
 */
export async function generateDesignerComponent(
  description: string,
  config: DesignerAIConfig
): Promise<DesignerAIResult> {
  const generatePrompt = `Create a React component based on this description: ${description}

Requirements:
1. Use export default function App() as the component.
2. Use Tailwind CSS for styling.
3. Make it visually appealing and modern.
4. Include responsive design considerations.
5. Return only the code, no explanations.`;

  try {
    if (!config.apiKey && config.provider !== 'ollama') {
      return {
        success: false,
        error: `No API key configured for ${config.provider}. Please add your API key in Settings.`,
      };
    }

    const modelInstance = getProviderModel(
      config.provider,
      config.model,
      config.apiKey || '',
      config.baseURL
    );

    const result = await generateText({
      model: modelInstance,
      system: DESIGNER_SYSTEM_PROMPT,
      prompt: generatePrompt,
      temperature: 0.7,
    });

    if (result.text) {
      const cleanedCode = cleanAICodeResponse(result.text);
      return {
        success: true,
        code: cleanedCode,
      };
    }

    return {
      success: false,
      error: 'No response from AI',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Component generation failed',
    };
  }
}

/**
 * Get AI config from settings store state
 */
export function getDesignerAIConfig(
  defaultProvider: string | null,
  providerSettings: Record<string, { apiKey?: string; defaultModel?: string; baseURL?: string }>
): DesignerAIConfig {
  const provider = (defaultProvider || 'openai') as ProviderName;
  const settings = providerSettings[provider];
  
  return {
    provider,
    model: settings?.defaultModel || 'gpt-4o-mini',
    apiKey: settings?.apiKey,
    baseURL: settings?.baseURL,
  };
}
