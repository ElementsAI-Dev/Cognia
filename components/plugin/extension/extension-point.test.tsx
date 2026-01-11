/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PluginExtensionPoint, useHasExtensions, useExtensions } from './extension-point';
import { renderHook } from '@testing-library/react';

// Mock the extension API
jest.mock('@/lib/plugin/api/extension-api', () => ({
  getExtensionsForPoint: jest.fn(() => []),
}));

// Mock utils
jest.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

import { getExtensionsForPoint } from '@/lib/plugin/api/extension-api';

const mockGetExtensionsForPoint = getExtensionsForPoint as jest.MockedFunction<typeof getExtensionsForPoint>;

describe('PluginExtensionPoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetExtensionsForPoint.mockReturnValue([]);
  });

  it('should render nothing when no extensions are registered', () => {
    const { container } = render(<PluginExtensionPoint point="sidebar.left.top" />);
    expect(container.firstChild).toBeNull();
  });

  it('should render fallback when no extensions and fallback provided', () => {
    render(
      <PluginExtensionPoint 
        point="sidebar.left.top" 
        fallback={<span data-testid="fallback">No extensions</span>}
      />
    );
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });

  it('should render extensions when registered', () => {
    const TestComponent = () => <div data-testid="test-extension">Test Extension</div>;
    
    mockGetExtensionsForPoint.mockReturnValue([
      {
        id: 'test-ext-1',
        pluginId: 'test-plugin',
        point: 'sidebar.left.top',
        component: TestComponent,
        options: { priority: 0 },
      },
    ]);

    render(<PluginExtensionPoint point="sidebar.left.top" />);
    expect(screen.getByTestId('test-extension')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    mockGetExtensionsForPoint.mockReturnValue([
      {
        id: 'test-ext-1',
        pluginId: 'test-plugin',
        point: 'toolbar.right',
        component: () => <span>Extension</span>,
        options: { priority: 0 },
      },
    ]);

    const { container } = render(
      <PluginExtensionPoint point="toolbar.right" className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should render inline when inline prop is true', () => {
    mockGetExtensionsForPoint.mockReturnValue([
      {
        id: 'test-ext-1',
        pluginId: 'test-plugin',
        point: 'toolbar.right',
        component: () => <span>Extension</span>,
        options: { priority: 0 },
      },
    ]);

    const { container } = render(
      <PluginExtensionPoint point="toolbar.right" inline />
    );
    
    expect(container.firstChild).toHaveClass('inline-flex');
  });
});

describe('useHasExtensions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when no extensions', () => {
    mockGetExtensionsForPoint.mockReturnValue([]);
    const { result } = renderHook(() => useHasExtensions('sidebar.left.top'));
    expect(result.current).toBe(false);
  });

  it('should return true when extensions exist', () => {
    mockGetExtensionsForPoint.mockReturnValue([
      {
        id: 'test-ext-1',
        pluginId: 'test-plugin',
        point: 'sidebar.left.top',
        component: () => null,
        options: { priority: 0 },
      },
    ]);
    const { result } = renderHook(() => useHasExtensions('sidebar.left.top'));
    expect(result.current).toBe(true);
  });
});

describe('useExtensions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when no extensions', () => {
    mockGetExtensionsForPoint.mockReturnValue([]);
    const { result } = renderHook(() => useExtensions('sidebar.left.top'));
    expect(result.current).toEqual([]);
  });

  it('should return extensions array when extensions exist', () => {
    const mockExtensions = [
      {
        id: 'test-ext-1',
        pluginId: 'test-plugin',
        point: 'sidebar.left.top' as const,
        component: () => null,
        options: { priority: 0 },
      },
    ];
    mockGetExtensionsForPoint.mockReturnValue(mockExtensions);
    const { result } = renderHook(() => useExtensions('sidebar.left.top'));
    expect(result.current).toEqual(mockExtensions);
  });
});
