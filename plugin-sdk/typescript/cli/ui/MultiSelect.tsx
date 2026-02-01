/**
 * MultiSelect Component
 *
 * Multi-select with checkboxes for selecting multiple options.
 */

import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors, symbols } from './theme.js';

export interface MultiSelectOption<T = string> {
  label: string;
  value: T;
  description?: string;
  defaultSelected?: boolean;
}

export interface MultiSelectProps<T = string> {
  /** Label displayed above select */
  label: string;
  /** Options to select from */
  options: MultiSelectOption<T>[];
  /** Called when selection is submitted */
  onSubmit: (selected: T[]) => void;
  /** Minimum number of selections required */
  min?: number;
  /** Maximum number of selections allowed */
  max?: number;
  /** Whether the component is focused */
  isFocused?: boolean;
}

export function MultiSelect<T = string>({
  label,
  options,
  onSubmit,
  min = 0,
  max = Infinity,
  isFocused = true,
}: MultiSelectProps<T>): React.ReactElement {
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<Set<T>>(() => {
    const initial = new Set<T>();
    options.forEach((opt) => {
      if (opt.defaultSelected) {
        initial.add(opt.value);
      }
    });
    return initial;
  });
  const [submitted, setSubmitted] = useState(false);

  const toggle = useCallback((value: T) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else if (next.size < max) {
        next.add(value);
      }
      return next;
    });
  }, [max]);

  useInput((input: string, key: { upArrow: boolean; downArrow: boolean; return: boolean }) => {
    if (!isFocused || submitted) return;

    if (key.upArrow) {
      setCursor((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    } else if (key.downArrow) {
      setCursor((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    } else if (input === ' ') {
      toggle(options[cursor].value);
    } else if (key.return) {
      if (selected.size >= min) {
        setSubmitted(true);
        onSubmit(Array.from(selected));
      }
    }
  }, { isActive: isFocused && !submitted });

  if (submitted) {
    const selectedLabels = options
      .filter((opt) => selected.has(opt.value))
      .map((opt) => opt.label)
      .join(', ');

    return (
      <Box flexDirection="column">
        <Box>
          <Text color={colors.success}>{symbols.success} </Text>
          <Text bold>{label}</Text>
        </Box>
        <Box marginLeft={2}>
          <Text color={colors.info}>{selectedLabels || 'None'}</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={colors.success}>{symbols.pointer} </Text>
        <Text bold>{label}</Text>
        <Text color={colors.dim}> (space to toggle, enter to confirm)</Text>
      </Box>
      <Box marginLeft={2} flexDirection="column">
        {options.map((option, index) => {
          const isSelected = selected.has(option.value);
          const isCursor = index === cursor;

          return (
            <Box key={String(option.value)} flexDirection="column">
              <Box>
                <Text color={isCursor ? colors.primary : colors.muted}>
                  {isCursor ? symbols.pointer : ' '}{' '}
                </Text>
                <Text color={isSelected ? colors.success : colors.muted}>
                  {isSelected ? symbols.checkbox.on : symbols.checkbox.off}{' '}
                </Text>
                <Text color={isCursor ? colors.primary : undefined} bold={isCursor}>
                  {option.label}
                </Text>
              </Box>
              {option.description && isCursor && (
                <Box marginLeft={4}>
                  <Text color={colors.dim} dimColor>
                    {option.description}
                  </Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
      {min > 0 && selected.size < min && (
        <Box marginLeft={2}>
          <Text color={colors.warning}>
            {symbols.warning} Select at least {min} option{min > 1 ? 's' : ''}
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default MultiSelect;
