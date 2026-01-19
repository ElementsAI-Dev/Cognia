/**
 * A2UI (Agent to UI) Type Definitions
 * Based on A2UI Protocol v0.9 specification
 * https://a2ui.org/specification/v0.9-a2ui/
 */

// =============================================================================
// Core Types
// =============================================================================

/**
 * A2UI Surface types - containers for UI components
 */
export type A2UISurfaceType = 'inline' | 'dialog' | 'panel' | 'fullscreen';

/**
 * Standard A2UI component types from the component catalog
 */
export type A2UIComponentType =
  | 'Text'
  | 'Button'
  | 'TextField'
  | 'TextArea'
  | 'Select'
  | 'Checkbox'
  | 'Radio'
  | 'RadioGroup'
  | 'Slider'
  | 'DatePicker'
  | 'TimePicker'
  | 'DateTimePicker'
  | 'Card'
  | 'Row'
  | 'Column'
  | 'List'
  | 'Image'
  | 'Chart'
  | 'Table'
  | 'Dialog'
  | 'Divider'
  | 'Spacer'
  | 'Progress'
  | 'Badge'
  | 'Alert'
  | 'Link'
  | 'Icon'
  | 'Animation'
  | 'InteractiveGuide'
  | string; // Allow custom component types

/**
 * Chart types supported by A2UI
 */
export type A2UIChartType = 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'radar' | 'donut';

/**
 * Button variants
 */
export type A2UIButtonVariant = 'default' | 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';

/**
 * Alert variants
 */
export type A2UIAlertVariant = 'default' | 'info' | 'success' | 'warning' | 'error' | 'destructive';

/**
 * Text variants
 */
export type A2UITextVariant = 'body' | 'heading1' | 'heading2' | 'heading3' | 'heading4' | 'caption' | 'code' | 'label';

// =============================================================================
// Data Binding Types (JSON Pointer RFC 6901)
// =============================================================================

/**
 * Value that can be either a literal or a data-bound path
 */
export interface A2UIPathValue<_T = string> {
  path: string; // JSON Pointer path, e.g., "/user/name"
}

export type A2UIStringOrPath = string | A2UIPathValue<string>;
export type A2UINumberOrPath = number | A2UIPathValue<number>;
export type A2UIBooleanOrPath = boolean | A2UIPathValue<boolean>;
export type A2UIArrayOrPath<T = unknown> = T[] | A2UIPathValue<T[]>;

/**
 * Check if value is a path reference
 */
export function isPathValue<T>(value: T | A2UIPathValue<T>): value is A2UIPathValue<T> {
  return typeof value === 'object' && value !== null && 'path' in value;
}

// =============================================================================
// Component Definitions
// =============================================================================

/**
 * Base component definition - all components extend this
 */
export interface A2UIBaseComponent {
  id: string;
  component: A2UIComponentType;
  weight?: number; // Flex weight for Row/Column layouts
  visible?: A2UIBooleanOrPath;
  disabled?: A2UIBooleanOrPath;
  className?: string;
  style?: Record<string, string | number>;
}

/**
 * Text component
 */
