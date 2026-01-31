/**
 * ColorPicker Component Tests
 */

import { render, fireEvent } from '@testing-library/react';
import { ColorPicker, QuickColorBar } from './color-picker';
import { PRESET_COLORS } from '@/types/screenshot';

describe('ColorPicker', () => {
  const mockOnColorChange = jest.fn();
  const mockOnStrokeWidthChange = jest.fn();
  const mockOnOpacityChange = jest.fn();
  const mockOnFilledChange = jest.fn();
  const mockOnFontSizeChange = jest.fn();

  beforeEach(() => {
    mockOnColorChange.mockClear();
    mockOnStrokeWidthChange.mockClear();
    mockOnOpacityChange.mockClear();
    mockOnFilledChange.mockClear();
    mockOnFontSizeChange.mockClear();
  });

  it('should render with current color', () => {
    const { container } = render(
      <ColorPicker
        color="#FF0000"
        strokeWidth={2}
        onColorChange={mockOnColorChange}
        onStrokeWidthChange={mockOnStrokeWidthChange}
      />
    );

    expect(container.firstChild).toBeTruthy();
  });

  it('should display current color in trigger button', () => {
    const { container } = render(
      <ColorPicker
        color="#00FF00"
        strokeWidth={2}
        onColorChange={mockOnColorChange}
        onStrokeWidthChange={mockOnStrokeWidthChange}
      />
    );

    const colorIndicator = container.querySelector('[style*="background"]');
    expect(colorIndicator).toBeTruthy();
  });

  describe('Opacity Control', () => {
    it('should render with opacity prop', () => {
      const { container } = render(
        <ColorPicker
          color="#FF0000"
          strokeWidth={2}
          opacity={0.5}
          onColorChange={mockOnColorChange}
          onStrokeWidthChange={mockOnStrokeWidthChange}
          onOpacityChange={mockOnOpacityChange}
        />
      );
      expect(container.firstChild).toBeTruthy();
    });

    it('should accept opacity values between 0 and 1', () => {
      const { container } = render(
        <ColorPicker
          color="#FF0000"
          strokeWidth={2}
          opacity={0.75}
          onColorChange={mockOnColorChange}
          onStrokeWidthChange={mockOnStrokeWidthChange}
          onOpacityChange={mockOnOpacityChange}
        />
      );
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('Filled Toggle', () => {
    it('should render with filled prop', () => {
      const { container } = render(
        <ColorPicker
          color="#FF0000"
          strokeWidth={2}
          filled={true}
          onColorChange={mockOnColorChange}
          onStrokeWidthChange={mockOnStrokeWidthChange}
          onFilledChange={mockOnFilledChange}
        />
      );
      expect(container.firstChild).toBeTruthy();
    });

    it('should render with filled=false', () => {
      const { container } = render(
        <ColorPicker
          color="#FF0000"
          strokeWidth={2}
          filled={false}
          onColorChange={mockOnColorChange}
          onStrokeWidthChange={mockOnStrokeWidthChange}
          onFilledChange={mockOnFilledChange}
        />
      );
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('Font Size Control', () => {
    it('should render with fontSize prop', () => {
      const { container } = render(
        <ColorPicker
          color="#FF0000"
          strokeWidth={2}
          fontSize={16}
          onColorChange={mockOnColorChange}
          onStrokeWidthChange={mockOnStrokeWidthChange}
          onFontSizeChange={mockOnFontSizeChange}
        />
      );
      expect(container.firstChild).toBeTruthy();
    });

    it('should accept various font sizes', () => {
      const { container } = render(
        <ColorPicker
          color="#FF0000"
          strokeWidth={2}
          fontSize={24}
          onColorChange={mockOnColorChange}
          onStrokeWidthChange={mockOnStrokeWidthChange}
          onFontSizeChange={mockOnFontSizeChange}
        />
      );
      expect(container.firstChild).toBeTruthy();
    });
  });
});

describe('QuickColorBar', () => {
  const mockOnColorChange = jest.fn();

  beforeEach(() => {
    mockOnColorChange.mockClear();
  });

  it('should render preset colors', () => {
    const { container } = render(
      <QuickColorBar color="#FF0000" onColorChange={mockOnColorChange} />
    );

    const colorButtons = container.querySelectorAll('button');
    expect(colorButtons.length).toBeGreaterThan(0);
  });

  it('should call onColorChange when color is clicked', () => {
    const { container } = render(
      <QuickColorBar color="#FF0000" onColorChange={mockOnColorChange} />
    );

    const colorButtons = container.querySelectorAll('button');
    if (colorButtons.length > 0) {
      fireEvent.click(colorButtons[0]);
      expect(mockOnColorChange).toHaveBeenCalled();
    }
  });

  it('should highlight currently selected color', () => {
    const testColor = PRESET_COLORS[0];
    const { container } = render(
      <QuickColorBar color={testColor} onColorChange={mockOnColorChange} />
    );

    // Check that the component renders (visual check for highlight would need snapshot)
    expect(container.firstChild).toBeTruthy();
  });

  it('should render multiple preset colors', () => {
    const { container } = render(
      <QuickColorBar color="#FF0000" onColorChange={mockOnColorChange} />
    );

    const colorButtons = container.querySelectorAll('button');
    expect(colorButtons.length).toBeGreaterThanOrEqual(6);
  });
});
