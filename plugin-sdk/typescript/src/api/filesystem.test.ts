/**
 * FileSystem API Tests
 *
 * @description Tests for filesystem API type definitions.
 */

import type {
  PluginFileSystemAPI,
  FileEntry,
  FileStat,
  FileWatchEvent,
  PluginClipboardAPI,
} from './filesystem';

describe('FileSystem API Types', () => {
  describe('FileEntry', () => {
    it('should create a valid file entry', () => {
      const entry: FileEntry = {
        name: 'document.txt',
        path: '/documents/document.txt',
        isFile: true,
        isDirectory: false,
        size: 1024,
      };

      expect(entry.name).toBe('document.txt');
      expect(entry.path).toBe('/documents/document.txt');
      expect(entry.isFile).toBe(true);
      expect(entry.isDirectory).toBe(false);
      expect(entry.size).toBe(1024);
    });

    it('should create a directory entry', () => {
      const entry: FileEntry = {
        name: 'documents',
        path: '/home/user/documents',
        isFile: false,
        isDirectory: true,
      };

      expect(entry.isFile).toBe(false);
      expect(entry.isDirectory).toBe(true);
      expect(entry.size).toBeUndefined();
    });
  });

  describe('FileStat', () => {
    it('should create a valid file stat', () => {
      const now = new Date();
      const stat: FileStat = {
        size: 2048,
        isFile: true,
        isDirectory: false,
        isSymlink: false,
        created: now,
        modified: now,
        accessed: now,
        mode: 0o644,
      };

      expect(stat.size).toBe(2048);
      expect(stat.isFile).toBe(true);
      expect(stat.isDirectory).toBe(false);
      expect(stat.isSymlink).toBe(false);
      expect(stat.created).toBe(now);
      expect(stat.mode).toBe(0o644);
    });

    it('should create a directory stat', () => {
      const stat: FileStat = {
        size: 4096,
        isFile: false,
        isDirectory: true,
        isSymlink: false,
      };

      expect(stat.isDirectory).toBe(true);
    });

    it('should create a symlink stat', () => {
      const stat: FileStat = {
        size: 0,
        isFile: false,
        isDirectory: false,
        isSymlink: true,
      };

      expect(stat.isSymlink).toBe(true);
    });
  });

  describe('FileWatchEvent', () => {
    it('should create a create event', () => {
      const event: FileWatchEvent = {
        type: 'create',
        path: '/documents/new-file.txt',
      };

      expect(event.type).toBe('create');
      expect(event.path).toBe('/documents/new-file.txt');
    });

    it('should create a modify event', () => {
      const event: FileWatchEvent = {
        type: 'modify',
        path: '/documents/existing-file.txt',
      };

      expect(event.type).toBe('modify');
    });

    it('should create a delete event', () => {
      const event: FileWatchEvent = {
        type: 'delete',
        path: '/documents/deleted-file.txt',
      };

      expect(event.type).toBe('delete');
    });

    it('should create a rename event', () => {
      const event: FileWatchEvent = {
        type: 'rename',
        path: '/documents/old-name.txt',
        newPath: '/documents/new-name.txt',
      };

      expect(event.type).toBe('rename');
      expect(event.path).toBe('/documents/old-name.txt');
      expect(event.newPath).toBe('/documents/new-name.txt');
    });

    it('should support all event types', () => {
      const types: FileWatchEvent['type'][] = ['create', 'modify', 'delete', 'rename'];
      expect(types).toHaveLength(4);
    });
  });

  describe('PluginFileSystemAPI', () => {
    it('should define all required API methods', () => {
      const mockAPI: PluginFileSystemAPI = {
        readText: jest.fn(),
        readBinary: jest.fn(),
        readJson: jest.fn(),
        writeText: jest.fn(),
        writeBinary: jest.fn(),
        writeJson: jest.fn(),
        appendText: jest.fn(),
        exists: jest.fn(),
        mkdir: jest.fn(),
        remove: jest.fn(),
        copy: jest.fn(),
        move: jest.fn(),
        readDir: jest.fn(),
        stat: jest.fn(),
        watch: jest.fn(),
        getDataDir: jest.fn(),
        getCacheDir: jest.fn(),
        getTempDir: jest.fn(),
      };

      expect(mockAPI.readText).toBeDefined();
      expect(mockAPI.readBinary).toBeDefined();
      expect(mockAPI.readJson).toBeDefined();
      expect(mockAPI.writeText).toBeDefined();
      expect(mockAPI.writeBinary).toBeDefined();
      expect(mockAPI.writeJson).toBeDefined();
      expect(mockAPI.appendText).toBeDefined();
      expect(mockAPI.exists).toBeDefined();
      expect(mockAPI.mkdir).toBeDefined();
      expect(mockAPI.remove).toBeDefined();
      expect(mockAPI.copy).toBeDefined();
      expect(mockAPI.move).toBeDefined();
      expect(mockAPI.readDir).toBeDefined();
      expect(mockAPI.stat).toBeDefined();
      expect(mockAPI.watch).toBeDefined();
      expect(mockAPI.getDataDir).toBeDefined();
      expect(mockAPI.getCacheDir).toBeDefined();
      expect(mockAPI.getTempDir).toBeDefined();
    });

    it('should call read methods correctly', async () => {
      const mockAPI: PluginFileSystemAPI = {
        readText: jest.fn().mockResolvedValue('file content'),
        readBinary: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
        readJson: jest.fn().mockResolvedValue({ key: 'value' }),
        writeText: jest.fn(),
        writeBinary: jest.fn(),
        writeJson: jest.fn(),
        appendText: jest.fn(),
        exists: jest.fn(),
        mkdir: jest.fn(),
        remove: jest.fn(),
        copy: jest.fn(),
        move: jest.fn(),
        readDir: jest.fn(),
        stat: jest.fn(),
        watch: jest.fn(),
        getDataDir: jest.fn(),
        getCacheDir: jest.fn(),
        getTempDir: jest.fn(),
      };

      const text = await mockAPI.readText('/path/to/file.txt');
      expect(text).toBe('file content');

      const binary = await mockAPI.readBinary('/path/to/file.bin');
      expect(binary).toEqual(new Uint8Array([1, 2, 3]));

      const json = await mockAPI.readJson<{ key: string }>('/path/to/file.json');
      expect(json.key).toBe('value');
    });

    it('should call write methods correctly', async () => {
      const mockAPI: PluginFileSystemAPI = {
        readText: jest.fn(),
        readBinary: jest.fn(),
        readJson: jest.fn(),
        writeText: jest.fn().mockResolvedValue(undefined),
        writeBinary: jest.fn().mockResolvedValue(undefined),
        writeJson: jest.fn().mockResolvedValue(undefined),
        appendText: jest.fn().mockResolvedValue(undefined),
        exists: jest.fn(),
        mkdir: jest.fn(),
        remove: jest.fn(),
        copy: jest.fn(),
        move: jest.fn(),
        readDir: jest.fn(),
        stat: jest.fn(),
        watch: jest.fn(),
        getDataDir: jest.fn(),
        getCacheDir: jest.fn(),
        getTempDir: jest.fn(),
      };

      await mockAPI.writeText('/path/to/file.txt', 'content');
      expect(mockAPI.writeText).toHaveBeenCalledWith('/path/to/file.txt', 'content');

      await mockAPI.writeJson('/path/to/file.json', { data: 'test' }, true);
      expect(mockAPI.writeJson).toHaveBeenCalledWith('/path/to/file.json', { data: 'test' }, true);
    });

    it('should call watch method correctly', () => {
      const unwatch = jest.fn();
      const callback = jest.fn();

      const mockAPI: PluginFileSystemAPI = {
        readText: jest.fn(),
        readBinary: jest.fn(),
        readJson: jest.fn(),
        writeText: jest.fn(),
        writeBinary: jest.fn(),
        writeJson: jest.fn(),
        appendText: jest.fn(),
        exists: jest.fn(),
        mkdir: jest.fn(),
        remove: jest.fn(),
        copy: jest.fn(),
        move: jest.fn(),
        readDir: jest.fn(),
        stat: jest.fn(),
        watch: jest.fn().mockReturnValue(unwatch),
        getDataDir: jest.fn(),
        getCacheDir: jest.fn(),
        getTempDir: jest.fn(),
      };

      const result = mockAPI.watch('/path/to/file.txt', callback);
      expect(mockAPI.watch).toHaveBeenCalledWith('/path/to/file.txt', callback);
      expect(result).toBe(unwatch);
    });

    it('should return plugin directories', () => {
      const mockAPI: PluginFileSystemAPI = {
        readText: jest.fn(),
        readBinary: jest.fn(),
        readJson: jest.fn(),
        writeText: jest.fn(),
        writeBinary: jest.fn(),
        writeJson: jest.fn(),
        appendText: jest.fn(),
        exists: jest.fn(),
        mkdir: jest.fn(),
        remove: jest.fn(),
        copy: jest.fn(),
        move: jest.fn(),
        readDir: jest.fn(),
        stat: jest.fn(),
        watch: jest.fn(),
        getDataDir: jest.fn().mockReturnValue('/plugins/my-plugin/data'),
        getCacheDir: jest.fn().mockReturnValue('/plugins/my-plugin/cache'),
        getTempDir: jest.fn().mockReturnValue('/tmp/my-plugin'),
      };

      expect(mockAPI.getDataDir()).toBe('/plugins/my-plugin/data');
      expect(mockAPI.getCacheDir()).toBe('/plugins/my-plugin/cache');
      expect(mockAPI.getTempDir()).toBe('/tmp/my-plugin');
    });
  });

  describe('PluginClipboardAPI', () => {
    it('should define all required API methods', () => {
      const mockAPI: PluginClipboardAPI = {
        readText: jest.fn(),
        writeText: jest.fn(),
        readImage: jest.fn(),
        writeImage: jest.fn(),
        hasText: jest.fn(),
        hasImage: jest.fn(),
        clear: jest.fn(),
      };

      expect(mockAPI.readText).toBeDefined();
      expect(mockAPI.writeText).toBeDefined();
      expect(mockAPI.readImage).toBeDefined();
      expect(mockAPI.writeImage).toBeDefined();
      expect(mockAPI.hasText).toBeDefined();
      expect(mockAPI.hasImage).toBeDefined();
      expect(mockAPI.clear).toBeDefined();
    });

    it('should call text methods correctly', async () => {
      const mockAPI: PluginClipboardAPI = {
        readText: jest.fn().mockResolvedValue('clipboard text'),
        writeText: jest.fn().mockResolvedValue(undefined),
        readImage: jest.fn(),
        writeImage: jest.fn(),
        hasText: jest.fn().mockResolvedValue(true),
        hasImage: jest.fn(),
        clear: jest.fn(),
      };

      const text = await mockAPI.readText();
      expect(text).toBe('clipboard text');

      await mockAPI.writeText('new text');
      expect(mockAPI.writeText).toHaveBeenCalledWith('new text');

      const hasText = await mockAPI.hasText();
      expect(hasText).toBe(true);
    });

    it('should call image methods correctly', async () => {
      const imageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG header

      const mockAPI: PluginClipboardAPI = {
        readText: jest.fn(),
        writeText: jest.fn(),
        readImage: jest.fn().mockResolvedValue(imageData),
        writeImage: jest.fn().mockResolvedValue(undefined),
        hasText: jest.fn(),
        hasImage: jest.fn().mockResolvedValue(true),
        clear: jest.fn(),
      };

      const image = await mockAPI.readImage();
      expect(image).toEqual(imageData);

      await mockAPI.writeImage(imageData, 'png');
      expect(mockAPI.writeImage).toHaveBeenCalledWith(imageData, 'png');

      const hasImage = await mockAPI.hasImage();
      expect(hasImage).toBe(true);
    });

    it('should clear clipboard', async () => {
      const mockAPI: PluginClipboardAPI = {
        readText: jest.fn(),
        writeText: jest.fn(),
        readImage: jest.fn(),
        writeImage: jest.fn(),
        hasText: jest.fn(),
        hasImage: jest.fn(),
        clear: jest.fn().mockResolvedValue(undefined),
      };

      await mockAPI.clear();
      expect(mockAPI.clear).toHaveBeenCalled();
    });
  });
});
