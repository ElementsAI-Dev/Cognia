import { fireEvent, render, screen } from '@testing-library/react';
import { NodeQuickConfig } from './node-quick-config';

const mockUpdateNode = jest.fn();
const mockDuplicateNode = jest.fn();
const mockDeleteNode = jest.fn();

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('zustand/react/shallow', () => ({
  useShallow: (fn: (...args: unknown[]) => unknown) => fn,
}));

jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: jest.fn((selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      updateNode: mockUpdateNode,
      duplicateNode: mockDuplicateNode,
      deleteNode: mockDeleteNode,
      currentWorkflow: { edges: [{ source: 'node-1', target: 'node-2' }] },
    })
  ),
}));

jest.mock('@/components/ui/context-menu', () => ({
  ContextMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
  ContextMenuSeparator: () => <hr />,
}));

jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/select', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').selectMock);
jest.mock('@/components/ui/slider', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').sliderMock);
jest.mock('./node-template-manager', () => ({
  SaveTemplateDialog: ({ open }: { open: boolean }) => <div>{open ? 'template-dialog-open' : 'template-dialog-closed'}</div>,
}));

describe('NodeQuickConfig (utils implementation)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates node label in quick editor and opens full config callback', () => {
    const onOpenConfig = jest.fn();
    render(
      <NodeQuickConfig
        nodeId="node-1"
        data={{
          id: 'node-1',
          nodeType: 'ai',
          label: 'Old Label',
          aiPrompt: '',
        } as any}
        onOpenConfig={onOpenConfig}
      >
        <button type="button">child</button>
      </NodeQuickConfig>
    );

    fireEvent.change(screen.getByDisplayValue('Old Label'), { target: { value: 'New Label' } });
    expect(mockUpdateNode).toHaveBeenCalledWith('node-1', { label: 'New Label' });

    fireEvent.click(screen.getByText('fullConfig'));
    expect(onOpenConfig).toHaveBeenCalled();
  });

  it('runs reset/duplicate/delete actions from context menu', () => {
    render(
      <NodeQuickConfig
        nodeId="node-1"
        data={{
          id: 'node-1',
          nodeType: 'tool',
          label: 'Tool Node',
        } as any}
      >
        <button type="button">child2</button>
      </NodeQuickConfig>
    );

    fireEvent.click(screen.getByText('resetState'));
    fireEvent.click(screen.getByText('duplicate'));
    fireEvent.click(screen.getByText('delete'));

    expect(mockUpdateNode).toHaveBeenCalledWith('node-1', { executionStatus: 'idle' });
    expect(mockDuplicateNode).toHaveBeenCalledWith('node-1');
    expect(mockDeleteNode).toHaveBeenCalledWith('node-1');
  });
});
