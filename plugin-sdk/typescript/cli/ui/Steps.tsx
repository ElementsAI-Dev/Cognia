/**
 * Steps Component
 *
 * Multi-step wizard progress indicator.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { colors, symbols } from './theme.js';

export interface Step {
  /** Step title */
  title: string;
  /** Step description (optional) */
  description?: string;
}

export interface StepsProps {
  /** List of steps */
  steps: Step[];
  /** Current step index (0-based) */
  currentStep: number;
  /** Title to display above steps */
  title?: string;
}

export function Steps({ steps, currentStep, title }: StepsProps): React.ReactElement {
  return (
    <Box flexDirection="column" marginBottom={1}>
      {title && (
        <Box marginBottom={1}>
          <Text bold color={colors.primary}>
            {symbols.rocket} {title}
          </Text>
        </Box>
      )}
      <Box>
        <Text color={colors.dim}>
          Step {currentStep + 1} of {steps.length}:{' '}
        </Text>
        <Text bold>{steps[currentStep]?.title}</Text>
      </Box>
      <Box>
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;

          let color = colors.muted;
          let char = '○';

          if (isCompleted) {
            color = colors.success;
            char = '●';
          } else if (isCurrent) {
            color = colors.primary;
            char = '◉';
          }

          return (
            <Box key={index}>
              <Text color={color}>{char}</Text>
              {index < steps.length - 1 && (
                <Text color={isPending ? colors.muted : colors.success}>
                  ━━
                </Text>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export default Steps;
