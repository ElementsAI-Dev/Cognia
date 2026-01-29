/**
 * TextInput Component Tests
 */

import { render, fireEvent, screen } from '@testing-library/react';
import { TextInput } from './text-input';

describe('TextInput', () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();
  const defaultPosition = { x: 100, y: 100 };
  const defaultStyle = { color: '#FF0000', fontSize: 16 };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render textarea at correct position', () => {
      const { container } = render(
        <TextInput
          position={defaultPosition}
          style={defaultStyle}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const textarea = container.querySelector('textarea');
      expect(textarea).toBeTruthy();

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.left).toBe('100px');
      expect(wrapper.style.top).toBe('100px');
    });

    it('should apply correct color style', () => {
      const { container } = render(
        <TextInput
          position={defaultPosition}
          style={{ color: '#00FF00', fontSize: 20 }}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const textarea = container.querySelector('textarea');
      expect(textarea?.style.color).toBe('rgb(0, 255, 0)');
    });

    it('should apply correct font size', () => {
      const { container } = render(
        <TextInput
          position={defaultPosition}
          style={{ color: '#FF0000', fontSize: 24 }}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const textarea = container.querySelector('textarea');
      expect(textarea?.style.fontSize).toBe('24px');
    });

    it('should auto-focus textarea on mount', () => {
      render(
        <TextInput
          position={defaultPosition}
          style={defaultStyle}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(document.activeElement).toBe(textarea);
    });
  });

  describe('User Interactions', () => {
    it('should update text value on input', () => {
      render(
        <TextInput
          position={defaultPosition}
          style={defaultStyle}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Hello World' } });

      expect((textarea as HTMLTextAreaElement).value).toBe('Hello World');
    });

    it('should call onConfirm with text when Enter is pressed', () => {
      render(
        <TextInput
          position={defaultPosition}
          style={defaultStyle}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Test Text' } });
      fireEvent.keyDown(textarea, { key: 'Enter' });

      expect(mockOnConfirm).toHaveBeenCalledWith('Test Text');
    });

    it('should not call onConfirm when Shift+Enter is pressed (new line)', () => {
      render(
        <TextInput
          position={defaultPosition}
          style={defaultStyle}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Line 1' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should call onCancel when Escape is pressed', () => {
      render(
        <TextInput
          position={defaultPosition}
          style={defaultStyle}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Escape' });

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should not call onConfirm if text is empty', () => {
      render(
        <TextInput
          position={defaultPosition}
          style={defaultStyle}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Enter' });

      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should trim whitespace-only text and not confirm', () => {
      render(
        <TextInput
          position={defaultPosition}
          style={defaultStyle}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: '   ' } });
      fireEvent.keyDown(textarea, { key: 'Enter' });

      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  describe('Blur Handling', () => {
    it('should call onConfirm when textarea loses focus with text', () => {
      render(
        <TextInput
          position={defaultPosition}
          style={defaultStyle}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Blur Text' } });
      fireEvent.blur(textarea);

      expect(mockOnConfirm).toHaveBeenCalledWith('Blur Text');
    });

    it('should call onCancel when textarea loses focus without text', () => {
      render(
        <TextInput
          position={defaultPosition}
          style={defaultStyle}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.blur(textarea);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Multiline Support', () => {
    it('should support multiline text input', () => {
      render(
        <TextInput
          position={defaultPosition}
          style={defaultStyle}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const textarea = screen.getByRole('textbox');
      const multilineText = 'Line 1\nLine 2\nLine 3';
      fireEvent.change(textarea, { target: { value: multilineText } });

      expect((textarea as HTMLTextAreaElement).value).toBe(multilineText);
    });
  });
});
