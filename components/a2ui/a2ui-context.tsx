'use client';

/**
 * A2UI React Context
 * Provides A2UI surface state and actions to child components
 */

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import type {
  A2UISurfaceState,
  A2UIComponent,
  A2UIComponentCatalog,
} from '@/types/artifact/a2ui';
import { useA2UIStore } from '@/stores/a2ui';
import {
  resolveStringOrPath,
  resolveNumberOrPath,
  resolveBooleanOrPath,
  resolveArrayOrPath,
  getBindingPath,
} from '@/lib/a2ui/data-model';
import { getCatalog, DEFAULT_CATALOG_ID } from '@/lib/a2ui/catalog';

/**
 * A2UI Context value
 */
interface A2UIContextValue {
  // Surface state
  surface: A2UISurfaceState | null;
  surfaceId: string;
  dataModel: Record<string, unknown>;
  components: Record<string, A2UIComponent>;
  catalog: A2UIComponentCatalog | undefined;

  // Actions
  emitAction: (action: string, componentId: string, data?: Record<string, unknown>) => void;
  setDataValue: (path: string, value: unknown) => void;

  // Resolvers for data binding
  resolveString: (value: string | { path: string }, defaultValue?: string) => string;
  resolveNumber: (value: number | { path: string }, defaultValue?: number) => number;
  resolveBoolean: (value: boolean | { path: string }, defaultValue?: boolean) => boolean;
  resolveArray: <T>(value: T[] | { path: string }, defaultValue?: T[]) => T[];
  getBindingPath: (value: unknown) => string | null;

  // Component helpers
  getComponent: (componentId: string) => A2UIComponent | undefined;
  renderChild: (componentId: string) => React.ReactNode;
}

const A2UIContext = createContext<A2UIContextValue | null>(null);

/**
 * Props for A2UI Provider
 */
interface A2UIProviderProps {
  surfaceId: string;
  catalogId?: string;
  children: React.ReactNode;
  renderComponent: (component: A2UIComponent) => React.ReactNode;
}

/**
 * A2UI Context Provider
 */
export function A2UIProvider({
  surfaceId,
  catalogId = DEFAULT_CATALOG_ID,
  children,
  renderComponent,
}: A2UIProviderProps) {
  const surface = useA2UIStore((state) => state.surfaces[surfaceId]);
  const emitActionStore = useA2UIStore((state) => state.emitAction);
  const setDataValueStore = useA2UIStore((state) => state.setDataValue);

  const dataModel = useMemo(() => surface?.dataModel ?? {}, [surface]);
  const components = useMemo(() => surface?.components ?? {}, [surface]);
  const catalog = getCatalog(catalogId);

  const emitAction = useCallback(
    (action: string, componentId: string, data?: Record<string, unknown>) => {
      emitActionStore(surfaceId, action, componentId, data);
    },
    [surfaceId, emitActionStore]
  );

  const setDataValue = useCallback(
    (path: string, value: unknown) => {
      setDataValueStore(surfaceId, path, value);
    },
    [surfaceId, setDataValueStore]
  );

  const resolveString = useCallback(
    (value: string | { path: string }, defaultValue: string = '') => {
      return resolveStringOrPath(value, dataModel, defaultValue);
    },
    [dataModel]
  );

  const resolveNumber = useCallback(
    (value: number | { path: string }, defaultValue: number = 0) => {
      return resolveNumberOrPath(value, dataModel, defaultValue);
    },
    [dataModel]
  );

  const resolveBoolean = useCallback(
    (value: boolean | { path: string }, defaultValue: boolean = false) => {
      return resolveBooleanOrPath(value, dataModel, defaultValue);
    },
    [dataModel]
  );

  const resolveArray = useCallback(
    <T,>(value: T[] | { path: string }, defaultValue: T[] = []) => {
      return resolveArrayOrPath<T>(value, dataModel, defaultValue);
    },
    [dataModel]
  );

  const getComponent = useCallback(
    (componentId: string) => {
      return components[componentId];
    },
    [components]
  );

  const renderChild = useCallback(
    (componentId: string): React.ReactNode => {
      const component = components[componentId];
      if (!component) {
        console.warn(`[A2UI] Component not found: ${componentId}`);
        return null;
      }
      return renderComponent(component);
    },
    [components, renderComponent]
  );

  const contextValue = useMemo<A2UIContextValue>(
    () => ({
      surface: surface ?? null,
      surfaceId,
      dataModel,
      components,
      catalog,
      emitAction,
      setDataValue,
      resolveString,
      resolveNumber,
      resolveBoolean,
      resolveArray,
      getBindingPath,
      getComponent,
      renderChild,
    }),
    [
      surface,
      surfaceId,
      dataModel,
      components,
      catalog,
      emitAction,
      setDataValue,
      resolveString,
      resolveNumber,
      resolveBoolean,
      resolveArray,
      getComponent,
      renderChild,
    ]
  );

  return <A2UIContext.Provider value={contextValue}>{children}</A2UIContext.Provider>;
}

/**
 * Hook to access A2UI context
 */
export function useA2UIContext(): A2UIContextValue {
  const context = useContext(A2UIContext);
  if (!context) {
    throw new Error('useA2UIContext must be used within an A2UIProvider');
  }
  return context;
}

/**
 * Hook to get a specific component from context
 */
export function useA2UIComponent(componentId: string): A2UIComponent | undefined {
  const { getComponent } = useA2UIContext();
  return getComponent(componentId);
}

/**
 * Hook for data binding - returns value and setter
 */
export function useA2UIBinding<T>(
  path: string,
  defaultValue: T
): [T, (value: T) => void] {
  const { dataModel, setDataValue } = useA2UIContext();

  const value = useMemo(() => {
    const segments = path.split('/').filter(Boolean);
    let current: unknown = dataModel;

    for (const segment of segments) {
      if (current === null || current === undefined) {
        return defaultValue;
      }
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[segment];
      } else {
        return defaultValue;
      }
    }

    return (current as T) ?? defaultValue;
  }, [dataModel, path, defaultValue]);

  const setValue = useCallback(
    (newValue: T) => {
      setDataValue(path, newValue);
    },
    [setDataValue, path]
  );

  return [value, setValue];
}

/**
 * Hook for component visibility based on data binding
 */
export function useA2UIVisibility(
  visible?: boolean | { path: string }
): boolean {
  const { resolveBoolean } = useA2UIContext();
  
  if (visible === undefined) {
    return true;
  }
  
  return resolveBoolean(visible, true);
}

/**
 * Hook for component disabled state based on data binding
 */
export function useA2UIDisabled(
  disabled?: boolean | { path: string }
): boolean {
  const { resolveBoolean } = useA2UIContext();
  
  if (disabled === undefined) {
    return false;
  }
  
  return resolveBoolean(disabled, false);
}
