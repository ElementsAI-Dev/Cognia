/**
 * Material Tool - Material processing tools for PPT generation
 * 
 * Handles extraction, summarization, and analysis of input materials
 * for AI-powered presentation generation.
 */

import { z } from 'zod';
import type {
  PPTMaterial,
  PPTMaterialAnalysis,
  PPTMaterialType,
} from '@/types/workflow';

// =====================
// Input Schemas
// =====================

export const materialExtractInputSchema = z.object({
  content: z.string().describe('The raw content to extract from'),
  type: z.enum(['text', 'file', 'url', 'document']).default('text'),
  name: z.string().optional().describe('Name of the material'),
  mimeType: z.string().optional().describe('MIME type if known'),
});

export const materialSummarizeInputSchema = z.object({
  content: z.string().describe('The content to summarize'),
  depth: z.enum(['brief', 'standard', 'detailed']).default('standard'),
  targetLength: z.number().min(50).max(2000).optional().default(500),
  focusAreas: z.array(z.string()).optional().describe('Specific areas to focus on'),
  language: z.string().default('en'),
});

export const materialAnalyzeInputSchema = z.object({
  content: z.string().describe('The content to analyze'),
  extractEntities: z.boolean().default(true),
  detectStructure: z.boolean().default(true),
  suggestSlides: z.boolean().default(true),
  targetSlideCount: z.number().min(3).max(50).optional(),
});

export const materialCombineInputSchema = z.object({
  materials: z.array(z.object({
    id: z.string(),
    content: z.string(),
    name: z.string().optional(),
    weight: z.number().min(0).max(1).optional().default(1),
  })).min(1).describe('Materials to combine'),
  strategy: z.enum(['merge', 'prioritize', 'section']).default('merge'),
});

export type MaterialExtractInput = z.infer<typeof materialExtractInputSchema>;
export type MaterialSummarizeInput = z.infer<typeof materialSummarizeInputSchema>;
export type MaterialAnalyzeInput = z.infer<typeof materialAnalyzeInputSchema>;
export type MaterialCombineInput = z.infer<typeof materialCombineInputSchema>;

// =====================
// Result Types
// =====================

export interface MaterialToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// =====================
// Helper Functions
// =====================

/**
 * Extract text content from various formats
 */
function extractTextContent(content: string, mimeType?: string): string {
  // Handle HTML content
  if (mimeType?.includes('html') || content.trim().startsWith('<')) {
    return stripHtml(content);
  }
  
  // Handle Markdown
  if (mimeType?.includes('markdown') || content.includes('# ')) {
    return cleanMarkdown(content);
  }
  
  // Plain text - just clean it up
  return cleanText(content);
}

/**
 * Strip HTML tags from content
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Clean markdown content
 */
function cleanMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, '[CODE BLOCK]')
    .replace(/`[^`]+`/g, (match) => match.slice(1, -1))
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '[Image: $1]')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Clean plain text
 */
function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Detect language from content (simple heuristic)
 */
function detectLanguage(text: string): string {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const japaneseChars = (text.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
  const koreanChars = (text.match(/[\uac00-\ud7af]/g) || []).length;
  const totalChars = text.length;
  
  if (chineseChars / totalChars > 0.1) return 'zh';
  if (japaneseChars / totalChars > 0.1) return 'ja';
  if (koreanChars / totalChars > 0.1) return 'ko';
  
  return 'en';
}

/**
 * Extract key sentences from text
 */
function extractKeySentences(text: string, count: number = 5): string[] {
  const sentences = text
    .split(/[.!?。！？]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 300);
  
  // Score sentences by position and content
  const scored = sentences.map((sentence, index) => {
    let score = 0;
    
    // Position scoring - first and last sentences are important
    if (index < 3) score += 3 - index;
    if (index >= sentences.length - 2) score += 1;
    
    // Length scoring - medium length sentences preferred
    if (sentence.length > 50 && sentence.length < 200) score += 2;
    
    // Keyword scoring
    const importantWords = ['important', 'key', 'main', 'primary', 'essential', 
      'significant', 'critical', 'fundamental', 'core', 'central',
      '重要', '关键', '主要', '核心', '基本'];
    for (const word of importantWords) {
      if (sentence.toLowerCase().includes(word)) score += 2;
    }
    
    // Number presence (data points)
    if (/\d+%|\d+\.\d+|\$\d+/.test(sentence)) score += 1;
    
    return { sentence, score };
  });
  
  // Sort by score and take top N
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(s => s.sentence);
}

/**
 * Extract sections from content
 */
function extractSections(text: string): Array<{ title: string; content: string; importance: number }> {
  const sections: Array<{ title: string; content: string; importance: number }> = [];
  
  // Try to split by headings
  const headingPattern = /^(?:#{1,3}\s+|[A-Z][^.!?]*:|\d+\.\s+[A-Z])/gm;
  const parts = text.split(headingPattern);
  const headings = text.match(headingPattern) || [];
  
  if (headings.length > 0) {
    for (let i = 0; i < headings.length; i++) {
      const title = headings[i].replace(/^#+\s*/, '').replace(/:$/, '').trim();
      const content = (parts[i + 1] || '').trim();
      if (title && content) {
        sections.push({
          title,
          content: content.substring(0, 500),
          importance: i < 3 ? 1 - (i * 0.1) : 0.5,
        });
      }
    }
  }
  
  // If no sections found, create artificial ones
  if (sections.length === 0) {
    const paragraphs = text.split(/\n\n+/).filter(p => p.length > 50);
    const chunkSize = Math.ceil(paragraphs.length / 5);
    
    for (let i = 0; i < Math.min(5, Math.ceil(paragraphs.length / chunkSize)); i++) {
      const chunk = paragraphs.slice(i * chunkSize, (i + 1) * chunkSize).join('\n\n');
      if (chunk) {
        sections.push({
          title: `Section ${i + 1}`,
          content: chunk.substring(0, 500),
          importance: i === 0 ? 1 : 0.8 - (i * 0.1),
        });
      }
    }
  }
  
  return sections;
}

/**
 * Extract entities from text (simplified NER)
 */
function extractEntities(text: string): PPTMaterialAnalysis['entities'] {
  const entities: PPTMaterialAnalysis['entities'] = [];
  const entityMap = new Map<string, { type: PPTMaterialAnalysis['entities'][0]['type']; count: number }>();
  
  // Extract numbers/percentages
  const numbers = text.match(/\d+(?:\.\d+)?%|\$\d+(?:,\d{3})*(?:\.\d+)?|\d+(?:,\d{3})+/g) || [];
  for (const num of numbers) {
    const key = num;
    const existing = entityMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      entityMap.set(key, { type: 'number', count: 1 });
    }
  }
  
  // Extract dates
  const dates = text.match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}|\b\d{4}[-/]\d{2}[-/]\d{2}\b|\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/gi) || [];
  for (const date of dates) {
    const key = date;
    const existing = entityMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      entityMap.set(key, { type: 'date', count: 1 });
    }
  }
  
  // Extract capitalized phrases (potential names/organizations)
  const capitalPhrases = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g) || [];
  for (const phrase of capitalPhrases) {
    if (phrase.length > 5) {
      const key = phrase;
      const existing = entityMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        // Guess type based on common patterns
        let type: PPTMaterialAnalysis['entities'][0]['type'] = 'concept';
        if (/Inc\.|Corp\.|Ltd\.|LLC|Company|Group|Foundation/i.test(phrase)) {
          type = 'organization';
        } else if (/University|Institute|College|School/i.test(phrase)) {
          type = 'organization';
        }
        entityMap.set(key, { type, count: 1 });
      }
    }
  }
  
  // Convert map to array and sort by mentions
  for (const [name, data] of entityMap.entries()) {
    entities.push({ name, type: data.type, mentions: data.count });
  }
  
  return entities.sort((a, b) => b.mentions - a.mentions).slice(0, 20);
}

/**
 * Generate summary from content
 */
function generateSummary(content: string, targetLength: number, depth: string): string {
  const keySentences = extractKeySentences(content, depth === 'brief' ? 3 : depth === 'detailed' ? 8 : 5);
  
  let summary = keySentences.join('. ');
  
  // Trim to target length
  if (summary.length > targetLength) {
    summary = summary.substring(0, targetLength - 3) + '...';
  }
  
  return summary;
}

/**
 * Extract key topics from content
 */
function extractKeyTopics(content: string): string[] {
  const words = content.toLowerCase().split(/\s+/);
  const wordFreq = new Map<string, number>();
  
  // Stop words to ignore
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
    'shall', 'can', 'need', 'dare', 'ought', 'used', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'whom',
    'their', 'its', 'his', 'her', 'our', 'your', 'my', 'not', 'no', 'nor', 'so',
  ]);
  
  for (const word of words) {
    const cleaned = word.replace(/[^a-z]/g, '');
    if (cleaned.length > 3 && !stopWords.has(cleaned)) {
      wordFreq.set(cleaned, (wordFreq.get(cleaned) || 0) + 1);
    }
  }
  
  // Get top words as topics
  const topics = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
  
  return topics;
}

// =====================
// Tool Implementations
// =====================

/**
 * Extract material content from various sources
 */
export function executeMaterialExtract(input: MaterialExtractInput): MaterialToolResult {
  try {
    const extractedContent = extractTextContent(input.content, input.mimeType);
    const wordCount = countWords(extractedContent);
    const language = detectLanguage(extractedContent);
    
    const material: PPTMaterial = {
      id: `material-${Date.now()}`,
      type: input.type as PPTMaterialType,
      name: input.name || `Material ${Date.now()}`,
      content: extractedContent,
      mimeType: input.mimeType,
      metadata: {
        wordCount,
        language,
        extractedAt: new Date(),
      },
    };
    
    return {
      success: true,
      data: {
        material,
        stats: {
          originalLength: input.content.length,
          extractedLength: extractedContent.length,
          wordCount,
          language,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract material',
    };
  }
}

/**
 * Summarize material content
 */
export function executeMaterialSummarize(input: MaterialSummarizeInput): MaterialToolResult {
  try {
    const summary = generateSummary(input.content, input.targetLength, input.depth);
    const keyPoints = extractKeySentences(input.content, input.depth === 'brief' ? 3 : 5);
    const keyTopics = extractKeyTopics(input.content);
    
    return {
      success: true,
      data: {
        summary,
        keyPoints,
        keyTopics,
        originalLength: input.content.length,
        summaryLength: summary.length,
        compressionRatio: ((1 - summary.length / input.content.length) * 100).toFixed(1) + '%',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to summarize material',
    };
  }
}

/**
 * Analyze material structure and content
 */
export function executeMaterialAnalyze(input: MaterialAnalyzeInput): MaterialToolResult {
  try {
    const content = input.content;
    const wordCount = countWords(content);
    const language = detectLanguage(content);
    
    // Extract sections
    const sections = input.detectStructure ? extractSections(content) : [];
    
    // Extract entities
    const entities = input.extractEntities ? extractEntities(content) : [];
    
    // Extract key information
    const keyTopics = extractKeyTopics(content);
    const keyPoints = extractKeySentences(content, 7);
    const summary = generateSummary(content, 300, 'standard');
    
    // Determine complexity
    const avgSentenceLength = content.length / (content.split(/[.!?。！？]+/).length || 1);
    const complexity: PPTMaterialAnalysis['complexity'] = 
      avgSentenceLength > 25 ? 'complex' : avgSentenceLength > 15 ? 'moderate' : 'simple';
    
    // Suggest slide count
    const suggestedSlideCount = input.targetSlideCount || Math.max(5, Math.min(20, Math.ceil(wordCount / 150)));
    
    // Check for data presence
    const hasData = /\d+%|\$\d+|chart|graph|table|data/i.test(content);
    const hasImages = /image|figure|photo|diagram|illustration/i.test(content);
    
    const analysis: PPTMaterialAnalysis = {
      id: `analysis-${Date.now()}`,
      materialId: `material-${Date.now()}`,
      summary,
      keyTopics,
      keyPoints,
      entities,
      structure: {
        sections,
        hasData,
        hasImages,
        suggestedSlideCount,
      },
      complexity,
      language,
    };
    
    return {
      success: true,
      data: {
        analysis,
        stats: {
          wordCount,
          sectionCount: sections.length,
          entityCount: entities.length,
          topicCount: keyTopics.length,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze material',
    };
  }
}

/**
 * Combine multiple materials into one
 */
export function executeMaterialCombine(input: MaterialCombineInput): MaterialToolResult {
  try {
    let combinedContent = '';
    
    switch (input.strategy) {
      case 'merge':
        // Simple merge with separators
        combinedContent = input.materials
          .map(m => m.content)
          .join('\n\n---\n\n');
        break;
        
      case 'prioritize':
        // Sort by weight and merge
        const sorted = [...input.materials].sort((a, b) => (b.weight || 1) - (a.weight || 1));
        combinedContent = sorted.map(m => m.content).join('\n\n---\n\n');
        break;
        
      case 'section':
        // Create sections with headers
        combinedContent = input.materials
          .map(m => `## ${m.name || m.id}\n\n${m.content}`)
          .join('\n\n');
        break;
    }
    
    const wordCount = countWords(combinedContent);
    
    return {
      success: true,
      data: {
        content: combinedContent,
        materialCount: input.materials.length,
        totalWordCount: wordCount,
        strategy: input.strategy,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to combine materials',
    };
  }
}

