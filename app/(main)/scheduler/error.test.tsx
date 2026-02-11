/**
 * SchedulerError Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import SchedulerError from './error';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('SchedulerError', () => {
  const mockReset = jest.fn();
  const mockError = new Error('Test error message');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('should render error title', () => {
    render(<SchedulerError error={mockError} reset={mockReset} />);

    expect(screen.getByText('errorTitle')).toBeInTheDocument();
  });

  it('should render error description', () => {
    render(<SchedulerError error={mockError} reset={mockReset} />);

    expect(screen.getByText('errorDescription')).toBeInTheDocument();
  });

  it('should display error message', () => {
    render(<SchedulerError error={mockError} reset={mockReset} />);

    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('should not display error message when empty', () => {
    const emptyError = new Error('');
    render(<SchedulerError error={emptyError} reset={mockReset} />);

    // Should not render the pre element for empty messages
    const preTag = document.querySelector('pre');
    expect(preTag).not.toBeInTheDocument();
  });

  it('should render retry button', () => {
    render(<SchedulerError error={mockError} reset={mockReset} />);

    expect(screen.getByText('retry')).toBeInTheDocument();
  });

  it('should call reset when retry button is clicked', () => {
    render(<SchedulerError error={mockError} reset={mockReset} />);

    fireEvent.click(screen.getByText('retry'));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('should log error to console', () => {
    render(<SchedulerError error={mockError} reset={mockReset} />);

    expect(console.error).toHaveBeenCalledWith('[Scheduler] Page error:', mockError);
  });

  it('should render error icon', () => {
    const { container } = render(<SchedulerError error={mockError} reset={mockReset} />);

    const iconContainer = container.querySelector('.bg-destructive\\/10');
    expect(iconContainer).toBeInTheDocument();
  });
});
