/**
 * Google AI Search Provider (Gemini Grounding with Google Search)
 * Uses Google's Gemini API with grounding capability for real-time web search
 * https://ai.google.dev/gemini-api/docs/google-search
 */

import type {
  SearchOptions,
  SearchResponse,
  SearchResult,
} from '@/types/search';
import { googleAIFetch } from '../proxy-search-fetch';
import { loggers } from '@/lib/logger';

const log = loggers.network;

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Google AI Search specific options
 */
export interface GoogleAISearchOptions extends SearchOptions {
  /** Model to use for search (default: gemini-2.0-flash) */
  model?: string;
  /** Dynamic retrieval threshold for legacy models (0.0-1.0) */
  dynamicThreshold?: number;
  /** Whether to use legacy google_search_retrieval tool (for Gemini 1.5) */
  useLegacyRetrieval?: boolean;
}

/**
 * Grounding metadata from Gemini API response
 */
interface GroundingMetadata {
  webSearchQueries?: string[];
  searchEntryPoint?: {
    renderedContent: string;
  };
  groundingChunks?: Array<{
    web?: {
      uri: string;
      title: string;
    };
  }>;
  groundingSupports?: Array<{
    segment: {
      startIndex: number;
      endIndex: number;
      text: string;
    };
    groundingChunkIndices: number[];
  }>;
}

/**
 * Gemini API response structure
 */
interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
      role: string;
    };
    finishReason?: string;
    groundingMetadata?: GroundingMetadata;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

/**
 * Build the request body for Gemini API with Google Search grounding
 */
function buildRequestBody(
  query: string,
  options: GoogleAISearchOptions
): Record<string, unknown> {
  const { useLegacyRetrieval = false, dynamicThreshold = 0.7 } = options;

  const contents = [
    {
      parts: [{ text: query }],
    },
  ];

  // For Gemini 2.0+ models, use the google_search tool
  // For Gemini 1.5 models, use google_search_retrieval with dynamic threshold
  const tools = useLegacyRetrieval
    ? [
        {
          google_search_retrieval: {
            dynamic_retrieval_config: {
              mode: 'MODE_DYNAMIC',
              dynamic_threshold: dynamicThreshold,
            },
          },
        },
      ]
    : [{ google_search: {} }];

  return {
    contents,
    tools,
  };
}

/**
 * Parse grounding metadata to extract search results
 */
function parseGroundingMetadata(
  metadata: GroundingMetadata | undefined,
  _answer: string
): { results: SearchResult[]; queries: string[] } {
  if (!metadata) {
    return { results: [], queries: [] };
  }

  const queries = metadata.webSearchQueries || [];
  const chunks = metadata.groundingChunks || [];
  const supports = metadata.groundingSupports || [];

  // Build a map of chunk indices to support text for scoring
  const chunkScores = new Map<number, number>();
  for (const support of supports) {
    for (const idx of support.groundingChunkIndices) {
      chunkScores.set(idx, (chunkScores.get(idx) || 0) + 1);
    }
  }

  // Convert grounding chunks to search results
  const results: SearchResult[] = [];
  
  for (let index = 0; index < chunks.length; index++) {
    const chunk = chunks[index];
    if (!chunk.web) continue;

    // Calculate score based on how many supports reference this chunk
    const supportCount = chunkScores.get(index) || 0;
    const maxSupports = Math.max(...Array.from(chunkScores.values()), 1);
    const score = supportCount > 0 ? 0.5 + (supportCount / maxSupports) * 0.5 : 0.3;

    // Find relevant text segments from supports
    const relevantSegments = supports
      .filter((s) => s.groundingChunkIndices.includes(index))
      .map((s) => s.segment.text)
      .join(' ');

    let source: string | undefined;
    try {
      source = new URL(chunk.web.uri).hostname;
    } catch {
      source = undefined;
    }

    results.push({
      title: chunk.web.title || 'Web Result',
      url: chunk.web.uri,
      content: relevantSegments || `Source: ${chunk.web.title}`,
      score,
      source,
    });
  }

  return { results, queries };
}

/**
 * Add inline citations to text based on grounding supports
 */
