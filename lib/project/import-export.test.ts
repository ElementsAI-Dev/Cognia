/**
 * Tests for Project Import/Export utilities
 */

import JSZip from 'jszip';
import {
  exportProjectToJSON,
  exportProjectsToZip,
  importProjectFromJSON,
  importProjectsFromZip,
  downloadFile,
  type ProjectExportData,
  type ExportedProject,
} from './import-export';
import type { Project, KnowledgeFile } from '@/types';

// Mock JSZip
const mockFile = jest.fn();
const mockFolder = jest.fn().mockReturnValue({ file: jest.fn() });
const mockGenerateAsync = jest.fn().mockResolvedValue(new Blob(['test']));
const mockLoadAsync = jest.fn();

jest.mock('jszip', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      file: mockFile,
      folder: mockFolder,
      generateAsync: mockGenerateAsync,
      files: {},
    })),
  };
});

// Add static loadAsync to the mock
(JSZip as unknown as { loadAsync: jest.Mock }).loadAsync = mockLoadAsync;

// Mock crypto.randomUUID
const mockRandomUUID = jest.fn(() => 'mock-uuid-12345');
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: mockRandomUUID,
  },
  writable: true,
});

// Mock URL and document for downloadFile
const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = jest.fn();
Object.defineProperty(globalThis, 'URL', {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
  writable: true,
});

describe('exportProjectToJSON', () => {
  const createMockProject = (overrides?: Partial<Project>): Project => ({
    id: 'project-123',
    name: 'Test Project',
    description: 'A test project',
    icon: 'Folder',
    color: '#3B82F6',
    customInstructions: 'Custom instructions here',
    defaultProvider: 'openai',
    defaultModel: 'gpt-4',
    defaultMode: 'chat',
    knowledgeBase: [],
    sessionIds: ['session-1', 'session-2'],
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-02T00:00:00Z'),
    lastAccessedAt: new Date('2024-01-03T00:00:00Z'),
    sessionCount: 2,
    messageCount: 10,
    ...overrides,
  });

  it('exports project with all fields', () => {
    const project = createMockProject();
    const result = exportProjectToJSON(project);
    const parsed = JSON.parse(result) as ProjectExportData;

    expect(parsed.version).toBe('1.0');
    expect(parsed.exportedAt).toBeDefined();
    expect(parsed.project.id).toBe('project-123');
    expect(parsed.project.name).toBe('Test Project');
    expect(parsed.project.description).toBe('A test project');
    expect(parsed.project.icon).toBe('Folder');
    expect(parsed.project.color).toBe('#3B82F6');
    expect(parsed.project.customInstructions).toBe('Custom instructions here');
    expect(parsed.project.defaultProvider).toBe('openai');
    expect(parsed.project.defaultModel).toBe('gpt-4');
    expect(parsed.project.defaultMode).toBe('chat');
  });

  it('exports project with knowledge base files', () => {
    const knowledgeFile: KnowledgeFile = {
      id: 'file-1',
      name: 'test-doc.txt',
      type: 'text',
      content: 'Test content',
      size: 12,
      mimeType: 'text/plain',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
    };

    const project = createMockProject({
      knowledgeBase: [knowledgeFile],
    });

    const result = exportProjectToJSON(project);
    const parsed = JSON.parse(result) as ProjectExportData;

    expect(parsed.project.knowledgeBase).toHaveLength(1);
    expect(parsed.project.knowledgeBase[0].id).toBe('file-1');
    expect(parsed.project.knowledgeBase[0].name).toBe('test-doc.txt');
    expect(parsed.project.knowledgeBase[0].type).toBe('text');
    expect(parsed.project.knowledgeBase[0].content).toBe('Test content');
    expect(parsed.project.knowledgeBase[0].size).toBe(12);
    expect(parsed.project.knowledgeBase[0].mimeType).toBe('text/plain');
  });

  it('handles Date objects for timestamps', () => {
    const project = createMockProject({
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
    });

    const result = exportProjectToJSON(project);
    const parsed = JSON.parse(result) as ProjectExportData;

    expect(parsed.project.createdAt).toBe('2024-01-01T00:00:00.000Z');
    expect(parsed.project.updatedAt).toBe('2024-01-02T00:00:00.000Z');
  });

  it('handles string timestamps', () => {
    const project = createMockProject({
      createdAt: '2024-01-01T00:00:00Z' as unknown as Date,
      updatedAt: '2024-01-02T00:00:00Z' as unknown as Date,
    });

    const result = exportProjectToJSON(project);
    const parsed = JSON.parse(result) as ProjectExportData;

    expect(parsed.project.createdAt).toBe('2024-01-01T00:00:00Z');
    expect(parsed.project.updatedAt).toBe('2024-01-02T00:00:00Z');
  });

  it('outputs formatted JSON', () => {
    const project = createMockProject();
    const result = exportProjectToJSON(project);

    // Check that it's formatted with indentation
    expect(result).toContain('\n');
    expect(result).toContain('  ');
  });

  it('handles empty knowledge base', () => {
    const project = createMockProject({
      knowledgeBase: [],
    });

    const result = exportProjectToJSON(project);
    const parsed = JSON.parse(result) as ProjectExportData;

    expect(parsed.project.knowledgeBase).toEqual([]);
  });

  it('handles project with all mode types', () => {
    const modes: Array<'chat' | 'agent' | 'research'> = ['chat', 'agent', 'research'];

    modes.forEach((mode) => {
      const project = createMockProject({ defaultMode: mode });
      const result = exportProjectToJSON(project);
      const parsed = JSON.parse(result) as ProjectExportData;

      expect(parsed.project.defaultMode).toBe(mode);
    });
  });
});

