/**
 * Zotero Integration Tests
 * Comprehensive unit tests for Zotero API client, conversion functions, and sync service
 */

import {
  ZoteroClient,
  ZoteroSyncService,
  zoteroItemToPaper,
  paperToZoteroItem,
  generateCitationKey,
  zoteroItemToBibTeX,
  type ZoteroConfig,
  type ZoteroItem,
  type ZoteroCollection,
} from './zotero-integration';
import type { Paper } from '@/types/learning/academic';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock proxyFetch to delegate to global.fetch
jest.mock('@/lib/network/proxy-fetch', () => ({
  proxyFetch: (...args: unknown[]) => (global.fetch as jest.MockedFunction<typeof fetch>)(...args as Parameters<typeof fetch>),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  loggers: {
    app: {
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    },
  },
}));

// ============================================================================
// Test Fixtures
// ============================================================================

const mockConfig: ZoteroConfig = {
  apiKey: 'test-api-key',
  userId: 'user123',
  libraryType: 'user',
  libraryId: 'lib123',
  syncEnabled: true,
  autoSync: false,
  syncInterval: 5,
};

const mockGroupConfig: ZoteroConfig = {
  ...mockConfig,
  libraryType: 'group',
};

const mockZoteroItem: ZoteroItem = {
  key: 'ABC123',
  version: 1,
  itemType: 'journalArticle',
  title: 'Deep Learning for Natural Language Processing',
  creators: [
    { creatorType: 'author', firstName: 'John', lastName: 'Smith' },
    { creatorType: 'author', firstName: 'Jane', lastName: 'Doe' },
    { creatorType: 'editor', firstName: 'Bob', lastName: 'Editor' },
  ],
  abstractNote: 'This paper presents a comprehensive survey of deep learning methods.',
  date: '2023-05-15',
  DOI: '10.1234/example.doi',
  url: 'https://example.com/paper',
  publicationTitle: 'Journal of AI Research',
  volume: '42',
  issue: '3',
  pages: '100-150',
  publisher: 'AI Press',
  tags: [{ tag: 'deep learning' }, { tag: 'NLP' }],
  collections: ['col1', 'col2'],
  relations: {},
  dateAdded: '2023-01-01T00:00:00Z',
  dateModified: '2023-06-01T00:00:00Z',
};

const mockZoteroItemWithSingleName: ZoteroItem = {
  ...mockZoteroItem,
  key: 'DEF456',
  creators: [{ creatorType: 'author', name: 'Organization Name' }],
};

const mockZoteroItemNoDate: ZoteroItem = {
  ...mockZoteroItem,
  key: 'GHI789',
  date: undefined,
};

const mockZoteroItemNoAuthors: ZoteroItem = {
  ...mockZoteroItem,
  key: 'JKL012',
  creators: [],
};

const mockCollection: ZoteroCollection = {
  key: 'col1',
  version: 1,
  name: 'My Collection',
  parentCollection: false,
};

const mockPaper: Paper = {
  id: 'paper-1',
  providerId: 'arxiv',
  externalId: 'arxiv-123',
  title: 'Machine Learning Advances',
  abstract: 'A paper about ML advances',
  authors: [{ name: 'Alice Johnson' }, { name: 'Bob' }],
  year: 2024,
  venue: 'ICML',
  journal: 'ICML',
  volume: '1',
  issue: '2',
  pages: '1-10',
  categories: ['machine learning', 'AI'],
  urls: [{ url: 'https://arxiv.org/paper', type: 'html', source: 'arxiv' }],
  metadata: { doi: '10.5678/ml.paper' },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-02-01'),
  fetchedAt: new Date(),
};

// ============================================================================
// Helper Functions
// ============================================================================

function createMockResponse(data: unknown, version: number = 1, ok: boolean = true) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 400,
    statusText: ok ? 'OK' : 'Bad Request',
    headers: new Map([['Last-Modified-Version', version.toString()]]),
    json: () => Promise.resolve(data),
  } as unknown as Response);
}

// ============================================================================
// ZoteroClient Tests
// ============================================================================

