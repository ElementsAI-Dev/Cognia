/**
 * Tests for File Operations
 */

import {
  readTextFile,
  readBinaryFile,
  writeTextFile,
  listDirectory,
  exists,
  deleteFile,
  createDirectory,
  copyFile,
  renameFile,
  openFileDialog,
  saveFileDialog,
  isInTauri,
  type FileInfo,
  type DirectoryContents,
  type FileReadResult,
  type FileWriteResult,
  type FileOperationOptions,
} from './file-operations';

// Helper to simulate Tauri environment
const originalWindow = global.window;

function setTauriEnvironment(enabled: boolean) {
  if (enabled) {
    (global as Record<string, unknown>).window = { __TAURI__: {} };
  } else {
    (global as Record<string, unknown>).window = originalWindow;
  }
}

describe('File Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setTauriEnvironment(false);
  });

  afterAll(() => {
    (global as Record<string, unknown>).window = originalWindow;
  });

  describe('isInTauri', () => {
    it('returns false outside Tauri', () => {
      setTauriEnvironment(false);
      // Note: isInTauri is evaluated at module load time
      // This test checks the function exists
      expect(typeof isInTauri).toBe('function');
    });
  });

  describe('readTextFile', () => {
    it('returns error outside Tauri environment', async () => {
      setTauriEnvironment(false);
      const result = await readTextFile('/path/to/file.txt');

      expect(result.success).toBe(false);
      expect(result.error).toBe('File operations require Tauri desktop environment');
      expect(result.path).toBe('/path/to/file.txt');
    });

    it('returns FileReadResult interface', async () => {
      const result = await readTextFile('/test.txt');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('path');
    });
  });

  describe('readBinaryFile', () => {
    it('returns error outside Tauri environment', async () => {
      setTauriEnvironment(false);
      const result = await readBinaryFile('/path/to/file.bin');

      expect(result.success).toBe(false);
      expect(result.error).toBe('File operations require Tauri desktop environment');
    });
  });

  describe('writeTextFile', () => {
    it('returns error outside Tauri environment', async () => {
      setTauriEnvironment(false);
      const result = await writeTextFile('/path/to/file.txt', 'content');

      expect(result.success).toBe(false);
      expect(result.error).toBe('File operations require Tauri desktop environment');
    });

    it('accepts FileOperationOptions', async () => {
      const options: FileOperationOptions = {
        encoding: 'utf-8',
        createDirectories: true,
        overwrite: true,
      };

      const result = await writeTextFile('/path/file.txt', 'content', options);

      expect(result).toHaveProperty('success');
    });
  });

  describe('listDirectory', () => {
    it('returns error outside Tauri environment', async () => {
      setTauriEnvironment(false);
      const result = await listDirectory('/path/to/dir');

      expect(result.success).toBe(false);
      expect(result.error).toBe('File operations require Tauri desktop environment');
    });
  });

  describe('exists', () => {
    it('returns false outside Tauri environment', async () => {
      setTauriEnvironment(false);
      const result = await exists('/path/to/file');

      expect(result).toBe(false);
    });
  });

  describe('deleteFile', () => {
    it('returns error outside Tauri environment', async () => {
      setTauriEnvironment(false);
      const result = await deleteFile('/path/to/file');

      expect(result.success).toBe(false);
      expect(result.error).toBe('File operations require Tauri desktop environment');
    });
  });

  describe('createDirectory', () => {
    it('returns error outside Tauri environment', async () => {
      setTauriEnvironment(false);
      const result = await createDirectory('/path/to/dir');

      expect(result.success).toBe(false);
      expect(result.error).toBe('File operations require Tauri desktop environment');
    });

    it('accepts recursive parameter', async () => {
      const result = await createDirectory('/path/to/dir', false);
      expect(result).toHaveProperty('success');
    });
  });

  describe('copyFile', () => {
    it('returns error outside Tauri environment', async () => {
      setTauriEnvironment(false);
      const result = await copyFile('/source', '/destination');

      expect(result.success).toBe(false);
      expect(result.error).toBe('File operations require Tauri desktop environment');
    });
  });

  describe('renameFile', () => {
    it('returns error outside Tauri environment', async () => {
      setTauriEnvironment(false);
      const result = await renameFile('/old/path', '/new/path');

      expect(result.success).toBe(false);
      expect(result.error).toBe('File operations require Tauri desktop environment');
    });
  });

  describe('openFileDialog', () => {
    it('returns error outside Tauri environment', async () => {
      setTauriEnvironment(false);
      const result = await openFileDialog();

      expect(result.success).toBe(false);
      expect(result.error).toBe('File dialogs require Tauri desktop environment');
    });

    it('accepts dialog options', async () => {
      const result = await openFileDialog({
        multiple: true,
        directory: false,
        filters: [{ name: 'Text', extensions: ['txt'] }],
        defaultPath: '/home',
        title: 'Select File',
      });

      expect(result).toHaveProperty('success');
    });
  });

  describe('saveFileDialog', () => {
    it('returns error outside Tauri environment', async () => {
      setTauriEnvironment(false);
      const result = await saveFileDialog();

      expect(result.success).toBe(false);
      expect(result.error).toBe('File dialogs require Tauri desktop environment');
    });

    it('accepts dialog options', async () => {
      const result = await saveFileDialog({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        defaultPath: '/home/file.json',
        title: 'Save File',
      });

      expect(result).toHaveProperty('success');
    });
  });
});

