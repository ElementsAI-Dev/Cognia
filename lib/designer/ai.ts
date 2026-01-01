/**
 * Designer AI utilities - Unified AI editing logic for designer components
 * 
 * This module leverages the core AI infrastructure from lib/ai:
 * - Uses getProviderModel from lib/ai/client for model instantiation
 * - Uses generateStructuredArray from lib/ai/structured-output for type-safe suggestions
 * - Follows patterns established in lib/ai/canvas-actions for code editing
 */

import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import { getProviderModel, type ProviderName } from '@/lib/ai/core/client';

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

// ============================================
// Zod Schemas for Structured Output (reusing lib/ai patterns)
// ============================================

const aiSuggestionSchema = z.object({
  type: z.enum(['style', 'layout', 'accessibility', 'responsive', 'content']).describe('Type of suggestion'),
  title: z.string().describe('Short title for the suggestion'),
  description: z.string().describe('Detailed description of the suggestion'),
  code: z.string().optional().describe('Optional code snippet or Tailwind classes'),
  priority: z.enum(['low', 'medium', 'high']).describe('Priority level'),
});

const aiSuggestionsArraySchema = z.object({
  suggestions: z.array(aiSuggestionSchema).describe('Array of suggestions'),
});

// ============================================
// Helper Functions (avoiding duplication)
// ============================================

/**
 * Validate config and get model instance
 * Centralizes the repeated validation and model creation pattern
 */
function validateAndGetModel(config: DesignerAIConfig): 
  | { success: true; model: ReturnType<typeof getProviderModel> }
  | { success: false; error: string } {
  if (!config.apiKey && config.provider !== 'ollama') {
    return {
      success: false,
      error: `No API key configured for ${config.provider}. Please add your API key in Settings.`,
    };
  }

  try {
    const model = getProviderModel(
      config.provider,
      config.model,
      config.apiKey || '',
      config.baseURL
    );
    return { success: true, model };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create model instance',
    };
  }
}

/**
 * Generate structured suggestions using AI SDK generateObject
 * Replaces manual JSON parsing with type-safe structured output
 */
async function generateStructuredSuggestions(
  code: string,
  systemPrompt: string,
  config: DesignerAIConfig
): Promise<{ success: boolean; suggestions?: AISuggestion[]; error?: string }> {
  const validation = validateAndGetModel(config);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  try {
    const result = await generateObject({
      model: validation.model,
      schema: aiSuggestionsArraySchema,
      system: systemPrompt,
      prompt: `Analyze this React component:\n\n${code}`,
      temperature: 0.5,
    });

    const suggestions: AISuggestion[] = result.object.suggestions.map((s, i) => ({
      id: `suggestion-${i}`,
      ...s,
    }));

    return { success: true, suggestions };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate suggestions',
    };
  }
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
 * Uses validateAndGetModel helper to avoid duplication
 */
export async function executeDesignerAIEdit(
  prompt: string,
  currentCode: string,
  config: DesignerAIConfig
): Promise<DesignerAIResult> {
  const validation = validateAndGetModel(config);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  try {
    const result = await generateText({
      model: validation.model,
      system: DESIGNER_SYSTEM_PROMPT,
      prompt: `Current code:\n\n${currentCode}\n\nUser request: ${prompt}`,
      temperature: 0.7,
    });

    if (result.text) {
      const cleanedCode = cleanAICodeResponse(result.text);
      return { success: true, code: cleanedCode };
    }

    return { success: false, error: 'No response from AI' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'AI edit failed',
    };
  }
}

/**
 * Generate a new component from description
 * Uses validateAndGetModel helper to avoid duplication
 */
