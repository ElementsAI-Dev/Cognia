/**
 * Region Selector Page Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import RegionSelectorPage from './page';

// Mock Tauri event API
const mockEmit = jest.fn();
const mockListen = jest.fn().mockResolvedValue(jest.fn());

jest.mock('@tauri-apps/api/event', () => ({
  emit: (...args: unknown[]) => mockEmit(...args),
  listen: (...args: unknown[]) => mockListen(...args),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('RegionSelectorPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the overlay', () => {
      render(<RegionSelectorPage />);
      
      // Should have the overlay container
      const overlay = document.querySelector('[class*="cursor-crosshair"]');
      expect(overlay).toBeInTheDocument();
    });

    it('should display instructions', () => {
      render(<RegionSelectorPage />);
      
      // Instructions should be visible
      expect(screen.getByText(/点击并拖拽以选择区域/)).toBeInTheDocument();
      expect(screen.getByText(/按 ESC 取消/)).toBeInTheDocument();
    });

    it('should have cancel button', () => {
      render(<RegionSelectorPage />);
      
      expect(screen.getByRole('button', { name: /取消/ })).toBeInTheDocument();
    });

    it('should not show confirm button initially', () => {
      render(<RegionSelectorPage />);
      
      // Confirm button should not be visible without a selection
      expect(screen.queryByRole('button', { name: /确认选区/ })).not.toBeInTheDocument();
    });
  });

  describe('keyboard shortcuts', () => {
    it('should emit cancel event on Escape key', () => {
      render(<RegionSelectorPage />);
      
      fireEvent.keyDown(window, { key: 'Escape' });
      
      expect(mockEmit).toHaveBeenCalledWith('region-selection-cancelled', {});
    });
  });

  describe('cancel button', () => {
    it('should emit cancel event when clicked', () => {
      render(<RegionSelectorPage />);
      
      const cancelButton = screen.getByRole('button', { name: /取消/ });
      fireEvent.click(cancelButton);
      
      expect(mockEmit).toHaveBeenCalledWith('region-selection-cancelled', {});
    });
  });

  describe('mouse interaction', () => {
    it('should not start selection on right click', () => {
      render(<RegionSelectorPage />);
      
      const overlay = document.querySelector('[class*="cursor-crosshair"]') as HTMLElement;
      
      // Right click should not start selection
      fireEvent.mouseDown(overlay, { clientX: 100, clientY: 100, button: 2 });
      fireEvent.mouseMove(overlay, { clientX: 300, clientY: 200 });
      fireEvent.mouseUp(overlay);
      
      // No size indicator should appear
      const sizeIndicator = screen.queryByText(/\d+ × \d+/);
      expect(sizeIndicator).not.toBeInTheDocument();
    });

    it('should have mouse event handlers on overlay', () => {
      render(<RegionSelectorPage />);
      
      const overlay = document.querySelector('[class*="cursor-crosshair"]') as HTMLElement;
      
      // Verify overlay exists and can receive events
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveClass('cursor-crosshair');
    });
  });

  describe('event listeners', () => {
    it('should listen for region-selection-started event', () => {
      render(<RegionSelectorPage />);
      
      expect(mockListen).toHaveBeenCalledWith(
        'region-selection-started',
        expect.any(Function)
      );
    });
  });
});
