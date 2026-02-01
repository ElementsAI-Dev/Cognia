/**
 * Knowledge Matcher
 *
 * AI-powered matching between teacher key points and textbook knowledge points.
 * Uses semantic similarity and keyword matching to identify relevant content.
 */

import type { TextbookKnowledgePoint } from '@/types/learning/speedpass';

// ============================================================================
// Types
// ============================================================================

export interface MatchedKnowledgePoint {
  knowledgePoint: TextbookKnowledgePoint;
  matchScore: number;
  matchReasons: string[];
  isExactMatch: boolean;
}

export interface TeacherKeyPointMatch {
  originalText: string;
  matches: MatchedKnowledgePoint[];
  confidence: number;
}

export interface MatchingOptions {
  minMatchScore?: number;
  maxMatches?: number;
  includePartialMatches?: boolean;
  prioritizeExactMatches?: boolean;
}

interface ParsedKeyPoint {
  text: string;
  keywords: string[];
  concepts: string[];
}

// ============================================================================
// Default Options
// ============================================================================

const DEFAULT_OPTIONS: Required<MatchingOptions> = {
  minMatchScore: 0.3,
  maxMatches: 5,
  includePartialMatches: true,
  prioritizeExactMatches: true,
};

// ============================================================================
// Text Processing Utilities
// ============================================================================

/**
 * Extract keywords from text using simple tokenization
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    '的', '是', '在', '了', '和', '与', '或', '及', '等', '这', '那',
    '有', '为', '以', '于', '到', '从', '被', '把', '让', '给', '对',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'under', 'again',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1 && !stopWords.has(word));

  return [...new Set(words)];
}

/**
 * Extract mathematical/scientific concepts from text
 */
function extractConcepts(text: string): string[] {
  const conceptPatterns = [
    /(\w+定[理律则])/g,
    /(\w+公式)/g,
    /(\w+方程)/g,
    /(\w+函数)/g,
    /(\w+定义)/g,
    /(\w+性质)/g,
    /(\w+theorem)/gi,
    /(\w+formula)/gi,
    /(\w+equation)/gi,
    /(\w+principle)/gi,
    /(\w+law)/gi,
  ];

  const concepts: string[] = [];
  for (const pattern of conceptPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      concepts.push(...matches.map((m) => m.toLowerCase()));
    }
  }

  return [...new Set(concepts)];
}

/**
 * Calculate Jaccard similarity between two sets of keywords
 */
