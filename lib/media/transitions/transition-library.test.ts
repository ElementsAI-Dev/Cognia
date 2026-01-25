/**
 * Tests for Transition Library
 */

import {
  TransitionLibrary,
  getTransitionLibrary,
  getTransitionCategories,
} from './transition-library';

describe('TransitionLibrary', () => {
  let library: TransitionLibrary;

  beforeEach(() => {
    library = new TransitionLibrary();
  });

  describe('built-in transitions', () => {
    it('should have built-in transitions', () => {
      const all = library.getAllTransitions();
      expect(all.length).toBeGreaterThan(0);
    });

    it('should have basic transitions', () => {
      const basic = library.getByCategory('basic');
      expect(basic.length).toBeGreaterThan(0);
      expect(basic.some((t) => t.id === 'fade')).toBe(true);
      expect(basic.some((t) => t.id === 'wipe')).toBe(true);
    });

    it('should have 3D transitions', () => {
      const transitions3d = library.getByCategory('3d');
      expect(transitions3d.length).toBeGreaterThan(0);
      expect(transitions3d.some((t) => t.id === 'cube')).toBe(true);
      expect(transitions3d.some((t) => t.id === 'flip')).toBe(true);
    });

    it('should have lens transitions', () => {
      const lens = library.getByCategory('lens');
      expect(lens.length).toBeGreaterThan(0);
      expect(lens.some((t) => t.id === 'iris')).toBe(true);
    });

    it('should have distortion transitions', () => {
      const distortion = library.getByCategory('distortion');
      expect(distortion.length).toBeGreaterThan(0);
      expect(distortion.some((t) => t.id === 'ripple')).toBe(true);
      expect(distortion.some((t) => t.id === 'glitch')).toBe(true);
    });
  });

  describe('transition retrieval', () => {
    it('should get transition by ID', () => {
      const fade = library.getById('fade');
      expect(fade).toBeDefined();
      expect(fade?.name).toBe('Fade');
      expect(fade?.category).toBe('basic');
    });

    it('should return undefined for unknown ID', () => {
      const unknown = library.getById('unknown-transition');
      expect(unknown).toBeUndefined();
    });

    it('should search transitions', () => {
      const results = library.search('fade');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name.toLowerCase()).toContain('fade');
    });

    it('should search in description', () => {
      const results = library.search('crossfade');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('transition instances', () => {
    it('should create transition instance', () => {
      const instance = library.createInstance('fade', 'clip-a', 'clip-b', 1000);

      expect(instance).not.toBeNull();
      expect(instance?.transitionId).toBe('fade');
      expect(instance?.clipAId).toBe('clip-a');
      expect(instance?.clipBId).toBe('clip-b');
      expect(instance?.startTime).toBe(1000);
    });

    it('should use default duration from definition', () => {
      const fade = library.getById('fade');
      const instance = library.createInstance('fade', 'clip-a', 'clip-b', 0);

      expect(instance?.duration).toBe(fade?.defaultDuration);
    });

    it('should allow custom duration', () => {
      const instance = library.createInstance('fade', 'clip-a', 'clip-b', 0, {
        duration: 1000,
      });

      expect(instance?.duration).toBe(1000);
    });

    it('should set default parameters', () => {
      const instance = library.createInstance('wipe', 'clip-a', 'clip-b', 0);

      expect(instance?.parameters).toBeDefined();
      expect(instance?.parameters.softEdge).toBeDefined();
    });

    it('should allow custom parameters', () => {
      const instance = library.createInstance('wipe', 'clip-a', 'clip-b', 0, {
        parameters: { softEdge: 0.1 },
      });

      expect(instance?.parameters.softEdge).toBe(0.1);
    });

    it('should return null for unknown transition', () => {
      const instance = library.createInstance('unknown', 'clip-a', 'clip-b', 0);
      expect(instance).toBeNull();
    });
  });

  describe('custom transitions', () => {
    it('should register custom transition', () => {
      const custom = library.registerCustom({
        name: 'My Transition',
        description: 'A custom transition',
        category: 'custom',
        defaultDuration: 500,
        minDuration: 100,
        maxDuration: 2000,
        supportsDirection: false,
        parameters: [],
        isBuiltIn: false,
      });

      expect(custom.id).toContain('custom_');
      expect(library.getById(custom.id)).toBeDefined();
    });

    it('should remove custom transition', () => {
      const custom = library.registerCustom({
        name: 'To Remove',
        description: 'Will be removed',
        category: 'custom',
        defaultDuration: 500,
        minDuration: 100,
        maxDuration: 2000,
        supportsDirection: false,
        parameters: [],
        isBuiltIn: false,
      });

      const removed = library.removeCustom(custom.id);
      expect(removed).toBe(true);
      expect(library.getById(custom.id)).toBeUndefined();
    });
  });

  describe('validation', () => {
    it('should validate valid instance', () => {
      const instance = library.createInstance('fade', 'clip-a', 'clip-b', 0);
      const validation = library.validateInstance(instance!);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect duration below minimum', () => {
      const instance = library.createInstance('fade', 'clip-a', 'clip-b', 0, {
        duration: 10,
      });
      const validation = library.validateInstance(instance!);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should detect duration above maximum', () => {
      const instance = library.createInstance('fade', 'clip-a', 'clip-b', 0, {
        duration: 999999,
      });
      const validation = library.validateInstance(instance!);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('categories', () => {
    it('should get categories with counts', () => {
      const categories = library.getCategories();

      expect(categories.length).toBeGreaterThan(0);
      expect(categories.find((c) => c.category === 'basic')?.count).toBeGreaterThan(0);
    });
  });
});

describe('getTransitionLibrary', () => {
  it('should return singleton instance', () => {
    const lib1 = getTransitionLibrary();
    const lib2 = getTransitionLibrary();
    expect(lib1).toBe(lib2);
  });
});

describe('getTransitionCategories', () => {
  it('should return all category types', () => {
    const categories = getTransitionCategories();
    expect(categories).toContain('basic');
    expect(categories).toContain('3d');
    expect(categories).toContain('lens');
    expect(categories).toContain('distortion');
    expect(categories).toContain('blend');
    expect(categories).toContain('mask');
    expect(categories).toContain('custom');
  });
});