// =====================
// AI-Enhanced Analysis Prompts
// =====================

/**
 * Generate AI prompt for material summarization
 */
export function generateSummarizationPrompt(
  content: string,
  options: {
    depth: 'brief' | 'standard' | 'detailed';
    targetLength: number;
    focusAreas?: string[];
    language: string;
  }
): string {
  const focusSection = options.focusAreas?.length 
    ? `\nFocus especially on: ${options.focusAreas.join(', ')}`
    : '';
  
  const lengthGuide = options.depth === 'brief' 
    ? '3-5 sentences' 
    : options.depth === 'detailed' 
      ? '2-3 paragraphs with specific details'
      : '1 paragraph with key points';
  
  return `Summarize the following content for a presentation.

Requirements:
- Length: ${lengthGuide} (approximately ${options.targetLength} characters)
- Language: ${options.language}
- Extract the most important information
- Maintain accuracy and key facts
- Make it suitable for presentation slides${focusSection}

Content:
${content.substring(0, 8000)}

Provide your summary in JSON format:
{
  "summary": "concise summary text",
  "keyPoints": ["point 1", "point 2", ...],
  "keyTopics": ["topic 1", "topic 2", ...],
  "suggestedTitle": "suggested presentation title"
}`;
}

/**
 * Generate AI prompt for material analysis
 */
