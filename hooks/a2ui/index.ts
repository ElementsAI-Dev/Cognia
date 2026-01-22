/**
 * A2UI Hooks
 * React hooks for A2UI app building and management
 */

export { useA2UIAppBuilder, type A2UIAppInstance, type A2UIAppTemplate } from './use-app-builder';
export { useA2UI } from './use-a2ui';
export {
  useA2UIDataModel,
  useA2UIBoundValue,
  useA2UIWatchPaths,
  useA2UIFormField,
} from './use-a2ui-data-model';

// Form hooks
export {
  useA2UIForm,
  type FormField,
  type FormState,
  type ValidationRule,
  type UseA2UIFormOptions,
} from './use-a2ui-form';

// Keyboard navigation hooks
export {
  useA2UIKeyboard,
  useA2UIFocusTrap,
  useA2UIListNavigation,
  type KeyboardNavigationOptions,
} from './use-a2ui-keyboard';
