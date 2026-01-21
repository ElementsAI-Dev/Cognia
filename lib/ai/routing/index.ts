/**
 * Feature Routing Module
 * 
 * Exports for intelligent user intent-based feature routing.
 */

export {
  detectFeatureIntent,
  detectFeatureIntentRuleBased,
  detectFeatureIntentWithLLM,
  detectFeatureIntentHybrid,
  mightTriggerFeatureRouting,
  buildFeatureNavigationUrl,
} from './feature-router';

export {
  FEATURE_ROUTES,
  getFeatureRouteById,
  getEnabledFeatureRoutes,
  getFeatureRoutesByCategory,
  getCreationFeatures,
} from './feature-routes-config';

export type {
  FeatureId,
  FeatureCategory,
  FeatureRoute,
  FeatureRouteResult,
  FeatureRoutingMode,
  FeatureRoutingSettings,
  FeatureNavigationDialogProps,
  FeatureNavigationContext,
  LLMRouteResult,
} from '@/types/routing/feature-router';

export { DEFAULT_FEATURE_ROUTING_SETTINGS } from '@/types/routing/feature-router';
