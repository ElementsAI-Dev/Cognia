/**
 * Academic Mode Type Definitions
 * Types for paper search, management, and AI analysis
 */

// ============================================================================
// Paper Provider Types
// ============================================================================

export type AcademicProviderType =
  | 'arxiv'
  | 'semantic-scholar'
  | 'core'
  | 'openalex'
  | 'dblp'
  | 'unpaywall'
  | 'openreview'
  | 'huggingface-papers';

export interface AcademicProviderConfig {
  providerId: AcademicProviderType;
  name: string;
  description: string;
  baseUrl: string;
  apiKey?: string;
  enabled: boolean;
  rateLimit?: {
    requestsPerSecond: number;
    requestsPerDay?: number;
  };
  features: {
    search: boolean;
    fullText: boolean;
    citations: boolean;
    references: boolean;
    pdfDownload: boolean;
    openAccess: boolean;
  };
}

export const DEFAULT_ACADEMIC_PROVIDERS: Record<AcademicProviderType, AcademicProviderConfig> = {
  'arxiv': {
    providerId: 'arxiv',
    name: 'arXiv',
    description: 'Open-access archive for scholarly articles in physics, mathematics, CS, and more',
    baseUrl: 'http://export.arxiv.org/api',
    enabled: true,
    rateLimit: { requestsPerSecond: 0.33 }, // 3 second delay recommended
    features: {
      search: true,
      fullText: true,
      citations: false,
      references: false,
      pdfDownload: true,
      openAccess: true,
    },
  },
  'semantic-scholar': {
    providerId: 'semantic-scholar',
    name: 'Semantic Scholar',
    description: 'AI-powered research tool with citation analysis',
    baseUrl: 'https://api.semanticscholar.org/graph/v1',
    enabled: true,
    rateLimit: { requestsPerSecond: 10 },
    features: {
      search: true,
      fullText: false,
      citations: true,
      references: true,
      pdfDownload: true,
      openAccess: true,
    },
  },
  'core': {
    providerId: 'core',
    name: 'CORE',
    description: 'World\'s largest collection of open access research papers',
    baseUrl: 'https://api.core.ac.uk/v3',
    enabled: true,
    rateLimit: { requestsPerSecond: 10 },
    features: {
      search: true,
      fullText: true,
      citations: false,
      references: false,
      pdfDownload: true,
      openAccess: true,
    },
  },
  'openalex': {
    providerId: 'openalex',
    name: 'OpenAlex',
    description: 'Open catalog of scholarly papers, authors, and institutions',
    baseUrl: 'https://api.openalex.org',
    enabled: true,
    rateLimit: { requestsPerSecond: 10 },
    features: {
      search: true,
      fullText: false,
      citations: true,
      references: true,
      pdfDownload: true,
      openAccess: true,
    },
  },
  'dblp': {
    providerId: 'dblp',
    name: 'DBLP',
    description: 'Computer science bibliography database',
    baseUrl: 'https://dblp.org/search',
    enabled: true,
    rateLimit: { requestsPerSecond: 1 },
    features: {
      search: true,
      fullText: false,
      citations: false,
      references: false,
      pdfDownload: false,
      openAccess: false,
    },
  },
  'unpaywall': {
    providerId: 'unpaywall',
    name: 'Unpaywall',
    description: 'Find free versions of research papers',
    baseUrl: 'https://api.unpaywall.org/v2',
    enabled: true,
    rateLimit: { requestsPerSecond: 10 },
    features: {
      search: false,
      fullText: false,
      citations: false,
      references: false,
      pdfDownload: true,
      openAccess: true,
    },
  },
  'openreview': {
    providerId: 'openreview',
    name: 'OpenReview',
    description: 'Open peer review platform for scientific papers',
    baseUrl: 'https://api.openreview.net',
    enabled: true,
    rateLimit: { requestsPerSecond: 5 },
    features: {
      search: true,
      fullText: true,
      citations: false,
      references: false,
      pdfDownload: true,
      openAccess: true,
    },
  },
  'huggingface-papers': {
    providerId: 'huggingface-papers',
    name: 'HuggingFace Papers',
    description: 'AI/ML papers curated by HuggingFace community',
    baseUrl: 'https://huggingface.co/api/papers',
    enabled: true,
    rateLimit: { requestsPerSecond: 5 },
    features: {
      search: true,
      fullText: false,
      citations: false,
      references: false,
      pdfDownload: true,
      openAccess: true,
    },
  },
};

// ============================================================================
// Paper Types
// ============================================================================

export interface PaperAuthor {
  name: string;
  authorId?: string;
  affiliation?: string;
  email?: string;
  orcid?: string;
}

export interface PaperCitation {
  paperId: string;
  title: string;
  authors?: PaperAuthor[];
  year?: number;
  venue?: string;
  citationCount?: number;
  isInfluential?: boolean;
}

export interface PaperReference extends PaperCitation {
  contexts?: string[]; // Citation contexts in the paper
}

export interface PaperMetadata {
  doi?: string;
  arxivId?: string;
  pmid?: string;
  pmcid?: string;
  corpusId?: string;
  magId?: string;
  openAlexId?: string;
  coreId?: string;
  dblpKey?: string;
}