describe('ZoteroClient', () => {
  let client: ZoteroClient;

  beforeEach(() => {
    mockFetch.mockClear();
    client = new ZoteroClient(mockConfig);
  });

  describe('constructor', () => {
    it('should create client with provided config', () => {
      expect(client).toBeInstanceOf(ZoteroClient);
    });
  });

  describe('getItems', () => {
    it('should fetch items with no options', async () => {
      mockFetch.mockReturnValueOnce(createMockResponse([mockZoteroItem]));

      const items = await client.getItems();

      expect(items).toHaveLength(1);
      expect(items[0].key).toBe('ABC123');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/user123/items?'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Zotero-API-Key': 'test-api-key',
            'Zotero-API-Version': '3',
          }),
        })
      );
    });

    it('should fetch items with search query', async () => {
      mockFetch.mockReturnValueOnce(createMockResponse([mockZoteroItem]));

      await client.getItems({ query: 'deep learning' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q=deep+learning'),
        expect.any(Object)
      );
    });

    it('should fetch items with single itemType filter', async () => {
      mockFetch.mockReturnValueOnce(createMockResponse([]));

      await client.getItems({ itemType: 'journalArticle' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('itemType=journalArticle'),
        expect.any(Object)
      );
    });

    it('should fetch items with multiple itemType filters', async () => {
      mockFetch.mockReturnValueOnce(createMockResponse([]));

      await client.getItems({ itemType: ['journalArticle', 'book'] });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('itemType=journalArticle%2Cbook'),
        expect.any(Object)
      );
    });

    it('should fetch items with single tag filter', async () => {
      mockFetch.mockReturnValueOnce(createMockResponse([]));

      await client.getItems({ tag: 'NLP' });

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('tag=NLP'), expect.any(Object));
    });

    it('should fetch items with multiple tag filters', async () => {
      mockFetch.mockReturnValueOnce(createMockResponse([]));

      await client.getItems({ tag: ['NLP', 'AI'] });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('tag=NLP%2CAI'),
        expect.any(Object)
      );
    });

    it('should fetch items with collection filter', async () => {
      mockFetch.mockReturnValueOnce(createMockResponse([]));

      await client.getItems({ collection: 'col1' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('collection=col1'),
        expect.any(Object)
      );
    });

    it('should fetch items with sort and direction', async () => {
      mockFetch.mockReturnValueOnce(createMockResponse([]));

      await client.getItems({ sort: 'dateAdded', direction: 'desc' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('sort=dateAdded'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('direction=desc'),
        expect.any(Object)
      );
    });

    it('should fetch items with pagination', async () => {
      mockFetch.mockReturnValueOnce(createMockResponse([]));

      await client.getItems({ limit: 50, start: 100 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=50'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('start=100'),
        expect.any(Object)
      );
    });

    it('should use group library prefix when configured', async () => {
      const groupClient = new ZoteroClient(mockGroupConfig);
      mockFetch.mockReturnValueOnce(createMockResponse([]));

      await groupClient.getItems();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/groups/lib123/items'),
        expect.any(Object)
      );
    });
  });

  describe('getItem', () => {
    it('should fetch single item by key', async () => {
      mockFetch.mockReturnValueOnce(createMockResponse(mockZoteroItem));

      const item = await client.getItem('ABC123');

      expect(item.key).toBe('ABC123');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/items/ABC123'),
        expect.any(Object)
      );
    });
  });

  describe('createItems', () => {
    it('should create items and return success/failed keys', async () => {
      mockFetch.mockReturnValueOnce(
        createMockResponse({
          success: { 0: 'NEW123', 1: 'NEW456' },
          failed: { 2: { code: 400, message: 'Invalid data' } },
        })
      );

      const result = await client.createItems([
        { title: 'Paper 1' },
        { title: 'Paper 2' },
        { title: '' }, // Invalid
      ]);

      expect(result.success).toEqual(['NEW123', 'NEW456']);
      expect(result.failed).toEqual(['2']);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/items'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('updateItems', () => {
    it('should update items and return success/failed keys', async () => {
      mockFetch.mockReturnValueOnce(
        createMockResponse({
          success: { 0: 'ABC123' },
          failed: {},
        })
      );

      const result = await client.updateItems([mockZoteroItem]);

      expect(result.success).toEqual(['ABC123']);
      expect(result.failed).toEqual([]);
    });
  });

  describe('deleteItems', () => {
    it('should delete items by keys', async () => {
      mockFetch.mockReturnValueOnce(createMockResponse({}));

      await client.deleteItems(['ABC123', 'DEF456']);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/items?itemKey=ABC123,DEF456'),
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'If-Unmodified-Since-Version': '0',
          }),
        })
      );
    });
  });

  describe('getCollections', () => {
    it('should fetch all collections', async () => {
      mockFetch.mockReturnValueOnce(createMockResponse([mockCollection]));

      const collections = await client.getCollections();

      expect(collections).toHaveLength(1);
      expect(collections[0].name).toBe('My Collection');
    });
  });

  describe('getCollectionItems', () => {
    it('should fetch items in a collection', async () => {
      mockFetch.mockReturnValueOnce(createMockResponse([mockZoteroItem]));

      const items = await client.getCollectionItems('col1');

      expect(items).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/collections/col1/items'),
        expect.any(Object)
      );
    });
  });

  describe('searchItems', () => {
    it('should search items with query and options', async () => {
      mockFetch.mockReturnValueOnce(createMockResponse([mockZoteroItem]));

      const items = await client.searchItems('neural network', { limit: 10 });

      expect(items).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q=neural+network'),
        expect.any(Object)
      );
    });
  });

  describe('getModifiedItems', () => {
    it('should fetch items modified since version', async () => {
      mockFetch.mockReturnValueOnce(createMockResponse([mockZoteroItem]));

      const items = await client.getModifiedItems(5);

      expect(items).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/items?since=5'),
        expect.any(Object)
      );
    });
  });

  describe('getDeletedItems', () => {
    it('should fetch deleted item keys since version', async () => {
      mockFetch.mockReturnValueOnce(createMockResponse({ items: ['DEL1', 'DEL2'] }));

      const keys = await client.getDeletedItems(5);

      expect(keys).toEqual(['DEL1', 'DEL2']);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/deleted?since=5'),
        expect.any(Object)
      );
    });
  });

  describe('getLibraryVersion', () => {
    it('should fetch current library version', async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({
          headers: new Map([['Last-Modified-Version', '42']]),
        } as unknown as Response)
      );

      const version = await client.getLibraryVersion();

      expect(version).toBe(42);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/items?limit=1'),
        expect.objectContaining({
          method: 'HEAD',
        })
      );
    });

    it('should return 0 if version header is missing', async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({
          headers: new Map(),
        } as unknown as Response)
      );

      const version = await client.getLibraryVersion();

      expect(version).toBe(0);
    });
  });

  describe('validateApiKey', () => {
    it('should return true for valid API key', async () => {
      mockFetch.mockReturnValueOnce(createMockResponse([]));

      const isValid = await client.validateApiKey();

      expect(isValid).toBe(true);
    });

    it('should return false for invalid API key', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Unauthorized'));

      const isValid = await client.validateApiKey();

      expect(isValid).toBe(false);
    });
  });

  describe('API error handling', () => {
    it('should throw error on non-OK response', async () => {
      mockFetch.mockReturnValueOnce(createMockResponse({}, 1, false));

      await expect(client.getItems()).rejects.toThrow('Zotero API error');
    });
  });
});