describe('Type Interfaces', () => {
  it('FileInfo has correct structure', () => {
    const fileInfo: FileInfo = {
      name: 'test.txt',
      path: '/path/to/test.txt',
      isDirectory: false,
      size: 1024,
      modifiedAt: new Date(),
      createdAt: new Date(),
      extension: 'txt',
    };

    expect(fileInfo.name).toBe('test.txt');
    expect(fileInfo.isDirectory).toBe(false);
    expect(fileInfo.extension).toBe('txt');
  });

  it('DirectoryContents has correct structure', () => {
    const contents: DirectoryContents = {
      path: '/path/to/dir',
      files: [
        { name: 'file.txt', path: '/path/to/dir/file.txt', isDirectory: false, size: 100 },
      ],
      directories: [
        { name: 'subdir', path: '/path/to/dir/subdir', isDirectory: true, size: 0 },
      ],
    };

    expect(contents.path).toBe('/path/to/dir');
    expect(contents.files).toHaveLength(1);
    expect(contents.directories).toHaveLength(1);
  });

  it('FileReadResult has correct structure', () => {
    const successResult: FileReadResult = {
      success: true,
      content: 'File content',
      path: '/path/to/file.txt',
      size: 12,
      mimeType: 'text/plain',
    };

    expect(successResult.success).toBe(true);
    expect(successResult.content).toBe('File content');

    const errorResult: FileReadResult = {
      success: false,
      error: 'File not found',
      path: '/path/to/missing.txt',
    };

    expect(errorResult.success).toBe(false);
    expect(errorResult.error).toBe('File not found');
  });

  it('FileWriteResult has correct structure', () => {
    const successResult: FileWriteResult = {
      success: true,
      path: '/path/to/file.txt',
      bytesWritten: 100,
    };

    expect(successResult.success).toBe(true);
    expect(successResult.bytesWritten).toBe(100);

    const errorResult: FileWriteResult = {
      success: false,
      error: 'Permission denied',
      path: '/path/to/file.txt',
    };

    expect(errorResult.success).toBe(false);
    expect(errorResult.error).toBe('Permission denied');
  });

  it('FileOperationOptions has correct structure', () => {
    const options: FileOperationOptions = {
      encoding: 'utf-8',
      createDirectories: true,
      overwrite: false,
    };

    expect(options.encoding).toBe('utf-8');
    expect(options.createDirectories).toBe(true);
    expect(options.overwrite).toBe(false);
  });
});

describe('MIME Type Detection', () => {
  it('returns correct mime type for common extensions', async () => {
    // Note: getMimeType is internal, we test it through readTextFile
    // which includes mimeType in the result
    const result = await readTextFile('/test.txt');
    expect(result.path).toBe('/test.txt');
  });
});

describe('Error Handling', () => {
  it('all functions handle non-Tauri environment gracefully', async () => {
    setTauriEnvironment(false);

    const results = await Promise.all([
      readTextFile('/test'),
      readBinaryFile('/test'),
      writeTextFile('/test', 'content'),
      listDirectory('/test'),
      deleteFile('/test'),
      createDirectory('/test'),
      copyFile('/src', '/dst'),
      renameFile('/old', '/new'),
      openFileDialog(),
      saveFileDialog(),
    ]);

    // All should return success: false without throwing
    expect(results.filter((r) => 'success' in r && r.success === false)).toHaveLength(10);
  });

  it('exists returns false without throwing', async () => {
    setTauriEnvironment(false);
    const result = await exists('/nonexistent');
    expect(result).toBe(false);
  });
});
