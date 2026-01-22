import { create } from 'zustand';
import type { ReactNode } from 'react';

export type TitleBarArea = 'left' | 'center' | 'right';

export interface TitleBarItemContext {
  isTauri: boolean;
  t?: (key: string) => string;
}

export interface TitleBarItemDefinition {
  id: string;
  label: string;
  labelKey?: string;
  defaultArea: TitleBarArea;
  render: (ctx: TitleBarItemContext) => ReactNode;
}

interface TitleBarRegistryState {
  items: Record<string, TitleBarItemDefinition>;
  registerItem: (item: TitleBarItemDefinition) => void;
  unregisterItem: (id: string) => boolean;
}

export const useTitleBarRegistry = create<TitleBarRegistryState>((set, get) => ({
  items: {},
  registerItem: (item) => {
    set((state) => ({
      items: {
        ...state.items,
        [item.id]: item,
      },
    }));
  },
  unregisterItem: (id) => {
    if (!get().items[id]) return false;
    set((state) => {
      const next = { ...state.items };
      delete next[id];
      return { items: next };
    });
    return true;
  },
}));

export function registerTitleBarItem(item: TitleBarItemDefinition): void {
  useTitleBarRegistry.getState().registerItem(item);
}

export function unregisterTitleBarItem(id: string): boolean {
  return useTitleBarRegistry.getState().unregisterItem(id);
}