describe('exportProjectsToZip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateAsync.mockResolvedValue(new Blob(['test']));
  });

  const createMockProject = (overrides?: Partial<Project>): Project => ({
    id: 'project-123',
    name: 'Test Project',
    description: 'A test project',
    icon: 'Folder',
    color: '#3B82F6',
    knowledgeBase: [],
    sessionIds: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    lastAccessedAt: new Date('2024-01-03'),
    sessionCount: 0,
    messageCount: 0,
    ...overrides,
  });

  it('creates zip with README and project files', async () => {
    const projects = [createMockProject()];
    const result = await exportProjectsToZip(projects);

    expect(result.success).toBe(true);
    expect(result.filename).toMatch(/^cognia-projects-\d{4}-\d{2}-\d{2}\.zip$/);
    expect(result.blob).toBeDefined();
    expect(mockFile).toHaveBeenCalledWith('README.md', expect.any(String));
  });

  it('creates folder for each project', async () => {
    const projects = [
      createMockProject({ id: 'proj-1', name: 'Project One' }),
      createMockProject({ id: 'proj-2', name: 'Project Two' }),
    ];

    await exportProjectsToZip(projects);

    expect(mockFile).toHaveBeenCalledWith(
      expect.stringContaining('/project.json'),
      expect.any(String)
    );
  });

  it('creates knowledge folder when project has files', async () => {
    const project = createMockProject({
      knowledgeBase: [
        {
          id: 'file-1',
          name: 'doc.txt',
          type: 'text',
          content: 'Content',
          size: 7,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    await exportProjectsToZip([project]);

    expect(mockFolder).toHaveBeenCalledWith(
      expect.stringContaining('/knowledge')
    );
  });

  it('handles export error gracefully', async () => {
    mockGenerateAsync.mockRejectedValue(new Error('Zip failed'));

    const projects = [createMockProject()];
    const result = await exportProjectsToZip(projects);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Zip failed');
  });

  it('handles empty projects array', async () => {
    const result = await exportProjectsToZip([]);

    expect(result.success).toBe(true);
    expect(mockFile).toHaveBeenCalledWith('README.md', expect.any(String));
  });

  it('sanitizes project names for filenames', async () => {
    const project = createMockProject({
      name: 'Test/Project:With*Special<>Chars',
    });

    await exportProjectsToZip([project]);

    // Should create file with sanitized name
    expect(mockFile).toHaveBeenCalled();
  });

  it('uses DEFLATE compression', async () => {
    const projects = [createMockProject()];
    await exportProjectsToZip(projects);

    expect(mockGenerateAsync).toHaveBeenCalledWith({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
  });
});

describe('importProjectFromJSON', () => {
  const createValidExportData = (overrides?: Partial<ExportedProject>): string => {
    const data: ProjectExportData = {
      version: '1.0',
      exportedAt: '2024-01-01T00:00:00Z',
      project: {
        id: 'project-123',
        name: 'Imported Project',
        description: 'A project to import',
        icon: 'Star',
        color: '#FF0000',
        customInstructions: 'Instructions',
        defaultProvider: 'anthropic',
        defaultModel: 'claude-3',
        defaultMode: 'agent',
        knowledgeBase: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        ...overrides,
      },
    };
    return JSON.stringify(data);
  };

  it('imports valid project data', () => {
    const jsonData = createValidExportData();
    const result = importProjectFromJSON(jsonData);

    expect(result.success).toBe(true);
    expect(result.project).toBeDefined();
    expect(result.project?.name).toBe('Imported Project');
    expect(result.project?.description).toBe('A project to import');
  });

  it('preserves original ID by default', () => {
    const jsonData = createValidExportData({ id: 'original-id' });
    const result = importProjectFromJSON(jsonData);

    expect(result.project?.id).toBe('original-id');
  });

  it('generates new ID when option is set', () => {
    const jsonData = createValidExportData({ id: 'original-id' });
    const result = importProjectFromJSON(jsonData, { generateNewId: true });

    expect(result.project?.id).toBe('mock-uuid-12345');
  });

  it('applies default values for missing optional fields', () => {
    const data: ProjectExportData = {
      version: '1.0',
      exportedAt: '2024-01-01T00:00:00Z',
      project: {
        id: 'project-123',
        name: 'Minimal Project',
        knowledgeBase: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
    };
    const result = importProjectFromJSON(JSON.stringify(data));

    expect(result.success).toBe(true);
    expect(result.project?.icon).toBe('Folder');
    expect(result.project?.color).toBe('#3B82F6');
  });

  it('imports knowledge base files', () => {
    const jsonData = createValidExportData({
      knowledgeBase: [
        {
          id: 'file-1',
          name: 'document.md',
          type: 'markdown',
          content: '# Hello',
          size: 7,
          mimeType: 'text/markdown',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ],
    });

    const result = importProjectFromJSON(jsonData);

    expect(result.project?.knowledgeBase).toHaveLength(1);
    expect(result.project?.knowledgeBase[0].name).toBe('document.md');
    expect(result.project?.knowledgeBase[0].type).toBe('markdown');
    expect(result.warnings).toContain('Imported 1 knowledge base files');
  });

  it('generates new IDs for knowledge files when option is set', () => {
    mockRandomUUID.mockReturnValueOnce('new-project-id').mockReturnValueOnce('new-file-id');

    const jsonData = createValidExportData({
      knowledgeBase: [
        {
          id: 'old-file-id',
          name: 'document.md',
          type: 'markdown',
          content: '# Hello',
          size: 7,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ],
    });

    const result = importProjectFromJSON(jsonData, { generateNewId: true });

    expect(result.project?.id).toBe('new-project-id');
    expect(result.project?.knowledgeBase[0].id).toBe('new-file-id');
  });

  it('resets session associations', () => {
    const jsonData = createValidExportData();
    const result = importProjectFromJSON(jsonData);

    expect(result.project?.sessionIds).toEqual([]);
    expect(result.project?.sessionCount).toBe(0);
    expect(result.project?.messageCount).toBe(0);
  });

  it('fails on missing version', () => {
    const data = {
      exportedAt: '2024-01-01T00:00:00Z',
      project: { id: 'test', name: 'Test', knowledgeBase: [] },
    };
    const result = importProjectFromJSON(JSON.stringify(data));

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid project file: missing version');
  });

  it('fails on missing project data', () => {
    const data = {
      version: '1.0',
      exportedAt: '2024-01-01T00:00:00Z',
    };
    const result = importProjectFromJSON(JSON.stringify(data));

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid project file: missing project data');
  });

  it('fails on invalid JSON', () => {
    const result = importProjectFromJSON('not valid json');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('sets updatedAt and lastAccessedAt to current time', () => {
    const jsonData = createValidExportData();
    const beforeImport = new Date();
    const result = importProjectFromJSON(jsonData);
    const afterImport = new Date();

    expect(result.project?.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeImport.getTime());
    expect(result.project?.updatedAt.getTime()).toBeLessThanOrEqual(afterImport.getTime());
    expect(result.project?.lastAccessedAt.getTime()).toBeGreaterThanOrEqual(beforeImport.getTime());
  });
});

describe('importProjectsFromZip', () => {
  const MockJSZip = JSZip as jest.MockedClass<typeof JSZip> & {
    loadAsync: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('imports projects from valid zip file', async () => {
    const mockProjectJson = JSON.stringify({
      version: '1.0',
      exportedAt: '2024-01-01T00:00:00Z',
      project: {
        id: 'project-1',
        name: 'Imported Project',
        knowledgeBase: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
    });

    MockJSZip.loadAsync = jest.fn().mockResolvedValue({
      files: {
        'test-project/project.json': {},
      },
      file: jest.fn().mockReturnValue({
        async: jest.fn().mockResolvedValue(mockProjectJson),
      }),
    });

    const file = new File(['test'], 'test.zip', { type: 'application/zip' });
    const result = await importProjectsFromZip(file);

    expect(result.success).toBe(true);
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].name).toBe('Imported Project');
  });

  it('generates new IDs when option is set', async () => {
    mockRandomUUID.mockReturnValue('new-generated-id');

    const mockProjectJson = JSON.stringify({
      version: '1.0',
      exportedAt: '2024-01-01T00:00:00Z',
      project: {
        id: 'old-id',
        name: 'Project',
        knowledgeBase: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
    });

    MockJSZip.loadAsync = jest.fn().mockResolvedValue({
      files: {
        'folder/project.json': {},
      },
      file: jest.fn().mockReturnValue({
        async: jest.fn().mockResolvedValue(mockProjectJson),
      }),
    });

    const file = new File(['test'], 'test.zip');
    const result = await importProjectsFromZip(file, { generateNewIds: true });

    expect(result.projects[0].id).toBe('new-generated-id');
  });

  it('handles multiple projects in zip', async () => {
    const createProjectJson = (id: string, name: string) =>
      JSON.stringify({
        version: '1.0',
        exportedAt: '2024-01-01T00:00:00Z',
        project: {
          id,
          name,
          knowledgeBase: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      });

    const mockZip = {
      files: {
        'project1/project.json': {},
        'project2/project.json': {},
      },
      file: jest.fn((path: string) => {
        if (path === 'project1/project.json') {
          return {
            async: jest.fn().mockResolvedValue(createProjectJson('p1', 'Project 1')),
          };
        }
        if (path === 'project2/project.json') {
          return {
            async: jest.fn().mockResolvedValue(createProjectJson('p2', 'Project 2')),
          };
        }
        return null;
      }),
    };

    MockJSZip.loadAsync = jest.fn().mockResolvedValue(mockZip);

    const file = new File(['test'], 'test.zip');
    const result = await importProjectsFromZip(file);

    expect(result.success).toBe(true);
    expect(result.projects).toHaveLength(2);
  });

  it('collects errors for invalid projects', async () => {
    MockJSZip.loadAsync = jest.fn().mockResolvedValue({
      files: {
        'invalid/project.json': {},
      },
      file: jest.fn().mockReturnValue({
        async: jest.fn().mockResolvedValue('{ invalid json }'),
      }),
    });

    const file = new File(['test'], 'test.zip');
    const result = await importProjectsFromZip(file);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('handles zip read failure', async () => {
    MockJSZip.loadAsync = jest.fn().mockRejectedValue(new Error('Invalid zip'));

    const file = new File(['test'], 'test.zip');
    const result = await importProjectsFromZip(file);

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Invalid zip');
  });

  it('skips folders without project.json', async () => {
    MockJSZip.loadAsync = jest.fn().mockResolvedValue({
      files: {
        'README.md': {},
        'other-folder/file.txt': {},
      },
      file: jest.fn().mockReturnValue(null),
    });

    const file = new File(['test'], 'test.zip');
    const result = await importProjectsFromZip(file);

    expect(result.projects).toHaveLength(0);
  });

  it('handles project file read errors', async () => {
    MockJSZip.loadAsync = jest.fn().mockResolvedValue({
      files: {
        'project/project.json': {},
      },
      file: jest.fn().mockReturnValue({
        async: jest.fn().mockRejectedValue(new Error('Read failed')),
      }),
    });

    const file = new File(['test'], 'test.zip');
    const result = await importProjectsFromZip(file);

    expect(result.errors).toContain('project: Failed to read project file');
  });
});

describe('downloadFile', () => {
  let mockAppendChild: jest.Mock;
  let mockRemoveChild: jest.Mock;
  let mockClick: jest.Mock;
  let mockAnchor: { href: string; download: string; click: jest.Mock };

  beforeEach(() => {
    mockClick = jest.fn();
    mockAnchor = {
      href: '',
      download: '',
      click: mockClick,
    };
    mockAppendChild = jest.fn();
    mockRemoveChild = jest.fn();

    jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLAnchorElement);
    jest.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
    jest.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('downloads string content', () => {
    downloadFile('test content', 'test.txt');

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockAnchor.download).toBe('test.txt');
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });

  it('downloads blob content', () => {
    const blob = new Blob(['blob content'], { type: 'text/plain' });
    downloadFile(blob, 'test.txt');

    expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
    expect(mockAnchor.download).toBe('test.txt');
    expect(mockClick).toHaveBeenCalled();
  });

  it('creates anchor element and removes it after click', () => {
    downloadFile('content', 'file.txt');

    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(mockAppendChild).toHaveBeenCalled();
    expect(mockRemoveChild).toHaveBeenCalled();
  });

  it('revokes object URL after download', () => {
    downloadFile('content', 'file.txt');

    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});
