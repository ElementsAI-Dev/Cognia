'use client';

/**
 * Plugin Schema Form
 * 
 * Dynamically renders a configuration form based on JSON Schema.
 */

import React, { useCallback, useMemo } from 'react';
import { SchemaField } from './schema-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, RotateCcw } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface JSONSchema {
  type: 'object' | 'string' | 'number' | 'integer' | 'boolean' | 'array';
  title?: string;
  description?: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  default?: unknown;
  enum?: unknown[];
  enumNames?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  items?: JSONSchema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  oneOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  allOf?: JSONSchema[];
  $ref?: string;
  definitions?: Record<string, JSONSchema>;
}

export interface SchemaFormProps {
  schema: JSONSchema;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  onSubmit?: (value: Record<string, unknown>) => void | Promise<void>;
  onReset?: () => void;
  disabled?: boolean;
  loading?: boolean;
  errors?: Record<string, string>;
  showSubmit?: boolean;
  showReset?: boolean;
  submitLabel?: string;
  resetLabel?: string;
  className?: string;
}

// =============================================================================
// Schema Form Component
// =============================================================================

export function SchemaForm({
  schema,
  value,
  onChange,
  onSubmit,
  onReset,
  disabled = false,
  loading = false,
  errors = {},
  showSubmit = true,
  showReset = true,
  submitLabel = 'Save',
  resetLabel = 'Reset',
  className = '',
}: SchemaFormProps) {
  const properties = useMemo(() => {
    if (schema.type !== 'object' || !schema.properties) {
      return [];
    }

    return Object.entries(schema.properties).map(([key, propSchema]) => ({
      key,
      schema: propSchema,
      required: schema.required?.includes(key) || false,
    }));
  }, [schema]);

  const handleFieldChange = useCallback(
    (fieldKey: string, fieldValue: unknown) => {
      onChange({
        ...value,
        [fieldKey]: fieldValue,
      });
    },
    [value, onChange]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (onSubmit) {
        await onSubmit(value);
      }
    },
    [value, onSubmit]
  );

  const handleReset = useCallback(() => {
    if (onReset) {
      onReset();
    } else {
      // Reset to defaults
      const defaults: Record<string, unknown> = {};
      for (const { key, schema: propSchema } of properties) {
        if (propSchema.default !== undefined) {
          defaults[key] = propSchema.default;
        }
      }
      onChange(defaults);
    }
  }, [onReset, properties, onChange]);

  const hasErrors = Object.keys(errors).length > 0;

  if (schema.type !== 'object') {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Schema must be of type &quot;object&quot; at the root level.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <Card>
        {(schema.title || schema.description) && (
          <CardHeader>
            {schema.title && <CardTitle>{schema.title}</CardTitle>}
            {schema.description && (
              <CardDescription>{schema.description}</CardDescription>
            )}
          </CardHeader>
        )}

        <CardContent className="space-y-4">
          {properties.map(({ key, schema: propSchema, required }) => (
            <SchemaField
              key={key}
              name={key}
              schema={propSchema}
              value={value[key]}
              onChange={(v: unknown) => handleFieldChange(key, v)}
              required={required}
              disabled={disabled || loading}
              error={errors[key]}
            />
          ))}

          {hasErrors && (
            <Alert variant="destructive">
              <AlertDescription>
                Please fix the errors above before saving.
              </AlertDescription>
            </Alert>
          )}

          {(showSubmit || showReset) && (
            <div className="flex gap-2 pt-4">
              {showSubmit && (
                <Button type="submit" disabled={disabled || loading || hasErrors}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {submitLabel}
                    </>
                  )}
                </Button>
              )}

              {showReset && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={disabled || loading}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {resetLabel}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </form>
  );
}

// =============================================================================
// Validation Helper
// =============================================================================

export function validateAgainstSchema(
  value: Record<string, unknown>,
  schema: JSONSchema
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (schema.type !== 'object' || !schema.properties) {
    return errors;
  }

  // Check required fields
  if (schema.required) {
    for (const key of schema.required) {
      if (value[key] === undefined || value[key] === null || value[key] === '') {
        errors[key] = 'This field is required';
      }
    }
  }

  // Validate each property
  for (const [key, propSchema] of Object.entries(schema.properties)) {
    const propValue = value[key];
    const error = validateField(propValue, propSchema);
    if (error) {
      errors[key] = error;
    }
  }

  return errors;
}

function validateField(value: unknown, schema: JSONSchema): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  switch (schema.type) {
    case 'string': {
      const strValue = value as string;
      if (schema.minLength !== undefined && strValue.length < schema.minLength) {
        return `Minimum length is ${schema.minLength}`;
      }
      if (schema.maxLength !== undefined && strValue.length > schema.maxLength) {
        return `Maximum length is ${schema.maxLength}`;
      }
      if (schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(strValue)) {
          return 'Invalid format';
        }
      }
      if (schema.enum && !schema.enum.includes(strValue)) {
        return 'Invalid value';
      }
      break;
    }

    case 'number':
    case 'integer': {
      const numValue = value as number;
      if (schema.type === 'integer' && !Number.isInteger(numValue)) {
        return 'Must be an integer';
      }
      if (schema.minimum !== undefined && numValue < schema.minimum) {
        return `Minimum value is ${schema.minimum}`;
      }
      if (schema.maximum !== undefined && numValue > schema.maximum) {
        return `Maximum value is ${schema.maximum}`;
      }
      break;
    }

    case 'array': {
      const arrValue = value as unknown[];
      if (schema.minItems !== undefined && arrValue.length < schema.minItems) {
        return `Minimum ${schema.minItems} items required`;
      }
      if (schema.maxItems !== undefined && arrValue.length > schema.maxItems) {
        return `Maximum ${schema.maxItems} items allowed`;
      }
      break;
    }
  }

  return null;
}

// =============================================================================
// Default Export
// =============================================================================

export default SchemaForm;
