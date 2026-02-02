/**
 * Version Control - Unit Tests
 */

import versionControlApi, {
  LaTeXVersionControlService,
  DEFAULT_VERSION_CONFIG,
  generateCollaboratorColor,
  formatDiff,
  createVersionSnapshot,
  serializeVersionControl,
  deserializeVersionControl,
} from './version-control';

describe('Version Control', () => {
  describe('default export API', () => {
    it('should export all functions', () => {
      expect(versionControlApi.LaTeXVersionControlService).toBeDefined();
      expect(versionControlApi.DEFAULT_VERSION_CONFIG).toBeDefined();
      expect(versionControlApi.generateCollaboratorColor).toBeDefined();
      expect(versionControlApi.formatDiff).toBeDefined();
      expect(versionControlApi.createVersionSnapshot).toBeDefined();
    });
  });

  describe('DEFAULT_VERSION_CONFIG', () => {
    it('should have required properties', () => {
      expect(DEFAULT_VERSION_CONFIG).toBeDefined();
      expect(DEFAULT_VERSION_CONFIG.maxVersions).toBeDefined();
    });
  });

  describe('generateCollaboratorColor', () => {
    it('should generate color for index', () => {
      const color = generateCollaboratorColor(0);
      expect(color).toBeDefined();
      expect(typeof color).toBe('string');
    });

    it('should generate different colors for different indices', () => {
      const color1 = generateCollaboratorColor(0);
      const color2 = generateCollaboratorColor(1);
      expect(color1).not.toBe(color2);
    });
  });

  describe('createVersionSnapshot', () => {
    it('should create snapshot with content', () => {
      const snapshot = createVersionSnapshot('Test content');
      expect(snapshot.content).toBe('Test content');
      expect(snapshot.timestamp).toBeDefined();
    });

    it('should create snapshot with message', () => {
      const snapshot = createVersionSnapshot('Content', 'Test message');
      expect(snapshot.message).toBe('Test message');
    });

    it('should create snapshot with author', () => {
      const snapshot = createVersionSnapshot('Content', 'Message', 'Author');
      expect(snapshot.author).toBe('Author');
    });

    it('should create snapshot with tags', () => {
      const snapshot = createVersionSnapshot('Content', 'Message', 'Author', ['tag1', 'tag2']);
      expect(snapshot.tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('LaTeXVersionControlService', () => {
    let service: LaTeXVersionControlService;

    beforeEach(() => {
      service = new LaTeXVersionControlService();
    });

    it('should be instantiable', () => {
      expect(service).toBeInstanceOf(LaTeXVersionControlService);
    });

    it('should initialize document', () => {
      const docId = 'test-doc';
      const content = '\\documentclass{article}\\begin{document}Hello\\end{document}';
      const history = service.initDocument(docId, content);
      expect(history).toBeDefined();
      expect(history.documentId).toBe(docId);
      expect(history.versions.length).toBe(1);
    });

    it('should create new version after initialization', () => {
      const docId = 'test-doc';
      service.initDocument(docId, 'Initial content');
      const version = service.createVersion(docId, 'Updated content', 'V2');
      expect(version).not.toBeNull();
      expect(version?.content).toBe('Updated content');
    });

    it('should get document history', () => {
      const docId = 'test-doc';
      service.initDocument(docId, 'Content 0');
      service.createVersion(docId, 'Content 1', 'V1');
      service.createVersion(docId, 'Content 2', 'V2');
      
      const history = service.getHistory(docId);
      expect(history).toBeDefined();
      expect(history?.versions.length).toBe(3);
    });

    it('should get specific version by number', () => {
      const docId = 'test-doc';
      service.initDocument(docId, 'Content 1');
      
      const retrieved = service.getVersion(docId, 1);
      expect(retrieved?.content).toBe('Content 1');
    });

    it('should compute diff between contents', () => {
      const diff = service.computeDiff('Hello World', 'Hello Universe');
      expect(diff).toBeDefined();
      expect(diff.changes).toBeDefined();
      expect(diff.changes.length).toBeGreaterThan(0);
    });
  });

  describe('formatDiff', () => {
    it('should format diff as string', () => {
      const diff = {
        additions: 1,
        deletions: 1,
        changes: [
          { type: 'modify' as const, startLine: 1, endLine: 1, oldContent: 'old', newContent: 'new' },
        ],
      };
      
      const formatted = formatDiff(diff);
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });
  });

  describe('Serialization', () => {
    describe('serializeVersionControl', () => {
      it('should serialize empty service', () => {
        const service = new LaTeXVersionControlService();
        const serialized = serializeVersionControl(service);
        
        expect(serialized).toBeDefined();
        expect(serialized.config).toBeDefined();
        expect(serialized.histories).toEqual([]);
      });

      it('should serialize service with documents', () => {
        const service = new LaTeXVersionControlService();
        service.initDocument('doc1', 'Content 1', 'Author');
        service.createVersion('doc1', 'Content 2', 'Version 2');
        
        const serialized = serializeVersionControl(service);
        
        expect(serialized.histories.length).toBe(1);
        expect(serialized.histories[0].documentId).toBe('doc1');
        expect(serialized.histories[0].versions.length).toBe(2);
      });

      it('should serialize timestamps as ISO strings', () => {
        const service = new LaTeXVersionControlService();
        service.initDocument('doc1', 'Content');
        
        const serialized = serializeVersionControl(service);
        
        expect(typeof serialized.histories[0].versions[0].timestamp).toBe('string');
        expect(serialized.histories[0].versions[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}/);
      });

      it('should preserve config', () => {
        const customConfig = { maxVersions: 50, autoSaveInterval: 60000, enableAutoSave: false, enableCollaboration: true };
        const service = new LaTeXVersionControlService(customConfig);
        
        const serialized = serializeVersionControl(service);
        
        expect(serialized.config.maxVersions).toBe(50);
        expect(serialized.config.enableAutoSave).toBe(false);
      });
    });

    describe('deserializeVersionControl', () => {
      it('should deserialize to a new service', () => {
        const serializedData = {
          config: DEFAULT_VERSION_CONFIG,
          histories: [],
        };
        
        const service = deserializeVersionControl(serializedData);
        
        expect(service).toBeInstanceOf(LaTeXVersionControlService);
      });

      it('should restore documents', () => {
        const serializedData = {
          config: DEFAULT_VERSION_CONFIG,
          histories: [
            {
              documentId: 'doc1',
              versions: [
                {
                  id: 'v1',
                  version: 1,
                  content: 'Test content',
                  timestamp: new Date().toISOString(),
                },
              ],
              currentVersion: 1,
              collaborators: [],
              comments: [],
            },
          ],
        };
        
        const service = deserializeVersionControl(serializedData);
        const history = service.getHistory('doc1');
        
        expect(history).toBeDefined();
        expect(history?.documentId).toBe('doc1');
        expect(history?.versions.length).toBe(1);
      });

      it('should restore timestamps as Date objects', () => {
        const timestamp = '2024-01-15T10:30:00.000Z';
        const serializedData = {
          config: DEFAULT_VERSION_CONFIG,
          histories: [
            {
              documentId: 'doc1',
              versions: [
                {
                  id: 'v1',
                  version: 1,
                  content: 'Content',
                  timestamp,
                },
              ],
              currentVersion: 1,
              collaborators: [],
              comments: [],
            },
          ],
        };
        
        const service = deserializeVersionControl(serializedData);
        const history = service.getHistory('doc1');
        
        expect(history?.versions[0].timestamp).toBeInstanceOf(Date);
      });
    });

    describe('round-trip serialization', () => {
      it('should preserve data through serialize/deserialize cycle', () => {
        const originalService = new LaTeXVersionControlService();
        originalService.initDocument('doc1', 'Initial content', 'Author1');
        originalService.createVersion('doc1', 'Updated content', 'Update 1', 'Author1');
        originalService.createVersion('doc1', 'Final content', 'Final update', 'Author2');
        
        const serialized = serializeVersionControl(originalService);
        const restoredService = deserializeVersionControl(serialized);
        
        const originalHistory = originalService.getHistory('doc1');
        const restoredHistory = restoredService.getHistory('doc1');
        
        expect(restoredHistory?.documentId).toBe(originalHistory?.documentId);
        expect(restoredHistory?.versions.length).toBe(originalHistory?.versions.length);
        expect(restoredHistory?.currentVersion).toBe(originalHistory?.currentVersion);
      });

      it('should preserve version content', () => {
        const service = new LaTeXVersionControlService();
        service.initDocument('doc1', 'Line 1\nLine 2\nLine 3');
        service.createVersion('doc1', 'Line 1\nModified\nLine 3', 'Edit');
        
        const serialized = serializeVersionControl(service);
        const restored = deserializeVersionControl(serialized);
        
        const version = restored.getVersion('doc1', 2);
        expect(version?.content).toBe('Line 1\nModified\nLine 3');
      });
    });
  });

  describe('LaTeXVersionControlService - new methods', () => {
    let service: LaTeXVersionControlService;

    beforeEach(() => {
      service = new LaTeXVersionControlService();
    });

    describe('getAllHistories', () => {
      it('should return empty map initially', () => {
        const histories = service.getAllHistories();
        expect(histories.size).toBe(0);
      });

      it('should return all document histories', () => {
        service.initDocument('doc1', 'Content 1');
        service.initDocument('doc2', 'Content 2');
        
        const histories = service.getAllHistories();
        
        expect(histories.size).toBe(2);
        expect(histories.has('doc1')).toBe(true);
        expect(histories.has('doc2')).toBe(true);
      });
    });

    describe('getConfig', () => {
      it('should return config copy', () => {
        const config = service.getConfig();
        
        expect(config).toBeDefined();
        expect(config.maxVersions).toBe(DEFAULT_VERSION_CONFIG.maxVersions);
      });

      it('should return custom config', () => {
        const customService = new LaTeXVersionControlService({ maxVersions: 50 });
        const config = customService.getConfig();
        
        expect(config.maxVersions).toBe(50);
      });
    });

    describe('restoreHistory', () => {
      it('should restore history to service', () => {
        const history = {
          documentId: 'restored-doc',
          versions: [
            {
              id: 'v1',
              version: 1,
              content: 'Restored content',
              timestamp: new Date(),
            },
          ],
          currentVersion: 1,
          collaborators: [],
          comments: [],
        };
        
        service.restoreHistory(history);
        
        const retrieved = service.getHistory('restored-doc');
        expect(retrieved).toBeDefined();
        expect(retrieved?.documentId).toBe('restored-doc');
      });
    });
  });
});