// ============================================================================
// Conversion Functions Tests
// ============================================================================

describe('zoteroItemToPaper', () => {
  it('should convert Zotero item to Paper format', () => {
    const paper = zoteroItemToPaper(mockZoteroItem);

    expect(paper.id).toBe('zotero-ABC123');
    expect(paper.externalId).toBe('ABC123');
    expect(paper.title).toBe('Deep Learning for Natural Language Processing');
    expect(paper.abstract).toBe(
      'This paper presents a comprehensive survey of deep learning methods.'
    );
    expect(paper.authors).toHaveLength(2); // Only authors, not editors
    expect(paper.authors[0].name).toBe('John Smith');
    expect(paper.authors[1].name).toBe('Jane Doe');
    expect(paper.year).toBe(2023);
    expect(paper.venue).toBe('Journal of AI Research');
    expect(paper.volume).toBe('42');
    expect(paper.issue).toBe('3');
    expect(paper.pages).toBe('100-150');
    expect(paper.categories).toEqual(['deep learning', 'NLP']);
    expect(paper.urls).toHaveLength(1);
    expect(paper.urls[0].url).toBe('https://example.com/paper');
    expect(paper.metadata?.doi).toBe('10.1234/example.doi');
  });

  it('should handle single-name creators', () => {
    const paper = zoteroItemToPaper(mockZoteroItemWithSingleName);

    expect(paper.authors).toHaveLength(1);
    expect(paper.authors[0].name).toBe('Organization Name');
  });

  it('should handle missing date', () => {
    const paper = zoteroItemToPaper(mockZoteroItemNoDate);

    expect(paper.year).toBeUndefined();
  });

  it('should handle missing URL', () => {
    const itemNoUrl = { ...mockZoteroItem, url: undefined };
    const paper = zoteroItemToPaper(itemNoUrl);

    expect(paper.urls).toEqual([]);
  });

  it('should handle creators with only firstName', () => {
    const itemWithFirstOnly: ZoteroItem = {
      ...mockZoteroItem,
      creators: [{ creatorType: 'author', firstName: 'SingleFirst' }],
    };
    const paper = zoteroItemToPaper(itemWithFirstOnly);

    expect(paper.authors[0].name).toBe('SingleFirst');
  });

  it('should handle creators with only lastName', () => {
    const itemWithLastOnly: ZoteroItem = {
      ...mockZoteroItem,
      creators: [{ creatorType: 'author', lastName: 'SingleLast' }],
    };
    const paper = zoteroItemToPaper(itemWithLastOnly);

    expect(paper.authors[0].name).toBe('SingleLast');
  });
});

