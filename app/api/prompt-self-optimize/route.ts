/**
 * API Route: Prompt Self-Optimization
 * Server-side prompt analysis and optimization with AI
 *
 * NOTE: Uses shared prompts from prompt-self-optimizer library to avoid duplication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import {
  getProviderModelFromConfig,
  isValidProvider,
  type ProviderName,
} from '@/lib/ai/core/client';
import {
  circuitBreakerRegistry,
  isProviderAvailable,
} from '@/lib/ai/infrastructure';
import {
  ANALYSIS_SYSTEM_PROMPT,
  OPTIMIZATION_SYSTEM_PROMPT,
} from '@/lib/ai/prompts/prompt-self-optimizer';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = request.nextUrl.searchParams.get('action') || 'analyze';
    
    if (action === 'analyze') {
      return handleAnalyze(body as AnalyzeRequest);
    } else if (action === 'optimize') {
      return handleOptimize(body as OptimizeRequest);
    } else {
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Prompt self-optimization error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Request failed' },
      { status: 500 }
    );
  }
}

async function handleAnalyze(body: AnalyzeRequest) {
  const { content, name, description, category, variables, provider, model, apiKey, baseURL } = body;
  
  if (!content || !apiKey) {
    return NextResponse.json(
      { error: 'Missing required fields: content and apiKey' },
      { status: 400 }
    );
  }
  
  const validProvider = isValidProvider(provider) ? (provider as ProviderName) : 'openai';
  
  if (!isProviderAvailable(validProvider)) {
    return NextResponse.json(
      { error: `Provider ${validProvider} is temporarily unavailable. Please try again later.` },
      { status: 503 }
    );
  }
  
  const { model: aiModel } = getProviderModelFromConfig({
    provider: validProvider,
    model,
    apiKey,
    baseURL,
  });
  
  const variablesList = variables
    ? variables.map(v => `{{${v.name}}}${v.required ? ' (required)' : ''}`).join(', ')
    : 'None';
  
  const result = await generateText({
    model: aiModel,
    system: ANALYSIS_SYSTEM_PROMPT,
    prompt: `Analyze this prompt template:

Name: ${name || 'Unnamed'}
Description: ${description || 'No description'}
Category: ${category || 'General'}
Variables: ${variablesList}

Content:
${content}`,
    temperature: 0.3,
    maxOutputTokens: 2000,
  });
  
  circuitBreakerRegistry.get(validProvider).recordSuccess();
  
  // Parse the JSON response
  let analysis;
  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      analysis = JSON.parse(jsonMatch[0]);
    } else {
      analysis = JSON.parse(result.text);
    }
  } catch {
    analysis = {
      scores: { clarity: 50, specificity: 50, structureQuality: 50, overallScore: 50 },
      suggestions: [],
      abTestRecommendation: { shouldTest: false, hypothesis: '' },
    };
  }
  
  return NextResponse.json({
    success: true,
    analysis,
    usage: result.usage,
  });
}

async function handleOptimize(body: OptimizeRequest) {
  const { content, suggestions, provider, model, apiKey, baseURL } = body;
  
  if (!content || !apiKey) {
    return NextResponse.json(
      { error: 'Missing required fields: content and apiKey' },
      { status: 400 }
    );
  }
  
  const validProvider = isValidProvider(provider) ? (provider as ProviderName) : 'openai';
  
  if (!isProviderAvailable(validProvider)) {
    return NextResponse.json(
      { error: `Provider ${validProvider} is temporarily unavailable. Please try again later.` },
      { status: 503 }
    );
  }
  
  const { model: aiModel } = getProviderModelFromConfig({
    provider: validProvider,
    model,
    apiKey,
    baseURL,
  });
  
  const suggestionText = suggestions
    .filter(s => s.priority === 'high' || s.priority === 'medium')
    .map(s => `- [${s.priority.toUpperCase()}] ${s.description}${s.suggestedText ? `\n  Suggestion: ${s.suggestedText}` : ''}`)
    .join('\n');
  
  const result = await generateText({
    model: aiModel,
    system: OPTIMIZATION_SYSTEM_PROMPT,
    prompt: `Original prompt:
${content}

Improvement suggestions:
${suggestionText || 'No specific suggestions provided. Improve based on best practices.'}

Optimized prompt:`,
    temperature: 0.5,
    maxOutputTokens: 3000,
  });
  
  circuitBreakerRegistry.get(validProvider).recordSuccess();
  
  return NextResponse.json({
    success: true,
    optimizedContent: result.text.trim(),
    usage: result.usage,
  });
}
