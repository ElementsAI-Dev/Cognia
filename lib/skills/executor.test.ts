/**
 * Tests for skill executor
 */

import type { Skill } from '@/types/system/skill';
import {
  matchSkillToQuery,
  findMatchingSkills,
  estimateSkillTokens,
  checkSkillTokenBudget,
  buildProgressiveSkillsPrompt,
  selectSkillsForContext,
  buildSkillSystemPrompt,
  compareVersions,
  checkSkillVersions,
  getSkillsWithUpdates,
  detectSkillConflicts,
  wouldCauseConflicts,
} from './executor';

// Helper to create a mock skill
function createMockSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: 'test-skill-id',
    metadata: {
      name: 'test-skill',
      description: 'A test skill for unit testing',
    },
    content: 'This is the skill content with instructions.',
    rawContent: '---\nname: test-skill\n---\nThis is the skill content.',
    resources: [],
    status: 'enabled',
    source: 'custom',
    category: 'development',
    tags: ['test', 'development'],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('matchSkillToQuery', () => {
  it('scores higher when skill name matches the query', () => {
    const skill = createMockSkill({ metadata: { name: 'code-review', description: 'Reviews code' } });
    const score = matchSkillToQuery(skill, 'please do a code review');
    expect(score).toBeGreaterThan(0);
  });

  it('scores on description word matches', () => {
    const skill = createMockSkill({
      metadata: { name: 'helper', description: 'Helps with debugging TypeScript applications' },
    });
    const score = matchSkillToQuery(skill, 'I need help debugging my TypeScript app');
    expect(score).toBeGreaterThan(0);
  });

  it('scores on tag matches', () => {
    const skill = createMockSkill({ tags: ['react', 'frontend'] });
    const score = matchSkillToQuery(skill, 'build a react component');
    expect(score).toBeGreaterThanOrEqual(5);
  });

  it('returns 0 for completely unrelated queries', () => {
    const skill = createMockSkill({
      metadata: { name: 'cooking-helper', description: 'Helps with cooking recipes' },
      tags: ['cooking', 'recipes'],
      content: 'Instructions for cooking.',
    });
    const score = matchSkillToQuery(skill, 'quantum physics equations');
    expect(score).toBe(0);
  });

  it('scores higher for name match than description match', () => {
    const nameSkill = createMockSkill({
      metadata: { name: 'data-analysis', description: 'Generic skill' },
      content: 'Generic content.',
      tags: [],
    });
    const descSkill = createMockSkill({
      metadata: { name: 'generic-skill', description: 'Performs data analysis tasks' },
      content: 'Generic content.',
      tags: [],
    });
    const nameScore = matchSkillToQuery(nameSkill, 'data analysis task');
    const descScore = matchSkillToQuery(descSkill, 'data analysis task');
    expect(nameScore).toBeGreaterThan(descScore);
  });
});

describe('findMatchingSkills', () => {
  const skills: Skill[] = [
    createMockSkill({
      id: 'coding',
      metadata: { name: 'code-assistant', description: 'Helps write and review code' },
      tags: ['code', 'programming'],
      content: 'Instructions for coding assistance.',
    }),
    createMockSkill({
      id: 'writing',
      metadata: { name: 'writing-helper', description: 'Helps with creative writing' },
      tags: ['writing', 'creative'],
      content: 'Instructions for writing assistance.',
    }),
    createMockSkill({
      id: 'data',
      metadata: { name: 'data-analyzer', description: 'Analyzes data sets' },
      tags: ['data', 'analysis'],
      content: 'Instructions for data analysis.',
    }),
    createMockSkill({
      id: 'disabled',
      metadata: { name: 'disabled-skill', description: 'This skill is disabled' },
      status: 'disabled',
      tags: ['code'],
      content: 'Should not appear.',
    }),
  ];

  it('returns matching skills sorted by relevance', () => {
    const result = findMatchingSkills(skills, 'help me write code');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].id).toBe('coding');
  });

  it('respects maxResults limit', () => {
    const result = findMatchingSkills(skills, 'help with anything', 1);
    expect(result.length).toBeLessThanOrEqual(1);
  });

  it('excludes disabled skills', () => {
    const result = findMatchingSkills(skills, 'code programming');
    const ids = result.map((s) => s.id);
    expect(ids).not.toContain('disabled');
  });

  it('returns empty array for no matches', () => {
    const result = findMatchingSkills(skills, 'xyz123');
    expect(result).toEqual([]);
  });

  it('matches by tags', () => {
    const result = findMatchingSkills(skills, 'data analysis report');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].id).toBe('data');
  });
});

