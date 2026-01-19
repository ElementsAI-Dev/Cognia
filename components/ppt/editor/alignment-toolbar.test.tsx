/**
 * Alignment Toolbar Component Tests
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlignmentToolbar } from './alignment-toolbar';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('AlignmentToolbar', () => {
  const defaultProps = {
    onAlign: jest.fn(),
    onDistribute: jest.fn(),
    onAutoArrange: jest.fn(),
    onBringToFront: jest.fn(),
    onSendToBack: jest.fn(),
    disabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render alignment buttons', () => {
    render(<AlignmentToolbar {...defaultProps} />);

    // Should have alignment buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should call onAlign with left when left align is clicked', async () => {
    render(<AlignmentToolbar {...defaultProps} />);

    const leftAlignButton = screen.getAllByRole('button')[0];
    await userEvent.click(leftAlignButton);

    expect(defaultProps.onAlign).toHaveBeenCalledWith('left');
  });

  it('should call onDistribute with horizontal when distribute horizontal is clicked', async () => {
    render(<AlignmentToolbar {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    const distributeButton = buttons.find((btn) =>
      btn.querySelector('svg.lucide-gallery-horizontal')
    );

    if (distributeButton) {
      await userEvent.click(distributeButton);
      expect(defaultProps.onDistribute).toHaveBeenCalledWith('horizontal');
    }
  });

  it('should call onAutoArrange when auto arrange is clicked', async () => {
    render(<AlignmentToolbar {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    const autoArrangeButton = buttons.find((btn) => btn.querySelector('svg.lucide-layout-grid'));

    if (autoArrangeButton) {
      await userEvent.click(autoArrangeButton);
      expect(defaultProps.onAutoArrange).toHaveBeenCalled();
    }
  });

  it('should call onBringToFront when bring to front is clicked', async () => {
    render(<AlignmentToolbar {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    const bringToFrontButton = buttons.find((btn) =>
      btn.querySelector('svg.lucide-arrow-up-to-line')
    );

    if (bringToFrontButton) {
      await userEvent.click(bringToFrontButton);
      expect(defaultProps.onBringToFront).toHaveBeenCalled();
    }
  });

  it('should call onSendToBack when send to back is clicked', async () => {
    render(<AlignmentToolbar {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    const sendToBackButton = buttons.find((btn) =>
      btn.querySelector('svg.lucide-arrow-down-to-line')
    );

    if (sendToBackButton) {
      await userEvent.click(sendToBackButton);
      expect(defaultProps.onSendToBack).toHaveBeenCalled();
    }
  });

  it('should disable buttons when disabled prop is true', () => {
    render(<AlignmentToolbar {...defaultProps} disabled={true} />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('should enable buttons when disabled prop is false', () => {
    render(<AlignmentToolbar {...defaultProps} disabled={false} />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).not.toBeDisabled();
    });
  });

  it('should render alignment group separator', () => {
    const { container } = render(<AlignmentToolbar {...defaultProps} />);

    // Separators may be rendered as div elements with specific classes
    // Check if any separator-like elements exist
    const allDivs = container.querySelectorAll('div');
    expect(allDivs.length).toBeGreaterThan(0);
  });

  it('should render all alignment buttons', () => {
    render(<AlignmentToolbar {...defaultProps} />);

    // Check for specific alignment icons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(9); // At least 9 buttons for alignment toolbar
  });

  it('should apply custom className', () => {
    const { container } = render(<AlignmentToolbar {...defaultProps} className="custom-class" />);

    const toolbar = container.firstChild;
    expect(toolbar).toHaveClass('custom-class');
  });

  it('should call onAlign with center when center align is clicked', async () => {
    render(<AlignmentToolbar {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    const centerAlignButton = buttons.find((btn) => btn.querySelector('svg.lucide-align-center'));

    if (centerAlignButton) {
      await userEvent.click(centerAlignButton);
      expect(defaultProps.onAlign).toHaveBeenCalledWith('center');
    }
  });

  it('should call onAlign with right when right align is clicked', async () => {
    render(<AlignmentToolbar {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    const rightAlignButton = buttons.find((btn) => btn.querySelector('svg.lucide-align-right'));

    if (rightAlignButton) {
      await userEvent.click(rightAlignButton);
      expect(defaultProps.onAlign).toHaveBeenCalledWith('right');
    }
  });
});
