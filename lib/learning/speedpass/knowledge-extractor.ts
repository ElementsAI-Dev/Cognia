/**
 * Knowledge Extractor
 * 
 * AI-powered extraction of knowledge points from textbook content.
 * Identifies definitions, theorems, formulas, concepts, and methods.
 */

import type {
  TextbookKnowledgePoint,
  KnowledgePointType,
  KnowledgePointImportance,
  TextbookChapter,
} from '@/types/learning/speedpass';
import type { ParsedPage } from './textbook-parser';

// ============================================================================
// Types
// ============================================================================

export interface ExtractionResult {
  knowledgePoints: TextbookKnowledgePoint[];
  totalExtracted: number;
  byType: Record<KnowledgePointType, number>;
  byImportance: Record<KnowledgePointImportance, number>;
}

export interface ExtractionOptions {
  extractDefinitions?: boolean;
  extractTheorems?: boolean;
  extractFormulas?: boolean;
  extractConcepts?: boolean;
  extractMethods?: boolean;
  minConfidence?: number;
}

export type ExtractionProgressCallback = (progress: {
  current: number;
  total: number;
  currentType: string;
  message: string;
}) => void;

// ============================================================================
// Detection Patterns
// ============================================================================

const KNOWLEDGE_PATTERNS: Record<KnowledgePointType, RegExp[]> = {
  definition: [
    /定义\s*[\d\.]+[：:]\s*(.+)/,
    /【定义】\s*(.+)/,
    /Definition\s*[\d\.]+[：:]\s*(.+)/i,
    /称.*为/,
    /叫做/,
    /定义为/,
  ],
  theorem: [
    /定理\s*[\d\.]+[：:]\s*(.+)/,
    /【定理】\s*(.+)/,
    /Theorem\s*[\d\.]+[：:]\s*(.+)/i,
    /引理\s*[\d\.]+/,
    /推论\s*[\d\.]+/,
  ],
  formula: [
    /公式\s*[\d\.]+[：:]/,
    /【公式】/,
    /Formula\s*[\d\.]+/i,
    /\$\$.+\$\$/,
    /\\\[.+\\\]/,
  ],
  concept: [
    /概念\s*[\d\.]+[：:]/,
    /【概念】/,
    /基本概念/,
    /Concept\s*[\d\.]+/i,
  ],
  method: [
    /方法\s*[\d\.]+[：:]/,
    /【方法】/,
    /步骤[：:]/,
    /Method\s*[\d\.]+/i,
    /解法/,
    /求解方法/,
  ],
  property: [
    /性质\s*[\d\.]+[：:]/,
    /【性质】/,
    /Property\s*[\d\.]+/i,
  ],
  corollary: [
    /推论\s*[\d\.]+[：:]/,
    /【推论】/,
    /Corollary\s*[\d\.]+/i,
  ],
  lemma: [
    /引理\s*[\d\.]+[：:]/,
    /【引理】/,
    /Lemma\s*[\d\.]+/i,
  ],
};

const IMPORTANCE_KEYWORDS: Record<KnowledgePointImportance, string[]> = {
  critical: ['重要', '必考', '核心', '关键', '基础', 'important', 'key', 'fundamental'],
  high: ['常考', '重点', '主要', 'major', 'primary'],
  medium: ['一般', '了解', 'secondary'],
  low: ['补充', '扩展', '选学', 'optional', 'supplementary'],
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Detect knowledge point type from text
 */
export function detectKnowledgePointType(text: string): KnowledgePointType | null {
  for (const [type, patterns] of Object.entries(KNOWLEDGE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return type as KnowledgePointType;
      }
    }
  }
  return null;
}

/**
 * Assess importance level from text content
 */
export function assessImportance(text: string, context?: string): KnowledgePointImportance {
  const fullText = (text + ' ' + (context || '')).toLowerCase();
  
  for (const [importance, keywords] of Object.entries(IMPORTANCE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (fullText.includes(keyword.toLowerCase())) {
        return importance as KnowledgePointImportance;
      }
    }
  }
  
  // Default to medium if no keywords found
  return 'medium';
}

/**
 * Calculate difficulty score based on content complexity
 */
export function calculateDifficulty(text: string): number {
  let score = 0.5; // Default medium difficulty
  
  // More formulas = higher difficulty
  const formulaCount = (text.match(/\$[^$]+\$/g) || []).length;
  score += formulaCount * 0.05;
  
  // Longer content = slightly higher difficulty
  const wordCount = text.split(/\s+/).length;
  if (wordCount > 200) score += 0.1;
  if (wordCount > 500) score += 0.1;
  
  // Technical terms increase difficulty
  const technicalTerms = [
    '微分', '积分', '极限', '导数', '偏导', '梯度',
    'derivative', 'integral', 'limit', 'gradient',
    '矩阵', '向量', '特征值', '行列式',
    'matrix', 'vector', 'eigenvalue', 'determinant',
  ];
  
  for (const term of technicalTerms) {
    if (text.toLowerCase().includes(term.toLowerCase())) {
      score += 0.02;
    }
  }
  
  // Clamp to [0, 1]
  return Math.min(1, Math.max(0, score));
}