function calculateJaccardSimilarity(set1: string[], set2: string[]): number {
  const s1 = new Set(set1);
  const s2 = new Set(set2);

  const intersection = new Set([...s1].filter((x) => s2.has(x)));
  const union = new Set([...s1, ...s2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Calculate substring containment score
 */
function calculateContainmentScore(text1: string, text2: string): number {
  const t1 = text1.toLowerCase();
  const t2 = text2.toLowerCase();

  if (t1.includes(t2) || t2.includes(t1)) {
    return 1.0;
  }

  const words1 = t1.split(/\s+/);

  let containedWords = 0;
  for (const word of words1) {
    if (word.length > 2 && t2.includes(word)) {
      containedWords++;
    }
  }

  return words1.length > 0 ? containedWords / words1.length : 0;
}

// ============================================================================
// Main Matching Functions
// ============================================================================

/**
 * Parse teacher's key point text into structured form
 */
function parseKeyPoint(text: string): ParsedKeyPoint {
  return {
    text: text.trim(),
    keywords: extractKeywords(text),
    concepts: extractConcepts(text),
  };
}

/**
 * Calculate match score between a parsed key point and a knowledge point
 */
function calculateMatchScore(
  keyPoint: ParsedKeyPoint,
  knowledgePoint: TextbookKnowledgePoint
): { score: number; reasons: string[]; isExact: boolean } {
  const reasons: string[] = [];
  let totalScore = 0;
  let isExact = false;

  // 1. Check for exact title match
  const kpTitle = (knowledgePoint.title || '').toLowerCase();
  const kpContent = (knowledgePoint.content || '').toLowerCase();
  const keyPointText = keyPoint.text.toLowerCase();

  if (kpTitle && keyPointText.includes(kpTitle)) {
    totalScore += 0.4;
    reasons.push('标题完全匹配');
    isExact = true;
  } else if (kpTitle && kpTitle.includes(keyPointText)) {
    totalScore += 0.35;
    reasons.push('关键词包含在标题中');
    isExact = true;
  }

  // 2. Keyword similarity
  const kpKeywords = extractKeywords(kpTitle + ' ' + kpContent);
  const keywordSimilarity = calculateJaccardSimilarity(keyPoint.keywords, kpKeywords);
  if (keywordSimilarity > 0.2) {
    totalScore += keywordSimilarity * 0.3;
    reasons.push(`关键词相似度: ${Math.round(keywordSimilarity * 100)}%`);
  }

  // 3. Concept matching
  const kpConcepts = extractConcepts(kpTitle + ' ' + kpContent);
  const conceptOverlap = keyPoint.concepts.filter((c) =>
    kpConcepts.some((kc) => kc.includes(c) || c.includes(kc))
  );
  if (conceptOverlap.length > 0) {
    totalScore += 0.2 * Math.min(conceptOverlap.length / keyPoint.concepts.length, 1);
    reasons.push(`概念匹配: ${conceptOverlap.join(', ')}`);
  }

  // 4. Content containment
  const containmentScore = calculateContainmentScore(keyPoint.text, kpContent);
  if (containmentScore > 0.3) {
    totalScore += containmentScore * 0.2;
    reasons.push(`内容包含度: ${Math.round(containmentScore * 100)}%`);
  }

  // 5. Importance boost - higher importance knowledge points get slight boost
  if (knowledgePoint.importance === 'critical') {
    totalScore *= 1.1;
    reasons.push('核心知识点');
  } else if (knowledgePoint.importance === 'high') {
    totalScore *= 1.05;
  }

  return {
    score: Math.min(totalScore, 1.0),
    reasons,
    isExact,
  };
}

/**
 * Match a single teacher key point against knowledge points
 */
export function matchKeyPoint(
  teacherKeyPoint: string,
  knowledgePoints: TextbookKnowledgePoint[],
  options: MatchingOptions = {}
): TeacherKeyPointMatch {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const parsed = parseKeyPoint(teacherKeyPoint);

  const matches: MatchedKnowledgePoint[] = [];

  for (const kp of knowledgePoints) {
    const { score, reasons, isExact } = calculateMatchScore(parsed, kp);

    if (score >= opts.minMatchScore || (opts.includePartialMatches && score >= opts.minMatchScore * 0.5)) {
      matches.push({
        knowledgePoint: kp,
        matchScore: score,
        matchReasons: reasons,
        isExactMatch: isExact,
      });
    }
  }

  // Sort by score, with exact matches first if prioritized
  matches.sort((a, b) => {
    if (opts.prioritizeExactMatches) {
      if (a.isExactMatch && !b.isExactMatch) return -1;
      if (!a.isExactMatch && b.isExactMatch) return 1;
    }
    return b.matchScore - a.matchScore;
  });

  // Limit to max matches
  const topMatches = matches.slice(0, opts.maxMatches);

  // Calculate overall confidence
  const confidence = topMatches.length > 0
    ? topMatches.reduce((sum, m) => sum + m.matchScore, 0) / topMatches.length
    : 0;

  return {
    originalText: teacherKeyPoint,
    matches: topMatches,
    confidence,
  };
}

/**
 * Match multiple teacher key points against knowledge points
 */
export function matchTeacherKeyPoints(
  teacherNotes: string,
  knowledgePoints: TextbookKnowledgePoint[],
  options: MatchingOptions = {}
): TeacherKeyPointMatch[] {
  // Split teacher notes into individual key points
  const keyPointTexts = teacherNotes
    .split(/[;；\n。!！?？]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  // Match each key point
  const results = keyPointTexts.map((text) =>
    matchKeyPoint(text, knowledgePoints, options)
  );

  // Filter out low-confidence matches
  return results.filter((r) => r.confidence > 0 || r.matches.length > 0);
}

/**
 * Get unique matched knowledge point IDs with their combined scores
 */
export function getMatchedKnowledgePointIds(
  matches: TeacherKeyPointMatch[]
): Map<string, number> {
  const scoreMap = new Map<string, number>();

  for (const match of matches) {
    for (const m of match.matches) {
      const currentScore = scoreMap.get(m.knowledgePoint.id) || 0;
      scoreMap.set(m.knowledgePoint.id, Math.max(currentScore, m.matchScore));
    }
  }

  return scoreMap;
}

/**
 * Filter knowledge points by matched IDs, sorted by match score
 */
export function filterKnowledgePointsByMatch(
  knowledgePoints: TextbookKnowledgePoint[],
  matchScores: Map<string, number>
): TextbookKnowledgePoint[] {
  return knowledgePoints
    .filter((kp) => matchScores.has(kp.id))
    .sort((a, b) => (matchScores.get(b.id) || 0) - (matchScores.get(a.id) || 0));
}

// ============================================================================
// Export Default
// ============================================================================

const knowledgeMatcher = {
  matchKeyPoint,
  matchTeacherKeyPoints,
  getMatchedKnowledgePointIds,
  filterKnowledgePointsByMatch,
};

export default knowledgeMatcher;
