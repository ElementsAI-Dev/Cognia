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
  fileTools,
  fileReadInputSchema,
  fileWriteInputSchema,
  directoryCreateInputSchema,
  type FileReadInput,
  type FileWriteInput,
  type FileListInput,
  type FileExistsInput,
  type FileDeleteInput,
  type DirectoryCreateInput,
} from './file-tool';

// Mock file operations
jest.mock('@/lib/file/file-operations', () => ({
  readTextFile: jest.fn(),
  writeTextFile: jest.fn(),
  listDirectory: jest.fn(),
  exists: jest.fn(),
  deleteFile: jest.fn(),
  createDirectory: jest.fn(),
  isInTauri: jest.fn(),
}));

import {
  readTextFile,
  writeTextFile,
  listDirectory,
  exists,
  deleteFile,
  createDirectory,
  isInTauri,
} from '@/lib/file/file-operations';

const mockIsInTauri = isInTauri as jest.Mock;
const mockReadTextFile = readTextFile as jest.Mock;
const mockWriteTextFile = writeTextFile as jest.Mock;
const mockListDirectory = listDirectory as jest.Mock;
const mockExists = exists as jest.Mock;
const mockDeleteFile = deleteFile as jest.Mock;
const mockCreateDirectory = createDirectory as jest.Mock;

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
});
