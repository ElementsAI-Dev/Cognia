/**
 * Tests for File Tool
 */

import {
  executeFileRead,
  executeFileWrite,
  executeFileList,
  executeFileExists,
  executeFileDelete,
  executeDirectoryCreate,
  executeFileCopy,
  executeFileRename,
  executeFileInfo,
  executeFileSearch,
  executeFileAppend,
  fileTools,
  fileReadInputSchema,
  fileWriteInputSchema,
  directoryCreateInputSchema,
  fileCopyInputSchema,
  fileRenameInputSchema,
  fileInfoInputSchema,
  fileSearchInputSchema,
  fileAppendInputSchema,
  type FileReadInput,
  type FileWriteInput,
  type FileListInput,
  type FileExistsInput,
  type FileDeleteInput,
  type DirectoryCreateInput,
  type FileCopyInput,
  type FileRenameInput,
  type FileInfoInput,
  type FileSearchInput,
  type FileAppendInput,
} from './file-tool';

// Mock file operations
jest.mock('@/lib/file/file-operations', () => ({
  readTextFile: jest.fn(),
  writeTextFile: jest.fn(),
  listDirectory: jest.fn(),
  exists: jest.fn(),
  deleteFile: jest.fn(),
  createDirectory: jest.fn(),
  copyFile: jest.fn(),
  renameFile: jest.fn(),
  getFileInfo: jest.fn(),
  searchFiles: jest.fn(),
  appendTextFile: jest.fn(),
  isInTauri: jest.fn(),
}));

import {
  readTextFile,
  writeTextFile,
  listDirectory,
  exists,
  deleteFile,
  createDirectory,
  copyFile,
  renameFile,
  getFileInfo,
  searchFiles,
  appendTextFile,
  isInTauri,
} from '@/lib/file/file-operations';

const mockIsInTauri = isInTauri as jest.Mock;
const mockReadTextFile = readTextFile as jest.Mock;
const mockWriteTextFile = writeTextFile as jest.Mock;
const mockListDirectory = listDirectory as jest.Mock;
const mockExists = exists as jest.Mock;
const mockDeleteFile = deleteFile as jest.Mock;
const mockCreateDirectory = createDirectory as jest.Mock;
const mockCopyFile = copyFile as jest.Mock;
const mockRenameFile = renameFile as jest.Mock;
const mockGetFileInfo = getFileInfo as jest.Mock;
const mockSearchFiles = searchFiles as jest.Mock;
const mockAppendTextFile = appendTextFile as jest.Mock;

describe('executeFileRead', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads file in Tauri environment', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockReadTextFile.mockResolvedValue({
      success: true,
      content: 'File content',
      path: '/path/to/file.txt',
      size: 12,
      mimeType: 'text/plain',
    });

    const input: FileReadInput = { path: '/path/to/file.txt' };
    const result = await executeFileRead(input);

    expect(result.success).toBe(true);
    expect((result.data as { content: string }).content).toBe('File content');
  });

  it('returns error outside Tauri', async () => {
    mockIsInTauri.mockReturnValue(false);

    const input: FileReadInput = { path: '/path/to/file.txt' };
    const result = await executeFileRead(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('File operations are only available in the desktop app');
  });

  it('handles read errors', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockReadTextFile.mockResolvedValue({
      success: false,
      error: 'File not found',
    });

    const input: FileReadInput = { path: '/nonexistent.txt' };
    const result = await executeFileRead(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('File not found');
  });
});

describe('executeFileWrite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes file in Tauri environment', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockWriteTextFile.mockResolvedValue({
      success: true,
      path: '/path/to/file.txt',
      bytesWritten: 12,
    });

    const input: FileWriteInput = {
      path: '/path/to/file.txt',
      content: 'File content',
      createDirectories: false,
    };
    const result = await executeFileWrite(input);

    expect(result.success).toBe(true);
    expect((result.data as { bytesWritten: number }).bytesWritten).toBe(12);
  });

  it('returns error outside Tauri', async () => {
    mockIsInTauri.mockReturnValue(false);

    const input: FileWriteInput = { path: '/path', content: 'test', createDirectories: false };
    const result = await executeFileWrite(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('File operations are only available in the desktop app');
  });

  it('passes createDirectories option', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockWriteTextFile.mockResolvedValue({ success: true, path: '/path', bytesWritten: 4 });

    const input: FileWriteInput = {
      path: '/deep/path/file.txt',
      content: 'test',
      createDirectories: true,
    };
    await executeFileWrite(input);

    expect(mockWriteTextFile).toHaveBeenCalledWith('/deep/path/file.txt', 'test', {
      createDirectories: true,
    });
  });

  it('handles write errors', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockWriteTextFile.mockResolvedValue({
      success: false,
      error: 'Permission denied',
    });

    const input: FileWriteInput = { path: '/readonly/file.txt', content: 'test', createDirectories: false };
    const result = await executeFileWrite(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Permission denied');
  });
});

