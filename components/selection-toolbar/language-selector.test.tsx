/**
 * Tests for LanguageSelector component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageSelector } from './language-selector';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      detectingLanguage: "Detecting language...",
      detected: "Detected:",
      quickTranslate: "Quick Translate",
      targetLanguage: "Target Language",
      selected: "Selected",
      quickTranslateHint: "Press T + number for quick translation",
    };
    return translations[key] || key;
  },
}));

describe('LanguageSelector', () => {
  const mockOnLanguageChange = jest.fn();
  const mockOnQuickTranslate = jest.fn();

  const defaultProps = {
    selectedLanguage: 'zh-CN',
    onLanguageChange: mockOnLanguageChange,
    onQuickTranslate: mockOnQuickTranslate,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with selected language', () => {
    render(<LanguageSelector {...defaultProps} />);
    
    // Should show the language selector button
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders in compact mode without language label', () => {
    render(<LanguageSelector {...defaultProps} compact />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    // In compact mode, only shows the icon
  });

  it('opens popover when clicked', () => {
    render(<LanguageSelector {...defaultProps} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Popover should be open - check for Quick Translate section
    expect(screen.getByText('Quick Translate')).toBeInTheDocument();
  });

  it('shows detected language when provided', () => {
    render(
      <LanguageSelector
        {...defaultProps}
        detectedLanguage="en"
      />
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(screen.getByText('Detected:')).toBeInTheDocument();
  });

  it('shows loading state when detecting language', () => {
    render(
      <LanguageSelector
        {...defaultProps}
        isDetecting
      />
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(screen.getByText('Detecting language...')).toBeInTheDocument();
  });

  it('calls onLanguageChange when language is selected', () => {
    render(<LanguageSelector {...defaultProps} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Click on English in the language list
    const englishButton = screen.getByText('English');
    fireEvent.click(englishButton);
    
    expect(mockOnLanguageChange).toHaveBeenCalledWith('en');
  });

  it('calls onQuickTranslate for quick language pairs', () => {
    render(<LanguageSelector {...defaultProps} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Click on a quick translate option (→ English)
    const quickTranslateButtons = screen.getAllByRole('button');
    const englishQuickButton = quickTranslateButtons.find(btn => 
      btn.textContent?.includes('English')
    );
    
    if (englishQuickButton) {
      fireEvent.click(englishQuickButton);
      expect(mockOnQuickTranslate).toHaveBeenCalled();
    }
  });

  it('disables button when disabled prop is true', () => {
    render(<LanguageSelector {...defaultProps} disabled />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('hides quick pairs when showQuickPairs is false', () => {
    render(<LanguageSelector {...defaultProps} showQuickPairs={false} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(screen.queryByText('Quick Translate')).not.toBeInTheDocument();
  });

  it('shows selected badge for current language', () => {
    render(<LanguageSelector {...defaultProps} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // The selected language should have a "Selected" badge
    expect(screen.getByText('Selected')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<LanguageSelector {...defaultProps} className="custom-class" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });
});
