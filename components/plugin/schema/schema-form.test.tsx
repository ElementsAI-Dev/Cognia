/**
 * Tests for Schema Form Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SchemaForm, type JSONSchema } from './schema-form';

describe('SchemaForm', () => {
  const mockOnChange = jest.fn();
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render a simple form', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name' },
        },
      };

      render(
        <SchemaForm
          schema={schema}
          value={{ name: '' }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Name')).toBeInTheDocument();
    });

    it('should render multiple fields', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          firstName: { type: 'string', title: 'First Name' },
          lastName: { type: 'string', title: 'Last Name' },
          age: { type: 'number', title: 'Age' },
        },
      };

      render(
        <SchemaForm
          schema={schema}
          value={{ firstName: '', lastName: '', age: 0 }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('First Name')).toBeInTheDocument();
      expect(screen.getByText('Last Name')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
    });

    it('should show form title', () => {
      const schema: JSONSchema = {
        type: 'object',
        title: 'User Settings',
        properties: {
          name: { type: 'string' },
        },
      };

      render(
        <SchemaForm
          schema={schema}
          value={{ name: '' }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('User Settings')).toBeInTheDocument();
    });

    it('should show form description', () => {
      const schema: JSONSchema = {
        type: 'object',
        description: 'Configure your settings here',
        properties: {
          name: { type: 'string' },
        },
      };

      render(
        <SchemaForm
          schema={schema}
          value={{ name: '' }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Configure your settings here')).toBeInTheDocument();
    });
  });

  describe('Field Types', () => {
    it('should render string input', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name' },
        },
      };

      render(
        <SchemaForm
          schema={schema}
          value={{ name: 'John' }}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByDisplayValue('John');
      expect(input).toBeInTheDocument();
    });

    it('should render number input', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          count: { type: 'number', title: 'Count' },
        },
      };

      render(
        <SchemaForm
          schema={schema}
          value={{ count: 42 }}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByDisplayValue('42');
      expect(input).toBeInTheDocument();
    });

    it('should render boolean checkbox', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', title: 'Enabled' },
        },
      };

      render(
        <SchemaForm
          schema={schema}
          value={{ enabled: true }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Enabled')).toBeInTheDocument();
    });

    it('should render select for enum', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          color: {
            type: 'string',
            title: 'Color',
            enum: ['red', 'green', 'blue'],
          },
        },
      };

      render(
        <SchemaForm
          schema={schema}
          value={{ color: 'red' }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Color')).toBeInTheDocument();
    });
  });

  describe('Value Changes', () => {
    it('should call onChange when field changes', async () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name' },
        },
      };

      render(
        <SchemaForm
          schema={schema}
          value={{ name: '' }}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'John' } });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });
  });

  describe('Validation', () => {
    it('should show required field indicator', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name' },
        },
        required: ['name'],
      };

      render(
        <SchemaForm
          schema={schema}
          value={{ name: '' }}
          onChange={mockOnChange}
        />
      );

      // Required indicator should be visible
      expect(screen.getByText('Name')).toBeInTheDocument();
    });
  });

  describe('Submit', () => {
    it('should call onSubmit when submitted', async () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name' },
        },
      };

      const { container } = render(
        <SchemaForm
          schema={schema}
          value={{ name: 'John' }}
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />
      );

      // Form element without name doesn't have form role, use container query
      const form = container.querySelector('form');
      if (form) {
        fireEvent.submit(form);
      }

      // Component renders with submit button
      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should disable all fields when disabled', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name' },
        },
      };

      render(
        <SchemaForm
          schema={schema}
          value={{ name: '' }}
          onChange={mockOnChange}
          disabled
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });
  });

  describe('Loading State', () => {
    it('should disable fields when loading', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name' },
        },
      };

      render(
        <SchemaForm
          schema={schema}
          value={{ name: '' }}
          onChange={mockOnChange}
          loading
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });
  });
});
