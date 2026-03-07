/**
 * PPT Page Tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PPT_TEST_IDS } from '@/lib/ppt/test-selectors';

const applySelector = <TState, TResult>(
  selector: ((state: TState) => TResult) | undefined,
  state: TState
) => (typeof selector === 'function' ? selector(state) : state);

const mockPush = jest.fn();
const mockSearchParams = new URLSearchParams();

const mockUseWorkflowStore: jest.Mock = Object.assign(
  jest.fn((selector) => applySelector(selector, workflowState)),
  {
    getState: jest.fn(() => ({
      updatePresentation: jest.fn(),
      addPresentation: jest.fn(),
    })),
  }
);

const mockUsePPTEditorStore: jest.Mock = jest.fn((selector) =>
  applySelector(selector, editorState)
);

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}));

jest.mock('@/lib/export/document/pptx-export', () => ({
  exportToPPTXBase64: jest.fn(async () => ({ success: true, base64: 'ok' })),
}));

jest.mock('@/lib/ppt/ppt-export-client', () => ({
  exportPresentationClient: jest.fn(async () => ({ success: true })),
}));

jest.mock('@/hooks/ppt', () => ({
  usePPTGeneration: () => ({
    generate: jest.fn(),
    generateFromMaterials: jest.fn(),
    isGenerating: false,
    progress: { stage: 'idle', currentSlide: 0, totalSlides: 0, message: '' },
    error: null,
    retry: jest.fn(),
    canRetry: false,
  }),
}));

jest.mock('@/components/ppt', () => ({
  PPTEditor: () => <div data-testid="ppt-editor">PPT Editor</div>,
  PPTCreationHub: ({ open }: { open: boolean }) =>
    open ? <div data-testid="ppt-creation-hub-open">Creation Hub Open</div> : null,
  PPTPreview: () => <div data-testid="ppt-preview">PPT Preview</div>,
  SlideshowView: () => <div data-testid="slideshow-view">Slideshow View</div>,
  SlideContent: () => <div data-testid="slide-content">Slide Content</div>,
  PPTTemplateGallery: () => <div data-testid="ppt-template-gallery">Template Gallery</div>,
  PPTCreationForm: () => <div data-testid="ppt-creation-form">Creation Form</div>,
}));

jest.mock('@/stores', () => ({
  useWorkflowStore: (...args: Parameters<typeof mockUseWorkflowStore>) =>
    mockUseWorkflowStore(...args),
  usePPTEditorStore: (...args: Parameters<typeof mockUsePPTEditorStore>) =>
    mockUsePPTEditorStore(...args),
  selectActivePresentation: (state: {
    presentations: Record<string, unknown>;
    activePresentationId?: string | null;
  }) => (state.activePresentationId ? state.presentations[state.activePresentationId] ?? null : null),
}));

type PresentationStub = {
  id: string;
  title: string;
  subtitle?: string;
  slides: Array<{ id: string; order: number; layout: string; title: string; elements: unknown[] }>;
  theme: {
    id: string;
    name: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    headingFont: string;
    bodyFont: string;
    codeFont: string;
  };
  totalSlides: number;
  aspectRatio: '16:9';
  createdAt: Date;
  updatedAt: Date;
};

const createPresentation = (overrides: Partial<PresentationStub> = {}): PresentationStub => ({
  id: 'ppt-1',
  title: 'Test Presentation',
  subtitle: 'subtitle',
  slides: [{ id: 's1', order: 0, layout: 'title', title: 'S1', elements: [] }],
  theme: {
    id: 'default',
    name: 'Default',
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    accentColor: '#60A5FA',
    backgroundColor: '#FFFFFF',
    textColor: '#1E293B',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    codeFont: 'JetBrains Mono',
  },
  totalSlides: 1,
  aspectRatio: '16:9',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  ...overrides,
});

let workflowState: {
  presentations: Record<string, PresentationStub>;
  activePresentationId: string | null;
  setActivePresentation: jest.Mock;
  deletePresentation: jest.Mock;
};

let editorState: {
  loadPresentation: jest.Mock;
  clearPresentation: jest.Mock;
  presentation: PresentationStub | null;
};

const resetState = () => {
  workflowState = {
    presentations: {},
    activePresentationId: null,
    setActivePresentation: jest.fn((id: string | null) => {
      workflowState.activePresentationId = id;
    }),
    deletePresentation: jest.fn(),
  };

  editorState = {
    loadPresentation: jest.fn(),
    clearPresentation: jest.fn(),
    presentation: null,
  };
};

import PPTPage from './page';

describe('PPT Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.delete('id');
    resetState();
  });

  it('renders new presentation trigger in list mode', async () => {
    render(<PPTPage />);

    await waitFor(() => {
      expect(screen.getByTestId(PPT_TEST_IDS.page.newPresentationButton)).toBeInTheDocument();
    });
  });

  it('opens creation hub when clicking new presentation trigger', async () => {
    const user = userEvent.setup();
    render(<PPTPage />);

    const trigger = await screen.findByTestId(PPT_TEST_IDS.page.newPresentationButton);
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByTestId('ppt-creation-hub-open')).toBeInTheDocument();
    });
  });

  it('renders presentation cards when presentations exist', async () => {
    const presentation = createPresentation();
    workflowState.presentations = { [presentation.id]: presentation };

    render(<PPTPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Presentation')).toBeInTheDocument();
    });
  });

  it('loads presentation from URL param and syncs active presentation', async () => {
    const presentation = createPresentation({ id: 'ppt-url', title: 'URL Deck' });
    workflowState.presentations = { [presentation.id]: presentation };
    mockSearchParams.set('id', presentation.id);

    render(<PPTPage />);

    await waitFor(() => {
      expect(editorState.loadPresentation).toHaveBeenCalledWith(presentation);
      expect(workflowState.setActivePresentation).toHaveBeenCalledWith(presentation.id);
    });
  });

  it('renders PPT editor shell when editor presentation is available', async () => {
    editorState.presentation = createPresentation();

    render(<PPTPage />);

    await waitFor(() => {
      expect(screen.getByTestId('ppt-editor')).toBeInTheDocument();
    });
  });
});
