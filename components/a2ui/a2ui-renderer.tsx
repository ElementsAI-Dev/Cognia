'use client';

/**
 * A2UI Component Renderer
 * Renders A2UI components by mapping to registered React components
 */

import React, { useMemo } from 'react';
import type { A2UIComponent, A2UIComponentProps } from '@/types/artifact/a2ui';
import { useA2UIContext, useA2UIVisibility, useA2UIDisabled } from './a2ui-context';
import { getComponent } from '@/lib/a2ui/catalog';

// Import layout components
import { A2UIRow } from './layout/a2ui-row';
import { A2UIColumn } from './layout/a2ui-column';
import { A2UICard } from './layout/a2ui-card';
import { A2UIDivider } from './layout/a2ui-divider';
import { A2UISpacer } from './layout/a2ui-spacer';
import { A2UIDialog } from './layout/a2ui-dialog';
import { A2UITabs } from './layout/a2ui-tabs';
import { A2UIAccordion } from './layout/a2ui-accordion';
import { A2UIFallback } from './layout/a2ui-fallback';
import { A2UIErrorBoundary } from './a2ui-error-boundary';

// Import display components
import { A2UIText } from './display/a2ui-text';
import { A2UIAlert } from './display/a2ui-alert';
import { A2UIProgress } from './display/a2ui-progress';
import { A2UIBadge } from './display/a2ui-badge';
import { A2UIImage } from './display/a2ui-image';
import { A2UIIcon } from './display/a2ui-icon';
import { A2UILink } from './display/a2ui-link';

// Import form components
import { A2UIButton } from './form/a2ui-button';
import { A2UITextField } from './form/a2ui-textfield';
import { A2UITextArea } from './form/a2ui-textarea';
import { A2UISelect } from './form/a2ui-select';
import { A2UICheckbox } from './form/a2ui-checkbox';
import { A2UIRadioGroup } from './form/a2ui-radio';
import { A2UISlider } from './form/a2ui-slider';
import { A2UIDatePicker } from './form/a2ui-datepicker';
import { A2UITimePicker } from './form/a2ui-timepicker';
import { A2UIDateTimePicker } from './form/a2ui-datetimepicker';
import { A2UIToggle } from './form/a2ui-toggle';

// Import data components
import { A2UIChart } from './data/a2ui-chart';
import { A2UITable } from './data/a2ui-table';
import { A2UIList } from './data/a2ui-list';

// Import animation and interactive components
import { A2UIAnimation } from './display/a2ui-animation';
import { A2UIInteractiveGuide } from './display/a2ui-interactive-guide';

/**
 * Component registry for built-in components
 * These are registered at module load time
 * Using type assertion as components have specific props but are used generically
 */
const builtInComponents: Record<string, React.ComponentType<A2UIComponentProps>> = {
  // Layout components
  Row: A2UIRow as React.ComponentType<A2UIComponentProps>,
  Column: A2UIColumn as React.ComponentType<A2UIComponentProps>,
  Card: A2UICard as React.ComponentType<A2UIComponentProps>,
  Divider: A2UIDivider as React.ComponentType<A2UIComponentProps>,
  Spacer: A2UISpacer as React.ComponentType<A2UIComponentProps>,
  Dialog: A2UIDialog as React.ComponentType<A2UIComponentProps>,
  Tabs: A2UITabs as React.ComponentType<A2UIComponentProps>,
  Accordion: A2UIAccordion as React.ComponentType<A2UIComponentProps>,

  // Text and display components
  Text: A2UIText as React.ComponentType<A2UIComponentProps>,
  Image: A2UIImage as React.ComponentType<A2UIComponentProps>,
  Icon: A2UIIcon as React.ComponentType<A2UIComponentProps>,
  Link: A2UILink as React.ComponentType<A2UIComponentProps>,
  Badge: A2UIBadge as React.ComponentType<A2UIComponentProps>,
  Alert: A2UIAlert as React.ComponentType<A2UIComponentProps>,
  Progress: A2UIProgress as React.ComponentType<A2UIComponentProps>,

  // Form components
  Button: A2UIButton as React.ComponentType<A2UIComponentProps>,
  TextField: A2UITextField as React.ComponentType<A2UIComponentProps>,
  TextArea: A2UITextArea as React.ComponentType<A2UIComponentProps>,
  Select: A2UISelect as React.ComponentType<A2UIComponentProps>,
  Checkbox: A2UICheckbox as React.ComponentType<A2UIComponentProps>,
  RadioGroup: A2UIRadioGroup as React.ComponentType<A2UIComponentProps>,
  Slider: A2UISlider as React.ComponentType<A2UIComponentProps>,
  DatePicker: A2UIDatePicker as React.ComponentType<A2UIComponentProps>,
  TimePicker: A2UITimePicker as React.ComponentType<A2UIComponentProps>,
  DateTimePicker: A2UIDateTimePicker as React.ComponentType<A2UIComponentProps>,
  Toggle: A2UIToggle as React.ComponentType<A2UIComponentProps>,

  // Data display components
  Chart: A2UIChart as React.ComponentType<A2UIComponentProps>,
  Table: A2UITable as React.ComponentType<A2UIComponentProps>,
  List: A2UIList as React.ComponentType<A2UIComponentProps>,

  // Animation and interactive components
  Animation: A2UIAnimation as unknown as React.ComponentType<A2UIComponentProps>,
  InteractiveGuide: A2UIInteractiveGuide as unknown as React.ComponentType<A2UIComponentProps>,
};

