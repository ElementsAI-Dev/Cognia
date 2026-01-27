'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { RulesEditorPreview } from './rules-editor-preview';

jest.mock('@/components/chat/utils/markdown-renderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => (
    <div data-testid="markdown-renderer">{content}</div>
  ),
}));

const messages = {
  rules: {
    preview: 'Preview',
    noContent: 'No content',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('RulesEditorPreview', () => {
  it('renders preview label', () => {
    renderWithProviders(<RulesEditorPreview content="Test content" />);
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('renders markdown content', () => {
    renderWithProviders(<RulesEditorPreview content="# Hello World" />);
    expect(screen.getByTestId('markdown-renderer')).toBeInTheDocument();
    expect(screen.getByText('# Hello World')).toBeInTheDocument();
  });

  it('shows no content message when empty', () => {
    renderWithProviders(<RulesEditorPreview content="" />);
    expect(screen.getByText('# No content')).toBeInTheDocument();
  });

  it('renders eye icon', () => {
    const { container } = renderWithProviders(<RulesEditorPreview content="Test" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('has scroll area', () => {
    const { container } = renderWithProviders(<RulesEditorPreview content="Test" />);
    const scrollArea = container.querySelector('[data-radix-scroll-area-viewport]');
    expect(scrollArea || container.querySelector('.h-full')).toBeInTheDocument();
  });
});
