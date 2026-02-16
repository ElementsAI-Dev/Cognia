import { WIN_REASONS, CATEGORY_IDS, ARENA_KNOWN_MODELS } from './constants';

describe('arena constants', () => {
  describe('ARENA_KNOWN_MODELS', () => {
    it('should have at least one entry', () => {
      expect(ARENA_KNOWN_MODELS.length).toBeGreaterThan(0);
    });

    it('should have required fields for every entry', () => {
      for (const entry of ARENA_KNOWN_MODELS) {
        expect(entry.provider).toBeTruthy();
        expect(entry.model).toBeTruthy();
        expect(entry.displayName).toBeTruthy();
      }
    });

    it('should have unique provider:model combinations', () => {
      const ids = ARENA_KNOWN_MODELS.map((e) => `${e.provider}:${e.model}`);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should include known major providers', () => {
      const providers = new Set(ARENA_KNOWN_MODELS.map((e) => e.provider));
      expect(providers.has('openai')).toBe(true);
      expect(providers.has('anthropic')).toBe(true);
      expect(providers.has('google')).toBe(true);
    });

    it('should have displayName without provider prefix', () => {
      for (const entry of ARENA_KNOWN_MODELS) {
        expect(entry.displayName).not.toContain(':');
      }
    });
  });

  describe('WIN_REASONS', () => {
    it('should contain expected win reasons', () => {
      expect(WIN_REASONS).toContain('quality');
      expect(WIN_REASONS).toContain('accuracy');
      expect(WIN_REASONS).toContain('clarity');
      expect(WIN_REASONS).toContain('speed');
      expect(WIN_REASONS).toContain('completeness');
      expect(WIN_REASONS).toContain('creativity');
      expect(WIN_REASONS).toContain('conciseness');
      expect(WIN_REASONS).toContain('other');
    });

    it('should have exactly 8 reasons', () => {
      expect(WIN_REASONS).toHaveLength(8);
    });

    it('should not contain both-bad (that is a special case)', () => {
      expect(WIN_REASONS).not.toContain('both-bad');
    });
  });

  describe('CATEGORY_IDS', () => {
    it('should start with "all"', () => {
      expect(CATEGORY_IDS[0]).toBe('all');
    });

    it('should contain task categories', () => {
      expect(CATEGORY_IDS).toContain('coding');
      expect(CATEGORY_IDS).toContain('math');
      expect(CATEGORY_IDS).toContain('analysis');
      expect(CATEGORY_IDS).toContain('creative');
      expect(CATEGORY_IDS).toContain('research');
      expect(CATEGORY_IDS).toContain('translation');
    });

    it('should have 7 entries (all + 6 categories)', () => {
      expect(CATEGORY_IDS).toHaveLength(7);
    });
  });
});
