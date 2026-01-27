/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PromptImportExport } from './prompt-import-export';

// Mock store
jest.mock('@/stores/prompt/prompt-marketplace-store', () => ({
  usePromptMarketplaceStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      userActivity: {
        installed: [
          { marketplaceId: 'prompt-1', installedAt: new Date() },
        ],
      },
      getPromptById: jest.fn().mockImplementation((id: string) => {
        if (id === 'prompt-1') {
          return {
            id: 'prompt-1',
            name: 'Test Prompt',
            description: 'A test prompt',
            content: 'Test content',
            category: 'writing',
            tags: ['test'],
            variables: [],
            author: { id: 'user-1', name: 'Test Author' },
          };
        }
        return null;
      }),
      installPrompt: jest.fn().mockResolvedValue(undefined),
    };
    return selector(state);
  },
}));

describe('PromptImportExport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders trigger button', () => {
    render(<PromptImportExport />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders with default trigger text', () => {
    render(<PromptImportExport />);
    expect(screen.getByText(/Import/i)).toBeInTheDocument();
  });

  it('accepts custom trigger element', () => {
    render(
      <PromptImportExport 
        trigger={<button data-testid="custom-trigger">Custom Trigger</button>} 
      />
    );
    expect(screen.getByTestId('custom-trigger')).toBeInTheDocument();
  });
});