export function generateAnalysisPrompt(
  content: string,
  options: {
    targetSlideCount?: number;
    presentationStyle?: string;
  }
): string {
  return `Analyze the following content for creating a presentation.

Content:
${content.substring(0, 8000)}

Target: ${options.targetSlideCount || 10} slides
Style: ${options.presentationStyle || 'professional'}

Provide analysis in JSON format:
{
  "summary": "overall summary",
  "keyTopics": ["main topic 1", "main topic 2", ...],
  "keyPoints": ["key point 1", "key point 2", ...],
  "suggestedOutline": [
    {
      "title": "slide title",
      "type": "title|content|bullets|image|chart|closing",
      "keyPoints": ["point 1", "point 2"],
      "needsImage": true/false,
      "imageSuggestion": "description if needed"
    }
  ],
  "dataElements": ["any data/charts mentioned"],
  "complexity": "simple|moderate|complex",
  "recommendedStyle": "professional|creative|academic|minimal"
}`;
}

// =====================
// Tool Definitions
// =====================

export const materialTools = {
  material_extract: {
    name: 'material_extract',
    description: 'Extract and clean content from various input formats (HTML, Markdown, plain text) for presentation generation',
    parameters: materialExtractInputSchema,
    requiresApproval: false,
    category: 'ppt' as const,
    create: () => (input: unknown) => executeMaterialExtract(input as MaterialExtractInput),
  },
  material_summarize: {
    name: 'material_summarize',
    description: 'Generate a concise summary of material content with key points and topics for presentation slides',
    parameters: materialSummarizeInputSchema,
    requiresApproval: false,
    category: 'ppt' as const,
    create: () => (input: unknown) => executeMaterialSummarize(input as MaterialSummarizeInput),
  },
  material_analyze: {
    name: 'material_analyze',
    description: 'Analyze material structure, extract entities, and suggest presentation organization',
    parameters: materialAnalyzeInputSchema,
    requiresApproval: false,
    category: 'ppt' as const,
    create: () => (input: unknown) => executeMaterialAnalyze(input as MaterialAnalyzeInput),
  },
  material_combine: {
    name: 'material_combine',
    description: 'Combine multiple materials into a unified content for presentation generation',
    parameters: materialCombineInputSchema,
    requiresApproval: false,
    category: 'ppt' as const,
    create: () => (input: unknown) => executeMaterialCombine(input as MaterialCombineInput),
  },
};

/**
 * Register material tools with the global registry
 */
export function registerMaterialTools(): void {
  import('./registry').then(({ getGlobalToolRegistry }) => {
    const registry = getGlobalToolRegistry();
    for (const tool of Object.values(materialTools)) {
      registry.register(tool);
    }
  });
}
