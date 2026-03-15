import {
  DEFAULT_INTERACTIVE_NOTEBOOK_SURFACE_ID,
  NOTEBOOK_PAGE_WORKSPACE_SURFACE_ID,
  buildNotebookWorkspaceSnapshotInput,
  getInteractiveNotebookSurfaceId,
  syncNotebookContentWithSessionCells,
} from './workspace';

describe('jupyter workspace adapter', () => {
  it('builds notebook workspace snapshots from shared notebook state', () => {
    const snapshot = buildNotebookWorkspaceSnapshotInput({
      surfaceId: NOTEBOOK_PAGE_WORKSPACE_SURFACE_ID,
      notebookContent: '{"cells":[],"metadata":{},"nbformat":4,"nbformat_minor":5}',
      selectedEnvPath: '/envs/python',
      filePath: 'C:/notebooks/demo.ipynb',
      isDirty: true,
      activeSession: {
        id: 'session-1',
        envPath: '/envs/python',
      },
      activeKernel: {
        id: 'kernel-1',
      },
      fileInfo: {
        path: 'C:/notebooks/demo.ipynb',
        fileName: 'demo.ipynb',
        sizeBytes: 128,
        cellCount: 1,
        codeCells: 1,
        markdownCells: 0,
        kernelName: 'python3',
        nbformat: 4,
      },
    });

    expect(snapshot).toMatchObject({
      surfaceId: NOTEBOOK_PAGE_WORKSPACE_SURFACE_ID,
      sessionId: 'session-1',
      kernelId: 'kernel-1',
      selectedEnvPath: '/envs/python',
      filePath: 'C:/notebooks/demo.ipynb',
      isDirty: true,
    });
  });

  it('syncs execution output back into notebook json content', () => {
    const content = JSON.stringify({
      cells: [
        {
          cell_type: 'code',
          source: 'print("Hello")',
          outputs: [],
          execution_count: null,
          metadata: {},
        },
      ],
      metadata: {},
      nbformat: 4,
      nbformat_minor: 5,
    });

    const nextContent = syncNotebookContentWithSessionCells(content, [
      {
        id: 'cell-1',
        type: 'code',
        source: 'print("Hello")',
        executionState: 'success',
        executionCount: 1,
        outputs: [{ outputType: 'stream', name: 'stdout', text: 'ok' }],
        metadata: {},
      },
    ]);

    expect(nextContent).toContain('"execution_count": 1');
    expect(nextContent).toContain('"output_type": "stream"');
  });

  it('creates stable surface ids for embedded notebook workspaces', () => {
    expect(getInteractiveNotebookSurfaceId('chat-1')).toBe('chat:chat-1');
    expect(getInteractiveNotebookSurfaceId()).toBe(DEFAULT_INTERACTIVE_NOTEBOOK_SURFACE_ID);
  });
});
