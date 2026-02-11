/**
 * A2UI Tabs Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { A2UITabs } from './a2ui-tabs';
import type { A2UITabsComponent, A2UIComponentProps } from '@/types/artifact/a2ui';

// Mock the A2UI context
jest.mock('../a2ui-context', () => ({
  useA2UIContext: () => ({
    dataModel: {},
  }),
}));

// Mock data-model resolvers
jest.mock('@/lib/a2ui/data-model', () => ({
  resolveStringOrPath: (value: string | { path: string }, _dm: unknown, def: string) =>
    typeof value === 'string' ? value : def,
}));

// Mock A2UIChildRenderer
jest.mock('../a2ui-renderer', () => ({
  A2UIChildRenderer: ({ childIds }: { childIds: string[] }) => (
    <div data-testid="child-renderer">{childIds.join(',')}</div>
  ),
}));

describe('A2UITabs', () => {
  const mockOnAction = jest.fn();
  const mockOnDataChange = jest.fn();
  const mockRenderChild = jest.fn(() => null);

  const createProps = (component: A2UITabsComponent): A2UIComponentProps<A2UITabsComponent> => ({
    component,
    surfaceId: 'test-surface',
    dataModel: {},
    onAction: mockOnAction,
    onDataChange: mockOnDataChange,
    renderChild: mockRenderChild,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render tabs with labels', () => {
    const component: A2UITabsComponent = {
      id: 'tabs-1',
      component: 'Tabs',
      tabs: [
        { id: 'tab1', label: 'First Tab', children: ['child-1'] },
        { id: 'tab2', label: 'Second Tab', children: ['child-2'] },
      ],
    };

    render(<A2UITabs {...createProps(component)} />);
    expect(screen.getByRole('tab', { name: 'First Tab' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Second Tab' })).toBeInTheDocument();
  });

  it('should activate first tab by default', () => {
    const component: A2UITabsComponent = {
      id: 'tabs-2',
      component: 'Tabs',
      tabs: [
        { id: 'tab1', label: 'Tab A', children: ['child-a'] },
        { id: 'tab2', label: 'Tab B', children: ['child-b'] },
      ],
    };

    render(<A2UITabs {...createProps(component)} />);
    expect(screen.getByRole('tab', { name: 'Tab A' })).toHaveAttribute('aria-selected', 'true');
  });

  it('should use defaultTab when specified', () => {
    const component: A2UITabsComponent = {
      id: 'tabs-3',
      component: 'Tabs',
      defaultTab: 'tab2',
      tabs: [
        { id: 'tab1', label: 'Tab A', children: ['child-a'] },
        { id: 'tab2', label: 'Tab B', children: ['child-b'] },
      ],
    };

    render(<A2UITabs {...createProps(component)} />);
    expect(screen.getByRole('tab', { name: 'Tab B' })).toHaveAttribute('aria-selected', 'true');
  });

  it('should fire tabChangeAction when switching tabs', () => {
    const component: A2UITabsComponent = {
      id: 'tabs-4',
      component: 'Tabs',
      tabChangeAction: 'tab_changed',
      tabs: [
        { id: 'tab1', label: 'Tab A', children: ['child-a'] },
        { id: 'tab2', label: 'Tab B', children: ['child-b'] },
      ],
    };

    render(<A2UITabs {...createProps(component)} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Tab B' }));

    expect(mockOnAction).toHaveBeenCalledWith('tab_changed', { tab: 'tab2' });
  });

  it('should render disabled tabs', () => {
    const component: A2UITabsComponent = {
      id: 'tabs-5',
      component: 'Tabs',
      tabs: [
        { id: 'tab1', label: 'Enabled', children: ['child-1'] },
        { id: 'tab2', label: 'Disabled', children: ['child-2'], disabled: true },
      ],
    };

    render(<A2UITabs {...createProps(component)} />);
    expect(screen.getByRole('tab', { name: 'Disabled' })).toBeDisabled();
  });
});
