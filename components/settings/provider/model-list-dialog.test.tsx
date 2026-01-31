/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ModelListDialog } from './model-list-dialog';

import type { ModelConfig } from '@/types/provider'

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ placeholder, onChange }: { placeholder?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
    <input data-testid="search-input" placeholder={placeholder} onChange={onChange} />
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button data-testid="button" onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (checked: boolean) => void }) => (
    <input type="checkbox" data-testid="checkbox" checked={checked} onChange={(e) => onCheckedChange?.(e.target.checked)} />
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div data-testid="scroll-area">{children}</div>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (value: string) => void }) => (
    <div data-testid="tabs" data-value={value} onClick={() => onValueChange?.('all')}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-testid={`tab-trigger-${value}`}>{children}</button>
  ),
}));

const mockModels: ModelConfig[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    contextLength: 8192,
    supportsTools: true,
    supportsVision: true,
    supportsAudio: false,
    supportsVideo: false,
    supportsStreaming: true,
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    contextLength: 4096,
    supportsTools: true,
    supportsVision: false,
    supportsAudio: false,
    supportsVideo: false,
    supportsStreaming: true,
  },
];

describe('ModelListDialog', () => {
  const mockOnOpenChange = jest.fn();
  const mockOnModelsChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    render(
      <ModelListDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        models={mockModels}
        selectedModels={[]}
        onModelsChange={mockOnModelsChange}
        providerName="OpenAI"
      />
    );
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <ModelListDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        models={mockModels}
        selectedModels={[]}
        onModelsChange={mockOnModelsChange}
        providerName="OpenAI"
      />
    );
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('displays search input', () => {
    render(
      <ModelListDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        models={mockModels}
        selectedModels={[]}
        onModelsChange={mockOnModelsChange}
        providerName="OpenAI"
      />
    );
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  it('displays model checkboxes', () => {
    render(
      <ModelListDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        models={mockModels}
        selectedModels={[]}
        onModelsChange={mockOnModelsChange}
        providerName="OpenAI"
      />
    );
    const checkboxes = screen.getAllByTestId('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it('displays filter tabs', () => {
    render(
      <ModelListDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        models={mockModels}
        selectedModels={[]}
        onModelsChange={mockOnModelsChange}
        providerName="OpenAI"
      />
    );
    expect(screen.getByTestId('tabs')).toBeInTheDocument();
    expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
  });

  it('displays filter tab triggers for each filter type', () => {
    render(
      <ModelListDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        models={mockModels}
        selectedModels={[]}
        onModelsChange={mockOnModelsChange}
        providerName="OpenAI"
      />
    );
    expect(screen.getByTestId('tab-trigger-all')).toBeInTheDocument();
    expect(screen.getByTestId('tab-trigger-vision')).toBeInTheDocument();
    expect(screen.getByTestId('tab-trigger-tools')).toBeInTheDocument();
    expect(screen.getByTestId('tab-trigger-reasoning')).toBeInTheDocument();
  });
});