describe('executeFileList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists directory contents in Tauri environment', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockListDirectory.mockResolvedValue({
      success: true,
      contents: {
        path: '/path/to/dir',
        files: [{ name: 'file.txt', size: 100, extension: 'txt' }],
        directories: [{ name: 'subdir' }],
      },
    });

    const input: FileListInput = { path: '/path/to/dir' };
    const result = await executeFileList(input);

    expect(result.success).toBe(true);
    const data = result.data as { files: unknown[]; directories: unknown[] };
    expect(data.files).toHaveLength(1);
    expect(data.directories).toHaveLength(1);
  });

  it('returns error outside Tauri', async () => {
    mockIsInTauri.mockReturnValue(false);

    const input: FileListInput = { path: '/path' };
    const result = await executeFileList(input);

    expect(result.success).toBe(false);
  });

  it('handles list errors', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockListDirectory.mockResolvedValue({
      success: false,
      error: 'Directory not found',
    });

    const input: FileListInput = { path: '/nonexistent' };
    const result = await executeFileList(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Directory not found');
  });
});

describe('executeFileExists', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('checks file exists in Tauri environment', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockExists.mockResolvedValue(true);

    const input: FileExistsInput = { path: '/path/to/file.txt' };
    const result = await executeFileExists(input);

    expect(result.success).toBe(true);
    expect((result.data as { exists: boolean }).exists).toBe(true);
  });

  it('returns false when file does not exist', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockExists.mockResolvedValue(false);

    const input: FileExistsInput = { path: '/nonexistent.txt' };
    const result = await executeFileExists(input);

    expect(result.success).toBe(true);
    expect((result.data as { exists: boolean }).exists).toBe(false);
  });

  it('returns error outside Tauri', async () => {
    mockIsInTauri.mockReturnValue(false);

    const input: FileExistsInput = { path: '/path' };
    const result = await executeFileExists(input);

    expect(result.success).toBe(false);
  });
});

describe('executeFileDelete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes file in Tauri environment', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockDeleteFile.mockResolvedValue({ success: true });

    const input: FileDeleteInput = { path: '/path/to/file.txt' };
    const result = await executeFileDelete(input);

    expect(result.success).toBe(true);
    expect((result.data as { deleted: boolean }).deleted).toBe(true);
  });

  it('returns error outside Tauri', async () => {
    mockIsInTauri.mockReturnValue(false);

    const input: FileDeleteInput = { path: '/path' };
    const result = await executeFileDelete(input);

    expect(result.success).toBe(false);
  });

  it('handles delete errors', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockDeleteFile.mockResolvedValue({
      success: false,
      error: 'File in use',
    });

    const input: FileDeleteInput = { path: '/locked/file.txt' };
    const result = await executeFileDelete(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('File in use');
  });
});

describe('executeDirectoryCreate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates directory in Tauri environment', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockCreateDirectory.mockResolvedValue({ success: true });

    const input: DirectoryCreateInput = { path: '/path/to/new/dir', recursive: true };
    const result = await executeDirectoryCreate(input);

    expect(result.success).toBe(true);
    expect((result.data as { created: boolean }).created).toBe(true);
  });

  it('passes recursive option', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockCreateDirectory.mockResolvedValue({ success: true });

    const input: DirectoryCreateInput = { path: '/path/to/dir', recursive: false };
    await executeDirectoryCreate(input);

    expect(mockCreateDirectory).toHaveBeenCalledWith('/path/to/dir', false);
  });

  it('returns error outside Tauri', async () => {
    mockIsInTauri.mockReturnValue(false);

    const input: DirectoryCreateInput = { path: '/path', recursive: true };
    const result = await executeDirectoryCreate(input);

    expect(result.success).toBe(false);
  });

  it('handles create errors', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockCreateDirectory.mockResolvedValue({
      success: false,
      error: 'Permission denied',
    });

    const input: DirectoryCreateInput = { path: '/protected/dir', recursive: true };
    const result = await executeDirectoryCreate(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Permission denied');
  });
});

