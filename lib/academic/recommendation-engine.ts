/**
 * Recommendation Engine - Smart paper recommendations based on user library and interests
 * Provides multiple recommendation strategies for discovering relevant papers
 */

import type { Paper, LibraryPaper, AcademicProviderType } from '@/types/academic';
import { loggers } from '@/lib/logger';

const log = loggers.app;

export interface RecommendationReason {
  type: 'author' | 'topic' | 'citation' | 'trending' | 'field' | 'similarity' | 'co-citation';
  description: string;
  weight: number;
}

export interface RecommendedPaper extends Paper {
  reasons: RecommendationReason[];
  relevanceScore: number;
  matchedPapers?: string[]; // IDs of library papers this is related to
}

export interface RecommendationConfig {
  maxResults?: number;
  includeAuthors?: boolean;
  includeTopics?: boolean;
  includeCitations?: boolean;
  includeTrending?: boolean;
  minRelevanceScore?: number;
}

/**
 * Extract author statistics from library papers
 */
export function extractAuthorStats(
  libraryPapers: LibraryPaper[]
): Map<string, { count: number; papers: string[] }> {
  const authorStats = new Map<string, { count: number; papers: string[] }>();
  
  for (const paper of libraryPapers) {
    for (const author of paper.authors) {
      const existing = authorStats.get(author.name);
      if (existing) {
        existing.count++;
        existing.papers.push(paper.id);
      } else {
        authorStats.set(author.name, { count: 1, papers: [paper.id] });
      }
    }
  }
  
  return authorStats;
}

/**
 * Extract topic/field statistics from library papers
 */
export function extractTopicStats(
  libraryPapers: LibraryPaper[]
): Map<string, { count: number; papers: string[] }> {
  const topicStats = new Map<string, { count: number; papers: string[] }>();
  
  for (const paper of libraryPapers) {
    const topics = [
      ...(paper.fieldsOfStudy || []),
      ...(paper.keywords || []),
      ...(paper.categories || []),
    ];
    
    for (const topic of topics) {
      const normalized = topic.toLowerCase().trim();
      const existing = topicStats.get(normalized);
      if (existing) {
        existing.count++;
        existing.papers.push(paper.id);
      } else {
        topicStats.set(normalized, { count: 1, papers: [paper.id] });
      }
    }
  }
  
  return topicStats;
}

/**
 * Get favorite authors from library (sorted by paper count)
 */
