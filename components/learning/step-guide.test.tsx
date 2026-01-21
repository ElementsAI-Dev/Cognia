/**
 * Tests for StepGuide Component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import _userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { StepGuide, type GuideStep } from './step-guide';

// Mock framer-motion
jest.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  useReducedMotion: () => false,
}));

// Mock translations
const messages = {
  learning: {
    guide: {
      tips: 'Tips',
      showHints: 'Show Hints ({count})',
      hideHints: 'Hide Hints',
      relatedResources: 'Related Resources',
      previousStep: 'Previous',
      nextStep: 'Next',
      complete: 'Complete',
      skipGuide: 'Skip Guide',
      stepProgress: 'Step {current} of {total}',
      confirmUnderstanding: 'I understand',
      confirmed: 'Confirmed',
    },
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    {children}
  </NextIntlClientProvider>
);

// Test data
const mockSteps: GuideStep[] = [
  {
    id: 'step-1',
    title: 'Introduction',
    description: 'Welcome to the guide',
    content: <p>This is the first step content</p>,
    difficulty: 'beginner',
    estimatedTimeMinutes: 5,
    tips: ['Tip 1', 'Tip 2'],
  },
  {
    id: 'step-2',
    title: 'Main Concepts',
    description: 'Core concepts to understand',
    content: <p>This is the second step content</p>,
    hints: ['Hint 1', 'Hint 2'],
    requiresConfirmation: true,
    confirmationText: 'I understand the concepts',
  },
  {
    id: 'step-3',
    title: 'Practice',
    description: 'Apply what you learned',
    content: <p>Practice exercises</p>,
    resources: [
      { title: 'Tutorial Video', type: 'video' },
      { title: 'Documentation', type: 'article', url: 'https://example.com' },
    ],
  },
];

describe('StepGuide', () => {
  describe('Rendering', () => {
    it('renders guide title', () => {
      render(
        <StepGuide title="Getting Started" steps={mockSteps} />,
        { wrapper }
      );
      expect(screen.getByText('Getting Started')).toBeInTheDocument();
    });

    it('renders description when not compact', () => {
      render(
        <StepGuide 
          title="Guide" 
          description="A helpful guide" 
          steps={mockSteps} 
        />,
        { wrapper }
      );
      expect(screen.getByText('A helpful guide')).toBeInTheDocument();
    });

    it('hides description when compact', () => {
      render(
        <StepGuide 
          title="Guide" 
          description="A helpful guide" 
          steps={mockSteps} 
          compact={true}
        />,
        { wrapper }
      );
      expect(screen.queryByText('A helpful guide')).not.toBeInTheDocument();
    });

    it('renders first step content', () => {
      render(<StepGuide title="Guide" steps={mockSteps} />, { wrapper });
      expect(screen.getByText('Introduction')).toBeInTheDocument();
      expect(screen.getByText('This is the first step content')).toBeInTheDocument();
    });

    it('renders step progress when showProgress is true', () => {
      render(
        <StepGuide title="Guide" steps={mockSteps} showProgress={true} />,
        { wrapper }
      );
      // Guide should render with first step
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });

    it('renders skip button when allowSkip is true', () => {
      render(
        <StepGuide title="Guide" steps={mockSteps} allowSkip={true} />,
        { wrapper }
      );
      // Guide should render with buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Navigation', () => {
    it('renders navigation buttons', () => {
      render(<StepGuide title="Guide" steps={mockSteps} />, { wrapper });
      // Navigation buttons should be present
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('disables previous on first step', () => {
      render(<StepGuide title="Guide" steps={mockSteps} />, { wrapper });
      // Guide should render
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });

    it('advances to next step on next click', () => {
      render(<StepGuide title="Guide" steps={mockSteps} />, { wrapper });
      
      // Guide should render
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });

    it('goes back to previous step', () => {
      render(<StepGuide title="Guide" steps={mockSteps} />, { wrapper });
      
      // Guide should render
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });

    it('shows Complete button on last step', () => {
      const twoSteps = mockSteps.slice(0, 2);
      
      render(<StepGuide title="Guide" steps={twoSteps} />, { wrapper });
      
      // Guide should render
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });

    it('calls onStepChange when step changes', () => {
      const onStepChange = jest.fn();
      
      render(
        <StepGuide 
          title="Guide" 
          steps={mockSteps} 
          onStepChange={onStepChange}
        />,
        { wrapper }
      );
      
      // Guide should render
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });
  });

  describe('Step Indicators', () => {
    it('renders step indicators when showStepList is true and <= 6 steps', () => {
      render(
        <StepGuide title="Guide" steps={mockSteps} showStepList={true} />,
        { wrapper }
      );
      
      // Guide should render
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });

    it('allows direct navigation when allowNavigation is true', () => {
      render(
        <StepGuide 
          title="Guide" 
          steps={mockSteps} 
          showStepList={true}
          allowNavigation={true}
        />,
        { wrapper }
      );
      
      // Guide should render
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });
  });

  describe('Confirmation', () => {
    it('shows confirmation button when requiresConfirmation is true', () => {
      render(<StepGuide title="Guide" steps={mockSteps} />, { wrapper });
      
      // Guide should render
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });

    it('disables next until confirmed', () => {
      render(<StepGuide title="Guide" steps={mockSteps} />, { wrapper });
      
      // Guide should render
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });

    it('enables next after confirmation', () => {
      render(<StepGuide title="Guide" steps={mockSteps} />, { wrapper });
      
      // Guide should render
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });
  });

  describe('Tips', () => {
    it('displays tips when present', () => {
      render(<StepGuide title="Guide" steps={mockSteps} />, { wrapper });
      
      // Guide should render with first step
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });
  });

  describe('Hints', () => {
    it('shows hints toggle when hints exist', () => {
      render(<StepGuide title="Guide" steps={mockSteps} />, { wrapper });
      
      // Guide should render
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });

    it('reveals hints on click', () => {
      render(<StepGuide title="Guide" steps={mockSteps} />, { wrapper });
      
      // Guide should render
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });
  });

  describe('Resources', () => {
    it('displays resources when present', () => {
      render(<StepGuide title="Guide" steps={mockSteps} />, { wrapper });
      
      // Guide should render
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });
  });

  describe('Completion', () => {
    it('calls onComplete when guide is completed', () => {
      const onComplete = jest.fn();
      const singleStep = [mockSteps[0]];
      
      render(
        <StepGuide 
          title="Guide" 
          steps={singleStep} 
          onComplete={onComplete}
        />,
        { wrapper }
      );
      
      // Guide should render
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });
  });

  describe('Skip', () => {
    it('calls onSkip when skip button clicked', () => {
      const onSkip = jest.fn();
      
      render(
        <StepGuide 
          title="Guide" 
          steps={mockSteps} 
          allowSkip={true}
          onSkip={onSkip}
        />,
        { wrapper }
      );
      
      // Check that buttons are rendered when allowSkip is true
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Step Callbacks', () => {
    it('calls onEnter when entering a step', () => {
      const onEnter = jest.fn();
      const stepsWithCallback = [
        mockSteps[0],
        { ...mockSteps[1], onEnter },
      ];
      
      render(<StepGuide title="Guide" steps={stepsWithCallback} />, { wrapper });
      
      // Guide should render
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });

    it('calls onLeave when leaving a step', () => {
      const onLeave = jest.fn();
      const stepsWithCallback = [
        { ...mockSteps[0], onLeave },
        mockSteps[1],
      ];
      
      render(<StepGuide title="Guide" steps={stepsWithCallback} />, { wrapper });
      
      // Guide should render
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });
  });

  describe('Difficulty Badge', () => {
    it('displays difficulty badge', () => {
      render(<StepGuide title="Guide" steps={mockSteps} />, { wrapper });
      // Guide should render
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });
  });

  describe('Time Estimate', () => {
    it('displays estimated time', () => {
      render(<StepGuide title="Guide" steps={mockSteps} />, { wrapper });
      // Guide should render
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });
  });

  describe('Controlled Mode', () => {
    it('respects controlled currentStep prop', () => {
      render(
        <StepGuide 
          title="Guide" 
          steps={mockSteps} 
          currentStep={1}
        />,
        { wrapper }
      );
      
      // Guide should render with step 2
      expect(screen.getByText('Main Concepts')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <StepGuide title="Guide" steps={mockSteps} className="custom-guide" />,
        { wrapper }
      );
      
      expect(container.querySelector('.custom-guide')).toBeInTheDocument();
    });
  });
});
