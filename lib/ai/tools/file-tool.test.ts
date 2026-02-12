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
  executeContentSearch,
  executeDirectoryDelete,
  executeFileMove,
  executeFileHash,
  fileTools,
  fileReadInputSchema,
  fileWriteInputSchema,
  fileListInputSchema,
  directoryCreateInputSchema,
  fileCopyInputSchema,
  fileRenameInputSchema,
  fileInfoInputSchema,
  fileSearchInputSchema,
  fileAppendInputSchema,
  contentSearchInputSchema,
  directoryDeleteInputSchema,
  fileMoveInputSchema,
  fileHashInputSchema,
  fileToolSystemPrompt,
  fileToolPromptSnippet,
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
  type ContentSearchInput,
  type DirectoryDeleteInput,
  type FileMoveInput,
  type FileHashInput,
} from './file-tool';

// Mock file operations
jest.mock('@/lib/file/file-operations', () => ({
  readTextFile: jest.fn(),
  writeTextFile: jest.fn(),
  writeBinaryFile: jest.fn(),
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
  deleteDirectory: jest.fn(),
  moveFile: jest.fn(),
  getFileHash: jest.fn(),
  searchFileContents: jest.fn(),
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
  deleteDirectory,
  moveFile,
  getFileHash,
  searchFileContents,
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
const mockDeleteDirectory = deleteDirectory as jest.Mock;
const mockMoveFile = moveFile as jest.Mock;
const mockGetFileHash = getFileHash as jest.Mock;
const mockSearchFileContents = searchFileContents as jest.Mock;

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

    const input: FileListInput = { path: '/path/to/dir', maxDepth: 3, recursive: false, maxItems: 100 };
    const result = await executeFileList(input);

    expect(result.success).toBe(true);
    const data = result.data as { files: unknown[]; directories: unknown[] };
    expect(data.files).toHaveLength(1);
    expect(data.directories).toHaveLength(1);
  });

  it('returns error outside Tauri', async () => {
    mockIsInTauri.mockReturnValue(false);

    const input: FileListInput = { path: '/path', maxDepth: 3, recursive: false, maxItems: 100 };
    const result = await executeFileList(input);

    expect(result.success).toBe(false);
  });

  it('handles list errors', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockListDirectory.mockResolvedValue({
      success: false,
      error: 'Directory not found',
    });

    const input: FileListInput = { path: '/nonexistent', maxDepth: 3, recursive: false, maxItems: 100 };
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

  describe('contentSearchInputSchema', () => {
    it('validates valid input with defaults', () => {
      const result = contentSearchInputSchema.safeParse({
        directory: '/path/to/search',
        pattern: 'TODO',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.regex).toBe(false);
        expect(result.data.caseSensitive).toBe(false);
        expect(result.data.recursive).toBe(true);
        expect(result.data.maxResults).toBe(100);
      }
    });

    it('requires directory and pattern', () => {
      expect(contentSearchInputSchema.safeParse({ directory: '/tmp' }).success).toBe(false);
      expect(contentSearchInputSchema.safeParse({ pattern: 'test' }).success).toBe(false);
    });
  });

  describe('directoryDeleteInputSchema', () => {
    it('validates valid input', () => {
      const result = directoryDeleteInputSchema.safeParse({
        path: '/path/to/dir',
        recursive: true,
      });
      expect(result.success).toBe(true);
    });

    it('defaults recursive to false', () => {
      const result = directoryDeleteInputSchema.safeParse({ path: '/path/to/dir' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.recursive).toBe(false);
      }
    });
  });

  describe('fileMoveInputSchema', () => {
    it('validates valid input', () => {
      const result = fileMoveInputSchema.safeParse({
        source: '/path/from',
        destination: '/path/to',
      });
      expect(result.success).toBe(true);
    });

    it('requires both source and destination', () => {
      expect(fileMoveInputSchema.safeParse({ source: '/from' }).success).toBe(false);
      expect(fileMoveInputSchema.safeParse({ destination: '/to' }).success).toBe(false);
    });
  });

  describe('fileHashInputSchema', () => {
    it('validates valid input with defaults', () => {
      const result = fileHashInputSchema.safeParse({ path: '/path/to/file' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.algorithm).toBe('sha256');
      }
    });

    it('accepts valid algorithms', () => {
      for (const algo of ['md5', 'sha1', 'sha256', 'sha512']) {
        const result = fileHashInputSchema.safeParse({ path: '/f', algorithm: algo });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid algorithm', () => {
      const result = fileHashInputSchema.safeParse({ path: '/f', algorithm: 'crc32' });
      expect(result.success).toBe(false);
    });
  });
});

describe('executeContentSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns error outside Tauri', async () => {
    mockIsInTauri.mockReturnValue(false);

    const input: ContentSearchInput = {
      directory: '/tmp',
      pattern: 'TODO',
      regex: false,
      caseSensitive: false,
      recursive: true,
      maxResults: 100,
    };
    const result = await executeContentSearch(input);
    expect(result.success).toBe(false);
  });

  it('searches file contents in Tauri', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockSearchFileContents.mockResolvedValue({
      success: true,
      matches: [
        { file: '/tmp/a.ts', line: 10, column: 5, content: '// TODO: fix', matchedText: 'TODO' },
      ],
      filesSearched: 3,
    });

    const input: ContentSearchInput = {
      directory: '/tmp',
      pattern: 'TODO',
      regex: false,
      caseSensitive: false,
      recursive: true,
      maxResults: 100,
    };
    const result = await executeContentSearch(input);

    expect(result.success).toBe(true);
    const data = result.data as { totalMatches: number; filesSearched: number };
    expect(data.totalMatches).toBe(1);
    expect(data.filesSearched).toBe(3);
  });
});

