/**
 * Tests for Canvas Tool - Agent tools for Canvas document interaction
 */

import {
  createCanvasCreateTool,
  createCanvasUpdateTool,
  createCanvasReadTool,
  createCanvasOpenTool,
  createCanvasTools,
  getCanvasToolsRecord,
  type CanvasCreateInput,
  type CanvasUpdateInput,
} from './canvas-tool';

type CanvasReadInput = { documentId?: string };

interface CanvasToolResult {
  success: boolean;
  message: string;
  documentId?: string;
  content?: string;
  documents?: Array<{
    id: string;
    title: string;
    language: string;
    type: string;
    contentPreview: string;
  }>;
}

// Mock the artifact store
const mockCreateCanvasDocument = jest.fn();
const mockUpdateCanvasDocument = jest.fn();
const mockSaveCanvasVersion = jest.fn();
const mockSetActiveCanvas = jest.fn();
const mockOpenPanel = jest.fn();
const mockCanvasDocuments: Record<string, {
  id: string;
  title: string;
  content: string;
  language: string;
  type: string;
}> = {};

jest.mock('@/stores', () => ({
  useArtifactStore: {
    getState: () => ({
      canvasDocuments: mockCanvasDocuments,
      createCanvasDocument: mockCreateCanvasDocument,
      updateCanvasDocument: mockUpdateCanvasDocument,
      saveCanvasVersion: mockSaveCanvasVersion,
      setActiveCanvas: mockSetActiveCanvas,
      openPanel: mockOpenPanel,
    }),
  },
}));

