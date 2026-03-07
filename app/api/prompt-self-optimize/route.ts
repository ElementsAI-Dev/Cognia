/**
 * API Route: Prompt Self-Optimization
 * Legacy compatibility adapter. Canonical path:
 * lib/ai/prompts/prompt-self-optimizer.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  analyzePrompt,
  optimizePromptFromAnalysis,
  type OptimizationSuggestion,
  type SelfOptimizationConfig,
} from '@/lib/ai/prompts/prompt-self-optimizer';
import {
  circuitBreakerRegistry,
  isProviderAvailable,
} from '@/lib/ai/infrastructure';
import {
  isValidProvider,
  type ProviderName,
} from '@/lib/ai/core/client';
import type { PromptTemplate, TemplateVariable } from '@/types/content/prompt-template';
import { getProviderConfig } from '@/types/provider';
import { applyLegacyGenerationRouteHeaders } from '@/lib/ai/generation/legacy-route-deprecation';

interface AnalyzeRequest {
  content: string;
  name?: string;
  description?: string;
  category?: string;
  variables?: Array<{ name: string; required?: boolean }>;
  provider: string;
  model?: string;
  apiKey: string;
  baseURL?: string;
}

interface OptimizeRequest {
  content: string;
  suggestions: Array<{
    type: string;
    priority: string;
    description: string;
    suggestedText?: string;
  }>;
  provider: string;
  model?: string;
  apiKey: string;
  baseURL?: string;
}

interface ProviderResolution {
  provider: ProviderName;
  config: SelfOptimizationConfig;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const requestUrl = typeof request.url === 'string' ? request.url : 'http://localhost';
    const fallbackParams = new URL(requestUrl).searchParams;
    const action =
      request.nextUrl?.searchParams.get('action') ||
      fallbackParams.get('action') ||
      'analyze';

    if (action === 'analyze') {
      return handleAnalyze(body as AnalyzeRequest);
    }

    if (action === 'optimize') {
      return handleOptimize(body as OptimizeRequest);
    }

    return withDeprecation(
      NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    );
  } catch (error) {
    console.error('Prompt self-optimization error:', error);
    return withDeprecation(
      NextResponse.json(
        { error: error instanceof Error ? error.message : 'Request failed' },
        { status: 500 }
      )
    );
  }
}

async function handleAnalyze(body: AnalyzeRequest) {
  const { content, name, description, category, variables } = body;

  if (!content) {
    return withDeprecation(
      NextResponse.json(
        { error: 'Missing required field: content' },
        { status: 400 }
      )
    );
  }

  const providerResolution = resolveProvider(body.provider, body.model, body.apiKey, body.baseURL);
  if ('errorResponse' in providerResolution) {
    return providerResolution.errorResponse;
  }

  const { provider, config } = providerResolution;

  if (!isProviderAvailable(provider)) {
    return withDeprecation(
      NextResponse.json(
        { error: `Provider ${provider} is temporarily unavailable. Please try again later.` },
        { status: 503 }
      )
    );
  }

  const template = buildTemplate({
    content,
    name,
    description,
    category,
    variables,
  });

  const analysis = await analyzePrompt(template, config);

  if (!analysis.success) {
    circuitBreakerRegistry.get(provider).recordFailure(
      new Error(analysis.error || 'Prompt analysis failed')
    );

    return withDeprecation(
      NextResponse.json(
        { error: analysis.error || 'Prompt analysis failed' },
        { status: 500 }
      )
    );
  }

  circuitBreakerRegistry.get(provider).recordSuccess();

  return withDeprecation(
    NextResponse.json({
      success: true,
      analysis: {
        scores: analysis.analysis,
        suggestions: analysis.suggestions,
        abTestRecommendation: analysis.abTestRecommendation || {
          shouldTest: false,
          hypothesis: '',
        },
      },
    })
  );
}

async function handleOptimize(body: OptimizeRequest) {
  const { content, suggestions } = body;

  if (!content) {
    return withDeprecation(
      NextResponse.json(
        { error: 'Missing required field: content' },
        { status: 400 }
      )
    );
  }

  const providerResolution = resolveProvider(body.provider, body.model, body.apiKey, body.baseURL);
  if ('errorResponse' in providerResolution) {
    return providerResolution.errorResponse;
  }

  const { provider, config } = providerResolution;

  if (!isProviderAvailable(provider)) {
    return withDeprecation(
      NextResponse.json(
        { error: `Provider ${provider} is temporarily unavailable. Please try again later.` },
        { status: 503 }
      )
    );
  }

  const template = buildTemplate({
    content,
    name: 'Legacy Prompt',
    description: 'Legacy route optimization request',
    category: 'legacy',
    variables: [],
  });

  const normalizedSuggestions = normalizeSuggestions(suggestions);
  const optimized = await optimizePromptFromAnalysis(template, normalizedSuggestions, config);

  if (!optimized.success || !optimized.optimizedContent) {
    circuitBreakerRegistry.get(provider).recordFailure(
      new Error(optimized.error || 'Prompt optimization failed')
    );

    return withDeprecation(
      NextResponse.json(
        { error: optimized.error || 'Prompt optimization failed' },
        { status: 500 }
      )
    );
  }

  circuitBreakerRegistry.get(provider).recordSuccess();

  return withDeprecation(
    NextResponse.json({
      success: true,
      optimizedContent: optimized.optimizedContent,
    })
  );
}

function resolveProvider(
  provider: string,
  model: string | undefined,
  apiKey: string,
  baseURL: string | undefined
): ProviderResolution | { errorResponse: NextResponse } {
  const validProvider = isValidProvider(provider) ? (provider as ProviderName) : 'openai';
  const providerConfig = getProviderConfig(validProvider);
  const requiresApiKey = providerConfig?.apiKeyRequired ?? true;

  if (requiresApiKey && !apiKey) {
    return {
      errorResponse: withDeprecation(
        NextResponse.json(
          { error: `Missing required field: apiKey for provider ${validProvider}` },
          { status: 400 }
        )
      ),
    };
  }

  return {
    provider: validProvider,
    config: {
      provider: validProvider,
      model: model || 'gpt-4o-mini',
      apiKey: apiKey || '',
      baseURL,
      minFeedbackCount: 5,
      targetSuccessRate: 0.8,
      maxIterations: 3,
    },
  };
}

function buildTemplate(input: {
  content: string;
  name?: string;
  description?: string;
  category?: string;
  variables?: Array<{ name: string; required?: boolean }>;
}): PromptTemplate {
  const normalizedVariables: TemplateVariable[] = (input.variables || [])
    .filter((variable) => Boolean(variable.name))
    .map((variable) => ({
      name: variable.name,
      required: variable.required ?? false,
      type: 'text',
    }));

  return {
    id: 'legacy-prompt-self-optimize',
    name: input.name || 'Legacy Prompt',
    description: input.description,
    content: input.content,
    category: input.category,
    tags: ['legacy-route'],
    variables: normalizedVariables,
    source: 'user',
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function normalizeSuggestions(
  suggestions: OptimizeRequest['suggestions']
): OptimizationSuggestion[] {
  if (!Array.isArray(suggestions)) {
    return [];
  }

  return suggestions
    .filter((suggestion) => suggestion?.description)
    .map((suggestion, index) => ({
      id: `legacy-suggestion-${index + 1}`,
      type: toSuggestionType(suggestion.type),
      priority: toSuggestionPriority(suggestion.priority),
      description: suggestion.description,
      suggestedText: suggestion.suggestedText,
      confidence: 0.7,
      impact: suggestion.priority === 'high' ? 'major' : 'minor',
      category: suggestion.type,
    }));
}

function toSuggestionType(
  value: string
): OptimizationSuggestion['type'] {
  const allowed: OptimizationSuggestion['type'][] = [
    'structure',
    'clarity',
    'specificity',
    'context',
    'formatting',
    'variables',
    'examples',
    'constraints',
  ];

  return allowed.includes(value as OptimizationSuggestion['type'])
    ? (value as OptimizationSuggestion['type'])
    : 'clarity';
}

function toSuggestionPriority(
  value: string
): OptimizationSuggestion['priority'] {
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value;
  }

  return 'medium';
}

function withDeprecation(response: NextResponse): NextResponse {
  return applyLegacyGenerationRouteHeaders(response, '/api/prompt-self-optimize');
}
