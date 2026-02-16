/**
 * Alert Component
 *
 * Displays important messages with visual emphasis.
 * Wraps @inkjs/ui Alert component with project theming.
 */

import React from 'react';
import { Alert as InkAlert } from '@inkjs/ui';
import type { StatusVariant } from './types';

export interface AlertProps {
  /** Alert variant determines color and icon */
  variant: StatusVariant;
  /** Optional title above the message */
  title?: string;
  /** Alert message content */
  children: React.ReactNode;
}

/**
 * Alert component for displaying important messages
 *
 * @example
 * <Alert variant="warning" title="Deprecation Notice">
 *   This API will be removed in v3.0
 * </Alert>
 */
export function Alert({ variant, title, children }: AlertProps): React.ReactElement {
  return (
    <InkAlert variant={variant} title={title}>
      {children}
    </InkAlert>
  );
}

export default Alert;
