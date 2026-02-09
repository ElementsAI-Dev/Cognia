/**
 * Tests for Web File Operations (OPFS-based browser fallbacks)
 */

import { FileErrorCode } from './file-operations';
import {
  isOPFSAvailable,
  isFSAAAvailable,
  webReadTextFile,
  webWriteTextFile,
  webListDirectory,
  webExists,
  webDeleteFile,
  webCreateDirectory,
  webAppendTextFile,
  webPickAndReadFile,
  webPickAndSaveFile,
} from './web-file-operations';

// ==================== Mock Setup ====================

// Mock writable stream
const mockWritableClose = jest.fn().mockResolvedValue(undefined);
const mockWritableWrite = jest.fn().mockResolvedValue(undefined);
const mockCreateWritable = jest.fn().mockResolvedValue({
  write: mockWritableWrite,
  close: mockWritableClose,
});

// Mock file
const mockFileText = jest.fn().mockResolvedValue('file content');
const mockFile = {
  text: mockFileText,
  size: 12,
  lastModified: Date.now(),
  type: 'text/plain',
  name: 'test.txt',
};

// Mock file handle
const mockGetFile = jest.fn().mockResolvedValue(mockFile);
const mockFileHandle = {
  kind: 'file' as const,
  name: 'test.txt',
  getFile: mockGetFile,
  createWritable: mockCreateWritable,
};

// Mock directory handle
const mockGetFileHandle = jest.fn().mockResolvedValue(mockFileHandle);
const mockGetDirectoryHandle = jest.fn();
const mockRemoveEntry = jest.fn().mockResolvedValue(undefined);

// Entries iterator for directory listing
let mockEntries: [string, { kind: string; getFile?: () => Promise<typeof mockFile> }][] = [];

const mockDirHandle: Record<string, unknown> = {
  kind: 'directory',
  getFileHandle: mockGetFileHandle,
  getDirectoryHandle: mockGetDirectoryHandle,
  removeEntry: mockRemoveEntry,
  [Symbol.asyncIterator]: () => {
    let index = 0;
    return {
      next: () => {
        if (index < mockEntries.length) {
          return Promise.resolve({ value: mockEntries[index++], done: false });
        }
        return Promise.resolve({ value: undefined, done: true });
      },
    };
  },
};

// Mock root directory
const mockRootGetDirectoryHandle = jest.fn().mockResolvedValue(mockDirHandle);
const mockRootGetFileHandle = jest.fn().mockResolvedValue(mockFileHandle);
const mockRootRemoveEntry = jest.fn().mockResolvedValue(undefined);

const mockRoot: Record<string, unknown> = {
  kind: 'directory',
  getFileHandle: mockRootGetFileHandle,
  getDirectoryHandle: mockRootGetDirectoryHandle,
  removeEntry: mockRootRemoveEntry,
  [Symbol.asyncIterator]: () => {
    let index = 0;
    return {
      next: () => {
        if (index < mockEntries.length) {
          return Promise.resolve({ value: mockEntries[index++], done: false });
        }
        return Promise.resolve({ value: undefined, done: true });
      },
    };
  },
};

// Store original navigator
const originalNavigator = global.navigator;
const _originalWindow = global.window;

function setupOPFS() {
  Object.defineProperty(global, 'navigator', {
    value: {
      ...originalNavigator,
      storage: {
        getDirectory: jest.fn().mockResolvedValue(mockRoot),
      },
    },
    writable: true,
    configurable: true,
  });
}

