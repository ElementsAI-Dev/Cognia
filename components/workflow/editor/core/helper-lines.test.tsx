import { render } from '@testing-library/react';
import { HelperLines, getHelperLines } from './helper-lines';

jest.mock('@xyflow/react', () => ({
  useStore: (selector: (state: { transform: [number, number, number] }) => unknown) =>
    selector({ transform: [10, 20, 2] }),
}));

describe('getHelperLines', () => {
  const dragging = { id: 'drag', x: 100, y: 100, width: 50, height: 50 };

  it('snaps by center alignment when in threshold', () => {
    const result = getHelperLines(dragging, [
      { id: 'n1', x: 200, y: 100, width: 50, height: 50 },
    ]);

    expect(result.horizontal).toBe(100);
    expect(result.snapY).toBe(100);
  });

  it('does not snap when out of threshold and ignores self node', () => {
    const result = getHelperLines(dragging, [
      { id: 'drag', x: 100, y: 100, width: 50, height: 50 },
      { id: 'far', x: 1000, y: 1000, width: 10, height: 10 },
    ]);

    expect(result.horizontal).toBeNull();
    expect(result.vertical).toBeNull();
    expect(result.snapX).toBeNull();
    expect(result.snapY).toBeNull();
  });
});

describe('HelperLines', () => {
  it('renders helper lines when positions are provided', () => {
    const { container } = render(<HelperLines horizontal={100} vertical={80} />);
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBe(2);
  });

  it('renders nothing when both lines are null', () => {
    const { container } = render(<HelperLines horizontal={null} vertical={null} />);
    expect(container.firstChild).toBeNull();
  });
});
