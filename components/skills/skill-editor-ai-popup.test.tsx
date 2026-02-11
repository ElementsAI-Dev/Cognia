/**
 * Tests for SkillEditorAIPopup component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { SkillEditorAIPopup } from './skill-editor-ai-popup';
import type { OptimizeMode } from './skill-editor-ai-popup';

describe('SkillEditorAIPopup', () => {
  const defaultProps = {
    position: { top: 100, left: 200 },
    isOptimizing: false,
    optimizedText: '',
    optimizeMode: null as OptimizeMode | null,
    onOptimize: jest.fn(),
    onApply: jest.fn(),
    onRetry: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders quick action buttons when no mode selected', () => {
    render(<SkillEditorAIPopup {...defaultProps} />);
    // Should have the AI optimize header
    const buttons = screen.getAllByRole('button');
    // At least close button + 6 quick actions + 3 styles + custom submit = 11 buttons
    expect(buttons.length).toBeGreaterThanOrEqual(10);
  });

  it('calls onClose when close button clicked', () => {
    render(<SkillEditorAIPopup {...defaultProps} />);
    // The close button is the first one in the header (X icon)
    const closeBtn = screen.getAllByRole('button')[0];
    fireEvent.click(closeBtn);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onOptimize with correct mode when quick action clicked', () => {
    const onOptimize = jest.fn();
    render(<SkillEditorAIPopup {...defaultProps} onOptimize={onOptimize} />);
    // Click the first quick action button (improve)
    const buttons = screen.getAllByRole('button');
    // Skip close button (index 0), first quick action is index 1
    fireEvent.click(buttons[1]);
    expect(onOptimize).toHaveBeenCalledWith('improve');
  });

  it('shows loading spinner when optimizing', () => {
    render(<SkillEditorAIPopup {...defaultProps} isOptimizing={true} />);
    // Should not show the quick actions anymore
    const buttons = screen.getAllByRole('button');
    // Only close button should be visible when optimizing
    expect(buttons.length).toBeLessThan(5);
  });

  it('shows result with apply/retry buttons when optimized text available', () => {
    render(
      <SkillEditorAIPopup
        {...defaultProps}
        optimizedText="Optimized content here"
        optimizeMode="improve"
      />
    );
    expect(screen.getByText('Optimized content here')).toBeInTheDocument();
    // Should have apply and retry buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('calls onApply when apply button clicked', () => {
    const onApply = jest.fn();
    render(
      <SkillEditorAIPopup
        {...defaultProps}
        optimizedText="Optimized content"
        optimizeMode="improve"
        onApply={onApply}
      />
    );
    // Find the apply button
    const buttons = screen.getAllByRole('button');
    const applyBtn = buttons.find((b) => {
      const text = b.textContent?.toLowerCase() || '';
      return text.includes('apply') || text.includes('应用');
    });
    if (applyBtn) fireEvent.click(applyBtn);
    expect(onApply).toHaveBeenCalled();
  });

  it('calls onRetry when retry button clicked', () => {
    const onRetry = jest.fn();
    render(
      <SkillEditorAIPopup
        {...defaultProps}
        optimizedText="Optimized content"
        optimizeMode="improve"
        onRetry={onRetry}
      />
    );
    const buttons = screen.getAllByRole('button');
    const retryBtn = buttons.find((b) => {
      const text = b.textContent?.toLowerCase() || '';
      return text.includes('retry') || text.includes('重试');
    });
    if (retryBtn) fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalled();
  });

  it('positions popup at specified coordinates', () => {
    const { container } = render(
      <SkillEditorAIPopup {...defaultProps} position={{ top: 50, left: 100 }} />
    );
    const popup = container.querySelector('.ai-popup');
    expect(popup).toHaveStyle({ top: '50px', left: '100px' });
  });
});
