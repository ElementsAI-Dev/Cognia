/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemorySettings } from './memory-settings';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      title: 'Memory Settings',
      description: 'Configure how Claude remembers information across conversations',
      enableMemory: 'Enable Memory',
      enableMemoryDesc: 'Allow Claude to remember information',
      autoDetect: 'Auto-detect memories',
      autoDetectDesc: 'Automatically detect important information',
      injectPrompt: 'Include in system prompt',
      injectPromptDesc: 'Include memories in system prompt',
      storedMemories: 'Stored Memories',
      addMemory: 'Add Memory',
      searchMemories: 'Search memories...',
      noMemories: 'No memories stored yet',
      memoriesCount: `${params?.count ?? 0} memories stored`,
      addMemoryHint: 'Add a new memory to store',
      memoryType: 'Type',
      memoryContent: 'Content',
      memoryCategory: 'Category (optional)',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      clearAll: 'Clear All',
      clearAllConfirm: 'Are you sure you want to clear all memories?',
      preference: 'preference',
      fact: 'fact',
      instruction: 'instruction',
      context: 'context',
      contentPlaceholder: 'Enter memory content...',
      categoryPlaceholder: 'Enter category...',
    };
    return translations[key] || key;
  },
}));

// Mock stores
const mockUpdateSettings = jest.fn();
const mockCreateMemory = jest.fn();
const mockUpdateMemory = jest.fn();
const mockDeleteMemory = jest.fn();
const mockClearAllMemories = jest.fn();
const mockSearchMemories = jest.fn().mockReturnValue([]);

jest.mock('@/stores', () => ({
  useMemoryStore: () => ({
    memories: [],
    settings: {
      enabled: true,
      autoInfer: false,
      injectInSystemPrompt: true,
    },
    updateSettings: mockUpdateSettings,
    createMemory: mockCreateMemory,
    updateMemory: mockUpdateMemory,
    deleteMemory: mockDeleteMemory,
    clearAllMemories: mockClearAllMemories,
    searchMemories: mockSearchMemories,
    getMemoryStats: () => ({ total: 0, byType: {}, byCategory: {} }),
    getAllTags: () => [],
    exportMemories: jest.fn(),
    importMemories: jest.fn(),
  }),
}));