describe('executeDirectoryDelete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns error outside Tauri', async () => {
    mockIsInTauri.mockReturnValue(false);

    const input: DirectoryDeleteInput = { path: '/tmp/dir', recursive: false };
    const result = await executeDirectoryDelete(input);
    expect(result.success).toBe(false);
  });

  it('deletes directory in Tauri', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockDeleteDirectory.mockResolvedValue({ success: true });

    const input: DirectoryDeleteInput = { path: '/tmp/dir', recursive: true };
    const result = await executeDirectoryDelete(input);

    expect(result.success).toBe(true);
    expect(mockDeleteDirectory).toHaveBeenCalledWith('/tmp/dir', true);
  });

  it('handles delete errors', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockDeleteDirectory.mockResolvedValue({ success: false, error: 'Directory not empty' });

    const input: DirectoryDeleteInput = { path: '/tmp/dir', recursive: false };
    const result = await executeDirectoryDelete(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Directory not empty');
  });
});

describe('executeFileMove', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns error outside Tauri', async () => {
    mockIsInTauri.mockReturnValue(false);

    const input: FileMoveInput = { source: '/a', destination: '/b' };
    const result = await executeFileMove(input);
    expect(result.success).toBe(false);
  });

  it('moves file in Tauri', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockMoveFile.mockResolvedValue({ success: true });

    const input: FileMoveInput = { source: '/a/file.txt', destination: '/b/file.txt' };
    const result = await executeFileMove(input);

    expect(result.success).toBe(true);
    const data = result.data as { moved: boolean; source: string; destination: string };
    expect(data.moved).toBe(true);
    expect(data.source).toBe('/a/file.txt');
    expect(data.destination).toBe('/b/file.txt');
  });
});

describe('executeFileHash', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns error outside Tauri', async () => {
    mockIsInTauri.mockReturnValue(false);

    const input: FileHashInput = { path: '/file.txt', algorithm: 'sha256' };
    const result = await executeFileHash(input);
    expect(result.success).toBe(false);
  });

  it('computes hash in Tauri', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockGetFileHash.mockResolvedValue({
      success: true,
      hash: 'abc123def456',
      algorithm: 'sha256',
    });

    const input: FileHashInput = { path: '/file.txt', algorithm: 'sha256' };
    const result = await executeFileHash(input);

    expect(result.success).toBe(true);
    const data = result.data as { hash: string; algorithm: string };
    expect(data.hash).toBe('abc123def456');
    expect(data.algorithm).toBe('sha256');
  });

  it('handles hash errors', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockGetFileHash.mockResolvedValue({ success: false, error: 'File not found' });

    const input: FileHashInput = { path: '/nonexistent', algorithm: 'sha256' };
    const result = await executeFileHash(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('File not found');
  });
});

