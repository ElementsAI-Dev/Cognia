/**
 * Unit tests for Recommendation Engine
 */

import {
  extractAuthorStats,
  extractTopicStats,
  getFavoriteAuthors,
  getTopTopics,
  calculateRelevanceScore,
  scoreRecommendations,
  getTrendingInFields,
  getPapersByFavoriteAuthors,
  generateSearchQueries,
} from './recommendation-engine';
import type { Paper, LibraryPaper } from '@/types/academic';

// Mock data helpers
const createMockPaper = (id: string, overrides: Partial<Paper> = {}): Paper => ({
  id,
  providerId: 'arxiv',
  externalId: `arxiv-${id}`,
  title: `Test Paper ${id}`,
  abstract: 'Test abstract',
  authors: [{ name: 'Author A' }, { name: 'Author B' }],
  year: 2023,
  urls: [],
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  fetchedAt: new Date(),
  ...overrides,
});

const createMockLibraryPaper = (id: string, overrides: Partial<LibraryPaper> = {}): LibraryPaper => ({
  ...createMockPaper(id),
  libraryId: `lib-${id}`,
  addedAt: new Date(),
  readingStatus: 'unread',
  priority: 'medium',
  fieldsOfStudy: ['Machine Learning'],
  keywords: ['AI', 'Deep Learning'],
  ...overrides,
});

