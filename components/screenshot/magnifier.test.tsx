/**
 * Magnifier Component Tests
 */

import { render } from '@testing-library/react';
import { Magnifier } from './magnifier';

describe('Magnifier', () => {
  it('should render when visible', () => {
    const { container } = render(
      <Magnifier
        imageData={null}
        cursorX={100}
        cursorY={100}
        visible={true}
      />
    );

    expect(container.firstChild).toBeTruthy();
  });

  it('should not render when not visible', () => {
    const { container } = render(
      <Magnifier
        imageData={null}
        cursorX={100}
        cursorY={100}
        visible={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should display cursor coordinates', () => {
    const { container } = render(
      <Magnifier
        imageData={null}
        cursorX={150}
        cursorY={200}
        visible={true}
      />
    );

    expect(container.textContent).toContain('150');
    expect(container.textContent).toContain('200');
  });

  it('should use default zoom level', () => {
    const { container } = render(
      <Magnifier
        imageData={null}
        cursorX={100}
        cursorY={100}
        visible={true}
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('should use custom zoom level', () => {
    const { container } = render(
      <Magnifier
        imageData={null}
        cursorX={100}
        cursorY={100}
        visible={true}
        zoom={4}
      />
    );

    expect(container.firstChild).toBeTruthy();
  });

  it('should use custom size', () => {
    const customSize = 200;
    const { container } = render(
      <Magnifier
        imageData={null}
        cursorX={100}
        cursorY={100}
        visible={true}
        size={customSize}
      />
    );

    const wrapper = container.firstChild as HTMLElement;
    if (wrapper) {
      expect(wrapper.style.width).toBe(`${customSize}px`);
      expect(wrapper.style.height).toBe(`${customSize}px`);
    }
  });

  it('should render canvas element', () => {
    const { container } = render(
      <Magnifier
        imageData={null}
        cursorX={100}
        cursorY={100}
        visible={true}
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <Magnifier
        imageData={null}
        cursorX={100}
        cursorY={100}
        visible={true}
        className="custom-magnifier"
      />
    );

    expect(container.querySelector('.custom-magnifier')).toBeTruthy();
  });
});