describe('fileTools new entries', () => {
  it('defines content_search tool', () => {
    expect(fileTools.content_search).toBeDefined();
    expect(fileTools.content_search.name).toBe('content_search');
    expect(fileTools.content_search.requiresApproval).toBe(false);
    expect(fileTools.content_search.category).toBe('file');
  });

  it('defines directory_delete tool', () => {
    expect(fileTools.directory_delete).toBeDefined();
    expect(fileTools.directory_delete.name).toBe('directory_delete');
    expect(fileTools.directory_delete.requiresApproval).toBe(true);
  });

  it('defines file_move tool', () => {
    expect(fileTools.file_move).toBeDefined();
    expect(fileTools.file_move.name).toBe('file_move');
    expect(fileTools.file_move.requiresApproval).toBe(true);
  });

  it('defines file_hash tool', () => {
    expect(fileTools.file_hash).toBeDefined();
    expect(fileTools.file_hash.name).toBe('file_hash');
    expect(fileTools.file_hash.requiresApproval).toBe(false);
  });
});

// ==================== Line Range Support ====================

describe('executeFileRead - line range', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads specific line range', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockReadTextFile.mockResolvedValue({
      success: true,
      content: 'line1\nline2\nline3\nline4\nline5',
      path: '/file.txt',
      size: 30,
      mimeType: 'text/plain',
    });

    const input: FileReadInput = { path: '/file.txt', startLine: 2, endLine: 4 };
    const result = await executeFileRead(input);

    expect(result.success).toBe(true);
    const data = result.data as { content: string; totalLines: number; startLine: number; endLine: number; linesReturned: number };
    expect(data.content).toBe('line2\nline3\nline4');
    expect(data.totalLines).toBe(5);
    expect(data.startLine).toBe(2);
    expect(data.endLine).toBe(4);
    expect(data.linesReturned).toBe(3);
  });

  it('reads from startLine to end when endLine omitted', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockReadTextFile.mockResolvedValue({
      success: true,
      content: 'a\nb\nc\nd',
      path: '/file.txt',
      size: 7,
      mimeType: 'text/plain',
    });

    const input: FileReadInput = { path: '/file.txt', startLine: 3 };
    const result = await executeFileRead(input);

    expect(result.success).toBe(true);
    const data = result.data as { content: string; totalLines: number };
    expect(data.content).toBe('c\nd');
    expect(data.totalLines).toBe(4);
  });

  it('reads from beginning to endLine when startLine omitted', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockReadTextFile.mockResolvedValue({
      success: true,
      content: 'x\ny\nz',
      path: '/file.txt',
      size: 5,
      mimeType: 'text/plain',
    });

    const input: FileReadInput = { path: '/file.txt', endLine: 2 };
    const result = await executeFileRead(input);

    expect(result.success).toBe(true);
    const data = result.data as { content: string; totalLines: number };
    expect(data.content).toBe('x\ny');
    expect(data.totalLines).toBe(3);
  });

  it('returns totalLines even without line range params', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockReadTextFile.mockResolvedValue({
      success: true,
      content: 'one\ntwo\nthree',
      path: '/file.txt',
      size: 13,
      mimeType: 'text/plain',
    });

    const input: FileReadInput = { path: '/file.txt' };
    const result = await executeFileRead(input);

    expect(result.success).toBe(true);
    const data = result.data as { content: string; totalLines: number; startLine?: number };
    expect(data.totalLines).toBe(3);
    expect(data.startLine).toBeUndefined();
  });

  it('clamps out-of-range line numbers', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockReadTextFile.mockResolvedValue({
      success: true,
      content: 'a\nb',
      path: '/file.txt',
      size: 3,
      mimeType: 'text/plain',
    });

    const input: FileReadInput = { path: '/file.txt', startLine: 1, endLine: 100 };
    const result = await executeFileRead(input);

    expect(result.success).toBe(true);
    const data = result.data as { content: string; linesReturned: number };
    expect(data.content).toBe('a\nb');
    expect(data.linesReturned).toBe(2);
  });
});

// ==================== Recursive List Support ====================

