'use client';

/**
 * Schema Field Component
 * 
 * Renders individual form fields based on JSON Schema type.
 */

import React, { useCallback, useId } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface FieldSchema {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  enumNames?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  pattern?: string;
  format?: string;
  items?: FieldSchema;
  properties?: Record<string, FieldSchema>;
  required?: string[];
  placeholder?: string;
  'ui:widget'?: string;
  'ui:options'?: Record<string, unknown>;
}

export interface SchemaFieldProps {
  name: string;
  schema: FieldSchema;
  value: unknown;
  onChange: (value: unknown) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

// =============================================================================
// Schema Field Component
// =============================================================================

export function SchemaField({
  name,
  schema,
  value,
  onChange,
  required = false,
  disabled = false,
  error,
  className,
}: SchemaFieldProps) {
  const id = useId();
  const fieldId = `${id}-${name}`;

  const label = schema.title || formatLabel(name);
  const description = schema.description;

  const renderField = () => {
    // Check for custom widget
    const widget = schema['ui:widget'];
    if (widget) {
      return renderCustomWidget(widget, schema, value, onChange, disabled, fieldId);
    }

    // Render based on type
    switch (schema.type) {
      case 'string':
        return renderStringField(schema, value, onChange, disabled, fieldId);

      case 'number':
      case 'integer':
        return renderNumberField(schema, value, onChange, disabled, fieldId);

      case 'boolean':
        return renderBooleanField(schema, value, onChange, disabled, fieldId);

      case 'array':
        return renderArrayField(schema, value, onChange, disabled, fieldId);

      case 'object':
        return renderObjectField(schema, value, onChange, disabled);

      default:
        return (
          <Input
            id={fieldId}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
        );
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <Label htmlFor={fieldId} className={cn(required && 'after:content-["*"] after:ml-0.5 after:text-red-500')}>
          {label}
        </Label>
      </div>

      {renderField()}

      {description && !error && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// =============================================================================
// Field Renderers
// =============================================================================

function renderStringField(
  schema: FieldSchema,
  value: unknown,
  onChange: (value: unknown) => void,
  disabled: boolean,
  fieldId: string
) {
  const strValue = (value as string) ?? '';

  // Enum -> Select
  if (schema.enum) {
    return (
      <Select
        value={strValue}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger id={fieldId}>
          <SelectValue placeholder={schema.placeholder || 'Select...'} />
        </SelectTrigger>
        <SelectContent>
          {schema.enum.map((option, index) => (
            <SelectItem key={String(option)} value={String(option)}>
              {schema.enumNames?.[index] || String(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Format-based rendering
  switch (schema.format) {
    case 'textarea':
    case 'text':
      return (
        <Textarea
          id={fieldId}
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={schema.placeholder}
          minLength={schema.minLength}
          maxLength={schema.maxLength}
        />
      );

    case 'password':
      return (
        <Input
          id={fieldId}
          type="password"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={schema.placeholder}
        />
      );

    case 'email':
      return (
        <Input
          id={fieldId}
          type="email"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={schema.placeholder}
        />
      );

    case 'uri':
    case 'url':
      return (
        <Input
          id={fieldId}
          type="url"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={schema.placeholder || 'https://'}
        />
      );

    case 'date':
      return (
        <Input
          id={fieldId}
          type="date"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );

    case 'time':
      return (
        <Input
          id={fieldId}
          type="time"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );

    case 'datetime':
    case 'date-time':
      return (
        <Input
          id={fieldId}
          type="datetime-local"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );

    case 'color':
      return (
        <div className="flex items-center gap-2">
          <Input
            id={fieldId}
            type="color"
            value={strValue || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="h-10 w-20 p-1"
          />
          <Input
            value={strValue}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="#000000"
            className="flex-1"
          />
        </div>
      );

    default:
      return (
        <Input
          id={fieldId}
          type="text"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={schema.placeholder}
          minLength={schema.minLength}
          maxLength={schema.maxLength}
          pattern={schema.pattern}
        />
      );
  }
}

function renderNumberField(
  schema: FieldSchema,
  value: unknown,
  onChange: (value: unknown) => void,
  disabled: boolean,
  fieldId: string
) {
  const numValue = value as number | undefined;
  const hasRange = schema.minimum !== undefined && schema.maximum !== undefined;

  // Use slider for bounded ranges
  if (hasRange && schema['ui:widget'] !== 'input') {
    return (
      <div className="flex items-center gap-4">
        <Slider
          id={fieldId}
          value={[numValue ?? schema.minimum ?? 0]}
          onValueChange={([v]) => onChange(v)}
          min={schema.minimum}
          max={schema.maximum}
          step={schema.type === 'integer' ? 1 : 0.1}
          disabled={disabled}
          className="flex-1"
        />
        <span className="w-12 text-sm text-muted-foreground text-right">
          {numValue ?? schema.minimum ?? 0}
        </span>
      </div>
    );
  }

  return (
    <Input
      id={fieldId}
      type="number"
      value={numValue ?? ''}
      onChange={(e) => {
        const val = e.target.value;
        if (val === '') {
          onChange(undefined);
        } else {
          onChange(schema.type === 'integer' ? parseInt(val) : parseFloat(val));
        }
      }}
      disabled={disabled}
      min={schema.minimum}
      max={schema.maximum}
      step={schema.type === 'integer' ? 1 : 'any'}
    />
  );
}

function renderBooleanField(
  schema: FieldSchema,
  value: unknown,
  onChange: (value: unknown) => void,
  disabled: boolean,
  fieldId: string
) {
  const boolValue = Boolean(value);
  const widget = schema['ui:widget'];

  if (widget === 'checkbox') {
    return (
      <div className="flex items-center space-x-2">
        <Checkbox
          id={fieldId}
          checked={boolValue}
          onCheckedChange={onChange}
          disabled={disabled}
        />
      </div>
    );
  }

  // Default to switch
  return (
    <div className="flex items-center space-x-2">
      <Switch
        id={fieldId}
        checked={boolValue}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

function renderArrayField(
  schema: FieldSchema,
  value: unknown,
  onChange: (value: unknown) => void,
  disabled: boolean,
  _fieldId: string
) {
  const arrValue = (value as unknown[]) ?? [];
  const itemSchema = schema.items;

  // Simple string array -> tag input
  if (itemSchema?.type === 'string' && !itemSchema.enum) {
    return <TagArrayField value={arrValue} onChange={onChange} disabled={disabled} />;
  }

  // Enum array -> multi-select chips
  if (itemSchema?.enum) {
    return (
      <EnumArrayField
        value={arrValue}
        onChange={onChange}
        options={itemSchema.enum as string[]}
        optionNames={itemSchema.enumNames}
        disabled={disabled}
      />
    );
  }

  // Complex array -> list
  return (
    <div className="space-y-2 border rounded-md p-4">
      {arrValue.map((item, index) => (
        <div key={index} className="flex items-start gap-2">
          {itemSchema && (
            <div className="flex-1">
              <SchemaField
                name={`${index}`}
                schema={itemSchema}
                value={item}
                onChange={(v) => {
                  const newArr = [...arrValue];
                  newArr[index] = v;
                  onChange(newArr);
                }}
                disabled={disabled}
              />
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              const newArr = arrValue.filter((_, i) => i !== index);
              onChange(newArr);
            }}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...arrValue, itemSchema?.default ?? ''])}
        disabled={disabled || (schema.maxItems !== undefined && arrValue.length >= schema.maxItems)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Item
      </Button>
    </div>
  );
}

function renderObjectField(
  schema: FieldSchema,
  value: unknown,
  onChange: (value: unknown) => void,
  disabled: boolean
) {
  const objValue = (value as Record<string, unknown>) ?? {};
  const properties = schema.properties ?? {};

  return (
    <div className="space-y-4 border rounded-md p-4 bg-muted/50">
      {Object.entries(properties).map(([key, propSchema]) => (
        <SchemaField
          key={key}
          name={key}
          schema={propSchema}
          value={objValue[key]}
          onChange={(v) => onChange({ ...objValue, [key]: v })}
          required={schema.required?.includes(key)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

function renderCustomWidget(
  widget: string,
  schema: FieldSchema,
  value: unknown,
  onChange: (value: unknown) => void,
  disabled: boolean,
  fieldId: string
) {
  switch (widget) {
    case 'textarea':
      return (
        <Textarea
          id={fieldId}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );

    case 'radio':
      if (schema.enum) {
        return (
          <div className="flex flex-wrap gap-2">
            {schema.enum.map((option, index) => (
              <label key={String(option)} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={fieldId}
                  value={String(option)}
                  checked={value === option}
                  onChange={() => onChange(option)}
                  disabled={disabled}
                  className="accent-primary"
                />
                <span className="text-sm">{schema.enumNames?.[index] || String(option)}</span>
              </label>
            ))}
          </div>
        );
      }
      break;

    case 'hidden':
      return <input type="hidden" value={String(value ?? '')} />;

    case 'range':
      return renderNumberField({ ...schema, 'ui:widget': undefined }, value, onChange, disabled, fieldId);
  }

  // Fallback
  return (
    <Input
      id={fieldId}
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}

// =============================================================================
// Helper Components
// =============================================================================

function TagArrayField({
  value,
  onChange,
  disabled,
}: {
  value: unknown[];
  onChange: (value: unknown[]) => void;
  disabled: boolean;
}) {
  const [inputValue, setInputValue] = React.useState('');

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const trimmed = inputValue.trim();
        if (trimmed && !value.includes(trimmed)) {
          onChange([...value, trimmed]);
          setInputValue('');
        }
      } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
        onChange(value.slice(0, -1));
      }
    },
    [inputValue, value, onChange]
  );

  return (
    <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[2.5rem]">
      {value.map((tag, index) => (
        <Badge key={index} variant="secondary" className="gap-1">
          {String(tag)}
          <button
            type="button"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
            disabled={disabled}
            className="ml-1 hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Type and press Enter..."
        className="flex-1 min-w-[120px] bg-transparent border-0 outline-none text-sm"
      />
    </div>
  );
}

function EnumArrayField({
  value,
  onChange,
  options,
  optionNames,
  disabled,
}: {
  value: unknown[];
  onChange: (value: unknown[]) => void;
  options: string[];
  optionNames?: string[];
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option, index) => {
        const isSelected = value.includes(option);
        return (
          <Badge
            key={option}
            variant={isSelected ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer transition-colors',
              !disabled && 'hover:bg-primary/80'
            )}
            onClick={() => {
              if (disabled) return;
              if (isSelected) {
                onChange(value.filter((v) => v !== option));
              } else {
                onChange([...value, option]);
              }
            }}
          >
            {optionNames?.[index] || option}
          </Badge>
        );
      })}
    </div>
  );
}

// =============================================================================
// Utilities
// =============================================================================

function formatLabel(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

// =============================================================================
// Default Export
// =============================================================================

export default SchemaField;
