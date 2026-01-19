import { render, screen } from '@testing-library/react';
import { KeyboardShortcutsPanel, DEFAULT_SHORTCUTS } from './keyboard-shortcuts-panel';

describe('KeyboardShortcutsPanel', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    shortcuts: DEFAULT_SHORTCUTS,
    onShortcutChange: jest.fn(),
    onResetDefaults: jest.fn(),
  };

  it('renders keyboard shortcuts panel when open', () => {
    render(<KeyboardShortcutsPanel {...defaultProps} />);
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<KeyboardShortcutsPanel {...defaultProps} open={false} />);
    expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
  });

  it('displays search input', () => {
    render(<KeyboardShortcutsPanel {...defaultProps} />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('displays shortcut categories', () => {
    render(<KeyboardShortcutsPanel {...defaultProps} />);
    expect(screen.getByText('Playback')).toBeInTheDocument();
  });
});