export async function generateDesignerComponent(
  description: string,
  config: DesignerAIConfig
): Promise<DesignerAIResult> {
  const validation = validateAndGetModel(config);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const generatePrompt = `Create a React component based on this description: ${description}

Requirements:
1. Use export default function App() as the component.
2. Use Tailwind CSS for styling.
3. Make it visually appealing and modern.
4. Include responsive design considerations.
5. Return only the code, no explanations.`;

  try {
    const result = await generateText({
      model: validation.model,
      system: DESIGNER_SYSTEM_PROMPT,
      prompt: generatePrompt,
      temperature: 0.7,
    });

    if (result.text) {
      const cleanedCode = cleanAICodeResponse(result.text);
      return { success: true, code: cleanedCode };
    }

    return { success: false, error: 'No response from AI' };
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

// ============================================
// Enhanced AI Features
// ============================================

/**
 * AI suggestion types for different contexts
 */
export type AISuggestionType = 'style' | 'layout' | 'accessibility' | 'responsive' | 'content';

export interface AISuggestion {
  id: string;
  type: AISuggestionType;
  title: string;
  description: string;
  code?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface AIConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  codeSnapshot?: string;
}

/**
 * System prompts for different AI operations
 */
const AI_PROMPTS = {
  styleSuggestions: `You are a UI/UX expert. Analyze the React component and suggest style improvements.

Return a JSON array of suggestions with this format:
[
  {
    "type": "style",
    "title": "Short title",
    "description": "Detailed description",
    "code": "Optional: specific Tailwind classes or code snippet",
    "priority": "low|medium|high"
  }
]

Focus on:
- Visual hierarchy and spacing
- Color contrast and accessibility
- Modern design patterns
- Tailwind CSS best practices`,

  layoutSuggestions: `You are a layout expert. Analyze the React component's layout and suggest improvements.

Return a JSON array of suggestions focusing on:
- Flexbox/Grid optimization
- Responsive design
- Component structure
- Semantic HTML`,

  accessibilityCheck: `You are an accessibility expert. Analyze the React component for accessibility issues.

Return a JSON array of suggestions focusing on:
- ARIA attributes
- Keyboard navigation
- Color contrast (WCAG 2.1)
- Screen reader compatibility
- Focus management`,

  responsiveDesign: `You are a responsive design expert. Analyze the React component for mobile-first design.

Return a JSON array of suggestions focusing on:
- Tailwind responsive breakpoints (sm, md, lg, xl)
- Touch-friendly targets
- Mobile layout optimization
- Viewport considerations`,

  elementEdit: `You are a React expert. Modify ONLY the specified element in the component.

Rules:
1. Return the COMPLETE component code with the modification.
2. Only change the targeted element, keep everything else intact.
3. Use Tailwind CSS for styling.
4. Ensure valid JSX.`,

  iterativeChat: `You are a collaborative UI designer working with a developer. Help them iteratively improve their React component.

Rules:
1. Understand the current context and conversation history.
2. Make focused, incremental improvements.
3. Explain your changes briefly.
4. Return the complete modified code.
5. Use Tailwind CSS for styling.`,
};

/**
 * Get AI style suggestions for the current code
 * Uses generateStructuredSuggestions for type-safe output
 */
export async function getAIStyleSuggestions(
  code: string,
  config: DesignerAIConfig
): Promise<{ success: boolean; suggestions?: AISuggestion[]; error?: string }> {
  return generateStructuredSuggestions(code, AI_PROMPTS.styleSuggestions, config);
}

/**
 * Get AI accessibility suggestions
 * Uses generateStructuredSuggestions for type-safe output
 */
export async function getAIAccessibilitySuggestions(
  code: string,
  config: DesignerAIConfig
): Promise<{ success: boolean; suggestions?: AISuggestion[]; error?: string }> {
  return generateStructuredSuggestions(code, AI_PROMPTS.accessibilityCheck, config);
}

/**
 * Edit a specific element using AI
 * Uses validateAndGetModel helper to avoid duplication
 */
export async function editElementWithAI(
  code: string,
  elementSelector: string,
  editPrompt: string,
  config: DesignerAIConfig
): Promise<DesignerAIResult> {
  const validation = validateAndGetModel(config);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  try {
    const prompt = `Current code:
${code}

Target element: ${elementSelector}
Edit request: ${editPrompt}

Modify only the specified element based on the request.`;

    const result = await generateText({
      model: validation.model,
      system: AI_PROMPTS.elementEdit,
      prompt,
      temperature: 0.5,
    });

    if (result.text) {
      const cleanedCode = cleanAICodeResponse(result.text);
      return { success: true, code: cleanedCode };
    }

    return { success: false, error: 'No response from AI' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Element edit failed',
    };
  }
}

/**
 * Iterative AI chat for design refinement
 * Uses validateAndGetModel helper to avoid duplication
 */
export async function continueDesignConversation(
  code: string,
  conversationHistory: AIConversationMessage[],
  newMessage: string,
  config: DesignerAIConfig
): Promise<{ success: boolean; response?: string; code?: string; error?: string }> {
  const validation = validateAndGetModel(config);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  try {
    // Build conversation context
    const historyContext = conversationHistory
      .slice(-6) // Keep last 6 messages for context
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    const prompt = `Current component code:
${code}

Conversation history:
${historyContext}

User: ${newMessage}

Provide a helpful response and if code changes are needed, include the complete updated component code wrapped in a code block.`;

    const result = await generateText({
      model: validation.model,
      system: AI_PROMPTS.iterativeChat,
      prompt,
      temperature: 0.7,
    });

    if (result.text) {
      // Extract code if present
      const codeMatch = result.text.match(/```(?:jsx?|tsx?)?\n([\s\S]*?)\n```/);
      const extractedCode = codeMatch ? cleanAICodeResponse(codeMatch[1]) : undefined;
      
      // Clean response text (remove code blocks for display)
      const responseText = result.text.replace(/```(?:jsx?|tsx?)?\n[\s\S]*?\n```/g, '[Code updated]').trim();

      return {
        success: true,
        response: responseText,
        code: extractedCode,
      };
    }

    return { success: false, error: 'No response from AI' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Conversation failed',
    };
  }
}

/**
 * Generate multiple component variations
 * Uses validateAndGetModel helper to avoid duplication
 */
export async function generateComponentVariations(
  code: string,
  variationType: 'style' | 'layout' | 'color',
  count: number,
  config: DesignerAIConfig
): Promise<{ success: boolean; variations?: string[]; error?: string }> {
  const validation = validateAndGetModel(config);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  try {
    const variationPrompts: Record<string, string> = {
      style: 'Create visual style variations (modern, minimal, bold, elegant)',
      layout: 'Create layout variations (centered, split, stacked, grid)',
      color: 'Create color scheme variations (light, dark, vibrant, muted)',
    };

    const prompt = `Original component:
${code}

Create ${count} ${variationType} variations of this component.
${variationPrompts[variationType]}

Return each variation as a complete component wrapped in separate code blocks.
Label each: --- Variation 1 ---, --- Variation 2 ---, etc.`;

    const result = await generateText({
      model: validation.model,
      system: DESIGNER_SYSTEM_PROMPT,
      prompt,
      temperature: 0.8,
    });

    if (result.text) {
      // Extract all code blocks
      const codeBlocks = result.text.match(/```(?:jsx?|tsx?)?\n([\s\S]*?)\n```/g) || [];
      const variations = codeBlocks.map((block) => 
        cleanAICodeResponse(block.replace(/```(?:jsx?|tsx?)?\n?/g, ''))
      );

      return { success: true, variations };
    }

    return { success: false, error: 'No response from AI' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate variations',
    };
  }
}

/**
 * Quick AI actions for common operations
 */
export const QUICK_AI_ACTIONS = [
  { id: 'improve-spacing', label: 'Improve Spacing', prompt: 'Improve the spacing and padding for better visual balance' },
  { id: 'add-animation', label: 'Add Animation', prompt: 'Add subtle hover animations and transitions' },
  { id: 'make-responsive', label: 'Make Responsive', prompt: 'Add responsive breakpoints for mobile and tablet' },
  { id: 'improve-colors', label: 'Improve Colors', prompt: 'Improve the color scheme for better contrast and appeal' },
  { id: 'add-dark-mode', label: 'Add Dark Mode', prompt: 'Add dark mode support using Tailwind dark: classes' },
  { id: 'simplify', label: 'Simplify', prompt: 'Simplify the design, remove unnecessary elements' },
  { id: 'make-modern', label: 'Modernize', prompt: 'Update to a more modern, contemporary design style' },
  { id: 'add-shadows', label: 'Add Depth', prompt: 'Add shadows and depth to create visual hierarchy' },
] as const;

export type QuickAIActionId = typeof QUICK_AI_ACTIONS[number]['id'];

/**
 * Get AI responsive design suggestions
 * Uses generateStructuredSuggestions for type-safe output
 */
export async function getAIResponsiveSuggestions(
  code: string,
  config: DesignerAIConfig
): Promise<{ success: boolean; suggestions?: AISuggestion[]; error?: string }> {
  return generateStructuredSuggestions(code, AI_PROMPTS.responsiveDesign, config);
}

/**
 * Get AI layout suggestions
 * Uses generateStructuredSuggestions for type-safe output
 */
export async function getAILayoutSuggestions(
  code: string,
  config: DesignerAIConfig
): Promise<{ success: boolean; suggestions?: AISuggestion[]; error?: string }> {
  return generateStructuredSuggestions(code, AI_PROMPTS.layoutSuggestions, config);
}

/**
 * Execute a quick AI action
 */
export async function executeQuickAIAction(
  actionId: QuickAIActionId,
  code: string,
  config: DesignerAIConfig
): Promise<DesignerAIResult> {
  const action = QUICK_AI_ACTIONS.find((a) => a.id === actionId);
  if (!action) {
    return {
      success: false,
      error: `Unknown action: ${actionId}`,
    };
  }

  return executeDesignerAIEdit(action.prompt, code, config);
}

/**
 * Apply multiple suggestions to code in sequence
 * Uses validateAndGetModel helper to avoid duplication
 */
export async function applyAISuggestions(
  code: string,
  suggestions: AISuggestion[],
  config: DesignerAIConfig
): Promise<DesignerAIResult> {
  if (suggestions.length === 0) {
    return { success: true, code };
  }

  const validation = validateAndGetModel(config);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  try {
    // Build a prompt that includes all suggestions
    const suggestionPrompts = suggestions
      .map((s, i) => `${i + 1}. ${s.title}: ${s.description}${s.code ? ` (use: ${s.code})` : ''}`)
      .join('\n');

    const result = await generateText({
      model: validation.model,
      system: DESIGNER_SYSTEM_PROMPT,
      prompt: `Apply the following improvements to this React component:

Current code:
${code}

Improvements to apply:
${suggestionPrompts}

Return the complete modified code with all improvements applied.`,
      temperature: 0.5,
    });

    if (result.text) {
      const cleanedCode = cleanAICodeResponse(result.text);
      return { success: true, code: cleanedCode };
    }

    return { success: false, error: 'No response from AI' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to apply suggestions',
    };
  }
}

/**
 * Get comprehensive AI analysis of the component
 * Uses validateAndGetModel helper to avoid duplication
 */
export async function getAIComponentAnalysis(
  code: string,
  config: DesignerAIConfig
): Promise<{
  success: boolean;
  analysis?: {
    summary: string;
    styleSuggestions: AISuggestion[];
    layoutSuggestions: AISuggestion[];
    accessibilitySuggestions: AISuggestion[];
    responsiveSuggestions: AISuggestion[];
  };
  error?: string;
}> {
  const validation = validateAndGetModel(config);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  try {
    const result = await generateText({
      model: validation.model,
      system: `You are a comprehensive UI/UX analyst. Analyze React components and provide structured feedback.

Return a JSON object with this format:
{
  "summary": "Brief overview of the component",
  "styleSuggestions": [{ "type": "style", "title": "...", "description": "...", "code": "...", "priority": "low|medium|high" }],
  "layoutSuggestions": [{ "type": "layout", "title": "...", "description": "...", "code": "...", "priority": "low|medium|high" }],
  "accessibilitySuggestions": [{ "type": "accessibility", "title": "...", "description": "...", "code": "...", "priority": "low|medium|high" }],
  "responsiveSuggestions": [{ "type": "responsive", "title": "...", "description": "...", "code": "...", "priority": "low|medium|high" }]
}`,
      prompt: `Analyze this React component comprehensively:\n\n${code}`,
      temperature: 0.4,
    });

    if (result.text) {
      try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            success: true,
            analysis: {
              summary: parsed.summary || 'No summary available',
              styleSuggestions: (parsed.styleSuggestions || []).map((s: Record<string, unknown>, i: number) => ({
                id: `style-${i}`,
                ...s,
              })),
              layoutSuggestions: (parsed.layoutSuggestions || []).map((s: Record<string, unknown>, i: number) => ({
                id: `layout-${i}`,
                ...s,
              })),
              accessibilitySuggestions: (parsed.accessibilitySuggestions || []).map((s: Record<string, unknown>, i: number) => ({
                id: `a11y-${i}`,
                ...s,
              })),
              responsiveSuggestions: (parsed.responsiveSuggestions || []).map((s: Record<string, unknown>, i: number) => ({
                id: `responsive-${i}`,
                ...s,
              })),
            },
          };
        }
      } catch {
        // JSON parsing failed
      }
      return { success: false, error: 'Failed to parse analysis response' };
    }

    return { success: false, error: 'No response from AI' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze component',
    };
  }
}

/**
 * Generate optimized Tailwind classes from description
 * Uses validateAndGetModel helper to avoid duplication
 */
export async function generateTailwindClasses(
  description: string,
  config: DesignerAIConfig
): Promise<{ success: boolean; classes?: string; error?: string }> {
  const validation = validateAndGetModel(config);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  try {
    const result = await generateText({
      model: validation.model,
      system: `You are a Tailwind CSS expert. Generate optimized Tailwind classes based on descriptions.
Return ONLY the Tailwind classes as a space-separated string, nothing else.
Use modern Tailwind v3+ syntax.`,
      prompt: `Generate Tailwind classes for: ${description}`,
      temperature: 0.3,
    });

    if (result.text) {
      const classes = result.text.trim().replace(/['"]/g, '');
      return { success: true, classes };
    }

    return { success: false, error: 'No response from AI' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate classes',
    };
  }
}

/**
 * Optimize existing Tailwind classes
 * Uses validateAndGetModel helper to avoid duplication
 */
export async function optimizeTailwindClasses(
  currentClasses: string,
  config: DesignerAIConfig
): Promise<{ success: boolean; classes?: string; changes?: string[]; error?: string }> {
  const validation = validateAndGetModel(config);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  try {
    const result = await generateText({
      model: validation.model,
      system: `You are a Tailwind CSS optimization expert. Optimize class lists by:
1. Removing redundant/conflicting classes
2. Using shorthand where possible
3. Ensuring proper ordering (layout -> spacing -> sizing -> typography -> visual)

Return JSON: { "optimized": "class string", "changes": ["change 1", "change 2"] }`,
      prompt: `Optimize these Tailwind classes:\n${currentClasses}`,
      temperature: 0.2,
    });

    if (result.text) {
      try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            success: true,
            classes: parsed.optimized || currentClasses,
            changes: parsed.changes || [],
          };
        }
      } catch {
        // If parsing fails, return the raw text as classes
        return { success: true, classes: result.text.trim(), changes: [] };
      }
    }

    return { success: false, error: 'No response from AI' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to optimize classes',
    };
  }
}
