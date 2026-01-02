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

// Base components
export { A2UIFallback } from './components/a2ui-fallback';
export { A2UIText } from './components/a2ui-text';
export { A2UIRow } from './components/a2ui-row';
export { A2UIColumn } from './components/a2ui-column';

// Form components
export { A2UIButton } from './components/a2ui-button';
export { A2UITextField } from './components/a2ui-textfield';
export { A2UISelect } from './components/a2ui-select';
export { A2UICheckbox } from './components/a2ui-checkbox';
export { A2UIRadioGroup } from './components/a2ui-radio';
export { A2UISlider } from './components/a2ui-slider';
export { A2UIDatePicker } from './components/a2ui-datepicker';
export { A2UICard } from './components/a2ui-card';

// Data display components
export { A2UIChart } from './components/a2ui-chart';
export { A2UITable } from './components/a2ui-table';
export { A2UIList } from './components/a2ui-list';
export { A2UIAlert } from './components/a2ui-alert';
export { A2UIProgress } from './components/a2ui-progress';
export { A2UIBadge } from './components/a2ui-badge';

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