describe('paperToZoteroItem', () => {
  it('should convert Paper to Zotero item format', () => {
    const zoteroItem = paperToZoteroItem(mockPaper);

    expect(zoteroItem.itemType).toBe('journalArticle');
    expect(zoteroItem.title).toBe('Machine Learning Advances');
    expect(zoteroItem.abstractNote).toBe('A paper about ML advances');
    expect(zoteroItem.date).toBe('2024');
    expect(zoteroItem.DOI).toBe('10.5678/ml.paper');
    expect(zoteroItem.publicationTitle).toBe('ICML');
    expect(zoteroItem.volume).toBe('1');
    expect(zoteroItem.issue).toBe('2');
    expect(zoteroItem.pages).toBe('1-10');
    expect(zoteroItem.url).toBe('https://arxiv.org/paper');
    expect(zoteroItem.tags).toEqual([{ tag: 'machine learning' }, { tag: 'AI' }]);
  });

  it('should split multi-word author names correctly', () => {
    const zoteroItem = paperToZoteroItem(mockPaper);

    expect(zoteroItem.creators).toHaveLength(2);
    expect(zoteroItem.creators![0]).toEqual({
      creatorType: 'author',
      firstName: 'Alice',
      lastName: 'Johnson',
    });
  });

  it('should use single name field for single-word names', () => {
    const zoteroItem = paperToZoteroItem(mockPaper);

    expect(zoteroItem.creators![1]).toEqual({
      creatorType: 'author',
      name: 'Bob',
    });
  });

  it('should handle paper with no URLs', () => {
    const paperNoUrls: Paper = { ...mockPaper, urls: [] };
    const zoteroItem = paperToZoteroItem(paperNoUrls);

    expect(zoteroItem.url).toBeUndefined();
  });

  it('should handle paper with no categories', () => {
    const paperNoCategories: Paper = { ...mockPaper, categories: undefined };
    const zoteroItem = paperToZoteroItem(paperNoCategories);

    expect(zoteroItem.tags).toEqual([]);
  });

  it('should handle paper with no year', () => {
    const paperNoYear: Paper = { ...mockPaper, year: undefined };
    const zoteroItem = paperToZoteroItem(paperNoYear);

    expect(zoteroItem.date).toBeUndefined();
  });

  it('should handle paper with no metadata', () => {
    const paperNoMetadata: Paper = { ...mockPaper, metadata: undefined };
    const zoteroItem = paperToZoteroItem(paperNoMetadata);

    expect(zoteroItem.DOI).toBeUndefined();
  });

  it('should use journal when venue is not available', () => {
    const paperWithJournal: Paper = { ...mockPaper, venue: undefined, journal: 'Nature' };
    const zoteroItem = paperToZoteroItem(paperWithJournal);

    expect(zoteroItem.publicationTitle).toBe('Nature');
  });
});

// ============================================================================
// Citation Key Generation Tests
// ============================================================================

