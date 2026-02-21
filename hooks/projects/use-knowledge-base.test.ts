/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { useKnowledgeBase } from './use-knowledge-base';

// Mock dependencies
jest.mock('@/lib/native', () => ({
  opener: { openUrl: jest.fn() },
}));

jest.mock('@/lib/project/import-export', () => ({
  downloadFile: jest.fn(),
}));

jest.mock('@/lib/project/knowledge-base-utils', () => ({
  detectFileType: jest.fn((filename: string) => {
    if (filename.endsWith('.md')) return 'markdown';
    if (filename.endsWith('.json')) return 'json';
    return 'text';
  }),
}));

const mockProcessFile = jest.fn();
const mockValidate = jest.fn().mockReturnValue({ valid: true, errors: [] });

jest.mock('@/hooks/document', () => ({
  useDocumentProcessor: () => ({
    processFile: mockProcessFile,
    validate: mockValidate,
  }),
}));

// Mock stores
const mockProject = {
  id: 'project-1',
  name: 'Test Project',
  knowledgeBase: [
    {
      id: 'file-1',
      name: 'readme.md',
      type: 'markdown' as const,
      content: '# Hello World',
      size: 13,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'file-2',
      name: 'data.json',
      type: 'json' as const,
      content: '{"key": "value"}',
      size: 16,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
};

const mockAddKnowledgeFile = jest.fn();
const mockRemoveKnowledgeFile = jest.fn();
const mockUpdateKnowledgeFile = jest.fn();
const mockDeleteDocument = jest.fn();
const mockDeleteDocuments = jest.fn();
const mockClearAllDocuments = jest.fn();
const mockAssignToProject = jest.fn();
const mockRemoveFromProject = jest.fn();
const mockGetDocumentsByProject = jest.fn().mockReturnValue([]);
const mockFilterDocuments = jest.fn().mockReturnValue([]);

jest.mock('@/stores', () => ({
  useNativeStore: (selector: (s: { isDesktop: boolean }) => unknown) =>
    selector({ isDesktop: false }),
  useProjectStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      getProject: (id: string) => (id === 'project-1' ? mockProject : null),
      addKnowledgeFile: mockAddKnowledgeFile,
      removeKnowledgeFile: mockRemoveKnowledgeFile,
      updateKnowledgeFile: mockUpdateKnowledgeFile,
    }),
  useDocumentStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        deleteDocument: mockDeleteDocument,
        deleteDocuments: mockDeleteDocuments,
        clearAllDocuments: mockClearAllDocuments,
        assignToProject: mockAssignToProject,
        removeFromProject: mockRemoveFromProject,
        getDocumentsByProject: mockGetDocumentsByProject,
      }),
    {
      getState: () => ({
        filterDocuments: mockFilterDocuments,
      }),
    }
  ),
}));

// Mock shiki to avoid dynamic import issues
jest.mock('shiki', () => ({
  codeToHtml: jest.fn().mockResolvedValue('<pre><code>highlighted</code></pre>'),
}));

