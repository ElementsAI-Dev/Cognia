/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PromptPublishDialog } from './prompt-publish-dialog';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock sonner
jest.mock('@/components/ui/sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

// Mock marketplace store
const mockPublishPrompt = jest.fn().mockResolvedValue('published-id-123');
jest.mock('@/stores/prompt/prompt-marketplace-store', () => ({
  usePromptMarketplaceStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      publishPrompt: mockPublishPrompt,
    };
    return selector(state);
  },
}));

// Mock template store
jest.mock('@/stores/prompt/prompt-template-store', () => ({
  usePromptTemplateStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      templates: [
        {
          id: 'tmpl-1',
          name: 'My Template',
          description: 'A custom template',
          content: 'Hello {{name}}!',
          tags: ['greeting', 'simple'],
          variables: [{ name: 'name', type: 'text', required: true }],
          targets: ['chat'],
          source: 'user',
          usageCount: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'tmpl-builtin',
          name: 'Built-in Template',
          description: 'A built-in',
          content: 'System prompt',
          tags: [],
          variables: [],
          targets: ['chat'],
          source: 'builtin',
          usageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : <>{children}</>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
    asChild ? <>{children}</> : <button>{children}</button>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, id }: { value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; id?: string }) => (
    <input value={value} onChange={onChange} placeholder={placeholder} id={id} data-testid={`input-${id || 'default'}`} />
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder, id }: { value?: string; onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; placeholder?: string; id?: string }) => (
    <textarea value={value} onChange={onChange} placeholder={placeholder} id={id} data-testid={`textarea-${id || 'default'}`} />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <span data-testid="badge" onClick={onClick}>{children}</span>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (v: string) => void }) => (
    <div data-testid="select" data-value={value} onClick={() => onValueChange?.('coding')}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span>Select</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
}));

// Mock types
jest.mock('@/types/content/prompt-marketplace', () => ({
  MARKETPLACE_CATEGORIES: [
    { id: 'chat', name: 'Chat', icon: '💬' },
    { id: 'coding', name: 'Coding', icon: '💻' },
    { id: 'writing', name: 'Writing', icon: '✍️' },
  ],
}));

describe('PromptPublishDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders trigger button', () => {
    render(<PromptPublishDialog />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders with custom trigger', () => {
    render(
      <PromptPublishDialog
        trigger={<button data-testid="custom-trigger">Custom</button>}
      />
    );
    expect(screen.getByTestId('custom-trigger')).toBeInTheDocument();
  });

  it('shows step 1 (select template) when dialog opens', () => {
    render(<PromptPublishDialog />);
    // Click the trigger to open dialog
    const trigger = screen.getAllByRole('button')[0];
    fireEvent.click(trigger);

    // Should show the user template (not built-in)
    expect(screen.getByText('My Template')).toBeInTheDocument();
  });

  it('filters out builtin templates', () => {
    render(<PromptPublishDialog />);
    const trigger = screen.getAllByRole('button')[0];
    fireEvent.click(trigger);

    // Should NOT show the built-in template
    expect(screen.queryByText('Built-in Template')).not.toBeInTheDocument();
    // Should show user template
    expect(screen.getByText('My Template')).toBeInTheDocument();
  });

  it('navigates to step 2 when template is selected', () => {
    render(<PromptPublishDialog />);
    const trigger = screen.getAllByRole('button')[0];
    fireEvent.click(trigger);

    // Click on the template to select it
    const templateButton = screen.getByText('My Template');
    fireEvent.click(templateButton);

    // Should now be on step 2 with name input
    expect(screen.getByTestId('input-publish-name')).toBeInTheDocument();
    expect(screen.getByTestId('textarea-publish-desc')).toBeInTheDocument();
  });

  it('prefills form with template data on selection', () => {
    render(<PromptPublishDialog />);
    const trigger = screen.getAllByRole('button')[0];
    fireEvent.click(trigger);

    const templateButton = screen.getByText('My Template');
    fireEvent.click(templateButton);

    const nameInput = screen.getByTestId('input-publish-name') as HTMLInputElement;
    expect(nameInput.value).toBe('My Template');
  });

  it('shows tags from selected template', () => {
    render(<PromptPublishDialog />);
    const trigger = screen.getAllByRole('button')[0];
    fireEvent.click(trigger);

    const templateButton = screen.getByText('My Template');
    fireEvent.click(templateButton);

    const badges = screen.getAllByTestId('badge');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('publishes prompt successfully', async () => {
    render(<PromptPublishDialog />);
    const trigger = screen.getAllByRole('button')[0];
    fireEvent.click(trigger);

    // Step 1: Select template
    fireEvent.click(screen.getByText('My Template'));

    // Step 2: Fill form
    const nameInput = screen.getByTestId('input-publish-name');
    fireEvent.change(nameInput, { target: { value: 'Published Name' } });

    const descInput = screen.getByTestId('textarea-publish-desc');
    fireEvent.change(descInput, { target: { value: 'Published description' } });

    // Click "Next" to go to step 3
    const nextButton = screen.getByText('publish.next');
    fireEvent.click(nextButton);

    // Step 3: Review and publish
    const publishButton = screen.getByText('publish.publishButton');
    fireEvent.click(publishButton);

    await waitFor(() => {
      expect(mockPublishPrompt).toHaveBeenCalledWith(
        'tmpl-1',
        expect.objectContaining({
          name: 'Published Name',
          description: 'Published description',
        })
      );
    });
  });
});