describe('Schema validation', () => {
  describe('fileReadInputSchema', () => {
    it('validates valid input', () => {
      const result = fileReadInputSchema.safeParse({
        path: '/path/to/file.txt',
      });

      expect(result.success).toBe(true);
    });

    it('requires path', () => {
      const result = fileReadInputSchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });

  describe('fileWriteInputSchema', () => {
    it('validates valid input', () => {
      const result = fileWriteInputSchema.safeParse({
        path: '/path/to/file.txt',
        content: 'File content',
      });

      expect(result.success).toBe(true);
    });

    it('uses default createDirectories', () => {
      const result = fileWriteInputSchema.safeParse({
        path: '/path',
        content: 'test',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.createDirectories).toBe(false);
      }
    });
  });

  describe('directoryCreateInputSchema', () => {
    it('validates valid input', () => {
      const result = directoryCreateInputSchema.safeParse({
        path: '/path/to/dir',
        recursive: true,
      });

      expect(result.success).toBe(true);
    });

    it('uses default recursive', () => {
      const result = directoryCreateInputSchema.safeParse({
        path: '/path',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.recursive).toBe(true);
      }
    });
  });
});

describe('fileTools', () => {
  it('exports file_read tool', () => {
    expect(fileTools.file_read).toBeDefined();
    expect(fileTools.file_read.name).toBe('file_read');
    expect(fileTools.file_read.requiresApproval).toBe(false);
    expect(fileTools.file_read.category).toBe('file');
  });

  it('exports file_write tool with approval required', () => {
    expect(fileTools.file_write).toBeDefined();
    expect(fileTools.file_write.name).toBe('file_write');
    expect(fileTools.file_write.requiresApproval).toBe(true);
    expect(fileTools.file_write.category).toBe('file');
  });

  it('exports file_list tool', () => {
    expect(fileTools.file_list).toBeDefined();
    expect(fileTools.file_list.name).toBe('file_list');
    expect(fileTools.file_list.requiresApproval).toBe(false);
  });

  it('exports file_exists tool', () => {
    expect(fileTools.file_exists).toBeDefined();
    expect(fileTools.file_exists.name).toBe('file_exists');
    expect(fileTools.file_exists.requiresApproval).toBe(false);
  });

  it('exports file_delete tool with approval required', () => {
    expect(fileTools.file_delete).toBeDefined();
    expect(fileTools.file_delete.name).toBe('file_delete');
    expect(fileTools.file_delete.requiresApproval).toBe(true);
  });

  it('exports directory_create tool with approval required', () => {
    expect(fileTools.directory_create).toBeDefined();
    expect(fileTools.directory_create.name).toBe('directory_create');
    expect(fileTools.directory_create.requiresApproval).toBe(true);
  });

  it('exports file_copy tool with approval required', () => {
    expect(fileTools.file_copy).toBeDefined();
    expect(fileTools.file_copy.name).toBe('file_copy');
    expect(fileTools.file_copy.requiresApproval).toBe(true);
    expect(fileTools.file_copy.category).toBe('file');
  });

  it('exports file_rename tool with approval required', () => {
    expect(fileTools.file_rename).toBeDefined();
    expect(fileTools.file_rename.name).toBe('file_rename');
    expect(fileTools.file_rename.requiresApproval).toBe(true);
    expect(fileTools.file_rename.category).toBe('file');
  });

  it('exports file_info tool', () => {
    expect(fileTools.file_info).toBeDefined();
    expect(fileTools.file_info.name).toBe('file_info');
    expect(fileTools.file_info.requiresApproval).toBe(false);
    expect(fileTools.file_info.category).toBe('file');
  });

  it('exports file_search tool', () => {
    expect(fileTools.file_search).toBeDefined();
    expect(fileTools.file_search.name).toBe('file_search');
    expect(fileTools.file_search.requiresApproval).toBe(false);
    expect(fileTools.file_search.category).toBe('file');
  });

  it('exports file_append tool with approval required', () => {
    expect(fileTools.file_append).toBeDefined();
    expect(fileTools.file_append.name).toBe('file_append');
    expect(fileTools.file_append.requiresApproval).toBe(true);
    expect(fileTools.file_append.category).toBe('file');
  });
});

describe('executeFileCopy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('copies file in Tauri environment', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockCopyFile.mockResolvedValue({ success: true });

    const input: FileCopyInput = {
      source: '/path/source.txt',
      destination: '/path/dest.txt',
    };
    const result = await executeFileCopy(input);

    expect(result.success).toBe(true);
    expect((result.data as { copied: boolean }).copied).toBe(true);
  });

  it('returns error outside Tauri', async () => {
    mockIsInTauri.mockReturnValue(false);

    const input: FileCopyInput = { source: '/src', destination: '/dst' };
    const result = await executeFileCopy(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('File operations are only available in the desktop app');
  });
});

