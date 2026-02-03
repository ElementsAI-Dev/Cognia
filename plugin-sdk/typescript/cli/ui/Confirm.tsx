/**
 * Confirm Component
 *
 * Yes/No confirmation prompt.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors, symbols } from './theme.js';
import type { Key } from './types.js';

export interface ConfirmProps {
  /** Question to ask */
  label: string;
  /** Default value (true = Yes, false = No) */
  defaultValue?: boolean;
  /** Called when user confirms */
  onConfirm: (value: boolean) => void;
  /** Whether the component is focused */
  isFocused?: boolean;
}

export function Confirm({
  label,
  defaultValue = true,
  onConfirm,
  isFocused = true,
}: ConfirmProps): React.ReactElement {
  const [value, setValue] = useState(defaultValue);
  const [submitted, setSubmitted] = useState(false);

  useInput((input: string, key: Key) => {
    if (!isFocused || submitted) return;

    const lowerInput = input.toLowerCase();

    if (lowerInput === 'y') {
      setValue(true);
      setSubmitted(true);
      onConfirm(true);
    } else if (lowerInput === 'n') {
      setValue(false);
      setSubmitted(true);
      onConfirm(false);
    } else if (key.leftArrow || key.rightArrow) {
      setValue((prev) => !prev);
    } else if (key.return) {
      setSubmitted(true);
      onConfirm(value);
    }
  }, { isActive: isFocused && !submitted });

  if (submitted) {
    return (
      <Box>
        <Text color={colors.success}>{symbols.success} </Text>
        <Text bold>{label}</Text>
        <Text> </Text>
        <Text color={colors.info}>{value ? 'Yes' : 'No'}</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text color={colors.success}>{symbols.pointer} </Text>
      <Text bold>{label}</Text>
      <Text> </Text>
      <Text color={value ? colors.success : colors.muted} bold={value}>
        {value ? '[Yes]' : 'Yes'}
      </Text>
      <Text> / </Text>
      <Text color={!value ? colors.error : colors.muted} bold={!value}>
        {!value ? '[No]' : 'No'}
      </Text>
    </Box>
  );
}

export default Confirm;
