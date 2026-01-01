/**
 * LLM Memory Extractor - AI-powered memory extraction from conversations
 * 
 * Enhances the pattern-based extraction with LLM intelligence:
 * - Semantic understanding of memory-worthy content
 * - Context-aware extraction
 * - Multi-type extraction in single pass
 * - Confidence scoring
 * 
 * References:
 * - Mem0: LLM-based fact extraction
 * - LangMem: Semantic memory extraction
 */

import type { MemoryType } from '@/types';
import type { ConversationMessage } from './memory-pipeline';

export interface ExtractedMemoryCandidate {
  content: string;
  type: MemoryType;
  confidence: number;
  source: 'conversation' | 'summary' | 'context';
  tags?: string[];
  category?: string;
  reasoning?: string;
}

export interface LLMExtractorConfig {
  enableLLM: boolean;
  model?: string;
  temperature: number;
  maxCandidates: number;
  minConfidence: number;
  extractTypes: MemoryType[];
  customPrompt?: string;
}

export const DEFAULT_LLM_EXTRACTOR_CONFIG: LLMExtractorConfig = {
  enableLLM: false,
  temperature: 0.1,
  maxCandidates: 10,
  minConfidence: 0.6,
  extractTypes: ['preference', 'fact', 'instruction', 'context'],
};

export interface LLMFunction {
  generate: (prompt: string) => Promise<string>;
}

const EXTRACTION_PROMPT = `You are a memory extraction assistant. Analyze the conversation and extract important information that should be remembered for future interactions.

Extract memories in these categories:
- **preference**: User likes, dislikes, preferences, habits
- **fact**: Personal information (name, job, location, etc.)
- **instruction**: Rules or instructions for how to behave
- **context**: Current project, task, or situational context

For each extracted memory, provide:
1. The memory content (concise, self-contained statement)
2. The type (preference/fact/instruction/context)
3. Confidence score (0-1)
4. Optional tags

CONVERSATION:
{conversation}

Respond ONLY with a JSON array of extracted memories:
[
  {
    "content": "User prefers dark mode interfaces",
    "type": "preference",
    "confidence": 0.9,
    "tags": ["ui", "preferences"]
  }
]

If no memories worth extracting, return an empty array: []`;

export class LLMMemoryExtractor {
  private config: LLMExtractorConfig;
  private llm?: LLMFunction;

  constructor(config: Partial<LLMExtractorConfig> = {}, llm?: LLMFunction) {
    this.config = { ...DEFAULT_LLM_EXTRACTOR_CONFIG, ...config };
    this.llm = llm;
  }