describe('estimateSkillTokens', () => {
  it('estimates tokens based on content length', () => {
    const skill = createMockSkill({ content: 'a'.repeat(400) });
    const tokens = estimateSkillTokens(skill);
    // 400 chars / 4 = 100 tokens for content, plus metadata
    expect(tokens).toBeGreaterThanOrEqual(100);
  });

  it('includes metadata in token estimate', () => {
    const skill = createMockSkill({
      metadata: { name: 'long-name-skill', description: 'A very long description of this skill' },
      content: '',
    });
    const tokens = estimateSkillTokens(skill);
    expect(tokens).toBeGreaterThan(0);
  });

  it('includes reference resources in token estimate', () => {
    const withoutRef = createMockSkill({ content: 'short', resources: [] });
    const withRef = createMockSkill({
      content: 'short',
      resources: [
        { type: 'reference', path: 'ref.md', name: 'ref.md', content: 'a'.repeat(200) },
      ],
    });
    expect(estimateSkillTokens(withRef)).toBeGreaterThan(estimateSkillTokens(withoutRef));
  });
});

describe('checkSkillTokenBudget', () => {
  it('returns fits=true when within budget', () => {
    const skill = createMockSkill({ content: 'short content' });
    const result = checkSkillTokenBudget([skill], 10000);
    expect(result.fits).toBe(true);
    expect(result.excess).toBe(0);
  });

  it('returns fits=false when over budget', () => {
    const skill = createMockSkill({ content: 'a'.repeat(40000) });
    const result = checkSkillTokenBudget([skill], 100);
    expect(result.fits).toBe(false);
    expect(result.excess).toBeGreaterThan(0);
  });

  it('sums tokens across multiple skills', () => {
    const skills = [
      createMockSkill({ id: 's1', content: 'a'.repeat(400) }),
      createMockSkill({ id: 's2', content: 'b'.repeat(400) }),
    ];
    const result = checkSkillTokenBudget(skills, 10000);
    expect(result.totalTokens).toBeGreaterThanOrEqual(200);
  });
});

describe('buildProgressiveSkillsPrompt', () => {
  it('returns empty prompt for empty skills array', () => {
    const result = buildProgressiveSkillsPrompt([], 2000);
    expect(result.prompt).toBe('');
    expect(result.level).toBe('summary');
    expect(result.tokenEstimate).toBe(0);
  });

  it('returns full disclosure when within budget', () => {
    const skill = createMockSkill({ content: 'Short instruction.' });
    const result = buildProgressiveSkillsPrompt([skill], 10000);
    expect(result.level).toBe('full');
    expect(result.prompt).toContain('test-skill');
  });

  it('falls back to partial or summary when over budget', () => {
    const bigSkill = createMockSkill({ content: 'a'.repeat(40000) });
    const result = buildProgressiveSkillsPrompt([bigSkill], 100);
    expect(['partial', 'summary']).toContain(result.level);
  });
});

describe('selectSkillsForContext', () => {
  const skills = [
    createMockSkill({ id: 'small', content: 'short' }),
    createMockSkill({ id: 'big', content: 'a'.repeat(20000) }),
    createMockSkill({ id: 'medium', content: 'b'.repeat(2000) }),
  ];

  it('selects skills that fit within token budget', () => {
    const selected = selectSkillsForContext(skills, 10000);
    expect(selected.length).toBeGreaterThan(0);
    expect(selected.length).toBeLessThanOrEqual(skills.length);
  });

  it('prioritizes skills in priorityIds', () => {
    const selected = selectSkillsForContext(skills, 10000, ['medium']);
    expect(selected[0].id).toBe('medium');
  });

  it('returns empty array when budget is 0', () => {
    const selected = selectSkillsForContext(skills, 0);
    expect(selected).toEqual([]);
  });
});

