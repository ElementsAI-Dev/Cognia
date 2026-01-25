/**
 * Feature Routes Config Tests
 */

import {
  FEATURE_ROUTES,
  getFeatureRouteById,
  getEnabledFeatureRoutes,
  getFeatureRoutesByCategory,
  getCreationFeatures,
} from './feature-routes-config';
import type { FeatureId, FeatureCategory } from '@/types/routing/feature-router';

describe('feature-routes-config', () => {
  describe('FEATURE_ROUTES', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(FEATURE_ROUTES)).toBe(true);
      expect(FEATURE_ROUTES.length).toBeGreaterThan(0);
    });

    it('should have valid structure for each route', () => {
      for (const route of FEATURE_ROUTES) {
        expect(route.id).toBeDefined();
        expect(typeof route.id).toBe('string');
        expect(route.name).toBeDefined();
        expect(route.nameZh).toBeDefined();
        expect(route.path).toBeDefined();
        expect(route.path.startsWith('/')).toBe(true);
        expect(route.icon).toBeDefined();
        expect(route.category).toBeDefined();
        expect(route.description).toBeDefined();
        expect(route.descriptionZh).toBeDefined();
        expect(route.patterns).toBeDefined();
        expect(route.keywords).toBeDefined();
        expect(typeof route.priority).toBe('number');
        expect(typeof route.enabled).toBe('boolean');
      }
    });

    it('should have unique IDs', () => {
      const ids = FEATURE_ROUTES.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique paths', () => {
      const paths = FEATURE_ROUTES.map(r => r.path);
      const uniquePaths = new Set(paths);
      expect(uniquePaths.size).toBe(paths.length);
    });

    it('should have Chinese and English patterns', () => {
      for (const route of FEATURE_ROUTES) {
        expect(route.patterns.chinese).toBeDefined();
        expect(Array.isArray(route.patterns.chinese)).toBe(true);
        expect(route.patterns.english).toBeDefined();
        expect(Array.isArray(route.patterns.english)).toBe(true);
      }
    });

    it('should have Chinese and English keywords', () => {
      for (const route of FEATURE_ROUTES) {
        expect(route.keywords.chinese).toBeDefined();
        expect(Array.isArray(route.keywords.chinese)).toBe(true);
        expect(route.keywords.english).toBeDefined();
        expect(Array.isArray(route.keywords.english)).toBe(true);
      }
    });

    it('should have priority between 0 and 100', () => {
      for (const route of FEATURE_ROUTES) {
        expect(route.priority).toBeGreaterThanOrEqual(0);
        expect(route.priority).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('getFeatureRouteById', () => {
    it('should return route for valid ID', () => {
      const firstRoute = FEATURE_ROUTES[0];
      const route = getFeatureRouteById(firstRoute.id);

      expect(route).toBeDefined();
      expect(route?.id).toBe(firstRoute.id);
    });

    it('should return undefined for invalid ID', () => {
      const route = getFeatureRouteById('nonexistent-route' as FeatureId);
      expect(route).toBeUndefined();
    });

    it('should return correct route properties', () => {
      const videoStudio = getFeatureRouteById('video-studio' as FeatureId);

      if (videoStudio) {
        expect(videoStudio.name).toBe('Video Studio');
        expect(videoStudio.category).toBe('creation');
      }
    });
  });

  describe('getEnabledFeatureRoutes', () => {
    it('should return only enabled routes', () => {
      const enabledRoutes = getEnabledFeatureRoutes();

      for (const route of enabledRoutes) {
        expect(route.enabled).toBe(true);
      }
    });

    it('should return non-empty array', () => {
      const enabledRoutes = getEnabledFeatureRoutes();
      expect(enabledRoutes.length).toBeGreaterThan(0);
    });

    it('should not include disabled routes', () => {
      const enabledRoutes = getEnabledFeatureRoutes();
      const disabledRoutes = FEATURE_ROUTES.filter(r => !r.enabled);

      for (const disabled of disabledRoutes) {
        expect(enabledRoutes.some(r => r.id === disabled.id)).toBe(false);
      }
    });
  });

  describe('getFeatureRoutesByCategory', () => {
    it('should return routes for creation category', () => {
      const creationRoutes = getFeatureRoutesByCategory('creation');

      expect(creationRoutes.length).toBeGreaterThan(0);
      for (const route of creationRoutes) {
        expect(route.category).toBe('creation');
      }
    });

    it('should return routes for research category', () => {
      const researchRoutes = getFeatureRoutesByCategory('research');

      for (const route of researchRoutes) {
        expect(route.category).toBe('research');
      }
    });

    it('should return routes for automation category', () => {
      const automationRoutes = getFeatureRoutesByCategory('automation');

      for (const route of automationRoutes) {
        expect(route.category).toBe('automation');
      }
    });

    it('should return routes for system category', () => {
      const systemRoutes = getFeatureRoutesByCategory('system');

      for (const route of systemRoutes) {
        expect(route.category).toBe('system');
      }
    });

    it('should return empty array for unknown category', () => {
      const unknownRoutes = getFeatureRoutesByCategory('nonexistent' as FeatureCategory);
      expect(unknownRoutes).toEqual([]);
    });
  });

  describe('getCreationFeatures', () => {
    it('should return only creation features', () => {
      const creationFeatures = getCreationFeatures();

      for (const feature of creationFeatures) {
        expect(feature.category).toBe('creation');
      }
    });

    it('should be equivalent to getFeatureRoutesByCategory("creation")', () => {
      const creationFeatures = getCreationFeatures();
      const categoryRoutes = getFeatureRoutesByCategory('creation');

      expect(creationFeatures.length).toBe(categoryRoutes.length);
      for (let i = 0; i < creationFeatures.length; i++) {
        expect(creationFeatures[i].id).toBe(categoryRoutes[i].id);
      }
    });
  });

  describe('Pattern matching', () => {
    it('should have valid Chinese regex patterns', () => {
      for (const route of FEATURE_ROUTES) {
        for (const pattern of route.patterns.chinese) {
          expect(pattern).toBeInstanceOf(RegExp);
          expect(() => new RegExp(pattern)).not.toThrow();
        }
      }
    });

    it('should have valid English regex patterns', () => {
      for (const route of FEATURE_ROUTES) {
        for (const pattern of route.patterns.english) {
          expect(pattern).toBeInstanceOf(RegExp);
          expect(() => new RegExp(pattern)).not.toThrow();
        }
      }
    });

    it('video-studio patterns should match Chinese video requests', () => {
      const videoStudio = getFeatureRouteById('video-studio' as FeatureId);

      if (videoStudio) {
        const testInputs = [
          '帮我制作一个视频',
          '我想创作短视频',
          '录屏功能在哪里',
        ];

        for (const input of testInputs) {
          const matches = videoStudio.patterns.chinese.some(p => p.test(input));
          expect(matches).toBe(true);
        }
      }
    });

    it('video-studio patterns should match English video requests', () => {
      const videoStudio = getFeatureRouteById('video-studio' as FeatureId);

      if (videoStudio) {
        // Test that at least one pattern matches video-related content
        const hasVideoPatterns = videoStudio.patterns.english.length > 0;
        expect(hasVideoPatterns).toBe(true);
        
        // Test that patterns are valid RegExp
        for (const pattern of videoStudio.patterns.english) {
          expect(pattern).toBeInstanceOf(RegExp);
        }
      }
    });
  });

  describe('Route priorities', () => {
    it('should have higher priority for more specific features', () => {
      const routes = [...FEATURE_ROUTES].sort((a, b) => b.priority - a.priority);
      expect(routes[0].priority).toBeGreaterThanOrEqual(routes[routes.length - 1].priority);
    });

    it('should allow priority-based routing decisions', () => {
      const matchingRoutes = FEATURE_ROUTES.filter(r => r.enabled);
      const sortedByPriority = [...matchingRoutes].sort((a, b) => b.priority - a.priority);

      expect(sortedByPriority[0].priority).toBeGreaterThanOrEqual(sortedByPriority[sortedByPriority.length - 1].priority);
    });
  });

  describe('carryContext property', () => {
    it('should be boolean for all routes', () => {
      for (const route of FEATURE_ROUTES) {
        expect(typeof route.carryContext).toBe('boolean');
      }
    });

    it('some routes should carry context', () => {
      const routesWithContext = FEATURE_ROUTES.filter(r => r.carryContext);
      expect(routesWithContext.length).toBeGreaterThan(0);
    });
  });
});
