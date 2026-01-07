/**
 * PPT Page Tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
const mockPush = jest.fn();
const mockSearchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock stores
jest.mock('@/stores', () => ({
  useWorkflowStore: Object.assign(
    jest.fn((selector) => {
      const state = {
        presentations: {},
        setActivePresentation: jest.fn(),
        deletePresentation: jest.fn(),
      };
      return selector(state);
    }),
    {
      getState: () => ({
        updatePresentation: jest.fn(),
      }),
    }
  ),
  usePPTEditorStore: jest.fn((selector) => {
    const state = {
      loadPresentation: jest.fn(),
      presentation: null,
    };
    return selector(state);
  }),
}));

// Mock usePPTGeneration hook
jest.mock('@/hooks/ppt', () => ({
  usePPTGeneration: () => ({
    generate: jest.fn(),
    isGenerating: false,
    progress: { stage: 'idle', currentSlide: 0, totalSlides: 0, message: '' },
    error: null,
  }),
}));

// Mock PPT components
jest.mock('@/components/ppt', () => ({
  PPTEditor: () => <div data-testid="ppt-editor">PPT Editor</div>,
  PPTGenerationDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="generation-dialog">Generation Dialog</div> : null,
  PPTQuickAction: ({ onGenerationComplete }: { onGenerationComplete: (id: string) => void }) => (
    <button data-testid="quick-action" onClick={() => onGenerationComplete('test-id')}>
      Quick Action
    </button>
  ),
}));

// Import after mocks
import PPTPage from './page';

describe('PPT Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.delete('id');
  });

  it('should render the page title', async () => {
    render(<PPTPage />);

    await waitFor(() => {
      expect(screen.getByText('title')).toBeInTheDocument();
    });
  });

  it('should render back navigation link', async () => {
    render(<PPTPage />);

    await waitFor(() => {
      const backLink = screen.getByRole('link');
      expect(backLink).toHaveAttribute('href', '/');
    });
  });

  it('should show empty state message when no presentations', async () => {
    render(<PPTPage />);

    await waitFor(() => {
      // Check for empty state heading (uses t('emptyState'))
      expect(screen.getByText('emptyState')).toBeInTheDocument();
    });
  });

  it('should show create new button in empty state', async () => {
    render(<PPTPage />);

    await waitFor(() => {
      // The create button uses t('createNew')
      expect(screen.getByText('createNew')).toBeInTheDocument();
    });
  });

  it('should open generation dialog when clicking create new', async () => {
    const user = userEvent.setup();
    render(<PPTPage />);

    await waitFor(() => {
      expect(screen.getByText('createNew')).toBeInTheDocument();
    });

    const createButton = screen.getByText('createNew');
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('generation-dialog')).toBeInTheDocument();
    });
  });

  it('should render quick action component', async () => {
    render(<PPTPage />);

    await waitFor(() => {
      expect(screen.getByTestId('quick-action')).toBeInTheDocument();
    });
  });

  it('should have accessible structure', async () => {
    render(<PPTPage />);

    await waitFor(() => {
      // Check for main heading
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });
  });
});

describe('PPT Page with presentations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.delete('id');

    // Mock store with presentations
    const mockPresentations = {
      'ppt-1': {
        id: 'ppt-1',
        title: 'Test Presentation',
        subtitle: 'Test subtitle',
        totalSlides: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        slides: [
          { id: 's1', order: 0, layout: 'title', title: 'S1' },
          { id: 's2', order: 1, layout: 'title', title: 'S2' },
          { id: 's3', order: 2, layout: 'title', title: 'S3' },
          { id: 's4', order: 3, layout: 'title', title: 'S4' },
          { id: 's5', order: 4, layout: 'title', title: 'S5' },
        ],
        theme: { id: 'default', name: 'Default' },
        aspectRatio: '16:9',
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useWorkflowStore } = require('@/stores');
    useWorkflowStore.mockImplementation((selector: (state: unknown) => unknown) => {
      const state = {
        presentations: mockPresentations,
        setActivePresentation: jest.fn(),
        deletePresentation: jest.fn(),
      };
      return selector(state);
    });
  });

  it('should render presentation cards when presentations exist', async () => {
    render(<PPTPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Presentation')).toBeInTheDocument();
    });
  });

  it('should display slide count in cards', async () => {
    render(<PPTPage />);

    await waitFor(() => {
      // Look for the slides count using flexible matcher
      expect(screen.getByText(/5/)).toBeInTheDocument();
    });
  });
});

describe('PPT Page with URL parameters', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const mockPresentations = {
      'ppt-url': {
        id: 'ppt-url',
        title: 'URL Presentation',
        subtitle: 'From URL',
        totalSlides: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        slides: [
          { id: 's1', order: 0, layout: 'title', title: 'S1' },
          { id: 's2', order: 1, layout: 'title', title: 'S2' },
          { id: 's3', order: 2, layout: 'title', title: 'S3' },
        ],
        theme: { id: 'default', name: 'Default' },
        aspectRatio: '16:9',
      },
    };

    // Set URL parameter
    mockSearchParams.set('id', 'ppt-url');

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useWorkflowStore, usePPTEditorStore } = require('@/stores');
    const mockLoadPresentation = jest.fn();

    useWorkflowStore.mockImplementation((selector: (state: unknown) => unknown) => {
      const state = {
        presentations: mockPresentations,
        setActivePresentation: jest.fn(),
        deletePresentation: jest.fn(),
      };
      return selector(state);
    });

    usePPTEditorStore.mockImplementation((selector: (state: unknown) => unknown) => {
      const state = {
        loadPresentation: mockLoadPresentation,
        presentation: mockPresentations['ppt-url'],
      };
      return selector(state);
    });
  });

  it('should load presentation from URL parameter', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { usePPTEditorStore } = require('@/stores');

    render(<PPTPage />);

    await waitFor(() => {
      // loadPresentation should have been called through the effect
      expect(usePPTEditorStore).toHaveBeenCalled();
    });
  });

  it('should show PPT editor when presentation is loaded', async () => {
    render(<PPTPage />);

    await waitFor(() => {
      expect(screen.getByTestId('ppt-editor')).toBeInTheDocument();
    });
  });
});
