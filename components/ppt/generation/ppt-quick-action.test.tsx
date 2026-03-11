import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PPTQuickAction } from './ppt-quick-action';

const mockPush = jest.fn();
const mockGenerate = jest.fn();
const mockPrepareReview = jest.fn();
const mockFinalizeReview = jest.fn();
const mockRegenerateReviewOutline = jest.fn();
const mockUpdateReviewOutline = jest.fn();
const mockRetry = jest.fn();

const mockHookState = {
  reviewSession: null as null | {
    id: string;
    sourceMode: 'quick-action';
    config: {
      topic: string;
      audience?: string;
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
    };
    outline: {
      title: string;
      outline: Array<{ slideNumber: number; title: string; layout: string }>;
    };
  },
  isGenerating: false,
  progress: { stage: 'idle', currentSlide: 0, totalSlides: 0, message: '' },
  generate: mockGenerate,
  prepareReview: mockPrepareReview,
  regenerateReviewOutline: mockRegenerateReviewOutline,
  updateReviewOutline: mockUpdateReviewOutline,
  finalizeReview: mockFinalizeReview,
  error: null as string | null,
  retry: mockRetry,
  canRetry: false,
};

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/hooks/ppt', () => ({
  usePPTGeneration: () => mockHookState,
}));

jest.mock('./ppt-generation-dialog', () => ({
  PPTGenerationDialog: ({
    open,
    onGenerate,
  }: {
    open: boolean;
    onGenerate: (config: { topic: string; slideCount: number; theme: unknown }) => void;
  }) =>
    open ? (
      <button
        type="button"
        data-testid="generate-btn"
        onClick={() =>
          onGenerate({
            topic: 'Test Deck',
            slideCount: 5,
            theme: {
              id: 'default',
              name: 'Default',
              primaryColor: '#000',
              secondaryColor: '#111',
              accentColor: '#222',
              backgroundColor: '#fff',
              textColor: '#000',
              headingFont: 'Inter',
              bodyFont: 'Inter',
              codeFont: 'Mono',
            },
          })
        }
      >
        generate
      </button>
    ) : null,
}));

jest.mock('./ppt-generation-review-panel', () => ({
  PPTGenerationReviewPanel: ({
    onStartGeneration,
  }: {
    onStartGeneration: () => void;
  }) => (
    <button type="button" data-testid="ppt-review-panel" onClick={onStartGeneration}>
      review
    </button>
  ),
}));

describe('PPTQuickAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHookState.reviewSession = null;
    mockHookState.error = null;
    mockHookState.canRetry = false;
  });

  it('uses direct generation when two-stage flow is disabled', async () => {
    const user = userEvent.setup();
    mockGenerate.mockResolvedValue({ id: 'ppt-direct' });

    render(<PPTQuickAction variant="button" useTwoStageFlow={false} />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByTestId('generate-btn'));

    await waitFor(() => {
      expect(mockGenerate).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/ppt?id=ppt-direct');
    });
  });

  it('starts a review session before generation when two-stage flow is enabled', async () => {
    const user = userEvent.setup();
    mockPrepareReview.mockResolvedValue({ id: 'session-1' });

    render(<PPTQuickAction variant="button" useTwoStageFlow />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByTestId('generate-btn'));

    await waitFor(() => {
      expect(mockPrepareReview).toHaveBeenCalledWith(
        expect.objectContaining({ topic: 'Test Deck' }),
        'quick-action'
      );
    });
  });

  it('finalizes the shared review panel when a review session exists', async () => {
    const user = userEvent.setup();
    mockHookState.reviewSession = {
      id: 'session-1',
      sourceMode: 'quick-action',
      config: {
        topic: 'Deck',
        theme: {
          id: 'default',
          name: 'Default',
          primaryColor: '#000',
          secondaryColor: '#111',
          accentColor: '#222',
          backgroundColor: '#fff',
          textColor: '#000',
          headingFont: 'Inter',
          bodyFont: 'Inter',
          codeFont: 'Mono',
        },
      },
      outline: {
        title: 'Deck',
        outline: [{ slideNumber: 1, title: 'Intro', layout: 'title-content' }],
      },
    };
    mockFinalizeReview.mockResolvedValue({ id: 'ppt-review' });

    render(<PPTQuickAction variant="button" useTwoStageFlow />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByTestId('ppt-review-panel'));

    await waitFor(() => {
      expect(mockFinalizeReview).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/ppt?id=ppt-review');
    });
  });
});