export function getFavoriteAuthors(
  libraryPapers: LibraryPaper[],
  limit: number = 10
): { name: string; count: number; papers: string[] }[] {
  const authorStats = extractAuthorStats(libraryPapers);
  
  return Array.from(authorStats.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get top topics from library (sorted by paper count)
 */
export function getTopTopics(
  libraryPapers: LibraryPaper[],
  limit: number = 10
): { topic: string; count: number; papers: string[] }[] {
  const topicStats = extractTopicStats(libraryPapers);
  
  return Array.from(topicStats.entries())
    .map(([topic, stats]) => ({ topic, ...stats }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Calculate relevance score for a paper based on library
 */
export function calculateRelevanceScore(
  paper: Paper,
  libraryPapers: LibraryPaper[],
  authorStats: Map<string, { count: number; papers: string[] }>,
  topicStats: Map<string, { count: number; papers: string[] }>
): { score: number; reasons: RecommendationReason[]; matchedPapers: string[] } {
  const reasons: RecommendationReason[] = [];
  const matchedPapers = new Set<string>();
  let score = 0;
  
  // Author match (high weight)
  for (const author of paper.authors) {
    const authorData = authorStats.get(author.name);
    if (authorData) {
      const weight = Math.min(authorData.count * 15, 45); // Cap at 45
      score += weight;
      reasons.push({
        type: 'author',
        description: `By ${author.name} (${authorData.count} papers in library)`,
        weight,
      });
      authorData.papers.forEach(id => matchedPapers.add(id));
    }
  }
  
  // Topic/field match
  const paperTopics = [
    ...(paper.fieldsOfStudy || []),
    ...(paper.keywords || []),
    ...(paper.categories || []),
  ].map(t => t.toLowerCase().trim());
  
  const matchedTopics: string[] = [];
  for (const topic of paperTopics) {
    const topicData = topicStats.get(topic);
    if (topicData) {
      const weight = Math.min(topicData.count * 5, 25); // Cap at 25
      score += weight;
      matchedTopics.push(topic);
      topicData.papers.forEach(id => matchedPapers.add(id));
    }
  }
  
  if (matchedTopics.length > 0) {
    reasons.push({
      type: 'topic',
      description: `Related to: ${matchedTopics.slice(0, 3).join(', ')}${matchedTopics.length > 3 ? '...' : ''}`,
      weight: matchedTopics.length * 5,
    });
  }
  
  // Citation count bonus (papers with high citations are generally valuable)
  if (paper.citationCount && paper.citationCount > 0) {
    const citationWeight = Math.min(Math.log10(paper.citationCount) * 3, 15);
    score += citationWeight;
    if (paper.citationCount >= 100) {
      reasons.push({
        type: 'citation',
        description: `Highly cited (${paper.citationCount.toLocaleString()} citations)`,
        weight: citationWeight,
      });
    }
  }
  
  // Recency bonus for recent papers
  const currentYear = new Date().getFullYear();
  if (paper.year && paper.year >= currentYear - 2) {
    const recencyWeight = paper.year === currentYear ? 10 : 5;
    score += recencyWeight;
    reasons.push({
      type: 'trending',
      description: `Recent publication (${paper.year})`,
      weight: recencyWeight,
    });
  }
  
  return { score, reasons, matchedPapers: Array.from(matchedPapers) };
}

/**
 * Filter and score papers as recommendations
 */
export function scoreRecommendations(
  candidates: Paper[],
  libraryPapers: LibraryPaper[],
  config: RecommendationConfig = {}
): RecommendedPaper[] {
  const { minRelevanceScore = 10, maxResults = 20 } = config;
  
  const libraryIds = new Set(libraryPapers.map(p => p.id));
  const authorStats = extractAuthorStats(libraryPapers);
  const topicStats = extractTopicStats(libraryPapers);
  
  const recommendations: RecommendedPaper[] = [];
  
  for (const paper of candidates) {
    // Skip papers already in library
    if (libraryIds.has(paper.id)) continue;
    
    const { score, reasons, matchedPapers } = calculateRelevanceScore(
      paper,
      libraryPapers,
      authorStats,
      topicStats
    );
    
    if (score >= minRelevanceScore && reasons.length > 0) {
      recommendations.push({
        ...paper,
        relevanceScore: score,
        reasons,
        matchedPapers,
      });
    }
  }
  
  // Sort by relevance score and limit results
  return recommendations
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxResults);
}

/**
 * Get trending papers in user's fields of interest
 */
export function getTrendingInFields(
  candidates: Paper[],
  libraryPapers: LibraryPaper[],
  maxResults: number = 10
): RecommendedPaper[] {
  const libraryIds = new Set(libraryPapers.map(p => p.id));
  const topicStats = extractTopicStats(libraryPapers);
  const topTopics = new Set(
    Array.from(topicStats.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([topic]) => topic)
  );
  
  const currentYear = new Date().getFullYear();
  
  return candidates
    .filter(paper => !libraryIds.has(paper.id))
    .filter(paper => {
      // Must be recent
      if (!paper.year || paper.year < currentYear - 2) return false;
      // Must have citations for trending
      if (!paper.citationCount || paper.citationCount < 50) return false;
      // Should match at least one topic
      const paperTopics = [
        ...(paper.fieldsOfStudy || []),
        ...(paper.keywords || []),
      ].map(t => t.toLowerCase().trim());
      return paperTopics.some(t => topTopics.has(t));
    })
    .map(paper => {
      const citationsPerYear = paper.citationCount! / Math.max(1, currentYear - (paper.year || currentYear));
      return {
        ...paper,
        relevanceScore: citationsPerYear,
        reasons: [{
          type: 'trending' as const,
          description: `Trending in ${paper.year} (${Math.round(citationsPerYear)} citations/year)`,
          weight: citationsPerYear,
        }],
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxResults);
}

/**
 * Get papers by favorite authors not yet in library
 */
export function getPapersByFavoriteAuthors(
  candidates: Paper[],
  libraryPapers: LibraryPaper[],
  maxResults: number = 10
): RecommendedPaper[] {
  const libraryIds = new Set(libraryPapers.map(p => p.id));
  const favoriteAuthors = getFavoriteAuthors(libraryPapers, 10);
  const favoriteAuthorNames = new Set(favoriteAuthors.map(a => a.name));
  
  return candidates
    .filter(paper => !libraryIds.has(paper.id))
    .filter(paper => paper.authors.some(a => favoriteAuthorNames.has(a.name)))
    .map(paper => {
      const matchingAuthors = paper.authors.filter(a => favoriteAuthorNames.has(a.name));
      const author = matchingAuthors[0];
      const authorData = favoriteAuthors.find(a => a.name === author?.name);
      
      return {
        ...paper,
        relevanceScore: (authorData?.count || 1) * 10,
        reasons: [{
          type: 'author' as const,
          description: `More from ${author?.name} (${authorData?.count || 1} papers in your library)`,
          weight: (authorData?.count || 1) * 10,
        }],
        matchedPapers: authorData?.papers,
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxResults);
}

/**
 * Generate search queries based on library interests
 */
export function generateSearchQueries(libraryPapers: LibraryPaper[]): string[] {
  const queries: string[] = [];
  
  // Top topics
  const topTopics = getTopTopics(libraryPapers, 5);
  for (const { topic } of topTopics) {
    queries.push(topic);
  }
  
  // Favorite authors
  const favoriteAuthors = getFavoriteAuthors(libraryPapers, 3);
  for (const { name } of favoriteAuthors) {
    queries.push(`author:${name}`);
  }
  
  return queries;
}

/**
 * Main recommendation function - combines all strategies
 */
export async function getRecommendations(
  libraryPapers: LibraryPaper[],
  searchFunction: (query: string, providers?: AcademicProviderType[]) => Promise<Paper[]>,
  config: RecommendationConfig = {}
): Promise<{
  related: RecommendedPaper[];
  trending: RecommendedPaper[];
  byAuthors: RecommendedPaper[];
}> {
  if (libraryPapers.length === 0) {
    return { related: [], trending: [], byAuthors: [] };
  }
  
  // Generate search queries based on library
  const queries = generateSearchQueries(libraryPapers);
  
  // Fetch candidate papers
  const allCandidates: Paper[] = [];
  for (const query of queries.slice(0, 3)) { // Limit API calls
    try {
      const results = await searchFunction(query);
      allCandidates.push(...results);
    } catch (error) {
      log.error(`Failed to search for "${query}"`, error as Error);
    }
  }
  
  // Deduplicate candidates
  const uniqueCandidates = Array.from(
    new Map(allCandidates.map(p => [p.id, p])).values()
  );
  
  // Generate recommendations using different strategies
  const related = scoreRecommendations(uniqueCandidates, libraryPapers, config);
  const trending = getTrendingInFields(uniqueCandidates, libraryPapers);
  const byAuthors = getPapersByFavoriteAuthors(uniqueCandidates, libraryPapers);
  
  return { related, trending, byAuthors };
}

const recommendationEngine = {
  extractAuthorStats,
  extractTopicStats,
  getFavoriteAuthors,
  getTopTopics,
  calculateRelevanceScore,
  scoreRecommendations,
  getTrendingInFields,
  getPapersByFavoriteAuthors,
  generateSearchQueries,
  getRecommendations,
};

export default recommendationEngine;
