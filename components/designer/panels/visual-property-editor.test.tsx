'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { VisualPropertyEditor } from './visual-property-editor';

jest.mock('@/stores/designer', () => ({
  useDesignerStore: jest.fn((selector) => {
    const state = {
      selectedElementId: null,
      elementTree: null,
      updateElement: jest.fn(),
      syncCodeFromElements: jest.fn(),
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

const messages = {
  visualPropertyEditor: {
    noSelection: 'No element selected',
    noSelectionDesc: 'Select an element to edit its properties',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('VisualPropertyEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no element selected', () => {
    renderWithProviders(<VisualPropertyEditor />);
    expect(screen.getByText('noSelection')).toBeInTheDocument();
  });

  it('renders empty state description', () => {
    renderWithProviders(<VisualPropertyEditor />);
    expect(screen.getByText('noSelectionDesc')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = renderWithProviders(<VisualPropertyEditor className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

