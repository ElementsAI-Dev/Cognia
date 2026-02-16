/**
 * TextInput Component
 *
 * Styled text input with label and validation.
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import InkTextInput from 'ink-text-input';
import { colors, symbols } from './theme';

export interface TextInputProps {
  /** Label displayed before input */
  label: string;
  /** Placeholder text */
  placeholder?: string;
  /** Default value */
  defaultValue?: string;
  /** Called when value changes */
  onChange?: (value: string) => void;
  /** Called when Enter is pressed */
  onSubmit?: (value: string) => void;
  /** Validation function - return error message or undefined */
  validate?: (value: string) => string | undefined;
  /** Whether input is focused */
  focus?: boolean;
  /** Mask input (for passwords) */
  mask?: string;
}

export function TextInput({
  label,
  placeholder = '',
  defaultValue = '',
  onChange,
  onSubmit,
  validate,
  focus = true,
  mask,
}: TextInputProps): React.ReactElement {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | undefined>();
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    if (error) {
      const validationError = validate?.(newValue);
      setError(validationError);
    }
    onChange?.(newValue);
  };

  const handleSubmit = (finalValue: string) => {
    if (validate) {
      const validationError = validate(finalValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    setSubmitted(true);
    setError(undefined);
    onSubmit?.(finalValue);
  };

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={colors.success}>{symbols.pointer} </Text>
        <Text bold>{label}</Text>
        {placeholder && !value && !submitted && (
          <Text color={colors.dim}> ({placeholder})</Text>
        )}
      </Box>
      <Box marginLeft={2}>
        {submitted ? (
          <Text color={colors.info}>{mask ? mask.repeat(value.length) : value}</Text>
        ) : (
          <InkTextInput
            value={value}
            onChange={handleChange}
            onSubmit={handleSubmit}
            focus={focus}
            mask={mask}
            placeholder=""
          />
        )}
      </Box>
      {error && (
        <Box marginLeft={2}>
          <Text color={colors.error}>{symbols.error} {error}</Text>
        </Box>
      )}
    </Box>
  );
}

export default TextInput;