export interface PaperUrl {
  url: string;
  type: 'pdf' | 'html' | 'abstract' | 'repository' | 'other';
  source: string;
  isOpenAccess?: boolean;
}

export interface Paper {
  id: string;
  providerId: AcademicProviderType;
  externalId: string; // Provider-specific ID
  
  // Basic metadata
  title: string;
  abstract?: string;
  authors: PaperAuthor[];
  year?: number;
  publicationDate?: string;
  venue?: string;
  journal?: string;
  conference?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  
  // Classification
  categories?: string[];
  keywords?: string[];
  fieldsOfStudy?: string[];
  
  // Metrics
  citationCount?: number;
  referenceCount?: number;
  influentialCitationCount?: number;
  
  // URLs and access
  urls: PaperUrl[];
  pdfUrl?: string;
  openAccessUrl?: string;
  isOpenAccess?: boolean;
  
  // External IDs
  metadata: PaperMetadata;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  fetchedAt: Date;
}

// ============================================================================
// Library Paper (Local Storage)
// ============================================================================

export type PaperReadingStatus = 'unread' | 'reading' | 'completed' | 'archived';
export type PaperPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface PaperAnnotation {
  id: string;
  paperId: string;
  type: 'highlight' | 'note' | 'bookmark' | 'question';
  content: string;
  pageNumber?: number;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaperNote {
  id: string;
  paperId: string;
  title?: string;
  content: string;
  tags?: string[];
  linkedAnnotations?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LibraryPaper extends Paper {
  // Library-specific fields
  libraryId: string;
  addedAt: Date;
  lastAccessedAt?: Date;
  
  // Organization
  collections?: string[];
  tags?: string[];
  
  // Reading progress
  readingStatus: PaperReadingStatus;
  priority: PaperPriority;
  readingProgress?: number; // 0-100
  
  // User data
  userRating?: number; // 1-5
  userNotes?: string;
  annotations?: PaperAnnotation[];
  notes?: PaperNote[];
  
  // Local storage
  localPdfPath?: string;
  localFullTextPath?: string;
  hasCachedPdf?: boolean;
  hasCachedFullText?: boolean;
  
  // AI analysis
  aiSummary?: string;
  aiKeyInsights?: string[];
  aiRelatedTopics?: string[];
  lastAnalyzedAt?: Date;
}

// ============================================================================
// Collection Types
// ============================================================================

export interface PaperCollection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string; // For nested collections
  paperIds: string[];
  isSmartCollection?: boolean;
  smartFilter?: PaperSearchFilter;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Search Types
// ============================================================================

export interface PaperSearchFilter {
  query?: string;
  authors?: string[];
  yearFrom?: number;
  yearTo?: number;
  venues?: string[];
  categories?: string[];
  fieldsOfStudy?: string[];
  openAccessOnly?: boolean;
  hasFullText?: boolean;
  hasPdf?: boolean;
  minCitations?: number;
  maxCitations?: number;
  providers?: AcademicProviderType[];
  sortBy?: 'relevance' | 'date' | 'citations' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface PaperSearchOptions {
  filter: PaperSearchFilter;
  limit?: number;
  offset?: number;
  includeAbstract?: boolean;
  includeAuthors?: boolean;
  includeCitations?: boolean;
  includeReferences?: boolean;
}

export interface PaperSearchResult {
  papers: Paper[];
  totalResults: number;
  hasMore: boolean;
  offset: number;
  provider: AcademicProviderType;
  searchTime: number;
}

export interface AggregatedSearchResult {
  papers: Paper[];
  totalResults: number;
  providerResults: Record<AcademicProviderType, {
    count: number;
    success: boolean;
    error?: string;
  }>;
  searchTime: number;
}

// ============================================================================
// Analysis Types
// ============================================================================

export interface PaperAnalysisRequest {
  paperId: string;
  analysisType: PaperAnalysisType;
  options?: PaperAnalysisOptions;
}

export type PaperAnalysisType =
  | 'summary'
  | 'key-insights'
  | 'methodology'
  | 'findings'
  | 'limitations'
  | 'future-work'
  | 'related-work'
  | 'technical-details'
  | 'comparison'
  | 'critique'
  | 'eli5' // Explain Like I'm 5
  | 'custom';

export interface PaperAnalysisOptions {
  depth?: 'brief' | 'standard' | 'detailed';
  language?: string;
  customPrompt?: string;
  includeCitations?: boolean;
  compareWith?: string[]; // Other paper IDs for comparison
}

export interface PaperAnalysisResult {
  paperId: string;
  analysisType: PaperAnalysisType;
  content: string;
  structuredContent?: Record<string, unknown>;
  relatedPapers?: string[];
  suggestedQuestions?: string[];
  createdAt: Date;
  modelUsed?: string;
}

// ============================================================================
// Guided Learning Types
// ============================================================================

export interface AcademicLearningSession {
  id: string;
  chatSessionId: string;
  topic: string;
  papers: string[]; // Paper IDs
  currentPaperId?: string;
  
  // Learning state
  phase: AcademicLearningPhase;
  progress: number;
  
  // Learning path
  learningObjectives?: string[];
  conceptsToLearn?: AcademicConcept[];
  questionsAnswered?: AcademicQuestion[];
  
  // Session data
  notes?: string;
  insights?: string[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export type AcademicLearningPhase =
  | 'overview'        // Getting paper overview
  | 'background'      // Understanding prerequisites
  | 'deep-dive'       // Detailed study
  | 'methodology'     // Understanding methods
  | 'analysis'        // Analyzing findings
  | 'synthesis'       // Connecting ideas
  | 'application'     // Practical applications
  | 'review'          // Review and consolidation
  | 'completed';

export interface AcademicConcept {
  id: string;
  name: string;
  description?: string;
  paperId?: string;
  mastery: number; // 0-100
  relatedConcepts?: string[];
  createdAt: Date;
  lastReviewedAt?: Date;
}

export interface AcademicQuestion {
  id: string;
  sessionId: string;
  paperId?: string;
  question: string;
  answer?: string;
  isCorrect?: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  conceptIds?: string[];
  createdAt: Date;
  answeredAt?: Date;
}

// ============================================================================
// Import/Export Types
// ============================================================================

export type ImportFormat = 'bibtex' | 'ris' | 'endnote' | 'zotero' | 'mendeley' | 'json';
export type AcademicExportFormat = 'bibtex' | 'ris' | 'json' | 'csv' | 'markdown';

export interface ImportOptions {
  format: ImportFormat;
  mergeStrategy: 'skip' | 'replace' | 'merge';
  importAnnotations?: boolean;
  importNotes?: boolean;
  targetCollection?: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors?: string[];
  papers: LibraryPaper[];
}

export interface AcademicExportOptions {
  format: AcademicExportFormat;
  paperIds?: string[];
  collectionId?: string;
  includeAnnotations?: boolean;
  includeNotes?: boolean;
  includeAiAnalysis?: boolean;
}

export interface AcademicExportResult {
  success: boolean;
  data: string;
  filename: string;
  paperCount: number;
}

// ============================================================================
// Settings Types
// ============================================================================

export interface AcademicModeSettings {
  // Provider settings
  providers: Record<AcademicProviderType, {
    enabled: boolean;
    apiKey?: string;
    priority: number;
  }>;
  defaultProviders: AcademicProviderType[];
  
  // Search settings
  defaultSearchLimit: number;
  aggregateSearch: boolean;
  preferOpenAccess: boolean;
  
  // Download settings
  autoDownloadPdf: boolean;
  pdfStoragePath?: string;
  maxStorageSize?: number; // MB
  
  // Analysis settings
  defaultAnalysisDepth: 'brief' | 'standard' | 'detailed';
  autoAnalyzeOnAdd: boolean;
  preferredLanguage: string;
  
  // Learning settings
  enableGuidedLearning: boolean;
  learningDifficulty: 'beginner' | 'intermediate' | 'advanced';
  enableSpacedRepetition: boolean;
  
  // UI settings
  defaultView: 'grid' | 'list' | 'table';
  showCitationCounts: boolean;
  showAbstractPreview: boolean;
}

export const DEFAULT_ACADEMIC_SETTINGS: AcademicModeSettings = {
  providers: {
    'arxiv': { enabled: true, priority: 1 },
    'semantic-scholar': { enabled: true, priority: 2 },
    'core': { enabled: true, priority: 3 },
    'openalex': { enabled: true, priority: 4 },
    'dblp': { enabled: true, priority: 5 },
    'unpaywall': { enabled: true, priority: 6 },
    'openreview': { enabled: true, priority: 7 },
    'huggingface-papers': { enabled: true, priority: 8 },
  },
  defaultProviders: ['arxiv', 'semantic-scholar', 'core'],
  defaultSearchLimit: 20,
  aggregateSearch: true,
  preferOpenAccess: true,
  autoDownloadPdf: false,
  defaultAnalysisDepth: 'standard',
  autoAnalyzeOnAdd: false,
  preferredLanguage: 'en',
  enableGuidedLearning: true,
  learningDifficulty: 'intermediate',
  enableSpacedRepetition: true,
  defaultView: 'list',
  showCitationCounts: true,
  showAbstractPreview: true,
};

// ============================================================================
// Statistics Types
// ============================================================================

export interface AcademicStatistics {
  totalPapers: number;
  totalCollections: number;
  totalAnnotations: number;
  totalNotes: number;
  
  papersByStatus: Record<PaperReadingStatus, number>;
  papersByProvider: Record<AcademicProviderType, number>;
  papersByYear: Record<number, number>;
  papersByCategory: Record<string, number>;
  
  readingStreak: number;
  papersReadThisWeek: number;
  papersReadThisMonth: number;
  averageReadingTime?: number;
  
  topAuthors: { name: string; count: number }[];
  topVenues: { name: string; count: number }[];
  topKeywords: { keyword: string; count: number }[];
  
  lastUpdated: Date;
}
