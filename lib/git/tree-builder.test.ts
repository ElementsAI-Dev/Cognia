import { buildFileTree } from './tree-builder';
import type { GitFileStatus } from '@/types/system/git';

function makeFileStatus(path: string, staged = false): GitFileStatus {
  return {
    path,
    status: 'modified',
    staged,
    oldPath: undefined,
  } as GitFileStatus;
}

describe('buildFileTree', () => {
  it('returns empty root for empty input', () => {
    const root = buildFileTree([]);
    expect(root.name).toBe('');
    expect(root.path).toBe('');
    expect(root.isDirectory).toBe(true);
    expect(root.children).toEqual([]);
  });

  it('creates a single file node at root level', () => {
    const files = [makeFileStatus('README.md')];
    const root = buildFileTree(files);
    expect(root.children).toHaveLength(1);
    expect(root.children[0].name).toBe('README.md');
    expect(root.children[0].isDirectory).toBe(false);
    expect(root.children[0].status).toBe(files[0]);
    expect(root.children[0].children).toEqual([]);
  });

  it('creates nested directory structure from path segments', () => {
    const files = [makeFileStatus('src/lib/utils.ts')];
    const root = buildFileTree(files);

    // root → src (dir) → lib (dir) → utils.ts (file)
    expect(root.children).toHaveLength(1);
    const src = root.children[0];
    expect(src.name).toBe('src');
    expect(src.isDirectory).toBe(true);
    expect(src.path).toBe('src');

    const lib = src.children[0];
    expect(lib.name).toBe('lib');
    expect(lib.isDirectory).toBe(true);
    expect(lib.path).toBe('src/lib');

    const file = lib.children[0];
    expect(file.name).toBe('utils.ts');
    expect(file.isDirectory).toBe(false);
    expect(file.path).toBe('src/lib/utils.ts');
  });

  it('groups multiple files under shared directories', () => {
    const files = [
      makeFileStatus('src/a.ts'),
      makeFileStatus('src/b.ts'),
    ];
    const root = buildFileTree(files);
    expect(root.children).toHaveLength(1);
    const src = root.children[0];
    expect(src.children).toHaveLength(2);
    expect(src.children.map((c) => c.name)).toEqual(['a.ts', 'b.ts']);
  });

  it('sorts directories before files', () => {
    const files = [
      makeFileStatus('src/z-file.ts'),
      makeFileStatus('src/a-dir/nested.ts'),
    ];
    const root = buildFileTree(files);
    const src = root.children[0];
    // a-dir (directory) should come before z-file.ts (file)
    expect(src.children[0].name).toBe('a-dir');
    expect(src.children[0].isDirectory).toBe(true);
    expect(src.children[1].name).toBe('z-file.ts');
    expect(src.children[1].isDirectory).toBe(false);
  });

  it('sorts entries alphabetically within same type', () => {
    const files = [
      makeFileStatus('c.ts'),
      makeFileStatus('a.ts'),
      makeFileStatus('b.ts'),
    ];
    const root = buildFileTree(files);
    expect(root.children.map((c) => c.name)).toEqual(['a.ts', 'b.ts', 'c.ts']);
  });

  it('sorts directories alphabetically', () => {
    const files = [
      makeFileStatus('z-dir/file.ts'),
      makeFileStatus('a-dir/file.ts'),
      makeFileStatus('m-dir/file.ts'),
    ];
    const root = buildFileTree(files);
    expect(root.children.map((c) => c.name)).toEqual(['a-dir', 'm-dir', 'z-dir']);
  });

  it('handles deeply nested paths', () => {
    const files = [makeFileStatus('a/b/c/d/e/file.ts')];
    const root = buildFileTree(files);

    let current = root;
    const names = ['a', 'b', 'c', 'd', 'e', 'file.ts'];
    for (const name of names) {
      expect(current.children).toHaveLength(1);
      current = current.children[0];
      expect(current.name).toBe(name);
    }
    expect(current.isDirectory).toBe(false);
  });

  it('preserves file status on leaf nodes only', () => {
    const files = [makeFileStatus('src/index.ts', true)];
    const root = buildFileTree(files);
    const src = root.children[0];
    expect(src.status).toBeUndefined(); // directory has no status
    expect(src.children[0].status).toBe(files[0]); // file has status
  });

  it('handles mixed root-level files and directories', () => {
    const files = [
      makeFileStatus('package.json'),
      makeFileStatus('src/index.ts'),
      makeFileStatus('README.md'),
    ];
    const root = buildFileTree(files);
    // Directory first, then files alphabetically
    expect(root.children.map((c) => c.name)).toEqual(['src', 'package.json', 'README.md']);
    expect(root.children[0].isDirectory).toBe(true);
    expect(root.children[1].isDirectory).toBe(false);
    expect(root.children[2].isDirectory).toBe(false);
  });
});