/**
 * Extract title from knowledge point text
 */
export function extractTitle(text: string, type: KnowledgePointType): string {
  // Try to extract title from pattern
  const patterns = KNOWLEDGE_PATTERNS[type];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      // Get first line or first 50 chars
      const title = match[1].split('\n')[0].trim();
      return title.length > 50 ? title.slice(0, 47) + '...' : title;
    }
  }
  
  // Fallback: use first line or first 50 chars
  const firstLine = text.split('\n')[0].trim();
  return firstLine.length > 50 ? firstLine.slice(0, 47) + '...' : firstLine;
}

/**
 * Extract LaTeX formulas from text
 */
export function extractFormulasFromText(text: string): string[] {
  const formulas: string[] = [];
  
  // Inline math: $...$
  const inlineMatches = text.matchAll(/\$([^$]+)\$/g);
  for (const match of inlineMatches) {
    if (match[1].trim()) {
      formulas.push(match[1].trim());
    }
  }
  
  // Display math: $$...$$
  const displayMatches = text.matchAll(/\$\$([^$]+)\$\$/g);
  for (const match of displayMatches) {
    if (match[1].trim()) {
      formulas.push(match[1].trim());
    }
  }
  
  return [...new Set(formulas)]; // Remove duplicates
}

/**
 * Generate summary for knowledge point
 */
export function generateSummary(content: string, maxLength: number = 200): string {
  // Remove formulas for summary
  const withoutFormulas = content
    .replace(/\$\$[^$]+\$\$/g, '[公式]')
    .replace(/\$[^$]+\$/g, '[公式]');
  
  // Get first paragraph or sentences
  const paragraphs = withoutFormulas.split('\n\n').filter((p) => p.trim());
  const firstParagraph = paragraphs[0] || withoutFormulas;
  
  if (firstParagraph.length <= maxLength) {
    return firstParagraph.trim();
  }
  
  // Truncate at sentence boundary if possible
  const sentences = firstParagraph.match(/[^。！？.!?]+[。！？.!?]/g) || [];
  let summary = '';
  
  for (const sentence of sentences) {
    if ((summary + sentence).length <= maxLength) {
      summary += sentence;
    } else {
      break;
    }
  }
  
  return summary.trim() || firstParagraph.slice(0, maxLength - 3) + '...';
}

// ============================================================================
// Main Extraction Functions
// ============================================================================

/**
 * Extract knowledge points from parsed pages
 */
export function extractKnowledgePoints(
  textbookId: string,
  chapters: TextbookChapter[],
  pages: ParsedPage[],
  options: ExtractionOptions = {},
  onProgress?: ExtractionProgressCallback
): ExtractionResult {
  const {
    extractDefinitions = true,
    extractTheorems = true,
    extractFormulas = true,
    extractConcepts = true,
    extractMethods = true,
    minConfidence = 0.6,
  } = options;
  
  const knowledgePoints: TextbookKnowledgePoint[] = [];
  const byType: Record<KnowledgePointType, number> = {
    definition: 0,
    theorem: 0,
    formula: 0,
    concept: 0,
    method: 0,
    property: 0,
    corollary: 0,
    lemma: 0,
  };
  const byImportance: Record<KnowledgePointImportance, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  
  let kpIndex = 0;
  const totalPages = pages.length;
  
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    
    onProgress?.({
      current: i + 1,
      total: totalPages,
      currentType: '知识点',
      message: `正在提取第 ${page.pageNumber} 页的知识点...`,
    });
    
    // Find which chapter this page belongs to
    const chapter = chapters.find(
      (c) => page.pageNumber >= c.pageStart && page.pageNumber <= c.pageEnd
    );
    
    // Split content into potential knowledge point blocks
    const blocks = splitIntoBlocks(page.content);
    
    for (const block of blocks) {
      const type = detectKnowledgePointType(block);
      
      if (!type) continue;
      
      // Check if this type should be extracted
      if (
        (type === 'definition' && !extractDefinitions) ||
        (type === 'theorem' && !extractTheorems) ||
        (type === 'formula' && !extractFormulas) ||
        (type === 'concept' && !extractConcepts) ||
        (type === 'method' && !extractMethods)
      ) {
        continue;
      }
      
      const confidence = calculateExtractionConfidence(block, type);
      if (confidence < minConfidence) continue;
      
      kpIndex++;
      const importance = assessImportance(block);
      const difficulty = calculateDifficulty(block);
      const formulas = extractFormulasFromText(block);
      
      const knowledgePoint: TextbookKnowledgePoint = {
        id: `kp_${textbookId}_${kpIndex}`,
        textbookId,
        chapterId: chapter?.id || '',
        title: extractTitle(block, type),
        content: block,
        summary: generateSummary(block),
        type,
        importance,
        difficulty,
        formulas: formulas.length > 0 ? formulas : undefined,
        pageNumber: page.pageNumber,
        extractionConfidence: confidence,
        verified: false,
      };
      
      knowledgePoints.push(knowledgePoint);
      byType[type]++;
      byImportance[importance]++;
    }
  }
  
  return {
    knowledgePoints,
    totalExtracted: knowledgePoints.length,
    byType,
    byImportance,
  };
}

