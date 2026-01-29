/**
 * Skill Marketplace Types Tests
 */

import {
  DEFAULT_SKILLS_MARKETPLACE_FILTERS,
  SKILLS_MARKETPLACE_SORT_OPTIONS,
  getSkillsSortLabel,
  formatSkillsStarCount,
  formatSkillsDownloadCount,
  formatSkillsRelativeTime,
} from './skill-marketplace';

describe('Skill Marketplace Types', () => {
  describe('DEFAULT_SKILLS_MARKETPLACE_FILTERS', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_SKILLS_MARKETPLACE_FILTERS.query).toBe('');
      expect(DEFAULT_SKILLS_MARKETPLACE_FILTERS.sortBy).toBe('stars');
      expect(DEFAULT_SKILLS_MARKETPLACE_FILTERS.page).toBe(1);
      expect(DEFAULT_SKILLS_MARKETPLACE_FILTERS.limit).toBe(20);
      expect(DEFAULT_SKILLS_MARKETPLACE_FILTERS.useAiSearch).toBe(false);
    });
  });

  describe('SKILLS_MARKETPLACE_SORT_OPTIONS', () => {
    it('should contain all sort options', () => {
      expect(SKILLS_MARKETPLACE_SORT_OPTIONS).toContain('stars');
      expect(SKILLS_MARKETPLACE_SORT_OPTIONS).toContain('recent');
      expect(SKILLS_MARKETPLACE_SORT_OPTIONS).toHaveLength(2);
    });
  });

  describe('getSkillsSortLabel', () => {
    it('should return correct label for stars', () => {
      expect(getSkillsSortLabel('stars')).toBe('Most Stars');
    });

    it('should return correct label for recent', () => {
      expect(getSkillsSortLabel('recent')).toBe('Recently Updated');
    });

    it('should return default label for unknown sort', () => {
      // @ts-expect-error testing unknown sort
      expect(getSkillsSortLabel('unknown')).toBe('Most Stars');
    });
  });

  describe('formatSkillsStarCount', () => {
    it('should format numbers under 1000', () => {
      expect(formatSkillsStarCount(0)).toBe('0');
      expect(formatSkillsStarCount(1)).toBe('1');
      expect(formatSkillsStarCount(999)).toBe('999');
    });

    it('should format thousands with K suffix', () => {
      expect(formatSkillsStarCount(1000)).toBe('1.0K');
      expect(formatSkillsStarCount(1500)).toBe('1.5K');
      expect(formatSkillsStarCount(10000)).toBe('10.0K');
      expect(formatSkillsStarCount(999999)).toBe('1000.0K');
    });

    it('should format millions with M suffix', () => {
      expect(formatSkillsStarCount(1000000)).toBe('1.0M');
      expect(formatSkillsStarCount(1500000)).toBe('1.5M');
      expect(formatSkillsStarCount(10000000)).toBe('10.0M');
    });
  });

  describe('formatSkillsDownloadCount', () => {
    it('should format numbers under 1000', () => {
      expect(formatSkillsDownloadCount(0)).toBe('0');
      expect(formatSkillsDownloadCount(500)).toBe('500');
    });

    it('should format thousands with K suffix', () => {
      expect(formatSkillsDownloadCount(2000)).toBe('2.0K');
      expect(formatSkillsDownloadCount(50000)).toBe('50.0K');
    });

    it('should format millions with M suffix', () => {
      expect(formatSkillsDownloadCount(5000000)).toBe('5.0M');
    });
  });

  describe('formatSkillsRelativeTime', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return "Today" for same day', () => {
      expect(formatSkillsRelativeTime('2024-06-15T10:00:00Z')).toBe('Today');
    });

    it('should return "Yesterday" for previous day', () => {
      expect(formatSkillsRelativeTime('2024-06-14T12:00:00Z')).toBe('Yesterday');
    });

    it('should return days ago for less than a week', () => {
      expect(formatSkillsRelativeTime('2024-06-12T12:00:00Z')).toBe('3 days ago');
      expect(formatSkillsRelativeTime('2024-06-10T12:00:00Z')).toBe('5 days ago');
    });

    it('should return weeks ago for less than a month', () => {
      expect(formatSkillsRelativeTime('2024-06-01T12:00:00Z')).toBe('2 weeks ago');
      expect(formatSkillsRelativeTime('2024-05-25T12:00:00Z')).toBe('3 weeks ago');
    });

    it('should return months ago for less than a year', () => {
      expect(formatSkillsRelativeTime('2024-03-15T12:00:00Z')).toBe('3 months ago');
      expect(formatSkillsRelativeTime('2024-01-15T12:00:00Z')).toBe('5 months ago');
    });

    it('should return years ago for more than a year', () => {
      expect(formatSkillsRelativeTime('2023-01-15T12:00:00Z')).toBe('1 years ago');
      expect(formatSkillsRelativeTime('2022-01-15T12:00:00Z')).toBe('2 years ago');
    });

    it('should return original string for invalid date', () => {
      expect(formatSkillsRelativeTime('invalid-date')).toBe('invalid-date');
    });
  });
});
