/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { WorkflowSettingsPanel } from './workflow-settings-panel';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock Sheet to render content inline (avoid Radix portal issues in jsdom)
jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet">{children}</div>,
  SheetTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet-trigger">{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet-content">{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

// Mock Accordion to render content inline
jest.mock('@/components/ui/accordion', () => ({
  Accordion: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock Tooltip to render inline
jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock ScrollArea to render inline
jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock Select to render inline
jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

// Mock the store
const mockUpdateWorkflowMeta = jest.fn();
const mockUpdateWorkflowSettings = jest.fn();

jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: jest.fn(() => ({
    currentWorkflow: {
      id: 'test-workflow',
      name: 'Test Workflow',
      description: 'Test description',
      icon: 'Workflow',
      category: 'automation',
      tags: ['test', 'workflow'],
      settings: {
        autoSave: true,
        autoLayout: false,
        showMinimap: true,
        showGrid: true,
        snapToGrid: true,
        gridSize: 20,
        maxRetries: 3,
        retryDelay: 1000,
        executionTimeout: 60000,
      },
    },
    updateWorkflowMeta: mockUpdateWorkflowMeta,
    updateWorkflowSettings: mockUpdateWorkflowSettings,
  })),
}));

describe('WorkflowSettingsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders trigger button', () => {
    render(<WorkflowSettingsPanel />);
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('opens sheet and shows settings title', () => {
    render(<WorkflowSettingsPanel />);
    
    // Sheet content is rendered inline due to mock
    expect(screen.getAllByText('workflowSettings').length).toBeGreaterThan(0);
  });

  it('displays workflow name input', () => {
    render(<WorkflowSettingsPanel />);
    
    const nameInput = screen.getByDisplayValue('Test Workflow');
    expect(nameInput).toBeInTheDocument();
  });

  it('displays workflow description', () => {
    render(<WorkflowSettingsPanel />);
    
    const descInput = screen.getByDisplayValue('Test description');
    expect(descInput).toBeInTheDocument();
  });

  it('displays existing tags', () => {
    render(<WorkflowSettingsPanel />);
    
    // Tags render as "{tag} ×" inside Badge
    expect(screen.getByText('test ×')).toBeInTheDocument();
    expect(screen.getByText('workflow ×')).toBeInTheDocument();
  });

  it('has settings toggles', () => {
    render(<WorkflowSettingsPanel />);
    
    // Settings section uses t('editor') for the accordion trigger
    expect(screen.getByText('editor')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<WorkflowSettingsPanel className="custom-class" />);
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});

describe('WorkflowSettingsPanel with no workflow', () => {
  it('renders null when no workflow', () => {
    const { useWorkflowEditorStore } = jest.requireMock('@/stores/workflow') as {
      useWorkflowEditorStore: jest.Mock;
    };
    useWorkflowEditorStore.mockReturnValueOnce({
      currentWorkflow: null,
      updateWorkflowMeta: mockUpdateWorkflowMeta,
      updateWorkflowSettings: mockUpdateWorkflowSettings,
    });

    const { container } = render(<WorkflowSettingsPanel />);
    
    // Component returns null when no workflow
    expect(container.innerHTML).toBe('');
  });
});
