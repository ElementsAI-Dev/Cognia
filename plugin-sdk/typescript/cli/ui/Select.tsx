/**
 * Select Component
 *
 * Single-select dropdown with description support.
 */

import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { colors, symbols } from './theme';

export interface SelectOption<T = string> {
  label: string;
  value: T;
  description?: string;
}

export interface SelectProps<T = string> {
  /** Label displayed above select */
  label: string;
  /** Options to select from */
  options: SelectOption<T>[];
  /** Called when an option is selected */
  onSelect: (option: SelectOption<T>) => void;
  /** Initial selected index */
  initialIndex?: number;
  /** Number of items visible at once */
  limit?: number;
  /** Whether the select is active */
  isFocused?: boolean;
}

export function Select<T = string>({
  label,
  options,
  onSelect,
  initialIndex = 0,
  limit = 5,
  isFocused = true,
}: SelectProps<T>): React.ReactElement {
  const items = options.map((opt) => ({
    label: opt.label,
    value: opt.value,
    key: String(opt.value),
  }));

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={colors.success}>{symbols.pointer} </Text>
        <Text bold>{label}</Text>
      </Box>
      <Box marginLeft={2} flexDirection="column">
        <SelectInput
          items={items}
          onSelect={(item: { label: string; value: T }) => {
            const selected = options.find((o) => o.value === item.value);
            if (selected) {
              onSelect(selected);
            }
          }}
          initialIndex={initialIndex}
          limit={limit}
          isFocused={isFocused}
          indicatorComponent={({ isSelected }) => (
            <Text color={isSelected ? colors.primary : colors.muted}>
              {isSelected ? symbols.pointer : ' '}{' '}
            </Text>
          )}
          itemComponent={({ isSelected, label: itemLabel }) => {
            const option = options.find((o) => o.label === itemLabel);
            return (
              <Box flexDirection="column">
                <Text color={isSelected ? colors.primary : undefined} bold={isSelected}>
                  {itemLabel}
                </Text>
                {option?.description && isSelected && (
                  <Text color={colors.dim} dimColor>
                    {'  '}{option.description}
                  </Text>
                )}
              </Box>
            );
          }}
        />
      </Box>
    </Box>
  );
}

export default Select;
