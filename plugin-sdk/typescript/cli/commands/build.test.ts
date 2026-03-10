import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import { buildCommand } from './build';

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

describe('buildCommand', () => {
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognia-sdk-build-'));
    jest.spyOn(process, 'cwd').mockReturnValue(tempDir);
    mockExecSync.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('builds and validates deterministic output artifacts', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'plugin.json'),
      JSON.stringify({
        id: 'build-plugin',
        name: 'Build Plugin',
        version: '1.0.0',
        type: 'frontend',
        capabilities: ['tools'],
        main: 'dist/index.js',
      })
    );
    fs.writeFileSync(path.join(tempDir, 'index.ts'), 'export default {};');
    fs.mkdirSync(path.join(tempDir, 'node_modules', 'tsup'), { recursive: true });

    mockExecSync.mockImplementation((command: string) => {
      if (command.startsWith('npx tsup')) {
        const dist = path.join(tempDir, 'dist');
        fs.mkdirSync(dist, { recursive: true });
        fs.writeFileSync(path.join(dist, 'index.js'), 'export default {};');
      }
      return '' as unknown as Buffer;
    });

    await buildCommand({
      output: 'dist',
      minify: true,
      sourcemap: false,
    });

    const outputManifest = JSON.parse(fs.readFileSync(path.join(tempDir, 'dist', 'plugin.json'), 'utf-8')) as {
      main: string;
    };
    expect(outputManifest.main).toBe('index.js');
    expect(fs.existsSync(path.join(tempDir, 'dist', 'index.js'))).toBe(true);
  });

  it('fails with actionable diagnostics when manifest is invalid', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'plugin.json'),
      JSON.stringify({
        id: 'Invalid Plugin ID',
        name: 'Broken',
        version: 'invalid',
        main: 'dist/index.js',
      })
    );
    fs.writeFileSync(path.join(tempDir, 'index.ts'), 'export default {};');

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
      throw new Error(`process.exit:${code}`);
    });

    await expect(
      buildCommand({
        output: 'dist',
        minify: false,
        sourcemap: false,
      })
    ).rejects.toThrow('process.exit:1');

    exitSpy.mockRestore();
  });
});

