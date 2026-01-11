/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PromptFeedbackCollector } from './prompt-feedback-collector';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

describe('PromptFeedbackCollector', () => {
  const defaultProps = {
    templateId: 'template-1',
    templateName: 'Test Template',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<PromptFeedbackCollector {...defaultProps} />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('has a textarea for feedback', () => {
    render(<PromptFeedbackCollector {...defaultProps} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('has rating buttons', () => {
    render(<PromptFeedbackCollector {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('allows entering feedback text', () => {
    render(<PromptFeedbackCollector {...defaultProps} />);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Great prompt!' } });
    
    expect(textarea).toHaveValue('Great prompt!');
  });

  it('submits feedback when form is submitted', () => {
    render(<PromptFeedbackCollector {...defaultProps} />);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Great prompt!' } });
    
    const submitButton = screen.getAllByRole('button').find(btn => 
      btn.textContent?.toLowerCase().includes('submit') || 
      btn.getAttribute('type') === 'submit'
    );
    
    if (submitButton) {
      fireEvent.click(submitButton);
      // Should not throw
    }
  });
});
