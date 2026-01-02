'use client';

/**
 * A2UI Component Renderer
 * Renders A2UI components by mapping to registered React components
 */

import React, { useMemo } from 'react';
import type { A2UIComponent, A2UIComponentProps } from '@/types/a2ui';
import { useA2UIContext, useA2UIVisibility, useA2UIDisabled } from './a2ui-context';
import { getComponent } from '@/lib/a2ui/catalog';

// Import base components
import { A2UIFallback } from './components/a2ui-fallback';
import { A2UIText } from './components/a2ui-text';
import { A2UIRow } from './components/a2ui-row';
import { A2UIColumn } from './components/a2ui-column';
import { A2UIButton } from './components/a2ui-button';
import { A2UITextField } from './components/a2ui-textfield';
import { A2UISelect } from './components/a2ui-select';
import { A2UICheckbox } from './components/a2ui-checkbox';
import { A2UIRadioGroup } from './components/a2ui-radio';
import { A2UISlider } from './components/a2ui-slider';
import { A2UICard } from './components/a2ui-card';

/**
 * Component registry for built-in components
 * These are registered at module load time
 * Using type assertion as components have specific props but are used generically
 */
const builtInComponents: Record<string, React.ComponentType<A2UIComponentProps>> = {
  Text: A2UIText as React.ComponentType<A2UIComponentProps>,
  Row: A2UIRow as React.ComponentType<A2UIComponentProps>,
  Column: A2UIColumn as React.ComponentType<A2UIComponentProps>,
  Button: A2UIButton as React.ComponentType<A2UIComponentProps>,
  TextField: A2UITextField as React.ComponentType<A2UIComponentProps>,
  Select: A2UISelect as React.ComponentType<A2UIComponentProps>,
  Checkbox: A2UICheckbox as React.ComponentType<A2UIComponentProps>,
  RadioGroup: A2UIRadioGroup as React.ComponentType<A2UIComponentProps>,
  Slider: A2UISlider as React.ComponentType<A2UIComponentProps>,
  Card: A2UICard as React.ComponentType<A2UIComponentProps>,
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

  return <ComponentToRender {...componentProps} />;
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
  return function A2UIContextWrapper(props: Omit<P, keyof A2UIComponentProps> & { component: A2UIComponent }) {
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