describe('canvas-tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear mock documents
    Object.keys(mockCanvasDocuments).forEach(key => delete mockCanvasDocuments[key]);
  });

  describe('createCanvasCreateTool', () => {
    it('should return a valid AgentTool', () => {
      const tool = createCanvasCreateTool();

      expect(tool.name).toBe('canvas_create');
      expect(tool.description).toContain('Create a new Canvas document');
      expect(tool.parameters).toBeDefined();
      expect(tool.execute).toBeInstanceOf(Function);
      expect(tool.requiresApproval).toBe(false);
    });

    it('should create a canvas document successfully', async () => {
      const tool = createCanvasCreateTool();
      mockCreateCanvasDocument.mockReturnValue('doc-123');

      const input: CanvasCreateInput = {
        title: 'Test Document',
        content: 'console.log("hello");',
        language: 'javascript',
        type: 'code',
      };

      const result = await tool.execute(input) as CanvasToolResult;

      expect(result.success).toBe(true);
      expect(result.documentId).toBe('doc-123');
      expect(result.message).toContain('Test Document');
      expect(mockCreateCanvasDocument).toHaveBeenCalledWith({
        title: 'Test Document',
        content: 'console.log("hello");',
        language: 'javascript',
        type: 'code',
      });
      expect(mockSetActiveCanvas).toHaveBeenCalledWith('doc-123');
      expect(mockOpenPanel).toHaveBeenCalledWith('canvas');
    });

    it('should use default type if not provided', async () => {
      const tool = createCanvasCreateTool();
      mockCreateCanvasDocument.mockReturnValue('doc-456');

      const input = {
        title: 'Test',
        content: 'test',
        language: 'typescript',
      };

      await tool.execute(input);

      expect(mockCreateCanvasDocument).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'code' })
      );
    });

    it('should handle errors gracefully', async () => {
      const tool = createCanvasCreateTool();
      mockCreateCanvasDocument.mockImplementation(() => {
        throw new Error('Storage full');
      });

      const input: CanvasCreateInput = {
        title: 'Test',
        content: 'test',
        language: 'javascript',
        type: 'code',
      };

      const result = await tool.execute(input) as CanvasToolResult;

      expect(result.success).toBe(false);
      expect(result.message).toContain('Storage full');
    });

    it('should list supported languages in description', () => {
      const tool = createCanvasCreateTool();

      expect(tool.description).toContain('javascript');
      expect(tool.description).toContain('typescript');
      expect(tool.description).toContain('python');
    });
  });

  describe('createCanvasUpdateTool', () => {
    it('should return a valid AgentTool', () => {
      const tool = createCanvasUpdateTool();

      expect(tool.name).toBe('canvas_update');
      expect(tool.description).toContain('Update');
      expect(tool.execute).toBeInstanceOf(Function);
    });

    it('should update document content', async () => {
      const tool = createCanvasUpdateTool();
      mockCanvasDocuments['doc-1'] = {
        id: 'doc-1',
        title: 'Original Title',
        content: 'original content',
        language: 'javascript',
        type: 'code',
      };

      const input: CanvasUpdateInput = {
        documentId: 'doc-1',
        content: 'updated content',
      };

      const result = await tool.execute(input) as CanvasToolResult;

      expect(result.success).toBe(true);
      expect(mockUpdateCanvasDocument).toHaveBeenCalledWith('doc-1', { content: 'updated content' });
      expect(mockSaveCanvasVersion).toHaveBeenCalledWith('doc-1', 'AI update', true);
    });

    it('should update document title', async () => {
      const tool = createCanvasUpdateTool();
      mockCanvasDocuments['doc-1'] = {
        id: 'doc-1',
        title: 'Original Title',
        content: 'content',
        language: 'javascript',
        type: 'code',
      };

      const input: CanvasUpdateInput = {
        documentId: 'doc-1',
        title: 'New Title',
      };

      const result = await tool.execute(input) as CanvasToolResult;

      expect(result.success).toBe(true);
      expect(mockUpdateCanvasDocument).toHaveBeenCalledWith('doc-1', { title: 'New Title' });
    });

    it('should return error for non-existent document', async () => {
      const tool = createCanvasUpdateTool();

      const input: CanvasUpdateInput = {
        documentId: 'non-existent',
        content: 'test',
      };

      const result = await tool.execute(input) as CanvasToolResult;

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should handle update errors', async () => {
      const tool = createCanvasUpdateTool();
      mockCanvasDocuments['doc-1'] = {
        id: 'doc-1',
        title: 'Title',
        content: 'content',
        language: 'javascript',
        type: 'code',
      };
      mockUpdateCanvasDocument.mockImplementation(() => {
        throw new Error('Update failed');
      });

      const result = await tool.execute({ documentId: 'doc-1', content: 'new' }) as CanvasToolResult;

      expect(result.success).toBe(false);
      expect(result.message).toContain('Update failed');
    });
  });

  describe('createCanvasReadTool', () => {
    it('should return a valid AgentTool', () => {
      const tool = createCanvasReadTool();

      expect(tool.name).toBe('canvas_read');
      expect(tool.description).toContain('Read');
      expect(tool.execute).toBeInstanceOf(Function);
    });

    it('should read specific document by ID', async () => {
      const tool = createCanvasReadTool();
      mockCanvasDocuments['doc-1'] = {
        id: 'doc-1',
        title: 'Test Doc',
        content: 'test content here',
        language: 'javascript',
        type: 'code',
      };

      const input: CanvasReadInput = { documentId: 'doc-1' };
      const result = await tool.execute(input) as CanvasToolResult;

      expect(result.success).toBe(true);
      expect(result.documentId).toBe('doc-1');
      expect(result.content).toBe('test content here');
    });

    it('should return all documents when no ID provided', async () => {
      const tool = createCanvasReadTool();
      mockCanvasDocuments['doc-1'] = {
        id: 'doc-1',
        title: 'Doc 1',
        content: 'content 1',
        language: 'javascript',
        type: 'code',
      };
      mockCanvasDocuments['doc-2'] = {
        id: 'doc-2',
        title: 'Doc 2',
        content: 'content 2',
        language: 'python',
        type: 'code',
      };

      const result = await tool.execute({}) as CanvasToolResult;

      expect(result.success).toBe(true);
      expect(result.documents).toHaveLength(2);
      expect(result.message).toContain('2 canvas document(s)');
    });

    it('should truncate content preview to 200 characters', async () => {
      const tool = createCanvasReadTool();
      const longContent = 'a'.repeat(300);
      mockCanvasDocuments['doc-1'] = {
        id: 'doc-1',
        title: 'Long Doc',
        content: longContent,
        language: 'javascript',
        type: 'code',
      };

      const result = await tool.execute({}) as CanvasToolResult;

      expect(result.documents?.[0].contentPreview.length).toBeLessThanOrEqual(203);
      expect(result.documents?.[0].contentPreview).toContain('...');
    });

    it('should return error for non-existent document', async () => {
      const tool = createCanvasReadTool();

      const result = await tool.execute({ documentId: 'non-existent' }) as CanvasToolResult;

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('createCanvasOpenTool', () => {
    it('should return a valid AgentTool', () => {
      const tool = createCanvasOpenTool();

      expect(tool.name).toBe('canvas_open');
      expect(tool.description).toContain('Open');
      expect(tool.execute).toBeInstanceOf(Function);
    });

    it('should open existing document', async () => {
      const tool = createCanvasOpenTool();
      mockCanvasDocuments['doc-1'] = {
        id: 'doc-1',
        title: 'My Document',
        content: 'content',
        language: 'javascript',
        type: 'code',
      };

      const result = await tool.execute({ documentId: 'doc-1' }) as CanvasToolResult;

      expect(result.success).toBe(true);
      expect(result.message).toContain('My Document');
      expect(mockSetActiveCanvas).toHaveBeenCalledWith('doc-1');
      expect(mockOpenPanel).toHaveBeenCalledWith('canvas');
    });

    it('should return error for non-existent document', async () => {
      const tool = createCanvasOpenTool();

      const result = await tool.execute({ documentId: 'non-existent' }) as CanvasToolResult;

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should handle errors', async () => {
      const tool = createCanvasOpenTool();
      mockCanvasDocuments['doc-1'] = {
        id: 'doc-1',
        title: 'Doc',
        content: 'content',
        language: 'javascript',
        type: 'code',
      };
      mockSetActiveCanvas.mockImplementation(() => {
        throw new Error('Panel error');
      });

      const result = await tool.execute({ documentId: 'doc-1' }) as CanvasToolResult;

      expect(result.success).toBe(false);
      expect(result.message).toContain('Panel error');
    });
  });

  describe('createCanvasTools', () => {
    it('should return array of all canvas tools', () => {
      const tools = createCanvasTools();

      expect(tools).toHaveLength(4);
      expect(tools.map(t => t.name)).toEqual([
        'canvas_create',
        'canvas_update',
        'canvas_read',
        'canvas_open',
      ]);
    });
  });

  describe('getCanvasToolsRecord', () => {
    it('should return tools as a record', () => {
      const record = getCanvasToolsRecord();

      expect(record).toHaveProperty('canvas_create');
      expect(record).toHaveProperty('canvas_update');
      expect(record).toHaveProperty('canvas_read');
      expect(record).toHaveProperty('canvas_open');
      expect(Object.keys(record)).toHaveLength(4);
    });

    it('should have valid tool definitions', () => {
      const record = getCanvasToolsRecord();

      for (const [name, tool] of Object.entries(record)) {
        expect(tool.name).toBe(name);
        expect(tool.execute).toBeInstanceOf(Function);
        expect(tool.parameters).toBeDefined();
      }
    });
  });
});