/**
 * Split content into potential knowledge point blocks
 */
function splitIntoBlocks(content: string): string[] {
  const blocks: string[] = [];
  
  // Split by double newlines or known markers
  const rawBlocks = content.split(/\n\n+/);
  
  let currentBlock = '';
  
  for (const raw of rawBlocks) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    
    // Check if this is a new knowledge point start
    const isNewKP = detectKnowledgePointType(trimmed) !== null;
    
    if (isNewKP && currentBlock) {
      blocks.push(currentBlock.trim());
      currentBlock = trimmed;
    } else {
      currentBlock += (currentBlock ? '\n\n' : '') + trimmed;
    }
  }
  
  if (currentBlock.trim()) {
    blocks.push(currentBlock.trim());
  }
  
  return blocks;
}

/**
 * Calculate confidence score for extraction
 */
function calculateExtractionConfidence(text: string, type: KnowledgePointType): number {
  let confidence = 0.5;
  
  // Pattern match increases confidence
  const patterns = KNOWLEDGE_PATTERNS[type];
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      confidence += 0.2;
      break;
    }
  }
  
  // Structured content increases confidence
  if (text.includes('：') || text.includes(':')) confidence += 0.1;
  if (text.includes('定义') || text.includes('定理')) confidence += 0.1;
  
  // Formulas increase confidence for formula type
  if (type === 'formula' && /\$[^$]+\$/.test(text)) confidence += 0.2;
  
  // Reasonable length increases confidence
  const length = text.length;
  if (length > 50 && length < 2000) confidence += 0.1;
  
  return Math.min(1, confidence);
}

/**
 * Find related knowledge points based on content similarity
 */
export function findRelatedKnowledgePoints(
  targetKP: TextbookKnowledgePoint,
  allKPs: TextbookKnowledgePoint[],
  maxResults: number = 5
): TextbookKnowledgePoint[] {
  const scores: Array<{ kp: TextbookKnowledgePoint; score: number }> = [];
  
  for (const kp of allKPs) {
    if (kp.id === targetKP.id) continue;
    
    let score = 0;
    
    // Same chapter bonus
    if (kp.chapterId === targetKP.chapterId) score += 0.3;
    
    // Same type bonus
    if (kp.type === targetKP.type) score += 0.2;
    
    // Shared formulas
    if (targetKP.formulas && kp.formulas) {
      const shared = targetKP.formulas.filter((f) => kp.formulas?.includes(f)).length;
      score += shared * 0.1;
    }
    
    // Text similarity (simple word overlap)
    const targetWords = new Set(targetKP.content.toLowerCase().split(/\s+/));
    const kpWords = new Set(kp.content.toLowerCase().split(/\s+/));
    const overlap = [...targetWords].filter((w) => kpWords.has(w)).length;
    score += (overlap / Math.max(targetWords.size, kpWords.size)) * 0.3;
    
    if (score > 0.2) {
      scores.push({ kp, score });
    }
  }
  
  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => s.kp);
}

/**
 * Build prerequisite relationships between knowledge points
 */
export function buildPrerequisites(
  knowledgePoints: TextbookKnowledgePoint[]
): Map<string, string[]> {
  const prerequisites = new Map<string, string[]>();
  
  // Sort by page number (earlier pages are prerequisites for later ones)
  const sorted = [...knowledgePoints].sort((a, b) => a.pageNumber - b.pageNumber);
  
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const prereqs: string[] = [];
    
    // Look for references to earlier knowledge points
    for (let j = 0; j < i; j++) {
      const earlier = sorted[j];
      
      // Check if current content references earlier title
      if (current.content.includes(earlier.title)) {
        prereqs.push(earlier.id);
      }
      
      // Check formula dependencies
      if (current.formulas && earlier.formulas) {
        for (const formula of earlier.formulas) {
          if (current.formulas.some((f) => f.includes(formula) || formula.includes(f))) {
            if (!prereqs.includes(earlier.id)) {
              prereqs.push(earlier.id);
            }
          }
        }
      }
    }
    
    if (prereqs.length > 0) {
      prerequisites.set(current.id, prereqs);
    }
  }
  
  return prerequisites;
}
