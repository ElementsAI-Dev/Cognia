/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SimplifiedWelcome } from './simplified-welcome';

// Mock stores
jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      simplifiedModeSettings: {
        enabled: true,
        preset: 'focused',
        hideSuggestionDescriptions: false,
        hideFeatureBadges: false,
        hideQuickAccessLinks: false,
        hideModeSelector: false,
      },
      welcomeSettings: {
        userName: '',
        timeBasedGreeting: { enabled: false, morning: '', afternoon: '', evening: '', night: '' },
        customGreeting: '',
        customDescription: '',
        iconConfig: { type: 'default' },
        useCustomSimplifiedSuggestions: false,
        simplifiedSuggestions: { chat: [], agent: [], research: [], learning: [] },
      },
      language: 'en',
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock lib/utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' '),
}));

describe('SimplifiedWelcome', () => {
  const defaultProps = {
    mode: 'chat' as const,
    onSuggestionClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders chat mode greeting correctly', () => {
      render(<SimplifiedWelcome {...defaultProps} />);
      
      expect(screen.getByText('How can I help you today?')).toBeInTheDocument();
      expect(screen.getByText('Ask me anything or choose a suggestion below')).toBeInTheDocument();
    });

    it('renders agent mode greeting correctly', () => {
      render(<SimplifiedWelcome {...defaultProps} mode="agent" />);
      
      expect(screen.getByText('What would you like me to do?')).toBeInTheDocument();
      expect(screen.getByText("I can help with code, data, and complex tasks")).toBeInTheDocument();
    });

    it('renders research mode greeting correctly', () => {
      render(<SimplifiedWelcome {...defaultProps} mode="research" />);
      
      expect(screen.getByText('What should we explore?')).toBeInTheDocument();
      expect(screen.getByText("I'll search and analyze information for you")).toBeInTheDocument();
    });

    it('renders learning mode greeting correctly', () => {
      render(<SimplifiedWelcome {...defaultProps} mode="learning" />);
      
      expect(screen.getByText('What would you like to learn?')).toBeInTheDocument();
      expect(screen.getByText("I'll guide you through any topic step by step")).toBeInTheDocument();
    });

    it('renders the Sparkles icon in default mode', () => {
      const { container } = render(<SimplifiedWelcome {...defaultProps} />);
      
      // Check for SVG icon (Sparkles)
      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
    });
  });

  describe('Suggestions', () => {
    it('displays 4 suggestions for chat mode', () => {
      render(<SimplifiedWelcome {...defaultProps} />);
      
      expect(screen.getByText('Explain quantum computing in simple terms')).toBeInTheDocument();
      expect(screen.getByText('Write a poem about the ocean')).toBeInTheDocument();
      expect(screen.getByText('Help me brainstorm ideas for a birthday party')).toBeInTheDocument();
      expect(screen.getByText('What are the best practices for productivity?')).toBeInTheDocument();
    });

    it('displays suggestions for agent mode', () => {
      render(<SimplifiedWelcome {...defaultProps} mode="agent" />);
      
      expect(screen.getByText('Create a Python script to organize my files')).toBeInTheDocument();
      expect(screen.getByText('Analyze this CSV data and create a chart')).toBeInTheDocument();
    });

    it('displays suggestions for research mode', () => {
      render(<SimplifiedWelcome {...defaultProps} mode="research" />);
      
      expect(screen.getByText('What are the latest developments in AI?')).toBeInTheDocument();
      expect(screen.getByText('Compare different renewable energy sources')).toBeInTheDocument();
    });

    it('displays suggestions for learning mode', () => {
      render(<SimplifiedWelcome {...defaultProps} mode="learning" />);
      
      expect(screen.getByText('Teach me the basics of machine learning')).toBeInTheDocument();
      expect(screen.getByText('Help me understand calculus step by step')).toBeInTheDocument();
    });

    it('calls onSuggestionClick when suggestion is clicked', () => {
      const onSuggestionClick = jest.fn();
      render(<SimplifiedWelcome {...defaultProps} onSuggestionClick={onSuggestionClick} />);
      
      const suggestionButton = screen.getByText('Explain quantum computing in simple terms');
      fireEvent.click(suggestionButton);
      
      expect(onSuggestionClick).toHaveBeenCalledWith('Explain quantum computing in simple terms');
    });

    it('handles missing onSuggestionClick gracefully', () => {
      render(<SimplifiedWelcome mode="chat" />);
      
      const suggestionButton = screen.getByText('Explain quantum computing in simple terms');
      // Should not throw when clicking without handler
      expect(() => fireEvent.click(suggestionButton)).not.toThrow();
    });
  });

  describe('SuggestionCard', () => {
    it('renders suggestion cards as buttons with icons', () => {
      const { container } = render(<SimplifiedWelcome {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      // 4 suggestion cards (no top bar buttons anymore)
      expect(buttons.length).toBeGreaterThanOrEqual(4);

      // Each card should have an icon container div
      const iconContainers = container.querySelectorAll('.rounded-lg');
      expect(iconContainers.length).toBeGreaterThanOrEqual(4);
    });

    it('applies staggered animation delay based on index', () => {
      const { container } = render(<SimplifiedWelcome {...defaultProps} />);
      
      // Find suggestion card buttons (those with animationDelay style)
      const allButtons = Array.from(container.querySelectorAll('button'));
      const cardButtons = allButtons.filter(b => b.style.animationDelay);
      expect(cardButtons.length).toBeGreaterThanOrEqual(2);
      // Verify sequential delay pattern
      if (cardButtons.length >= 2) {
        const delay0 = parseInt(cardButtons[0].style.animationDelay);
        const delay1 = parseInt(cardButtons[1].style.animationDelay);
        expect(delay1).toBeGreaterThan(delay0);
      }
    });
  });

  describe('Settings integration', () => {
    it('hides subtitle when hideSuggestionDescriptions is true', () => {
      const { useSettingsStore } = jest.requireMock('@/stores');
      (useSettingsStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          simplifiedModeSettings: {
            enabled: true,
            preset: 'focused',
            hideSuggestionDescriptions: true,
            hideModeSelector: false,
          },
          welcomeSettings: {
            userName: '',
            timeBasedGreeting: { enabled: false, morning: '', afternoon: '', evening: '', night: '' },
            customGreeting: '',
            customDescription: '',
            iconConfig: { type: 'default' },
            useCustomSimplifiedSuggestions: false,
            simplifiedSuggestions: { chat: [], agent: [], research: [], learning: [] },
          },
          language: 'en',
        };
        return selector ? selector(state) : state;
      });

      render(<SimplifiedWelcome {...defaultProps} />);
      
      expect(screen.getByText('How can I help you today?')).toBeInTheDocument();
      expect(screen.queryByText('Ask me anything or choose a suggestion below')).not.toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('renders with correct container structure', () => {
      const { container } = render(<SimplifiedWelcome {...defaultProps} />);
      
      // Check for flex container with justify-end (content near bottom/input)
      expect(container.firstChild).toHaveClass('flex');
      expect(container.firstChild).toHaveClass('h-full');
      expect(container.firstChild).toHaveClass('justify-end');
    });

    it('does not render redundant top bar or bottom hints', () => {
      render(<SimplifiedWelcome {...defaultProps} />);
      
      // Top bar elements should not exist (moved to ChatHeader)
      expect(screen.queryByText('Full Mode')).not.toBeInTheDocument();
      // Bottom keyboard hint should not exist (ChatInput handles this)
      expect(screen.queryByText('Type a message or press')).not.toBeInTheDocument();
      expect(screen.queryByText('to send')).not.toBeInTheDocument();
    });

    it('renders mode dropdown when onModeChange is provided', () => {
      render(<SimplifiedWelcome {...defaultProps} onModeChange={jest.fn()} />);
      
      // Mode switcher dropdown trigger should be present
      expect(screen.getByText('Chat')).toBeInTheDocument();
    });
  });
});
