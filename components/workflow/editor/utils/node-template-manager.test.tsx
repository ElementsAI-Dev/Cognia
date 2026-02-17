import { fireEvent, render, screen } from '@testing-library/react';
import { NodeTemplatePanel, SaveTemplateDialog } from './node-template-manager';

const mockSaveNodeAsTemplate = jest.fn();
const mockDeleteNodeTemplate = jest.fn();

const mockStoreState = {
  saveNodeAsTemplate: mockSaveNodeAsTemplate,
  deleteNodeTemplate: mockDeleteNodeTemplate,
  currentWorkflow: {
    nodes: [
      {
        id: 'node-1',
        type: 'tool',
        data: { label: 'Fetch Data' },
      },
    ],
  },
  nodeTemplates: [
    {
      id: 'tpl-1',
      name: 'Template One',
      nodeType: 'tool',
      category: 'custom',
      description: 'Reusable tool template',
    },
  ],
};

jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: jest.fn(() => mockStoreState),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

jest.mock('@/components/ui/accordion', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').accordionMock);

describe('SaveTemplateDialog (utils implementation)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves template when required name is provided', () => {
    render(<SaveTemplateDialog nodeId="node-1" open={true} onOpenChange={jest.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Fetch Data'), { target: { value: 'My Template' } });
    fireEvent.click(screen.getByRole('button', { name: /save template/i }));

    expect(mockSaveNodeAsTemplate).toHaveBeenCalledWith(
      'node-1',
      'My Template',
      expect.objectContaining({ category: 'custom' })
    );
  });
});

describe('NodeTemplatePanel (utils implementation)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders templates and adds to canvas on click', () => {
    const onAddTemplate = jest.fn();
    render(<NodeTemplatePanel onAddTemplate={onAddTemplate} />);

    fireEvent.click(screen.getByText('Template One'));
    expect(onAddTemplate).toHaveBeenCalledWith('tpl-1');
  });

  it('deletes template from dropdown action', () => {
    render(<NodeTemplatePanel onAddTemplate={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(mockDeleteNodeTemplate).toHaveBeenCalledWith('tpl-1');
  });
});
