/**
 * Feature Router Tests
 * 
 * Tests for the intelligent feature routing system
 */

import {
  detectFeatureIntentRuleBased,
  mightTriggerFeatureRouting,
  buildFeatureNavigationUrl,
  FEATURE_ROUTES,
  getFeatureRouteById,
  getEnabledFeatureRoutes,
} from './index';
import type { FeatureRoutingSettings } from '@/types/routing/feature-router';
import { DEFAULT_FEATURE_ROUTING_SETTINGS } from '@/types/routing/feature-router';

describe('Feature Router', () => {
  describe('detectFeatureIntentRuleBased', () => {
    const defaultSettings: FeatureRoutingSettings = {
      ...DEFAULT_FEATURE_ROUTING_SETTINGS,
      confidenceThreshold: 0.3,
    };

    describe('Video Studio detection', () => {
      it('should detect video creation intent in Chinese', () => {
        const result = detectFeatureIntentRuleBased('帮我创作一个视频', defaultSettings);
        expect(result.detected).toBe(true);
        expect(result.feature?.id).toBe('video-studio');
        expect(result.confidence).toBeGreaterThan(0.3);
      });

      it('should detect video creation intent in English', () => {
        const result = detectFeatureIntentRuleBased('help me create a video', defaultSettings);
        expect(result.detected).toBe(true);
        expect(result.feature?.id).toBe('video-studio');
      });

      it('should detect screen recording intent', () => {
        const result = detectFeatureIntentRuleBased('我想录屏', defaultSettings);
        expect(result.detected).toBe(true);
        expect(result.feature?.id).toBe('video-studio');
      });
    });

    describe('Image Studio detection', () => {
      it('should detect image generation intent in Chinese', () => {
        const result = detectFeatureIntentRuleBased('帮我画一张图片', defaultSettings);
        expect(result.detected).toBe(true);
        expect(result.feature?.id).toBe('image-studio');
      });

      it('should detect image generation intent in English', () => {
        const result = detectFeatureIntentRuleBased('generate an image of a sunset', defaultSettings);
        expect(result.detected).toBe(true);
        expect(result.feature?.id).toBe('image-studio');
      });

      it('should detect AI art intent', () => {
        const result = detectFeatureIntentRuleBased('AI绘画一只猫', defaultSettings);
        expect(result.detected).toBe(true);
        expect(result.feature?.id).toBe('image-studio');
      });
    });

    describe('Designer detection', () => {
      it('should detect web design intent in Chinese', () => {
        const result = detectFeatureIntentRuleBased('帮我设计一个网页', defaultSettings);
        expect(result.detected).toBe(true);
        expect(result.feature?.id).toBe('designer');
      });

      it('should detect UI design intent in English', () => {
        const result = detectFeatureIntentRuleBased('design a landing page for my website', defaultSettings);
        expect(result.detected).toBe(true);
        expect(result.feature?.id).toBe('designer');
      });

      it('should detect V0 style intent', () => {
        const result = detectFeatureIntentRuleBased('create a v0 style component', defaultSettings);
        expect(result.detected).toBe(true);
        expect(result.feature?.id).toBe('designer');
      });
    });

    describe('PPT detection', () => {
      it('should detect PPT creation intent in Chinese', () => {
        const result = detectFeatureIntentRuleBased('帮我做一个PPT', defaultSettings);
        expect(result.detected).toBe(true);
        expect(result.feature?.id).toBe('ppt');
      });

      it('should detect presentation intent in English', () => {
        const result = detectFeatureIntentRuleBased('create a presentation about AI', defaultSettings);
        expect(result.detected).toBe(true);
        expect(result.feature?.id).toBe('ppt');
      });

      it('should detect slides intent', () => {
        const result = detectFeatureIntentRuleBased('make slides for my pitch deck', defaultSettings);
        expect(result.detected).toBe(true);
        expect(result.feature?.id).toBe('ppt');
      });
    });

    describe('Academic detection', () => {
      it('should detect paper search intent in Chinese', () => {
        const result = detectFeatureIntentRuleBased('帮我搜索论文', defaultSettings);
        expect(result.detected).toBe(true);
        expect(result.feature?.id).toBe('academic');
      });

      it('should detect research intent in English', () => {
        const result = detectFeatureIntentRuleBased('find papers about machine learning', defaultSettings);
        expect(result.detected).toBe(true);
        expect(result.feature?.id).toBe('academic');
      });

      it('should detect arXiv intent', () => {
        const result = detectFeatureIntentRuleBased('search arXiv for recent papers', defaultSettings);
        expect(result.detected).toBe(true);
        expect(result.feature?.id).toBe('academic');
      });
    });

    describe('Workflow detection', () => {
      it('should detect workflow creation intent in Chinese', () => {
        const result = detectFeatureIntentRuleBased('创建一个工作流', defaultSettings);
        expect(result.detected).toBe(true);
        expect(result.feature?.id).toBe('workflows');
      });

      it('should detect automation intent in English', () => {
        const result = detectFeatureIntentRuleBased('create an automated workflow', defaultSettings);
        expect(result.detected).toBe(true);
        expect(result.feature?.id).toBe('workflows');
      });
    });

    describe('No detection for general chat', () => {
      it('should not detect feature intent for general questions', () => {
        const result = detectFeatureIntentRuleBased('你好，今天天气怎么样？', defaultSettings);
        expect(result.detected).toBe(false);
        expect(result.feature).toBeNull();
      });

      it('should not detect feature intent for code questions', () => {
        const result = detectFeatureIntentRuleBased('how do I write a for loop in Python?', defaultSettings);
        expect(result.detected).toBe(false);
      });
    });

    describe('Disabled routes', () => {
      it('should not detect disabled routes', () => {
        const settingsWithDisabled: FeatureRoutingSettings = {
          ...defaultSettings,
          disabledRoutes: ['video-studio'],
        };
        const result = detectFeatureIntentRuleBased('帮我创作一个视频', settingsWithDisabled);
        expect(result.feature?.id).not.toBe('video-studio');
      });
    });

    describe('Confidence threshold', () => {
      it('should not detect with high confidence threshold', () => {
        const highThresholdSettings: FeatureRoutingSettings = {
          ...defaultSettings,
          confidenceThreshold: 0.95,
        };
        const result = detectFeatureIntentRuleBased('视频', highThresholdSettings);
        expect(result.detected).toBe(false);
      });
    });
  });

  describe('mightTriggerFeatureRouting', () => {
    it('should return true for creation keywords', () => {
      expect(mightTriggerFeatureRouting('创作一个视频')).toBe(true);
      expect(mightTriggerFeatureRouting('create a video')).toBe(true);
      expect(mightTriggerFeatureRouting('generate an image')).toBe(true);
      expect(mightTriggerFeatureRouting('设计网页')).toBe(true);
    });

    it('should return true for feature keywords', () => {
      expect(mightTriggerFeatureRouting('我想要PPT')).toBe(true);
      expect(mightTriggerFeatureRouting('论文搜索')).toBe(true);
      expect(mightTriggerFeatureRouting('workflow automation')).toBe(true);
    });

    it('should return false for general chat', () => {
      expect(mightTriggerFeatureRouting('你好')).toBe(false);
      expect(mightTriggerFeatureRouting('hello')).toBe(false);
      expect(mightTriggerFeatureRouting('what is the weather?')).toBe(false);
    });
  });

  describe('buildFeatureNavigationUrl', () => {
    it('should build basic URL', () => {
      const videoRoute = FEATURE_ROUTES.find(r => r.id === 'video-studio');
      if (videoRoute) {
        const url = buildFeatureNavigationUrl(videoRoute);
        expect(url).toBe('/video-studio');
      }
    });

    it('should include default params', () => {
      const routeWithParams = {
        ...FEATURE_ROUTES[0],
        defaultParams: { mode: 'create' },
      };
      const url = buildFeatureNavigationUrl(routeWithParams);
      expect(url).toContain('mode=create');
    });
  });

  describe('getFeatureRouteById', () => {
    it('should return route by id', () => {
      const route = getFeatureRouteById('video-studio');
      expect(route).toBeDefined();
      expect(route?.id).toBe('video-studio');
      expect(route?.path).toBe('/video-studio');
    });

    it('should return undefined for invalid id', () => {
      // @ts-expect-error Testing invalid id
      const route = getFeatureRouteById('invalid-route');
      expect(route).toBeUndefined();
    });
  });

  describe('getEnabledFeatureRoutes', () => {
    it('should return all enabled routes except chat', () => {
      const routes = getEnabledFeatureRoutes();
      expect(routes.length).toBeGreaterThan(0);
      expect(routes.find(r => r.id === 'chat')).toBeUndefined();
    });

    it('should exclude disabled routes', () => {
      const routes = getEnabledFeatureRoutes(['video-studio', 'image-studio']);
      expect(routes.find(r => r.id === 'video-studio')).toBeUndefined();
      expect(routes.find(r => r.id === 'image-studio')).toBeUndefined();
    });
  });

  describe('FEATURE_ROUTES configuration', () => {
    it('should have all required properties', () => {
      for (const route of FEATURE_ROUTES) {
        expect(route.id).toBeDefined();
        expect(route.name).toBeDefined();
        expect(route.nameZh).toBeDefined();
        expect(route.path).toBeDefined();
        expect(route.icon).toBeDefined();
        expect(route.category).toBeDefined();
        expect(route.patterns).toBeDefined();
        expect(route.patterns.chinese).toBeDefined();
        expect(route.patterns.english).toBeDefined();
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
  });
});