describe('Recommendation Engine', () => {
  describe('extractAuthorStats', () => {
    it('should extract author statistics from library papers', () => {
      const papers = [
        createMockLibraryPaper('1', { authors: [{ name: 'Alice' }, { name: 'Bob' }] }),
        createMockLibraryPaper('2', { authors: [{ name: 'Alice' }, { name: 'Charlie' }] }),
        createMockLibraryPaper('3', { authors: [{ name: 'Alice' }] }),
      ];

      const stats = extractAuthorStats(papers);

      expect(stats.get('Alice')?.count).toBe(3);
      expect(stats.get('Bob')?.count).toBe(1);
      expect(stats.get('Charlie')?.count).toBe(1);
      expect(stats.get('Alice')?.papers).toContain('1');
      expect(stats.get('Alice')?.papers).toContain('2');
      expect(stats.get('Alice')?.papers).toContain('3');
    });

    it('should handle empty library', () => {
      const stats = extractAuthorStats([]);

      expect(stats.size).toBe(0);
    });
  });

  describe('extractTopicStats', () => {
    it('should extract topic statistics from library papers', () => {
      const papers = [
        createMockLibraryPaper('1', {
          fieldsOfStudy: ['AI', 'ML'],
          keywords: ['deep learning'],
        }),
        createMockLibraryPaper('2', {
          fieldsOfStudy: ['AI'],
          keywords: ['neural networks'],
        }),
      ];

      const stats = extractTopicStats(papers);

      expect(stats.get('ai')?.count).toBe(2);
      expect(stats.get('ml')?.count).toBe(1);
      expect(stats.get('deep learning')?.count).toBe(1);
    });

    it('should normalize topics to lowercase', () => {
      const papers = [
        createMockLibraryPaper('1', { fieldsOfStudy: ['Machine Learning'] }),
        createMockLibraryPaper('2', { fieldsOfStudy: ['MACHINE LEARNING'] }),
      ];

      const stats = extractTopicStats(papers);

      expect(stats.get('machine learning')?.count).toBe(2);
    });
  });

  describe('getFavoriteAuthors', () => {
    it('should return authors sorted by paper count', () => {
      const papers = [
        createMockLibraryPaper('1', { authors: [{ name: 'Alice' }] }),
        createMockLibraryPaper('2', { authors: [{ name: 'Alice' }, { name: 'Bob' }] }),
        createMockLibraryPaper('3', { authors: [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }] }),
      ];

      const favorites = getFavoriteAuthors(papers, 2);

      expect(favorites.length).toBe(2);
      expect(favorites[0].name).toBe('Alice');
      expect(favorites[0].count).toBe(3);
      expect(favorites[1].name).toBe('Bob');
      expect(favorites[1].count).toBe(2);
    });

    it('should respect limit parameter', () => {
      const papers = [
        createMockLibraryPaper('1', { authors: [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }] }),
      ];

      const favorites = getFavoriteAuthors(papers, 2);

      expect(favorites.length).toBe(2);
    });
  });

  describe('getTopTopics', () => {
    it('should return topics sorted by paper count', () => {
      // Create papers with only fieldsOfStudy, no keywords to avoid extra counts
      const papers = [
        createMockLibraryPaper('1', { fieldsOfStudy: ['AI', 'ML'], keywords: [] }),
        createMockLibraryPaper('2', { fieldsOfStudy: ['AI', 'NLP'], keywords: [] }),
        createMockLibraryPaper('3', { fieldsOfStudy: ['AI'], keywords: [] }),
      ];

      const topics = getTopTopics(papers, 2);

      expect(topics.length).toBe(2);
      expect(topics[0].topic).toBe('ai');
      expect(topics[0].count).toBe(3);
    });
  });

  describe('calculateRelevanceScore', () => {
    it('should score paper based on author match', () => {
      const libraryPapers = [
        createMockLibraryPaper('1', { authors: [{ name: 'Alice' }] }),
        createMockLibraryPaper('2', { authors: [{ name: 'Alice' }] }),
      ];

      const candidatePaper = createMockPaper('candidate', {
        authors: [{ name: 'Alice' }],
      });

      const authorStats = extractAuthorStats(libraryPapers);
      const topicStats = extractTopicStats(libraryPapers);

      const { score, reasons } = calculateRelevanceScore(
        candidatePaper,
        libraryPapers,
        authorStats,
        topicStats
      );

      expect(score).toBeGreaterThan(0);
      expect(reasons.some(r => r.type === 'author')).toBe(true);
    });

    it('should score paper based on topic match', () => {
      const libraryPapers = [
        createMockLibraryPaper('1', { fieldsOfStudy: ['Machine Learning'] }),
      ];

      const candidatePaper = createMockPaper('candidate', {
        fieldsOfStudy: ['Machine Learning'],
      });

      const authorStats = extractAuthorStats(libraryPapers);
      const topicStats = extractTopicStats(libraryPapers);

      const { score, reasons } = calculateRelevanceScore(
        candidatePaper,
        libraryPapers,
        authorStats,
        topicStats
      );

      expect(score).toBeGreaterThan(0);
      expect(reasons.some(r => r.type === 'topic')).toBe(true);
    });

    it('should give bonus for high citation count', () => {
      const libraryPapers = [createMockLibraryPaper('1')];
      const authorStats = extractAuthorStats(libraryPapers);
      const topicStats = extractTopicStats(libraryPapers);

      const highCitePaper = createMockPaper('high', { citationCount: 1000 });
      const lowCitePaper = createMockPaper('low', { citationCount: 10 });

      const highScore = calculateRelevanceScore(highCitePaper, libraryPapers, authorStats, topicStats);
      const lowScore = calculateRelevanceScore(lowCitePaper, libraryPapers, authorStats, topicStats);

      expect(highScore.score).toBeGreaterThan(lowScore.score);
    });

    it('should give bonus for recent papers', () => {
      const libraryPapers = [createMockLibraryPaper('1')];
      const authorStats = extractAuthorStats(libraryPapers);
      const topicStats = extractTopicStats(libraryPapers);
      const currentYear = new Date().getFullYear();

      const recentPaper = createMockPaper('recent', { year: currentYear });
      const oldPaper = createMockPaper('old', { year: 2010 });

      const recentScore = calculateRelevanceScore(recentPaper, libraryPapers, authorStats, topicStats);
      const oldScore = calculateRelevanceScore(oldPaper, libraryPapers, authorStats, topicStats);

      expect(recentScore.reasons.some(r => r.type === 'trending')).toBe(true);
      expect(oldScore.reasons.some(r => r.type === 'trending')).toBe(false);
    });
  });

  describe('scoreRecommendations', () => {
    it('should filter and score candidate papers', () => {
      const libraryPapers = [
        createMockLibraryPaper('lib-1', {
          authors: [{ name: 'Alice' }],
          fieldsOfStudy: ['AI'],
        }),
      ];

      const candidates = [
        createMockPaper('candidate-1', {
          authors: [{ name: 'Alice' }],
          fieldsOfStudy: ['AI'],
        }),
        createMockPaper('candidate-2', {
          authors: [{ name: 'Unknown' }],
        }),
      ];

      const recommendations = scoreRecommendations(candidates, libraryPapers, {
        minRelevanceScore: 5,
      });

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].relevanceScore).toBeGreaterThan(0);
      expect(recommendations[0].reasons.length).toBeGreaterThan(0);
    });

    it('should exclude papers already in library', () => {
      const libraryPapers = [createMockLibraryPaper('paper-1')];
      const candidates = [createMockPaper('paper-1')]; // Same ID

      const recommendations = scoreRecommendations(candidates, libraryPapers);

      expect(recommendations.length).toBe(0);
    });

    it('should sort by relevance score descending', () => {
      const libraryPapers = [
        createMockLibraryPaper('lib-1', {
          authors: [{ name: 'Alice' }, { name: 'Alice' }], // Double author presence
          fieldsOfStudy: ['AI', 'ML'],
        }),
      ];

      const candidates = [
        createMockPaper('low', { authors: [{ name: 'Bob' }], citationCount: 10 }),
        createMockPaper('high', { authors: [{ name: 'Alice' }], citationCount: 1000, fieldsOfStudy: ['AI'] }),
      ];

      const recommendations = scoreRecommendations(candidates, libraryPapers, { minRelevanceScore: 0 });

      if (recommendations.length >= 2) {
        expect(recommendations[0].relevanceScore).toBeGreaterThanOrEqual(recommendations[1].relevanceScore);
      }
    });

    it('should respect maxResults option', () => {
      const libraryPapers = [createMockLibraryPaper('lib-1', { fieldsOfStudy: ['AI'] })];
      const candidates = Array.from({ length: 20 }, (_, i) =>
        createMockPaper(`paper-${i}`, { fieldsOfStudy: ['AI'], citationCount: 100 })
      );

      const recommendations = scoreRecommendations(candidates, libraryPapers, {
        maxResults: 5,
        minRelevanceScore: 0,
      });

      expect(recommendations.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getTrendingInFields', () => {
    it('should return recent highly-cited papers in library fields', () => {
      const currentYear = new Date().getFullYear();
      const libraryPapers = [
        createMockLibraryPaper('lib-1', { fieldsOfStudy: ['Machine Learning'] }),
      ];

      const candidates = [
        createMockPaper('trending', {
          year: currentYear,
          citationCount: 200,
          fieldsOfStudy: ['Machine Learning'],
        }),
        createMockPaper('old', {
          year: 2010,
          citationCount: 500,
          fieldsOfStudy: ['Machine Learning'],
        }),
        createMockPaper('unrelated', {
          year: currentYear,
          citationCount: 200,
          fieldsOfStudy: ['Biology'],
        }),
      ];

      const trending = getTrendingInFields(candidates, libraryPapers);

      expect(trending.some(p => p.id === 'trending')).toBe(true);
      expect(trending.some(p => p.id === 'old')).toBe(false);
    });

    it('should exclude papers already in library', () => {
      const currentYear = new Date().getFullYear();
      const libraryPapers = [
        createMockLibraryPaper('paper-1', {
          year: currentYear,
          citationCount: 200,
          fieldsOfStudy: ['AI'],
        }),
      ];

      const candidates = [createMockPaper('paper-1', {
        year: currentYear,
        citationCount: 200,
        fieldsOfStudy: ['AI'],
      })];

      const trending = getTrendingInFields(candidates, libraryPapers);

      expect(trending.length).toBe(0);
    });
  });

  describe('getPapersByFavoriteAuthors', () => {
    it('should return papers by authors in library', () => {
      const libraryPapers = [
        createMockLibraryPaper('lib-1', { authors: [{ name: 'Favorite Author' }] }),
        createMockLibraryPaper('lib-2', { authors: [{ name: 'Favorite Author' }] }),
      ];

      const candidates = [
        createMockPaper('by-favorite', { authors: [{ name: 'Favorite Author' }] }),
        createMockPaper('by-unknown', { authors: [{ name: 'Unknown Author' }] }),
      ];

      const byAuthors = getPapersByFavoriteAuthors(candidates, libraryPapers);

      expect(byAuthors.length).toBe(1);
      expect(byAuthors[0].id).toBe('by-favorite');
      expect(byAuthors[0].reasons[0].type).toBe('author');
    });
  });

  describe('generateSearchQueries', () => {
    it('should generate queries from library topics and authors', () => {
      const libraryPapers = [
        createMockLibraryPaper('1', {
          authors: [{ name: 'Famous Researcher' }],
          fieldsOfStudy: ['Deep Learning', 'NLP'],
          keywords: ['transformers'],
        }),
      ];

      const queries = generateSearchQueries(libraryPapers);

      expect(queries.length).toBeGreaterThan(0);
      expect(queries.some(q => q.includes('author:'))).toBe(true);
    });

    it('should handle empty library', () => {
      const queries = generateSearchQueries([]);

      expect(queries.length).toBe(0);
    });
  });
});
