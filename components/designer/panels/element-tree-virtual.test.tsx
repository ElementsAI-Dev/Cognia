'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ElementTreeVirtual } from './element-tree-virtual';

jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: jest.fn(() => ({
    getTotalSize: () => 100,
    getVirtualItems: () => [],
  })),
}));

jest.mock('@/stores/designer', () => ({
  useDesignerStore: jest.fn((selector) => {
    const state = {
      elementTree: null,
      selectedElementId: null,
      hoveredElementId: null,
      selectElement: jest.fn(),
      hoverElement: jest.fn(),
      deleteElement: jest.fn(),
      duplicateElement: jest.fn(),
      syncCodeFromElements: jest.fn(),
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

jest.mock('@/hooks/designer', () => ({
  useElementTreeVisibility: jest.fn(() => ({
    flattenedNodes: [],
    toggleExpand: jest.fn(),
    expandAll: jest.fn(),
    collapseAll: jest.fn(),
    totalCount: 0,
  })),
}));

const messages = {
  elementTree: {
    noElements: 'No elements',
    noElementsDesc: 'Elements will appear here when code is loaded',
    elements: 'elements',
    expandAll: 'Expand all',
    collapseAll: 'Collapse all',
    selectElement: 'Select',
    copyId: 'Copy ID',
    copyTagName: 'Copy tag',
    copyClasses: 'Copy classes',
    duplicate: 'Duplicate',
    expand: 'Expand',
    collapse: 'Collapse',
    deleteElement: 'Delete',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('ElementTreeVirtual', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no elements', () => {
    renderWithProviders(<ElementTreeVirtual />);
    expect(screen.getByText('noElements')).toBeInTheDocument();
  });

  it('renders empty state description', () => {
    renderWithProviders(<ElementTreeVirtual />);
    expect(screen.getByText('noElementsDesc')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = renderWithProviders(<ElementTreeVirtual className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