describe('executeFileList - recursive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes through to normal listing when recursive=false', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockListDirectory.mockResolvedValue({
      success: true,
      contents: {
        path: '/dir',
        files: [{ name: 'a.txt', size: 10, extension: 'txt' }],
        directories: [{ name: 'sub' }],
      },
    });

    const input: FileListInput = { path: '/dir', recursive: false, maxDepth: 3, maxItems: 500 };
    const result = await executeFileList(input);

    expect(result.success).toBe(true);
    const data = result.data as { totalFiles: number; totalDirectories: number };
    expect(data.totalFiles).toBe(1);
    expect(data.totalDirectories).toBe(1);
  });

  it('lists recursively', async () => {
    mockIsInTauri.mockReturnValue(true);
    // First call: root dir
    mockListDirectory
      .mockResolvedValueOnce({
        success: true,
        contents: {
          path: '/dir',
          files: [{ name: 'root.txt', size: 5, extension: 'txt' }],
          directories: [{ name: 'sub' }],
        },
      })
      // Second call: sub dir
      .mockResolvedValueOnce({
        success: true,
        contents: {
          path: '/dir/sub',
          files: [{ name: 'child.txt', size: 3, extension: 'txt' }],
          directories: [],
        },
      });

    const input: FileListInput = { path: '/dir', recursive: true, maxDepth: 3, maxItems: 500 };
    const result = await executeFileList(input);

    expect(result.success).toBe(true);
    const data = result.data as { totalFiles: number; totalDirectories: number; recursive: boolean; files: Array<{ path: string }> };
    expect(data.recursive).toBe(true);
    expect(data.totalFiles).toBe(2);
    expect(data.totalDirectories).toBe(1);
    expect(data.files[0].path).toContain('root.txt');
    expect(data.files[1].path).toContain('child.txt');
  });

  it('respects maxItems truncation', async () => {
    mockIsInTauri.mockReturnValue(true);
    mockListDirectory.mockResolvedValue({
      success: true,
      contents: {
        path: '/dir',
        files: Array.from({ length: 10 }, (_, i) => ({ name: `f${i}.txt`, size: 1, extension: 'txt' })),
        directories: [],
      },
    });

    const input: FileListInput = { path: '/dir', recursive: true, maxDepth: 3, maxItems: 5 };
    const result = await executeFileList(input);

    expect(result.success).toBe(true);
    const data = result.data as { totalFiles: number; truncated: boolean };
    expect(data.totalFiles).toBe(5);
    expect(data.truncated).toBe(true);
  });
});

// ==================== Schema Validation ====================

describe('fileReadInputSchema - new fields', () => {
  it('accepts startLine and endLine', () => {
    const result = fileReadInputSchema.safeParse({
      path: '/file.txt',
      startLine: 10,
      endLine: 20,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startLine).toBe(10);
      expect(result.data.endLine).toBe(20);
    }
  });

  it('rejects startLine < 1', () => {
    const result = fileReadInputSchema.safeParse({
      path: '/file.txt',
      startLine: 0,
    });

    expect(result.success).toBe(false);
  });
});

describe('fileListInputSchema - new fields', () => {
  it('accepts recursive, maxDepth, maxItems', () => {
    const result = fileListInputSchema.safeParse({
      path: '/dir',
      recursive: true,
      maxDepth: 5,
      maxItems: 100,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recursive).toBe(true);
      expect(result.data.maxDepth).toBe(5);
      expect(result.data.maxItems).toBe(100);
    }
  });

  it('uses defaults when not specified', () => {
    const result = fileListInputSchema.safeParse({
      path: '/dir',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recursive).toBe(false);
      expect(result.data.maxDepth).toBe(3);
      expect(result.data.maxItems).toBe(500);
    }
  });

  it('rejects maxDepth > 10', () => {
    const result = fileListInputSchema.safeParse({
      path: '/dir',
      maxDepth: 15,
    });

    expect(result.success).toBe(false);
  });
});

// ==================== System Prompts ====================

describe('File tool system prompts', () => {
  it('fileToolSystemPrompt contains tool names', () => {
    expect(typeof fileToolSystemPrompt).toBe('string');
    expect(fileToolSystemPrompt).toContain('file_read');
    expect(fileToolSystemPrompt).toContain('startLine');
    expect(fileToolSystemPrompt).toContain('recursive');
    expect(fileToolSystemPrompt).toContain('content_search');
  });

  it('fileToolPromptSnippet is concise', () => {
    expect(typeof fileToolPromptSnippet).toBe('string');
    expect(fileToolPromptSnippet.length).toBeLessThan(500);
    expect(fileToolPromptSnippet).toContain('file_read');
  });
});
