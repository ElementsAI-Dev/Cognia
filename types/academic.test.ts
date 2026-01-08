/**
 * Unit tests for Academic Mode types
 */

import {
  DEFAULT_ACADEMIC_PROVIDERS,
  DEFAULT_ACADEMIC_SETTINGS,
  type AcademicProviderType,
  type Paper,
  type LibraryPaper,
  type PaperCollection,
  type PaperAnnotation,
  type PaperSearchFilter,
  type AcademicModeSettings,
  type PaperReadingStatus,
  type PaperPriority,
  type PaperAnalysisType,
} from './academic';

describe('Academic Types', () => {
  describe('DEFAULT_ACADEMIC_PROVIDERS', () => {
    it('should have all required providers', () => {
      const requiredProviders: AcademicProviderType[] = [
        'arxiv',
        'semantic-scholar',
        'core',
        'openalex',
        'dblp',
        'unpaywall',
        'openreview',
        'huggingface-papers',
      ];

      requiredProviders.forEach((provider) => {
        expect(DEFAULT_ACADEMIC_PROVIDERS[provider]).toBeDefined();
      });
    });

    it('should have valid provider configurations', () => {
      Object.entries(DEFAULT_ACADEMIC_PROVIDERS).forEach(([key, config]) => {
        expect(config.providerId).toBe(key);
        expect(config.name).toBeTruthy();
        expect(config.description).toBeTruthy();
        expect(config.baseUrl).toBeTruthy();
        expect(typeof config.enabled).toBe('boolean');
        expect(config.features).toBeDefined();
      });
    });

    it('should have valid feature flags for each provider', () => {
      Object.values(DEFAULT_ACADEMIC_PROVIDERS).forEach((config) => {
        expect(typeof config.features.search).toBe('boolean');
        expect(typeof config.features.fullText).toBe('boolean');
        expect(typeof config.features.citations).toBe('boolean');
        expect(typeof config.features.references).toBe('boolean');
        expect(typeof config.features.pdfDownload).toBe('boolean');
        expect(typeof config.features.openAccess).toBe('boolean');
      });
    });

    it('arxiv should have correct configuration', () => {
      const arxiv = DEFAULT_ACADEMIC_PROVIDERS['arxiv'];
      expect(arxiv.name).toBe('arXiv');
      expect(arxiv.baseUrl).toContain('arxiv.org');
      expect(arxiv.features.search).toBe(true);
      expect(arxiv.features.pdfDownload).toBe(true);
      expect(arxiv.features.openAccess).toBe(true);
    });

    it('semantic-scholar should have citation support', () => {
      const ss = DEFAULT_ACADEMIC_PROVIDERS['semantic-scholar'];
      expect(ss.features.citations).toBe(true);
      expect(ss.features.references).toBe(true);
    });
  });

  describe('DEFAULT_ACADEMIC_SETTINGS', () => {
    it('should have valid default settings', () => {
      expect(DEFAULT_ACADEMIC_SETTINGS).toBeDefined();
      expect(DEFAULT_ACADEMIC_SETTINGS.defaultSearchLimit).toBeGreaterThan(0);
      expect(DEFAULT_ACADEMIC_SETTINGS.defaultProviders).toBeInstanceOf(Array);
      expect(DEFAULT_ACADEMIC_SETTINGS.defaultProviders.length).toBeGreaterThan(0);
    });

    it('should have auto-download PDF setting', () => {
      expect(typeof DEFAULT_ACADEMIC_SETTINGS.autoDownloadPdf).toBe('boolean');
    });

    it('should have provider settings', () => {
      expect(DEFAULT_ACADEMIC_SETTINGS.providers).toBeDefined();
      expect(DEFAULT_ACADEMIC_SETTINGS.providers['arxiv']).toBeDefined();
      expect(DEFAULT_ACADEMIC_SETTINGS.providers['arxiv'].enabled).toBe(true);
    });

    it('should have analysis settings', () => {
      expect(DEFAULT_ACADEMIC_SETTINGS.defaultAnalysisDepth).toBeDefined();
      expect(['brief', 'standard', 'detailed']).toContain(DEFAULT_ACADEMIC_SETTINGS.defaultAnalysisDepth);
    });

    it('should have learning settings', () => {
      expect(typeof DEFAULT_ACADEMIC_SETTINGS.enableGuidedLearning).toBe('boolean');
      expect(DEFAULT_ACADEMIC_SETTINGS.learningDifficulty).toBeDefined();
    });

    it('should have UI settings', () => {
      expect(DEFAULT_ACADEMIC_SETTINGS.defaultView).toBeDefined();
      expect(typeof DEFAULT_ACADEMIC_SETTINGS.showCitationCounts).toBe('boolean');
      expect(typeof DEFAULT_ACADEMIC_SETTINGS.showAbstractPreview).toBe('boolean');
    });
  });

  describe('Type Structures', () => {
    it('should create valid Paper object', () => {
      const paper: Paper = {
        id: 'test-paper-1',
        providerId: 'arxiv',
        externalId: '2301.00001',
        title: 'Test Paper Title',
        abstract: 'This is a test abstract',
        authors: [
          { name: 'John Doe', affiliation: 'Test University' },
          { name: 'Jane Smith' },
        ],
        year: 2023,
        venue: 'Test Conference',
        citationCount: 100,
        referenceCount: 50,
        urls: [
          { url: 'https://arxiv.org/abs/2301.00001', type: 'abstract', source: 'arxiv' },
        ],
        pdfUrl: 'https://arxiv.org/pdf/2301.00001.pdf',
        isOpenAccess: true,
        metadata: {
          arxivId: '2301.00001',
          doi: '10.1234/test',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        fetchedAt: new Date(),
      };

      expect(paper.id).toBe('test-paper-1');
      expect(paper.authors.length).toBe(2);
      expect(paper.metadata.arxivId).toBe('2301.00001');
    });

    it('should create valid LibraryPaper object', () => {
      const libraryPaper: LibraryPaper = {
        id: 'test-paper-1',
        libraryId: 'lib-1',
        providerId: 'arxiv',
        externalId: '2301.00001',
        title: 'Test Paper Title',
        authors: [{ name: 'John Doe' }],
        urls: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        fetchedAt: new Date(),
        addedAt: new Date(),
        readingStatus: 'unread',
        priority: 'medium',
        userRating: 4,
        collections: ['collection-1'],
        tags: ['machine-learning', 'nlp'],
      };

      expect(libraryPaper.libraryId).toBe('lib-1');
      expect(libraryPaper.readingStatus).toBe('unread');
      expect(libraryPaper.priority).toBe('medium');
      expect(libraryPaper.userRating).toBe(4);
    });

    it('should create valid PaperCollection object', () => {
      const collection: PaperCollection = {
        id: 'collection-1',
        name: 'My Research',
        description: 'Papers for my research',
        color: '#3b82f6',
        icon: 'folder',
        paperIds: ['paper-1', 'paper-2'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(collection.id).toBe('collection-1');
      expect(collection.paperIds.length).toBe(2);
    });

    it('should create valid PaperAnnotation object', () => {
      const annotation: PaperAnnotation = {
        id: 'annotation-1',
        paperId: 'paper-1',
        type: 'highlight',
        content: 'Important finding',
        pageNumber: 5,
        position: { x: 100, y: 200, width: 300, height: 20 },
        color: '#ffff00',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(annotation.type).toBe('highlight');
      expect(annotation.pageNumber).toBe(5);
    });

    it('should have valid PaperReadingStatus values', () => {
      const statuses: PaperReadingStatus[] = ['unread', 'reading', 'completed', 'archived'];
      statuses.forEach((status) => {
        expect(['unread', 'reading', 'completed', 'archived']).toContain(status);
      });
    });

    it('should have valid PaperPriority values', () => {
      const priorities: PaperPriority[] = ['low', 'medium', 'high', 'urgent'];
      priorities.forEach((priority) => {
        expect(['low', 'medium', 'high', 'urgent']).toContain(priority);
      });
    });

    it('should have valid PaperAnalysisType values', () => {
      const analysisTypes: PaperAnalysisType[] = [
        'summary',
        'key-insights',
        'methodology',
        'findings',
        'limitations',
        'future-work',
        'related-work',
        'technical-details',
        'critique',
        'eli5',
      ];
      expect(analysisTypes.length).toBe(10);
    });
  });

  describe('PaperSearchFilter', () => {
    it('should create valid search filter', () => {
      const filter: PaperSearchFilter = {
        providers: ['arxiv', 'semantic-scholar'],
        yearFrom: 2020,
        yearTo: 2024,
        fieldsOfStudy: ['Computer Science'],
        openAccessOnly: true,
        sortBy: 'relevance',
        sortOrder: 'desc',
      };

      expect(filter.providers?.length).toBe(2);
      expect(filter.yearFrom).toBe(2020);
      expect(filter.openAccessOnly).toBe(true);
    });
  });

  describe('AcademicModeSettings', () => {
    it('should create valid settings object', () => {
      const settings: AcademicModeSettings = {
        providers: {
          'arxiv': { enabled: true, priority: 1 },
          'semantic-scholar': { enabled: true, priority: 2 },
          'core': { enabled: false, priority: 3 },
          'openalex': { enabled: false, priority: 4 },
          'dblp': { enabled: false, priority: 5 },
          'unpaywall': { enabled: false, priority: 6 },
          'openreview': { enabled: false, priority: 7 },
          'huggingface-papers': { enabled: false, priority: 8 },
        },
        defaultProviders: ['arxiv', 'semantic-scholar'],
        defaultSearchLimit: 20,
        aggregateSearch: true,
        preferOpenAccess: true,
        autoDownloadPdf: true,
        pdfStoragePath: '/papers',
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

      expect(settings.defaultSearchLimit).toBe(20);
      expect(settings.defaultAnalysisDepth).toBe('standard');
      expect(settings.providers['arxiv'].enabled).toBe(true);
    });
  });
});