describe('buildSkillSystemPrompt', () => {
  it('includes skill name in prompt', () => {
    const skill = createMockSkill();
    const prompt = buildSkillSystemPrompt(skill);
    expect(prompt).toContain('test-skill');
  });

  it('includes skill description in prompt', () => {
    const skill = createMockSkill();
    const prompt = buildSkillSystemPrompt(skill);
    expect(prompt).toContain('A test skill for unit testing');
  });

  it('includes skill content in prompt', () => {
    const skill = createMockSkill({ content: 'Follow these specific instructions' });
    const prompt = buildSkillSystemPrompt(skill);
    expect(prompt).toContain('Follow these specific instructions');
  });

  it('truncates long content based on config', () => {
    const skill = createMockSkill({ content: 'x'.repeat(20000) });
    const prompt = buildSkillSystemPrompt(skill, { maxContentLength: 100 });
    expect(prompt.length).toBeLessThan(20000);
  });

  it('adds system prompt prefix when configured', () => {
    const skill = createMockSkill();
    const prompt = buildSkillSystemPrompt(skill, { systemPromptPrefix: 'CUSTOM PREFIX' });
    expect(prompt).toContain('CUSTOM PREFIX');
  });
});

describe('compareVersions', () => {
  it('should return 0 for equal versions', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('2.3.4', '2.3.4')).toBe(0);
  });

  it('should return -1 when a < b', () => {
    expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
    expect(compareVersions('1.0.0', '1.1.0')).toBe(-1);
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
    expect(compareVersions('1.9.9', '2.0.0')).toBe(-1);
  });

  it('should return 1 when a > b', () => {
    expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
    expect(compareVersions('1.1.0', '1.0.0')).toBe(1);
    expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
  });

  it('should handle different length versions', () => {
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.0.0', '1.0')).toBe(0);
    expect(compareVersions('1.0', '1.0.1')).toBe(-1);
  });
});

describe('checkSkillVersions', () => {
  it('should detect skills with updates via id match', () => {
    const skills = [
      createMockSkill({ id: 'skill-a', version: '1.0.0' }),
      createMockSkill({ id: 'skill-b', version: '2.0.0' }),
    ];

    const available = [
      { name: 'no-match', id: 'skill-a', version: '1.1.0' },
      { name: 'no-match', id: 'skill-b', version: '2.0.0' },
    ];

    const results = checkSkillVersions(skills, available);

    expect(results).toHaveLength(2);
    expect(results[0].hasUpdate).toBe(true);
    expect(results[0].latestVersion).toBe('1.1.0');
    expect(results[1].hasUpdate).toBe(false);
  });

  it('should detect skills with updates via metadata.name match', () => {
    const skills = [
      createMockSkill({ id: 's1', metadata: { name: 'my-skill', description: 'desc' }, version: '1.0.0' }),
    ];

    const available = [{ name: 'my-skill', version: '2.0.0' }];
    const results = checkSkillVersions(skills, available);

    expect(results).toHaveLength(1);
    expect(results[0].hasUpdate).toBe(true);
    expect(results[0].latestVersion).toBe('2.0.0');
  });

  it('should handle skills without matching available versions', () => {
    const skills = [createMockSkill({ id: 'orphan', version: '1.0.0' })];
    const results = checkSkillVersions(skills, []);

    expect(results).toHaveLength(1);
    expect(results[0].hasUpdate).toBe(false);
    expect(results[0].latestVersion).toBeUndefined();
  });

  it('should use default version when skill has none', () => {
    const skills = [createMockSkill({ id: 'no-ver', version: undefined })];
    const available = [{ id: 'no-ver', name: 'x', version: '2.0.0' }];

    const results = checkSkillVersions(skills, available);

    expect(results[0].currentVersion).toBe('1.0.0');
    expect(results[0].hasUpdate).toBe(true);
  });
});

describe('getSkillsWithUpdates', () => {
  it('should return only skills that have updates', () => {
    const skills = [
      createMockSkill({ id: 'old', metadata: { name: 'old', description: 'd' }, version: '1.0.0' }),
      createMockSkill({ id: 'current', metadata: { name: 'current', description: 'd' }, version: '3.0.0' }),
      createMockSkill({ id: 'outdated', metadata: { name: 'outdated', description: 'd' }, version: '1.5.0' }),
    ];

    const available = [
      { name: 'old', version: '2.0.0' },
      { name: 'current', version: '3.0.0' },
      { name: 'outdated', version: '2.0.0' },
    ];

    const updates = getSkillsWithUpdates(skills, available);

    expect(updates).toHaveLength(2);
    expect(updates.map((u) => u.skillName)).toEqual(['old', 'outdated']);
  });
});

