/**
 * Badge Component
 *
 * Status badges for success, warning, error, info states.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { colors, symbols } from './theme.js';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'muted';

export interface BadgeProps {
  /** Badge variant/color */
  variant: BadgeVariant;
  /** Badge text content */
  children: React.ReactNode;
  /** Show icon before text */
  showIcon?: boolean;
}

const variantConfig: Record<BadgeVariant, { color: string; icon: string }> = {
  success: { color: colors.success, icon: symbols.success },
  warning: { color: colors.warning, icon: symbols.warning },
  error: { color: colors.error, icon: symbols.error },
  info: { color: colors.info, icon: symbols.info },
  muted: { color: colors.muted, icon: symbols.bullet },
};

export function Badge({ variant, children, showIcon = true }: BadgeProps): React.ReactElement {
  const config = variantConfig[variant];

  return (
    <Box>
      {showIcon && (
        <Text color={config.color}>{config.icon} </Text>
      )}
      <Text color={config.color}>{children}</Text>
    </Box>
  );
}

export interface ResultBadgeProps {
  /** Whether the operation was successful */
  success: boolean;
  /** Number of warnings */
  warnings?: number;
  /** Number of errors */
  errors?: number;
}

export function ResultBadge({ success, warnings = 0, errors = 0 }: ResultBadgeProps): React.ReactElement {
  if (!success || errors > 0) {
    return (
      <Box>
        <Text color={colors.error} bold>
          {symbols.error} Failed
        </Text>
        {errors > 0 && (
          <Text color={colors.error}> ({errors} error{errors > 1 ? 's' : ''})</Text>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Text color={colors.success} bold>
        {symbols.success} {warnings > 0 ? 'Valid' : 'Success'}
      </Text>
      {warnings > 0 && (
        <Text color={colors.warning}> ({warnings} warning{warnings > 1 ? 's' : ''})</Text>
      )}
    </Box>
  );
}

export default Badge;
