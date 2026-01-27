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
      },
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

    it('renders the Sparkles icon', () => {
      const { container } = render(<SimplifiedWelcome {...defaultProps} />);
      
      // Check for SVG icon
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

  describe('SuggestionPill', () => {
    it('renders suggestion pills as buttons', () => {
      render(<SimplifiedWelcome {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(4); // 4 suggestions
    });

    it('applies animation delay based on index', () => {
      const { container } = render(<SimplifiedWelcome {...defaultProps} />);
      
      const buttons = container.querySelectorAll('button');
      // First button should have 0ms delay
      expect(buttons[0]).toHaveStyle({ animationDelay: '0ms' });
      // Second button should have 50ms delay
      expect(buttons[1]).toHaveStyle({ animationDelay: '50ms' });
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
          },
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
      
      // Check for flex container
      expect(container.firstChild).toHaveClass('flex');
      expect(container.firstChild).toHaveClass('h-full');
    });

    it('renders keyboard hint', () => {
      render(<SimplifiedWelcome {...defaultProps} />);
      
      expect(screen.getByText('Type a message or press')).toBeInTheDocument();
      expect(screen.getByText('to send')).toBeInTheDocument();
    });
  });
});