describe('generateCitationKey', () => {
  it('should generate citation key from author, year, and title', () => {
    const key = generateCitationKey(mockZoteroItem);

    expect(key).toBe('smith2023deep');
  });

  it('should handle single-name author', () => {
    const key = generateCitationKey(mockZoteroItemWithSingleName);

    expect(key).toBe('name2023deep');
  });

  it('should handle missing date', () => {
    const key = generateCitationKey(mockZoteroItemNoDate);

    expect(key).toBe('smithdeep');
  });

  it('should handle no authors', () => {
    const key = generateCitationKey(mockZoteroItemNoAuthors);

    expect(key).toBe('unknown2023deep');
  });

  it('should filter common words from title', () => {
    const itemWithCommonWords: ZoteroItem = {
      ...mockZoteroItem,
      title: 'The Study of a Theory',
    };
    const key = generateCitationKey(itemWithCommonWords);

    expect(key).toBe('smith2023study');
  });

  it('should handle title with only common words', () => {
    const itemCommonTitle: ZoteroItem = {
      ...mockZoteroItem,
      title: 'The A An Of',
    };
    const key = generateCitationKey(itemCommonTitle);

    expect(key).toBe('smith2023untitled');
  });

  it('should handle special characters in title', () => {
    const itemSpecialTitle: ZoteroItem = {
      ...mockZoteroItem,
      title: 'Neural Networks: A Review!',
    };
    const key = generateCitationKey(itemSpecialTitle);

    expect(key).toBe('smith2023neural');
  });

  it('should handle author name with spaces', () => {
    const itemSpacedAuthor: ZoteroItem = {
      ...mockZoteroItem,
      creators: [{ creatorType: 'author', lastName: 'Van Der Berg' }],
    };
    const key = generateCitationKey(itemSpacedAuthor);

    expect(key).toBe('vanderberg2023deep');
  });
});

// ============================================================================
// BibTeX Generation Tests
// ============================================================================

describe('zoteroItemToBibTeX', () => {
  it('should generate valid BibTeX entry', () => {
    const bibtex = zoteroItemToBibTeX(mockZoteroItem);

    expect(bibtex).toContain('@article{smith2023deep,');
    expect(bibtex).toContain('title = {Deep Learning for Natural Language Processing}');
    expect(bibtex).toContain('author = {Smith, John and Doe, Jane}');
    expect(bibtex).toContain('year = {2023}');
    expect(bibtex).toContain('journal = {Journal of AI Research}');
    expect(bibtex).toContain('volume = {42}');
    expect(bibtex).toContain('number = {3}');
    expect(bibtex).toContain('pages = {100-150}');
    expect(bibtex).toContain('publisher = {AI Press}');
    expect(bibtex).toContain('doi = {10.1234/example.doi}');
    expect(bibtex).toContain('url = {https://example.com/paper}');
    expect(bibtex).toContain('abstract = {');
  });

  it('should handle single-name author in BibTeX', () => {
    const bibtex = zoteroItemToBibTeX(mockZoteroItemWithSingleName);

    expect(bibtex).toContain('author = {Organization Name}');
  });

  it('should handle different item types', () => {
    const bookItem: ZoteroItem = {
      ...mockZoteroItem,
      itemType: 'book',
    };
    const bibtex = zoteroItemToBibTeX(bookItem);

    expect(bibtex).toContain('@book{');
  });

  it('should map conference paper to inproceedings', () => {
    const confItem: ZoteroItem = {
      ...mockZoteroItem,
      itemType: 'conferencePaper',
    };
    const bibtex = zoteroItemToBibTeX(confItem);

    expect(bibtex).toContain('@inproceedings{');
  });

  it('should map thesis to phdthesis', () => {
    const thesisItem: ZoteroItem = {
      ...mockZoteroItem,
      itemType: 'thesis',
    };
    const bibtex = zoteroItemToBibTeX(thesisItem);

    expect(bibtex).toContain('@phdthesis{');
  });

  it('should escape special BibTeX characters', () => {
    const itemSpecialChars: ZoteroItem = {
      ...mockZoteroItem,
      title: 'Using & % $ # _ { } ~ ^ in Titles',
    };
    const bibtex = zoteroItemToBibTeX(itemSpecialChars);

    expect(bibtex).toContain('\\&');
    expect(bibtex).toContain('\\%');
    expect(bibtex).toContain('\\$');
    expect(bibtex).toContain('\\#');
    expect(bibtex).toContain('\\_');
    expect(bibtex).toContain('\\{');
    expect(bibtex).toContain('\\}');
    expect(bibtex).toContain('\\textasciitilde{}');
    expect(bibtex).toContain('\\textasciicircum{}');
  });

  it('should escape backslashes', () => {
    const itemBackslash: ZoteroItem = {
      ...mockZoteroItem,
      title: 'Path: C:\\Users\\Test',
    };
    const bibtex = zoteroItemToBibTeX(itemBackslash);

    // Note: escapeBibTeX replaces \ first, then {} get escaped, resulting in \textbackslash\{\}
    expect(bibtex).toContain('\\textbackslash');
  });

  it('should handle item with no creators', () => {
    const bibtex = zoteroItemToBibTeX(mockZoteroItemNoAuthors);

    expect(bibtex).not.toContain('author = ');
  });

  it('should handle item with no date', () => {
    const bibtex = zoteroItemToBibTeX(mockZoteroItemNoDate);

    expect(bibtex).not.toContain('year = ');
  });

  it('should map all item types correctly', () => {
    const itemTypes: Array<{ type: ZoteroItem['itemType']; expected: string }> = [
      { type: 'bookSection', expected: '@incollection{' },
      { type: 'report', expected: '@techreport{' },
      { type: 'webpage', expected: '@misc{' },
      { type: 'patent', expected: '@misc{' },
      { type: 'manuscript', expected: '@unpublished{' },
      { type: 'presentation', expected: '@misc{' },
      { type: 'preprint', expected: '@misc{' },
      { type: 'document', expected: '@misc{' },
      { type: 'note', expected: '@misc{' },
      { type: 'attachment', expected: '@misc{' },
    ];

    for (const { type, expected } of itemTypes) {
      const item: ZoteroItem = { ...mockZoteroItem, itemType: type };
      const bibtex = zoteroItemToBibTeX(item);
      expect(bibtex).toContain(expected);
    }
  });
});

