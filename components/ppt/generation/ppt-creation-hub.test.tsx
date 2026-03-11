import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PPTCreationHub } from './ppt-creation-hub';

const mockPush = jest.fn();
const mockPrepareReview = jest.fn();
const mockFinalizeReview = jest.fn();
const mockUpdateReviewOutline = jest.fn();
const mockRegenerateReviewOutline = jest.fn();
const mockRetry = jest.fn();
const mockClearReviewSession = jest.fn();

const mockHookState = {
  reviewSession: null as null | {
    id: string;
    sourceMode: 'generate';
    config: {
      topic: string;
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
    outline: { title: string; outline: Array<{ slideNumber: number; title: string; layout: string }> };
  },
  isGenerating: false,
  progress: { stage: 'idle', currentSlide: 0, totalSlides: 0, message: '' },
  error: null as string | null,
  retry: mockRetry,
  canRetry: false,
  prepareReview: mockPrepareReview,
  updateReviewOutline: mockUpdateReviewOutline,
  regenerateReviewOutline: mockRegenerateReviewOutline,
  finalizeReview: mockFinalizeReview,
  clearReviewSession: mockClearReviewSession,
};

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    ({
      creationHub: 'Create Presentation',
      creationHubDesc: 'Choose how to create your presentation',
      topic: 'Topic',
      additionalDetails: 'Additional Details',
      modeGenerate: 'Generate',
      modeImport: 'Import',
      modePaste: 'Paste',
      modeGenerateDesc: 'Create from a topic or prompt',
      cancel: 'Cancel',
      backToInputs: 'Back to Inputs',
      reviewSessionReady: 'A review session is ready',
      resumeReview: 'Resume Review',
      discardReview: 'Discard Review',
    }[key] || key),
}));

jest.mock('@/hooks/ppt', () => ({
  usePPTGeneration: () => mockHookState,
}));

jest.mock('./ppt-generation-review-panel', () => ({
  PPTGenerationReviewPanel: ({ onStartGeneration }: { onStartGeneration: () => void }) => (
    <div data-testid="ppt-review-panel" onClick={onStartGeneration}>
      Review Panel
    </div>
  ),
}));

describe('PPTCreationHub', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHookState.reviewSession = null;
    mockHookState.error = null;
    mockHookState.canRetry = false;
  });

  it('renders the creation form state by default', () => {
    render(<PPTCreationHub {...defaultProps} />);
    expect(screen.getByText('Create Presentation')).toBeInTheDocument();
    expect(screen.getByLabelText('Topic')).toBeInTheDocument();
  });

  it('starts a review session from generate mode', async () => {
    mockPrepareReview.mockResolvedValue({ id: 'session-1' });
    render(<PPTCreationHub {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('Topic'), {
      target: { value: 'Review deck' },
    });

    const submit = screen.getByTestId('ppt-create-submit');
    fireEvent.click(submit);

    await waitFor(() => {
      expect(mockPrepareReview).toHaveBeenCalledWith(
        expect.objectContaining({ topic: 'Review deck' }),
        'generate'
      );
    });
  });

  it('renders a resume card when a review session exists but is not open', () => {
    mockHookState.reviewSession = {
      id: 'session-1',
      sourceMode: 'generate',
      config: {
        topic: 'Resume deck',
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
        title: 'Resume deck',
        outline: [{ slideNumber: 1, title: 'Intro', layout: 'title-content' }],
      },
    };

    render(<PPTCreationHub {...defaultProps} />);
    expect(screen.getByText('A review session is ready')).toBeInTheDocument();
  });

  it('finalizes the review flow and reports the created id', async () => {
    mockHookState.reviewSession = {
      id: 'session-1',
      sourceMode: 'generate',
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
    mockFinalizeReview.mockResolvedValue({ id: 'ppt-123' });

    render(<PPTCreationHub {...defaultProps} onCreated={jest.fn()} />);

    fireEvent.click(screen.getByText('Resume Review'));
    fireEvent.click(screen.getByTestId('ppt-review-panel'));

    await waitFor(() => {
      expect(mockFinalizeReview).toHaveBeenCalled();
    });
  });
});
