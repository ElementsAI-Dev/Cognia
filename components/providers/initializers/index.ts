/**
 * Initializers - App startup initialization components
 *
 * These components handle one-time initialization logic:
 * - Locale detection and setup
 * - Store subscriptions
 * - Skills loading
 */

// Locale initialization
export { LocaleInitializer } from './locale-initializer';
export { default as LocaleInitializerDefault } from './locale-initializer';

// Store initialization
export { StoreInitializer } from './store-initializer';
export { default as StoreInitializerDefault } from './store-initializer';

// Skill initialization
export {
  SkillProvider,
  useInitializeSkills,
  initializeSkillsSync,
} from './skill-provider';
export { default as SkillProviderDefault } from './skill-provider';
