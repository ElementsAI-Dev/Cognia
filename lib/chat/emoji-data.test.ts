/**
 * Emoji Data Tests
 */

import {
  EMOJI_DATA,
  FREQUENT_EMOJIS,
  EMOJI_CATEGORY_LABELS,
  getEmojiByName,
  searchEmojis,
  getEmojisByCategory,
  getGroupedEmojis,
} from './emoji-data';

describe('Emoji Data', () => {
  describe('EMOJI_DATA', () => {
    it('should contain emoji entries', () => {
      expect(EMOJI_DATA.length).toBeGreaterThan(0);
    });

    it('should have valid emoji structure', () => {
      const firstEmoji = EMOJI_DATA[0];
      expect(firstEmoji).toHaveProperty('emoji');
      expect(firstEmoji).toHaveProperty('name');
      expect(firstEmoji).toHaveProperty('keywords');
      expect(firstEmoji).toHaveProperty('category');
      expect(Array.isArray(firstEmoji.keywords)).toBe(true);
    });

    it('should have unique names', () => {
      const names = EMOJI_DATA.map((e) => e.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('FREQUENT_EMOJIS', () => {
    it('should contain common emojis', () => {
      expect(FREQUENT_EMOJIS.length).toBeGreaterThan(0);
    });

    it('should include thumbsup emoji', () => {
      const hasThumbsup = FREQUENT_EMOJIS.some((e) => e.name === 'thumbsup');
      expect(hasThumbsup).toBe(true);
    });

    it('should include heart emoji', () => {
      const hasHeart = FREQUENT_EMOJIS.some((e) => e.name === 'heart');
      expect(hasHeart).toBe(true);
    });
  });

  describe('EMOJI_CATEGORY_LABELS', () => {
    it('should have labels for all categories', () => {
      const categories = ['smileys', 'people', 'animals', 'food', 'activities', 'travel', 'objects', 'symbols', 'flags'];
      for (const category of categories) {
        expect(EMOJI_CATEGORY_LABELS[category as keyof typeof EMOJI_CATEGORY_LABELS]).toBeDefined();
      }
    });

    it('should have human-readable labels', () => {
      expect(EMOJI_CATEGORY_LABELS.smileys).toBe('Smileys & Emotion');
      expect(EMOJI_CATEGORY_LABELS.people).toBe('People & Body');
    });
  });

  describe('getEmojiByName', () => {
    it('should find emoji by exact name', () => {
      const emoji = getEmojiByName('thumbsup');
      expect(emoji).toBeDefined();
      expect(emoji?.emoji).toBe('👍');
    });

    it('should be case insensitive', () => {
      const emoji = getEmojiByName('THUMBSUP');
      expect(emoji).toBeDefined();
      expect(emoji?.name).toBe('thumbsup');
    });

    it('should return undefined for non-existent name', () => {
      const emoji = getEmojiByName('nonexistent');
      expect(emoji).toBeUndefined();
    });

    it('should find commonly used emojis', () => {
      expect(getEmojiByName('smile')).toBeDefined();
      expect(getEmojiByName('heart')).toBeDefined();
      expect(getEmojiByName('fire')).toBeDefined();
      expect(getEmojiByName('rocket')).toBeDefined();
    });
  });

  describe('searchEmojis', () => {
    it('should return all emojis for empty query with limit', () => {
      const results = searchEmojis('', 10);
      expect(results.length).toBe(10);
    });

    it('should find emojis by name', () => {
      const results = searchEmojis('smile');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((e) => e.name.includes('smile'))).toBe(true);
    });

    it('should find emojis by keyword', () => {
      const results = searchEmojis('happy');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should prioritize exact name matches', () => {
      const results = searchEmojis('joy');
      expect(results[0].name).toBe('joy');
    });

    it('should respect limit parameter', () => {
      const results = searchEmojis('a', 5);
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should use default limit of 20', () => {
      const results = searchEmojis('');
      expect(results.length).toBe(20);
    });

    it('should find emojis starting with query', () => {
      const results = searchEmojis('smil');
      expect(results.some((e) => e.name.startsWith('smil'))).toBe(true);
    });

    it('should be case insensitive', () => {
      const results1 = searchEmojis('FIRE');
      const results2 = searchEmojis('fire');
      expect(results1.length).toBe(results2.length);
    });

    it('should search in keywords', () => {
      const results = searchEmojis('lol');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('getEmojisByCategory', () => {
    it('should return emojis for smileys category', () => {
      const smileys = getEmojisByCategory('smileys');
      expect(smileys.length).toBeGreaterThan(0);
      expect(smileys.every((e) => e.category === 'smileys')).toBe(true);
    });

    it('should return emojis for people category', () => {
      const people = getEmojisByCategory('people');
      expect(people.length).toBeGreaterThan(0);
      expect(people.every((e) => e.category === 'people')).toBe(true);
    });

    it('should return emojis for animals category', () => {
      const animals = getEmojisByCategory('animals');
      expect(animals.length).toBeGreaterThan(0);
      expect(animals.every((e) => e.category === 'animals')).toBe(true);
    });

    it('should return emojis for food category', () => {
      const food = getEmojisByCategory('food');
      expect(food.length).toBeGreaterThan(0);
      expect(food.every((e) => e.category === 'food')).toBe(true);
    });

    it('should return emojis for activities category', () => {
      const activities = getEmojisByCategory('activities');
      expect(activities.length).toBeGreaterThan(0);
      expect(activities.every((e) => e.category === 'activities')).toBe(true);
    });

    it('should return emojis for travel category', () => {
      const travel = getEmojisByCategory('travel');
      expect(travel.length).toBeGreaterThan(0);
      expect(travel.every((e) => e.category === 'travel')).toBe(true);
    });

    it('should return emojis for objects category', () => {
      const objects = getEmojisByCategory('objects');
      expect(objects.length).toBeGreaterThan(0);
      expect(objects.every((e) => e.category === 'objects')).toBe(true);
    });

    it('should return emojis for symbols category', () => {
      const symbols = getEmojisByCategory('symbols');
      expect(symbols.length).toBeGreaterThan(0);
      expect(symbols.every((e) => e.category === 'symbols')).toBe(true);
    });

    it('should return emojis for flags category', () => {
      const flags = getEmojisByCategory('flags');
      expect(flags.length).toBeGreaterThan(0);
      expect(flags.every((e) => e.category === 'flags')).toBe(true);
    });

    it('should return empty array for invalid category', () => {
      const invalid = getEmojisByCategory('invalid' as never);
      expect(invalid).toEqual([]);
    });
  });

  describe('getGroupedEmojis', () => {
    it('should return a Map', () => {
      const grouped = getGroupedEmojis();
      expect(grouped).toBeInstanceOf(Map);
    });

    it('should have all categories', () => {
      const grouped = getGroupedEmojis();
      expect(grouped.has('smileys')).toBe(true);
      expect(grouped.has('people')).toBe(true);
      expect(grouped.has('animals')).toBe(true);
      expect(grouped.has('food')).toBe(true);
      expect(grouped.has('activities')).toBe(true);
      expect(grouped.has('travel')).toBe(true);
      expect(grouped.has('objects')).toBe(true);
      expect(grouped.has('symbols')).toBe(true);
      expect(grouped.has('flags')).toBe(true);
    });

    it('should have correct emojis in each category', () => {
      const grouped = getGroupedEmojis();
      
      const smileys = grouped.get('smileys');
      expect(smileys).toBeDefined();
      expect(smileys!.every((e) => e.category === 'smileys')).toBe(true);
    });

    it('should contain all emojis', () => {
      const grouped = getGroupedEmojis();
      
      let totalCount = 0;
      for (const emojis of grouped.values()) {
        totalCount += emojis.length;
      }
      
      expect(totalCount).toBe(EMOJI_DATA.length);
    });
  });
});
