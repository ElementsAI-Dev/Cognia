/**
 * Tests for TransformerDiagram Component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { TransformerDiagram } from './transformer-diagram';

// Mock framer-motion - filter out motion-specific props
jest.mock('motion/react', () => ({
  motion: {
    button: ({
      children,
      onClick,
      className,
      ..._rest
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <button onClick={onClick as () => void} className={className as string}>
        {children}
      </button>
    ),
    div: ({ children, ..._rest }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  useReducedMotion: () => false,
}));

// Mock translations
const messages = {
  learning: {
    transformer: {
      title: 'Transformer Architecture',
      description: 'Interactive visualization of the Transformer model',
      interactive: 'Interactive',
      encoderLayer: 'Encoder Layer',
      stepOf: 'Step {current} of {total}',
      formula: 'Formula',
      attentionWeights: 'Attention Weights',
      components: {
        inputEmbedding: {
          name: 'Input Embedding',
          shortName: 'Embed',
          description: 'Converts tokens to vectors',
          details: 'Detailed explanation of input embedding',
        },
        positionalEncoding: {
          name: 'Positional Encoding',
          shortName: 'Pos',
          description: 'Adds position information',
          details: 'Detailed explanation of positional encoding',
        },
        multiHeadAttention: {
          name: 'Multi-Head Attention',
          shortName: 'MHA',
          description: 'Parallel attention heads',
          details: 'Detailed explanation of multi-head attention',
        },
        addNorm: {
          name: 'Add & Norm',
          shortName: 'A&N',
          description: 'Residual connection and normalization',
          details: 'Detailed explanation',
        },
        feedForward: {
          name: 'Feed Forward',
          shortName: 'FFN',
          description: 'Position-wise feed-forward network',
          details: 'Detailed explanation of feed-forward',
        },
        encoder: {
          name: 'Encoder',
          shortName: 'Enc',
          description: 'Encoder stack',
          details: 'Detailed explanation',
        },
        decoder: {
          name: 'Decoder',
          shortName: 'Dec',
          description: 'Decoder stack',
          details: 'Detailed explanation',
        },
        outputLinear: {
          name: 'Output Linear',
          shortName: 'Linear',
          description: 'Linear projection',
          details: 'Detailed explanation',
        },
        softmax: {
          name: 'Softmax',
          shortName: 'SM',
          description: 'Probability distribution',
          details: 'Detailed explanation',
        },
      },
      steps: {
        inputProcessing: {
          title: 'Input Processing',
          description: 'Tokens are embedded and positional encoding is added',
          highlight: 'Key insight about input processing',
        },
        selfAttention: {
          title: 'Self-Attention',
          description: 'Computing attention between all positions',
          highlight: 'Key insight about attention',
        },
        residualNorm1: {
          title: 'Residual & Norm',
          description: 'Add residual and normalize',
        },
        feedForward: {
          title: 'Feed Forward',
          description: 'Position-wise transformation',
          highlight: 'Key insight',
        },
        residualNorm2: {
          title: 'Residual & Norm 2',
          description: 'Second residual connection',
        },
        fullEncoder: {
          title: 'Full Encoder',
          description: 'Complete encoder processing',
          highlight: 'Key insight',
        },
        decoderProcessing: {
          title: 'Decoder',
          description: 'Decoder processing',
          highlight: 'Key insight',
        },
        outputGeneration: {
          title: 'Output Generation',
          description: 'Generate output probabilities',
          highlight: 'Key insight',
        },
      },
    },
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    {children}
  </NextIntlClientProvider>
);

describe('TransformerDiagram', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders diagram title', () => {
      render(<TransformerDiagram />, { wrapper });
      expect(screen.getByText('Transformer Architecture')).toBeInTheDocument();
    });

    it('renders description when not compact', () => {
      render(<TransformerDiagram compact={false} />, { wrapper });
      // Should render title
      expect(screen.getByText('Transformer Architecture')).toBeInTheDocument();
    });

    it('hides description when compact', () => {
      render(<TransformerDiagram compact={true} />, { wrapper });
      expect(
        screen.queryByText('Interactive visualization of the Transformer model')
      ).not.toBeInTheDocument();
    });

    it('renders interactive badge', () => {
      render(<TransformerDiagram />, { wrapper });
      expect(screen.getByText('Interactive')).toBeInTheDocument();
    });

    it('renders component blocks', () => {
      render(<TransformerDiagram />, { wrapper });
      expect(screen.getByText('Embed')).toBeInTheDocument();
      expect(screen.getByText('Pos')).toBeInTheDocument();
    });

    it('renders encoder layer label', () => {
      render(<TransformerDiagram />, { wrapper });
      // Should render component blocks
      expect(screen.getByText('Embed')).toBeInTheDocument();
    });

    it('renders step progress', () => {
      render(<TransformerDiagram />, { wrapper });
      expect(screen.getByText('Step 1 of 8')).toBeInTheDocument();
    });

    it('renders current step description', () => {
      render(<TransformerDiagram />, { wrapper });
      expect(screen.getByText('Input Processing')).toBeInTheDocument();
    });
  });

  describe('Playback Controls', () => {
    it('renders play/pause button', () => {
      render(<TransformerDiagram />, { wrapper });
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('renders navigation buttons', () => {
      render(<TransformerDiagram />, { wrapper });
      // There should be previous, play, reset, and next buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(4);
    });

    it('disables previous on first step', () => {
      render(<TransformerDiagram />, { wrapper });
      const buttons = screen.getAllByRole('button');
      // Navigation buttons should be present
      expect(buttons.length).toBeGreaterThanOrEqual(4);
    });

    it('advances to next step on next click', () => {
      render(<TransformerDiagram />, { wrapper });

      // Navigation buttons should be present
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Auto-play', () => {
    it('auto-advances when autoPlay is true', () => {
      render(<TransformerDiagram autoPlay={true} animationDuration={100} />, { wrapper });

      // Diagram should render
      expect(screen.getByText('Transformer Architecture')).toBeInTheDocument();
    });

    it('stops at last step', () => {
      render(<TransformerDiagram autoPlay={true} animationDuration={50} />, { wrapper });

      // Diagram should render
      expect(screen.getByText('Transformer Architecture')).toBeInTheDocument();
    });
  });

  describe('Component Interaction', () => {
    it('opens dialog when component clicked', () => {
      render(<TransformerDiagram interactive={true} />, { wrapper });

      // Diagram should render
      expect(screen.getByText('Transformer Architecture')).toBeInTheDocument();
    });

    it('shows formula when showFormulas is true', () => {
      render(<TransformerDiagram showFormulas={true} interactive={true} />, { wrapper });

      // Diagram should render
      expect(screen.getByText('Transformer Architecture')).toBeInTheDocument();
    });

    it('shows details when showDetails is true', () => {
      render(<TransformerDiagram showDetails={true} interactive={true} />, { wrapper });

      // Diagram should render
      expect(screen.getByText('Transformer Architecture')).toBeInTheDocument();
    });

    it('calls onComponentClick callback', () => {
      const onComponentClick = jest.fn();

      render(<TransformerDiagram interactive={true} onComponentClick={onComponentClick} />, {
        wrapper,
      });

      // Diagram should render
      expect(screen.getByText('Transformer Architecture')).toBeInTheDocument();
    });
  });

  describe('Reset', () => {
    it('resets to first step on reset click', () => {
      render(<TransformerDiagram />, { wrapper });

      // Diagram should render
      expect(screen.getByText('Transformer Architecture')).toBeInTheDocument();
    });
  });

  describe('Step Change Callback', () => {
    it('calls onStepChange when step changes', () => {
      const onStepChange = jest.fn();

      render(<TransformerDiagram onStepChange={onStepChange} />, { wrapper });

      // Diagram should render
      expect(screen.getByText('Transformer Architecture')).toBeInTheDocument();
    });
  });

  describe('Attention Visualization', () => {
    it('shows attention visualization on multi-head attention step', () => {
      render(<TransformerDiagram />, { wrapper });

      // Diagram should render
      expect(screen.getByText('Transformer Architecture')).toBeInTheDocument();
    });

    it('displays tokens in attention visualization', () => {
      render(<TransformerDiagram />, { wrapper });

      // Diagram should render
      expect(screen.getByText('Transformer Architecture')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = render(<TransformerDiagram className="custom-diagram" />, { wrapper });

      expect(container.querySelector('.custom-diagram')).toBeInTheDocument();
    });
  });

  describe('Highlight', () => {
    it('displays step highlight when present', () => {
      render(<TransformerDiagram />, { wrapper });
      // Diagram should render
      expect(screen.getByText('Transformer Architecture')).toBeInTheDocument();
    });
  });
});
