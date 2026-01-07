/**
 * Tests for ResultPanel component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ResultPanel, ResultPanelProps } from './result-panel';

const mockWriteText = jest.fn();
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: mockWriteText },
  writable: true,
  configurable: true,
});

// Default props for all tests
const defaultProps: ResultPanelProps = {
  result: null,
  error: null,
  isLoading: false,
  onClose: jest.fn(),
  onCopy: jest.fn(),
};

describe('ResultPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering states', () => {
    it('renders loading state', () => {
      render(<ResultPanel {...defaultProps} isLoading={true} />);
      
      // Component shows "Processing your request..." when loading
      expect(screen.getByText(/Processing your request/i)).toBeInTheDocument();
    });

    it('renders error state', () => {
      render(<ResultPanel {...defaultProps} error="Network timeout" />);
      
      // Component shows "Something went wrong" header and the actual error
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/Network timeout/i)).toBeInTheDocument();
    });

    it('renders result content', () => {
      render(<ResultPanel {...defaultProps} result="This is the result" />);
      
      expect(screen.getByText(/This is the result/i)).toBeInTheDocument();
    });

    it('renders streaming content', () => {
      render(
        <ResultPanel 
          {...defaultProps} 
          streamingResult="Streaming text here" 
          isStreaming={true} 
        />
      );
      
      expect(screen.getByText(/Streaming text here/i)).toBeInTheDocument();
    });

    it('renders component when no content', () => {
      const { container } = render(<ResultPanel {...defaultProps} />);
      
      // Component should still render even without content
      expect(container).toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('calls onRetry when retry button clicked on error', () => {
      const onRetry = jest.fn();
      render(<ResultPanel {...defaultProps} error="Error occurred" onRetry={onRetry} />);
      
      // Button shows "Try again" text
      const retryButton = screen.getByText(/Try again/i);
      fireEvent.click(retryButton);
      
      expect(onRetry).toHaveBeenCalled();
    });

    it('copies content and calls onCopy', async () => {
      const onCopy = jest.fn();
      render(<ResultPanel {...defaultProps} result="Copy me" onCopy={onCopy} />);

      const copyButton = screen.getByTitle('Copy (Ctrl+C)');
      fireEvent.click(copyButton);

      expect(mockWriteText).toHaveBeenCalledWith('Copy me');
      expect(onCopy).toHaveBeenCalled();
    });
  });

  describe('action info', () => {
    it('displays action label for active action', () => {
      render(<ResultPanel {...defaultProps} result="Result" activeAction="explain" />);
      
      expect(screen.getByText(/Explanation/i)).toBeInTheDocument();
    });

    it('displays translate action label', () => {
      render(<ResultPanel {...defaultProps} result="Result" activeAction="translate" />);
      
      expect(screen.getByText(/Translation/i)).toBeInTheDocument();
    });
  });

  describe('content priority', () => {
    it('shows result content when available', () => {
      render(
        <ResultPanel 
          {...defaultProps}
          result="Final result text here" 
          streamingResult={null}
          isStreaming={false} 
        />
      );
      
      expect(screen.getByText(/Final result text here/i)).toBeInTheDocument();
    });

    it('shows streaming when result is null', () => {
      render(
        <ResultPanel 
          {...defaultProps}
          result={null} 
          streamingResult="Streaming content text" 
          isStreaming={true} 
        />
      );
      
      expect(screen.getByText(/Streaming content text/i)).toBeInTheDocument();
    });
  });

  describe('component structure', () => {
    it('renders without crashing', () => {
      const { container } = render(<ResultPanel {...defaultProps} result="Content" />);
      expect(container).toBeInTheDocument();
    });

    it('renders with all props provided', () => {
      const { container } = render(
        <ResultPanel 
          {...defaultProps}
          result="Test result"
          error={null}
          isLoading={false}
          isStreaming={false}
          activeAction="explain"
          onRetry={() => {}}
          onSendToChat={() => {}}
          onFeedback={() => {}}
        />
      );
      expect(container).toBeInTheDocument();
    });

    it('collapses and expands the panel', () => {
      render(<ResultPanel {...defaultProps} result="Visible content" />);

      const toggle = screen.getByTitle('Collapse panel');
      fireEvent.click(toggle);
      expect(screen.queryByText('Visible content')).not.toBeInTheDocument();

      const expand = screen.getByTitle('Expand panel');
      fireEvent.click(expand);
      expect(screen.getByText('Visible content')).toBeInTheDocument();
    });
  });
});
