import fs from 'node:fs';
import path from 'node:path';

const PROMPT_PATH = '.github/prompts/opsx-propose.prompt.md';
const MIRROR_PATHS = [
  '.codex/skills/openspec-propose/SKILL.md',
  '.github/skills/openspec-propose/SKILL.md',
  '.windsurf/skills/openspec-propose/SKILL.md',
  '.windsurf/workflows/opsx-propose.md',
];

function readRepoFile(relativePath: string): string {
  const absolutePath = path.join(process.cwd(), relativePath);
  return fs.readFileSync(absolutePath, 'utf8').replace(/\r\n/g, '\n');
}

describe('opsx-propose prompt contract', () => {
  const prompt = readRepoFile(PROMPT_PATH);

  it('covers explicit-name and description-based name derivation paths', () => {
    expect(prompt).toContain('If input is already valid kebab-case, use it exactly');
    expect(prompt).toContain('Otherwise derive kebab-case by');
    expect(prompt).toContain('lowercasing');
    expect(prompt).toContain('replacing non-alphanumeric characters with `-`');
  });

  it('covers dependency-ordered generation and apply-ready stopping condition', () => {
    expect(prompt).toContain('Select only artifacts currently marked `ready`');
    expect(prompt).toContain('openspec status --change "<name>" --json');
    expect(prompt).toContain('Stop as soon as every artifact in `applyRequires` is `done`');
  });

  it('requires reading dependency artifacts before generating each artifact', () => {
    expect(prompt).toContain('Read all completed dependency artifact files listed in `dependencies` before writing');
  });

  it('covers idempotent behavior when change directory already exists', () => {
    expect(prompt).toContain('If `openspec/changes/<name>/` already exists');
    expect(prompt).toContain('continue existing change or create a new name');
    expect(prompt).toContain('do NOT recreate completed artifacts');
  });
});

describe('opsx-propose prompt mirrors', () => {
  const requiredSnippets = [
    'If input is already valid kebab-case, use it exactly',
    'Otherwise derive kebab-case by',
    'If `openspec/changes/<name>/` already exists',
    'Select only artifacts currently marked `ready`',
    'Read all completed dependency artifact files listed in `dependencies` before writing',
    'Stop as soon as every artifact in `applyRequires` is `done`',
    'Run `/opsx:apply` to start implementing.',
  ];

  for (const mirrorPath of MIRROR_PATHS) {
    it(`keeps required guidance in sync for ${mirrorPath}`, () => {
      const content = readRepoFile(mirrorPath);
      for (const snippet of requiredSnippets) {
        expect(content).toContain(snippet);
      }
    });
  }
});