describe('detectSkillConflicts', () => {
  it('should detect same category conflict', () => {
    const skills = [
      createMockSkill({ id: 'a', category: 'development' }),
      createMockSkill({ id: 'b', category: 'development' }),
    ];

    const conflicts = detectSkillConflicts(skills);

    expect(conflicts.length).toBeGreaterThanOrEqual(1);
    const catConflict = conflicts.find((c) => c.conflictType === 'category');
    expect(catConflict).toBeDefined();
    expect(catConflict?.severity).toBe('low');
  });

  it('should not flag custom category as conflict', () => {
    const skills = [
      createMockSkill({ id: 'a', category: 'custom' }),
      createMockSkill({ id: 'b', category: 'custom' }),
    ];

    const conflicts = detectSkillConflicts(skills);
    const catConflicts = conflicts.filter((c) => c.conflictType === 'category');

    expect(catConflicts).toHaveLength(0);
  });

  it('should detect shared MCP server conflict (high severity)', () => {
    const skills = [
      createMockSkill({ id: 'a', associatedMcpServers: ['github-server'] }),
      createMockSkill({ id: 'b', associatedMcpServers: ['github-server', 'slack-server'] }),
    ];

    const conflicts = detectSkillConflicts(skills);
    const mcpConflict = conflicts.find((c) => c.conflictType === 'mcp-server');

    expect(mcpConflict).toBeDefined();
    expect(mcpConflict?.severity).toBe('high');
    expect(mcpConflict?.description).toContain('github-server');
  });

  it('should detect shared tool keywords (medium severity)', () => {
    const skills = [
      createMockSkill({ id: 'a', toolMatchKeywords: ['git', 'commit'] }),
      createMockSkill({ id: 'b', toolMatchKeywords: ['git', 'push'] }),
    ];

    const conflicts = detectSkillConflicts(skills);
    const kwConflict = conflicts.find((c) => c.conflictType === 'tool-keyword');

    expect(kwConflict).toBeDefined();
    expect(kwConflict?.severity).toBe('medium');
  });

  it('should detect significant tag overlap (3+ shared tags)', () => {
    const skills = [
      createMockSkill({ id: 'a', tags: ['react', 'typescript', 'frontend', 'testing'] }),
      createMockSkill({ id: 'b', tags: ['react', 'typescript', 'frontend', 'css'] }),
    ];

    const conflicts = detectSkillConflicts(skills);
    const tagConflict = conflicts.find((c) => c.conflictType === 'tag');

    expect(tagConflict).toBeDefined();
    expect(tagConflict?.severity).toBe('medium');
  });

  it('should not flag minor tag overlap (< 3 shared tags)', () => {
    const skills = [
      createMockSkill({ id: 'a', tags: ['react', 'frontend'] }),
      createMockSkill({ id: 'b', tags: ['react', 'backend'] }),
    ];

    const conflicts = detectSkillConflicts(skills);
    const tagConflicts = conflicts.filter((c) => c.conflictType === 'tag');

    expect(tagConflicts).toHaveLength(0);
  });

  it('should return empty for no conflicts', () => {
    const skills = [
      createMockSkill({ id: 'a', category: 'development', tags: ['react'] }),
      createMockSkill({ id: 'b', category: 'communication', tags: ['blog'] }),
    ];

    const conflicts = detectSkillConflicts(skills);

    expect(conflicts).toHaveLength(0);
  });
});

describe('wouldCauseConflicts', () => {
  it('should return conflicts involving the candidate skill', () => {
    const active = [
      createMockSkill({ id: 'existing', associatedMcpServers: ['github'] }),
    ];
    const candidate = createMockSkill({ id: 'new', associatedMcpServers: ['github'] });

    const conflicts = wouldCauseConflicts(candidate, active);

    expect(conflicts.length).toBeGreaterThanOrEqual(1);
    expect(
      conflicts.some(
        (c) => c.skillA.id === 'new' || c.skillB.id === 'new'
      )
    ).toBe(true);
  });

  it('should return empty when no conflicts with candidate', () => {
    const active = [
      createMockSkill({ id: 'existing', category: 'communication' }),
    ];
    const candidate = createMockSkill({ id: 'new', category: 'development' });

    const conflicts = wouldCauseConflicts(candidate, active);

    expect(conflicts).toHaveLength(0);
  });
});
