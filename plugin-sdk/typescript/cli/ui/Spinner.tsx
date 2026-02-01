/**
 * Spinner Component
 *
 * Loading indicator with customizable status text.
 */

import React from 'react';
import { Box, Text } from 'ink';
import InkSpinner from 'ink-spinner';
import { colors, symbols } from './theme.js';

export interface SpinnerProps {
  /** Status text to display next to spinner */
  text?: string;
  /** Spinner type */
  type?: 'dots' | 'line' | 'arc';
  /** Color of spinner */
  color?: string;
}

export function Spinner({ text, type = 'dots', color = colors.primary }: SpinnerProps): React.ReactElement {
  return (
    <Box>
      <Text color={color}>
        <InkSpinner type={type} />
      </Text>
      {text && (
        <Box marginLeft={1}>
          <Text>{text}</Text>
        </Box>
      )}
    </Box>
  );
}

export interface StatusSpinnerProps {
  /** Current status: loading, success, error, warning */
  status: 'loading' | 'success' | 'error' | 'warning' | 'pending';
  /** Text to display */
  text: string;
}

export function StatusSpinner({ status, text }: StatusSpinnerProps): React.ReactElement {
  if (status === 'loading') {
    return (
      <Box>
        <Text color={colors.primary}>
          <InkSpinner type="dots" />
        </Text>
        <Box marginLeft={1}>
          <Text>{text}</Text>
        </Box>
      </Box>
    );
  }

  const statusConfig = {
    success: { symbol: symbols.success, color: colors.success },
    error: { symbol: symbols.error, color: colors.error },
    warning: { symbol: symbols.warning, color: colors.warning },
    pending: { symbol: '○', color: colors.muted },
  };

  const config = statusConfig[status];

  return (
    <Box>
      <Text color={config.color}>{config.symbol}</Text>
      <Box marginLeft={1}>
        <Text color={status === 'pending' ? colors.muted : undefined}>{text}</Text>
      </Box>
    </Box>
  );
}

export default Spinner;
