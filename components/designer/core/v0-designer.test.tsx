'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { V0Designer } from './v0-designer';

jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      providerSettings: {},
      defaultProvider: 'openai',
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
  useArtifactStore: jest.fn((selector) => {
    const state = {
      createCanvasDocument: jest.fn(() => 'doc-1'),
      setActiveCanvas: jest.fn(),
      openPanel: jest.fn(),
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

jest.mock('@/lib/designer', () => ({
  DESIGNER_TEMPLATES: [
    { id: 'blank', name: 'Blank', description: 'Empty', category: 'basic', code: '' },
    { id: 'landing', name: 'Landing', description: 'Landing page', category: 'pages', code: '<div/>' },
  ],
  TEMPLATE_CATEGORIES: ['basic', 'pages'],
  AI_SUGGESTIONS: ['Add button', 'Add form'],
  executeDesignerAIEdit: jest.fn(),
  getDesignerAIConfig: jest.fn(),
}));

jest.mock('../editor', () => ({
  ReactSandbox: ({ code }: { code: string }) => <div data-testid="sandbox">{code}</div>,
}));

jest.mock('../dnd', () => ({
  DesignerDndProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../ai', () => ({
  AIChatPanel: () => <div data-testid="ai-chat">AI Chat</div>,
}));

const messages = {
  v0Designer: {
    undo: 'Undo',
    redo: 'Redo',
    copyCode: 'Copy Code',
    downloadCode: 'Download',
    templates: 'Templates',
    editCode: 'Edit Code',
    openInCanvas: 'Open in Canvas',
    aiEdit: 'AI Edit',
    aiChat: 'AI Chat',
    aiChatTooltip: 'Open AI chat',
    save: 'Save',
    chooseTemplate: 'Choose Template',
    chooseTemplateDesc: 'Select a template',
    all: 'All',
    generate: 'Generate',
    aiPlaceholder: 'Describe changes...',
    copied: 'Copied',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('V0Designer', () => {
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    renderWithProviders(<V0Designer open={true} onOpenChange={mockOnOpenChange} />);
    expect(screen.getByText('Designer')).toBeInTheDocument();
  });

  it('renders undo/redo buttons', () => {
    renderWithProviders(<V0Designer open={true} onOpenChange={mockOnOpenChange} />);
    expect(screen.getByText('Undo')).toBeInTheDocument();
    expect(screen.getByText('Redo')).toBeInTheDocument();
  });

  it('renders templates button', () => {
    renderWithProviders(<V0Designer open={true} onOpenChange={mockOnOpenChange} />);
    expect(screen.getByText('Templates')).toBeInTheDocument();
  });

  it('renders AI edit button', () => {
    renderWithProviders(<V0Designer open={true} onOpenChange={mockOnOpenChange} />);
    expect(screen.getByText('AI Edit')).toBeInTheDocument();
  });

  it('renders sandbox component', () => {
    renderWithProviders(<V0Designer open={true} onOpenChange={mockOnOpenChange} />);
    expect(screen.getByTestId('sandbox')).toBeInTheDocument();
  });

  it('has AI Edit button that can be clicked', () => {
    renderWithProviders(<V0Designer open={true} onOpenChange={mockOnOpenChange} />);
    const aiEditButton = screen.getByText('AI Edit');
    expect(aiEditButton).toBeInTheDocument();
    fireEvent.click(aiEditButton);
  });

  it('renders save button when onSave provided', () => {
    const onSave = jest.fn();
    renderWithProviders(<V0Designer open={true} onOpenChange={mockOnOpenChange} onSave={onSave} />);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('calls onSave when save clicked', () => {
    const onSave = jest.fn();
    renderWithProviders(<V0Designer open={true} onOpenChange={mockOnOpenChange} onSave={onSave} />);
    fireEvent.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalled();
  });
});
