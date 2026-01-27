'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { RulesEditorFooter } from './rules-editor-footer';

const messages = {
  rules: {
    chars: 'chars',
    words: 'words',
    tokens: 'Tokens',
    unsavedChanges: 'Unsaved',
    synced: 'Synced',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('RulesEditorFooter', () => {
  it('renders char count', () => {
    renderWithProviders(
      <RulesEditorFooter
        activeTab="cursor"
        charCount={100}
        wordCount={20}
        tokenEstimate={30}
        isDirty={false}
      />
    );
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders word count', () => {
    renderWithProviders(
      <RulesEditorFooter
        activeTab="cursor"
        charCount={100}
        wordCount={20}
        tokenEstimate={30}
        isDirty={false}
      />
    );
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('renders token estimate', () => {
    renderWithProviders(
      <RulesEditorFooter
        activeTab="cursor"
        charCount={100}
        wordCount={20}
        tokenEstimate={30}
        isDirty={false}
      />
    );
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('renders badge when not dirty', () => {
    const { container } = renderWithProviders(
      <RulesEditorFooter
        activeTab="cursor"
        charCount={100}
        wordCount={20}
        tokenEstimate={30}
        isDirty={false}
      />
    );
    // Badge contains green indicator dot when synced
    expect(container.querySelector('.bg-green-500')).toBeInTheDocument();
  });

  it('renders badge when dirty', () => {
    const { container } = renderWithProviders(
      <RulesEditorFooter
        activeTab="cursor"
        charCount={100}
        wordCount={20}
        tokenEstimate={30}
        isDirty={true}
      />
    );
    // Badge contains yellow indicator dot when unsaved
    expect(container.querySelector('.bg-yellow-500')).toBeInTheDocument();
  });

  it('shows cursor path when cursor tab active', () => {
    renderWithProviders(
      <RulesEditorFooter
        activeTab="cursor"
        charCount={100}
        wordCount={20}
        tokenEstimate={30}
        isDirty={false}
      />
    );
    expect(screen.getByText('.cursorrules')).toBeInTheDocument();
  });

  it('shows windsurf path when windsurf tab active', () => {
    renderWithProviders(
      <RulesEditorFooter
        activeTab="windsurf"
        charCount={100}
        wordCount={20}
        tokenEstimate={30}
        isDirty={false}
      />
    );
    expect(screen.getByText('.windsurfrules')).toBeInTheDocument();
  });

  it('shows copilot path when copilot tab active', () => {
    renderWithProviders(
      <RulesEditorFooter
        activeTab="copilot"
        charCount={100}
        wordCount={20}
        tokenEstimate={30}
        isDirty={false}
      />
    );
    expect(screen.getByText('.github/copilot-instructions.md')).toBeInTheDocument();
  });
});
