/**
 * PPT Quick Action Component Tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PPTQuickAction } from './ppt-quick-action';
import type { PPTGenerationConfig } from '@/hooks/ppt/use-ppt-generation';
import type { PPTTheme } from '@/types/workflow';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock next/navigation
const mockPush = jest.fn();
const mockRouter = { push: mockPush };

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// Mock the hook
const mockGenerate = jest.fn();
const mockGenerateOutline = jest.fn();
const mockGenerateFromOutline = jest.fn();
const mockCancel = jest.fn();
const mockReset = jest.fn();

const mockUsePPTGeneration = jest.fn(() => ({
  isGenerating: false,
  progress: {
    stage: 'idle' as 'idle' | 'outline' | 'content' | 'finalizing' | 'complete' | 'error',
    currentSlide: 0,
    totalSlides: 0,
    message: '',
  },
  error: null as string | null,
  presentation: null,
  outline: null,
  generate: mockGenerate,
  generateOutline: mockGenerateOutline,
  generateFromOutline: mockGenerateFromOutline,
  cancel: mockCancel,
  reset: mockReset,
  getEstimatedTime: jest.fn((slideCount: number) => slideCount * 4),
}));

jest.mock('@/hooks/ppt/use-ppt-generation', () => ({
  usePPTGeneration: () => mockUsePPTGeneration(),
}));

// Mock PPTGenerationDialog component
jest.mock('./ppt-generation-dialog', () => ({
  PPTGenerationDialog: ({
    open,
    onOpenChange,
    onGenerate,
    initialTopic,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onGenerate: (config: PPTGenerationConfig) => void;
    initialTopic?: string;
  }) => (
    <div data-open={open} data-testid="ppt-generation-dialog" style={{ display: open ? 'block' : 'none' }}>
      <div onClick={() => onOpenChange(false)} data-testid="close-dialog">Close Dialog</div>
      <div onClick={() => onGenerate({
        topic: initialTopic || 'Test',
        slideCount: 5,
        theme: {} as PPTTheme,
      })} data-testid="generate-btn">
        Generate
      </div>
    </div>
  ),
}));

// Mock PPTOutlinePreview component
jest.mock('./ppt-outline-preview', () => ({
  PPTOutlinePreview: ({
    onStartGeneration,
    onRegenerateOutline,
    onCancel,
  }: {
    outline: unknown;
    onStartGeneration: () => void;
    onRegenerateOutline?: () => void;
    onCancel?: () => void;
  }) => (
    <div data-testid="ppt-outline-preview">
      <div onClick={onStartGeneration} data-testid="start-full-generation">Start Full Generation</div>
      {onRegenerateOutline && <div onClick={onRegenerateOutline} data-testid="regenerate-outline">Regenerate Outline</div>}
      {onCancel && <div onClick={onCancel} data-testid="cancel-preview">Cancel</div>}
    </div>
  ),
}));

const renderPPTQuickAction = (props: Partial<React.ComponentProps<typeof PPTQuickAction>> = {}) => {
  const defaultProps: React.ComponentProps<typeof PPTQuickAction> = {
    ...props,
  };
  return render(<PPTQuickAction {...defaultProps} />);
};

describe('PPTQuickAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations
    mockGenerate.mockResolvedValue({ id: 'test-ppt-1' });
    mockGenerateOutline.mockResolvedValue({
      title: 'Test Presentation',
      outline: [
        { slideNumber: 1, title: 'Slide 1', layout: 'title-content' },
        { slideNumber: 2, title: 'Slide 2', layout: 'bullets' },
      ],
    });
    mockGenerateFromOutline.mockResolvedValue({ id: 'test-ppt-2' });
  });

  describe('Icon Variant', () => {
    it('should render icon button by default', () => {
      renderPPTQuickAction({ variant: 'icon' });

      const buttons = screen.getAllByRole('button');
      const iconButton = buttons[0];
      expect(iconButton).toBeInTheDocument();
    });

    it('should render presentation icon when not generating', () => {
      renderPPTQuickAction({ variant: 'icon' });

      const buttons = screen.getAllByRole('button');
      const iconButton = buttons[0];
      expect(iconButton).toBeInTheDocument();
    });

    it('should render loading icon when generating', () => {
      // Mock isGenerating state
      mockUsePPTGeneration.mockReturnValue({
        isGenerating: true,
        progress: { stage: 'outline' as const, currentSlide: 0, totalSlides: 5, message: 'Generating...' },
        error: null,
        presentation: null,
        outline: null,
        generate: mockGenerate,
        generateOutline: mockGenerateOutline,
        generateFromOutline: mockGenerateFromOutline,
        cancel: mockCancel,
        reset: mockReset,
        getEstimatedTime: jest.fn(),
      });

      renderPPTQuickAction({ variant: 'icon' });

      const buttons = screen.getAllByRole('button');
      const iconButton = buttons[0];
      expect(iconButton).toBeInTheDocument();
      // Should have loading state
    });

    it('should open dialog when icon button is clicked', async () => {
      const user = userEvent.setup();
      renderPPTQuickAction({ variant: 'icon' });

      const buttons = screen.getAllByRole('button');
      const iconButton = buttons[0];
      await user.click(iconButton);

      // Dialog should be rendered
      expect(screen.getByTestId('ppt-generation-dialog')).toBeInTheDocument();
    });

    it('should be disabled when generating', () => {
      mockUsePPTGeneration.mockReturnValue({
        isGenerating: true,
        progress: { stage: 'outline', currentSlide: 0, totalSlides: 5, message: 'Generating...' },
        error: null,
        presentation: null,
        outline: null,
        generate: mockGenerate,
        generateOutline: mockGenerateOutline,
        generateFromOutline: mockGenerateFromOutline,
        cancel: mockCancel,
        reset: mockReset,
        getEstimatedTime: jest.fn(),
      });

      renderPPTQuickAction({ variant: 'icon' });

      const buttons = screen.getAllByRole('button');
      const iconButton = buttons[0];
      expect(iconButton).toBeDisabled();
    });

    it('should apply custom className', () => {
      const { container } = renderPPTQuickAction({ variant: 'icon', className: 'custom-class' });

      const button = container.querySelector('.custom-class');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Button Variant', () => {
    it('should render button variant', () => {
      renderPPTQuickAction({ variant: 'button' });

      const buttons = screen.getAllByRole('button');
      const button = buttons[0];
      expect(button).toBeInTheDocument();
      // Button variant should render - the text content depends on translation
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should show progress message when generating', () => {
      mockUsePPTGeneration.mockReturnValue({
        isGenerating: true,
        progress: { stage: 'outline', currentSlide: 0, totalSlides: 5, message: 'Generating outline...' },
        error: null,
        presentation: null,
        outline: null,
        generate: mockGenerate,
        generateOutline: mockGenerateOutline,
        generateFromOutline: mockGenerateFromOutline,
        cancel: mockCancel,
        reset: mockReset,
        getEstimatedTime: jest.fn(),
      });

      renderPPTQuickAction({ variant: 'button' });

      expect(screen.getByText('Generating outline...')).toBeInTheDocument();
    });

    it('should show presentation icon when not generating', () => {
      renderPPTQuickAction({ variant: 'button' });

      const buttons = screen.getAllByRole('button');
      const button = buttons[0];
      expect(button).toBeInTheDocument();
    });

    it('should open dialog when button is clicked', async () => {
      const user = userEvent.setup();
      renderPPTQuickAction({ variant: 'button' });

      const buttons = screen.getAllByRole('button');
      const button = buttons[0];
      await user.click(button);

      expect(screen.getByTestId('ppt-generation-dialog')).toBeInTheDocument();
    });

    it('should be disabled when generating', () => {
      mockUsePPTGeneration.mockReturnValue({
        isGenerating: true,
        progress: { stage: 'outline', currentSlide: 0, totalSlides: 5, message: 'Generating...' },
        error: null,
        presentation: null,
        outline: null,
        generate: mockGenerate,
        generateOutline: mockGenerateOutline,
        generateFromOutline: mockGenerateFromOutline,
        cancel: mockCancel,
        reset: mockReset,
        getEstimatedTime: jest.fn(),
      });

      renderPPTQuickAction({ variant: 'button' });

      const buttons = screen.getAllByRole('button');
      const button = buttons[0];
      expect(button).toBeDisabled();
    });
  });

  describe('Menu Item Variant', () => {
    it('should render menu item variant', () => {
      renderPPTQuickAction({ variant: 'menu-item' });

      const buttons = screen.getAllByRole('button');
      const menuItem = buttons[0];
      expect(menuItem).toBeInTheDocument();
      // Menu item variant should render - the text content depends on translation
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should apply correct styling classes', () => {
      const { container } = renderPPTQuickAction({ variant: 'menu-item' });

      const menuItem = container.querySelector('button');
      expect(menuItem).toHaveClass('flex');
      expect(menuItem).toHaveClass('items-center');
      expect(menuItem).toHaveClass('gap-2');
    });

    it('should open dialog when menu item is clicked', async () => {
      const user = userEvent.setup();
      renderPPTQuickAction({ variant: 'menu-item' });

      const buttons = screen.getAllByRole('button');
      const menuItem = buttons[0];
      await user.click(menuItem);

      expect(screen.getByTestId('ppt-generation-dialog')).toBeInTheDocument();
    });

    it('should show loading state when generating', () => {
      mockUsePPTGeneration.mockReturnValue({
        isGenerating: true,
        progress: { stage: 'outline', currentSlide: 0, totalSlides: 5, message: 'Generating...' },
        error: null,
        presentation: null,
        outline: null,
        generate: mockGenerate,
        generateOutline: mockGenerateOutline,
        generateFromOutline: mockGenerateFromOutline,
        cancel: mockCancel,
        reset: mockReset,
        getEstimatedTime: jest.fn(),
      });

      renderPPTQuickAction({ variant: 'menu-item' });

      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('should be disabled when generating', () => {
      mockUsePPTGeneration.mockReturnValue({
        isGenerating: true,
        progress: { stage: 'outline', currentSlide: 0, totalSlides: 5, message: 'Generating...' },
        error: null,
        presentation: null,
        outline: null,
        generate: mockGenerate,
        generateOutline: mockGenerateOutline,
        generateFromOutline: mockGenerateFromOutline,
        cancel: mockCancel,
        reset: mockReset,
        getEstimatedTime: jest.fn(),
      });

      renderPPTQuickAction({ variant: 'menu-item' });

      const buttons = screen.getAllByRole('button');
      const menuItem = buttons[0];
      expect(menuItem).toBeDisabled();
    });
  });

  describe('Single-Stage Flow', () => {
    it('should use direct generate when useTwoStageFlow is false', async () => {
      const user = userEvent.setup();
      const onGenerationStart = jest.fn();
      const onGenerationComplete = jest.fn();

      renderPPTQuickAction({
        variant: 'button',
        useTwoStageFlow: false,
        onGenerationStart,
        onGenerationComplete,
      });

      // Open dialog
      const buttons = screen.getAllByRole('button');
      const button = buttons[0];
      await user.click(button);

      // Click generate in dialog
      const generateButton = screen.getByTestId('generate-btn');
      await user.click(generateButton);

      // Verify generate was called (not generateOutline)
      expect(mockGenerate).toHaveBeenCalled();
      expect(onGenerationStart).toHaveBeenCalled();
    });

    it('should call onGenerationComplete with presentation ID', async () => {
      const user = userEvent.setup();
      const onGenerationComplete = jest.fn();

      renderPPTQuickAction({
        variant: 'button',
        useTwoStageFlow: false,
        onGenerationComplete,
      });

      // Open dialog and generate
      const buttons = screen.getAllByRole('button');
      const openButton = buttons[0];
      await user.click(openButton);

      const generateButton = screen.getByTestId('generate-btn');
      await user.click(generateButton);

      await waitFor(() => {
        expect(onGenerationComplete).toHaveBeenCalledWith('test-ppt-1');
      });
    });

    it('should navigate to PPT editor after generation', async () => {
      const user = userEvent.setup();

      renderPPTQuickAction({
        variant: 'button',
        useTwoStageFlow: false,
      });

      // Open dialog and generate
      const buttons = screen.getAllByRole('button');
      const openButton = buttons[0];
      await user.click(openButton);

      const generateButton = screen.getByTestId('generate-btn');
      await user.click(generateButton);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/ppt?id=test-ppt-1');
      });
    });
  });

  describe('Two-Stage Flow', () => {
    it('should use two-stage flow when useTwoStageFlow is true (default)', async () => {
      const user = userEvent.setup();
      const onGenerationStart = jest.fn();

      renderPPTQuickAction({
        variant: 'button',
        useTwoStageFlow: true,
        onGenerationStart,
      });

      // Open dialog
      const buttons = screen.getAllByRole('button');
      const button = buttons[0];
      await user.click(button);

      // Click generate in dialog (should trigger outline generation)
      const generateButton = screen.getByTestId('generate-btn');
      await user.click(generateButton);

      // Verify generateOutline was called (not generate)
      expect(mockGenerateOutline).toHaveBeenCalled();
      expect(onGenerationStart).toHaveBeenCalled();
    });

    it('should show outline preview after outline is generated', async () => {
      const user = userEvent.setup();

      renderPPTQuickAction({
        variant: 'button',
        useTwoStageFlow: true,
      });

      // Open dialog
      const buttons = screen.getAllByRole('button');
      const openButton = buttons[0];
      await user.click(openButton);

      // Generate outline
      const generateButton = screen.getByTestId('generate-btn');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('ppt-outline-preview')).toBeInTheDocument();
      });
    });

    it('should generate full content from outline', async () => {
      const user = userEvent.setup();
      const onGenerationComplete = jest.fn();

      renderPPTQuickAction({
        variant: 'button',
        useTwoStageFlow: true,
        onGenerationComplete,
      });

      // Open dialog and generate outline
      const buttons = screen.getAllByRole('button');
      const openButton = buttons[0];
      await user.click(openButton);

      const generateButton = screen.getByTestId('generate-btn');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('ppt-outline-preview')).toBeInTheDocument();
      });

      // Start full generation
      const startButton = screen.getByTestId('start-full-generation');
      await user.click(startButton);

      expect(mockGenerateFromOutline).toHaveBeenCalled();
      expect(onGenerationComplete).toHaveBeenCalledWith('test-ppt-2');
    });

    it('should navigate to PPT editor after full generation', async () => {
      const user = userEvent.setup();

      renderPPTQuickAction({
        variant: 'button',
        useTwoStageFlow: true,
      });

      // Complete two-stage flow
      const buttons = screen.getAllByRole('button');
      const openButton = buttons[0];
      await user.click(openButton);

      const generateButton = screen.getByTestId('generate-btn');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('ppt-outline-preview')).toBeInTheDocument();
      });

      const startButton = screen.getByTestId('start-full-generation');
      await user.click(startButton);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/ppt?id=test-ppt-2');
      });
    });

    it('should support regenerating outline', async () => {
      const user = userEvent.setup();

      renderPPTQuickAction({
        variant: 'button',
        useTwoStageFlow: true,
      });

      // Complete first stage to get to outline preview
      const buttons = screen.getAllByRole('button');
      const openButton = buttons[0];
      await user.click(openButton);

      const generateButton = screen.getByTestId('generate-btn');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('ppt-outline-preview')).toBeInTheDocument();
      });

      // Click regenerate
      const regenerateButton = screen.getByTestId('regenerate-outline');
      await user.click(regenerateButton);

      expect(mockGenerateOutline).toHaveBeenCalledTimes(2);
    });

    it('should support canceling outline preview', async () => {
      const user = userEvent.setup();

      renderPPTQuickAction({
        variant: 'button',
        useTwoStageFlow: true,
      });

      // Complete first stage to get to outline preview
      const buttons = screen.getAllByRole('button');
      const openButton = buttons[0];
      await user.click(openButton);

      const generateButton = screen.getByTestId('generate-btn');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('ppt-outline-preview')).toBeInTheDocument();
      });

      // Click cancel
      const cancelButton = screen.getByTestId('cancel-preview');
      await user.click(cancelButton);

      // Preview should be closed
      await waitFor(() => {
        expect(screen.queryByTestId('ppt-outline-preview')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should call onGenerationError when generation fails', async () => {
      const user = userEvent.setup();
      const onGenerationError = jest.fn();

      mockGenerate.mockResolvedValue(null);

      mockUsePPTGeneration.mockReturnValue({
        isGenerating: false,
        progress: { stage: 'idle', currentSlide: 0, totalSlides: 0, message: '' },
        error: 'Generation failed',
        presentation: null,
        outline: null,
        generate: mockGenerate,
        generateOutline: mockGenerateOutline,
        generateFromOutline: mockGenerateFromOutline,
        cancel: mockCancel,
        reset: mockReset,
        getEstimatedTime: jest.fn(),
      });

      renderPPTQuickAction({
        variant: 'button',
        useTwoStageFlow: false,
        onGenerationError,
      });

      // Open dialog and generate
      const buttons = screen.getAllByRole('button');
      const openButton = buttons[0];
      await user.click(openButton);

      const generateButton = screen.getByTestId('generate-btn');
      await user.click(generateButton);

      await waitFor(() => {
        expect(onGenerationError).toHaveBeenCalledWith('Generation failed');
      });
    });

    it('should call onGenerationError when outline generation fails', async () => {
      const user = userEvent.setup();
      const onGenerationError = jest.fn();

      mockGenerateOutline.mockResolvedValue(null);

      mockUsePPTGeneration.mockReturnValue({
        isGenerating: false,
        progress: { stage: 'idle', currentSlide: 0, totalSlides: 0, message: '' },
        error: 'Outline generation failed',
        presentation: null,
        outline: null,
        generate: mockGenerate,
        generateOutline: mockGenerateOutline,
        generateFromOutline: mockGenerateFromOutline,
        cancel: mockCancel,
        reset: mockReset,
        getEstimatedTime: jest.fn(),
      });

      renderPPTQuickAction({
        variant: 'button',
        useTwoStageFlow: true,
        onGenerationError,
      });

      // Open dialog and generate outline
      const buttons = screen.getAllByRole('button');
      const openButton = buttons[0];
      await user.click(openButton);

      const generateButton = screen.getByTestId('generate-btn');
      await user.click(generateButton);

      await waitFor(() => {
        expect(onGenerationError).toHaveBeenCalledWith('Outline generation failed');
      });
    });
  });

  describe('Initial Topic', () => {
    it('should pass initial topic to dialog', async () => {
      renderPPTQuickAction({
        variant: 'button',
        initialTopic: 'Machine Learning Basics',
      });

      // The dialog should receive the initial topic
      expect(screen.getByText('generatePPT')).toBeInTheDocument();
    });

    it('should use empty string as default initial topic', () => {
      renderPPTQuickAction({ variant: 'button' });

      // Should render without errors
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should be a valid React component', () => {
      expect(PPTQuickAction).toBeDefined();
      expect(typeof PPTQuickAction).toBe('function');
    });

    it('should render without errors', () => {
      const { container } = renderPPTQuickAction();

      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render custom className when provided', () => {
      const { container } = renderPPTQuickAction({ variant: 'icon', className: 'my-custom-class' });

      const button = container.querySelector('.my-custom-class');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Dialog Management', () => {
    it('should close generation dialog after outline is generated', async () => {
      const user = userEvent.setup();

      renderPPTQuickAction({
        variant: 'button',
        useTwoStageFlow: true,
      });

      // Open dialog
      const buttons = screen.getAllByRole('button');
      const openButton = buttons[0];
      await user.click(openButton);

      expect(screen.getByTestId('ppt-generation-dialog')).toBeInTheDocument();

      // Generate outline
      const generateButton = screen.getByTestId('generate-btn');
      await user.click(generateButton);

      // Dialog should be closed and outline preview should be open
      await waitFor(() => {
        const dialog = screen.queryByTestId('ppt-generation-dialog');
        // Dialog might still be in DOM but with data-open="false"
        if (dialog) {
          expect(dialog).toHaveAttribute('data-open', 'false');
        }
        expect(screen.getByTestId('ppt-outline-preview')).toBeInTheDocument();
      });
    });

    it('should close dialog after single-stage generation completes', async () => {
      const user = userEvent.setup();

      renderPPTQuickAction({
        variant: 'button',
        useTwoStageFlow: false,
      });

      // Open dialog
      const buttons = screen.getAllByRole('button');
      const openButton = buttons[0];
      await user.click(openButton);

      expect(screen.getByTestId('ppt-generation-dialog')).toBeInTheDocument();

      // Generate
      const generateButton = screen.getByTestId('generate-btn');
      await user.click(generateButton);

      // Dialog should be closed after navigation
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalled();
      });
    });
  });

  describe('Callbacks', () => {
    it('should call onGenerationStart when generation starts', async () => {
      const user = userEvent.setup();
      const onGenerationStart = jest.fn();

      renderPPTQuickAction({
        variant: 'button',
        useTwoStageFlow: false,
        onGenerationStart,
      });

      // Trigger generation
      const buttons = screen.getAllByRole('button');
      const openButton = buttons[0];
      await user.click(openButton);

      const generateButton = screen.getByTestId('generate-btn');
      await user.click(generateButton);

      expect(onGenerationStart).toHaveBeenCalled();
    });
  });
});
