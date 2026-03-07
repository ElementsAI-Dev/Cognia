/**
 * @jest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PromptPublishDialog } from './prompt-publish-dialog';

const mockPublishPrompt = jest.fn();

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/components/ui/sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/stores/prompt/prompt-marketplace-store', () => ({
  usePromptMarketplaceStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      publishPrompt: mockPublishPrompt,
    }),
}));

jest.mock('@/stores/prompt/prompt-template-store', () => ({
  usePromptTemplateStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      templates: [
        {
          id: 'tmpl-1',
          name: 'Template One',
          description: 'Template description',
          content: 'Hello {{name}}',
          category: 'chat',
          tags: ['Alpha', 'alpha', ' Productive '],
          variables: [{ name: 'name', type: 'text', required: true }],
          targets: ['chat'],
          source: 'user',
        },
      ],
    }),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <span onClick={onClick}>{children}</span>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    onValueChange?: (value: string) => void;
  }) => (
    <div>
      <button onClick={() => onValueChange?.('chat')}>set-chat</button>
      <button onClick={() => onValueChange?.('coding')}>set-coding</button>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span>value</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/types/content/prompt-marketplace', () => ({
  MARKETPLACE_CATEGORIES: [
    { id: 'chat', name: 'Chat', icon: '💬' },
    { id: 'coding', name: 'Coding', icon: '💻' },
    { id: 'featured', name: 'Featured', icon: '⭐' },
  ],
}));

describe('PromptPublishDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPublishPrompt.mockResolvedValue('published-1');
  });

  it('publishes with normalized tags', async () => {
    render(<PromptPublishDialog />);

    fireEvent.click(screen.getByText('Template One'));
    fireEvent.click(screen.getByText('publish.next'));
    fireEvent.click(screen.getByText('publish.publishButton'));

    await waitFor(() => {
      expect(mockPublishPrompt).toHaveBeenCalledWith(
        'tmpl-1',
        expect.objectContaining({
          tags: ['alpha', 'productive'],
          category: 'chat',
        })
      );
    });
  });

  it('shows field-level validation for missing required data', async () => {
    render(<PromptPublishDialog />);

    fireEvent.click(screen.getByText('Template One'));
    const nameInput = screen.getByPlaceholderText('publish.namePlaceholder');
    const descriptionInput = screen.getByPlaceholderText('publish.descriptionPlaceholder');
    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.change(descriptionInput, { target: { value: '' } });

    expect(screen.getByText('publish.next')).toBeDisabled();
  });
});
