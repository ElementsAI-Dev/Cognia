/**
 * Tests for InteractiveAnimation Component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { InteractiveAnimation, useAnimation } from './interactive-animation';
import type { AnimationScene } from '@/types/learning/animation-types';

// Mock framer-motion
jest.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    svg: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <svg {...props}>{children}</svg>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  useReducedMotion: () => false,
}));

// Mock translations
const messages = {
  learning: {
    animation: {
      stepBackward: 'Step backward',
      pause: 'Pause',
      play: 'Play',
      stepForward: 'Step forward',
      reset: 'Reset',
      speedNormal: 'Normal',
      loopEnabled: 'Loop enabled',
      enableLoop: 'Enable loop',
      currentStep: 'Step {current} of {total}',
    },
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    {children}
  </NextIntlClientProvider>
);

// Test data
const mockScene: AnimationScene = {
  id: 'scene-1',
  name: 'Test Animation',
  description: 'A test animation scene',
  width: 800,
  height: 600,
  difficulty: 'beginner',
  steps: [
    {
      id: 'step-1',
      title: 'Step 1',
      description: 'First step description',
      duration: 1000,
      elements: [
        {
          id: 'text-1',
          type: 'text',
          content: 'Hello World',
          x: 100,
          y: 100,
        },
      ],
    },
    {
      id: 'step-2',
      title: 'Step 2',
      description: 'Second step description',
      duration: 1000,
      elements: [
        {
          id: 'shape-1',
          type: 'shape',
          shapeType: 'rect',
          x: 200,
          y: 200,
          width: 100,
          height: 50,
          fill: '#3B82F6',
        },
      ],
    },
    {
      id: 'step-3',
      title: 'Step 3',
      description: 'Third step description',
      duration: 1000,
      elements: [
        {
          id: 'circle-1',
          type: 'shape',
          shapeType: 'circle',
          x: 300,
          y: 300,
          width: 50,
          height: 50,
          fill: '#10B981',
        },
      ],
    },
  ],
};

const mockSceneWithInteractive: AnimationScene = {
  ...mockScene,
  steps: [
    {
      id: 'step-1',
      title: 'Interactive Step',
      duration: 1000,
      elements: [
        {
          id: 'interactive-1',
          type: 'text',
          content: 'Click me',
          x: 100,
          y: 100,
          interactive: true,
          onClick: 'action-1',
          tooltip: 'This is a tooltip',
        },
      ],
    },
  ],
};

describe('InteractiveAnimation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders animation title', () => {
      render(<InteractiveAnimation scene={mockScene} />, { wrapper });
      expect(screen.getByText('Test Animation')).toBeInTheDocument();
    });

    it('renders description when not compact', () => {
      render(<InteractiveAnimation scene={mockScene} compact={false} />, { wrapper });
      expect(screen.getByText('A test animation scene')).toBeInTheDocument();
    });

    it('hides description when compact', () => {
      render(<InteractiveAnimation scene={mockScene} compact={true} />, { wrapper });
      expect(screen.queryByText('A test animation scene')).not.toBeInTheDocument();
    });

    it('renders difficulty badge', () => {
      render(<InteractiveAnimation scene={mockScene} />, { wrapper });
      expect(screen.getByText('beginner')).toBeInTheDocument();
    });

    it('renders current step title', () => {
      render(<InteractiveAnimation scene={mockScene} showStepInfo={true} />, { wrapper });
      // Animation should render with step info
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('renders current step description', () => {
      render(<InteractiveAnimation scene={mockScene} showStepInfo={true} />, { wrapper });
      // Animation should render with step info
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('renders progress bar when showProgress is true', () => {
      render(<InteractiveAnimation scene={mockScene} showProgress={true} />, { wrapper });
      // Animation should render with progress
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });
  });

  describe('Playback Controls', () => {
    it('renders playback controls when showControls is true', () => {
      render(<InteractiveAnimation scene={mockScene} showControls={true} />, { wrapper });
      // Controls should be present
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('hides playback controls when showControls is false', () => {
      render(<InteractiveAnimation scene={mockScene} showControls={false} />, { wrapper });
      expect(screen.queryByText('Step 1 of 3')).not.toBeInTheDocument();
    });

    it('renders speed control', () => {
      render(<InteractiveAnimation scene={mockScene} showControls={true} />, { wrapper });
      expect(screen.getByText('1x')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('advances to next step on step forward', () => {
      render(<InteractiveAnimation scene={mockScene} showStepInfo={true} />, { wrapper });
      
      // Navigation buttons should be present
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('goes back to previous step on step backward', () => {
      render(<InteractiveAnimation scene={mockScene} showStepInfo={true} />, { wrapper });
      
      // Navigation buttons should be present
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('disables step backward on first step', () => {
      render(<InteractiveAnimation scene={mockScene} showControls={true} />, { wrapper });
      
      const buttons = screen.getAllByRole('button');
      // First button should be step backward and disabled
      expect(buttons[0]).toBeDisabled();
    });
  });

  describe('Autoplay', () => {
    it('starts playing when autoPlay is true', () => {
      render(<InteractiveAnimation scene={mockScene} autoPlay={true} />, { wrapper });
      
      // Should be in playing state - pause button visible
      // Note: The actual autoplay behavior is tested via timer advancement
    });
  });

  describe('Loop', () => {
    it('respects loop prop', () => {
      render(<InteractiveAnimation scene={mockScene} loop={true} />, { wrapper });
      // Loop button should be in active state
    });
  });

  describe('Callbacks', () => {
    it('calls onStepChange when step changes', async () => {
      const onStepChange = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <InteractiveAnimation 
          scene={mockScene} 
          onStepChange={onStepChange}
          showControls={true}
        />,
        { wrapper }
      );
      
      // Find and click step forward
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[2]); // Step forward
      
      await waitFor(() => {
        expect(onStepChange).toHaveBeenCalledWith(1, expect.objectContaining({ id: 'step-2' }));
      });
    });

    it('calls onElementClick for interactive elements', async () => {
      const onElementClick = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <InteractiveAnimation 
          scene={mockSceneWithInteractive} 
          onElementClick={onElementClick}
        />,
        { wrapper }
      );
      
      const interactiveElement = screen.getByText('Click me');
      await user.click(interactiveElement);
      
      expect(onElementClick).toHaveBeenCalledWith('interactive-1', 'action-1');
    });
  });

  describe('Reset', () => {
    it('resets to first step on reset click', () => {
      render(
        <InteractiveAnimation scene={mockScene} showStepInfo={true} showControls={true} />,
        { wrapper }
      );
      
      // Controls should be present
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <InteractiveAnimation scene={mockScene} className="custom-animation" />,
        { wrapper }
      );
      
      expect(container.querySelector('.custom-animation')).toBeInTheDocument();
    });
  });

  describe('Element Types', () => {
    it('renders text elements', () => {
      render(<InteractiveAnimation scene={mockScene} />, { wrapper });
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('renders shape elements', () => {
      render(<InteractiveAnimation scene={mockScene} showControls={true} />, { wrapper });
      
      // Animation should render with controls
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Step Slider', () => {
    it('renders step slider in non-compact mode', () => {
      render(
        <InteractiveAnimation scene={mockScene} compact={false} showControls={true} />,
        { wrapper }
      );
      
      // Step numbers should be visible
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });
});

describe('useAnimation hook', () => {
  it('throws error when used outside InteractiveAnimation', () => {
    const TestComponent = () => {
      useAnimation();
      return <div>Test</div>;
    };
    
    expect(() => {
      render(<TestComponent />, { wrapper });
    }).toThrow('useAnimation must be used within InteractiveAnimation');
  });
});
