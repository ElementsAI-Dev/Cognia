/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { OnboardingTour, mainTourSteps, resetOnboardingTour, isOnboardingCompleted } from './onboarding-tour';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      next: 'Next',
      previous: 'Previous',
      complete: 'Complete',
      skipTour: 'Skip tour',
      step: 'Step',
      'tour.welcomeTitle': 'Welcome',
      'tour.welcomeDesc': 'Welcome description',
    };
    return translations[key] || key;
  },
}));

// Mock framer-motion
jest.mock('framer-motion', () => {
  const MockMotionDiv = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    function MockMotionDiv({ children, className, style, ...props }, ref) {
      return (
        <div ref={ref} className={className} style={style} data-testid="motion-div" {...props}>
          {children}
        </div>
      );
    }
  );
  return {
    motion: {
      div: MockMotionDiv,
      path: (props: React.SVGAttributes<SVGPathElement>) => <path {...props} />,
      rect: (props: React.SVGAttributes<SVGRectElement>) => <rect {...props} />,
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// Mock sub-components
jest.mock('./spotlight-overlay', () => ({
  SpotlightOverlay: ({ isVisible }: { isVisible: boolean }) =>
    isVisible ? <div data-testid="spotlight-overlay" /> : null,
}));

jest.mock('./confetti', () => ({
  Confetti: ({ isActive }: { isActive: boolean }) =>
    isActive ? <div data-testid="confetti" /> : null,
}));

jest.mock('./tour-tooltip', () => ({
  TourTooltip: React.forwardRef<HTMLDivElement, {
    title: string;
    description: string;
    onNext: () => void;
    onPrevious: () => void;
    onSkip: () => void;
    onClose: () => void;
    isFirst: boolean;
    isLast: boolean;
  }>(function MockTourTooltip({ title, description, onNext, onPrevious, onSkip, onClose, isFirst, isLast }, ref) {
    return (
      <div ref={ref} data-testid="tour-tooltip">
        <h3>{title}</h3>
        <p>{description}</p>
        <button onClick={onPrevious} disabled={isFirst} data-testid="prev-btn">Previous</button>
        <button onClick={onNext} data-testid="next-btn">{isLast ? 'Complete' : 'Next'}</button>
        <button onClick={onSkip} data-testid="skip-btn">Skip</button>
        <button onClick={onClose} data-testid="close-btn">Close</button>
      </div>
    );
  }),
}));

jest.mock('./use-tour-keyboard', () => ({
  useTourKeyboard: jest.fn(),
}));

describe('OnboardingTour', () => {
  const mockSteps = [
    { id: 'step1', title: 'Step 1', description: 'Description 1' },
    { id: 'step2', title: 'Step 2', description: 'Description 2' },
    { id: 'step3', title: 'Step 3', description: 'Description 3' },
  ];

  const defaultProps = {
    steps: mockSteps,
    onComplete: jest.fn(),
    onSkip: jest.fn(),
    storageKey: 'test-tour',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
  });

  it('renders tour when not completed', async () => {
    render(<OnboardingTour {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('tour-tooltip')).toBeInTheDocument();
    });
  });

  it('does not render when already completed', async () => {
    localStorage.setItem('cognia:onboarding:test-tour', 'true');

    render(<OnboardingTour {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByTestId('tour-tooltip')).not.toBeInTheDocument();
    });
  });

  it('displays first step initially', async () => {
    render(<OnboardingTour {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Step 1')).toBeInTheDocument();
      expect(screen.getByText('Description 1')).toBeInTheDocument();
    });
  });

  it('navigates to next step when next button is clicked', async () => {
    render(<OnboardingTour {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Step 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('next-btn'));

    await waitFor(() => {
      expect(screen.getByText('Step 2')).toBeInTheDocument();
    });
  });

  it('navigates to previous step when previous button is clicked', async () => {
    render(<OnboardingTour {...defaultProps} />);

    // Go to step 2
    await waitFor(() => {
      expect(screen.getByText('Step 1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('next-btn'));

    await waitFor(() => {
      expect(screen.getByText('Step 2')).toBeInTheDocument();
    });

    // Go back to step 1
    fireEvent.click(screen.getByTestId('prev-btn'));

    await waitFor(() => {
      expect(screen.getByText('Step 1')).toBeInTheDocument();
    });
  });

  it('calls onComplete when tour is completed', async () => {
    jest.useFakeTimers();
    const onComplete = jest.fn();

    render(<OnboardingTour {...defaultProps} onComplete={onComplete} />);

    // Navigate through all steps
    await waitFor(() => {
      expect(screen.getByText('Step 1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('next-btn'));

    await waitFor(() => {
      expect(screen.getByText('Step 2')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('next-btn'));

    await waitFor(() => {
      expect(screen.getByText('Step 3')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('next-btn'));

    // Wait for completion (includes confetti delay)
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(onComplete).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('calls onSkip when skip button is clicked', async () => {
    const onSkip = jest.fn();

    render(<OnboardingTour {...defaultProps} onSkip={onSkip} />);

    await waitFor(() => {
      expect(screen.getByTestId('skip-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('skip-btn'));

    expect(onSkip).toHaveBeenCalled();
  });

  it('saves completion status to localStorage', async () => {
    jest.useFakeTimers();
    render(<OnboardingTour {...defaultProps} />);

    // Navigate to end and complete
    await waitFor(() => {
      expect(screen.getByText('Step 1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('next-btn'));
    fireEvent.click(screen.getByTestId('next-btn'));
    fireEvent.click(screen.getByTestId('next-btn'));

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(localStorage.getItem('cognia:onboarding:test-tour')).toBe('true');
    jest.useRealTimers();
  });

  it('renders SpotlightOverlay', async () => {
    render(<OnboardingTour {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('spotlight-overlay')).toBeInTheDocument();
    });
  });

  it('shows confetti on completion with showConfetti=true', async () => {
    jest.useFakeTimers();
    render(<OnboardingTour {...defaultProps} showConfetti={true} />);

    // Complete the tour
    await waitFor(() => {
      expect(screen.getByText('Step 1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('next-btn'));
    fireEvent.click(screen.getByTestId('next-btn'));
    fireEvent.click(screen.getByTestId('next-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('confetti')).toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  it('does not show confetti when showConfetti=false', async () => {
    render(<OnboardingTour {...defaultProps} showConfetti={false} />);

    // Complete the tour
    await waitFor(() => {
      expect(screen.getByText('Step 1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('next-btn'));
    fireEvent.click(screen.getByTestId('next-btn'));
    fireEvent.click(screen.getByTestId('next-btn'));

    expect(screen.queryByTestId('confetti')).not.toBeInTheDocument();
  });

  it('executes step action when provided', async () => {
    const stepAction = jest.fn();
    const stepsWithAction = [
      { id: 'step1', title: 'Step 1', description: 'Desc 1', action: stepAction },
      { id: 'step2', title: 'Step 2', description: 'Desc 2' },
    ];

    render(<OnboardingTour {...defaultProps} steps={stepsWithAction} />);

    await waitFor(() => {
      expect(screen.getByText('Step 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('next-btn'));

    expect(stepAction).toHaveBeenCalled();
  });
});

describe('mainTourSteps', () => {
  it('has correct number of steps', () => {
    expect(mainTourSteps.length).toBe(5);
  });

  it('has required properties for each step', () => {
    mainTourSteps.forEach((step) => {
      expect(step.id).toBeDefined();
      expect(typeof step.id).toBe('string');
    });
  });

  it('includes welcome step', () => {
    const welcomeStep = mainTourSteps.find((s) => s.id === 'welcome');
    expect(welcomeStep).toBeDefined();
  });

  it('includes complete step', () => {
    const completeStep = mainTourSteps.find((s) => s.id === 'complete');
    expect(completeStep).toBeDefined();
  });
});

describe('resetOnboardingTour', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('removes tour completion from localStorage', () => {
    localStorage.setItem('cognia:onboarding:main', 'true');
    expect(localStorage.getItem('cognia:onboarding:main')).toBe('true');

    resetOnboardingTour('main');

    expect(localStorage.getItem('cognia:onboarding:main')).toBeNull();
  });

  it('uses default storageKey when not provided', () => {
    localStorage.setItem('cognia:onboarding:main', 'true');

    resetOnboardingTour();

    expect(localStorage.getItem('cognia:onboarding:main')).toBeNull();
  });

  it('handles custom storageKey', () => {
    localStorage.setItem('cognia:onboarding:custom', 'true');

    resetOnboardingTour('custom');

    expect(localStorage.getItem('cognia:onboarding:custom')).toBeNull();
  });
});

describe('isOnboardingCompleted', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns false when tour is not completed', () => {
    expect(isOnboardingCompleted('main')).toBe(false);
  });

  it('returns true when tour is completed', () => {
    localStorage.setItem('cognia:onboarding:main', 'true');

    expect(isOnboardingCompleted('main')).toBe(true);
  });

  it('uses default storageKey when not provided', () => {
    localStorage.setItem('cognia:onboarding:main', 'true');

    expect(isOnboardingCompleted()).toBe(true);
  });

  it('handles custom storageKey', () => {
    localStorage.setItem('cognia:onboarding:custom', 'true');

    expect(isOnboardingCompleted('custom')).toBe(true);
    expect(isOnboardingCompleted('other')).toBe(false);
  });
});
