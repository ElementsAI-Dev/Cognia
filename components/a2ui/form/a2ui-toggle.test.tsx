/**
 * A2UI Toggle Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { A2UIToggle } from './a2ui-toggle';
import type { A2UIToggleComponent, A2UIComponentProps } from '@/types/artifact/a2ui';

// Mock the A2UI context
jest.mock('../a2ui-context', () => ({
  useA2UIContext: () => ({
    dataModel: { isActive: true },
  }),
}));

// Mock data-model resolvers
jest.mock('@/lib/a2ui/data-model', () => ({
  resolveStringOrPath: (value: string | { path: string }, _dm: unknown, def: string) =>
    typeof value === 'string' ? value : def,
  resolveBooleanOrPath: (value: boolean | { path: string }, dm: Record<string, unknown>, def: boolean) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'object' && 'path' in value) {
      const key = value.path.replace(/^\//, '');
      return (dm as Record<string, unknown>)[key] ?? def;
    }
    return def;
  },
}));

describe('A2UIToggle', () => {
  const mockOnAction = jest.fn();
  const mockOnDataChange = jest.fn();
  const mockRenderChild = jest.fn(() => null);

  const createProps = (component: A2UIToggleComponent): A2UIComponentProps<A2UIToggleComponent> => ({
    component,
    surfaceId: 'test-surface',
    dataModel: { isActive: true },
    onAction: mockOnAction,
    onDataChange: mockOnDataChange,
    renderChild: mockRenderChild,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render toggle with label', () => {
    const component: A2UIToggleComponent = {
      id: 'toggle-1',
      component: 'Toggle',
      label: 'Bold',
    };

    render(<A2UIToggle {...createProps(component)} />);
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
  });

  it('should render toggle without label using id as aria-label', () => {
    const component: A2UIToggleComponent = {
      id: 'toggle-2',
      component: 'Toggle',
    };

    render(<A2UIToggle {...createProps(component)} />);
    expect(screen.getByRole('button', { name: 'toggle-2' })).toBeInTheDocument();
  });

  it('should fire action on press change', () => {
    const component: A2UIToggleComponent = {
      id: 'toggle-3',
      component: 'Toggle',
      label: 'Enable',
      action: 'toggle_feature',
    };

    render(<A2UIToggle {...createProps(component)} />);
    fireEvent.click(screen.getByRole('button'));

    expect(mockOnAction).toHaveBeenCalledWith('toggle_feature', { pressed: true });
  });

  it('should update data model when pressed with bound path', () => {
    const component: A2UIToggleComponent = {
      id: 'toggle-4',
      component: 'Toggle',
      label: 'Active',
      pressed: { path: '/isActive' },
    };

    render(<A2UIToggle {...createProps(component)} />);
    fireEvent.click(screen.getByRole('button'));

    expect(mockOnDataChange).toHaveBeenCalledWith('/isActive', expect.any(Boolean));
  });

  it('should render as disabled', () => {
    const component: A2UIToggleComponent = {
      id: 'toggle-5',
      component: 'Toggle',
      label: 'Disabled',
      disabled: true,
    };

    render(<A2UIToggle {...createProps(component)} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