export interface A2UITextComponent extends A2UIBaseComponent {
  component: 'Text';
  text: A2UIStringOrPath;
  variant?: A2UITextVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

/**
 * Button component
 */
export interface A2UIButtonComponent extends A2UIBaseComponent {
  component: 'Button';
  text: A2UIStringOrPath;
  action: string; // Action identifier sent in userAction
  variant?: A2UIButtonVariant;
  icon?: string;
  iconPosition?: 'left' | 'right';
  loading?: A2UIBooleanOrPath;
}

/**
 * TextField component (single-line input)
 */
export interface A2UITextFieldComponent extends A2UIBaseComponent {
  component: 'TextField';
  value: A2UIStringOrPath;
  placeholder?: string;
  label?: string;
  helperText?: string;
  error?: A2UIStringOrPath;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

/**
 * TextArea component (multi-line input)
 */
export interface A2UITextAreaComponent extends A2UIBaseComponent {
  component: 'TextArea';
  value: A2UIStringOrPath;
  placeholder?: string;
  label?: string;
  helperText?: string;
  error?: A2UIStringOrPath;
  rows?: number;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}

/**
 * Select/Dropdown component
 */
export interface A2UISelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface A2UISelectComponent extends A2UIBaseComponent {
  component: 'Select';
  value: A2UIStringOrPath;
  options: A2UISelectOption[] | A2UIPathValue<A2UISelectOption[]>;
  placeholder?: string;
  label?: string;
  helperText?: string;
  error?: A2UIStringOrPath;
  required?: boolean;
  multiple?: boolean;
}

/**
 * Checkbox component
 */
export interface A2UICheckboxComponent extends A2UIBaseComponent {
  component: 'Checkbox';
  checked: A2UIBooleanOrPath;
  label?: string;
  helperText?: string;
}

/**
 * Radio component (single radio button)
 */
export interface A2UIRadioComponent extends A2UIBaseComponent {
  component: 'Radio';
  value: string;
  label?: string;
  checked?: A2UIBooleanOrPath;
}

/**
 * RadioGroup component
 */
export interface A2UIRadioGroupComponent extends A2UIBaseComponent {
  component: 'RadioGroup';
  value: A2UIStringOrPath;
  options: A2UISelectOption[];
  label?: string;
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Slider component
 */
export interface A2UISliderComponent extends A2UIBaseComponent {
  component: 'Slider';
  value: A2UINumberOrPath;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  showValue?: boolean;
}

/**
 * DatePicker component
 */
export interface A2UIDatePickerComponent extends A2UIBaseComponent {
  component: 'DatePicker';
  value: A2UIStringOrPath; // ISO date string
  label?: string;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  required?: boolean;
}

/**
 * TimePicker component
 */
export interface A2UITimePickerComponent extends A2UIBaseComponent {
  component: 'TimePicker';
  value: A2UIStringOrPath; // HH:mm format
  label?: string;
  placeholder?: string;
  required?: boolean;
}

/**
 * DateTimePicker component
 */
export interface A2UIDateTimePickerComponent extends A2UIBaseComponent {
  component: 'DateTimePicker';
  value: A2UIStringOrPath; // ISO datetime string
  label?: string;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  required?: boolean;
}

/**
 * Card component
 */
export interface A2UICardComponent extends A2UIBaseComponent {
  component: 'Card';
  title?: A2UIStringOrPath;
  description?: A2UIStringOrPath;
  image?: A2UIStringOrPath;
  children?: string[]; // Child component IDs
  footer?: string[]; // Footer component IDs
  clickAction?: string;
}

/**
 * Row layout component
 */
export interface A2UIRowComponent extends A2UIBaseComponent {
  component: 'Row';
  children: string[]; // Child component IDs
  gap?: number | string;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
}

/**
 * Column layout component
 */
export interface A2UIColumnComponent extends A2UIBaseComponent {
  component: 'Column';
  children: string[]; // Child component IDs
  gap?: number | string;
  align?: 'start' | 'center' | 'end' | 'stretch';
}

/**
 * List component with template support
 */
export interface A2UIListTemplate {
  itemId: string; // Template component ID for each item
  dataPath: string; // JSON Pointer to array data
}

export interface A2UIListComponent extends A2UIBaseComponent {
  component: 'List';
  items?: unknown[] | A2UIPathValue<unknown[]>;
  children?: string[]; // Static children OR
  template?: A2UIListTemplate; // Dynamic template for data-bound lists
  emptyText?: string;
  dividers?: boolean;
  gap?: number | string;
  ordered?: boolean;
  itemClickAction?: string;
}

/**
 * Image component
 */
export interface A2UIImageComponent extends A2UIBaseComponent {
  component: 'Image';
  src: A2UIStringOrPath;
  alt?: string;
  width?: number | string;
  height?: number | string;
  aspectRatio?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none';
  fallback?: string;
}

/**
 * Chart component
 */
export interface A2UIChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface A2UIChartComponent extends A2UIBaseComponent {
  component: 'Chart';
  chartType: A2UIChartType;
  data: A2UIChartDataPoint[] | A2UIPathValue<A2UIChartDataPoint[]>;
  title?: string;
  xKey?: string;
  yKeys?: string[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  height?: number;
  showLegend?: boolean;
  showLabels?: boolean;
  showGrid?: boolean;
  colors?: string[];
  clickAction?: string;
}

/**
 * Table component
 */
export interface A2UITableColumn {
  key: string;
  header: string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  type?: 'string' | 'number' | 'date' | 'boolean';
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

export interface A2UITableComponent extends A2UIBaseComponent {
  component: 'Table';
  columns: A2UITableColumn[];
  data: Record<string, unknown>[] | A2UIPathValue<Record<string, unknown>[]>;
  title?: string;
  rowKey?: string;
  selectable?: boolean;
  selectedRows?: A2UIArrayOrPath<string>;
  rowClickAction?: string;
  sortAction?: string;
  pageChangeAction?: string;
  emptyMessage?: string;
  pageSize?: number;
  pagination?: boolean;
}

/**
 * Dialog component
 */
export interface A2UIDialogComponent extends A2UIBaseComponent {
  component: 'Dialog';
  open: A2UIBooleanOrPath;
  title?: A2UIStringOrPath;
  description?: A2UIStringOrPath;
  children: string[]; // Content component IDs
  actions?: string[]; // Action button component IDs
  closable?: boolean;
  closeAction?: string;
}

/**
 * Divider component
 */
export interface A2UIDividerComponent extends A2UIBaseComponent {
  component: 'Divider';
  orientation?: 'horizontal' | 'vertical';
  text?: string;
}

/**
 * Spacer component
 */
export interface A2UISpacerComponent extends A2UIBaseComponent {
  component: 'Spacer';
  size?: number | string;
}

/**
 * Progress component
 */
export interface A2UIProgressComponent extends A2UIBaseComponent {
  component: 'Progress';
  value: A2UINumberOrPath;
  max?: number;
  label?: A2UIStringOrPath;
  showValue?: boolean;
  showLabel?: boolean;
  variant?: 'linear' | 'circular';
}

/**
 * Badge component
 */
export interface A2UIBadgeComponent extends A2UIBaseComponent {
  component: 'Badge';
  text: A2UIStringOrPath;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

/**
 * Alert component
 */
export interface A2UIAlertComponent extends A2UIBaseComponent {
  component: 'Alert';
  title?: A2UIStringOrPath;
  message: A2UIStringOrPath;
  variant?: A2UIAlertVariant;
  showIcon?: boolean;
  dismissible?: boolean;
  dismissAction?: string;
}

/**
 * Link component
 */
export interface A2UILinkComponent extends A2UIBaseComponent {
  component: 'Link';
  text: A2UIStringOrPath;
  href?: string;
  action?: string; // Alternative to href - triggers userAction
  external?: boolean;
}

/**
 * Icon component
 */
export interface A2UIIconComponent extends A2UIBaseComponent {
  component: 'Icon';
  name: string; // Lucide icon name
  size?: number;
  color?: string;
}

/**
 * Union type of all component definitions
 */
export type A2UIComponent =
  | A2UITextComponent
  | A2UIButtonComponent
  | A2UITextFieldComponent
  | A2UITextAreaComponent
  | A2UISelectComponent
  | A2UICheckboxComponent
  | A2UIRadioComponent
  | A2UIRadioGroupComponent
  | A2UISliderComponent
  | A2UIDatePickerComponent
  | A2UITimePickerComponent
  | A2UIDateTimePickerComponent
  | A2UICardComponent
  | A2UIRowComponent
  | A2UIColumnComponent
  | A2UIListComponent
  | A2UIImageComponent
  | A2UIChartComponent
  | A2UITableComponent
  | A2UIDialogComponent
  | A2UIDividerComponent
  | A2UISpacerComponent
  | A2UIProgressComponent
  | A2UIBadgeComponent
  | A2UIAlertComponent
  | A2UILinkComponent
  | A2UIIconComponent
  | A2UIBaseComponent; // Fallback for custom components

// =============================================================================
// Message Types (Server to Client)
// =============================================================================

/**
 * Create a new surface
 */
export interface A2UICreateSurfaceMessage {
  type: 'createSurface';
  surfaceId: string;
  surfaceType: A2UISurfaceType;
  catalogId?: string;
  title?: string;
}

/**
 * Update components on a surface
 */
export interface A2UIUpdateComponentsMessage {
  type: 'updateComponents';
  surfaceId: string;
  components: A2UIComponent[];
}

/**
 * Update the data model
 */
export interface A2UIUpdateDataModelMessage {
  type: 'dataModelUpdate';
  surfaceId: string;
  data: Record<string, unknown>;
  merge?: boolean; // If true, merge with existing data; if false, replace
}

/**
 * Delete a surface
 */
export interface A2UIDeleteSurfaceMessage {
  type: 'deleteSurface';
  surfaceId: string;
}

/**
 * Surface ready signal
 */
export interface A2UISurfaceReadyMessage {
  type: 'surfaceReady';
  surfaceId: string;
}

/**
 * Union of all server-to-client message types
 */
export type A2UIServerMessage =
  | A2UICreateSurfaceMessage
  | A2UIUpdateComponentsMessage
  | A2UIUpdateDataModelMessage
  | A2UIDeleteSurfaceMessage
  | A2UISurfaceReadyMessage;

// =============================================================================
// Message Types (Client to Server)
// =============================================================================

/**
 * User action event - sent when user interacts with A2UI components
 */
export interface A2UIUserAction {
  type: 'userAction';
  surfaceId: string;
  action: string; // Action identifier from component
  componentId: string;
  data?: Record<string, unknown>; // Additional action data
  timestamp: number;
}

/**
 * Data model change event - sent when user modifies form values
 */
export interface A2UIDataModelChange {
  type: 'dataModelChange';
  surfaceId: string;
  path: string; // JSON Pointer path that changed
  value: unknown;
  timestamp: number;
}

/**
 * Union of all client-to-server message types
 */
export type A2UIClientMessage = A2UIUserAction | A2UIDataModelChange;

// =============================================================================
// Surface State
// =============================================================================

/**
 * Complete state of an A2UI surface
 */
export interface A2UISurface {
  id: string;
  type: A2UISurfaceType;
  catalogId?: string;
  title?: string;
  components: Map<string, A2UIComponent>;
  dataModel: Record<string, unknown>;
  rootId: string; // ID of root component
  createdAt: number;
  updatedAt: number;
  ready: boolean;
}

/**
 * A2UI surface state for store
 */
export interface A2UISurfaceState {
  id: string;
  type: A2UISurfaceType;
  catalogId?: string;
  title?: string;
  components: Record<string, A2UIComponent>;
  dataModel: Record<string, unknown>;
  rootId: string;
  createdAt: number;
  updatedAt: number;
  ready: boolean;
}

// =============================================================================
// Component Catalog
// =============================================================================

/**
 * Component catalog entry - maps A2UI type to React component
 */
export interface A2UICatalogEntry {
  type: A2UIComponentType;
  component: React.ComponentType<A2UIComponentProps<A2UIComponent>>;
  description?: string;
  schema?: Record<string, unknown>; // JSON Schema for validation
}

/**
 * Component catalog
 */
export interface A2UIComponentCatalog {
  id: string;
  name: string;
  version: string;
  components: Record<string, A2UICatalogEntry>;
}

// =============================================================================
// React Component Props
// =============================================================================

/**
 * Props passed to A2UI React components
 */
export interface A2UIComponentProps<T extends A2UIComponent = A2UIComponent> {
  component: T;
  surfaceId: string;
  dataModel: Record<string, unknown>;
  onAction: (action: string, data?: Record<string, unknown>) => void;
  onDataChange: (path: string, value: unknown) => void;
  renderChild: (componentId: string) => React.ReactNode;
}

/**
 * Props for A2UI surface container
 */
export interface A2UISurfaceProps {
  surfaceId: string;
  className?: string;
  onAction?: (action: A2UIUserAction) => void;
  onDataChange?: (change: A2UIDataModelChange) => void;
}

// =============================================================================
// Integration Types
// =============================================================================

/**
 * A2UI content detected in AI response
 */
export interface A2UIMessageContent {
  type: 'a2ui';
  surfaceId: string;
  messages: A2UIServerMessage[];
}

/**
 * A2UI tool output metadata
 */
export interface A2UIToolOutputMeta {
  a2ui: true;
  surfaceId: string;
  template?: string; // Predefined template name
}

/**
 * Options for A2UI renderer
 */
export interface A2UIRendererOptions {
  catalog?: A2UIComponentCatalog;
  theme?: 'light' | 'dark' | 'system';
  locale?: string;
  onError?: (error: Error, componentId: string) => void;
}