// ============================================================================
// ZoteroSyncService Tests
// ============================================================================

describe('ZoteroSyncService', () => {
  let service: ZoteroSyncService;

  beforeEach(() => {
    mockFetch.mockClear();
    jest.useFakeTimers();
    service = new ZoteroSyncService(mockConfig);
  });

  afterEach(() => {
    service.stopAutoSync();
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should create service with client', () => {
      expect(service).toBeInstanceOf(ZoteroSyncService);
      expect(service.getClient()).toBeInstanceOf(ZoteroClient);
    });
  });

  describe('fullSync', () => {
    it('should perform full sync and return success result', async () => {
      mockFetch.mockReturnValueOnce(createMockResponse([mockZoteroItem]));

      const result = await service.fullSync();

      expect(result.success).toBe(true);
      expect(result.itemsAdded).toBe(1);
      expect(result.itemsUpdated).toBe(0);
      expect(result.itemsDeleted).toBe(0);
      expect(result.errors).toEqual([]);
      expect(result.lastSyncTime).toBeInstanceOf(Date);
    });

    it('should handle sync errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.fullSync();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Network error');
    });

    it('should handle non-Error thrown values', async () => {
      mockFetch.mockRejectedValueOnce('String error');

      const result = await service.fullSync();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Unknown error');
    });
  });

  describe('incrementalSync', () => {
    it('should skip sync if version unchanged', async () => {
      // First call - getLibraryVersion returns 0 (matches initial lastSyncVersion)
      mockFetch.mockReturnValueOnce(
        Promise.resolve({
          headers: new Map([['Last-Modified-Version', '0']]),
        } as unknown as Response)
      );

      const result = await service.incrementalSync();

      expect(result.success).toBe(true);
      expect(result.itemsUpdated).toBe(0);
      expect(result.itemsDeleted).toBe(0);
    });

    it('should perform incremental sync when version changed', async () => {
      // getLibraryVersion
      mockFetch.mockReturnValueOnce(
        Promise.resolve({
          headers: new Map([['Last-Modified-Version', '5']]),
        } as unknown as Response)
      );
      // getModifiedItems
      mockFetch.mockReturnValueOnce(createMockResponse([mockZoteroItem, mockZoteroItem]));
      // getDeletedItems
      mockFetch.mockReturnValueOnce(createMockResponse({ items: ['DEL1'] }));

      const result = await service.incrementalSync();

      expect(result.success).toBe(true);
      expect(result.itemsUpdated).toBe(2);
      expect(result.itemsDeleted).toBe(1);
    });

    it('should handle incremental sync errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Sync failed'));

      const result = await service.incrementalSync();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Sync failed');
    });
  });

  describe('startAutoSync', () => {
    it('should start auto sync with default interval', () => {
      mockFetch.mockReturnValue(
        Promise.resolve({
          headers: new Map([['Last-Modified-Version', '0']]),
        } as unknown as Response)
      );

      service.startAutoSync();

      // Fast-forward 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000);

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should start auto sync with custom interval', () => {
      mockFetch.mockReturnValue(
        Promise.resolve({
          headers: new Map([['Last-Modified-Version', '0']]),
        } as unknown as Response)
      );

      service.startAutoSync(10);

      // Fast-forward 5 minutes - should not trigger
      jest.advanceTimersByTime(5 * 60 * 1000);
      const callsAt5Min = mockFetch.mock.calls.length;

      // Fast-forward another 5 minutes (total 10) - should trigger
      jest.advanceTimersByTime(5 * 60 * 1000);

      expect(mockFetch.mock.calls.length).toBeGreaterThan(callsAt5Min);
    });

    it('should stop previous auto sync when starting new one', () => {
      mockFetch.mockReturnValue(
        Promise.resolve({
          headers: new Map([['Last-Modified-Version', '0']]),
        } as unknown as Response)
      );

      service.startAutoSync(1);
      service.startAutoSync(1);

      // Fast-forward 1 minute
      jest.advanceTimersByTime(1 * 60 * 1000);

      // Should only trigger once, not twice
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopAutoSync', () => {
    it('should stop auto sync', () => {
      mockFetch.mockReturnValue(
        Promise.resolve({
          headers: new Map([['Last-Modified-Version', '0']]),
        } as unknown as Response)
      );

      service.startAutoSync(1);
      service.stopAutoSync();

      // Fast-forward 1 minute
      jest.advanceTimersByTime(1 * 60 * 1000);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle stopping when not running', () => {
      expect(() => service.stopAutoSync()).not.toThrow();
    });
  });

  describe('getClient', () => {
    it('should return the ZoteroClient instance', () => {
      const client = service.getClient();

      expect(client).toBeInstanceOf(ZoteroClient);
    });
  });
});

