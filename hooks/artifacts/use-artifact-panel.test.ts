import { renderHook, act } from '@testing-library/react';
import { useArtifactPanelState } from './use-artifact-panel';

const mockClosePanel = jest.fn();
const mockUpdateArtifact = jest.fn();
const mockSaveArtifactVersion = jest.fn();
const mockCreateCanvasDocument = jest.fn(() => 'canvas-doc-1');
const mockSetActiveCanvas = jest.fn();
const mockOpenPanel = jest.fn();
const mockSetArtifactWorkspaceReturnContext = jest.fn();

jest.mock('zustand/react/shallow', () => ({
  useShallow: (selector: unknown) => selector,
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/stores', () => ({
  useArtifactStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      panelOpen: true,
      panelView: 'artifact',
      activeArtifactId: 'artifact-1',
      artifacts: {
        'artifact-1': {
          id: 'artifact-1',
          sessionId: 'session-1',
          messageId: 'message-1',
          title: 'Artifact One',
          content: 'const answer = 42;',
          type: 'code',
          language: 'typescript',
          version: 1,
          metadata: {
            runtimeHealth: 'ready',
          },
        },
      },
      closePanel: mockClosePanel,
      updateArtifact: mockUpdateArtifact,
      saveArtifactVersion: mockSaveArtifactVersion,
      createCanvasDocument: mockCreateCanvasDocument,
      setActiveCanvas: mockSetActiveCanvas,
      openPanel: mockOpenPanel,
      setArtifactWorkspaceReturnContext: mockSetArtifactWorkspaceReturnContext,
      artifactWorkspace: {
        scope: 'session',
        sessionId: 'session-1',
        searchQuery: 'artifact',
        typeFilter: 'code',
        runtimeFilter: 'ready',
        recentArtifactIds: ['artifact-1'],
        returnContext: null,
      },
    }),
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      theme: 'light',
    }),
  useNativeStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      isDesktop: false,
    }),
}));

jest.mock('@/lib/utils/download', () => ({
  downloadFile: jest.fn(),
}));

jest.mock('@/lib/native', () => ({
  opener: {
    revealInFileExplorer: jest.fn(),
    openPath: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  loggers: {
    ui: {
      error: jest.fn(),
    },
  },
}));

jest.mock('@/lib/artifacts', () => ({
  getArtifactExtension: () => 'ts',
  canPreview: () => true,
  canDesign: () => false,
}));

describe('useArtifactPanelState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores artifact return context before handing off to Canvas', () => {
    const { result } = renderHook(() => useArtifactPanelState());

    act(() => {
      result.current.handleOpenInCanvas();
    });

    expect(mockSetArtifactWorkspaceReturnContext).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'session',
        sessionId: 'session-1',
        searchQuery: 'artifact',
        typeFilter: 'code',
        runtimeFilter: 'ready',
        activeArtifactId: 'artifact-1',
      })
    );
  });
});
