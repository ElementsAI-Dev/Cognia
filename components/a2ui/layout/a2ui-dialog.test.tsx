/**
 * A2UI Dialog Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { A2UIDialog } from './a2ui-dialog';
import type { A2UIDialogComponent } from '@/types/artifact/a2ui';

// Mock the context
jest.mock('../a2ui-context', () => ({
  useA2UIContext: jest.fn(() => ({
    resolveString: jest.fn((value) => (typeof value === 'string' ? value : '')),
    resolveBoolean: jest.fn((value, defaultVal) => (typeof value === 'boolean' ? value : defaultVal)),
    getBindingPath: jest.fn(() => null),
  })),
}));

// Mock the child renderer
jest.mock('../a2ui-renderer', () => ({
  A2UIChildRenderer: ({ childIds }: { childIds: string[] }) => (
    <div data-testid="child-renderer">{childIds.join(', ')}</div>
  ),
}));

const createMockComponent = (overrides: Partial<A2UIDialogComponent> = {}): A2UIDialogComponent => ({
  id: 'test-dialog',
  component: 'Dialog',
  open: false,
  children: [],
  ...overrides,
});

const defaultProps = {
  surfaceId: 'test-surface',
  dataModel: {},
  onDataChange: jest.fn(),
  renderChild: jest.fn(),
};

describe('A2UIDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should not render dialog content when closed', () => {
      render(
        <A2UIDialog
          {...defaultProps}
          component={createMockComponent({ open: false })}
          onAction={jest.fn()}
        />
      );
      
      // Dialog content should not be visible when closed
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render dialog when open is true', () => {
      const mockUseA2UIContext = jest.requireMock('../a2ui-context').useA2UIContext;
      mockUseA2UIContext.mockReturnValue({
        resolveString: jest.fn((value) => (typeof value === 'string' ? value : '')),
        resolveBoolean: jest.fn(() => true),
        getBindingPath: jest.fn(() => null),
      });

      render(
        <A2UIDialog
          {...defaultProps}
          component={createMockComponent({ open: true, title: 'Test Title' })}
          onAction={jest.fn()}
        />
      );
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should render title when provided', () => {
      const mockUseA2UIContext = jest.requireMock('../a2ui-context').useA2UIContext;
      mockUseA2UIContext.mockReturnValue({
        resolveString: jest.fn((value) => value),
        resolveBoolean: jest.fn(() => true),
        getBindingPath: jest.fn(() => null),
      });

      render(
        <A2UIDialog
          {...defaultProps}
          component={createMockComponent({ open: true, title: 'Dialog Title' })}
          onAction={jest.fn()}
        />
      );
      
      expect(screen.getByText('Dialog Title')).toBeInTheDocument();
    });

    it('should render description when provided', () => {
      const mockUseA2UIContext = jest.requireMock('../a2ui-context').useA2UIContext;
      mockUseA2UIContext.mockReturnValue({
        resolveString: jest.fn((value) => value),
        resolveBoolean: jest.fn(() => true),
        getBindingPath: jest.fn(() => null),
      });

      render(
        <A2UIDialog
          {...defaultProps}
          component={createMockComponent({ 
            open: true, 
            title: 'Title',
            description: 'Dialog Description' 
          })}
          onAction={jest.fn()}
        />
      );
      
      expect(screen.getByText('Dialog Description')).toBeInTheDocument();
    });
  });

  describe('children rendering', () => {
    it('should render children when provided', () => {
      const mockUseA2UIContext = jest.requireMock('../a2ui-context').useA2UIContext;
      mockUseA2UIContext.mockReturnValue({
        resolveString: jest.fn((value) => value),
        resolveBoolean: jest.fn(() => true),
        getBindingPath: jest.fn(() => null),
      });

      render(
        <A2UIDialog
          {...defaultProps}
          component={createMockComponent({ 
            open: true,
            children: ['child-1', 'child-2']
          })}
          onAction={jest.fn()}
        />
      );
      
      expect(screen.getByTestId('child-renderer')).toBeInTheDocument();
      expect(screen.getByText('child-1, child-2')).toBeInTheDocument();
    });
  });

  describe('actions rendering', () => {
    it('should render actions when provided', () => {
      const mockUseA2UIContext = jest.requireMock('../a2ui-context').useA2UIContext;
      mockUseA2UIContext.mockReturnValue({
        resolveString: jest.fn((value) => value),
        resolveBoolean: jest.fn(() => true),
        getBindingPath: jest.fn(() => null),
      });

      render(
        <A2UIDialog
          {...defaultProps}
          component={createMockComponent({ 
            open: true,
            actions: ['action-1', 'action-2']
          })}
          onAction={jest.fn()}
        />
      );
      
      // Actions should be rendered in footer
      const childRenderers = screen.getAllByTestId('child-renderer');
      expect(childRenderers.length).toBeGreaterThan(0);
    });
  });
});
