/**
 * StatusMessage Component
 *
 * Displays status feedback with icon and message.
 * Wraps @inkjs/ui StatusMessage component.
 */

import React from 'react';
import { StatusMessage as InkStatusMessage } from '@inkjs/ui';
import type { StatusVariant } from './types';

export interface StatusMessageProps {
  /** Status variant determines color and icon */
  variant: StatusVariant;
  /** Status message content */
  children: React.ReactNode;
}

/**
 * StatusMessage component for operation feedback
 *
 * @example
 * <StatusMessage variant="success">File saved successfully</StatusMessage>
 * <StatusMessage variant="error">Connection failed</StatusMessage>
 */
export function StatusMessage({ variant, children }: StatusMessageProps): React.ReactElement {
  return (
    <InkStatusMessage variant={variant}>
      {children}
    </InkStatusMessage>
  );
}

export default StatusMessage;
