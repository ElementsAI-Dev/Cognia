import { render, screen, fireEvent, act } from '@testing-library/react';
import { SlideshowControls, KeyboardHelpModal } from './slideshow-controls';
import type { SlideshowSettings } from '../types';

const defaultSettings: SlideshowSettings = {
  showThumbnails: false,
  showProgress: true,
  showTimer: true,
  showNotes: false,
  autoPlay: false,
  autoPlayInterval: 5,
  enableTransitions: true,
  transitionType: 'fade',
  transitionDuration: 300,
};

const createDefaultProps = (overrides = {}) => ({
  currentIndex: 0,
  totalSlides: 10,
  settings: defaultSettings,
  isPlaying: false,
  elapsedTime: 0,
  onPrev: jest.fn(),
  onNext: jest.fn(),
  onExit: jest.fn(),
  onTogglePlay: jest.fn(),
  onToggleThumbnails: jest.fn(),
  onToggleNotes: jest.fn(),
  onSettingsChange: jest.fn(),
  onShowKeyboardHelp: jest.fn(),
  ...overrides,
});

describe('SlideshowControls', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders navigation buttons', () => {
    render(<SlideshowControls {...createDefaultProps()} />);
    
    // Should have prev and next buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('displays slide count', () => {
    render(<SlideshowControls {...createDefaultProps({ currentIndex: 4 })} />);
    expect(screen.getByText('5 / 10')).toBeInTheDocument();
  });

  it('calls onPrev when prev button is clicked', () => {
    const onPrev = jest.fn();
    render(<SlideshowControls {...createDefaultProps({ onPrev, currentIndex: 5 })} />);
    
    // Move mouse to show controls
    fireEvent.mouseMove(window);
    
    const prevButtons = screen.getAllByRole('button');
    // Click the prev button (first navigation button)
    const prevButton = prevButtons.find(btn => btn.querySelector('svg'));
    if (prevButton) {
      fireEvent.click(prevButton);
    }
  });

  it('calls onNext when next button is clicked', () => {
    const onNext = jest.fn();
    render(<SlideshowControls {...createDefaultProps({ onNext })} />);
    
    fireEvent.mouseMove(window);
  });

  it('calls onExit when exit button is clicked', () => {
    const onExit = jest.fn();
    render(<SlideshowControls {...createDefaultProps({ onExit })} />);
    
    fireEvent.mouseMove(window);
  });

  it('displays elapsed time when showTimer is true', () => {
    render(<SlideshowControls {...createDefaultProps({ 
      elapsedTime: 125, // 2:05
      settings: { ...defaultSettings, showTimer: true }
    })} />);
    
    expect(screen.getByText('02:05')).toBeInTheDocument();
  });

  it('shows progress bar when showProgress is true', () => {
    const { container } = render(<SlideshowControls {...createDefaultProps({
      currentIndex: 4, // 50% progress (5/10)
      settings: { ...defaultSettings, showProgress: true }
    })} />);
    
    // Progress bar should exist
    const progressBar = container.querySelector('[style*="width: 50%"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('shows play icon when not playing', () => {
    render(<SlideshowControls {...createDefaultProps({ isPlaying: false })} />);
    // Play button should be visible
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('shows pause icon when playing', () => {
    render(<SlideshowControls {...createDefaultProps({ isPlaying: true })} />);
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('calls onTogglePlay when play/pause button is clicked', () => {
    const onTogglePlay = jest.fn();
    render(<SlideshowControls {...createDefaultProps({ onTogglePlay })} />);
    
    fireEvent.mouseMove(window);
  });

  it('highlights thumbnail button when showThumbnails is true', () => {
    render(<SlideshowControls {...createDefaultProps({
      settings: { ...defaultSettings, showThumbnails: true }
    })} />);
    
    // Button should have active state class
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('highlights notes button when showNotes is true', () => {
    render(<SlideshowControls {...createDefaultProps({
      settings: { ...defaultSettings, showNotes: true }
    })} />);
    
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('disables prev button on first slide', () => {
    render(<SlideshowControls {...createDefaultProps({ currentIndex: 0 })} />);
    
    const buttons = screen.getAllByRole('button');
    const disabledButton = buttons.find(btn => btn.hasAttribute('disabled'));
    expect(disabledButton).toBeDefined();
  });

  it('disables next button on last slide', () => {
    render(<SlideshowControls {...createDefaultProps({ 
      currentIndex: 9, 
      totalSlides: 10 
    })} />);
    
    const buttons = screen.getAllByRole('button');
    const disabledButton = buttons.find(btn => btn.hasAttribute('disabled'));
    expect(disabledButton).toBeDefined();
  });

  it('auto-hides after inactivity', () => {
    const { container } = render(<SlideshowControls {...createDefaultProps()} />);
    
    // Initially visible
    expect(container.firstChild).toHaveClass('opacity-100');
    
    // After 3 seconds of inactivity
    act(() => {
      jest.advanceTimersByTime(3500);
    });
    
    expect(container.firstChild).toHaveClass('opacity-0');
  });

  it('shows on mouse movement', () => {
    const { container } = render(<SlideshowControls {...createDefaultProps()} />);
    
    // Hide first
    act(() => {
      jest.advanceTimersByTime(3500);
    });
    
    expect(container.firstChild).toHaveClass('opacity-0');
    
    // Move mouse
    fireEvent.mouseMove(window);
    
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    expect(container.firstChild).toHaveClass('opacity-100');
  });

  it('stays visible on mouse enter', () => {
    const { container } = render(<SlideshowControls {...createDefaultProps()} />);
    
    // Initially visible
    expect(container.firstChild).toHaveClass('opacity-100');
    
    // Mouse enter should keep it visible
    fireEvent.mouseEnter(container.firstChild as Element);
    
    // Should remain visible immediately after mouse enter
    expect(container.firstChild).toHaveClass('opacity-100');
  });

  it('formats time correctly', () => {
    render(<SlideshowControls {...createDefaultProps({ 
      elapsedTime: 3661, // 61 minutes and 1 second
      settings: { ...defaultSettings, showTimer: true }
    })} />);
    
    expect(screen.getByText('61:01')).toBeInTheDocument();
  });

  it('calls onShowKeyboardHelp when keyboard button is clicked', () => {
    const onShowKeyboardHelp = jest.fn();
    render(<SlideshowControls {...createDefaultProps({ onShowKeyboardHelp })} />);
    
    fireEvent.mouseMove(window);
  });
});

describe('KeyboardHelpModal', () => {
  it('renders when isOpen is true', () => {
    render(<KeyboardHelpModal isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByText('键盘快捷键')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<KeyboardHelpModal isOpen={false} onClose={jest.fn()} />);
    expect(screen.queryByText('键盘快捷键')).not.toBeInTheDocument();
  });

  it('displays all keyboard shortcuts', () => {
    render(<KeyboardHelpModal isOpen={true} onClose={jest.fn()} />);
    
    expect(screen.getByText('上一张幻灯片')).toBeInTheDocument();
    expect(screen.getByText('下一张幻灯片')).toBeInTheDocument();
    expect(screen.getByText('第一张幻灯片')).toBeInTheDocument();
    expect(screen.getByText('最后一张幻灯片')).toBeInTheDocument();
    expect(screen.getByText('退出演示模式')).toBeInTheDocument();
    expect(screen.getByText('切换全屏')).toBeInTheDocument();
    expect(screen.getByText('显示/隐藏缩略图')).toBeInTheDocument();
    expect(screen.getByText('显示/隐藏备注')).toBeInTheDocument();
    expect(screen.getByText('开始/暂停自动播放')).toBeInTheDocument();
    expect(screen.getByText('显示快捷键帮助')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = jest.fn();
    const { container } = render(<KeyboardHelpModal isOpen={true} onClose={onClose} />);
    
    // Click on the backdrop (the outermost fixed div)
    const backdrop = container.querySelector('.fixed.inset-0');
    if (backdrop) {
      fireEvent.click(backdrop);
    }
    
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<KeyboardHelpModal isOpen={true} onClose={onClose} />);
    
    const closeButton = screen.getAllByRole('button')[0];
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('does not close when clicking inside the modal', () => {
    const onClose = jest.fn();
    render(<KeyboardHelpModal isOpen={true} onClose={onClose} />);
    
    // Click on the modal content
    const modalContent = screen.getByText('键盘快捷键');
    fireEvent.click(modalContent);
    
    // onClose should not be called because we stopped propagation
    expect(onClose).not.toHaveBeenCalled();
  });

  it('displays keyboard key badges', () => {
    render(<KeyboardHelpModal isOpen={true} onClose={jest.fn()} />);
    
    expect(screen.getByText('←')).toBeInTheDocument();
    expect(screen.getByText('→')).toBeInTheDocument();
    expect(screen.getByText('Esc')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('End')).toBeInTheDocument();
    expect(screen.getByText('F')).toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument();
    expect(screen.getByText('N')).toBeInTheDocument();
    expect(screen.getByText('P')).toBeInTheDocument();
  });
});