/**
 * Props for the renderer
 */
interface A2UIRendererProps {
  component: A2UIComponent;
  className?: string;
}

/**
 * A2UI Component Renderer
 * Looks up the appropriate React component and renders it
 */
export function A2UIRenderer({ component, className }: A2UIRendererProps) {
  const context = useA2UIContext();
  const { surfaceId, dataModel, emitAction, setDataValue, renderChild, catalog } = context;

  // Check visibility
  const isVisible = useA2UIVisibility(component.visible);
  const isDisabled = useA2UIDisabled(component.disabled);

  // Get the React component to render
  const ComponentToRender = useMemo(() => {
    // First check built-in components
    const builtIn = builtInComponents[component.component];
    if (builtIn) {
      return builtIn;
    }

    // Then check catalog
    const catalogEntry = getComponent(component.component, catalog?.id);
    if (catalogEntry) {
      return catalogEntry.component;
    }

    // Fallback
    return A2UIFallback;
  }, [component.component, catalog?.id]);

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  // Build props for the component
  const componentProps: A2UIComponentProps = {
    component: {
      ...component,
      disabled: isDisabled ? true : component.disabled,
      className: className || component.className,
    },
    surfaceId,
    dataModel,
    onAction: (action: string, data?: Record<string, unknown>) => {
      emitAction(action, component.id, data);
    },
    onDataChange: setDataValue,
    renderChild,
  };

  return (
    <A2UIErrorBoundary componentType={component.component} componentId={component.id}>
      <ComponentToRender {...componentProps} />
    </A2UIErrorBoundary>
  );
}

/**
 * Render a list of child component IDs
 */
export function A2UIChildRenderer({ childIds }: { childIds: string[] }) {
  const { renderChild } = useA2UIContext();

  return (
    <>
      {childIds.map((childId) => (
        <React.Fragment key={childId}>{renderChild(childId)}</React.Fragment>
      ))}
    </>
  );
}

/**
 * HOC to wrap a component with A2UI context access
 */
export function withA2UIContext<P extends A2UIComponentProps>(
  WrappedComponent: React.ComponentType<P>
): React.ComponentType<Omit<P, keyof A2UIComponentProps> & { component: A2UIComponent }> {
  return function A2UIContextWrapper(
    props: Omit<P, keyof A2UIComponentProps> & { component: A2UIComponent }
  ) {
    const context = useA2UIContext();

    const componentProps = {
      ...props,
      surfaceId: context.surfaceId,
      dataModel: context.dataModel,
      onAction: (action: string, data?: Record<string, unknown>) => {
        context.emitAction(action, props.component.id, data);
      },
      onDataChange: context.setDataValue,
      renderChild: context.renderChild,
    } as P;

    return <WrappedComponent {...componentProps} />;
  };
}

/**
 * Register a component for use in A2UI surfaces
 * This is called at module load time for built-in components
 * and can be called dynamically for custom components
 */
export function registerBuiltInComponent(
  type: string,
  component: React.ComponentType<A2UIComponentProps>
): void {
  builtInComponents[type] = component;
}

/**
 * Check if a component type is registered
 */
export function isComponentRegistered(type: string): boolean {
  return type in builtInComponents || getComponent(type) !== undefined;
}

/**
 * Get all registered component types
 */
export function getRegisteredComponentTypes(): string[] {
  return Object.keys(builtInComponents);
}
