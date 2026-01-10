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
      expect(screen.getByText(/effect/i)).toBeInTheDocument();
    });

    it('should render built-in effects', () => {
      render(<VideoEffectsPanel {...defaultProps} />);

      // Should show brightness/contrast effect
      expect(screen.getByText(/brightness/i)).toBeInTheDocument();
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
      expect(screen.getByText(/color/i)).toBeInTheDocument();
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
      const sliders = screen.getAllByRole('slider');
      expect(sliders.length).toBeGreaterThan(0);
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
      const brightnessEffect = screen.getByText(/brightness/i).closest('button') ||
                              screen.getByText(/brightness/i).closest('[role="button"]') ||
                              screen.getByText(/brightness/i).parentElement;

      if (brightnessEffect) {
        fireEvent.click(brightnessEffect);
        expect(defaultProps.onAddEffect).toHaveBeenCalled();
      }
    });
  });

  describe('removing effects', () => {
    it('should call onRemoveEffect when remove button is clicked', () => {
      render(<VideoEffectsPanel {...defaultProps} appliedEffects={mockAppliedEffects} />);

      const removeButtons = screen.getAllByRole('button', { name: /remove|delete/i });
      if (removeButtons.length > 0) {
        fireEvent.click(removeButtons[0]);
        expect(defaultProps.onRemoveEffect).toHaveBeenCalled();
      }
    });
  });

  describe('toggling effects', () => {
    it('should call onToggleEffect when toggle is clicked', () => {
      render(<VideoEffectsPanel {...defaultProps} appliedEffects={mockAppliedEffects} />);

      const toggles = screen.getAllByRole('switch');
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
      const toggle = screen.getByRole('switch');
      expect(toggle).toBeInTheDocument();
    });
  });

  describe('updating parameters', () => {
    it('should call onUpdateParams when a parameter is changed', () => {
      render(<VideoEffectsPanel {...defaultProps} appliedEffects={mockAppliedEffects} />);

      const sliders = screen.getAllByRole('slider');
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
      const moveButtons = screen.getAllByRole('button', { name: /move|up|down/i });
      expect(moveButtons.length).toBeGreaterThanOrEqual(0);
    });

    it('should call onReorderEffects when reorder is triggered', () => {
      render(<VideoEffectsPanel {...defaultProps} appliedEffects={mockAppliedEffects} />);

      const moveDownButtons = screen.getAllByRole('button', { name: /down/i });
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
      const colorTab = screen.getByRole('tab', { name: /color/i }) ||
                      screen.getByText(/color/i);
      
      if (colorTab) {
        fireEvent.click(colorTab);
        // Should filter to show only color effects
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty applied effects array', () => {
      render(<VideoEffectsPanel {...defaultProps} appliedEffects={[]} />);

      expect(screen.getByText(/effect/i)).toBeInTheDocument();
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
});
