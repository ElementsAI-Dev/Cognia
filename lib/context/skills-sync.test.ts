/**
 * Tests for skills-sync.ts
 * Agent skill synchronization to context files
 */

import {
  syncSkill,
  syncSkills,
  readSkillDescription,
  searchSkills,
  getSkillRefs,
  generateSkillsStaticPrompt,
  discoverSkills,
  type SkillRef,
} from './skills-sync';
import * as contextFs from './context-fs';
import type { Skill } from '@/types/system/skill';
import type { ContextFile, SkillDescriptionFile } from '@/types/system/context';

// Mock context-fs module
jest.mock('./context-fs');

const mockedContextFs = contextFs as jest.Mocked<typeof contextFs>;

// Mock skill
const createMockSkill = (
  id: string,
  name: string,
  description: string = 'Test description'
): Skill => ({
  id,
  metadata: {
    name,
    description,
  },
  content: `Full content for ${name}`,
  rawContent: `---\nname: ${name}\ndescription: ${description}\n---\nFull content for ${name}`,
  resources: [],
  status: 'enabled',
  source: 'custom',
  category: 'development',
  tags: ['test'],
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Mock context file
const createMockContextFile = (content: string, path: string = ''): ContextFile => ({
  path,
  content,
  metadata: {
    id: 'test-id',
    category: 'skills',
    source: 'test-skill',
    filename: 'test.json',
    tags: ['skill'],
    sizeBytes: content.length,
    estimatedTokens: Math.ceil(content.length / 4),
    createdAt: new Date(),
    accessedAt: new Date(),
  },
});

describe('skills-sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('syncSkill', () => {
    it('should sync a skill to a context file', async () => {
      const mockFile = createMockContextFile('{}', '.cognia/context/skills/test.json');
      mockedContextFs.writeContextFile.mockResolvedValue(mockFile);

      const skill = createMockSkill('test-skill', 'Test Skill', 'A test skill for testing');
      const result = await syncSkill(skill);

      expect(mockedContextFs.writeContextFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          category: 'skills',
          source: 'test-skill',
          filename: 'test-skill.json',
          tags: expect.arrayContaining(['skill']),
        })
      );
      expect(result).toBe(mockFile);
    });

    it('should serialize skill description correctly', async () => {
      const mockFile = createMockContextFile('{}');
      mockedContextFs.writeContextFile.mockResolvedValue(mockFile);

      const skill = createMockSkill('my-skill', 'My Skill', 'Does cool things\nWith multiple lines');
      await syncSkill(skill);

      const writeCall = mockedContextFs.writeContextFile.mock.calls[0];
      const content = JSON.parse(writeCall[0]);

      expect(content).toMatchObject({
        skillId: 'my-skill',
        name: 'My Skill',
        shortDescription: 'Does cool things',
        fullDescription: expect.stringContaining('Full content for My Skill'),
      });
      expect(content.keywords).toBeDefined();
      expect(Array.isArray(content.keywords)).toBe(true);
    });

    it('should extract keywords from skill name and description', async () => {
      const mockFile = createMockContextFile('{}');
      mockedContextFs.writeContextFile.mockResolvedValue(mockFile);

      const skill = createMockSkill('code-review', 'Code Review', 'Analyzes code quality and suggests improvements');
      await syncSkill(skill);

      const writeCall = mockedContextFs.writeContextFile.mock.calls[0];
      const content = JSON.parse(writeCall[0]);

      expect(content.keywords).toContain('code');
      expect(content.keywords).toContain('review');
    });

    it('should include top keywords in tags', async () => {
      const mockFile = createMockContextFile('{}');
      mockedContextFs.writeContextFile.mockResolvedValue(mockFile);

      const skill = createMockSkill('analysis', 'Data Analysis', 'Performs data analysis');
      await syncSkill(skill);

      expect(mockedContextFs.writeContextFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          tags: expect.arrayContaining(['skill']),
        })
      );
    });
  });

  describe('syncSkills', () => {
    it('should sync multiple skills', async () => {
      const mockFile = createMockContextFile('{}');
      mockedContextFs.writeContextFile.mockResolvedValue(mockFile);

      const skills = [
        createMockSkill('skill1', 'Skill 1'),
        createMockSkill('skill2', 'Skill 2'),
        createMockSkill('skill3', 'Skill 3'),
      ];

      const result = await syncSkills(skills);

      expect(result.synced).toBe(3);
      expect(result.errors).toHaveLength(0);
      expect(mockedContextFs.writeContextFile).toHaveBeenCalledTimes(3);
    });

    it('should handle sync errors gracefully', async () => {
      mockedContextFs.writeContextFile
        .mockResolvedValueOnce(createMockContextFile('{}'))
        .mockRejectedValueOnce(new Error('Write failed'))
        .mockResolvedValueOnce(createMockContextFile('{}'));

      const skills = [
        createMockSkill('skill1', 'Skill 1'),
        createMockSkill('skill2', 'Skill 2'),
        createMockSkill('skill3', 'Skill 3'),
      ];

      const result = await syncSkills(skills);

      expect(result.synced).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].skillId).toBe('skill2');
    });

    it('should return empty result for empty skills array', async () => {
      const result = await syncSkills([]);

      expect(result.synced).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockedContextFs.writeContextFile).not.toHaveBeenCalled();
    });
  });

  describe('readSkillDescription', () => {
    it('should read and parse skill description', async () => {
      const skillDesc: SkillDescriptionFile = {
        skillId: 'test-skill',
        name: 'Test Skill',
        shortDescription: 'Short desc',
        fullDescription: 'Full description',
        toolNames: [],
        keywords: ['test'],
        lastUpdated: new Date(),
      };
      mockedContextFs.readContextFile.mockResolvedValue(
        createMockContextFile(JSON.stringify(skillDesc))
      );

      const result = await readSkillDescription('test-skill');

      expect(result).toMatchObject({
        skillId: 'test-skill',
        name: 'Test Skill',
        shortDescription: 'Short desc',
      });
    });

    it('should return null if file not found', async () => {
      mockedContextFs.readContextFile.mockResolvedValue(null);

      const result = await readSkillDescription('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', async () => {
      mockedContextFs.readContextFile.mockResolvedValue(
        createMockContextFile('invalid json')
      );

      const result = await readSkillDescription('skill');

      expect(result).toBeNull();
    });
  });

  describe('searchSkills', () => {
    it('should search skills by query', async () => {
      mockedContextFs.grepContextFiles.mockResolvedValue([
        { path: '.cognia/context/skills/skill1.json', lineNumber: 1, content: 'code review' },
      ]);

      const skill: SkillDescriptionFile = {
        skillId: 'skill1', name: 'Code Review',
        shortDescription: 'Reviews code', fullDescription: 'Full',
        toolNames: [], keywords: ['code'], lastUpdated: new Date(),
      };

      mockedContextFs.readContextFile.mockResolvedValue(
        createMockContextFile(JSON.stringify(skill))
      );

      const result = await searchSkills('code review');

      expect(mockedContextFs.grepContextFiles).toHaveBeenCalledWith(
        'code review',
        expect.objectContaining({ category: 'skills', ignoreCase: true })
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Code Review');
    });

    it('should respect limit option', async () => {
      mockedContextFs.grepContextFiles.mockResolvedValue([]);

      await searchSkills('query', { limit: 5 });

      expect(mockedContextFs.grepContextFiles).toHaveBeenCalledWith(
        'query',
        expect.objectContaining({ limit: 5 })
      );
    });

    it('should deduplicate results by path', async () => {
      mockedContextFs.grepContextFiles.mockResolvedValue([
        { path: '.cognia/context/skills/skill1.json', lineNumber: 1, content: 'match1' },
        { path: '.cognia/context/skills/skill1.json', lineNumber: 5, content: 'match2' },
      ]);

      const skill: SkillDescriptionFile = {
        skillId: 'skill1', name: 'Skill 1',
        shortDescription: 'Desc', fullDescription: 'Full',
        toolNames: [], keywords: [], lastUpdated: new Date(),
      };

      mockedContextFs.readContextFile.mockResolvedValue(
        createMockContextFile(JSON.stringify(skill))
      );

      const result = await searchSkills('query');

      expect(result).toHaveLength(1);
    });
  });

  describe('getSkillRefs', () => {
    it('should return minimal skill references', async () => {
      mockedContextFs.searchContextFiles.mockResolvedValue([
        { id: 'skill1', category: 'skills', source: 'skill1', filename: 'skill1.json', tags: [], sizeBytes: 100, estimatedTokens: 25, createdAt: new Date(), accessedAt: new Date() },
      ]);

      const skill: SkillDescriptionFile = {
        skillId: 'skill1', name: 'Test Skill',
        shortDescription: 'This is a test skill description that is quite long and should be truncated',
        fullDescription: 'Full', toolNames: [],
        keywords: ['test', 'skill', 'keyword1', 'keyword2', 'keyword3', 'keyword4'],
        lastUpdated: new Date(),
      };

      mockedContextFs.readContextFile.mockResolvedValue(
        createMockContextFile(JSON.stringify(skill))
      );

      const result = await getSkillRefs();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'skill1',
        name: 'Test Skill',
      });
      expect(result[0].briefDescription.length).toBeLessThanOrEqual(80);
      expect(result[0].keywords.length).toBeLessThanOrEqual(5);
    });

    it('should handle empty skills list', async () => {
      mockedContextFs.searchContextFiles.mockResolvedValue([]);

      const result = await getSkillRefs();

      expect(result).toHaveLength(0);
    });

    it('should skip invalid skill files', async () => {
      mockedContextFs.searchContextFiles.mockResolvedValue([
        { id: 'skill1', category: 'skills', source: 'skill1', filename: 'skill1.json', tags: [], sizeBytes: 100, estimatedTokens: 25, createdAt: new Date(), accessedAt: new Date() },
        { id: 'skill2', category: 'skills', source: 'skill2', filename: 'skill2.json', tags: [], sizeBytes: 100, estimatedTokens: 25, createdAt: new Date(), accessedAt: new Date() },
      ]);

      const validSkill: SkillDescriptionFile = {
        skillId: 'skill1', name: 'Valid',
        shortDescription: 'Desc', fullDescription: 'Full',
        toolNames: [], keywords: [], lastUpdated: new Date(),
      };

      mockedContextFs.readContextFile
        .mockResolvedValueOnce(createMockContextFile(JSON.stringify(validSkill)))
        .mockResolvedValueOnce(createMockContextFile('invalid json'));

      const result = await getSkillRefs();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Valid');
    });
  });

  describe('generateSkillsStaticPrompt', () => {
    it('should return empty string for no refs', () => {
      const result = generateSkillsStaticPrompt([]);
      expect(result).toBe('');
    });

    it('should generate prompt with skill listings', () => {
      const refs: SkillRef[] = [
        { id: 'skill1', name: 'Code Review', briefDescription: 'Reviews code quality', keywords: ['code', 'review'] },
        { id: 'skill2', name: 'Data Analysis', briefDescription: 'Analyzes data', keywords: ['data'] },
      ];

      const result = generateSkillsStaticPrompt(refs);

      expect(result).toContain('## Agent Skills Available');
      expect(result).toContain('**Code Review**');
      expect(result).toContain('Reviews code quality');
      expect(result).toContain('Keywords: code, review');
      expect(result).toContain('grep_context');
      expect(result).toContain('read_context_file');
    });

    it('should handle skills without keywords', () => {
      const refs: SkillRef[] = [
        { id: 'skill1', name: 'Simple Skill', briefDescription: 'Does stuff', keywords: [] },
      ];

      const result = generateSkillsStaticPrompt(refs);

      expect(result).toContain('**Simple Skill**');
      expect(result).not.toContain('Keywords:');
    });
  });

  describe('discoverSkills', () => {
    it('should discover and rank skills by relevance', async () => {
      mockedContextFs.grepContextFiles.mockResolvedValue([
        { path: 'skill1.json', lineNumber: 1, content: 'code review' },
        { path: 'skill2.json', lineNumber: 1, content: 'data analysis' },
      ]);

      const skill1: SkillDescriptionFile = {
        skillId: 'skill1', name: 'Code Review',
        shortDescription: 'Reviews code quality', fullDescription: '',
        toolNames: [], keywords: ['code', 'review', 'quality'],
        lastUpdated: new Date(),
      };
      const skill2: SkillDescriptionFile = {
        skillId: 'skill2', name: 'Data Analysis',
        shortDescription: 'Analyzes data patterns', fullDescription: '',
        toolNames: [], keywords: ['data', 'analysis'],
        lastUpdated: new Date(),
      };

      mockedContextFs.readContextFile
        .mockResolvedValueOnce(createMockContextFile(JSON.stringify(skill1)))
        .mockResolvedValueOnce(createMockContextFile(JSON.stringify(skill2)));

      const result = await discoverSkills('code review');

      expect(result.length).toBeGreaterThan(0);
      // Code Review should rank higher for "code review" query
      expect(result[0].skill.name).toBe('Code Review');
      expect(result[0].relevanceScore).toBeGreaterThan(0);
    });

    it('should respect maxResults option', async () => {
      mockedContextFs.grepContextFiles.mockResolvedValue([
        { path: 'skill1.json', lineNumber: 1, content: 'test' },
        { path: 'skill2.json', lineNumber: 1, content: 'test' },
        { path: 'skill3.json', lineNumber: 1, content: 'test' },
      ]);

      const skill: SkillDescriptionFile = {
        skillId: 's', name: 'Skill',
        shortDescription: 'test', fullDescription: '',
        toolNames: [], keywords: ['test'],
        lastUpdated: new Date(),
      };

      mockedContextFs.readContextFile.mockResolvedValue(
        createMockContextFile(JSON.stringify(skill))
      );

      const result = await discoverSkills('test', { maxResults: 2 });

      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should filter out zero relevance results', async () => {
      mockedContextFs.grepContextFiles.mockResolvedValue([
        { path: 'skill1.json', lineNumber: 1, content: 'match' },
      ]);

      const skill: SkillDescriptionFile = {
        skillId: 's', name: 'Unrelated',
        shortDescription: 'unrelated content', fullDescription: '',
        toolNames: [], keywords: ['unrelated'],
        lastUpdated: new Date(),
      };

      mockedContextFs.readContextFile.mockResolvedValue(
        createMockContextFile(JSON.stringify(skill))
      );

      const result = await discoverSkills('completely different query words');

      expect(result.every(r => r.relevanceScore > 0)).toBe(true);
    });

    it('should give bonus for name matches', async () => {
      mockedContextFs.grepContextFiles.mockResolvedValue([
        { path: 'skill1.json', lineNumber: 1, content: 'test' },
        { path: 'skill2.json', lineNumber: 1, content: 'test' },
      ]);

      const skillWithNameMatch: SkillDescriptionFile = {
        skillId: 's1', name: 'Code Testing',
        shortDescription: 'Helps with tests', fullDescription: '',
        toolNames: [], keywords: ['testing'],
        lastUpdated: new Date(),
      };
      const skillWithoutNameMatch: SkillDescriptionFile = {
        skillId: 's2', name: 'Analysis',
        shortDescription: 'Tests and code review', fullDescription: '',
        toolNames: [], keywords: ['code'],
        lastUpdated: new Date(),
      };

      mockedContextFs.readContextFile
        .mockResolvedValueOnce(createMockContextFile(JSON.stringify(skillWithNameMatch)))
        .mockResolvedValueOnce(createMockContextFile(JSON.stringify(skillWithoutNameMatch)));

      const result = await discoverSkills('code');

      // Skill with name match should rank higher
      const nameMatchResult = result.find(r => r.skill.name === 'Code Testing');
      const noNameMatchResult = result.find(r => r.skill.name === 'Analysis');
      
      if (nameMatchResult && noNameMatchResult) {
        expect(nameMatchResult.relevanceScore).toBeGreaterThanOrEqual(noNameMatchResult.relevanceScore);
      }
    });

    it('should handle empty search results', async () => {
      mockedContextFs.grepContextFiles.mockResolvedValue([]);

      const result = await discoverSkills('nonexistent');

      expect(result).toHaveLength(0);
    });
  });
});