// Mock types
jest.mock('@/types', () => ({}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, id }: { checked?: boolean; onCheckedChange?: (v: boolean) => void; id?: string }) => (
    <button role="switch" aria-checked={checked} onClick={() => onCheckedChange?.(!checked)} data-testid={id || 'switch'}>Switch</button>
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input value={value} onChange={onChange} placeholder={placeholder} data-testid="input" />
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea value={value} onChange={onChange} placeholder={placeholder} data-testid="textarea" />
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div data-testid="select">{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  SelectValue: () => <span>Value</span>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog">{children}</div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  AlertDialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('MemorySettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<MemorySettings />);
    expect(screen.getAllByTestId('card').length).toBeGreaterThan(0);
  });

  it('displays Memory Settings title', () => {
    render(<MemorySettings />);
    expect(screen.getByText('Memory Settings')).toBeInTheDocument();
  });

  it('displays Enable Memory switch', () => {
    render(<MemorySettings />);
    expect(screen.getByText('Enable Memory')).toBeInTheDocument();
  });

  it('displays Auto-detect memories switch', () => {
    render(<MemorySettings />);
    expect(screen.getByText('Auto-detect memories')).toBeInTheDocument();
  });

  it('displays Include in system prompt switch', () => {
    render(<MemorySettings />);
    expect(screen.getByText('Include in system prompt')).toBeInTheDocument();
  });

  it('displays Stored Memories section', () => {
    render(<MemorySettings />);
    expect(screen.getByText('Stored Memories')).toBeInTheDocument();
  });

  it('displays Add Memory button', () => {
    render(<MemorySettings />);
    // Multiple elements with "Add Memory" text exist (button and dialog title)
    expect(screen.getAllByText('Add Memory').length).toBeGreaterThan(0);
  });

  it('displays search input', () => {
    render(<MemorySettings />);
    expect(screen.getAllByTestId('input').length).toBeGreaterThan(0);
  });

  it('displays empty state when no memories', () => {
    render(<MemorySettings />);
    expect(screen.getByText('No memories stored yet')).toBeInTheDocument();
  });

  it('toggles memory enabled state', () => {
    render(<MemorySettings />);
    const enableSwitch = screen.getByTestId('memory-enabled');
    fireEvent.click(enableSwitch);
    expect(mockUpdateSettings).toHaveBeenCalledWith({ enabled: false });
  });

  it('displays auto-infer switch', () => {
    render(<MemorySettings />);
    expect(screen.getByTestId('auto-infer')).toBeInTheDocument();
  });

  it('displays inject-prompt switch', () => {
    render(<MemorySettings />);
    expect(screen.getByTestId('inject-prompt')).toBeInTheDocument();
  });

  it('displays memory settings card title', () => {
    render(<MemorySettings />);
    expect(screen.getByText('Memory Settings')).toBeInTheDocument();
  });

  it('displays memory settings description', () => {
    render(<MemorySettings />);
    expect(screen.getByText(/Configure how Claude remembers information/)).toBeInTheDocument();
  });

  it('displays Enable Memory label', () => {
    render(<MemorySettings />);
    expect(screen.getByText('Enable Memory')).toBeInTheDocument();
  });

  it('displays Auto-detect memories label', () => {
    render(<MemorySettings />);
    expect(screen.getByText('Auto-detect memories')).toBeInTheDocument();
  });

  it('displays Include in system prompt label', () => {
    render(<MemorySettings />);
    expect(screen.getByText('Include in system prompt')).toBeInTheDocument();
  });

  it('displays memories count', () => {
    render(<MemorySettings />);
    expect(screen.getByText('0 memories stored')).toBeInTheDocument();
  });

  it('toggles auto-infer state', () => {
    render(<MemorySettings />);
    const autoInferSwitch = screen.getByTestId('auto-infer');
    fireEvent.click(autoInferSwitch);
    expect(mockUpdateSettings).toHaveBeenCalledWith({ autoInfer: true });
  });

  it('toggles inject-prompt state', () => {
    render(<MemorySettings />);
    const injectSwitch = screen.getByTestId('inject-prompt');
    fireEvent.click(injectSwitch);
    expect(mockUpdateSettings).toHaveBeenCalledWith({ injectInSystemPrompt: false });
  });

  it('displays Add New Memory dialog title', () => {
    render(<MemorySettings />);
    // The dialog title shows "Add Memory" based on the component
    expect(screen.getAllByText('Add Memory').length).toBeGreaterThan(0);
  });

  it('displays memory type selector', () => {
    render(<MemorySettings />);
    // Component renders lowercase translation key
    expect(screen.getByText('type')).toBeInTheDocument();
  });

  it('displays memory content textarea label', () => {
    render(<MemorySettings />);
    // Component renders lowercase translation key
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('displays category input label', () => {
    render(<MemorySettings />);
    // Component renders lowercase translation key
    expect(screen.getByText('category')).toBeInTheDocument();
  });

  it('handles search input change', () => {
    render(<MemorySettings />);
    const searchInputs = screen.getAllByTestId('input');
    const searchInput = searchInputs[0];
    fireEvent.change(searchInput, { target: { value: 'test query' } });
    expect(searchInput).toHaveValue('test query');
  });

  it('displays multiple buttons for actions', () => {
    render(<MemorySettings />);
    // Export, import, add memory buttons exist
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });
});

describe('MemorySettings interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all switch controls', () => {
    render(<MemorySettings />);
    expect(screen.getByTestId('memory-enabled')).toBeInTheDocument();
    expect(screen.getByTestId('auto-infer')).toBeInTheDocument();
    expect(screen.getByTestId('inject-prompt')).toBeInTheDocument();
  });

  it('displays zero memories count', () => {
    render(<MemorySettings />);
    expect(screen.getByText('0 memories stored')).toBeInTheDocument();
  });
});

describe('MemorySettings advanced features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders advanced settings section', () => {
    render(<MemorySettings />);
    // Advanced settings should be collapsed by default
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('displays dialog components', () => {
    render(<MemorySettings />);
    expect(screen.getAllByTestId('dialog').length).toBeGreaterThan(0);
  });

  it('displays select components for memory type', () => {
    render(<MemorySettings />);
    expect(screen.getAllByTestId('select').length).toBeGreaterThan(0);
  });

  it('handles empty state gracefully', () => {
    render(<MemorySettings />);
    expect(screen.getByText('No memories stored yet')).toBeInTheDocument();
  });
});
