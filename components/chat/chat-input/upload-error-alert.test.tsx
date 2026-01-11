/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UploadErrorAlert } from './upload-error-alert';

// Mock UI components
jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <h5>{children}</h5>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

describe('UploadErrorAlert', () => {
  const defaultProps = {
    message: 'File too large. Maximum size is 10MB.',
    onDismiss: jest.fn(),
    dismissLabel: 'Dismiss',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders error message', () => {
    render(<UploadErrorAlert {...defaultProps} />);
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(defaultProps.message)).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    render(<UploadErrorAlert {...defaultProps} />);
    
    const dismissButton = screen.getByRole('button');
    fireEvent.click(dismissButton);
    
    expect(defaultProps.onDismiss).toHaveBeenCalled();
  });

  it('displays dismiss label', () => {
    render(<UploadErrorAlert {...defaultProps} />);
    
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('renders with custom dismiss label', () => {
    render(<UploadErrorAlert {...defaultProps} dismissLabel="Close" />);
    
    expect(screen.getByText('Close')).toBeInTheDocument();
  });
});
