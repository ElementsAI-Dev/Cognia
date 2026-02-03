/**
 * ProgressBar Component
 *
 * Displays a progress bar with percentage.
 * Wraps @inkjs/ui ProgressBar component.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { ProgressBar as InkProgressBar } from '@inkjs/ui';
import { colors } from './theme.js';

export interface ProgressBarProps {
  /** Progress value from 0 to 100 */
  value: number;
  /** Optional label to display before progress bar */
  label?: string;
  /** Whether to show percentage text */
  showPercentage?: boolean;
}

/**
 * ProgressBar component for displaying progress
 *
 * @example
 * <ProgressBar value={75} label="Downloading" showPercentage />
 */
export function ProgressBar({
  value,
  label,
  showPercentage = true,
}: ProgressBarProps): React.ReactElement {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <Box flexDirection="column">
      {label && (
        <Box marginBottom={0}>
          <Text>{label}</Text>
        </Box>
      )}
      <Box>
        <Box flexGrow={1}>
          <InkProgressBar value={clampedValue} />
        </Box>
        {showPercentage && (
          <Box marginLeft={1}>
            <Text color={colors.dim}>{Math.round(clampedValue)}%</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default ProgressBar;
