/**
 * Header Component
 *
 * CLI header with title and optional subtitle.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { colors, symbols, borders } from './theme.js';

export interface HeaderProps {
  /** Main title */
  title: string;
  /** Subtitle or version */
  subtitle?: string;
  /** Show decorative border */
  showBorder?: boolean;
}

export function Header({ title, subtitle, showBorder = false }: HeaderProps): React.ReactElement {
  if (showBorder) {
    const width = Math.max(title.length, subtitle?.length || 0) + 4;
    const topBorder = borders.round.topLeft + borders.round.horizontal.repeat(width) + borders.round.topRight;
    const bottomBorder = borders.round.bottomLeft + borders.round.horizontal.repeat(width) + borders.round.bottomRight;

    return (
      <Box flexDirection="column" marginBottom={1}>
        <Text color={colors.primary}>{topBorder}</Text>
        <Box>
          <Text color={colors.primary}>{borders.round.vertical}</Text>
          <Box paddingX={2}>
            <Text bold color={colors.text}>
              {symbols.rocket} {title}
            </Text>
          </Box>
          <Text color={colors.primary}>{borders.round.vertical}</Text>
        </Box>
        {subtitle && (
          <Box>
            <Text color={colors.primary}>{borders.round.vertical}</Text>
            <Box paddingX={2}>
              <Text color={colors.dim}>{subtitle}</Text>
            </Box>
            <Text color={colors.primary}>{borders.round.vertical}</Text>
          </Box>
        )}
        <Text color={colors.primary}>{bottomBorder}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color={colors.primary}>
        {symbols.rocket} {title}
      </Text>
      {subtitle && (
        <Text color={colors.dim}>{subtitle}</Text>
      )}
    </Box>
  );
}

export default Header;
