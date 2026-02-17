import { fireEvent, render, screen } from '@testing-library/react';
import { MultiVariableSelector, VariableSelector } from './variable-selector';

const mockWorkflow = {
  id: 'wf-1',
  nodes: [
    {
      id: 'start-1',
      type: 'start',
      data: {
        label: 'Start',
        workflowInputs: {
          question: { type: 'string', description: 'user question' },
        },
      },
    },
    {
      id: 'tool-1',
      type: 'tool',
      data: {
        label: 'Search',
        outputs: {
          answer: { type: 'string', description: 'final answer' },
        },
      },
    },
    {
      id: 'current',
      type: 'ai',
      data: { label: 'Current Node' },
    },
  ],
  edges: [
    { id: 'e1', source: 'start-1', target: 'tool-1' },
    { id: 'e2', source: 'tool-1', target: 'current' },
  ],
};

jest.mock('zustand/react/shallow', () => ({
  useShallow: (fn: (...args: unknown[]) => unknown) => fn,
}));

jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: jest.fn((selector?: (state: Record<string, unknown>) => unknown) => {
    const state = { currentWorkflow: mockWorkflow };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/command', () => ({
  Command: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandEmpty: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandGroup: ({ heading, children }: { heading?: React.ReactNode; children: React.ReactNode }) => (
    <div>
      <div>{heading}</div>
      {children}
    </div>
  ),
  CommandInput: ({ placeholder }: { placeholder?: string }) => <input placeholder={placeholder} />,
  CommandItem: ({ children, onSelect }: { children: React.ReactNode; onSelect?: (value: string) => void }) => (
    <button type="button" onClick={() => onSelect?.('selected')}>{children}</button>
  ),
  CommandList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('VariableSelector', () => {
  it('lists upstream variables and emits selected reference', () => {
    const onChange = jest.fn();
    render(
      <VariableSelector
        value={null}
        onChange={onChange}
        currentNodeId="current"
      />
    );

    fireEvent.click(screen.getByText('answer'));
    expect(onChange).toHaveBeenCalledWith({ nodeId: 'tool-1', variableName: 'answer' });
  });
});

describe('MultiVariableSelector', () => {
  it('adds a variable reference', () => {
    const onChange = jest.fn();
    render(
      <MultiVariableSelector
        value={[]}
        onChange={onChange}
        currentNodeId="current"
      />
    );

    fireEvent.click(screen.getByText('answer'));
    expect(onChange).toHaveBeenCalledWith([{ nodeId: 'tool-1', variableName: 'answer' }]);
  });

  it('does not add duplicate references', () => {
    const onChange = jest.fn();
    render(
      <MultiVariableSelector
        value={[{ nodeId: 'tool-1', variableName: 'answer' }]}
        onChange={onChange}
        currentNodeId="current"
      />
    );

    fireEvent.click(screen.getByText('answer'));
    expect(onChange).not.toHaveBeenCalledWith([
      { nodeId: 'tool-1', variableName: 'answer' },
      { nodeId: 'tool-1', variableName: 'answer' },
    ]);
  });
});
