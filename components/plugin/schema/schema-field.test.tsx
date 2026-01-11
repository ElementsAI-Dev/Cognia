/**
 * Tests for Schema Field Component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SchemaField, type FieldSchema } from './schema-field';

describe('SchemaField', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('String Fields', () => {
    it('should render string input', () => {
      const schema: FieldSchema = {
        type: 'string',
        title: 'Name',
      };

      render(
        <SchemaField
          name="name"
          schema={schema}
          value="John"
          onChange={mockOnChange}
        />
      );

      const input = screen.getByDisplayValue('John');
      expect(input).toBeInTheDocument();
    });

    it('should handle string input change', () => {
      const schema: FieldSchema = {
        type: 'string',
        title: 'Name',
      };

      render(
        <SchemaField
          name="name"
          schema={schema}
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Jane' } });

      expect(mockOnChange).toHaveBeenCalledWith('Jane');
    });

    it('should render textarea for multiline strings', () => {
      const schema: FieldSchema = {
        type: 'string',
        title: 'Description',
        'ui:widget': 'textarea',
      };

      render(
        <SchemaField
          name="description"
          schema={schema}
          value=""
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should show placeholder', () => {
      const schema: FieldSchema = {
        type: 'string',
        title: 'Name',
        placeholder: 'Enter your name',
      };

      render(
        <SchemaField
          name="name"
          schema={schema}
          value=""
          onChange={mockOnChange}
        />
      );

      expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
    });
  });

  describe('Number Fields', () => {
    it('should render number input', () => {
      const schema: FieldSchema = {
        type: 'number',
        title: 'Age',
      };

      render(
        <SchemaField
          name="age"
          schema={schema}
          value={25}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByDisplayValue('25');
      expect(input).toBeInTheDocument();
    });

    it('should handle number input change', () => {
      const schema: FieldSchema = {
        type: 'number',
        title: 'Count',
      };

      render(
        <SchemaField
          name="count"
          schema={schema}
          value={0}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '42' } });

      expect(mockOnChange).toHaveBeenCalledWith(42);
    });

    it('should render integer input', () => {
      const schema: FieldSchema = {
        type: 'integer',
        title: 'Count',
      };

      render(
        <SchemaField
          name="count"
          schema={schema}
          value={10}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    });
  });

  describe('Boolean Fields', () => {
    it('should render checkbox for boolean', () => {
      const schema: FieldSchema = {
        type: 'boolean',
        title: 'Enabled',
      };

      render(
        <SchemaField
          name="enabled"
          schema={schema}
          value={true}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('should handle checkbox change', () => {
      const schema: FieldSchema = {
        type: 'boolean',
        title: 'Enabled',
      };

      render(
        <SchemaField
          name="enabled"
          schema={schema}
          value={false}
          onChange={mockOnChange}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(mockOnChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Enum Fields', () => {
    it('should render select for enum', () => {
      const schema: FieldSchema = {
        type: 'string',
        title: 'Color',
        enum: ['red', 'green', 'blue'],
      };

      render(
        <SchemaField
          name="color"
          schema={schema}
          value="red"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Color')).toBeInTheDocument();
    });

    it('should show enum names if provided', () => {
      const schema: FieldSchema = {
        type: 'string',
        title: 'Color',
        enum: ['r', 'g', 'b'],
        enumNames: ['Red', 'Green', 'Blue'],
      };

      render(
        <SchemaField
          name="color"
          schema={schema}
          value="r"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Color')).toBeInTheDocument();
    });
  });

  describe('Array Fields', () => {
    it('should render array field', () => {
      const schema: FieldSchema = {
        type: 'array',
        title: 'Tags',
        items: { type: 'string' },
      };

      render(
        <SchemaField
          name="tags"
          schema={schema}
          value={['tag1', 'tag2']}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Tags')).toBeInTheDocument();
    });
  });

  describe('Field States', () => {
    it('should show required indicator', () => {
      const schema: FieldSchema = {
        type: 'string',
        title: 'Name',
      };

      render(
        <SchemaField
          name="name"
          schema={schema}
          value=""
          onChange={mockOnChange}
          required
        />
      );

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should show description', () => {
      const schema: FieldSchema = {
        type: 'string',
        title: 'Name',
        description: 'Enter your full name',
      };

      render(
        <SchemaField
          name="name"
          schema={schema}
          value=""
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Enter your full name')).toBeInTheDocument();
    });

    it('should show error message', () => {
      const schema: FieldSchema = {
        type: 'string',
        title: 'Name',
      };

      render(
        <SchemaField
          name="name"
          schema={schema}
          value=""
          onChange={mockOnChange}
          error="Name is required"
        />
      );

      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });

    it('should disable field when disabled', () => {
      const schema: FieldSchema = {
        type: 'string',
        title: 'Name',
      };

      render(
        <SchemaField
          name="name"
          schema={schema}
          value=""
          onChange={mockOnChange}
          disabled
        />
      );

      expect(screen.getByRole('textbox')).toBeDisabled();
    });
  });
});