describe('executeFileRename', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renames file in Tauri environment', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockRenameFile.mockResolvedValue({ success: true });

    const input: FileRenameInput = {
      oldPath: '/path/old.txt',
      newPath: '/path/new.txt',
    };
    const result = await executeFileRename(input);

    expect(result.success).toBe(true);
    expect((result.data as { renamed: boolean }).renamed).toBe(true);
  });

  it('returns error outside Tauri', async () => {
    mockIsInTauri.mockReturnValue(false);

    const input: FileRenameInput = { oldPath: '/old', newPath: '/new' };
    const result = await executeFileRename(input);

    expect(result.success).toBe(false);
  });
});

describe('executeFileInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gets file info in Tauri environment', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockGetFileInfo.mockResolvedValue({
      success: true,
      info: {
        name: 'file.txt',
        path: '/path/file.txt',
        isDirectory: false,
        size: 1024,
        mimeType: 'text/plain',
        extension: 'txt',
        modifiedAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      },
    });

    const input: FileInfoInput = { path: '/path/file.txt' };
    const result = await executeFileInfo(input);

    expect(result.success).toBe(true);
    expect((result.data as { name: string }).name).toBe('file.txt');
  });

  it('returns error outside Tauri', async () => {
    mockIsInTauri.mockReturnValue(false);

    const input: FileInfoInput = { path: '/path' };
    const result = await executeFileInfo(input);

    expect(result.success).toBe(false);
  });
});

describe('executeFileSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('searches files in Tauri environment', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockSearchFiles.mockResolvedValue({
      success: true,
      files: [
        { name: 'file1.txt', path: '/path/file1.txt', size: 100, extension: 'txt' },
        { name: 'file2.txt', path: '/path/file2.txt', size: 200, extension: 'txt' },
      ],
    });

    const input: FileSearchInput = {
      directory: '/path',
      pattern: 'file',
      extensions: ['txt'],
      recursive: false,
      maxResults: 50,
    };
    const result = await executeFileSearch(input);

    expect(result.success).toBe(true);
    expect((result.data as { totalFound: number }).totalFound).toBe(2);
  });

  it('returns error outside Tauri', async () => {
    mockIsInTauri.mockReturnValue(false);

    const input: FileSearchInput = { directory: '/path', recursive: false, maxResults: 50 };
    const result = await executeFileSearch(input);

    expect(result.success).toBe(false);
  });
});

describe('executeFileAppend', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('appends to file in Tauri environment', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockAppendTextFile.mockResolvedValue({
      success: true,
      path: '/path/file.txt',
      bytesWritten: 12,
    });

    const input: FileAppendInput = {
      path: '/path/file.txt',
      content: 'Hello World!',
    };
    const result = await executeFileAppend(input);

    expect(result.success).toBe(true);
    expect((result.data as { appended: boolean }).appended).toBe(true);
  });

  it('returns error outside Tauri', async () => {
    mockIsInTauri.mockReturnValue(false);

    const input: FileAppendInput = { path: '/path', content: 'test' };
    const result = await executeFileAppend(input);

    expect(result.success).toBe(false);
  });
});

describe('New schema validation', () => {
  describe('fileCopyInputSchema', () => {
    it('validates valid input', () => {
      const result = fileCopyInputSchema.safeParse({
        source: '/path/source.txt',
        destination: '/path/dest.txt',
      });
      expect(result.success).toBe(true);
    });

    it('requires source and destination', () => {
      const result = fileCopyInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('fileRenameInputSchema', () => {
    it('validates valid input', () => {
      const result = fileRenameInputSchema.safeParse({
        oldPath: '/old.txt',
        newPath: '/new.txt',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('fileInfoInputSchema', () => {
    it('validates valid input', () => {
      const result = fileInfoInputSchema.safeParse({
        path: '/path/to/file.txt',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('fileSearchInputSchema', () => {
    it('validates valid input with defaults', () => {
      const result = fileSearchInputSchema.safeParse({
        directory: '/path/to/search',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.recursive).toBe(false);
        expect(result.data.maxResults).toBe(50);
      }
    });
  });

  describe('fileAppendInputSchema', () => {
    it('validates valid input', () => {
      const result = fileAppendInputSchema.safeParse({
        path: '/path/file.txt',
        content: 'content to append',
      });
      expect(result.success).toBe(true);
    });
  });
});