// ============================================================================
// Edge Cases and Integration Tests
// ============================================================================

describe('Edge Cases', () => {
  describe('extractYear', () => {
    it('should extract year from various date formats', () => {
      const testCases = [
        { input: '2023-05-15', expected: 2023 },
        { input: 'May 2023', expected: 2023 },
        { input: '2023', expected: 2023 },
        { input: '15/05/2023', expected: 2023 },
      ];

      for (const { input, expected } of testCases) {
        const item: ZoteroItem = { ...mockZoteroItem, date: input };
        const paper = zoteroItemToPaper(item);
        expect(paper.year).toBe(expected);
      }
    });

    it('should return undefined for invalid date', () => {
      const item: ZoteroItem = { ...mockZoteroItem, date: 'invalid' };
      const paper = zoteroItemToPaper(item);
      expect(paper.year).toBeUndefined();
    });
  });

  describe('Round-trip conversion', () => {
    it('should preserve key data in Paper -> Zotero -> Paper conversion', () => {
      const zoteroItem = paperToZoteroItem(mockPaper);
      // Create a full ZoteroItem from partial
      const fullZoteroItem: ZoteroItem = {
        ...zoteroItem,
        key: 'TEST123',
        version: 1,
        itemType: zoteroItem.itemType!,
        title: zoteroItem.title!,
        creators: zoteroItem.creators!,
        tags: zoteroItem.tags!,
        collections: [],
        relations: {},
        dateAdded: new Date().toISOString(),
        dateModified: new Date().toISOString(),
      };
      const paperBack = zoteroItemToPaper(fullZoteroItem);

      expect(paperBack.title).toBe(mockPaper.title);
      expect(paperBack.abstract).toBe(mockPaper.abstract);
      expect(paperBack.year).toBe(mockPaper.year);
    });
  });
});
