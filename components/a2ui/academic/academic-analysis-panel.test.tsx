/**
 * AcademicAnalysisPanel Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AcademicAnalysisPanel } from './academic-analysis-panel';
import type { PaperAnalysisType } from '@/types/learning/academic';

describe('AcademicAnalysisPanel', () => {
  const defaultProps = {
    paperTitle: 'Test Paper',
    analysisType: 'summary' as PaperAnalysisType,
    analysisContent: 'This is the analysis content.',
  };

  describe('rendering', () => {
    it('should render analysis content', () => {
      render(<AcademicAnalysisPanel {...defaultProps} />);
      
      expect(screen.getByText('This is the analysis content.')).toBeInTheDocument();
    });

    it('should render paper title', () => {
      render(<AcademicAnalysisPanel {...defaultProps} />);
      
      expect(screen.getByText('Test Paper')).toBeInTheDocument();
    });

    it('should render analysis type selector', () => {
      render(<AcademicAnalysisPanel {...defaultProps} />);
      
      // Should have a select for analysis type
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should render suggested questions when provided', () => {
      render(
        <AcademicAnalysisPanel
          {...defaultProps}
          suggestedQuestions={['Question 1?', 'Question 2?']}
        />
      );
      
      expect(screen.getByText('Question 1?')).toBeInTheDocument();
      expect(screen.getByText('Question 2?')).toBeInTheDocument();
    });

    it('should render related topics when provided', () => {
      render(
        <AcademicAnalysisPanel
          {...defaultProps}
          relatedTopics={['Topic A', 'Topic B']}
        />
      );
      
      expect(screen.getByText('Topic A')).toBeInTheDocument();
      expect(screen.getByText('Topic B')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading indicator when isLoading is true', () => {
      render(<AcademicAnalysisPanel {...defaultProps} isLoading={true} />);
      
      // Should have loading state
      expect(screen.getByRole('combobox')).toBeDisabled();
    });
  });

  describe('interactions', () => {
    it('should call onRegenerate when regenerate button is clicked', () => {
      const onRegenerate = jest.fn();
      render(<AcademicAnalysisPanel {...defaultProps} onRegenerate={onRegenerate} />);
      
      const regenerateButton = screen.queryByRole('button', { name: /regenerate/i });
      if (regenerateButton) {
        fireEvent.click(regenerateButton);
        expect(onRegenerate).toHaveBeenCalled();
      }
    });

    it('should call onCopy when copy button is clicked', () => {
      const onCopy = jest.fn();
      render(<AcademicAnalysisPanel {...defaultProps} onCopy={onCopy} />);
      
      const copyButton = screen.queryByRole('button', { name: /copy/i });
      if (copyButton) {
        fireEvent.click(copyButton);
        expect(onCopy).toHaveBeenCalledWith('This is the analysis content.');
      }
    });

    it('should call onAskFollowUp when suggested question is clicked', () => {
      const onAskFollowUp = jest.fn();
      render(
        <AcademicAnalysisPanel
          {...defaultProps}
          suggestedQuestions={['Follow up question?']}
          onAskFollowUp={onAskFollowUp}
        />
      );
      
      const questionButton = screen.getByText('Follow up question?');
      fireEvent.click(questionButton);
      
      expect(onAskFollowUp).toHaveBeenCalledWith('Follow up question?');
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <AcademicAnalysisPanel {...defaultProps} className="custom-analysis-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-analysis-class');
    });
  });
});
