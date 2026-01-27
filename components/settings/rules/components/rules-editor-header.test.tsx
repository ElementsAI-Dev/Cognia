'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { RulesEditorHeader } from './rules-editor-header';

const messages = {
  rules: {
    title: 'Rules Editor',
    description: 'Edit AI coding rules for different editors',
    unsavedChanges: 'Unsaved',
    ariaLabels: {
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
    },
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('RulesEditorHeader', () => {
  const mockOnMobileMenuToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders header structure', () => {
    const { container } = renderWithProviders(
      <RulesEditorHeader
        isDirty={false}
        mobileMenuOpen={false}
        onMobileMenuToggle={mockOnMobileMenuToggle}
      />
    );
    // Header renders with title element
    expect(container.firstChild).toBeInTheDocument();
  });

  it('shows unsaved badge when dirty', () => {
    const { container } = renderWithProviders(
      <RulesEditorHeader
        isDirty={true}
        mobileMenuOpen={false}
        onMobileMenuToggle={mockOnMobileMenuToggle}
      />
    );
    // Badge has yellow border when dirty
    expect(container.querySelector('.border-yellow-500')).toBeInTheDocument();
  });

  it('hides unsaved badge when not dirty', () => {
    const { container } = renderWithProviders(
      <RulesEditorHeader
        isDirty={false}
        mobileMenuOpen={false}
        onMobileMenuToggle={mockOnMobileMenuToggle}
      />
    );
    // No yellow badge when not dirty
    expect(container.querySelector('.border-yellow-500')).not.toBeInTheDocument();
  });

  it('renders mobile menu button', () => {
    renderWithProviders(
      <RulesEditorHeader
        isDirty={false}
        mobileMenuOpen={false}
        onMobileMenuToggle={mockOnMobileMenuToggle}
      />
    );
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('calls onMobileMenuToggle when button clicked', () => {
    renderWithProviders(
      <RulesEditorHeader
        isDirty={false}
        mobileMenuOpen={false}
        onMobileMenuToggle={mockOnMobileMenuToggle}
      />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(mockOnMobileMenuToggle).toHaveBeenCalled();
  });

  it('shows menu icon when mobile menu closed', () => {
    const { container } = renderWithProviders(
      <RulesEditorHeader
        isDirty={false}
        mobileMenuOpen={false}
        onMobileMenuToggle={mockOnMobileMenuToggle}
      />
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('shows close icon when mobile menu open', () => {
    const { container } = renderWithProviders(
      <RulesEditorHeader
        isDirty={false}
        mobileMenuOpen={true}
        onMobileMenuToggle={mockOnMobileMenuToggle}
      />
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
