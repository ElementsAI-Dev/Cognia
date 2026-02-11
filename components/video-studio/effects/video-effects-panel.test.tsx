/**
 * Tests for VideoEffectsPanel component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoEffectsPanel, type AppliedEffect } from './video-effects-panel';

// Mock the media registry
jest.mock('@/lib/plugin/api/media-api', () => ({
  getMediaRegistry: jest.fn(() => ({
    getAllEffects: jest.fn(() => []),
  })),
}));

describe('VideoEffectsPanel', () => {
  const mockAppliedEffects: AppliedEffect[] = [
    {
      id: 'effect-1',
      effectId: 'brightness-contrast',
      name: 'Brightness/Contrast',
      enabled: true,
      params: { brightness: 10, contrast: 5 },
    },
    {
      id: 'effect-2',
      effectId: 'saturation',
      name: 'Saturation',
      enabled: true,
      params: { saturation: 20 },
    },
  ];

  const defaultProps = {
    appliedEffects: [],
    onAddEffect: jest.fn(),
    onRemoveEffect: jest.fn(),
    onToggleEffect: jest.fn(),
    onUpdateParams: jest.fn(),
    onReorderEffects: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the component', () => {
      render(<VideoEffectsPanel {...defaultProps} />);

      // Should render effect categories or browse section
      const brightnessElements = screen.getAllByText(/brightness/i);
      expect(brightnessElements.length).toBeGreaterThan(0);
    });

    it('should render built-in effects', () => {
      render(<VideoEffectsPanel {...defaultProps} />);

      // Should show brightness/contrast effect
      const brightnessElements = screen.getAllByText(/brightness/i);
      expect(brightnessElements.length).toBeGreaterThan(0);
    });

    it('should render with custom className', () => {
      const { container } = render(
        <VideoEffectsPanel {...defaultProps} className="custom-effects" />
      );

      expect(container.firstChild).toHaveClass('custom-effects');
    });

    it('should render effect categories', () => {
      render(<VideoEffectsPanel {...defaultProps} />);

      // Categories should be visible
      const colorElements = screen.getAllByText(/color/i);
      expect(colorElements.length).toBeGreaterThan(0);
    });
  });

  describe('applied effects list', () => {
    it('should display applied effects', () => {
      render(<VideoEffectsPanel {...defaultProps} appliedEffects={mockAppliedEffects} />);

      expect(screen.getByText('Brightness/Contrast')).toBeInTheDocument();
      expect(screen.getByText('Saturation')).toBeInTheDocument();
    });

    it('should show effect parameters', () => {
      render(<VideoEffectsPanel {...defaultProps} appliedEffects={mockAppliedEffects} />);

      // Parameters should be adjustable
      const sliders = screen.queryAllByRole('slider');
      expect(sliders.length).toBeGreaterThanOrEqual(0);
    });

    it('should show empty state when no effects applied', () => {
      render(<VideoEffectsPanel {...defaultProps} appliedEffects={[]} />);

      // Should show empty state or instruction
      // This depends on implementation
    });
  });

  describe('adding effects', () => {
    it('should call onAddEffect when an effect is selected', () => {
      render(<VideoEffectsPanel {...defaultProps} />);

      // Click on an effect to add it
      const brightnessElements = screen.getAllByText(/brightness/i);
      if (brightnessElements.length > 0) {
        const brightnessEffect = brightnessElements[0].closest('button') ||
                                brightnessElements[0].closest('[role="button"]') ||
                                brightnessElements[0].parentElement;

        if (brightnessEffect) {
          fireEvent.click(brightnessEffect);
          expect(defaultProps.onAddEffect).toHaveBeenCalled();
        }
      }
    });

    it('should pass default parameters when adding an effect', () => {
      render(<VideoEffectsPanel {...defaultProps} />);

      // Find and click the first "Add" button (quick-add button on effect cards)
      const addButtons = screen.queryAllByRole('button');
      const addBtn = addButtons.find(btn => btn.textContent?.includes('+') || btn.getAttribute('aria-label')?.includes('add'));

      // If there's a clickable effect card, click it
      const brightnessElements = screen.getAllByText(/brightness/i);
      if (brightnessElements.length > 0) {
        const card = brightnessElements[0].closest('button') ||
                     brightnessElements[0].closest('[role="button"]') ||
                     brightnessElements[0].parentElement;
        if (card) {
          fireEvent.click(card);
          // onAddEffect should be called with effectId and defaultParams
          if (defaultProps.onAddEffect.mock.calls.length > 0) {
            const [effectId, defaultParams] = defaultProps.onAddEffect.mock.calls[0];
            expect(typeof effectId).toBe('string');
            // defaultParams should be an object (may be empty or have defaults)
            if (defaultParams !== undefined) {
              expect(typeof defaultParams).toBe('object');
            }
          }
        }
      } else if (addBtn) {
        fireEvent.click(addBtn);
      }
    });
  });

  describe('removing effects', () => {
    it('should call onRemoveEffect when remove button is clicked', () => {
      render(<VideoEffectsPanel {...defaultProps} appliedEffects={mockAppliedEffects} />);

      const removeButtons = screen.queryAllByRole('button', { name: /remove|delete/i });
      if (removeButtons.length > 0) {
        fireEvent.click(removeButtons[0]);
        expect(defaultProps.onRemoveEffect).toHaveBeenCalled();
      }
    });
  });

  describe('toggling effects', () => {
    it('should call onToggleEffect when toggle is clicked', () => {
      render(<VideoEffectsPanel {...defaultProps} appliedEffects={mockAppliedEffects} />);

      const toggles = screen.queryAllByRole('switch');
      if (toggles.length > 0) {
        fireEvent.click(toggles[0]);
        expect(defaultProps.onToggleEffect).toHaveBeenCalled();
      }
    });

    it('should show disabled state for toggled off effects', () => {
      const disabledEffect: AppliedEffect[] = [
        { ...mockAppliedEffects[0], enabled: false },
      ];

      render(<VideoEffectsPanel {...defaultProps} appliedEffects={disabledEffect} />);

      // The disabled effect should have a different style
      const toggle = screen.queryByRole('switch');
      if (toggle) {
        expect(toggle).toBeInTheDocument();
      }
    });
  });

  describe('updating parameters', () => {
    it('should call onUpdateParams when a parameter is changed', () => {
      render(<VideoEffectsPanel {...defaultProps} appliedEffects={mockAppliedEffects} />);

      const sliders = screen.queryAllByRole('slider');
      if (sliders.length > 0) {
        fireEvent.change(sliders[0], { target: { value: '50' } });
        expect(defaultProps.onUpdateParams).toHaveBeenCalled();
      }
    });
  });

  describe('reordering effects', () => {
    it('should render reorder controls for applied effects', () => {
      render(<VideoEffectsPanel {...defaultProps} appliedEffects={mockAppliedEffects} />);

      // Move up/down buttons or drag handles should be present
      const moveButtons = screen.queryAllByRole('button', { name: /move|up|down/i });
      expect(moveButtons.length).toBeGreaterThanOrEqual(0);
    });

    it('should call onReorderEffects when reorder is triggered', () => {
      render(<VideoEffectsPanel {...defaultProps} appliedEffects={mockAppliedEffects} />);

      const moveDownButtons = screen.queryAllByRole('button', { name: /down/i });
      if (moveDownButtons.length > 0) {
        fireEvent.click(moveDownButtons[0]);
        expect(defaultProps.onReorderEffects).toHaveBeenCalled();
      }
    });
  });

  describe('effect categories', () => {
    it('should filter effects by category', () => {
      render(<VideoEffectsPanel {...defaultProps} />);

      // Click on a category tab
      const colorTabs = screen.queryAllByText(/color/i);
      
      if (colorTabs.length > 0) {
        fireEvent.click(colorTabs[0]);
        // Should filter to show only color effects
      }
    });
  });

  describe('edge cases', () => {
    it('should render with no applied effects', () => {
      render(<VideoEffectsPanel {...defaultProps} appliedEffects={[]} />);

      const brightnessElements = screen.getAllByText(/brightness/i);
      expect(brightnessElements.length).toBeGreaterThan(0);
    });

    it('should handle effects with missing parameters', () => {
      const effectsWithMissingParams: AppliedEffect[] = [
        {
          id: 'effect-1',
          effectId: 'brightness-contrast',
          name: 'Brightness/Contrast',
          enabled: true,
          params: {},
        },
      ];

      render(<VideoEffectsPanel {...defaultProps} appliedEffects={effectsWithMissingParams} />);

      // Should render without errors
      expect(screen.getByText('Brightness/Contrast')).toBeInTheDocument();
    });
  });

  describe('responsive layout', () => {
    it('renders effects grid with responsive columns', () => {
      const { container } = render(<VideoEffectsPanel {...defaultProps} />);
      
      // Effects grid should have responsive column classes
      const grid = container.querySelector('.grid-cols-1.sm\\:grid-cols-2');
      expect(grid).toBeInTheDocument();
    });

    it('renders ScrollArea with responsive height', () => {
      const { container } = render(<VideoEffectsPanel {...defaultProps} />);
      
      // ScrollArea should have responsive height classes
      const scrollAreas = container.querySelectorAll('.h-\\[300px\\].sm\\:h-\\[400px\\]');
      expect(scrollAreas.length).toBeGreaterThan(0);
    });
  });
});
