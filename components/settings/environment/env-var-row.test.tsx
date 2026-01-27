'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EnvVarRow } from './env-var-row';

jest.mock('@/components/ui/table', () => ({
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <td className={className}>{children}</td>
  ),
}));

describe('EnvVarRow', () => {
  const mockOnUpdate = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders variable name', () => {
    render(
      <table>
        <tbody>
          <EnvVarRow
            name="TEST_VAR"
            value="test_value"
            onUpdate={mockOnUpdate}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );
    expect(screen.getByText('TEST_VAR')).toBeInTheDocument();
  });

  it('renders variable value', () => {
    render(
      <table>
        <tbody>
          <EnvVarRow
            name="TEST_VAR"
            value="test_value"
            onUpdate={mockOnUpdate}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );
    expect(screen.getByText('test_value')).toBeInTheDocument();
  });

  it('renders edit button', () => {
    render(
      <table>
        <tbody>
          <EnvVarRow
            name="TEST_VAR"
            value="test_value"
            onUpdate={mockOnUpdate}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(2);
  });

  it('shows input when editing', () => {
    render(
      <table>
        <tbody>
          <EnvVarRow
            name="TEST_VAR"
            value="test_value"
            onUpdate={mockOnUpdate}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );
    const editBtn = screen.getAllByRole('button')[0];
    fireEvent.click(editBtn);
    expect(screen.getByDisplayValue('test_value')).toBeInTheDocument();
  });

  it('calls onUpdate when saving', () => {
    render(
      <table>
        <tbody>
          <EnvVarRow
            name="TEST_VAR"
            value="test_value"
            onUpdate={mockOnUpdate}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );
    const editBtn = screen.getAllByRole('button')[0];
    fireEvent.click(editBtn);
    const input = screen.getByDisplayValue('test_value');
    fireEvent.change(input, { target: { value: 'new_value' } });
    const saveBtn = screen.getAllByRole('button')[0];
    fireEvent.click(saveBtn);
    expect(mockOnUpdate).toHaveBeenCalledWith('TEST_VAR', 'new_value');
  });

  it('calls onDelete when delete clicked', () => {
    render(
      <table>
        <tbody>
          <EnvVarRow
            name="TEST_VAR"
            value="test_value"
            onUpdate={mockOnUpdate}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );
    const deleteBtn = screen.getAllByRole('button')[1];
    fireEvent.click(deleteBtn);
    expect(mockOnDelete).toHaveBeenCalled();
  });

  it('saves on Enter key', () => {
    render(
      <table>
        <tbody>
          <EnvVarRow
            name="TEST_VAR"
            value="test_value"
            onUpdate={mockOnUpdate}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );
    const editBtn = screen.getAllByRole('button')[0];
    fireEvent.click(editBtn);
    const input = screen.getByDisplayValue('test_value');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockOnUpdate).toHaveBeenCalled();
  });
});
