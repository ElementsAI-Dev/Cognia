'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { A2UITemplatePreview } from './a2ui-template-preview';
import type { CustomModeA2UITemplate } from '@/stores/agent/custom-mode-store';

const messages = {
  customMode: {
    a2uiSettings: 'A2UI Settings',
    a2uiSettingsDesc: 'Configure A2UI components',
    noA2UITemplate: 'No A2UI template configured for this mode.',
  },
};

const mockTemplate: CustomModeA2UITemplate = {
  name: 'Test Template',
  description: 'A test template',
  components: [
    { id: 'btn-1', component: 'Button', text: 'Click me' },
    { id: 'txt-1', component: 'Text', text: 'Hello' },
  ],
  dataModel: { count: 0 },
  actions: [{ id: 'action-1', name: 'Submit', handler: 'handleSubmit' }],
} as unknown as CustomModeA2UITemplate;

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('A2UITemplatePreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders template name', () => {
    renderWithProviders(<A2UITemplatePreview template={mockTemplate} />);
    expect(screen.getByText('Test Template')).toBeInTheDocument();
  });

  it('renders template description', () => {
    renderWithProviders(<A2UITemplatePreview template={mockTemplate} />);
    expect(screen.getByText('A test template')).toBeInTheDocument();
  });

  it('renders component counts', () => {
    renderWithProviders(<A2UITemplatePreview template={mockTemplate} />);
    expect(screen.getByText('Button: 1')).toBeInTheDocument();
    expect(screen.getByText('Text: 1')).toBeInTheDocument();
  });

  it('renders preview section', () => {
    renderWithProviders(<A2UITemplatePreview template={mockTemplate} showPreview />);
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('renders data model keys', () => {
    renderWithProviders(<A2UITemplatePreview template={mockTemplate} />);
    expect(screen.getByText('count')).toBeInTheDocument();
  });

  it('renders actions', () => {
    renderWithProviders(<A2UITemplatePreview template={mockTemplate} />);
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('renders toggle button when onTogglePreview provided', () => {
    const onToggle = jest.fn();
    renderWithProviders(
      <A2UITemplatePreview template={mockTemplate} onTogglePreview={onToggle} />
    );
    expect(screen.getByText('Hide')).toBeInTheDocument();
  });

  it('calls onTogglePreview when toggle clicked', () => {
    const onToggle = jest.fn();
    renderWithProviders(
      <A2UITemplatePreview template={mockTemplate} onTogglePreview={onToggle} />
    );
    fireEvent.click(screen.getByText('Hide'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('shows Show when preview hidden', () => {
    renderWithProviders(
      <A2UITemplatePreview template={mockTemplate} showPreview={false} onTogglePreview={jest.fn()} />
    );
    expect(screen.getByText('Show')).toBeInTheDocument();
  });
});

describe('A2UITemplatePreview without template', () => {
  it('shows no template message', () => {
    renderWithProviders(<A2UITemplatePreview />);
    expect(screen.getByText('No A2UI template configured for this mode.')).toBeInTheDocument();
  });
});
