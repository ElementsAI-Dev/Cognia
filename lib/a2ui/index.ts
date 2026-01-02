/**
 * A2UI Library
 * Agent to UI protocol implementation for Cognia
 */

// Parser
export {
  parseA2UIMessage,
  parseA2UIMessages,
  parseA2UIString,
  parseA2UIJsonl,
  detectA2UIContent,
  extractA2UIFromResponse,
  createA2UISurface,
  isCreateSurfaceMessage,
  isUpdateComponentsMessage,
  isUpdateDataModelMessage,
  isDeleteSurfaceMessage,
  isSurfaceReadyMessage,
  type A2UIParseResult,
} from './parser';

// Data Model
export {
  parseJsonPointer,
  createJsonPointer,
  encodeJsonPointerSegment,
  getValueByPath,
  setValueByPath,
  deleteValueByPath,
  deepClone,
  deepMerge,
  isPathValue,
  resolveStringOrPath,
  resolveNumberOrPath,
  resolveBooleanOrPath,
  resolveArrayOrPath,
  getBindingPath,
  createRelativePathResolver,
  watchPaths,
  extractReferencedPaths,
  type PathWatcher,
} from './data-model';

// Component Catalog
export {
  DEFAULT_CATALOG_ID,
  registerComponent,
  registerComponents,
  getComponent,
  hasComponent,
  getRegisteredTypes,
  createCatalog,
  registerCatalog,
  getCatalog,
  unregisterComponent,
  clearRegistry,
  getStandardComponentTypes,
  componentCategories,
  getComponentCategory,
  validateComponent,
  FALLBACK_COMPONENT_TYPE,
} from './catalog';

// Events
export {
  A2UIEventEmitter,
  globalEventEmitter,
  createUserAction,
  createDataModelChange,
  ActionTypes,
  getComponentAction,
  buildActionData,
  formatActionForAI,
  formatDataChangeForAI,
  batchEventsForAI,
  collectFormData,
  validateFormData,
  type A2UIActionHandler,
  type A2UIDataChangeHandler,
  type ValidationResult,
} from './events';
