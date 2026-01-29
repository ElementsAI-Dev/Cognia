/**
 * Version Control - Unit Tests
 */

import versionControlApi, {
  LaTeXVersionControlService,
  DEFAULT_VERSION_CONFIG,
  generateCollaboratorColor,
  formatDiff,
  createVersionSnapshot,
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
});
