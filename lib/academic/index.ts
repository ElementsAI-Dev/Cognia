/**
 * Academic Library exports
 * PDF conversion, knowledge map generation, and utilities
 */

export {
  extractPDFContent,
  convertPDFToMarkdown,
  generateKnowledgeMapFromPDF,
  generateMindMapFromPDF,
  parseMarkdownToElements,
} from './pdf-to-markdown';

// Integration utilities
export {
  generateKnowledgeMapFromSelection,
  generateKnowledgeMapFromPDFFile,
  generateKnowledgeMapWithAI,
  generateMindMapFromKnowledgeMap,
  generateMindMapFromContent,
  hasKnowledgeMapForSource,
  getKnowledgeMapForSource,
  createKnowledgeMapHandler,
  exportKnowledgeMapToJSON,
  importKnowledgeMapFromJSON,
} from './knowledge-map-integration';

// Citation network utilities
export {
  fetchCitationsFromSemanticScholar,
  fetchReferencesFromSemanticScholar,
  buildCitationNetwork,
  buildCitationGraph,
  findCommonCitations,
  findCommonReferences,
} from './citation-network';

export type {
  CitationNode,
  CitationNetwork,
  CitationGraphNode,
  CitationGraphEdge,
  CitationGraph,
} from './citation-network';

// Recommendation engine
export {
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
} from './recommendation-engine';

export type {
  RecommendationReason,
  RecommendedPaper,
  RecommendationConfig,
} from './recommendation-engine';

// Re-export types for convenience
export type {
  PDFConversionOptions,
  PDFConversionResult,
  PDFExtractedElement,
  KnowledgeMap,
  KnowledgeMapTrace,
  KnowledgeMapLocation,
  MindMapData,
  MindMapNode,
  KnowledgeAnnotation,
} from '@/types/learning/knowledge-map';
