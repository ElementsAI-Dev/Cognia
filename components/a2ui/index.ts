/**
 * A2UI Components
 * React components for rendering A2UI surfaces
 */

// Context
export {
  A2UIProvider,
  useA2UIContext,
  useA2UIComponent,
  useA2UIBinding,
  useA2UIVisibility,
  useA2UIDisabled,
} from './a2ui-context';

// Surface
export {
  A2UISurface,
  A2UIInlineSurface,
  A2UIDialogSurface,
  type A2UISurfaceContainerProps,
} from './a2ui-surface';

// Renderer
export {
  A2UIRenderer,
  A2UIChildRenderer,
  withA2UIContext,
  registerBuiltInComponent,
  isComponentRegistered,
  getRegisteredComponentTypes,
} from './a2ui-renderer';

// Layout components
export {
  A2UIFallback,
  A2UIRow,
  A2UIColumn,
  A2UICard,
  A2UIDivider,
  A2UISpacer,
  A2UIDialog,
} from './layout';

// Display components
export {
  A2UIText,
  A2UIImage,
  A2UIIcon,
  A2UILink,
  A2UIBadge,
  A2UIAlert,
  A2UIProgress,
  A2UILoading,
  A2UIError,
  A2UIEmpty,
  type A2UILoadingComponent,
  type A2UIErrorComponent,
  type A2UIEmptyComponent,
} from './display';

// Form components
export {
  A2UIButton,
  A2UITextField,
  A2UITextArea,
  A2UISelect,
  A2UICheckbox,
  A2UIRadioGroup,
  A2UISlider,
  A2UIDatePicker,
  A2UITimePicker,
  A2UIDateTimePicker,
  A2UIFormGroup,
  A2UISwitch,
  type A2UIFormGroupComponent,
  type A2UISwitchComponent,
} from './form';

// Data display components
export {
  A2UIChart,
  A2UITable,
  A2UIList,
} from './data';

// Chat and tool integration
export {
  A2UIMessageRenderer,
  A2UIEnhancedMessage,
  hasA2UIContent,
  useA2UIMessageIntegration,
} from './a2ui-message-renderer';

export {
  A2UIToolOutput,
  A2UIStructuredOutput,
  hasA2UIToolOutput,
} from './a2ui-tool-output';

// App Builder components
export { QuickAppBuilder } from './quick-app-builder';
export { AppGallery } from './app-gallery';
export { AppCard, type AppCardProps } from './app-card';
export { AppDetailDialog, type AppDetailDialogProps } from './app-detail-dialog';

// Hooks (re-exported from centralized hooks)
export {
  useA2UIForm,
  useA2UIKeyboard,
  useA2UIFocusTrap,
  useA2UIListNavigation,
  type FormField,
  type FormState,
  type ValidationRule,
  type UseA2UIFormOptions,
  type KeyboardNavigationOptions,
} from '@/hooks/a2ui';
