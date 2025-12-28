/**
 * Tests for SelectionToolbarSettings component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { SelectionToolbarSettings } from './settings-panel';
import { useSelectionStore } from '@/stores/selection-store';
import { DEFAULT_CONFIG } from './types';

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock;

// Mock the selection store
jest.mock('@/stores/selection-store', () => ({
  useSelectionStore: jest.fn(),
}));

// Mock the Slider component since it needs ResizeObserver
jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange, ...props }: { value: number[]; onValueChange: (value: number[]) => void }) => (
    <input
      type="range"
      data-testid="slider"
      value={value?.[0] || 0}
      onChange={(e) => onValueChange?.([parseInt(e.target.value)])}
      {...props}
    />
  ),
}));

const mockUseSelectionStore = useSelectionStore as jest.MockedFunction<typeof useSelectionStore>;

describe('SelectionToolbarSettings', () => {
  const mockUpdateConfig = jest.fn();
  const mockResetConfig = jest.fn();
  const mockSetEnabled = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelectionStore.mockReturnValue({
      config: DEFAULT_CONFIG,
      isEnabled: true,
      updateConfig: mockUpdateConfig,
      resetConfig: mockResetConfig,
      setEnabled: mockSetEnabled,
    } as ReturnType<typeof useSelectionStore>);
  });

  describe('rendering', () => {
    it('renders the settings panel header', () => {
      render(<SelectionToolbarSettings />);

      expect(screen.getByText('Selection Toolbar')).toBeInTheDocument();
      expect(screen.getByText('AI-powered actions for selected text')).toBeInTheDocument();
    });

    it('renders the enable/disable switch', () => {
      render(<SelectionToolbarSettings />);

      // Multiple switches exist, just verify at least one exists
      const switches = screen.getAllByRole('switch');
      expect(switches.length).toBeGreaterThan(0);
    });

    it('shows Active status when enabled', () => {
      render(<SelectionToolbarSettings />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('shows Disabled status when disabled', () => {
      mockUseSelectionStore.mockReturnValue({
        config: DEFAULT_CONFIG,
        isEnabled: false,
        updateConfig: mockUpdateConfig,
        resetConfig: mockResetConfig,
        setEnabled: mockSetEnabled,
      } as ReturnType<typeof useSelectionStore>);

      render(<SelectionToolbarSettings />);

      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });

    it('renders preset buttons', () => {
      render(<SelectionToolbarSettings />);

      expect(screen.getByText('Minimal')).toBeInTheDocument();
      expect(screen.getByText('Writer')).toBeInTheDocument();
      expect(screen.getByText('Researcher')).toBeInTheDocument();
      expect(screen.getByText('Developer')).toBeInTheDocument();
    });
  });

  describe('settings sections', () => {
    it('renders General settings section', () => {
      render(<SelectionToolbarSettings />);

      expect(screen.getByText('General')).toBeInTheDocument();
      expect(screen.getByText('Basic configuration')).toBeInTheDocument();
    });

    it('renders Appearance settings section', () => {
      render(<SelectionToolbarSettings />);

      expect(screen.getByText('Appearance')).toBeInTheDocument();
      expect(screen.getByText('Visual customization')).toBeInTheDocument();
    });

    it('renders Pinned Actions settings section', () => {
      render(<SelectionToolbarSettings />);

      expect(screen.getByText('Pinned Actions')).toBeInTheDocument();
      expect(screen.getByText('Customize toolbar buttons')).toBeInTheDocument();
    });

    it('renders Advanced settings section', () => {
      render(<SelectionToolbarSettings />);

      expect(screen.getByText('Advanced')).toBeInTheDocument();
      expect(screen.getByText('Text limits and exclusions')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('toggles enabled state when switch is clicked', () => {
      render(<SelectionToolbarSettings />);

      // Get the first switch (main enable/disable toggle)
      const switches = screen.getAllByRole('switch');
      fireEvent.click(switches[0]);

      expect(mockSetEnabled).toHaveBeenCalledWith(false);
    });

    it('applies Minimal preset when clicked', () => {
      render(<SelectionToolbarSettings />);

      const minimalButton = screen.getByText('Minimal').closest('button');
      expect(minimalButton).toBeInTheDocument();
      fireEvent.click(minimalButton!);

      expect(mockUpdateConfig).toHaveBeenCalledWith({
        pinnedActions: ["copy", "translate"],
        delayMs: 100,
        showShortcuts: false,
      });
    });

    it('applies Writer preset when clicked', () => {
      render(<SelectionToolbarSettings />);

      const writerButton = screen.getByText('Writer').closest('button');
      expect(writerButton).toBeInTheDocument();
      fireEvent.click(writerButton!);

      expect(mockUpdateConfig).toHaveBeenCalledWith({
        pinnedActions: ["rewrite", "grammar", "summarize", "copy"],
        delayMs: 300,
        showShortcuts: true,
      });
    });

    it('applies Researcher preset when clicked', () => {
      render(<SelectionToolbarSettings />);

      const researcherButton = screen.getByText('Researcher').closest('button');
      expect(researcherButton).toBeInTheDocument();
      fireEvent.click(researcherButton!);

      expect(mockUpdateConfig).toHaveBeenCalledWith({
        pinnedActions: ["explain", "define", "extract", "send-to-chat"],
        delayMs: 200,
        showShortcuts: true,
      });
    });

    it('applies Developer preset when clicked', () => {
      render(<SelectionToolbarSettings />);

      const developerButton = screen.getByText('Developer').closest('button');
      expect(developerButton).toBeInTheDocument();
      fireEvent.click(developerButton!);

      expect(mockUpdateConfig).toHaveBeenCalledWith({
        pinnedActions: ["code-explain", "code-optimize", "copy", "send-to-chat"],
        delayMs: 150,
        showShortcuts: true,
      });
    });

    it('resets config when reset button is clicked', () => {
      render(<SelectionToolbarSettings />);

      const resetButton = screen.getByText('Reset to Defaults');
      fireEvent.click(resetButton);

      expect(mockResetConfig).toHaveBeenCalled();
    });
  });

  describe('general settings', () => {
    it('renders trigger mode selector', () => {
      render(<SelectionToolbarSettings />);

      expect(screen.getByText('Trigger Mode')).toBeInTheDocument();
    });

    it('renders default translation language selector', () => {
      render(<SelectionToolbarSettings />);

      expect(screen.getByText('Default Translation Language')).toBeInTheDocument();
    });

    it('renders show delay slider', () => {
      render(<SelectionToolbarSettings />);

      expect(screen.getByText('Show Delay')).toBeInTheDocument();
      // Slider is mocked, just check it exists
      expect(screen.getAllByTestId('slider').length).toBeGreaterThan(0);
    });

    it('renders show shortcuts toggle', () => {
      render(<SelectionToolbarSettings />);

      expect(screen.getByText('Show Keyboard Shortcuts')).toBeInTheDocument();
    });

    it('renders streaming response toggle', () => {
      render(<SelectionToolbarSettings />);

      expect(screen.getByText('Streaming Response')).toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    it('disables preset buttons when toolbar is disabled', () => {
      mockUseSelectionStore.mockReturnValue({
        config: DEFAULT_CONFIG,
        isEnabled: false,
        updateConfig: mockUpdateConfig,
        resetConfig: mockResetConfig,
        setEnabled: mockSetEnabled,
      } as ReturnType<typeof useSelectionStore>);

      render(<SelectionToolbarSettings />);

      const minimalButton = screen.getByText('Minimal').closest('button');
      expect(minimalButton).toBeDisabled();
    });

    it('settings sections show disabled state when disabled', () => {
      mockUseSelectionStore.mockReturnValue({
        config: DEFAULT_CONFIG,
        isEnabled: false,
        updateConfig: mockUpdateConfig,
        resetConfig: mockResetConfig,
        setEnabled: mockSetEnabled,
      } as ReturnType<typeof useSelectionStore>);

      render(<SelectionToolbarSettings />);

      // Verify the disabled state by checking that preset buttons are disabled
      const minimalButton = screen.getByText('Minimal').closest('button');
      const writerButton = screen.getByText('Writer').closest('button');
      expect(minimalButton).toBeDisabled();
      expect(writerButton).toBeDisabled();
    });
  });

  describe('collapsible sections', () => {
    it('can expand and collapse sections', () => {
      render(<SelectionToolbarSettings />);

      // General section should be open by default
      const generalButton = screen.getByText('General').closest('button');
      expect(generalButton).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(generalButton!);

      // Click to expand again
      fireEvent.click(generalButton!);
    });
  });
});