describe('useKnowledgeBase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return project and initial state', () => {
    const { result } = renderHook(() => useKnowledgeBase({ projectId: 'project-1' }));

    expect(result.current.project).toBe(mockProject);
    expect(result.current.searchQuery).toBe('');
    expect(result.current.filteredFiles).toHaveLength(2);
    expect(result.current.isUploading).toBe(false);
    expect(result.current.uploadError).toBeNull();
    expect(result.current.isDragging).toBe(false);
    expect(result.current.isEditing).toBe(false);
    expect(result.current.selectedFiles.size).toBe(0);
    expect(result.current.viewingFile).toBeNull();
    expect(result.current.deleteFileId).toBeNull();
  });

  it('should return null project for unknown projectId', () => {
    const { result } = renderHook(() => useKnowledgeBase({ projectId: 'unknown' }));
    expect(result.current.project).toBeNull();
    expect(result.current.filteredFiles).toHaveLength(0);
  });

  it('should filter files by search query', () => {
    const { result } = renderHook(() => useKnowledgeBase({ projectId: 'project-1' }));

    act(() => {
      result.current.setSearchQuery('readme');
    });

    expect(result.current.filteredFiles).toHaveLength(1);
    expect(result.current.filteredFiles[0].name).toBe('readme.md');
  });

  it('should filter files by content', () => {
    const { result } = renderHook(() => useKnowledgeBase({ projectId: 'project-1' }));

    act(() => {
      result.current.setSearchQuery('Hello');
    });

    expect(result.current.filteredFiles).toHaveLength(1);
    expect(result.current.filteredFiles[0].name).toBe('readme.md');
  });

  it('should toggle file selection', () => {
    const { result } = renderHook(() => useKnowledgeBase({ projectId: 'project-1' }));

    act(() => {
      result.current.toggleFileSelection('file-1');
    });
    expect(result.current.selectedFiles.has('file-1')).toBe(true);
    expect(result.current.selectedFiles.size).toBe(1);

    // Toggle off
    act(() => {
      result.current.toggleFileSelection('file-1');
    });
    expect(result.current.selectedFiles.has('file-1')).toBe(false);
    expect(result.current.selectedFiles.size).toBe(0);
  });

  it('should toggle select all', () => {
    const { result } = renderHook(() => useKnowledgeBase({ projectId: 'project-1' }));

    // Select all
    act(() => {
      result.current.toggleSelectAll();
    });
    expect(result.current.selectedFiles.size).toBe(2);

    // Deselect all
    act(() => {
      result.current.toggleSelectAll();
    });
    expect(result.current.selectedFiles.size).toBe(0);
  });

  it('should handle add manual file', () => {
    const { result } = renderHook(() => useKnowledgeBase({ projectId: 'project-1' }));

    act(() => {
      result.current.setNewFileName('test.md');
      result.current.setNewFileContent('# Test content');
    });

    act(() => {
      result.current.handleAddManual();
    });

    expect(mockAddKnowledgeFile).toHaveBeenCalledWith('project-1', {
      name: 'test.md',
      type: 'markdown',
      content: '# Test content',
      size: 14,
    });
    expect(result.current.newFileName).toBe('');
    expect(result.current.newFileContent).toBe('');
    expect(result.current.showAddDialog).toBe(false);
  });

  it('should not add manual file with empty name or content', () => {
    const { result } = renderHook(() => useKnowledgeBase({ projectId: 'project-1' }));

    act(() => {
      result.current.handleAddManual();
    });

    expect(mockAddKnowledgeFile).not.toHaveBeenCalled();
  });

  it('should handle delete file', () => {
    const { result } = renderHook(() => useKnowledgeBase({ projectId: 'project-1' }));

    act(() => {
      result.current.setDeleteFileId('file-1');
    });

    act(() => {
      result.current.handleDelete();
    });

    expect(mockRemoveKnowledgeFile).toHaveBeenCalledWith('project-1', 'file-1');
    expect(result.current.deleteFileId).toBeNull();
  });

  it('should not delete when deleteFileId is null', () => {
    const { result } = renderHook(() => useKnowledgeBase({ projectId: 'project-1' }));

    act(() => {
      result.current.handleDelete();
    });

    expect(mockRemoveKnowledgeFile).not.toHaveBeenCalled();
  });

  it('should handle download', () => {
     
    const importExport = require('@/lib/project/import-export') as { downloadFile: jest.Mock };
    const { result } = renderHook(() => useKnowledgeBase({ projectId: 'project-1' }));

    act(() => {
      result.current.handleDownload(mockProject.knowledgeBase[0]);
    });

    expect(importExport.downloadFile).toHaveBeenCalledWith('# Hello World', 'readme.md');
  });

  it('should handle editing flow', () => {
    const { result } = renderHook(() => useKnowledgeBase({ projectId: 'project-1' }));
    const file = mockProject.knowledgeBase[0];

    // Start editing
    act(() => {
      result.current.setViewingFile(file);
      result.current.startEditing(file);
    });
    expect(result.current.isEditing).toBe(true);
    expect(result.current.editContent).toBe('# Hello World');

    // Cancel editing
    act(() => {
      result.current.cancelEditing();
    });
    expect(result.current.isEditing).toBe(false);
    expect(result.current.editContent).toBe('');
  });

  it('should save edit and update knowledge file', () => {
    const { result } = renderHook(() => useKnowledgeBase({ projectId: 'project-1' }));
    const file = mockProject.knowledgeBase[0];

    act(() => {
      result.current.setViewingFile(file);
      result.current.startEditing(file);
    });

    act(() => {
      result.current.setEditContent('# Updated content');
    });

    act(() => {
      result.current.saveEdit();
    });

    expect(mockUpdateKnowledgeFile).toHaveBeenCalledWith(
      'project-1',
      'file-1',
      '# Updated content'
    );
    expect(result.current.isEditing).toBe(false);
    expect(result.current.viewingFile).toBeNull();
  });

  it('should close viewer and reset state', () => {
    const { result } = renderHook(() => useKnowledgeBase({ projectId: 'project-1' }));

    act(() => {
      result.current.setViewingFile(mockProject.knowledgeBase[0]);
      result.current.startEditing(mockProject.knowledgeBase[0]);
    });

    act(() => {
      result.current.closeViewer();
    });

    expect(result.current.viewingFile).toBeNull();
    expect(result.current.isEditing).toBe(false);
    expect(result.current.editContent).toBe('');
  });

  it('should manage dialog states', () => {
    const { result } = renderHook(() => useKnowledgeBase({ projectId: 'project-1' }));

    act(() => {
      result.current.setShowAddDialog(true);
    });
    expect(result.current.showAddDialog).toBe(true);

    act(() => {
      result.current.setShowBatchDeleteDialog(true);
    });
    expect(result.current.showBatchDeleteDialog).toBe(true);

    act(() => {
      result.current.setUploadError('Test error');
    });
    expect(result.current.uploadError).toBe('Test error');
  });
});
