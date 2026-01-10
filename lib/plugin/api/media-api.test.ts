/**
 * Tests for Media Plugin API - Registry Functions
 */

import {
  getMediaRegistry,
  type ImageFilterDefinition,
  type VideoEffectDefinition,
  type VideoTransitionDefinition,
} from './media-api';

describe('Media Registry', () => {
  const testPluginId = 'test-plugin';

  // Helper to create prefixed IDs
  const prefixId = (id: string) => `${testPluginId}:${id}`;

  // Cleanup after each test
  afterEach(() => {
    const registry = getMediaRegistry();
    // Clean up test filters
    registry.getAllFilters().forEach((f: ImageFilterDefinition) => {
      if (f.id.startsWith(`${testPluginId}:`)) {
        registry.unregisterFilter(f.id);
      }
    });
    // Clean up test effects
    registry.getAllEffects().forEach((e: VideoEffectDefinition) => {
      if (e.id.startsWith(`${testPluginId}:`)) {
        registry.unregisterEffect(e.id);
      }
    });
    // Clean up test transitions
    registry.getAllTransitions().forEach((t: VideoTransitionDefinition) => {
      if (t.id.startsWith(`${testPluginId}:`)) {
        registry.unregisterTransition(t.id);
      }
    });
  });

  describe('Filter Registry', () => {
    const createTestFilter = (id: string): ImageFilterDefinition => ({
      id: id,
      name: `Test Filter ${id}`,
      description: 'A test filter',
      category: 'color',
      parameters: [
        { id: 'amount', name: 'Amount', type: 'number', default: 50, min: 0, max: 100 },
      ],
      apply: (imageData) => imageData,
    });

    it('should register a filter', () => {
      const registry = getMediaRegistry();
      const filter = createTestFilter('my-filter');

      registry.registerFilter(testPluginId, filter);

      const registered = registry.getFilter(prefixId('my-filter'));
      expect(registered).toBeDefined();
      expect(registered?.name).toBe('Test Filter my-filter');
    });

    it('should unregister a filter', () => {
      const registry = getMediaRegistry();
      const filter = createTestFilter('to-remove');

      registry.registerFilter(testPluginId, filter);
      registry.unregisterFilter(prefixId('to-remove'));

      const result = registry.getFilter(prefixId('to-remove'));
      expect(result).toBeUndefined();
    });

    it('should get all filters', () => {
      const registry = getMediaRegistry();
      registry.registerFilter(testPluginId, createTestFilter('filter-1'));
      registry.registerFilter(testPluginId, createTestFilter('filter-2'));

      const filters = registry.getAllFilters();

      expect(Array.isArray(filters)).toBe(true);
      expect(filters.length).toBeGreaterThanOrEqual(2);
    });

    it('should get filters by category', () => {
      const registry = getMediaRegistry();
      const colorFilter: ImageFilterDefinition = {
        ...createTestFilter('color-filter'),
        category: 'color',
      };
      const stylizeFilter: ImageFilterDefinition = {
        ...createTestFilter('stylize-filter'),
        category: 'stylize',
      };

      registry.registerFilter(testPluginId, colorFilter);
      registry.registerFilter(testPluginId, stylizeFilter);

      const colorFilters = registry.getFiltersByCategory('color');
      const stylizeFilters = registry.getFiltersByCategory('stylize');

      expect(colorFilters.some((f: ImageFilterDefinition) => f.id === prefixId('color-filter'))).toBe(true);
      expect(stylizeFilters.some((f: ImageFilterDefinition) => f.id === prefixId('stylize-filter'))).toBe(true);
    });

    it('should return undefined for non-existent filter', () => {
      const registry = getMediaRegistry();

      const result = registry.getFilter('non-existent-filter');

      expect(result).toBeUndefined();
    });
  });

  describe('Effect Registry', () => {
    const createTestEffect = (id: string): VideoEffectDefinition => ({
      id: id,
      name: `Test Effect ${id}`,
      description: 'A test video effect',
      category: 'color',
      parameters: [
        { id: 'intensity', name: 'Intensity', type: 'number', default: 100, min: 0, max: 100 },
      ],
      apply: (frame) => frame,
    });

    it('should register an effect', () => {
      const registry = getMediaRegistry();
      const effect = createTestEffect('my-effect');

      registry.registerEffect(testPluginId, effect);

      const registered = registry.getEffect(prefixId('my-effect'));
      expect(registered).toBeDefined();
      expect(registered?.name).toBe('Test Effect my-effect');
    });

    it('should unregister an effect', () => {
      const registry = getMediaRegistry();
      const effect = createTestEffect('to-remove');

      registry.registerEffect(testPluginId, effect);
      registry.unregisterEffect(prefixId('to-remove'));

      const result = registry.getEffect(prefixId('to-remove'));
      expect(result).toBeUndefined();
    });

    it('should get all effects', () => {
      const registry = getMediaRegistry();
      registry.registerEffect(testPluginId, createTestEffect('effect-1'));
      registry.registerEffect(testPluginId, createTestEffect('effect-2'));

      const effects = registry.getAllEffects();

      expect(Array.isArray(effects)).toBe(true);
      expect(effects.length).toBeGreaterThanOrEqual(2);
    });

    it('should return undefined for non-existent effect', () => {
      const registry = getMediaRegistry();

      const result = registry.getEffect('non-existent-effect');

      expect(result).toBeUndefined();
    });
  });

  describe('Transition Registry', () => {
    const createTestTransition = (id: string): VideoTransitionDefinition => ({
      id: id,
      name: `Test Transition ${id}`,
      description: 'A test transition',
      minDuration: 0.1,
      maxDuration: 5,
      defaultDuration: 1,
      render: (from) => from,
    });

    it('should register a transition', () => {
      const registry = getMediaRegistry();
      const transition = createTestTransition('my-transition');

      registry.registerTransition(testPluginId, transition);

      const registered = registry.getTransition(prefixId('my-transition'));
      expect(registered).toBeDefined();
      expect(registered?.name).toBe('Test Transition my-transition');
    });

    it('should unregister a transition', () => {
      const registry = getMediaRegistry();
      const transition = createTestTransition('to-remove');

      registry.registerTransition(testPluginId, transition);
      registry.unregisterTransition(prefixId('to-remove'));

      const result = registry.getTransition(prefixId('to-remove'));
      expect(result).toBeUndefined();
    });

    it('should get all transitions', () => {
      const registry = getMediaRegistry();
      registry.registerTransition(testPluginId, createTestTransition('transition-1'));
      registry.registerTransition(testPluginId, createTestTransition('transition-2'));

      const transitions = registry.getAllTransitions();

      expect(Array.isArray(transitions)).toBe(true);
      expect(transitions.length).toBeGreaterThanOrEqual(2);
    });

    it('should return undefined for non-existent transition', () => {
      const registry = getMediaRegistry();

      const result = registry.getTransition('non-existent-transition');

      expect(result).toBeUndefined();
    });
  });

  describe('Registry Singleton', () => {
    it('should return the same registry instance', () => {
      const registry1 = getMediaRegistry();
      const registry2 = getMediaRegistry();

      expect(registry1).toBe(registry2);
    });

    it('should persist registrations across calls', () => {
      const registry1 = getMediaRegistry();
      const filter: ImageFilterDefinition = {
        id: 'persistent-filter',
        name: 'Persistent Filter',
        category: 'color',
        apply: (img) => img,
      };

      registry1.registerFilter(testPluginId, filter);

      const registry2 = getMediaRegistry();
      const retrieved = registry2.getFilter(prefixId('persistent-filter'));

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Persistent Filter');
    });
  });
});