function teardownOPFS() {
  Object.defineProperty(global, 'navigator', {
    value: originalNavigator,
    writable: true,
    configurable: true,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockEntries = [];
  mockFileText.mockResolvedValue('file content');
  mockGetFile.mockResolvedValue(mockFile);
  mockGetFileHandle.mockResolvedValue(mockFileHandle);
  mockGetDirectoryHandle.mockResolvedValue(mockDirHandle);
  mockRootGetDirectoryHandle.mockResolvedValue(mockDirHandle);
  mockRootGetFileHandle.mockResolvedValue(mockFileHandle);
  mockCreateWritable.mockResolvedValue({
    write: mockWritableWrite,
    close: mockWritableClose,
  });
});

afterEach(() => {
  teardownOPFS();
});

// ==================== isOPFSAvailable ====================

describe('isOPFSAvailable', () => {
  it('returns false when navigator is undefined', () => {
    teardownOPFS();
    // In Node.js test env, navigator.storage.getDirectory may not exist
    expect(isOPFSAvailable()).toBe(false);
  });

  it('returns true when OPFS API is present', () => {
    setupOPFS();
    expect(isOPFSAvailable()).toBe(true);
  });
});

// ==================== isFSAAAvailable ====================

describe('isFSAAAvailable', () => {
  it('returns false when showOpenFilePicker is not present', () => {
    expect(isFSAAAvailable()).toBe(false);
  });

  it('returns true when showOpenFilePicker is present', () => {
    (global.window as unknown as Record<string, unknown>).showOpenFilePicker = jest.fn();
    expect(isFSAAAvailable()).toBe(true);
    delete (global.window as unknown as Record<string, unknown>).showOpenFilePicker;
  });
});

// ==================== webReadTextFile ====================

describe('webReadTextFile', () => {
  it('returns error when OPFS is unavailable', async () => {
    teardownOPFS();
    const result = await webReadTextFile('test.txt');
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(FileErrorCode.UNKNOWN);
    expect(result.error).toContain('OPFS');
  });

  it('reads a file successfully', async () => {
    setupOPFS();
    const result = await webReadTextFile('test.txt');
    expect(result.success).toBe(true);
    expect(result.content).toBe('file content');
    expect(result.size).toBe(12);
    expect(result.path).toBe('test.txt');
  });

  it('reads a file in a subdirectory', async () => {
    setupOPFS();
    const result = await webReadTextFile('subdir/test.txt');
    expect(result.success).toBe(true);
    expect(mockRootGetDirectoryHandle).toHaveBeenCalledWith('subdir', { create: false });
  });

  it('returns NOT_FOUND for missing files', async () => {
    setupOPFS();
    // For single-segment paths, navigateToPath returns root as parent
    mockRootGetFileHandle.mockRejectedValue(new DOMException('Not found', 'NotFoundError'));
    const result = await webReadTextFile('missing.txt');
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(FileErrorCode.NOT_FOUND);
    expect(result.error).toContain('not found');
  });

  it('handles generic errors', async () => {
    setupOPFS();
    mockRootGetFileHandle.mockRejectedValue(new Error('Disk error'));
    const result = await webReadTextFile('test.txt');
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(FileErrorCode.UNKNOWN);
    expect(result.error).toBe('Disk error');
  });
});

// ==================== webWriteTextFile ====================

describe('webWriteTextFile', () => {
  it('returns error when OPFS is unavailable', async () => {
    teardownOPFS();
    const result = await webWriteTextFile('test.txt', 'hello');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not available');
  });

  it('writes a file successfully', async () => {
    setupOPFS();
    const result = await webWriteTextFile('test.txt', 'hello world');
    expect(result.success).toBe(true);
    expect(result.bytesWritten).toBe(new Blob(['hello world']).size);
    expect(mockWritableWrite).toHaveBeenCalledWith('hello world');
    expect(mockWritableClose).toHaveBeenCalled();
  });

  it('creates directories by default', async () => {
    setupOPFS();
    await webWriteTextFile('dir/file.txt', 'content');
    expect(mockRootGetDirectoryHandle).toHaveBeenCalledWith('dir', { create: true });
  });

  it('handles write errors', async () => {
    setupOPFS();
    mockCreateWritable.mockRejectedValue(new Error('Write failed'));
    const result = await webWriteTextFile('test.txt', 'content');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Write failed');
  });
});

// ==================== webListDirectory ====================

describe('webListDirectory', () => {
  it('returns error when OPFS is unavailable', async () => {
    teardownOPFS();
    const result = await webListDirectory('/');
    expect(result.success).toBe(false);
  });

  it('lists root directory contents', async () => {
    setupOPFS();
    mockEntries = [
      ['file1.txt', { kind: 'file', getFile: () => Promise.resolve({ ...mockFile, name: 'file1.txt', size: 100 }) }],
      ['subdir', { kind: 'directory' }],
    ];

    // Override root to use entries iterator
    (global.navigator as unknown as { storage: { getDirectory: jest.Mock } }).storage.getDirectory = jest.fn().mockResolvedValue({
      ...mockRoot,
      getDirectoryHandle: mockRootGetDirectoryHandle,
      [Symbol.asyncIterator]: () => {
        let index = 0;
        return {
          next: () => {
            if (index < mockEntries.length) {
              return Promise.resolve({ value: mockEntries[index++], done: false });
            }
            return Promise.resolve({ value: undefined, done: true });
          },
        };
      },
    });

    const result = await webListDirectory('.');
    expect(result.success).toBe(true);
    expect(result.contents).toBeDefined();
    expect(result.contents!.files).toHaveLength(1);
    expect(result.contents!.directories).toHaveLength(1);
    expect(result.contents!.files[0].name).toBe('file1.txt');
    expect(result.contents!.directories[0].name).toBe('subdir');
  });

  it('handles NotFoundError for missing directory', async () => {
    setupOPFS();
    mockRootGetDirectoryHandle.mockRejectedValue(new DOMException('Not found', 'NotFoundError'));
    const result = await webListDirectory('nonexistent');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
});

// ==================== webExists ====================

describe('webExists', () => {
  it('returns false when OPFS is unavailable', async () => {
    teardownOPFS();
    expect(await webExists('test.txt')).toBe(false);
  });

  it('returns true for existing file', async () => {
    setupOPFS();
    expect(await webExists('test.txt')).toBe(true);
  });

  it('returns true for existing directory', async () => {
    setupOPFS();
    mockRootGetFileHandle.mockRejectedValue(new DOMException('Not found', 'NotFoundError'));
    mockRootGetDirectoryHandle.mockResolvedValue(mockDirHandle);
    expect(await webExists('subdir')).toBe(true);
  });

  it('returns false for non-existing path', async () => {
    setupOPFS();
    mockRootGetFileHandle.mockRejectedValue(new DOMException('Not found', 'NotFoundError'));
    mockRootGetDirectoryHandle.mockRejectedValue(new DOMException('Not found', 'NotFoundError'));
    expect(await webExists('missing')).toBe(false);
  });

  it('returns false when navigation fails', async () => {
    setupOPFS();
    // navigateToPath for deep/nested will call root.getDirectoryHandle('deep')
    mockRootGetDirectoryHandle.mockRejectedValue(new Error('fail'));
    expect(await webExists('deep/nested/file.txt')).toBe(false);
  });
});

// ==================== webDeleteFile ====================

describe('webDeleteFile', () => {
  it('returns error when OPFS is unavailable', async () => {
    teardownOPFS();
    const result = await webDeleteFile('test.txt');
    expect(result.success).toBe(false);
  });

  it('deletes a file successfully', async () => {
    setupOPFS();
    const result = await webDeleteFile('test.txt');
    expect(result.success).toBe(true);
    expect(mockRootRemoveEntry).toHaveBeenCalledWith('test.txt');
  });

  it('handles delete errors', async () => {
    setupOPFS();
    mockRootRemoveEntry.mockRejectedValue(new Error('Permission denied'));
    const result = await webDeleteFile('test.txt');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Permission denied');
  });
});

// ==================== webCreateDirectory ====================

describe('webCreateDirectory', () => {
  it('returns error when OPFS is unavailable', async () => {
    teardownOPFS();
    const result = await webCreateDirectory('newdir');
    expect(result.success).toBe(false);
  });

  it('creates directory recursively', async () => {
    setupOPFS();
    mockRootGetDirectoryHandle.mockResolvedValue(mockDirHandle);
    const result = await webCreateDirectory('a/b/c', true);
    expect(result.success).toBe(true);
    // Should create each part with create: true
    expect(mockRootGetDirectoryHandle).toHaveBeenCalledWith('a', { create: true });
  });

  it('creates directory non-recursively', async () => {
    setupOPFS();
    const result = await webCreateDirectory('newdir', false);
    expect(result.success).toBe(true);
  });

  it('handles creation errors', async () => {
    setupOPFS();
    mockRootGetDirectoryHandle.mockRejectedValue(new Error('Cannot create'));
    const result = await webCreateDirectory('fail/dir', true);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Cannot create');
  });
});

// ==================== webAppendTextFile ====================

describe('webAppendTextFile', () => {
  it('returns error when OPFS is unavailable', async () => {
    teardownOPFS();
    const result = await webAppendTextFile('test.txt', ' appended');
    expect(result.success).toBe(false);
  });

  it('appends to existing file', async () => {
    setupOPFS();
    // webReadTextFile will read 'file content', then webWriteTextFile writes combined
    const result = await webAppendTextFile('test.txt', ' appended');
    expect(result.success).toBe(true);
    // The write should have the combined content
    expect(mockWritableWrite).toHaveBeenCalledWith('file content appended');
  });

  it('creates file if it does not exist', async () => {
    setupOPFS();
    // First read fails (file not found), then write creates it
    mockRootGetFileHandle
      .mockRejectedValueOnce(new DOMException('Not found', 'NotFoundError'))
      // Second call from webWriteTextFile
      .mockResolvedValue(mockFileHandle);
    mockGetFileHandle
      .mockRejectedValueOnce(new DOMException('Not found', 'NotFoundError'))
      .mockResolvedValue(mockFileHandle);

    const result = await webAppendTextFile('new.txt', 'first content');
    expect(result.success).toBe(true);
    expect(mockWritableWrite).toHaveBeenCalledWith('first content');
  });
});

// ==================== webPickAndReadFile ====================

describe('webPickAndReadFile', () => {
  it('returns error when FSAA is unavailable', async () => {
    const result = await webPickAndReadFile();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Chrome or Edge');
  });

  it('reads picked file successfully', async () => {
    const mockHandle = {
      getFile: jest.fn().mockResolvedValue({
        text: () => Promise.resolve('picked content'),
        name: 'doc.txt',
        size: 14,
        type: 'text/plain',
      }),
    };
    (global.window as unknown as Record<string, unknown>).showOpenFilePicker = jest.fn().mockResolvedValue([mockHandle]);

    const result = await webPickAndReadFile();
    expect(result.success).toBe(true);
    expect(result.content).toBe('picked content');
    expect(result.path).toBe('doc.txt');
    expect(result.size).toBe(14);

    delete (global.window as unknown as Record<string, unknown>).showOpenFilePicker;
  });

  it('handles user cancellation', async () => {
    (global.window as unknown as Record<string, unknown>).showOpenFilePicker = jest.fn().mockRejectedValue(
      new DOMException('User cancelled', 'AbortError')
    );

    const result = await webPickAndReadFile();
    expect(result.success).toBe(false);
    expect(result.error).toContain('cancelled');

    delete (global.window as unknown as Record<string, unknown>).showOpenFilePicker;
  });
});

// ==================== webPickAndSaveFile ====================

describe('webPickAndSaveFile', () => {
  it('returns error when FSAA is unavailable', async () => {
    const result = await webPickAndSaveFile('content');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Chrome or Edge');
  });

  it('saves file successfully', async () => {
    const mockWritable = { write: jest.fn().mockResolvedValue(undefined), close: jest.fn().mockResolvedValue(undefined) };
    const mockSaveHandle = {
      name: 'saved.txt',
      createWritable: jest.fn().mockResolvedValue(mockWritable),
    };
    const win = global.window as unknown as Record<string, unknown>;
    win.showOpenFilePicker = jest.fn();
    win.showSaveFilePicker = jest.fn().mockResolvedValue(mockSaveHandle);

    const result = await webPickAndSaveFile('save me', { suggestedName: 'saved.txt' });
    expect(result.success).toBe(true);
    expect(result.path).toBe('saved.txt');
    expect(mockWritable.write).toHaveBeenCalledWith('save me');
    expect(mockWritable.close).toHaveBeenCalled();

    delete win.showOpenFilePicker;
    delete win.showSaveFilePicker;
  });

  it('handles user cancellation', async () => {
    const win = global.window as unknown as Record<string, unknown>;
    win.showOpenFilePicker = jest.fn();
    win.showSaveFilePicker = jest.fn().mockRejectedValue(
      new DOMException('User cancelled', 'AbortError')
    );

    const result = await webPickAndSaveFile('content');
    expect(result.success).toBe(false);
    expect(result.error).toContain('cancelled');

    delete win.showOpenFilePicker;
    delete win.showSaveFilePicker;
  });
});
