import fs from 'fs';
import os from 'os';
import path from 'path';
import { packCommand } from './pack';
import { buildCommand } from './build';

jest.mock('./build', () => ({
  buildCommand: jest.fn(),
}));

describe('packCommand', () => {
  const mockBuildCommand = buildCommand as jest.MockedFunction<typeof buildCommand>;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognia-sdk-pack-'));
    jest.spyOn(process, 'cwd').mockReturnValue(tempDir);
    mockBuildCommand.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates a deterministic package directory from existing build output', async () => {
    fs.mkdirSync(path.join(tempDir, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'dist', 'index.js'), 'export default {};');
    fs.writeFileSync(
      path.join(tempDir, 'plugin.json'),
      JSON.stringify({
        id: 'pack-plugin',
        name: 'Pack Plugin',
        version: '1.2.3',
        capabilities: ['tools'],
        main: 'dist/index.js',
      })
    );

    await packCommand({ output: 'release', skipBuild: true });

    const packageDir = path.join(tempDir, 'release', 'pack-plugin-1.2.3');
    expect(fs.existsSync(path.join(packageDir, 'plugin.json'))).toBe(true);
    expect(fs.existsSync(path.join(packageDir, 'dist', 'index.js'))).toBe(true);
    expect(fs.existsSync(path.join(packageDir, 'pack-metadata.json'))).toBe(true);
    expect(mockBuildCommand).not.toHaveBeenCalled();
  });

  it('runs build before pack by default', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'plugin.json'),
      JSON.stringify({
        id: 'pack-plugin',
        name: 'Pack Plugin',
        version: '1.0.0',
        capabilities: ['tools'],
        main: 'dist/index.js',
      })
    );
    fs.mkdirSync(path.join(tempDir, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'dist', 'index.js'), 'export default {};');

    await packCommand({ output: 'release', skipBuild: false });
    expect(mockBuildCommand).toHaveBeenCalled();
  });

  it('fails with actionable diagnostics when manifest is invalid', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'plugin.json'),
      JSON.stringify({
        id: '',
        name: 'Broken',
        version: 'bad',
      })
    );

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
      throw new Error(`process.exit:${code}`);
    });

    await expect(packCommand({ output: 'release', skipBuild: true })).rejects.toThrow('process.exit:1');
    exitSpy.mockRestore();
  });

  it('fails when manifest declares a blocked capability', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'plugin.json'),
      JSON.stringify({
        id: 'pack-plugin',
        name: 'Pack Plugin',
        version: '1.0.0',
        main: 'dist/index.js',
        capabilities: ['skills'],
      })
    );

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
      throw new Error(`process.exit:${code}`);
    });

    await expect(packCommand({ output: 'release', skipBuild: true })).rejects.toThrow('process.exit:1');
    exitSpy.mockRestore();
  });
});