export function addInlineCitations(
  text: string,
  metadata: GroundingMetadata | undefined
): string {
  if (!metadata?.groundingSupports || !metadata?.groundingChunks) {
    return text;
  }

  const { groundingSupports: supports, groundingChunks: chunks } = metadata;

  // Sort supports by end_index in descending order to avoid shifting issues
  const sortedSupports = [...supports].sort(
    (a, b) => (b.segment.endIndex || 0) - (a.segment.endIndex || 0)
  );

  let result = text;

  for (const support of sortedSupports) {
    const endIndex = support.segment.endIndex;
    if (endIndex === undefined || !support.groundingChunkIndices?.length) {
      continue;
    }

    const citationLinks = support.groundingChunkIndices
      .map((i) => {
        const uri = chunks[i]?.web?.uri;
        if (uri) {
          return `[${i + 1}](${uri})`;
        }
        return null;
      })
      .filter(Boolean);

    if (citationLinks.length > 0) {
      const citationString = citationLinks.join(', ');
      // Insert citation after the supported text segment
      if (endIndex <= result.length) {
        result = result.slice(0, endIndex) + citationString + result.slice(endIndex);
      }
    }
  }

  return result;
}

/**
 * Determine which model to use based on options
 */
function getModelId(options: GoogleAISearchOptions): string {
  if (options.model) {
    return options.model;
  }
  // Default to gemini-2.0-flash for better grounding support
  return options.useLegacyRetrieval ? 'gemini-1.5-flash' : 'gemini-2.0-flash';
}

/**
 * Search using Google AI (Gemini) with Google Search grounding
 */
export async function searchWithGoogleAI(
  query: string,
  apiKey: string,
  options: GoogleAISearchOptions = {}
): Promise<SearchResponse> {
  if (!apiKey) {
    throw new Error('Google AI API key is required');
  }

  const startTime = Date.now();
  const modelId = getModelId(options);
  const requestBody = buildRequestBody(query, options);

  try {
    const response = await googleAIFetch(
      `${GEMINI_API_URL}/${modelId}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.error?.message || response.statusText;
      throw new Error(`Google AI API error: ${response.status} - ${errorMessage}`);
    }

    const data: GeminiResponse = await response.json();

    if (data.error) {
      throw new Error(`Google AI API error: ${data.error.message}`);
    }

    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error('No response from Google AI');
    }

    // Extract the answer text
    const answer = candidate.content.parts.map((p) => p.text).join('');

    // Parse grounding metadata for search results
    const { results, queries: _queries } = parseGroundingMetadata(
      candidate.groundingMetadata,
      answer
    );

    // Apply max results limit
    const maxResults = options.maxResults || 10;
    const limitedResults = results.slice(0, maxResults);

    return {
      provider: 'google-ai',
      query,
      answer,
      results: limitedResults,
      responseTime: Date.now() - startTime,
      totalResults: results.length,
    };
  } catch (error) {
    log.error('Google AI search error', error as Error);
    throw new Error(
      error instanceof Error
        ? `Google AI search failed: ${error.message}`
        : 'Google AI search failed: Unknown error'
    );
  }
}

/**
 * Get grounded answer with inline citations
 */
export async function getGroundedAnswerWithCitations(
  query: string,
  apiKey: string,
  options: GoogleAISearchOptions = {}
): Promise<{ answer: string; citedAnswer: string; sources: SearchResult[] }> {
  if (!apiKey) {
    throw new Error('Google AI API key is required');
  }

  const modelId = getModelId(options);
  const requestBody = buildRequestBody(query, options);

  const response = await googleAIFetch(
    `${GEMINI_API_URL}/${modelId}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Google AI API error: ${errorData?.error?.message || response.statusText}`);
  }

  const data: GeminiResponse = await response.json();
  const candidate = data.candidates?.[0];

  if (!candidate) {
    throw new Error('No response from Google AI');
  }

  const answer = candidate.content.parts.map((p) => p.text).join('');
  const citedAnswer = addInlineCitations(answer, candidate.groundingMetadata);
  const { results: sources } = parseGroundingMetadata(candidate.groundingMetadata, answer);

  return {
    answer,
    citedAnswer,
    sources,
  };
}

/**
 * Test Google AI API connection
 */
export async function testGoogleAIConnection(apiKey: string): Promise<boolean> {
  try {
    await searchWithGoogleAI('test connection', apiKey, { maxResults: 1 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a model supports Google Search grounding
 */
export function supportsGoogleSearchGrounding(modelId: string): boolean {
  const supportedModels = [
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
  ];

  return supportedModels.some((m) => modelId.toLowerCase().includes(m.toLowerCase()));
}

/**
 * Determine if legacy retrieval mode should be used based on model
 */
export function shouldUseLegacyRetrieval(modelId: string): boolean {
  // Gemini 1.5 models should use google_search_retrieval
  // Gemini 2.0+ models should use google_search
  return modelId.includes('1.5');
}