  updateConfig(updates: Partial<LLMExtractorConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  setLLM(llm: LLMFunction): void {
    this.llm = llm;
  }

  async extract(messages: ConversationMessage[]): Promise<ExtractedMemoryCandidate[]> {
    if (!this.config.enableLLM || !this.llm) {
      return this.extractWithPatterns(messages);
    }

    try {
      return await this.extractWithLLM(messages);
    } catch (error) {
      console.warn('LLM extraction failed, falling back to patterns:', error);
      return this.extractWithPatterns(messages);
    }
  }

  private async extractWithLLM(messages: ConversationMessage[]): Promise<ExtractedMemoryCandidate[]> {
    if (!this.llm) {
      throw new Error('LLM not configured');
    }

    const conversation = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const prompt = (this.config.customPrompt || EXTRACTION_PROMPT)
      .replace('{conversation}', conversation);

    const response = await this.llm.generate(prompt);

    try {
      const parsed = JSON.parse(response);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .filter(item => 
          item.content &&
          item.type &&
          this.config.extractTypes.includes(item.type) &&
          (item.confidence ?? 0.7) >= this.config.minConfidence
        )
        .slice(0, this.config.maxCandidates)
        .map(item => ({
          content: item.content,
          type: item.type as MemoryType,
          confidence: item.confidence ?? 0.7,
          source: 'conversation' as const,
          tags: item.tags,
          category: item.category,
          reasoning: item.reasoning,
        }));
    } catch {
      console.warn('Failed to parse LLM extraction response');
      return this.extractWithPatterns(messages);
    }
  }

  extractWithPatterns(messages: ConversationMessage[]): ExtractedMemoryCandidate[] {
    const candidates: ExtractedMemoryCandidate[] = [];
    const seen = new Set<string>();

    const patterns: Record<MemoryType, Array<{ regex: RegExp; confidence: number }>> = {
      preference: [
        { regex: /(?:i prefer|i like|i love|i always|i usually|my favorite|i enjoy)\s+(.+)/gi, confidence: 0.8 },
        { regex: /(?:i don't like|i hate|i avoid|i never)\s+(.+)/gi, confidence: 0.8 },
        { regex: /(?:please always|always use|never use|don't ever)\s+(.+)/gi, confidence: 0.85 },
        { regex: /(?:i'd rather|i would prefer|my preference is)\s+(.+)/gi, confidence: 0.8 },
      ],
      fact: [
        { regex: /(?:my name is|i am|i'm a|i work at|i work as|i live in|i'm from)\s+(.+)/gi, confidence: 0.9 },
        { regex: /(?:my email is|my phone is|my address is|my birthday is)\s+(.+)/gi, confidence: 0.95 },
        { regex: /(?:i have|i own|i speak|i know|i studied)\s+(.+)/gi, confidence: 0.75 },
        { regex: /(?:i'm \d+ years old|i am \d+ years old)/gi, confidence: 0.9 },
      ],
      instruction: [
        { regex: /(?:remember to|don't forget to|make sure to|when you|if i ask|whenever i)\s+(.+)/gi, confidence: 0.85 },
        { regex: /(?:call me|address me as|refer to me as)\s+(.+)/gi, confidence: 0.9 },
        { regex: /(?:respond in|use .+ format|format .+ as|always include)\s+(.+)/gi, confidence: 0.85 },
        { regex: /(?:always|never)\s+(?:respond|reply|answer|use)\s+(.+)/gi, confidence: 0.8 },
      ],
      context: [
        { regex: /(?:i'm working on|i'm building|my project is|the codebase|the application)\s+(.+)/gi, confidence: 0.75 },
        { regex: /(?:we use|our team|our company|the technology stack)\s+(.+)/gi, confidence: 0.7 },
        { regex: /(?:the current task|the goal is|we need to|the requirement is)\s+(.+)/gi, confidence: 0.7 },
      ],
    };

    for (const message of messages) {
      if (message.role === 'system') continue;

      const content = message.content;

      for (const type of this.config.extractTypes) {
        const typePatterns = patterns[type] || [];

        for (const { regex, confidence } of typePatterns) {
          regex.lastIndex = 0;
          let match;

          while ((match = regex.exec(content)) !== null) {
            const extractedContent = match[0].trim();
            const normalizedContent = extractedContent.toLowerCase();

            if (seen.has(normalizedContent) || extractedContent.length < 10) {
              continue;
            }

            seen.add(normalizedContent);

            if (confidence >= this.config.minConfidence) {
              candidates.push({
                content: extractedContent,
                type,
                confidence,
                source: 'conversation',
              });
            }

            if (candidates.length >= this.config.maxCandidates) {
              break;
            }
          }
        }
      }
    }

    return candidates
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.config.maxCandidates);
  }

  async extractFromSummary(summary: string): Promise<ExtractedMemoryCandidate[]> {
    const candidates: ExtractedMemoryCandidate[] = [];

    const summaryPatterns = [
      { regex: /(?:user prefers|user likes|user's preference)\s+(.+)/gi, type: 'preference' as MemoryType },
      { regex: /(?:user is|user works|user lives|user's name)\s+(.+)/gi, type: 'fact' as MemoryType },
      { regex: /(?:user wants|user needs|user requested)\s+(.+)/gi, type: 'instruction' as MemoryType },
      { regex: /(?:current project|working on|building)\s+(.+)/gi, type: 'context' as MemoryType },
    ];

    for (const { regex, type } of summaryPatterns) {
      if (!this.config.extractTypes.includes(type)) continue;

      regex.lastIndex = 0;
      let match;

      while ((match = regex.exec(summary)) !== null) {
        const extractedContent = match[0].trim();
        if (extractedContent.length >= 10) {
          candidates.push({
            content: extractedContent,
            type,
            confidence: 0.6,
            source: 'summary',
          });
        }
      }
    }

    return candidates.slice(0, this.config.maxCandidates);
  }

  detectExplicitMemoryRequest(message: string): ExtractedMemoryCandidate | null {
    const lowerMessage = message.toLowerCase();

    const explicitTriggers = [
      'remember this',
      'remember that',
      'please remember',
      'don\'t forget',
      'keep in mind',
      'note that',
      'save this',
      'store this',
    ];

    if (explicitTriggers.some(trigger => lowerMessage.includes(trigger))) {
      return {
        content: message,
        type: 'instruction',
        confidence: 0.95,
        source: 'conversation',
        reasoning: 'Explicit memory request detected',
      };
    }

    return null;
  }

  inferTags(content: string, type: MemoryType): string[] {
    const tags: string[] = [type];

    const tagPatterns: Record<string, RegExp> = {
      'code': /\b(code|programming|coding|developer|software)\b/i,
      'ui': /\b(ui|interface|design|theme|dark mode|light mode)\b/i,
      'communication': /\b(email|phone|address|contact)\b/i,
      'work': /\b(work|job|company|office|team)\b/i,
      'personal': /\b(name|birthday|age|family|home)\b/i,
      'preference': /\b(prefer|like|favorite|enjoy|hate|avoid)\b/i,
      'language': /\b(language|speak|english|chinese|spanish)\b/i,
      'format': /\b(format|style|markdown|json|xml)\b/i,
    };

    for (const [tag, pattern] of Object.entries(tagPatterns)) {
      if (pattern.test(content)) {
        tags.push(tag);
      }
    }

    return [...new Set(tags)];
  }
}

export function createLLMExtractor(
  config?: Partial<LLMExtractorConfig>,
  llm?: LLMFunction
): LLMMemoryExtractor {
  return new LLMMemoryExtractor(config, llm);
}

export default LLMMemoryExtractor;
