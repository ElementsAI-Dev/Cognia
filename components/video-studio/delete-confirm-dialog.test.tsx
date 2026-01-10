import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteConfirmDialog } from './delete-confirm-dialog';

describe('DeleteConfirmDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    onConfirm: jest.fn(),
    isLoading: false,
    title: 'Delete Recording',
    description: 'Are you sure you want to delete this recording?',
    cancelText: 'Cancel',
    deleteText: 'Delete',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dialog when open', () => {
    render(<DeleteConfirmDialog {...defaultProps} />);
    
    expect(screen.getByText('Delete Recording')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this recording?')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<DeleteConfirmDialog {...defaultProps} open={false} />);
    
    expect(screen.queryByText('Delete Recording')).not.toBeInTheDocument();
  });

  it('renders cancel and delete buttons', () => {
    render(<DeleteConfirmDialog {...defaultProps} />);
    
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls onOpenChange when cancel is clicked', () => {
    render(<DeleteConfirmDialog {...defaultProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onConfirm when delete is clicked', () => {
    render(<DeleteConfirmDialog {...defaultProps} />);
    
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    
    expect(defaultProps.onConfirm).toHaveBeenCalled();
  });

  it('disables delete button when loading', () => {
    render(<DeleteConfirmDialog {...defaultProps} isLoading={true} />);
    
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    expect(deleteButton).toBeDisabled();
  });

  it('shows loading spinner when loading', () => {
    render(<DeleteConfirmDialog {...defaultProps} isLoading={true} />);
    
    // Check for animate-spin class indicating loading (dialog renders in portal)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('uses custom button text', () => {
    render(
      <DeleteConfirmDialog
        {...defaultProps}
        cancelText="Nevermind"
        deleteText="Yes, Delete"
      />
    );
    
    expect(screen.getByText('Nevermind')).toBeInTheDocument();
    expect(screen.getByText('Yes, Delete')).toBeInTheDocument();
  });

  it('uses custom title and description', () => {
    render(
      <DeleteConfirmDialog
        {...defaultProps}
        title="Custom Title"
        description="Custom description text"
      />
    );
    
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom description text')).toBeInTheDocument();
  });
});
